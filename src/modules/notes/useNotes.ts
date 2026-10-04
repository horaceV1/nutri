import { ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { useNotify } from '../core/useNotify'
import { createNote, deleteNote, listNotes, updateNote, type NoteInput } from './api'
import type { Note } from '../../../shared/types'

const sortNotes = (list: Note[]) =>
  [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))

/** Note list with CRUD, optionally filtered to one date and/or a search term. */
export function useNotes(filter: { date?: MaybeRefOrGetter<string | undefined>, q?: MaybeRefOrGetter<string | undefined> } = {}) {
  const notify = useNotify()
  const notes = ref<Note[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      notes.value = await listNotes({ date: toValue(filter.date), q: toValue(filter.q) || undefined })
    } catch (error) {
      notify.error(error, 'Could not load notes')
    } finally {
      loading.value = false
    }
  }

  watch(() => toValue(filter.date), load, { immediate: true })
  watchDebounced(() => toValue(filter.q), load, { debounce: 250 })

  async function save(input: NoteInput, id?: number) {
    const saved = id ? await updateNote(id, input) : await createNote(input)
    const date = toValue(filter.date)
    const others = notes.value.filter(n => n.id !== saved.id)
    notes.value = sortNotes(!date || saved.date === date ? [...others, saved] : others)
    return saved
  }

  async function togglePin(note: Note) {
    try {
      await save({ ...note, pinned: !note.pinned }, note.id)
    } catch (error) {
      notify.error(error, 'Could not update note')
    }
  }

  async function remove(id: number) {
    await deleteNote(id)
    notes.value = notes.value.filter(n => n.id !== id)
  }

  return { notes, loading, load, save, togglePin, remove }
}
