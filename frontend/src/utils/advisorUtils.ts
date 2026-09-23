// ============================================================
// Advisor Matching Utility
// ============================================================

import type { User } from '@/types'

/**
 * Checks if a given advisorId (from request, appointment, roster, session, etc.)
 * matches the currently logged-in advisor user by Database ID, Email, Code, or users directory.
 */
export function isAdvisorMatch(
  advisorId?: string,
  currentUser?: User | null,
  users: User[] = []
): boolean {
  if (!advisorId || !currentUser) return false
  const trimmedAdvId = advisorId.trim()
  if (trimmedAdvId === currentUser.id) return true
  if (currentUser.email && trimmedAdvId.toLowerCase() === currentUser.email.toLowerCase().trim()) return true
  if (currentUser.code && trimmedAdvId.toUpperCase() === currentUser.code.toUpperCase().trim()) return true

  // Check if advisorId matches a user in the store whose email or code matches currentUser
  const advUser = users.find(u => u.id === trimmedAdvId)
  if (advUser) {
    if (currentUser.email && advUser.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true
    if (currentUser.code && advUser.code?.toUpperCase().trim() === currentUser.code.toUpperCase().trim()) return true
  }

  // Check if currentUser's email matches a registered user whose id is advisorId
  const currentDbUser = users.find(
    u => currentUser.email && u.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()
  )
  if (currentDbUser && currentDbUser.id === trimmedAdvId) return true

  return false
}
