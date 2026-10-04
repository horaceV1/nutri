<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { foodName, foodSource } from '../../foods/format'
import { MEAL_OPTIONS } from '../meals'
import GramsInput from './GramsInput.vue'
import type { FoodEntry, Meal } from '../../../../shared/types'
import { nutrientsForGrams } from '../../../../shared/nutrition'

const props = defineProps<{
  entry: FoodEntry
}>()

const emit = defineEmits<{
  'update:grams': [grams: number]
  'move': [meal: Meal]
  'remove': []
}>()

const nutrients = computed(() => nutrientsForGrams(props.entry.food.per100g, props.entry.grams))

// Local copy so the field can be briefly empty while the user retypes it.
const grams = ref<number | null>(props.entry.grams)
watch(grams, (value) => {
  if (value && value !== props.entry.grams) emit('update:grams', value)
})
watch(() => props.entry.grams, (value) => {
  if (grams.value !== null) grams.value = value
})

const menu = computed<DropdownMenuItem[][]>(() => [
  MEAL_OPTIONS.filter(option => option.value !== props.entry.meal).map(option => ({
    label: `Move to ${option.label.toLowerCase()}`,
    icon: option.icon,
    onSelect: () => emit('move', option.value)
  })),
  [{ label: 'Delete', icon: 'i-lucide-trash', color: 'error', onSelect: () => emit('remove') }]
])
</script>

<template>
  <li class="flex items-center gap-3 py-2.5">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-highlighted truncate">
        {{ foodName(entry.food) }}
      </p>
      <p class="text-xs text-muted truncate">
        {{ foodSource(entry.food) }} · P {{ nutrients.protein }} g · C {{ nutrients.carbs }} g · F {{ nutrients.fat }} g
      </p>
    </div>

    <GramsInput
      v-model="grams"
      size="sm"
      class="w-24 shrink-0"
      aria-label="Grams"
      @blur="grams ??= entry.grams"
    />

    <span class="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-highlighted">
      {{ nutrients.kcal }} kcal
    </span>

    <UDropdownMenu :items="menu" :content="{ align: 'end' }">
      <UButton
        icon="i-lucide-ellipsis-vertical"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Entry actions"
      />
    </UDropdownMenu>
  </li>
</template>
