import { api } from '../core/http'
import type { FoodEntry, FoodItem, Meal } from '../../../shared/types'

export interface NewEntry {
  date: string
  meal: Meal
  grams: number
  food: FoodItem
}

export type EntryPatch = Partial<Pick<FoodEntry, 'date' | 'meal' | 'grams'>>

export const listEntries = (date: string) => api<FoodEntry[]>('/api/entries', { query: { date } })

export const createEntry = (entry: NewEntry) => api<FoodEntry>('/api/entries', { method: 'POST', body: entry })

export const updateEntry = (id: number, patch: EntryPatch) =>
  api<FoodEntry>(`/api/entries/${id}`, { method: 'PATCH', body: patch })

export const deleteEntry = (id: number) => api<void>(`/api/entries/${id}`, { method: 'DELETE' })
