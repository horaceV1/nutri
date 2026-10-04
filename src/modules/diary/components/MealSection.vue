<script setup lang="ts">
import { MEAL_INFO } from '../meals'
import EntryRow from './EntryRow.vue'
import type { FoodEntry, Meal, Nutrients } from '../../../../shared/types'

defineProps<{
  meal: Meal
  entries: FoodEntry[]
  totals: Nutrients
}>()

defineEmits<{
  'add': []
  'update:grams': [id: number, grams: number]
  'move': [id: number, meal: Meal]
  'remove': [id: number]
}>()
</script>

<template>
  <UPageCard variant="subtle" :ui="{ container: 'p-4 sm:p-5 gap-y-2' }">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UIcon :name="MEAL_INFO[meal].icon" class="size-5 text-primary" />
        <h3 class="font-semibold text-highlighted">
          {{ MEAL_INFO[meal].label }}
        </h3>
        <UBadge
          v-if="entries.length"
          :label="`${totals.kcal} kcal`"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>

      <UButton
        icon="i-lucide-plus"
        label="Add"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="$emit('add')"
      />
    </div>

    <ul v-if="entries.length" class="divide-y divide-default">
      <EntryRow
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @update:grams="grams => $emit('update:grams', entry.id, grams)"
        @move="target => $emit('move', entry.id, target)"
        @remove="$emit('remove', entry.id)"
      />
    </ul>
    <p v-else class="text-sm text-dimmed py-1">
      Nothing logged yet.
    </p>
  </UPageCard>
</template>
