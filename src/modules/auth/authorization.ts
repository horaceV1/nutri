import { api } from '../core/http'

/**
 * Authorization-server side of the login screen: validates the incoming request
 * and exchanges the user's credentials for a redirect carrying the authorization code.
 */
export type AuthorizationParams = Record<string, string>

export const validateAuthorizationRequest = (params: AuthorizationParams) =>
  api<{ client_name: string, scope: string }>('/oauth/authorize', { query: params, anonymous: true })

export const submitCredentials = (params: AuthorizationParams, email: string, password: string) =>
  api<{ redirect_to: string }>('/oauth/authorize', { method: 'POST', body: { ...params, email, password }, anonymous: true })
