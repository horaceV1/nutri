<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2 px-1.5 py-2 font-semibold text-highlighted">
    <span class="inline-flex items-center justify-center size-7 shrink-0 rounded-md bg-primary/10 ring ring-inset ring-primary/25">
      <UIcon name="i-lucide-apple" class="size-4 text-primary" />
    </span>
    <span v-if="!collapsed" class="truncate">Nutri</span>
  </RouterLink>
</template>
