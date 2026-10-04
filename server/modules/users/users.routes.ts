import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as z from 'zod'
import { hashPassword, verifyPassword } from '../../lib/crypto'
import { idParam, jsonBody } from '../../lib/validate'
import { requireAdmin, requireAuth, type AppEnv } from '../auth/middleware'
import { revokeAllForUser } from '../auth/tokens'
import { usersRepo } from './users.repo'

const email = z.string().trim().toLowerCase().pipe(z.email())
const name = z.string().trim().min(2).max(80)
const password = z.string().min(8, 'Password must be at least 8 characters').max(200)
const dailyGoal = z.number().int().min(500).max(10000)
const role = z.enum(['admin', 'user'])

function assertEmailFree(value: string | undefined, exceptId?: number) {
  if (value && usersRepo.emailTaken(value, exceptId)) {
    throw new HTTPException(409, { message: 'That email is already in use' })
  }
}

// --- The signed-in user's own account -----------------------------------------

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/', c => c.json(c.get('user')))

  .patch('/', async (c) => {
    const patch = await jsonBody(c, z.object({ name, email, dailyGoal }).partial())
    const user = c.get('user')
    assertEmailFree(patch.email, user.id)
    return c.json(usersRepo.update(user.id, patch))
  })

  .post('/password', async (c) => {
    const body = await jsonBody(c, z.object({ current: z.string(), new: password }))
    const user = c.get('user')
    if (!await verifyPassword(body.current, usersRepo.passwordHash(user.id) ?? '')) {
      throw new HTTPException(400, { message: 'Current password is incorrect' })
    }
    usersRepo.setPassword(user.id, await hashPassword(body.new))
    return c.body(null, 204)
  })

// --- Administration ----------------------------------------------------------

export const adminUserRoutes = new Hono<AppEnv>()
  .use(requireAuth, requireAdmin)

  .get('/', c => c.json(usersRepo.list()))

  .post('/', async (c) => {
    const body = await jsonBody(c, z.object({ email, name, password, role: role.default('user'), dailyGoal: dailyGoal.optional() }))
    assertEmailFree(body.email)
    const user = usersRepo.create({ ...body, passwordHash: await hashPassword(body.password) })
    return c.json(user, 201)
  })

  .patch('/:id', async (c) => {
    const id = idParam(c)
    const patch = await jsonBody(c, z.object({ email, name, role, dailyGoal, password }).partial())
    const target = usersRepo.findById(id)
    if (!target) throw new HTTPException(404, { message: 'User not found' })

    if (patch.role === 'user' && target.role === 'admin' && usersRepo.countAdmins() <= 1) {
      throw new HTTPException(400, { message: 'At least one administrator is required' })
    }
    assertEmailFree(patch.email, id)

    const { password: newPassword, ...fields } = patch
    if (newPassword) {
      usersRepo.setPassword(id, await hashPassword(newPassword))
      revokeAllForUser(id)
    }
    return c.json(usersRepo.update(id, fields))
  })

  .delete('/:id', (c) => {
    const id = idParam(c)
    if (id === c.get('user').id) {
      throw new HTTPException(400, { message: 'You cannot delete your own account' })
    }
    if (!usersRepo.remove(id)) throw new HTTPException(404, { message: 'User not found' })
    return c.body(null, 204)
  })
