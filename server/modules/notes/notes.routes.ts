import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as z from 'zod'
import { check, idParam, isoDate, jsonBody } from '../../lib/validate'
import { requireAuth, type AppEnv } from '../auth/middleware'
import { notesRepo } from './notes.repo'

const note = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().max(20000).default(''),
  date: isoDate.nullable().default(null),
  pinned: z.boolean().default(false)
})

export const noteRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/', (c) => {
    const filter = check(z.object({ date: isoDate.optional(), q: z.string().trim().max(100).optional() }), c.req.query())
    return c.json(notesRepo.list(c.get('user').id, filter))
  })

  .post('/', async (c) => {
    const body = await jsonBody(c, note)
    return c.json(notesRepo.create(c.get('user').id, body), 201)
  })

  .patch('/:id', async (c) => {
    // Re-declare without defaults so omitted fields stay untouched.
    const patch = await jsonBody(c, z.object({
      title: note.shape.title,
      body: z.string().max(20000),
      date: isoDate.nullable(),
      pinned: z.boolean()
    }).partial())
    const updated = notesRepo.update(c.get('user').id, idParam(c), patch)
    if (!updated) throw new HTTPException(404, { message: 'Note not found' })
    return c.json(updated)
  })

  .delete('/:id', (c) => {
    if (!notesRepo.remove(c.get('user').id, idParam(c))) {
      throw new HTTPException(404, { message: 'Note not found' })
    }
    return c.body(null, 204)
  })
