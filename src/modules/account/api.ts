import { api } from '../core/http'
import type { User } from '../../../shared/types'

export type ProfilePatch = Partial<Pick<User, 'name' | 'email' | 'dailyGoal'>>

export const updateProfile = (patch: ProfilePatch) => api<User>('/api/me', { method: 'PATCH', body: patch })

export const changePassword = (current: string, next: string) =>
  api<void>('/api/me/password', { method: 'POST', body: { current, new: next } })
