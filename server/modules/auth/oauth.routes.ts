import { Hono } from 'hono'
import type { Context } from 'hono'
import * as z from 'zod'
import { config } from '../../config'
import { safeEqual, sha256, verifyPassword } from '../../lib/crypto'
import { usersRepo } from '../users/users.repo'
import { findClient } from './clients'
import { createAuthorizationCode, consumeAuthorizationCode, issueTokens, revokeRefreshToken, rotateRefreshToken } from './tokens'

/**
 * OAuth 2.0 authorization server (RFC 6749) for public clients:
 * authorization code grant with mandatory PKCE S256 (RFC 7636), rotating refresh tokens,
 * token revocation (RFC 7009) and server metadata (RFC 8414).
 *
 * The login screen itself lives in the web app at /authorize; it posts the user's
 * credentials plus the untouched authorization request to POST /oauth/authorize.
 */
export const oauthRoutes = new Hono()

type OAuthError = 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unsupported_grant_type' | 'access_denied' | 'unsupported_response_type'

const oauthError = (c: Context, error: OAuthError, description: string, status: 400 | 401 | 429 = 400) =>
  c.json({ error, error_description: description }, status, { 'Cache-Control': 'no-store' })

const authorizationRequest = z.object({
  response_type: z.string(),
  client_id: z.string(),
  redirect_uri: z.string(),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/, 'code_challenge must be a base64url S256 challenge'),
  code_challenge_method: z.literal('S256', { message: 'Only S256 PKCE is supported' }),
  state: z.string().min(8, 'state is required').max(512),
  scope: z.string().optional()
})

type AuthorizationRequest = z.output<typeof authorizationRequest>

/** Validates the client and redirect URI first: errors here must never redirect (RFC 6749 §4.1.2.1). */
function validateAuthorizationRequest(c: Context, input: unknown):
  { ok: true, request: AuthorizationRequest, clientName: string } | { ok: false, response: Response } {
  const parsed = authorizationRequest.safeParse(input)
  if (!parsed.success) {
    return { ok: false, response: oauthError(c, 'invalid_request', parsed.error.issues[0]!.message) }
  }
  const request = parsed.data
  const client = findClient(request.client_id)
  if (!client) {
    return { ok: false, response: oauthError(c, 'invalid_client', 'Unknown client', 401) }
  }
  if (!client.redirectUris.includes(request.redirect_uri)) {
    return { ok: false, response: oauthError(c, 'invalid_request', 'redirect_uri is not registered for this client') }
  }
  if (request.response_type !== 'code') {
    return { ok: false, response: oauthError(c, 'unsupported_response_type', 'Only response_type=code is supported') }
  }
  return { ok: true, request, clientName: client.name }
}

// --- Login throttling (in-memory, per email) ---------------------------------

const MAX_FAILURES = 8
const LOCK_WINDOW_MS = 15 * 60 * 1000
const failures = new Map<string, { count: number, first: number }>()

