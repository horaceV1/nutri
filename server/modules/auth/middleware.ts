import { createMiddleware } from 'hono/factory'
import { usersRepo } from '../users/users.repo'
import { verifyAccessToken } from './tokens'
import type { User } from '../../../shared/types'

export interface AppEnv {
  Variables: {
    user: User
  }
}

function unauthorized(error?: string) {
  const challenge = error ? `Bearer realm="nutri", error="${error}"` : 'Bearer realm="nutri"'
  return new Response(JSON.stringify({ error: error ?? 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': challenge }
  })
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) return unauthorized()

  let userId: number
  try {
    userId = Number((await verifyAccessToken(header.slice(7))).sub)
  } catch {
    return unauthorized('invalid_token')
  }

  // Read the user fresh so role changes and deletions apply immediately.
  const user = usersRepo.findById(userId)
  if (!user) return unauthorized('invalid_token')

  c.set('user', user)
  await next()
})

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('user').role !== 'admin') {
    return c.json({ error: 'Administrator access required' }, 403)
  }
  await next()
})
