import { Hono } from 'hono'
import * as z from 'zod'
import { check, isoDate } from '../../lib/validate'
import { requireAuth, type AppEnv } from '../auth/middleware'
import { entriesRepo } from '../diary/entries.repo'
import { notesRepo } from '../notes/notes.repo'
import type { DaySummary } from '../../../shared/types'

export const calendarRoutes = new Hono<AppEnv>()
  .use(requireAuth)

  /** Per-day calorie totals and note counts for a date range (used for calendar markers). */
  .get('/', (c) => {
    const { from, to } = check(z.object({ from: isoDate, to: isoDate }), c.req.query())
    const userId = c.get('user').id

    const days = new Map<string, DaySummary>()
    const day = (date: string) => days.get(date) ?? days.set(date, { date, kcal: 0, entries: 0, notes: 0 }).get(date)!

    for (const row of entriesRepo.dailyTotals(userId, from, to)) Object.assign(day(row.date), { kcal: row.kcal, entries: row.entries })
    for (const row of notesRepo.countsByDate(userId, from, to)) day(row.date).notes = row.notes

    return c.json([...days.values()].sort((a, b) => a.date.localeCompare(b.date)))
  })