function isLocked(key: string): boolean {
  const entry = failures.get(key)
  if (!entry) return false
  if (Date.now() - entry.first > LOCK_WINDOW_MS) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function recordFailure(key: string) {
  const entry = failures.get(key)
  if (!entry || Date.now() - entry.first > LOCK_WINDOW_MS) failures.set(key, { count: 1, first: Date.now() })
  else entry.count++
}

// A real hash so unknown emails take as long to reject as wrong passwords.
const DUMMY_HASH = 'scrypt$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86)

// --- Endpoints ---------------------------------------------------------------

oauthRoutes.get('/.well-known/oauth-authorization-server', c => c.json({
  issuer: config.oauth.issuer,
  authorization_endpoint: `${config.appUrl}/authorize`,
  token_endpoint: `${config.oauth.issuer}/oauth/token`,
  revocation_endpoint: `${config.oauth.issuer}/oauth/revoke`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  scopes_supported: [config.oauth.scope]
}))

/** Lets the login screen validate an authorization request before showing the form. */
oauthRoutes.get('/oauth/authorize', (c) => {
  const result = validateAuthorizationRequest(c, c.req.query())
  if (!result.ok) return result.response
  return c.json({ client_name: result.clientName, scope: config.oauth.scope })
})

oauthRoutes.post('/oauth/authorize', async (c) => {
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null
  const result = validateAuthorizationRequest(c, body)
  if (!result.ok) return result.response
  const { request } = result

  const credentials = z.object({ email: z.string().trim().toLowerCase(), password: z.string() }).safeParse(body)
  if (!credentials.success) return oauthError(c, 'invalid_request', 'Email and password are required')
  const { email, password } = credentials.data

  if (isLocked(email)) {
    return oauthError(c, 'access_denied', 'Too many failed attempts. Try again in a few minutes.', 429)
  }

  const user = usersRepo.findCredentials(email)
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  if (!user || !valid) {
    recordFailure(email)
    return oauthError(c, 'access_denied', 'Invalid email or password', 401)
  }
  failures.delete(email)

  const code = createAuthorizationCode({
    clientId: request.client_id,
    userId: user.id,
    redirectUri: request.redirect_uri,
    codeChallenge: request.code_challenge,
    scope: config.oauth.scope
  })

  const redirect = new URL(request.redirect_uri)
  redirect.searchParams.set('code', code)
  redirect.searchParams.set('state', request.state)
  redirect.searchParams.set('iss', config.oauth.issuer)
  return c.json({ redirect_to: redirect.toString() })
})

async function readParams(c: Context): Promise<Record<string, string>> {
  const raw = c.req.header('Content-Type')?.includes('application/json')
    ? await c.req.json().catch(() => ({}))
    : await c.req.parseBody().catch(() => ({}))
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string>
}

oauthRoutes.post('/oauth/token', async (c) => {
  const params = await readParams(c)
  const client = params.client_id ? findClient(params.client_id) : undefined
  if (!client) return oauthError(c, 'invalid_client', 'Unknown client', 401)

  if (params.grant_type === 'authorization_code') {
    const { code, redirect_uri, code_verifier } = params
    if (!code || !redirect_uri || !code_verifier) {
      return oauthError(c, 'invalid_request', 'code, redirect_uri and code_verifier are required')
    }
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier)) {
      return oauthError(c, 'invalid_request', 'Malformed code_verifier')
    }

    const stored = consumeAuthorizationCode(code)
    if (!stored || stored.client_id !== client.clientId || stored.redirect_uri !== redirect_uri) {
      return oauthError(c, 'invalid_grant', 'Authorization code is invalid or expired')
    }
    if (!safeEqual(sha256(code_verifier), stored.code_challenge)) {
      return oauthError(c, 'invalid_grant', 'PKCE verification failed')
    }

    const user = usersRepo.findById(stored.user_id)
    if (!user) return oauthError(c, 'invalid_grant', 'User no longer exists')

    const tokens = await issueTokens({ userId: user.id, role: user.role, clientId: client.clientId, scope: stored.scope })
    return c.json(tokens, 200, { 'Cache-Control': 'no-store' })
  }

  if (params.grant_type === 'refresh_token') {
    if (!params.refresh_token) return oauthError(c, 'invalid_request', 'refresh_token is required')

    const rotated = rotateRefreshToken(params.refresh_token, client.clientId)
    if (!rotated.ok) return oauthError(c, 'invalid_grant', 'Refresh token is invalid, expired or revoked')

    const user = usersRepo.findById(rotated.row.user_id)
    if (!user) return oauthError(c, 'invalid_grant', 'User no longer exists')

    const tokens = await issueTokens({
      userId: user.id,
      role: user.role,
      clientId: client.clientId,
      scope: rotated.row.scope,
      familyId: rotated.row.family_id
    })
    return c.json(tokens, 200, { 'Cache-Control': 'no-store' })
  }

  return oauthError(c, 'unsupported_grant_type', 'Supported grants: authorization_code, refresh_token')
})

oauthRoutes.post('/oauth/revoke', async (c) => {
  const { token } = await readParams(c)
  if (token) revokeRefreshToken(token)
  // RFC 7009 §2.2: respond 200 whether or not the token was known.
  return c.body(null, 200)
})
