import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { PageHeader, StatusBadge, EmptyState, Button, Tabs, SearchInput } from '@/components/ui'
import { ListChecks, ListPlus, ArrowRight, CheckCircle2, RotateCcw, Calendar, Clock, User, Check } from 'lucide-react'
import { getLocalDateString } from '@/utils/dateUtils'
import type { FollowUp } from '@/types'
import { AddFollowUpModal } from '@/components/advisor/FollowUpTasks'

export default function AdvisorFollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()

  const initialTab = (location.state as { showAll?: boolean } | null)?.showAll ? 'completed' : 'pending'
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>(initialTab)
  const [search, setSearch] = useState('')
  const [showAddTask, setShowAddTask] = useState(false)

  if (!currentUser) return null

  const allFollowUps = store.followUps.filter(
    f => currentUser.role === 'qa_chair' || isAdvisorMatch(f.advisorId, currentUser, store.users)
  )

  const pendingList = allFollowUps
    .filter(f => f.status !== 'completed')
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  const completedList = allFollowUps
    .filter(f => f.status === 'completed')
    .sort((a, b) => (b.completedAt || b.createdAt || '').localeCompare(a.completedAt || a.createdAt || ''))

  const currentList = activeTab === 'pending' ? pendingList : completedList

  const filteredList = currentList.filter(f => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const student = store.users.find(u => u.id === f.studentId)
    return (
      f.task.toLowerCase().includes(q) ||
      (student?.name && student.name.toLowerCase().includes(q)) ||
      (student?.code && student.code.toLowerCase().includes(q))
    )
  })

  function handleMarkComplete(followUp: FollowUp) {
    store.updateFollowUpStatus(followUp.id, 'completed')
    addToast(
      'success',
      t('งานติดตามผลเสร็จสิ้นแล้ว', 'Task Marked Completed'),
      t(
        `งาน "${followUp.task}" ถูกทำเครื่องหมายว่าเสร็จสิ้นแล้วและย้ายไปแท็บ "เสร็จสิ้นแล้ว"`,
        `Task "${followUp.task}" has been moved to the Completed tab.`
      )
    )
  }

  function handleReopen(followUp: FollowUp) {
    store.updateFollowUpStatus(followUp.id, 'in_progress')
    addToast(
      'success',
      t('นำงานกลับมาติดตามต่อแล้ว', 'Task Reopened'),
      t(
        `งาน "${followUp.task}" ถูกย้ายกลับมายังแท็บ "กำลังติดตาม" เรียบร้อยแล้ว`,
        `Task "${followUp.task}" has been moved back to the In Progress tab.`
      )
    )
  }

  const tabs = [
    {
      value: 'pending',
      label: t('กำลังติดตาม / รอดำเนินการ', 'In Progress / Pending'),
      count: pendingList.length,
    },
    {
      value: 'completed',
      label: t('เสร็จสิ้นแล้ว', 'Completed Tasks'),
      count: completedList.length,
    },
  ]

  const todayStr = getLocalDateString()

  return (
    <div>
      <PageHeader
        title={t('ระบบติดตามผลนักศึกษา', 'Student Follow-up Tasks')}
        description={t(
          'ตรวจสอบงานที่มอบหมายให้นักศึกษา ติดตามความคืบหน้า และดูประวัติงานที่ทำเสร็จสิ้นแล้ว',
          'Track assigned student action items, monitor deadlines, and view completed task history.'
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            {currentUser.role === 'advisor' && (
              <Button onClick={() => setShowAddTask(true)}>
                <ListPlus className="h-4 w-4 mr-1.5" />
                {t('เพิ่มงานติดตามผล', 'Add Task')}
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/advisor/sessions')}>
              {t('กลับไปหน้าการนัดหมาย', 'Back to Sessions')} <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        }
      />

      <AddFollowUpModal isOpen={showAddTask} onClose={() => setShowAddTask(false)} />

      {/* Tabs Switch: In Progress vs Completed */}
      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={v => {
          setActiveTab(v as 'pending' | 'completed')
          setSearch('')
        }}
      />

      {/* Search and Filters */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('ค้นหาตามชื่องาน, รหัสนักศึกษา หรือชื่อนักศึกษา...', 'Search by task, student code, or name...')}
        />
      </div>

      {filteredList.length === 0 ? (
        <EmptyState
          icon={activeTab === 'pending' ? <ListChecks className="h-8 w-8 text-slate-400" /> : <CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          title={
            search
              ? t('ไม่พบงานที่ตรงกับการค้นหา', 'No tasks matching your search')
              : activeTab === 'pending'
                ? t('ไม่มีงานติดตามผลที่ค้างอยู่', 'No open follow-up tasks')
                : t('ยังไม่มีประวัติงานที่เสร็จสิ้น', 'No completed tasks yet')
          }
          description={
            search
              ? t('ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง', 'Try adjusting your search query.')
              : activeTab === 'pending'
                ? t('งานที่มอบหมายให้นักศึกษาทั้งหมดเสร็จสมบูรณ์เรียบร้อยแล้ว', 'All assigned student follow-up tasks are completed.')
                : t('เมื่องานได้รับการทำเครื่องหมายว่าเสร็จสิ้น จะถูกจัดเก็บไว้ในหน้านี้', 'Completed tasks will be archived in this tab.')
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map(followUp => {
            const student = store.users.find(u => u.id === followUp.studentId)
            const request = followUp.requestId ? store.requests.find(r => r.id === followUp.requestId) : undefined
            const isOverdue = activeTab === 'pending' && followUp.dueDate && followUp.dueDate < todayStr

            return (
              <div
                key={followUp.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  activeTab === 'completed'
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800'
                    : isOverdue
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/50'
                      : 'bg-white dark:bg-slate-900/90 border-slate-200/70 dark:border-slate-800 shadow-2xs hover:border-sky-300 dark:hover:border-sky-800'
                }`}
              >
                <div className="min-w-0 space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeTab === 'completed' ? (
                      <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                        isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-600'
                      }`}>
                        <Clock className="h-3 w-3" />
                      </div>
                    )}
                    <p className={`text-sm font-bold ${
                      activeTab === 'completed'
                        ? 'text-slate-600 dark:text-slate-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {followUp.task}
                    </p>
                    <StatusBadge status={followUp.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {student?.name || followUp.studentId}
                      {student?.code ? <span className="font-mono text-slate-400">({student.code})</span> : ''}
                    </span>

                    {activeTab === 'pending' && followUp.dueDate && (
                      <span className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                        isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {t('กำหนดส่ง:', 'Due:')} {followUp.dueDate}
                        {isOverdue && ` (${t('เกินกำหนด', 'Overdue')})`}
                      </span>
                    )}

                    {activeTab === 'completed' && (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/40 font-mono text-[0.6875rem]">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('เสร็จสิ้นเมื่อ:', 'Completed on:')} {followUp.completedAt || followUp.createdAt || '-'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {activeTab === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 font-bold"
                        onClick={() => handleMarkComplete(followUp)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {t('ทำเครื่องหมายว่าเสร็จสิ้น', 'Complete')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          navigate('/advisor/log', {
                            state: {
                              requestId: request?.id,
                              studentId: followUp.studentId,
                            },
                          })
                        }
                      >
                        {t('บันทึก / ขยายเวลา', 'Log / Extend')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1 text-xs"
                        onClick={() => handleReopen(followUp)}
                      >
                        <RotateCcw className="h-3 w-3 text-slate-500" />
                        {t('นำกลับมาติดตามต่อ', 'Reopen')}
                      </Button>
                      {request && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            navigate('/advisor/log', {
                              state: {
                                requestId: request.id,
                                studentId: followUp.studentId,
                              },
                            })
                          }
                        >
                          {t('ดูบันทึก', 'View Log')}
                        </Button>
                      )}
                    </>
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
