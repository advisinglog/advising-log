import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, StatusBadge, Button, GoogleCalendarButton } from '@/components/ui'
import type { FollowUp } from '@/types'
import { CheckCircle2, ListChecks, Calendar, User, ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function FollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (!currentUser) return null

  // Multi-identifier student match (handles ID, student code, email, or DB user aliases)
  const studentIdentifiers = new Set<string>([
    currentUser.id,
    currentUser.code,
    currentUser.email?.toLowerCase(),
    ...store.users
      .filter(u =>
        u.id === currentUser.id ||
        (currentUser.code && u.code?.toUpperCase() === currentUser.code.toUpperCase()) ||
        (currentUser.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
      )
      .flatMap(u => [u.id, u.code, u.email?.toLowerCase()].filter(Boolean) as string[])
  ].filter(Boolean) as string[])

  const isCurrentStudent = (id?: string | null) => {
    if (!id) return false
    return studentIdentifiers.has(id) ||
      (currentUser.code && id.toUpperCase() === currentUser.code.toUpperCase()) ||
      (currentUser.email && id.toLowerCase() === currentUser.email.toLowerCase())
  }

  const myRequestIds = new Set(store.requests.filter(r => isCurrentStudent(r.studentId)).map(r => r.id))
  const mySessionIds = new Set(store.sessions.filter(s => isCurrentStudent(s.studentId) || (s.requestId && myRequestIds.has(s.requestId))).map(s => s.id))

  const isMyFollowUp = (f: FollowUp) => {
    if (isCurrentStudent(f.studentId)) return true
    if (f.requestId && myRequestIds.has(f.requestId)) return true
    if (f.sessionId && mySessionIds.has(f.sessionId)) return true
    return false
  }

  const myFollowUps = store.followUps.filter(isMyFollowUp)
  const pendingTasks = myFollowUps.filter(f => f.status !== 'completed')

  function handleCompleteTask(f: FollowUp) {
    store.updateFollowUpStatus(f.id, 'completed')
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'student',
      action: 'followup_completed' as any,
      description: `Completed task: ${f.task}`,
      targetId: f.id,
    })
    addToast('success', t('ดำเนินการเสร็จสิ้นแล้ว', 'Task Completed'), f.task)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title={t('สิ่งที่ต้องทำต่อ', 'Tasks & Next Steps')}
        description={t('รายการสิ่งที่อาจารย์ที่ปรึกษาแนะนำให้ดำเนินการต่อหลังการเข้าพบ', 'Action items and next steps recommended by your advisor from your advising sessions.')}
      />

      {/* Active Pending Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t('งานที่ต้องทำ', 'Pending Tasks')}
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              {pendingTasks.length}
            </span>
          </h3>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center shadow-2xs">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t('ไม่มีงานค้างที่ต้องทำ', 'All Tasks Completed')}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {t('คุณได้ปฏิบัติตามคำแนะนำของอาจารย์ครบถ้วนแล้ว', 'You have no pending action items right now.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingTasks.map(f => {
              const advisor = store.users.find(u => u.id === f.advisorId)
              return (
                <div
                  key={f.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {f.task}
                      </span>
                      <StatusBadge status={f.status} />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      {f.dueDate && (
                        <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/50 dark:border-rose-900/40">
                          <Calendar className="h-3 w-3" />
                          {t('กำหนดส่ง:', 'Due:')} {f.dueDate}
                        </span>
                      )}
                      {advisor && (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <User className="h-3 w-3 text-slate-400" />
                          {advisor.name}
                        </span>
                      )}
                      {f.requestId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/student/history/${f.requestId}`)}
                          className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                        >
                          <span>{t('ดูบันทึกการคุย', 'View Session')}</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    {f.dueDate && (
                      <GoogleCalendarButton
                        event={{
                          title: `Task Due: ${f.task}`,
                          description: `Action item assigned by ${advisor?.name || 'Advisor'}\nTask: ${f.task}`,
                          date: f.dueDate,
                          time: '09:00',
                          attendeeEmails: [currentUser.email],
                        }}
                        label={t('เตือนใน Calendar', 'Remind Me')}
                        size="sm"
                        variant="secondary"
                      />
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleCompleteTask(f)}
                      className="gap-1.5 font-bold"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{t('ทำเสร็จแล้ว', 'Mark Done')}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
