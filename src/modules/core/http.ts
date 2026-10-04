export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Supplies credentials to the HTTP client. Registered by the auth module so `core`
 * stays independent of how tokens are obtained.
 */
export interface TokenProvider {
  getAccessToken(): string | null
  refresh(): Promise<boolean>
  onUnauthorized(): void
}

let tokenProvider: TokenProvider | null = null

export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider
}

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Query
  /** Skip attaching the bearer token (OAuth endpoints). */
  anonymous?: boolean
}

function buildUrl(path: string, query?: Query) {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export async function readError(response: Response): Promise<ApiError> {
  const data = await response.json().catch(() => null) as { error?: string, error_description?: string } | null
  if (!data && [502, 503, 504].includes(response.status)) {
    // The dev proxy answers this way when the API server isn't running.
    return new ApiError(response.status, 'Cannot reach the API server. Start it with `pnpm dev` (or `pnpm dev:api`).')
  }
  return new ApiError(response.status, data?.error_description ?? data?.error ?? response.statusText ?? 'Request failed')
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, anonymous } = options

  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = anonymous ? null : tokenProvider?.getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  }

  let response = await send()
  if (response.status === 401 && !anonymous && tokenProvider) {
    if (await tokenProvider.refresh()) {
      response = await send()
    }
    if (response.status === 401) tokenProvider.onUnauthorized()
  }

  if (!response.ok) throw await readError(response)
  if (response.status === 204) return undefined as T
  return await response.json() as T
}
