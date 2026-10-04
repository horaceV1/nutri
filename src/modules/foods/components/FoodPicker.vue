<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { recentFoods, searchFoods } from '../api'
import { foodName, foodSource } from '../format'
import type { FoodItem } from '../../../../shared/types'

const model = defineModel<FoodItem | undefined>()

const searchTerm = ref('')
const includeBranded = ref(false)
const results = ref<FoodItem[]>([])
const recent = ref<FoodItem[]>([])
const loading = ref(false)
const error = ref<string>()

onMounted(async () => {
  recent.value = await recentFoods().catch(() => [])
})

let requestId = 0

async function runSearch() {
  const term = searchTerm.value.trim()
  error.value = undefined
  if (term.length < 2) {
    results.value = []
    return
  }
  const id = ++requestId
  loading.value = true
  try {
    const found = await searchFoods(term, includeBranded.value)
    if (id === requestId) results.value = found
  } catch (e) {
    if (id === requestId) error.value = (e as Error).message
  } finally {
    if (id === requestId) loading.value = false
  }
}

watchDebounced(searchTerm, runSearch, { debounce: 300 })
watch(includeBranded, runSearch)

interface Option {
  label: string
  description: string
  food: FoodItem
}

const toOption = (food: FoodItem): Option => ({
  label: foodName(food),
  description: `${foodSource(food)} · ${food.per100g.kcal} kcal / 100 g`,
  food
})

const items = computed(() => {
  if (searchTerm.value.trim().length >= 2) return results.value.map(toOption)
  return recent.value.length ? [{ type: 'label' as const, label: 'Recently logged' }, ...recent.value.map(toOption)] : []
})

const selected = computed({
  get: () => model.value ? toOption(model.value) : undefined,
  set: (option) => {
    model.value = option && 'food' in option ? option.food : undefined
  }
})
</script>

<template>
  <div class="space-y-2">
    <USelectMenu
      v-model="selected"
      v-model:search-term="searchTerm"
      :items="items"
      :loading="loading"
      ignore-filter
      placeholder="Search foods, e.g. banana, oats, chicken breast"
      :search-input="{ placeholder: 'Type at least 2 characters…', icon: 'i-lucide-search' }"
      icon="i-lucide-utensils"
      class="w-full"
      :ui="{ content: 'min-w-(--reka-select-trigger-width)', itemDescription: 'truncate' }"
    >
      <template #empty>
        <span v-if="error" class="text-error">{{ error }}</span>
        <span v-else-if="searchTerm.trim().length < 2">Start typing to search the USDA food database</span>
        <span v-else-if="loading">Searching…</span>
        <span v-else>No foods found</span>
      </template>
    </USelectMenu>

    <USwitch
      v-model="includeBranded"
      size="sm"
      label="Include branded products"
    />
  </div>
</template>
