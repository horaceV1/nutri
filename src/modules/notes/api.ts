import { api } from '../core/http'
import type { Note } from '../../../shared/types'

export type NoteInput = Pick<Note, 'title' | 'body' | 'date' | 'pinned'>

export const listNotes = (filter: { date?: string, q?: string } = {}) =>
  api<Note[]>('/api/notes', { query: filter })

export const createNote = (note: NoteInput) => api<Note>('/api/notes', { method: 'POST', body: note })

export const updateNote = (id: number, patch: Partial<NoteInput>) =>
  api<Note>(`/api/notes/${id}`, { method: 'PATCH', body: patch })

export const deleteNote = (id: number) => api<void>(`/api/notes/${id}`, { method: 'DELETE' })
