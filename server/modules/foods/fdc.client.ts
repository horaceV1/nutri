import { HTTPException } from 'hono/http-exception'
import { config } from '../../config'
import type { FoodItem } from '../../../shared/types'

/** USDA FoodData Central — https://fdc.nal.usda.gov/api-guide */
const FDC_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

// FDC nutrient ids. Foundation foods often only report Atwater energy (2047/2048), not 1008.
const ENERGY_KCAL_IDS = [1008, 2048, 2047]
const ENERGY_KJ_ID = 1062
const PROTEIN_ID = 1003
const FAT_ID = 1004
const CARBS_ID = 1005

const GENERIC_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)']

interface FdcNutrient {
  nutrientId: number
  value?: number
}

interface FdcFood {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
  brandName?: string
  foodCategory?: string
  foodNutrients?: FdcNutrient[]
}

const round1 = (value: number) => Math.round(Math.max(0, value) * 10) / 10

/** Search results report nutrient values per 100 g for every data type. */
function toFoodItem(food: FdcFood): FoodItem | null {
  const values = new Map((food.foodNutrients ?? []).map(n => [n.nutrientId, n.value ?? 0]))

  let kcal = ENERGY_KCAL_IDS.map(id => values.get(id)).find(v => v !== undefined)
  if (kcal === undefined && values.has(ENERGY_KJ_ID)) kcal = values.get(ENERGY_KJ_ID)! / 4.184
  if (kcal === undefined) return null

  return {
    fdcId: food.fdcId,
    name: food.description,
    brand: food.brandName || food.brandOwner || null,
    dataType: food.dataType,
    category: food.foodCategory ?? null,
    per100g: {
      kcal: round1(kcal),
      protein: round1(values.get(PROTEIN_ID) ?? 0),
      carbs: round1(values.get(CARBS_ID) ?? 0),
      fat: round1(values.get(FAT_ID) ?? 0)
    }
  }
}

const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 200
const cache = new Map<string, { at: number, items: FoodItem[] }>()

export async function searchFoods(query: string, options: { branded: boolean, pageSize: number }): Promise<FoodItem[]> {
  if (!config.fdcApiKey) {
    throw new HTTPException(503, { message: 'Food search is not configured (FDC_API_KEY missing)' })
  }

  const key = `${options.branded}|${options.pageSize}|${query.toLowerCase()}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.items

  const response = await fetch(`${FDC_URL}?api_key=${encodeURIComponent(config.fdcApiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize: options.pageSize,
      dataType: options.branded ? [...GENERIC_TYPES, 'Branded'] : GENERIC_TYPES
    }),
    signal: AbortSignal.timeout(10_000)
  }).catch(() => null)

  if (!response?.ok) {
    const status = response?.status
    const message = status === 429
      ? 'Food database rate limit reached, try again shortly'
      : status === 403 ? 'Food database rejected the API key' : 'Food database is unavailable'
    throw new HTTPException(502, { message })
  }

  const data = await response.json() as { foods?: FdcFood[] }
  const items = (data.foods ?? []).map(toFoodItem).filter((item): item is FoodItem => item !== null)

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!)
  cache.set(key, { at: Date.now(), items })
  return items
}
