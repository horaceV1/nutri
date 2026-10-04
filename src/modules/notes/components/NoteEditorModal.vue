<script setup lang="ts">
import * as z from 'zod'
import { reactive, watch } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useNotify } from '../../core/useNotify'
import type { NoteInput } from '../api'
import type { Note } from '../../../../shared/types'

const props = defineProps<{
  /** Note to edit; omit to create a new one. */
  note?: Note | null
  /** Pre-filled date for new notes. */
  defaultDate?: string | null
  onSave: (input: NoteInput, id?: number) => Promise<unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const notify = useNotify()

const schema = z.object({
  title: z.string().trim().min(1, 'Give the note a title').max(200),
  body: z.string().max(20000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
  pinned: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({ title: '', body: '', date: '', pinned: false })

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(state, props.note
    ? { title: props.note.title, body: props.note.body, date: props.note.date ?? '', pinned: props.note.pinned }
    : { title: '', body: '', date: props.defaultDate ?? '', pinned: false })
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await props.onSave({ ...event.data, date: event.data.date || null }, props.note?.id)
    notify.success(props.note ? 'Note updated' : 'Note created')
    open.value = false
  } catch (error) {
    notify.error(error, 'Could not save note')
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="note ? 'Edit note' : 'New note'"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <UForm
        id="note-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Title" name="title" required>
          <UInput
            v-model="state.title"
            placeholder="e.g. Felt bloated after lunch"
            class="w-full"
            autofocus
          />
        </UFormField>

        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Day" name="date" help="Leave empty for a general note.">
            <UInput v-model="state.date" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Pinned" name="pinned">
            <USwitch v-model="state.pinned" label="Keep at the top" class="mt-1.5" />
          </UFormField>
        </div>

        <UFormField label="Note" name="body">
          <UTextarea
            v-model="state.body"
            :rows="8"
            autoresize
            placeholder="Energy, hunger, symptoms, ideas…"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="note-form"
          label="Save note"
          loading-auto
        />
      </div>
    </template>
  </UModal>
</template>
