import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { PageHeader, StatusBadge, EmptyState, Button } from '@/components/ui'
import { ListChecks, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdvisorFollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (!currentUser) return null

  const followUps = store.followUps
    .filter(f => (currentUser.role === 'qa_chair' || isAdvisorMatch(f.advisorId, currentUser, store.users)) && f.status !== 'completed')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  return (
    <div>
      <PageHeader
        title={t('งานติดตามผลค้างอยู่', 'Open Follow-up Tasks')}
        description={t('ตรวจสอบงานที่มอบหมายให้นักศึกษาและติดตามสถานะการดำเนินงาน', 'Review assigned student tasks and track their progress.')}
        actions={
          <Button variant="secondary" onClick={() => navigate('/advisor/sessions')}>
            {t('กลับไปหน้าการนัดหมาย', 'Back to Sessions')} <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        }
      />

      {followUps.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8 text-slate-400" />}
          title={t('ไม่มีงานติดตามผลค้างอยู่', 'No open follow-up tasks')}
          description={t('งานติดตามผลทั้งหมดเสร็จสมบูรณ์แล้ว', 'All follow-up tasks are completed.')}
        />
      ) : (
        <div className="space-y-3">
          {followUps.map(followUp => {
            const student = store.users.find(u => u.id === followUp.studentId)
            const request = followUp.requestId ? store.requests.find(r => r.id === followUp.requestId) : undefined

            return (
              <div key={followUp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 rounded-2xl">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{followUp.task}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('นักศึกษา:', 'Student:')} {student?.name || followUp.studentId}
                    {student?.code ? ` (${student.code})` : ''}
                    {' · '}
                    {t('กำหนด:', 'Due:')} {followUp.dueDate || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <StatusBadge status={followUp.status} />
                  {request && (
                    <Button size="sm" variant="secondary" onClick={() => navigate('/advisor/log', { state: { requestId: request.id } })}>
                      {t('ดูรายละเอียด', 'View Details')}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
