import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>

const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false

  const expected = Buffer.from(hash, 'base64url')
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length)
  return timingSafeEqual(actual, expected)
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** base64url(SHA-256(value)) — used for token-at-rest hashing and PKCE S256. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('base64url')
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
