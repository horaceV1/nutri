// Domain types shared by the API server (server/) and the web client (src/).

export type Role = 'admin' | 'user'

export interface User {
  id: number
  email: string
  name: string
  role: Role
  dailyGoal: number
  createdAt: string
}

/** Macro-nutrients expressed per 100 g of food. */
export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodItem {
  fdcId: number
  name: string
  brand: string | null
  dataType: string
  category: string | null
  per100g: Nutrients
}

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type Meal = typeof MEALS[number]

export interface FoodEntry {
  id: number
  date: string
  meal: Meal
  grams: number
  food: FoodItem
  createdAt: string
}

export interface DaySummary {
  date: string
  kcal: number
  entries: number
  notes: number
}

export interface Note {
  id: number
  title: string
  body: string
  date: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string
}
