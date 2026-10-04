<script setup lang="ts">
import * as z from 'zod'
import { reactive } from 'vue'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { changePassword } from '../../modules/account/api'
import { useAuth } from '../../modules/auth/useAuth'
import { useNotify } from '../../modules/core/useNotify'

const auth = useAuth()
const notify = useNotify()

const passwordSchema = z.object({
  current: z.string().min(1, 'Enter your current password'),
  new: z.string().min(8, 'Must be at least 8 characters')
})

type PasswordSchema = z.output<typeof passwordSchema>

const password = reactive<PasswordSchema>({
  current: '',
  new: ''
})

const validate = (state: Partial<PasswordSchema>): FormError[] => {
  const errors: FormError[] = []
  if (state.current && state.new && state.current === state.new) {
    errors.push({ name: 'new', message: 'Passwords must be different' })
  }
  return errors
}

async function onSubmit(event: FormSubmitEvent<PasswordSchema>) {
  try {
    await changePassword(event.data.current, event.data.new)
    Object.assign(password, { current: '', new: '' })
    notify.success('Password updated')
  } catch (error) {
    notify.error(error, 'Could not update password')
  }
}
</script>

<template>
  <UPageCard
    title="Password"
    description="Confirm your current password before setting a new one."
    variant="subtle"
  >
    <UForm
      :schema="passwordSchema"
      :state="password"
      :validate="validate"
      class="flex flex-col gap-4 max-w-xs"
      @submit="onSubmit"
    >
      <UFormField name="current">
        <UInput
          v-model="password.current"
          type="password"
          placeholder="Current password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UFormField name="new">
        <UInput
          v-model="password.new"
          type="password"
          placeholder="New password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton
        label="Update"
        class="w-fit"
        type="submit"
        loading-auto
      />
    </UForm>
  </UPageCard>

  <UPageCard
    title="Session"
    description="You are signed in with OAuth 2.0. Signing out revokes this device's refresh token."
    variant="subtle"
  >
    <template #footer>
      <UButton
        label="Sign out"
        icon="i-lucide-log-out"
        color="neutral"
        variant="outline"
        @click="auth.logout()"
      />
    </template>
  </UPageCard>
</template>
