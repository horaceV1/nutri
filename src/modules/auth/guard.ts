import type { Router } from 'vue-router'
import { useAuth } from './useAuth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without signing in. */
    public?: boolean
    /** Requires the admin role. */
    admin?: boolean
  }
}

export function installAuthGuard(router: Router) {
  const auth = useAuth()

  auth.onSignedOut(() => {
    void auth.login(router.currentRoute.value.fullPath)
  })

  router.beforeEach(async (to) => {
    if (to.meta.public) return true

    await auth.init()
    if (!auth.isAuthenticated.value) {
      await auth.login(to.fullPath)
      return false
    }
    if (to.meta.admin && !auth.isAdmin.value) return '/'
    return true
  })
}
