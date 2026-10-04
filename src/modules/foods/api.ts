import { api } from '../core/http'
import type { FoodItem } from '../../../shared/types'

export const searchFoods = (q: string, branded = false) =>
  api<FoodItem[]>('/api/foods/search', { query: { q, branded } })

export const recentFoods = () => api<FoodItem[]>('/api/foods/recent')
