import { ApiError, readError } from '../core/http'
import type { TokenResponse } from '../../../shared/types'

/**
 * OAuth 2.0 public-client side: authorization code flow with PKCE (S256).
 * Pending request state lives in sessionStorage only for the duration of the redirect.
 */
export const OAUTH_CLIENT_ID = 'nutri-web'
export const AUTHORIZE_PATH = '/authorize'
const PENDING_KEY = 'nutri.oauth.pending'

const redirectUri = () => `${window.location.origin}/auth/callback`

function base64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const randomString = (bytes = 32) => base64url(crypto.getRandomValues(new Uint8Array(bytes)))

async function s256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

interface PendingAuthorization {
  state: string
  verifier: string
  returnTo: string
}

/** Builds the authorization request and remembers the PKCE verifier for the callback. */
export async function buildAuthorizationUrl(returnTo = '/'): Promise<string> {
  const pending: PendingAuthorization = { state: randomString(16), verifier: randomString(32), returnTo }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri(),
    code_challenge: await s256(pending.verifier),
    code_challenge_method: 'S256',
    state: pending.state
  })
  return `${AUTHORIZE_PATH}?${params}`
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch('/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: OAUTH_CLIENT_ID, ...params })
  })
  if (!response.ok) throw await readError(response)
  return await response.json() as TokenResponse
}

/** Handles the redirect back from the authorization endpoint. */
export async function exchangeAuthorizationCode(query: Record<string, unknown>): Promise<{ tokens: TokenResponse, returnTo: string }> {
  const raw = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)

  if (typeof query.error === 'string') {
    throw new ApiError(400, typeof query.error_description === 'string' ? query.error_description : query.error)
  }
  if (!raw) throw new ApiError(400, 'No sign-in is in progress in this tab. Please start again.')

  const pending = JSON.parse(raw) as PendingAuthorization
  if (query.state !== pending.state) throw new ApiError(400, 'Sign-in state mismatch. Please start again.')
  if (typeof query.code !== 'string') throw new ApiError(400, 'Authorization code missing from the response.')

  const tokens = await tokenRequest({
    grant_type: 'authorization_code',
    code: query.code,
    redirect_uri: redirectUri(),
    code_verifier: pending.verifier
  })
  return { tokens, returnTo: pending.returnTo }
}

export const refreshAccessToken = (refreshToken: string) =>
  tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken })

export async function revokeToken(token: string) {
  await fetch('/oauth/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: OAUTH_CLIENT_ID, token })
  })
}
