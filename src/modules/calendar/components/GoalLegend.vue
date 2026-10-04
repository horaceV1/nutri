<script setup lang="ts">
import { GOAL_STATUS_STYLE } from '../goal'
</script>

<template>
  <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
    <li v-for="(style, key) in GOAL_STATUS_STYLE" :key="key" class="flex items-center gap-1.5">
      <span class="size-2 rounded-full" :class="style.dot" />
      {{ style.label }}
    </li>
    <li class="flex items-center gap-1.5">
      <UIcon name="i-lucide-sticky-note" class="size-3.5 text-warning" />
      Has notes
    </li>
  </ul>
</template>
