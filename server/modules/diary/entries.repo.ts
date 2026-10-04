import { db } from '../../db'
import type { FoodEntry, FoodItem, Meal } from '../../../shared/types'

interface EntryRow {
  id: number
  date: string
  meal: Meal
  grams: number
  fdc_id: number
  name: string
  brand: string | null
  data_type: string
  category: string | null
  kcal_100: number
  protein_100: number
  carbs_100: number
  fat_100: number
  created_at: string
}

const toFood = (row: EntryRow): FoodItem => ({
  fdcId: row.fdc_id,
  name: row.name,
  brand: row.brand,
  dataType: row.data_type,
  category: row.category,
  per100g: { kcal: row.kcal_100, protein: row.protein_100, carbs: row.carbs_100, fat: row.fat_100 }
})

const toEntry = (row: EntryRow): FoodEntry => ({
  id: row.id,
  date: row.date,
  meal: row.meal,
  grams: row.grams,
  food: toFood(row),
  createdAt: row.created_at
})

export const entriesRepo = {
  listForDate(userId: number, date: string): FoodEntry[] {
    const rows = db.prepare('SELECT * FROM food_entries WHERE user_id = ? AND date = ? ORDER BY created_at').all(userId, date)
    return (rows as unknown as EntryRow[]).map(toEntry)
  },

  find(userId: number, id: number): FoodEntry | undefined {
    const row = db.prepare('SELECT * FROM food_entries WHERE user_id = ? AND id = ?').get(userId, id) as EntryRow | undefined
    return row && toEntry(row)
  },

  /** Nutrient values are snapshotted so the diary never changes if the food database does. */
  create(userId: number, input: { date: string, meal: Meal, grams: number, food: FoodItem }): FoodEntry {
    const { food } = input
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO food_entries (user_id, date, meal, grams, fdc_id, name, brand, data_type, category, kcal_100, protein_100, carbs_100, fat_100)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, input.date, input.meal, input.grams, food.fdcId, food.name, food.brand, food.dataType, food.category,
      food.per100g.kcal, food.per100g.protein, food.per100g.carbs, food.per100g.fat)
    return this.find(userId, Number(lastInsertRowid))!
  },

  update(userId: number, id: number, patch: Partial<{ date: string, meal: Meal, grams: number }>): FoodEntry | undefined {
    db.prepare(`
      UPDATE food_entries SET date = COALESCE(?, date), meal = COALESCE(?, meal), grams = COALESCE(?, grams)
      WHERE user_id = ? AND id = ?
    `).run(patch.date ?? null, patch.meal ?? null, patch.grams ?? null, userId, id)
    return this.find(userId, id)
  },

  remove(userId: number, id: number): boolean {
    return db.prepare('DELETE FROM food_entries WHERE user_id = ? AND id = ?').run(userId, id).changes > 0
  },

  dailyTotals(userId: number, from: string, to: string): { date: string, kcal: number, entries: number }[] {
    return db.prepare(`
      SELECT date, ROUND(SUM(grams * kcal_100 / 100)) AS kcal, COUNT(*) AS entries
      FROM food_entries WHERE user_id = ? AND date BETWEEN ? AND ?
      GROUP BY date
    `).all(userId, from, to) as { date: string, kcal: number, entries: number }[]
  },

  recentFoods(userId: number, limit: number): FoodItem[] {
    const rows = db.prepare(`
      SELECT * FROM food_entries WHERE id IN (
        SELECT MAX(id) FROM food_entries WHERE user_id = ? GROUP BY fdc_id
      ) ORDER BY id DESC LIMIT ?
    `).all(userId, limit)
    return (rows as unknown as EntryRow[]).map(toFood)
  }
}
