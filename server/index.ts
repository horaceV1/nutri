import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { config } from './config'
import { ensureWebClient } from './modules/auth/clients'
import { oauthRoutes } from './modules/auth/oauth.routes'
import { ensureAdmin } from './modules/auth/seed'
import { purgeExpiredTokens } from './modules/auth/tokens'
import { calendarRoutes } from './modules/calendar/calendar.routes'
import { entryRoutes } from './modules/diary/entries.routes'
import { foodRoutes } from './modules/foods/foods.routes'
import { noteRoutes } from './modules/notes/notes.routes'
import { adminUserRoutes, meRoutes } from './modules/users/users.routes'

const app = new Hono()

app.use(logger())
app.use(secureHeaders({ contentSecurityPolicy: undefined }))

app.route('/', oauthRoutes)
app.route('/api/me', meRoutes)
app.route('/api/foods', foodRoutes)
app.route('/api/entries', entryRoutes)
app.route('/api/notes', noteRoutes)
app.route('/api/calendar', calendarRoutes)
app.route('/api/admin/users', adminUserRoutes)

app.all('/api/*', c => c.json({ error: 'Not found' }, 404))

if (config.production) {
  // Serve the built SPA and fall back to index.html for client-side routes.
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

ensureWebClient()
await ensureAdmin()
purgeExpiredTokens()
setInterval(purgeExpiredTokens, 60 * 60 * 1000).unref()

if (!config.fdcApiKey) console.warn('[config] FDC_API_KEY is not set; food search will be unavailable.')

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`[api] Listening on http://localhost:${port}  (app: ${config.appUrl})`)
})
