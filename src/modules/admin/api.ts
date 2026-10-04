import { api } from '../core/http'
import type { Role, User } from '../../../shared/types'

export interface UserInput {
  email: string
  name: string
  role: Role
  dailyGoal: number
  password?: string
}

export const listUsers = () => api<User[]>('/api/admin/users')

export const createUser = (input: UserInput) => api<User>('/api/admin/users', { method: 'POST', body: input })

export const updateUser = (id: number, patch: Partial<UserInput>) =>
  api<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: patch })

export const deleteUser = (id: number) => api<void>(`/api/admin/users/${id}`, { method: 'DELETE' })
