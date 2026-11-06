import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button, StarRating, StarDisplay } from '@/components/ui'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import type { AdvisingRequest } from '@/types'

const skipKey = (id: string) => `advising_log_feedback_skipped_${id}`

function wasSkipped(id: string): boolean {
  try { return localStorage.getItem(skipKey(id)) === '1' } catch { return false }
}

/**
 * Shown on a closed request: "case finished" notice plus one optional rating question.
 * Skipping never blocks anything; the rating is hidden from advisors and admins by the API.
 */
export function CaseFeedbackCard({ request }: { request: AdvisingRequest }) {
  const store = useStore()
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [skipped, setSkipped] = useState(() => wasSkipped(request.id))

  const closedDate = request.closedAt ? new Date(request.closedAt).toLocaleDateString() : null
  const alreadyRated = request.satisfactionRating != null

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)
    try {
      await store.submitRequestFeedback(request.id, rating, comment)
      addToast('success', t('ขอบคุณสำหรับความคิดเห็น', 'Thanks for your feedback'), '')
    } catch {
      addToast('error', t('ส่งความคิดเห็นไม่สำเร็จ', 'Could Not Send Feedback'), t('กรุณาลองใหม่อีกครั้ง', 'Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkip() {
    try { localStorage.setItem(skipKey(request.id), '1') } catch { /* per-device convenience only */ }
    setSkipped(true)
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/30">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h3 className="text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-100">
            {t('การให้คำปรึกษาเสร็จสมบูรณ์แล้ว', 'This advising case is finished')}
          </h3>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
            {t('อาจารย์ตรวจสอบงานของคุณและปิดเคสแล้ว', 'Your advisor reviewed your tasks and closed the case.')}
            {closedDate && ` (${closedDate})`}
          </p>
        </div>
      </div>

      {alreadyRated ? (
        <p className="mt-3.5 pt-3.5 border-t border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
          {t('คุณให้คะแนน', 'You rated it')}
          <StarDisplay value={request.satisfactionRating || 0} />
          {t('— ขอบคุณ!', '— thank you!')}
        </p>
      ) : !skipped && (
        <div className="mt-3.5 pt-3.5 border-t border-emerald-200/80 dark:border-emerald-800/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('การให้คำปรึกษาครั้งนี้เป็นอย่างไร?', 'How was your advising?')}
            <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">{t('(ไม่บังคับ)', '(optional)')}</span>
          </p>

          <div className="mt-2">
            <StarRating value={rating} onChange={setRating} label={t('คะแนนความพึงพอใจ', 'Satisfaction rating')} />
          </div>

          {rating > 0 && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={t('อยากบอกอะไรเพิ่มเติมไหม? (ไม่บังคับ)', 'Anything else to share? (optional)')}
              className="mt-2.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleSubmit} disabled={!rating || submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {t('ส่งความคิดเห็น', 'Send Feedback')}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSkip} disabled={submitting}>
              {t('ข้าม', 'Skip')}
            </Button>
          </div>
          <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-2">
            {t('อาจารย์ที่ปรึกษาจะไม่เห็นคำตอบของคุณ ทีมประกันคุณภาพอ่านได้โดยไม่ระบุชื่อ เพื่อปรับปรุงบริการเท่านั้น', 'Your advisor will not see your answer. The QA team reads it without your name, only to improve the service.')}
          </p>
        </div>
      )}
    </div>
  )
}
