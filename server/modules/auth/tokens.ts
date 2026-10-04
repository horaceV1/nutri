import { sign, verify } from 'hono/jwt'
import { config } from '../../config'
import { db, getSetting, setSetting } from '../../db'
import { randomToken, sha256 } from '../../lib/crypto'
import type { Role, TokenResponse } from '../../../shared/types'

const now = () => Math.floor(Date.now() / 1000)

function signingSecret(): string {
  if (config.jwtSecret) return config.jwtSecret
  let secret = getSetting('jwt_secret')
  if (!secret) {
    secret = randomToken(48)
    setSetting('jwt_secret', secret)
  }
  return secret
}

const secret = signingSecret()

export interface AccessTokenClaims {
  sub: string
  role: Role
  scope: string
  client_id: string
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const payload = await verify(token, secret, 'HS256')
  if (payload.iss !== config.oauth.issuer || payload.aud !== config.oauth.audience) {
    throw new Error('Token issuer or audience mismatch')
  }
  return payload as unknown as AccessTokenClaims
}

// --- Authorization codes -----------------------------------------------------

export function createAuthorizationCode(input: {
  clientId: string
  userId: number
  redirectUri: string
  codeChallenge: string
  scope: string
}): string {
  const code = randomToken()
  db.prepare(`
    INSERT INTO oauth_codes (code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sha256(code), input.clientId, input.userId, input.redirectUri, input.codeChallenge, input.scope, now() + config.oauth.authCodeTtl)
  return code
}

interface CodeRow {
  client_id: string
  user_id: number
  redirect_uri: string
  code_challenge: string
  scope: string
  expires_at: number
}

/** Codes are single-use: the row is deleted whether or not it is still valid. */
export function consumeAuthorizationCode(code: string): CodeRow | undefined {
  const hash = sha256(code)
  const row = db.prepare('SELECT * FROM oauth_codes WHERE code_hash = ?').get(hash) as CodeRow | undefined
  db.prepare('DELETE FROM oauth_codes WHERE code_hash = ? OR expires_at < ?').run(hash, now())
  return row && row.expires_at >= now() ? row : undefined
}

// --- Token issuance & refresh rotation ----------------------------------------

export async function issueTokens(input: { userId: number, role: Role, clientId: string, scope: string, familyId?: string }): Promise<TokenResponse> {
  const issuedAt = now()
  const accessToken = await sign({
    iss: config.oauth.issuer,
    aud: config.oauth.audience,
    sub: String(input.userId),
    role: input.role,
    scope: input.scope,
    client_id: input.clientId,
    jti: randomToken(12),
    iat: issuedAt,
    exp: issuedAt + config.oauth.accessTokenTtl
  }, secret, 'HS256')

  const refreshToken = randomToken()
  db.prepare(`
    INSERT INTO oauth_refresh_tokens (token_hash, family_id, client_id, user_id, scope, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sha256(refreshToken), input.familyId ?? randomToken(12), input.clientId, input.userId, input.scope, issuedAt + config.oauth.refreshTokenTtl)

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: config.oauth.accessTokenTtl,
    refresh_token: refreshToken,
    scope: input.scope
  }
}

interface RefreshRow {
  family_id: string
  client_id: string
  user_id: number
  scope: string
  expires_at: number
  revoked: number
}

export type RefreshResult =
  | { ok: true, row: RefreshRow }
  | { ok: false, reason: 'unknown' | 'expired' | 'reused' | 'client_mismatch' }

/**
 * Rotates a refresh token: the presented token is revoked and the caller issues a new one in
 * the same family. Presenting an already-revoked token means it leaked, so the whole family dies.
 */
export function rotateRefreshToken(token: string, clientId: string): RefreshResult {
  const hash = sha256(token)
  const row = db.prepare('SELECT * FROM oauth_refresh_tokens WHERE token_hash = ?').get(hash) as RefreshRow | undefined
  if (!row) return { ok: false, reason: 'unknown' }
  if (row.client_id !== clientId) return { ok: false, reason: 'client_mismatch' }
  if (row.revoked) {
    revokeFamily(row.family_id)
    return { ok: false, reason: 'reused' }
  }
  if (row.expires_at < now()) return { ok: false, reason: 'expired' }

  db.prepare('UPDATE oauth_refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(hash)
  return { ok: true, row }
}

export function revokeRefreshToken(token: string) {
  const row = db.prepare('SELECT family_id FROM oauth_refresh_tokens WHERE token_hash = ?').get(sha256(token)) as { family_id: string } | undefined
  if (row) revokeFamily(row.family_id)
}

export function revokeAllForUser(userId: number) {
  db.prepare('UPDATE oauth_refresh_tokens SET revoked = 1 WHERE user_id = ?').run(userId)
}

function revokeFamily(familyId: string) {
  db.prepare('UPDATE oauth_refresh_tokens SET revoked = 1 WHERE family_id = ?').run(familyId)
}

export function purgeExpiredTokens() {
  db.prepare('DELETE FROM oauth_refresh_tokens WHERE expires_at < ?').run(now())
  db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').run(now())
}
