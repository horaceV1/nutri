import { Hono } from 'hono'
import * as z from 'zod'
import { check } from '../../lib/validate'
import { requireAuth, type AppEnv } from '../auth/middleware'
import { entriesRepo } from '../diary/entries.repo'
import { searchFoods } from './fdc.client'

export const foodRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  .get('/search', async (c) => {
    const { q, branded } = check(z.object({
      q: z.string().trim().min(2, 'Type at least 2 characters').max(100),
      branded: z.enum(['true', 'false']).default('false')
    }), c.req.query())
    return c.json(await searchFoods(q, { branded: branded === 'true', pageSize: 25 }))
  })

  .get('/recent', c => c.json(entriesRepo.recentFoods(c.get('user').id, 8)))
