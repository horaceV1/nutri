import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as z from 'zod'
import { check, idParam, isoDate, jsonBody } from '../../lib/validate'
import { requireAuth, type AppEnv } from '../auth/middleware'
import { entriesRepo } from './entries.repo'
import { MEALS } from '../../../shared/types'

const grams = z.number().positive().max(5000)
const meal = z.enum(MEALS)
const amount = z.number().min(0).max(10000)

const food = z.object({
  fdcId: z.number().int().positive(),
  name: z.string().min(1).max(300),
  brand: z.string().max(200).nullable(),
  dataType: z.string().max(50),
  category: z.string().max(200).nullable(),
  per100g: z.object({ kcal: amount, protein: amount, carbs: amount, fat: amount })
})

export const entryRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/', (c) => {
    const { date } = check(z.object({ date: isoDate }), c.req.query())
    return c.json(entriesRepo.listForDate(c.get('user').id, date))
  })

  .post('/', async (c) => {
    const body = await jsonBody(c, z.object({ date: isoDate, meal, grams, food }))
    return c.json(entriesRepo.create(c.get('user').id, body), 201)
  })

  .patch('/:id', async (c) => {
    const patch = await jsonBody(c, z.object({ date: isoDate, meal, grams }).partial())
    const entry = entriesRepo.update(c.get('user').id, idParam(c), patch)
    if (!entry) throw new HTTPException(404, { message: 'Entry not found' })
    return c.json(entry)
  })

  .delete('/:id', (c) => {
    if (!entriesRepo.remove(c.get('user').id, idParam(c))) {
      throw new HTTPException(404, { message: 'Entry not found' })
    }
    return c.body(null, 204)
  })
