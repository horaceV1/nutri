import { computed, readonly, reactive } from 'vue'
import { api, setTokenProvider } from '../core/http'
import { buildAuthorizationUrl, exchangeAuthorizationCode, refreshAccessToken, revokeToken } from './oauth'
import type { TokenResponse, User } from '../../../shared/types'

const REFRESH_KEY = 'nutri.refresh_token'

// Access token stays in memory only; the rotating refresh token survives reloads.
const state = reactive({
  user: null as User | null,
  accessToken: null as string | null,
  ready: false
})

function storeTokens(tokens: TokenResponse) {
  state.accessToken = tokens.access_token
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
}

function clearSession() {
  state.accessToken = null
  state.user = null
  localStorage.removeItem(REFRESH_KEY)
}

/** Serialises refreshes across tabs: a reused refresh token would revoke the whole session. */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request('nutri-token-refresh', fn) : fn()
}

let refreshing: Promise<boolean> | null = null

function refresh(): Promise<boolean> {
  refreshing ??= withRefreshLock(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) return false
    try {
      storeTokens(await refreshAccessToken(refreshToken))
      return true
    } catch {
      clearSession()
      return false
    }
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

let onSignedOut: () => void = () => {}

setTokenProvider({
  getAccessToken: () => state.accessToken,
  refresh,
  onUnauthorized() {
    clearSession()
    onSignedOut()
  }
})

let initializing: Promise<void> | null = null

export function useAuth() {
  return {
    state: readonly(state),
    user: computed(() => state.user),
    isAuthenticated: computed(() => !!state.user),
    isAdmin: computed(() => state.user?.role === 'admin'),

    /** Restores the session from the stored refresh token (once per page load). */
    init(): Promise<void> {
      initializing ??= (async () => {
        if (await refresh()) {
          state.user = await api<User>('/api/me').catch(() => null)
        }
        state.ready = true
      })()
      return initializing
    },

    async login(returnTo = '/') {
      window.location.assign(await buildAuthorizationUrl(returnTo))
    },

    async completeLogin(query: Record<string, unknown>): Promise<string> {
      const { tokens, returnTo } = await exchangeAuthorizationCode(query)
      storeTokens(tokens)
      state.user = await api<User>('/api/me')
      return returnTo
    },

    async logout() {
      const refreshToken = localStorage.getItem(REFRESH_KEY)
      clearSession()
      if (refreshToken) await revokeToken(refreshToken).catch(() => {})
      onSignedOut()
    },

    setUser(user: User) {
      state.user = user
    },

    onSignedOut(handler: () => void) {
      onSignedOut = handler
    }
  }
}
