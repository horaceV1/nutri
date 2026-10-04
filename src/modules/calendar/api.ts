import { api } from '../core/http'
import type { DaySummary } from '../../../shared/types'

export const getCalendar = (from: string, to: string) =>
  api<DaySummary[]>('/api/calendar', { query: { from, to } })
