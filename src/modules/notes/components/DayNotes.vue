<script setup lang="ts">
import { ref, toRef } from 'vue'
import ConfirmModal from '../../core/components/ConfirmModal.vue'
import { useNotes } from '../useNotes'
import NoteCard from './NoteCard.vue'
import NoteEditorModal from './NoteEditorModal.vue'
import type { Note } from '../../../../shared/types'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  changed: []
}>()

const { notes, loading, save, togglePin, remove } = useNotes({ date: toRef(props, 'date') })

const editorOpen = ref(false)
const editing = ref<Note | null>(null)
const deleting = ref<Note | null>(null)

function openEditor(note: Note | null = null) {
  editing.value = note
  editorOpen.value = true
}

async function onSave(...args: Parameters<typeof save>) {
  await save(...args)
  emit('changed')
}

async function onDelete() {
  if (!deleting.value) return
  await remove(deleting.value.id)
  deleting.value = null
  emit('changed')
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="flex items-center gap-2 font-semibold text-highlighted">
        <UIcon name="i-lucide-sticky-note" class="size-5 text-warning" />
        Notes for this day
      </h3>
      <UButton
        icon="i-lucide-plus"
        label="Add note"
        size="sm"
        color="neutral"
        variant="ghost"
        @click="openEditor()"
      />
    </div>

    <div v-if="loading && !notes.length" class="space-y-2">
      <USkeleton class="h-20 w-full" />
    </div>
    <div v-else-if="notes.length" class="grid gap-3">
      <NoteCard
        v-for="note in notes"
        :key="note.id"
        :note="note"
        hide-date
        @edit="openEditor(note)"
        @pin="togglePin(note)"
        @remove="deleting = note"
      />
    </div>
    <p v-else class="text-sm text-dimmed">
      No notes yet — jot down how you felt, cravings or anything worth remembering.
    </p>

    <NoteEditorModal
      v-model:open="editorOpen"
      :note="editing"
      :default-date="date"
      :on-save="onSave"
    />

    <ConfirmModal
      :open="!!deleting"
      title="Delete note?"
      :description="deleting ? `“${deleting.title}” will be permanently deleted.` : undefined"
      :on-confirm="onDelete"
      @update:open="value => { if (!value) deleting = null }"
    />
  </section>
</template>
