<script setup lang="ts">
import { computed } from 'vue'
import NutrientBreakdown from './NutrientBreakdown.vue'
import type { Nutrients } from '../../../../shared/types'

const props = defineProps<{
  totals: Nutrients
  goal: number
}>()

const remaining = computed(() => props.goal - props.totals.kcal)
const progress = computed(() => Math.min(100, Math.round((props.totals.kcal / props.goal) * 100)))
const color = computed(() => {
  const ratio = props.totals.kcal / props.goal
  if (ratio > 1.1) return 'error' as const
  if (ratio > 0.9) return 'success' as const
  return 'primary' as const
})
</script>

<template>
  <UPageCard variant="subtle" :ui="{ container: 'p-4 sm:p-5 gap-y-4' }">
    <div class="flex items-end justify-between gap-4">
      <div>
        <p class="text-xs uppercase text-muted">
          Eaten
        </p>
        <p class="text-3xl font-semibold text-highlighted tabular-nums">
          {{ totals.kcal }}
          <span class="text-base font-normal text-muted">/ {{ goal }} kcal</span>
        </p>
      </div>
      <div class="text-right">
        <p class="text-xs uppercase text-muted">
          {{ remaining >= 0 ? 'Remaining' : 'Over' }}
        </p>
        <p class="text-xl font-semibold tabular-nums" :class="remaining >= 0 ? 'text-highlighted' : 'text-error'">
          {{ Math.abs(remaining) }} kcal
        </p>
      </div>
    </div>

    <UProgress :model-value="progress" :color="color" size="md" />

    <NutrientBreakdown :nutrients="totals" />
  </UPageCard>
</template>
