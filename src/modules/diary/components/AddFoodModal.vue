<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNotify } from '../../core/useNotify'
import FoodPicker from '../../foods/components/FoodPicker.vue'
import { foodName } from '../../foods/format'
import GramsInput from './GramsInput.vue'
import NutrientBreakdown from './NutrientBreakdown.vue'
import { MEAL_OPTIONS } from '../meals'
import type { NewEntry } from '../api'
import type { FoodItem, Meal } from '../../../../shared/types'
import { nutrientsForGrams } from '../../../../shared/nutrition'

const props = defineProps<{
  date: string
  meal: Meal
  onSave: (entry: NewEntry) => Promise<unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const notify = useNotify()

const food = ref<FoodItem>()
const grams = ref<number | null>(100)
const meal = ref<Meal>(props.meal)
const saving = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    food.value = undefined
    grams.value = 100
    meal.value = props.meal
  }
})

const PRESETS = [25, 50, 100, 150, 200, 250]

// Recomputed on every keystroke — no round trip needed.
const nutrients = computed(() => food.value ? nutrientsForGrams(food.value.per100g, grams.value ?? 0) : null)
const canSave = computed(() => !!food.value && (grams.value ?? 0) > 0)

async function save() {
  if (!food.value || !grams.value) return
  saving.value = true
  try {
    await props.onSave({ date: props.date, meal: meal.value, grams: grams.value, food: food.value })
    notify.success('Food added', `${grams.value} g of ${foodName(food.value)}`)
    open.value = false
  } catch (error) {
    notify.error(error, 'Could not add food')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Add food"
    description="Search the USDA FoodData Central database and enter the amount you ate."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-5" @submit.prevent="save">
        <UFormField label="Food" required>
          <FoodPicker v-model="food" />
        </UFormField>

        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Amount (grams)" required>
            <GramsInput v-model="grams" class="w-full" />
          </UFormField>

          <UFormField label="Meal">
            <USelect
              v-model="meal"
              :items="MEAL_OPTIONS"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="preset in PRESETS"
            :key="preset"
            :label="`${preset} g`"
            size="xs"
            :color="grams === preset ? 'primary' : 'neutral'"
            :variant="grams === preset ? 'subtle' : 'outline'"
            @click="grams = preset"
          />
        </div>

        <div
          v-if="food && nutrients"
          class="rounded-lg border border-default bg-elevated/50 p-4 space-y-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-medium text-highlighted truncate">
                {{ foodName(food) }}
              </p>
              <p class="text-sm text-muted">
                {{ food.per100g.kcal }} kcal per 100 g
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-3xl font-semibold text-primary tabular-nums">
                {{ nutrients.kcal }}
              </p>
              <p class="text-xs text-muted">
                kcal for {{ grams ?? 0 }} g
              </p>
            </div>
          </div>

          <NutrientBreakdown :nutrients="nutrients" />
        </div>

        <UEmpty
          v-else
          icon="i-lucide-search"
          title="Pick a food"
          description="Calories and macros update instantly as you change the amount."
          variant="naked"
          size="sm"
        />

        <button type="submit" class="hidden" />
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Add to diary"
          icon="i-lucide-plus"
          :disabled="!canSave"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
