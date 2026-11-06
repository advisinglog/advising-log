import { useState } from 'react'
import { CalendarCheck, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import type { AdvisingRequest, Appointment } from '@/types'

/**
 * After the meeting time, the student confirms whether the meeting happened, so the case
 * moves on even if the advisor forgets to press "Complete". The advisor still writes the notes.
 */
export function MeetingCheckIn({ request, appointment }: { request: AdvisingRequest; appointment: Appointment }) {
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()
  const { addToast } = useToast()
  const [busy, setBusy] = useState<'met' | 'missed' | null>(null)

  async function answer(met: boolean) {
    setBusy(met ? 'met' : 'missed')
    const ok = await store.studentCheckIn(request.id, met)
    setBusy(null)
    if (!ok) {
      addToast('error', t('บันทึกไม่สำเร็จ', 'Not Saved'), t('กรุณาลองใหม่อีกครั้ง', 'Please try again.'))
      return
    }
    const student = store.users.find(u => u.id === request.studentId)
    const who = `${student?.name || ''}${student?.code ? ` (${student.code})` : ''}`
    store.addNotification(met
      ? {
          userId: request.advisorId,
          type: 'action_required',
          title: t('นักศึกษายืนยันว่าเข้าพบแล้ว — กรุณาบันทึกผล', 'Student confirmed the meeting — please write notes'),
          message: `${who} ${t('ยืนยันว่าได้เข้าพบตามนัดแล้ว', 'confirmed the meeting took place on')} ${appointment.scheduledDate} ${appointment.scheduledTime}`,
          relatedId: request.id,
          isRead: false,
        }
      : {
          userId: request.advisorId,
          type: 'warning',
          title: t('นักศึกษาแจ้งว่าไม่ได้เข้าพบ — กรุณานัดใหม่', 'Student says the meeting did not happen — please reschedule'),
          message: `${who} ${t('แจ้งว่าไม่ได้เข้าพบตามนัด', 'says the meeting did not happen on')} ${appointment.scheduledDate} ${appointment.scheduledTime}`,
          relatedId: request.id,
          isRead: false,
        })
    addToast('success',
      met ? t('ขอบคุณ บันทึกแล้ว', 'Thanks, saved') : t('แจ้งอาจารย์แล้ว', 'Your advisor has been told'),
      met ? t('อาจารย์จะบันทึกผลและมอบหมายงาน (ถ้ามี)', 'Your advisor will add notes and any tasks.') : t('อาจารย์จะนัดเวลาใหม่ให้', 'Your advisor will set a new time.'))
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-sky-200 dark:border-sky-800/70 bg-sky-50/70 dark:bg-sky-950/30">
      <div className="flex items-start gap-2.5">
        <CalendarCheck className="h-5 w-5 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('คุณได้เข้าพบอาจารย์แล้วหรือยัง?', 'Did you meet your advisor?')}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {getCategoryLabel(request.category)} · {appointment.scheduledDate} {appointment.scheduledTime}
            {appointment.location ? ` · ${appointment.location}` : ''}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={() => answer(true)} disabled={busy !== null}>
          {busy === 'met' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
          {t('เข้าพบแล้ว', 'Yes, we met')}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => answer(false)} disabled={busy !== null}>
          {busy === 'missed' ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
          {t('ไม่ได้เข้าพบ', 'No, it didn’t happen')}
        </Button>
      </div>
    </div>
  )
}
