import { MEALS, type Meal } from '../../../shared/types'

export const MEAL_INFO: Record<Meal, { label: string, icon: string }> = {
  breakfast: { label: 'Breakfast', icon: 'i-lucide-coffee' },
  lunch: { label: 'Lunch', icon: 'i-lucide-sandwich' },
  dinner: { label: 'Dinner', icon: 'i-lucide-utensils-crossed' },
  snack: { label: 'Snacks', icon: 'i-lucide-cookie' }
}

export const MEAL_OPTIONS = MEALS.map(meal => ({ label: MEAL_INFO[meal].label, value: meal, icon: MEAL_INFO[meal].icon }))

/** Suggests a meal based on the time of day. */
export function mealForNow(date = new Date()): Meal {
  const hour = date.getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}
