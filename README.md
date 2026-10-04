# Nutri

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

A nutrition tracker built on the Nuxt UI Vue dashboard template. Features:

- a food diary with live calorie and macro calculation
- a calendar
- notes
- OAuth 2.0 authentication
- an admin area for managing users

Food data comes from [USDA FoodData Central](https://fdc.nal.usda.gov/).

## Quick start

```bash
cp .env.example .env   # then fill in FDC_API_KEY and ADMIN_PASSWORD
pnpm install
pnpm dev               # API on :3001 + web app on :5173
```

Open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
The admin account is created on the first start whenever the database has no admin. If `ADMIN_PASSWORD` is empty, a password is generated and printed to the API console once.

## Production

```bash
pnpm build
pnpm start             # serves the API and the built app from :3001
```

Set `APP_URL` to the public URL (for example `http://localhost:3001`). The OAuth redirect URI is derived from it.

## Architecture

```
shared/                 Types + nutrition maths used by both sides
server/                 Hono API, SQLite (node:sqlite), one folder per feature
  modules/auth          OAuth 2.0 authorization server, token service, guards, admin seed
  modules/users         /api/me and /api/admin/users
  modules/foods         FoodData Central client (API key stays server-side) + cache
  modules/diary         Food entries
  modules/notes         Notes
  modules/calendar      Per-day kcal / note summaries
src/
  modules/core          HTTP client, dates, toasts, shared components
  modules/auth          PKCE client, session state, route guard
  modules/foods         Food search picker
  modules/diary         Meal sections, live calorie calculation, add-food dialog
  modules/calendar      Month grid, date navigator, goal colouring
  modules/notes         Note cards, editor, per-day notes
  modules/admin         User management
  modules/account       Profile + password API
  pages/                Thin pages composing the modules
```

Feature modules depend only on `core` and `shared`. The auth module plugs into the HTTP client through a token provider, so the client knows nothing about OAuth.

### Authentication (OAuth 2.0)

The API is its own OAuth 2.0 authorization server for the first-party web client `nutri-web`:

- Authorization code grant with mandatory **PKCE S256** (RFC 7636). Codes are single-use and live for 60 s.
- Short-lived (15 min) **JWT access tokens**, kept in memory only.
- **Rotating refresh tokens** (30 days). A replayed refresh token revokes its whole token family.
- Revocation endpoint (RFC 7009) and server metadata at `/.well-known/oauth-authorization-server` (RFC 8414).
- Passwords are hashed with scrypt. Refresh tokens and codes are stored only as SHA-256 hashes.
- Failed logins are throttled per email.

The login screen lives at `/authorize` in the web app and posts to `POST /oauth/authorize`.

### Calories

Search results carry kcal, protein, carbs and fat **per 100 g**. Foundation foods often lack nutrient 1008, so energy falls back to the Atwater values (2048, 2047) and then to kJ.
Diary entries snapshot those values, so calories are `per100g × grams / 100` (`shared/nutrition.ts`), recalculated on every keystroke.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | API (`node --watch`) and Vite together |
| `pnpm dev:api` / `pnpm dev:web` | One side only |
| `pnpm build` / `pnpm start` | Production build / server |
| `pnpm typecheck` | `vue-tsc` for the app, `tsc` for the server |
| `pnpm lint` | ESLint over `src`, `server`, `shared` |

Node ≥ 22.13 is required for `node:sqlite`. The "SQLite is an experimental feature" warning is expected.
