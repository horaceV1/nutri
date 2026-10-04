<script setup lang="ts">
import { computed } from 'vue'

/**
 * Gram amount input that emits on every keystroke (UInputNumber only commits on blur),
 * so calorie totals can follow the user's typing.
 */
withDefaults(defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  size: 'md'
})

const model = defineModel<number | null>({ default: null })

const MAX = 5000

const text = computed({
  get: (): string => model.value == null ? '' : String(model.value),
  set: (value: string) => {
    const parsed = Number.parseFloat(String(value).replace(',', '.'))
    model.value = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX) : null
  }
})
</script>

<template>
  <UInput
    v-model="text"
    type="number"
    inputmode="decimal"
    min="1"
    :max="MAX"
    step="any"
    :size="size"
    :ui="{ base: 'tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' }"
  >
    <template #trailing>
      <span class="text-xs text-muted">g</span>
    </template>
  </UInput>
</template>
