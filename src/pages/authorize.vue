<route lang="json">
{ "meta": { "layout": "blank", "public": true } }
</route>

<script setup lang="ts">
import * as z from 'zod'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { submitCredentials, validateAuthorizationRequest, type AuthorizationParams } from '../modules/auth/authorization'
import { useAuth } from '../modules/auth/useAuth'

const route = useRoute()
const auth = useAuth()

const params = computed<AuthorizationParams>(() => Object.fromEntries(
  Object.entries(route.query).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
))

const clientName = ref<string>()
const requestError = ref<string>()
const loginError = ref<string>()

onMounted(async () => {
  if (!params.value.client_id) {
    // Opened directly: start a proper authorization request for the web app.
    return auth.login('/')
  }
  try {
    clientName.value = (await validateAuthorizationRequest(params.value)).client_name
  } catch (error) {
    requestError.value = (error as Error).message
  }
})

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'you@example.com',
  autocomplete: 'username',
  required: true
}, {
  name: 'password',
  type: 'password',
  label: 'Password',
  placeholder: 'Your password',
  autocomplete: 'current-password',
  required: true
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(1, 'Password is required')
})

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema>>) {
  loginError.value = undefined
  try {
    const { redirect_to } = await submitCredentials(params.value, event.data.email, event.data.password)
    window.location.assign(redirect_to)
  } catch (error) {
    loginError.value = (error as Error).message
  }
}
</script>

<template>
  <UPageCard class="w-full max-w-sm">
    <UAlert
      v-if="requestError"
      color="error"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Invalid sign-in request"
      :description="requestError"
      :actions="[{ label: 'Start over', color: 'neutral', variant: 'outline', onClick: () => auth.login('/') }]"
    />

    <UAuthForm
      v-else-if="clientName"
      :schema="schema"
      :fields="fields"
      icon="i-lucide-apple"
      :title="`Sign in to ${clientName}`"
      description="Track your meals, calories and notes."
      :submit="{ label: 'Sign in', block: true }"
      loading-auto
      @submit="onSubmit"
    >
      <template #validation>
        <UAlert
          v-if="loginError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="loginError"
        />
      </template>

      <template #footer>
        <p class="text-xs text-muted text-center">
          Secured with OAuth 2.0 authorization code + PKCE.
        </p>
      </template>
    </UAuthForm>

    <div v-else class="flex justify-center py-10">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
    </div>
  </UPageCard>
</template>
