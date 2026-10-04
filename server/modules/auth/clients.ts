import { config } from '../../config'
import { db } from '../../db'

export interface OAuthClient {
  clientId: string
  name: string
  redirectUris: string[]
}

export function findClient(clientId: string): OAuthClient | undefined {
  const row = db.prepare('SELECT * FROM oauth_clients WHERE client_id = ?').get(clientId) as
    { client_id: string, name: string, redirect_uris: string } | undefined
  return row && { clientId: row.client_id, name: row.name, redirectUris: JSON.parse(row.redirect_uris) }
}

/** Registers (or refreshes) the first-party web client so APP_URL changes take effect on restart. */
export function ensureWebClient() {
  const { id, name, redirectUris } = config.oauth.webClient
  db.prepare(`
    INSERT INTO oauth_clients (client_id, name, redirect_uris) VALUES (?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET name = excluded.name, redirect_uris = excluded.redirect_uris
  `).run(id, name, JSON.stringify(redirectUris))
}
