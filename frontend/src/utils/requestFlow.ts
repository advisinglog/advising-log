import type { AdvisingRequest, AdvisingSession, Appointment, FollowUp } from '@/types'

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

/** True once the appointment's start time (local time) has passed. */
export function meetingHasPassed(apt: Pick<Appointment, 'scheduledDate' | 'scheduledTime'>, now: Date = new Date()): boolean {
  const [h, m] = (apt.scheduledTime || '00:00').split(':').map(Number)
  const [y, mo, d] = apt.scheduledDate.split('-').map(Number)
  if (!y || !mo || !d) return false
  return new Date(y, mo - 1, d, h || 0, m || 0).getTime() <= now.getTime()
}

/** The confirmed appointment a student should check in for: scheduled, accepted, and its time has passed. */
export function checkInAppointment(
  request: AdvisingRequest,
  appointments: Appointment[],
  now: Date = new Date(),
): Appointment | null {
  if (request.status !== 'scheduled') return null
  const apt = appointments.find(a => a.requestId === request.id && a.status === 'scheduled' && a.studentConfirmed && !a.studentDeclined)
  return apt && meetingHasPassed(apt, now) ? apt : null
}

/**
 * Meetings the advisor still has to write notes for: marked done (by the advisor or the student),
 * or past their time and never marked, with no notes yet.
 */
export function needsNotes(
  request: AdvisingRequest,
  sessions: AdvisingSession[],
  appointments: Appointment[],
  now: Date = new Date(),
): boolean {
  if (sessions.some(s => s.requestId === request.id)) return false
  if (request.status === 'completed') return true
  return checkInAppointment(request, appointments, now) !== null
}
