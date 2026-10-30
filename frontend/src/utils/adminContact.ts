// The configured super admin (VITE_SUPER_ADMIN_EMAIL). Only this account holds super_admin,
// and it is the contact shown to users who need the Admin's help (e.g. AI API key problems).
const SUPER_ADMIN_EMAIL = ((import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || 'se.advisinglog@gmail.com').trim()

export function getAdminContactEmail(): string {
  return SUPER_ADMIN_EMAIL
}

/** Normalized for comparisons */
export function getSuperAdminEmail(): string {
  return SUPER_ADMIN_EMAIL.toLowerCase()
}
