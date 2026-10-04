<route lang="json">
{ "meta": { "layout": "blank", "public": true } }
</route>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../modules/auth/useAuth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const error = ref<string>()

onMounted(async () => {
  try {
    const returnTo = await auth.completeLogin(route.query)
    await router.replace(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/')
  } catch (e) {
    error.value = (e as Error).message
  }
})
</script>

<template>
  <UPageCard class="w-full max-w-sm">
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Sign-in failed"
      :description="error"
      :actions="[{ label: 'Try again', color: 'neutral', variant: 'outline', onClick: () => auth.login('/') }]"
    />
    <div v-else class="flex flex-col items-center gap-3 py-10 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
      <span class="text-sm">Signing you in…</span>
    </div>
  </UPageCard>
</template>
