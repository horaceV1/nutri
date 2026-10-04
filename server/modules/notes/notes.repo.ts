import { db } from '../../db'
import type { Note } from '../../../shared/types'

interface NoteRow {
  id: number
  title: string
  body: string
  date: string | null
  pinned: number
  created_at: string
  updated_at: string
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  date: row.date,
  pinned: !!row.pinned,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export interface NoteInput {
  title: string
  body: string
  date: string | null
  pinned: boolean
}

export const notesRepo = {
  list(userId: number, filter: { date?: string, q?: string }): Note[] {
    const where = ['user_id = ?']
    const params: (string | number)[] = [userId]
    if (filter.date) {
      where.push('date = ?')
      params.push(filter.date)
    }
    if (filter.q) {
      where.push('(title LIKE ? ESCAPE \'\\\' OR body LIKE ? ESCAPE \'\\\')')
      const like = `%${filter.q.replace(/[\\%_]/g, m => `\\${m}`)}%`
      params.push(like, like)
    }
    const rows = db.prepare(`SELECT * FROM notes WHERE ${where.join(' AND ')} ORDER BY pinned DESC, updated_at DESC`).all(...params)
    return (rows as unknown as NoteRow[]).map(toNote)
  },

  find(userId: number, id: number): Note | undefined {
    const row = db.prepare('SELECT * FROM notes WHERE user_id = ? AND id = ?').get(userId, id) as NoteRow | undefined
    return row && toNote(row)
  },

  create(userId: number, input: NoteInput): Note {
    const { lastInsertRowid } = db.prepare('INSERT INTO notes (user_id, title, body, date, pinned) VALUES (?, ?, ?, ?, ?)')
      .run(userId, input.title, input.body, input.date, input.pinned ? 1 : 0)
    return this.find(userId, Number(lastInsertRowid))!
  },

  update(userId: number, id: number, patch: Partial<NoteInput>): Note | undefined {
    const current = this.find(userId, id)
    if (!current) return undefined
    const next = { ...current, ...patch }
    db.prepare(`
      UPDATE notes SET title = ?, body = ?, date = ?, pinned = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE user_id = ? AND id = ?
    `).run(next.title, next.body, next.date, next.pinned ? 1 : 0, userId, id)
    return this.find(userId, id)
  },

  remove(userId: number, id: number): boolean {
    return db.prepare('DELETE FROM notes WHERE user_id = ? AND id = ?').run(userId, id).changes > 0
  },

  countsByDate(userId: number, from: string, to: string): { date: string, notes: number }[] {
    return db.prepare('SELECT date, COUNT(*) AS notes FROM notes WHERE user_id = ? AND date BETWEEN ? AND ? GROUP BY date')
      .all(userId, from, to) as { date: string, notes: number }[]
  }
}
