import type { FoodItem } from '../../../shared/types'

/** FDC descriptions are often SHOUTING (branded) — normalise to sentence case. */
export function foodName(food: FoodItem): string {
  const name = food.name
  if (name !== name.toUpperCase()) return name
  const lower = name.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function foodSource(food: FoodItem): string {
  return food.brand ?? food.category ?? food.dataType
}
