import { useEffect, useState } from 'react'
import { MessageCircle, EyeOff, Loader2, RefreshCw } from 'lucide-react'
import { Card, EmptyState, Button, Tabs, StarDisplay } from '@/components/ui'
import { useLanguage } from '@/contexts/LanguageContext'
import api from '@/services/apiClient'
import type { FeedbackTopic, StudentFeedback } from '@/types'

type Filter = 'all' | FeedbackTopic

/** QA view of anonymous anytime feedback. Entries carry no sender by design. */
export function AnonymousFeedbackPanel() {
  const { t } = useLanguage()
  const [items, setItems] = useState<StudentFeedback[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  async function load() {
    setLoading(true)
    const res = await api.getFeedback()
    setFailed(!res)
    setItems(res?.feedback ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const topicLabel: Record<FeedbackTopic, string> = {
    advising: t('การให้คำปรึกษา', 'Advising'),
    app_bug: t('ปัญหาการใช้งานระบบ', 'App problem'),
    other: t('อื่นๆ', 'Other'),
  }
  const list = items ?? []
  const shown = filter === 'all' ? list : list.filter(f => f.topic === filter)
  const count = (topic: FeedbackTopic) => list.filter(f => f.topic === topic).length

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t('ข้อเสนอแนะจากนักศึกษา (ไม่ระบุตัวตน)', 'Student Feedback (anonymous)')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('นักศึกษาส่งได้ทุกเมื่อ: เรื่องการให้คำปรึกษา ปัญหาระบบ และอื่นๆ', 'Sent by students any time: advising, app problems, and anything else.')}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="sr-only">{t('รีเฟรช', 'Refresh')}</span>
        </Button>
      </div>

      <Tabs
        tabs={[
          { value: 'all', label: t('ทั้งหมด', 'All'), count: list.length },
          { value: 'advising', label: topicLabel.advising, count: count('advising') },
          { value: 'app_bug', label: topicLabel.app_bug, count: count('app_bug') },
          { value: 'other', label: topicLabel.other, count: count('other') },
        ]}
        active={filter}
        onChange={v => setFilter(v as Filter)}
      />

      {failed ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 py-4">{t('โหลดข้อเสนอแนะไม่สำเร็จ กรุณากดรีเฟรช', 'Could not load feedback. Press refresh to try again.')}</p>
      ) : !loading && shown.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-8 w-8 text-slate-400" />}
          title={t('ยังไม่มีข้อเสนอแนะ', 'No feedback yet')}
          description={t('ข้อเสนอแนะที่นักศึกษาส่งจะแสดงที่นี่', 'Feedback students send will appear here.')}
        />
      ) : (
        <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
          {shown.map(f => (
            <li key={f.id} className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {topicLabel[f.topic]}
                </span>
                {f.rating ? <StarDisplay value={f.rating} /> : null}
                <span className="ml-auto text-[0.6875rem] text-slate-400">{f.createdAt}</span>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{f.message}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-3">
        <EyeOff className="h-3.5 w-3.5" />
        {t('ระบบไม่บันทึกผู้ส่ง จึงไม่สามารถติดตามตัวผู้ส่งได้', 'The sender is never stored, so entries cannot be traced to a student.')}
      </p>
    </Card>
  )
}
