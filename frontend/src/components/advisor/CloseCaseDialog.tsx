import { useState } from 'react'
import { CheckCircle2, Circle, Loader2, Star, ListPlus } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import type { AdvisingRequest } from '@/types'
import { FollowUpTaskFields, emptyFollowUpDraft, useAssignFollowUps, useCheckDrafts, type FollowUpDraft } from './FollowUpTasks'

/**
 * Advisor's final step: review the student's completed tasks, then either close the case
 * or assign more tasks and keep it open (as many rounds as needed).
 * Closing asks the student for an optional rating.
 */
export function CloseCaseDialog({ request, onClose }: { request: AdvisingRequest | null; onClose: () => void }) {
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()
  const { addToast } = useToast()
  const [closing, setClosing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [rows, setRows] = useState<FollowUpDraft[]>([emptyFollowUpDraft()])
  const assignFollowUps = useAssignFollowUps()
  const checkDrafts = useCheckDrafts()

  if (!request) return null

  function dismiss() {
    setAssigning(false)
    setRows([emptyFollowUpDraft()])
    onClose()
  }

  function handleAssignMore() {
    if (!request || !checkDrafts(rows, true)) return
    const created = assignFollowUps({ drafts: rows, requestId: request.id, sessionId: session?.id, studentId: request.studentId })
    addToast(
      'success',
      t(`มอบหมายงานเพิ่ม ${created.length} งาน`, `${created.length} more task(s) assigned`),
      t('เคสยังเปิดอยู่ และจะกลับมาให้ตรวจสอบเมื่อนักศึกษาทำเสร็จ', 'The case stays open and comes back for review when the student finishes.')
    )
    dismiss()
  }

  const student = store.users.find(u => u.id === request.studentId)
  const session = store.sessions.find(s => s.requestId === request.id)
  const followUps = store.followUps.filter(f => f.requestId === request.id)

  async function handleClose() {
    if (!request) return
    setClosing(true)
    try {
      await store.closeRequest(request.id)
      store.addNotification({
        userId: request.studentId,
        type: 'success',
        title: t('การให้คำปรึกษาเสร็จสมบูรณ์แล้ว', 'Your advising case is finished'),
        message: t(
          `อาจารย์ปิดเคส "${getCategoryLabel(request.category)}" แล้ว ช่วยบอกเราหน่อยว่าการให้คำปรึกษาเป็นอย่างไร (ไม่บังคับ)`,
          `Your advisor closed "${getCategoryLabel(request.category)}". Tell us how it went (optional).`
        ),
        relatedId: request.id,
        isRead: false,
      })
      addToast('success', t('ปิดเคสเรียบร้อยแล้ว', 'Case Closed'), student?.name || '')
      dismiss()
    } catch {
      addToast('error', t('ปิดเคสไม่สำเร็จ', 'Could Not Close Case'), t('กรุณาลองใหม่อีกครั้ง', 'Please try again.'))
    } finally {
      setClosing(false)
    }
  }

  return (
    <Modal isOpen onClose={closing ? () => {} : dismiss} title={t('ตรวจสอบและปิดเคส', 'Review & Close Case')} size="md">
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {student?.name || request.studentId}
            {student?.code && <span className="ml-1.5 font-mono font-normal text-slate-500 dark:text-slate-400">({student.code})</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getCategoryLabel(request.category)}</p>
          {session?.summary && (
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2.5 line-clamp-3 whitespace-pre-wrap">{session.summary}</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
            {followUps.length > 0
              ? t('งานที่นักศึกษาทำเสร็จแล้ว', 'Tasks the student completed')
              : t('ไม่มีงานติดตามผลสำหรับเคสนี้', 'No follow-up tasks for this case')}
          </h4>
          {followUps.length > 0 && (
            <ul className="space-y-2">
              {followUps.map(f => {
                const latest = store.followUpProgress
                  .filter(p => p.followUpId === f.id)
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
                const done = f.status === 'completed'
                return (
                  <li key={f.id} className="flex gap-2.5 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                    {done
                      ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      : <Circle className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{f.task}</p>
                      {latest?.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                          <span className="font-semibold">{t('นักศึกษารายงาน:', 'Student reported:')}</span> {latest.notes}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {assigning ? (
          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('มอบหมายงานเพิ่ม', 'Assign more tasks')}</p>
              <p className="text-[0.6875rem] text-slate-600 dark:text-slate-400 mt-0.5">
                {t('เคสจะยังไม่ปิด นักศึกษาจะได้รับแจ้งเตือน และเคสจะกลับมาที่นี่เมื่อทำงานครบ', 'The case stays open, the student is notified, and it comes back here once they finish.')}
              </p>
            </div>
            <FollowUpTaskFields rows={rows} onChange={setRows} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setAssigning(false); setRows([emptyFollowUpDraft()]) }}>{t('ยกเลิก', 'Cancel')}</Button>
              <Button size="sm" onClick={handleAssignMore}>
                <ListPlus className="h-4 w-4 mr-1.5" />
                {t('มอบหมายและเปิดเคสไว้', 'Assign & keep open')}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <Star className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
              {t(
                'เมื่อปิดเคส นักศึกษาจะได้รับคำถามประเมินความพึงพอใจ 1 ข้อ (ไม่บังคับ) คำตอบจะไม่แสดงให้อาจารย์เห็น',
                'After closing, the student is asked one optional rating question. Advisors do not see individual answers.'
              )}
            </p>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={dismiss} disabled={closing}>{t('ยกเลิก', 'Cancel')}</Button>
              <Button variant="secondary" onClick={() => setAssigning(true)} disabled={closing}>
                <ListPlus className="h-4 w-4 mr-1.5" />
                {t('มอบหมายงานเพิ่ม', 'Assign another task')}
              </Button>
              <Button onClick={handleClose} disabled={closing}>
                {closing
                  ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                {t('ปิดเคส', 'Close Case')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
