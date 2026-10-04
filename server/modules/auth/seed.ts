import { config } from '../../config'
import { hashPassword, randomToken } from '../../lib/crypto'
import { usersRepo } from '../users/users.repo'

/** Creates the initial administrator when the database has none. */
export async function ensureAdmin() {
  if (usersRepo.countAdmins() > 0) return

  const { email, name } = config.admin
  const generated = !config.admin.password
  const password = config.admin.password ?? randomToken(12)

  if (usersRepo.findCredentials(email)) {
    console.warn(`[seed] No admin exists and ${email} is taken by a regular user; promote one from the database.`)
    return
  }

  usersRepo.create({ email, name, passwordHash: await hashPassword(password), role: 'admin' })

  console.log(`[seed] Created admin account ${email}`)
  if (generated) {
    console.log(`[seed] Generated password: ${password}  (set ADMIN_PASSWORD in .env to choose your own)`)
  }
}
