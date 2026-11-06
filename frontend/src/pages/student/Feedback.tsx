// ============================================================
// Student — Anonymous Feedback (any time: advising, app problems, anything else)
// The sender is never stored; only QA can read entries.
// ============================================================

import { useState } from 'react'
import { MessageCircle, Bug, HelpCircle, EyeOff, Loader2, CheckCircle2, Send } from 'lucide-react'
import { PageHeader, Card, Button, RequiredMark, StarRating } from '@/components/ui'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import api from '@/services/apiClient'
import { cn } from '@/lib/utils'
import type { FeedbackTopic } from '@/types'

const MAX_LENGTH = 1000

export default function Feedback() {
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [topic, setTopic] = useState<FeedbackTopic | null>(null)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const topics: { value: FeedbackTopic; label: string; hint: string; icon: typeof Bug }[] = [
    { value: 'advising', label: t('การให้คำปรึกษา', 'Advising'), hint: t('อาจารย์ การนัดหมาย การช่วยเหลือ', 'Advisors, meetings, support'), icon: MessageCircle },
    { value: 'app_bug', label: t('ปัญหาการใช้งานระบบ', 'App problem'), hint: t('บั๊ก หน้าเว็บไม่ทำงาน ใช้งานยาก', 'Bugs, broken pages, hard to use'), icon: Bug },
    { value: 'other', label: t('อื่นๆ', 'Other'), hint: t('ข้อเสนอแนะทั่วไป', 'Anything else'), icon: HelpCircle },
  ]

  const canSend = Boolean(topic) && message.trim().length > 0 && !sending

  async function handleSend() {
    if (!topic || !message.trim()) return
    setSending(true)
    const res = await api.submitFeedback({ topic, rating: rating || undefined, message: message.trim() })
    setSending(false)
    if (!res?.success) {
      addToast('error', t('ส่งไม่สำเร็จ', 'Could Not Send'), t('กรุณาลองใหม่อีกครั้ง', 'Please try again.'))
      return
    }
    setSent(true)
  }

  function reset() {
    setTopic(null)
    setRating(0)
    setMessage('')
    setSent(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title={t('ข้อเสนอแนะ', 'Feedback')}
        description={t(
          'แจ้งปัญหา บั๊ก หรือสิ่งที่อยากให้ปรับปรุง ส่งได้ทุกเมื่อ',
          'Tell us about a problem, a bug, or anything we could do better. Send any time.'
        )}
      />

      <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl border border-sky-200/80 dark:border-sky-800/60 bg-sky-50/70 dark:bg-sky-950/30">
        <EyeOff className="h-4 w-4 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="text-xs text-sky-900 dark:text-sky-100 leading-relaxed">
          <span className="font-bold">{t('ไม่ระบุตัวตน', 'Anonymous.')}</span>{' '}
          {t(
            'ระบบไม่บันทึกชื่อหรือรหัสนักศึกษาของคุณ ไม่มีใครเห็นว่าใครเป็นคนส่ง ทีมประกันคุณภาพอ่านเพื่อปรับปรุงบริการเท่านั้น กรุณาอย่าใส่ข้อมูลส่วนตัวในข้อความ',
            'Your name and student ID are not saved, and nobody can see who sent it. Only the QA team reads it, to improve the service. Please don’t include personal details in your message.'
          )}
        </p>
      </div>

      {sent ? (
        <Card>
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-600 dark:text-emerald-400" />
            <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">{t('ส่งเรียบร้อยแล้ว ขอบคุณ!', 'Sent. Thank you!')}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('ข้อเสนอแนะของคุณถูกส่งแบบไม่ระบุตัวตน', 'Your feedback was sent anonymously.')}</p>
            <Button variant="secondary" className="mt-4" onClick={reset}>{t('ส่งอีกเรื่อง', 'Send another')}</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-5">
            <fieldset>
              <legend className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('เรื่องที่ต้องการแจ้ง', 'What is it about?')} <RequiredMark />
              </legend>
              <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {topics.map(({ value, label, hint, icon: Icon }) => {
                  const active = topic === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTopic(value)}
                      className={cn(
                        'flex sm:flex-col items-center sm:items-start gap-2.5 sm:gap-1.5 p-3 rounded-xl border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                        active
                          ? 'border-sky-500 bg-sky-50 dark:border-sky-400/70 dark:bg-sky-950/50'
                          : 'border-slate-200 hover:border-sky-300 dark:border-slate-700 dark:hover:border-sky-700'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400')} />
                      <span>
                        <span className="block text-xs font-bold text-slate-900 dark:text-slate-100">{label}</span>
                        <span className="block text-[0.6875rem] text-slate-500 dark:text-slate-400">{hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('ความพึงพอใจโดยรวม', 'Overall satisfaction')}
                <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">{t('(ไม่บังคับ)', '(optional)')}</span>
              </p>
              <StarRating value={rating} onChange={setRating} label={t('ความพึงพอใจโดยรวม', 'Overall satisfaction')} />
            </div>

            <div>
              <label htmlFor="feedback-message" className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('รายละเอียด', 'Your message')} <RequiredMark />
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={MAX_LENGTH}
                rows={5}
                placeholder={t(
                  'เช่น หน้านัดหมายโหลดไม่ขึ้นตอนใช้มือถือ หรือ อยากให้มีการแจ้งเตือนก่อนถึงวันนัด',
                  'e.g. The appointments page doesn’t load on my phone, or I’d like a reminder before my meeting.'
                )}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
              <p className="text-right text-[0.6875rem] tabular-nums text-slate-400 mt-1">{message.length} / {MAX_LENGTH}</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={!canSend}>
                {sending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                {t('ส่งแบบไม่ระบุตัวตน', 'Send anonymously')}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
