import type { AdvisingRequest, AdvisingSession, FollowUp } from '@/types'

/**
 * A request is ready for the advisor's "Review & close" step when the meeting is
 * completed, the meeting notes are written, and no follow-up task is still open.
 */
export function isReadyToClose(
  request: AdvisingRequest,
  sessions: AdvisingSession[],
  followUps: FollowUp[],
): boolean {
  if (request.status !== 'completed') return false
  if (!sessions.some(s => s.requestId === request.id)) return false
  return followUps.filter(f => f.requestId === request.id).every(f => f.status === 'completed')
}

/** True when every follow-up linked to the request is completed (used to notify the advisor). */
export function allFollowUpsDone(requestId: string, followUps: FollowUp[]): boolean {
  const linked = followUps.filter(f => f.requestId === requestId)
  return linked.length > 0 && linked.every(f => f.status === 'completed')
}
