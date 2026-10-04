<script setup lang="ts">
import * as z from 'zod'
import { computed, reactive, watch } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useNotify } from '../../core/useNotify'
import type { UserInput } from '../api'
import type { User } from '../../../../shared/types'

const props = defineProps<{
  /** User to edit; omit to create one. */
  user?: User | null
  onSave: (input: UserInput, id?: number) => Promise<unknown>
}>()

const open = defineModel<boolean>('open', { default: false })
const notify = useNotify()
const isEdit = computed(() => !!props.user)

const schema = computed(() => z.object({
  name: z.string().trim().min(2, 'Too short').max(80),
  email: z.email('Invalid email'),
  role: z.enum(['admin', 'user']),
  dailyGoal: z.number().int().min(500).max(10000),
  password: isEdit.value
    ? z.string().refine(v => !v || v.length >= 8, 'Must be at least 8 characters')
    : z.string().min(8, 'Must be at least 8 characters')
}))

type Schema = z.output<typeof schema.value>

const state = reactive<Schema>({ name: '', email: '', role: 'user', dailyGoal: 2000, password: '' })

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(state, props.user
    ? { name: props.user.name, email: props.user.email, role: props.user.role, dailyGoal: props.user.dailyGoal, password: '' }
    : { name: '', email: '', role: 'user', dailyGoal: 2000, password: '' })
})

const roles = [
  { label: 'User', value: 'user', description: 'Tracks their own diary and notes' },
  { label: 'Admin', value: 'admin', description: 'Can also manage user accounts' }
]

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { password, ...rest } = event.data
  try {
    await props.onSave(password ? { ...rest, password } : rest, props.user?.id)
    notify.success(isEdit.value ? 'User updated' : 'User created')
    open.value = false
  } catch (error) {
    notify.error(error, 'Could not save user')
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="isEdit ? 'Edit user' : 'New user'">
    <template #body>
      <UForm
        id="user-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField label="Role" name="role">
            <USelect v-model="state.role" :items="roles" class="w-full" />
          </UFormField>
          <UFormField label="Daily goal (kcal)" name="dailyGoal">
            <UInputNumber
              v-model="state.dailyGoal"
              :min="500"
              :max="10000"
              :step="50"
              :step-snapping="false"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          :label="isEdit ? 'New password' : 'Password'"
          name="password"
          :required="!isEdit"
          :help="isEdit ? 'Leave empty to keep the current password. Changing it signs the user out everywhere.' : undefined"
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
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
          form="user-form"
          :label="isEdit ? 'Save changes' : 'Create user'"
          loading-auto
        />
      </div>
    </template>
  </UModal>
</template>
