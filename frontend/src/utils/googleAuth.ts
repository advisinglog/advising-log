// Google OAuth client ID (VITE_GOOGLE_CLIENT_ID). No demo fallback: if it is missing,
// sign-in is disabled and the login page shows a configuration error instead.
export const GOOGLE_CLIENT_ID = ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '').trim()

export const isGoogleAuthConfigured = GOOGLE_CLIENT_ID.length > 0
