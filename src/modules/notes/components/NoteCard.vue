<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { formatDate } from '../../core/date'
import type { Note } from '../../../../shared/types'

const props = defineProps<{
  note: Note
  /** Hide the date badge when the list is already scoped to one day. */
  hideDate?: boolean
}>()

const emit = defineEmits<{
  edit: []
  pin: []
  remove: []
}>()

const menu = computed<DropdownMenuItem[]>(() => [
  { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => emit('edit') },
  { label: props.note.pinned ? 'Unpin' : 'Pin', icon: props.note.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin', onSelect: () => emit('pin') },
  { label: 'Delete', icon: 'i-lucide-trash', color: 'error', onSelect: () => emit('remove') }
])
</script>

<template>
  <UPageCard
    variant="subtle"
    class="cursor-pointer"
    :ui="{ container: 'p-4 gap-y-2', body: 'min-w-0 w-full' }"
    @click="emit('edit')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <UIcon v-if="note.pinned" name="i-lucide-pin" class="size-4 shrink-0 text-primary" />
        <h3 class="font-semibold text-highlighted truncate">
          {{ note.title }}
        </h3>
      </div>
      <UDropdownMenu :items="menu" :content="{ align: 'end' }">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Note actions"
          @click.stop
        />
      </UDropdownMenu>
    </div>

    <p v-if="note.body" class="text-sm text-muted whitespace-pre-line line-clamp-4">
      {{ note.body }}
    </p>

    <div class="flex items-center gap-2 text-xs text-dimmed">
      <UBadge
        v-if="!hideDate"
        :label="note.date ? formatDate(note.date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'General'"
        :icon="note.date ? 'i-lucide-calendar' : 'i-lucide-notebook'"
        color="neutral"
        variant="subtle"
        size="sm"
      />
      <span>Edited {{ new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
    </div>
  </UPageCard>
</template>
