import { db } from '../../db'
import type { Role, User } from '../../../shared/types'

interface UserRow {
  id: number
  email: string
  name: string
  role: Role
  daily_goal: number
  created_at: string
  password_hash: string
}

const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  dailyGoal: row.daily_goal,
  createdAt: row.created_at
})

export const usersRepo = {
  findById(id: number): User | undefined {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
    return row && toUser(row)
  },

  /** Includes the password hash; only for credential checks. */
  findCredentials(email: string): (User & { passwordHash: string }) | undefined {
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
    return row && { ...toUser(row), passwordHash: row.password_hash }
  },

  passwordHash(id: number): string | undefined {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(id) as { password_hash: string } | undefined
    return row?.password_hash
  },

  list(): User[] {
    return (db.prepare('SELECT * FROM users ORDER BY created_at').all() as unknown as UserRow[]).map(toUser)
  },

  countAdmins(): number {
    return (db.prepare('SELECT COUNT(*) AS n FROM users WHERE role = \'admin\'').get() as { n: number }).n
  },

  emailTaken(email: string, exceptId?: number): boolean {
    return !!db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, exceptId ?? 0)
  },

  create(input: { email: string, name: string, passwordHash: string, role: Role, dailyGoal?: number }): User {
    const { lastInsertRowid } = db.prepare(
      'INSERT INTO users (email, name, password_hash, role, daily_goal) VALUES (?, ?, ?, ?, ?)'
    ).run(input.email, input.name, input.passwordHash, input.role, input.dailyGoal ?? 2000)
    return this.findById(Number(lastInsertRowid))!
  },

  update(id: number, patch: Partial<{ email: string, name: string, role: Role, dailyGoal: number }>): User | undefined {
    const columns: Record<string, string> = { email: 'email', name: 'name', role: 'role', dailyGoal: 'daily_goal' }
    const sets: string[] = []
    const values: (string | number)[] = []
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue
      sets.push(`${columns[key]} = ?`)
      values.push(value)
    }
    if (sets.length) {
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
    }
    return this.findById(id)
  },

  setPassword(id: number, passwordHash: string) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id)
  },

  remove(id: number): boolean {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0
  }
}
