// Admin contact address shown to users who need the Admin's help (e.g. AI API key problems).
// Same source as the super admin login check: VITE_SUPER_ADMIN_EMAIL.
export function getAdminContactEmail(): string {
  return ((import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || 'se.advisinglog@gmail.com').trim()
}
