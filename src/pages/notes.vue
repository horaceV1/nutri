<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfirmModal from '../modules/core/components/ConfirmModal.vue'
import NoteCard from '../modules/notes/components/NoteCard.vue'
import NoteEditorModal from '../modules/notes/components/NoteEditorModal.vue'
import { useNotes } from '../modules/notes/useNotes'
import type { Note } from '../../shared/types'

const search = ref('')
const filter = ref<'all' | 'pinned' | 'dated' | 'general'>('all')

const { notes, loading, save, togglePin, remove } = useNotes({ q: search })

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Pinned', value: 'pinned' },
  { label: 'Day notes', value: 'dated' },
  { label: 'General', value: 'general' }
]

const visible = computed(() => notes.value.filter((note) => {
  if (filter.value === 'pinned') return note.pinned
  if (filter.value === 'dated') return !!note.date
  if (filter.value === 'general') return !note.date
  return true
}))

const editorOpen = ref(false)
const editing = ref<Note | null>(null)
const deleting = ref<Note | null>(null)

function openEditor(note: Note | null = null) {
  editing.value = note
  editorOpen.value = true
}

async function onDelete() {
  if (!deleting.value) return
  await remove(deleting.value.id)
  deleting.value = null
}

defineShortcuts({
  n: () => openEditor()
})
</script>

<template>
  <UDashboardPanel id="notes">
    <template #header>
      <UDashboardNavbar title="Notes">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton icon="i-lucide-plus" label="New note" @click="openEditor()">
            <template #trailing>
              <UKbd value="N" class="hidden sm:inline-flex" />
            </template>
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search notes…"
          class="max-w-sm"
        />
        <template #right>
          <UTabs
            v-model="filter"
            :items="filters"
            :content="false"
            size="xs"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="loading && !notes.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <USkeleton v-for="i in 6" :key="i" class="h-32" />
      </div>

      <div v-else-if="visible.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start">
        <NoteCard
          v-for="note in visible"
          :key="note.id"
          :note="note"
          @edit="openEditor(note)"
          @pin="togglePin(note)"
          @remove="deleting = note"
        />
      </div>

      <UEmpty
        v-else
        icon="i-lucide-notebook"
        :title="search ? 'No matching notes' : 'No notes yet'"
        :description="search ? 'Try a different search term.' : 'Capture how you feel, meal ideas or progress — link a note to a day to see it in the calendar.'"
        :actions="search ? [] : [{ label: 'New note', icon: 'i-lucide-plus', onClick: () => openEditor() }]"
        class="flex-1"
      />

      <NoteEditorModal
        v-model:open="editorOpen"
        :note="editing"
        :on-save="save"
      />

      <ConfirmModal
        :open="!!deleting"
        title="Delete note?"
        :description="deleting ? `“${deleting.title}” will be permanently deleted.` : undefined"
        :on-confirm="onDelete"
        @update:open="value => { if (!value) deleting = null }"
      />
    </template>
  </UDashboardPanel>
</template>
