import { ApiError } from './http'

/** Thin wrapper over Nuxt UI toasts for consistent success/error feedback. */
export function useNotify() {
  const toast = useToast()

  return {
    success(title: string, description?: string) {
      toast.add({ title, description, icon: 'i-lucide-check', color: 'success' })
    },
    error(error: unknown, title = 'Something went wrong') {
      const description = error instanceof ApiError || error instanceof Error ? error.message : undefined
      toast.add({ title, description, icon: 'i-lucide-circle-alert', color: 'error' })
    }
  }
}
