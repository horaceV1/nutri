<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  onConfirm: () => Promise<unknown> | unknown
}>(), {
  description: undefined,
  confirmLabel: 'Delete'
})

const open = defineModel<boolean>('open', { default: false })
const loading = ref(false)

async function confirm() {
  loading.value = true
  try {
    await props.onConfirm()
    open.value = false
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <slot />

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          :label="confirmLabel"
          color="error"
          :loading="loading"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
