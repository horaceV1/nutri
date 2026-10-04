import type { Nutrients } from './types'

const round1 = (value: number) => Math.round(value * 10) / 10

/** Scales per-100 g nutrient values to the given amount in grams. */
export function nutrientsForGrams(per100g: Nutrients, grams: number): Nutrients {
  const factor = Number.isFinite(grams) && grams > 0 ? grams / 100 : 0

  return {
    kcal: Math.round(per100g.kcal * factor),
    protein: round1(per100g.protein * factor),
    carbs: round1(per100g.carbs * factor),
    fat: round1(per100g.fat * factor)
  }
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  const total = list.reduce((acc, n) => ({
    kcal: acc.kcal + n.kcal,
    protein: acc.protein + n.protein,
    carbs: acc.carbs + n.carbs,
    fat: acc.fat + n.fat
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })

  return {
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    carbs: round1(total.carbs),
    fat: round1(total.fat)
  }
}
