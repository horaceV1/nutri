import { getLocalTimeZone, parseDate, today, type CalendarDate } from '@internationalized/date'

/** Dates travel through the app as ISO `YYYY-MM-DD` strings in the user's local calendar. */
export type IsoDate = string

export const isIsoDate = (value: unknown): value is IsoDate =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

export const todayIso = (): IsoDate => today(getLocalTimeZone()).toString()

export const toCalendarDate = (iso: IsoDate): CalendarDate => parseDate(iso)

export const shiftIso = (iso: IsoDate, days: number): IsoDate => parseDate(iso).add({ days }).toString()

export function formatDate(iso: IsoDate, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return parseDate(iso).toDate(getLocalTimeZone()).toLocaleDateString(undefined, options)
}

export function relativeDayLabel(iso: IsoDate): string {
  const now = todayIso()
  if (iso === now) return 'Today'
  if (iso === shiftIso(now, -1)) return 'Yesterday'
  if (iso === shiftIso(now, 1)) return 'Tomorrow'
  return formatDate(iso)
}
