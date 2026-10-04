<script setup lang="ts">
import * as z from 'zod'
import { reactive } from 'vue'
import type { FormSubmitEvent } from '@nuxt/ui'
import { updateProfile } from '../../modules/account/api'
import { useAuth } from '../../modules/auth/useAuth'
import { useNotify } from '../../modules/core/useNotify'

const auth = useAuth()
const notify = useNotify()

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Too short').max(80),
  email: z.email('Invalid email'),
  dailyGoal: z.number().int().min(500, 'At least 500 kcal').max(10000, 'At most 10 000 kcal')
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<ProfileSchema>({
  name: auth.user.value?.name ?? '',
  email: auth.user.value?.email ?? '',
  dailyGoal: auth.user.value?.dailyGoal ?? 2000
})

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {
  try {
    auth.setUser(await updateProfile(event.data))
    notify.success('Settings saved')
  } catch (error) {
    notify.error(error, 'Could not save settings')
  }
}
</script>

<template>
  <UForm
    id="settings"
    :schema="profileSchema"
    :state="profile"
    @submit="onSubmit"
  >
    <UPageCard
      title="Profile"
      description="Your account details and nutrition target."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        label="Save changes"
        color="neutral"
        type="submit"
        loading-auto
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="name"
        label="Name"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.name" autocomplete="name" />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="Email"
        description="Used to sign in."
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="profile.email" type="email" autocomplete="email" />
      </UFormField>
      <USeparator />
      <UFormField
        name="dailyGoal"
        label="Daily calorie goal"
        description="Used for the diary progress bar and calendar colours."
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInputNumber
          v-model="profile.dailyGoal"
          :min="500"
          :max="10000"
          :step="50"
          :step-snapping="false"
          :format-options="{ style: 'unit', unit: 'kilocalorie' }"
        />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
