try {
  process.loadEnvFile()
} catch {
  // No .env file: rely on the real environment.
}

const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

export const config = {
  port: Number(process.env.API_PORT ?? 3001),
  production: process.env.NODE_ENV === 'production',
  appUrl,
  dbFile: process.env.DB_FILE ?? 'server/data/nutri.db',
  fdcApiKey: process.env.FDC_API_KEY ?? '',
  jwtSecret: process.env.JWT_SECRET,
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@nutri.local',
    name: process.env.ADMIN_NAME ?? 'Administrator',
    password: process.env.ADMIN_PASSWORD
  },
  oauth: {
    issuer: appUrl,
    audience: 'nutri-api',
    scope: 'nutri',
    webClient: {
      id: 'nutri-web',
      name: 'Nutri',
      redirectUris: [`${appUrl}/auth/callback`]
    },
    accessTokenTtl: 15 * 60,
    refreshTokenTtl: 30 * 24 * 60 * 60,
    authCodeTtl: 60
  }
}
