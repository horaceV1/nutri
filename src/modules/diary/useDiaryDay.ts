import { computed, ref, watch, type Ref } from 'vue'
import { useNotify } from '../core/useNotify'
import { createEntry, deleteEntry, listEntries, updateEntry, type NewEntry } from './api'
import { MEALS, type FoodEntry, type Meal } from '../../../shared/types'
import { nutrientsForGrams, sumNutrients } from '../../../shared/nutrition'

const SAVE_DELAY_MS = 500

/** Loads and edits the food log for one day; totals recalculate as soon as grams change. */
export function useDiaryDay(date: Ref<string>) {
  const notify = useNotify()
  const entries = ref<FoodEntry[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      entries.value = await listEntries(date.value)
    } catch (error) {
      notify.error(error, 'Could not load diary')
    } finally {
      loading.value = false
    }
  }

  watch(date, load, { immediate: true })

  async function add(entry: NewEntry) {
    const created = await createEntry(entry)
    if (created.date === date.value) entries.value.push(created)
    return created
  }

  const pendingSaves = new Map<number, ReturnType<typeof setTimeout>>()

  /** Updates locally right away and persists after the user stops typing. */
  function setGrams(id: number, grams: number) {
    const entry = entries.value.find(e => e.id === id)
    if (!entry || !(grams > 0)) return
    entry.grams = grams

    clearTimeout(pendingSaves.get(id))
    pendingSaves.set(id, setTimeout(async () => {
      pendingSaves.delete(id)
      try {
        await updateEntry(id, { grams })
      } catch (error) {
        notify.error(error, 'Could not save amount')
        await load()
      }
    }, SAVE_DELAY_MS))
  }

  async function setMeal(id: number, meal: Meal) {
    const entry = entries.value.find(e => e.id === id)
    if (!entry) return
    const previous = entry.meal
    entry.meal = meal
    try {
      await updateEntry(id, { meal })
    } catch (error) {
      entry.meal = previous
      notify.error(error, 'Could not move entry')
    }
  }

  async function remove(id: number) {
    clearTimeout(pendingSaves.get(id))
    const index = entries.value.findIndex(e => e.id === id)
    if (index === -1) return
    const [removed] = entries.value.splice(index, 1)
    try {
      await deleteEntry(id)
    } catch (error) {
      entries.value.splice(index, 0, removed!)
      notify.error(error, 'Could not delete entry')
    }
  }

  const meals = computed(() => MEALS.map((meal) => {
    const list = entries.value.filter(e => e.meal === meal)
    return {
      meal,
      entries: list,
      totals: sumNutrients(list.map(e => nutrientsForGrams(e.food.per100g, e.grams)))
    }
  }))

  const totals = computed(() => sumNutrients(meals.value.map(m => m.totals)))

  return { entries, meals, totals, loading, load, add, setGrams, setMeal, remove }
}
