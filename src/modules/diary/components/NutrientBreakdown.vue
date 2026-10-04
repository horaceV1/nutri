<script setup lang="ts">
import { computed } from 'vue'
import type { Nutrients } from '../../../../shared/types'

const props = defineProps<{
  nutrients: Nutrients
}>()

const macros = computed(() => [
  { label: 'Protein', value: props.nutrients.protein, kcalPerGram: 4, color: 'bg-sky-500' },
  { label: 'Carbs', value: props.nutrients.carbs, kcalPerGram: 4, color: 'bg-amber-500' },
  { label: 'Fat', value: props.nutrients.fat, kcalPerGram: 9, color: 'bg-rose-500' }
])

// Share of energy from each macro, for the stacked bar.
const energyShares = computed(() => {
  const energy = macros.value.map(m => m.value * m.kcalPerGram)
  const total = energy.reduce((a, b) => a + b, 0)
  return macros.value.map((m, i) => ({ ...m, share: total ? (energy[i]! / total) * 100 : 0 }))
})
</script>

<template>
  <div class="space-y-3">
    <div class="flex h-2 overflow-hidden rounded-full bg-elevated">
      <div
        v-for="macro in energyShares"
        :key="macro.label"
        :class="macro.color"
        :style="{ width: `${macro.share}%` }"
        class="transition-all duration-200"
      />
    </div>

    <dl class="grid grid-cols-3 gap-2 text-sm">
      <div v-for="macro in macros" :key="macro.label">
        <dt class="flex items-center gap-1.5 text-muted">
          <span class="size-2 rounded-full" :class="macro.color" />
          {{ macro.label }}
        </dt>
        <dd class="font-medium text-highlighted tabular-nums">
          {{ macro.value }} g
        </dd>
      </div>
    </dl>
  </div>
</template>
