import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, Modal, Card, GoogleCalendarButton } from '@/components/ui'
import type { FollowUp, FollowUpProgress } from '@/types'
import { CheckCircle2, ListChecks, TrendingUp, Clock } from 'lucide-react'

export default function FollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null)
  const [progressValue, setProgressValue] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')

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

  const myFollowUps = store.followUps.filter(f => isCurrentStudent(f.studentId))
  const myProgress = store.followUpProgress.filter(fp => isCurrentStudent(fp.studentId))

  function getProgressForFollowUp(followUpId: string): FollowUpProgress | undefined {
    return myProgress.find(fp => fp.followUpId === followUpId)
  }

  function handleOpenProgressModal(f: FollowUp) {
    setSelectedFollowUp(f)
    const fp = getProgressForFollowUp(f.id)
    setProgressValue(fp?.progress ?? 0)
    setProgressNotes(fp?.notes ?? '')
    setShowProgressModal(true)
  }

  function handleUpdateProgress() {
    if (!selectedFollowUp || !currentUser) return
    const existing = getProgressForFollowUp(selectedFollowUp.id)
    if (existing) {
      store.updateFollowUpProgress(existing.id, progressValue, progressNotes)
    } else {
      store.addFollowUpProgress({
        followUpId: selectedFollowUp.id,
        studentId: currentUser.id,
        progress: progressValue,
        notes: progressNotes,
        status: progressValue >= 100 ? 'submitted' : 'in_progress',
      })
    }
    if (progressValue >= 100 && selectedFollowUp.status !== 'completed') {
      store.updateFollowUpStatus(selectedFollowUp.id, 'completed')
    }
    store.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'student',
      action: 'followup_completed' as any,
      description: `Updated progress for ${selectedFollowUp.task}: ${progressValue}%`,
      targetId: selectedFollowUp.id,
    })
    addToast('success', t('อัปเดตความคืบหน้าแล้ว', 'Progress Updated'), t('บันทึกความคืบหน้างานเรียบร้อยแล้ว', 'Progress has been recorded successfully.'))
    setShowProgressModal(false)
    setSelectedFollowUp(null)
    setProgressValue(0)
    setProgressNotes('')
  }

  const columns = [
    {
      key: 'task',
      header: t('งานที่ได้รับมอบหมาย', 'Assigned Task'),
      render: (f: FollowUp) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
            <ListChecks className="h-4 w-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{f.task}</span>
        </div>
      ),
    },
    { key: 'session', header: t('รหัสคำร้องอ้างอิง', 'Request Reference'), render: (f: FollowUp) => <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{f.requestId}</span> },
    {
      key: 'advisor',
      header: t('อาจารย์ที่ปรึกษา', 'Advisor'),
      render: (f: FollowUp) => {
        const advisor = store.users.find(u => u.id === f.advisorId)
        return <span className="text-xs text-slate-600 dark:text-slate-300">{advisor?.name || '-'}</span>
      },
    },
    { key: 'due', header: t('กำหนดส่ง', 'Due Date'), render: (f: FollowUp) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{f.dueDate}</span> },
    {
      key: 'progress',
      header: t('ความคืบหน้า', 'Progress'),
      render: (f: FollowUp) => {
        const fp = getProgressForFollowUp(f.id)
        if (!fp) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${fp.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{fp.progress}%</span>
          </div>
        )
      },
    },
    { key: 'status', header: t('สถานะ', 'Status'), render: (f: FollowUp) => <StatusBadge status={f.status} /> },
    {
      key: 'actions',
      header: '',
      render: (f: FollowUp) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {f.dueDate && (
            <GoogleCalendarButton
              event={{
                title: `Follow-up Due: ${f.task}`,
                description: `Advising Action Item: ${f.task}\nDue Date: ${f.dueDate}`,
                date: f.dueDate,
                time: '09:00',
                attendeeEmails: [currentUser.email],
              }}
              label={t('เตือนความจำ', 'Set Reminder')}
              size="sm"
              variant="outline"
            />
          )}
          {f.status !== 'completed' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleOpenProgressModal(f)}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> {t('อัปเดต', 'Update')}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  store.updateFollowUpStatus(f.id, 'completed')
                  store.addAuditLog({ userId: currentUser.id, userName: currentUser.name, userRole: 'student', action: 'followup_completed', description: `Completed follow-up: ${f.task}`, targetId: f.id })
                  addToast('success', t('ดำเนินการเสร็จสิ้น', 'Follow-up Completed'), f.task)
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> {t('เสร็จแล้ว', 'Complete')}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('งานที่ต้องดำเนินการ / ติดตามผล', 'Assigned Follow-ups')}
        description={t('ติดตามและจัดการงานมอบหมายที่อาจารย์ที่ปรึกษาให้คำแนะนำไว้', 'Track, manage, and complete action items assigned by your academic advisor.')}
      />
      {myFollowUps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">{t('ไม่มีงานค้างที่ต้องทำ', 'All Tasks Completed')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('คุณได้ปฏิบัติตามคำแนะนำครบถ้วนแล้ว', 'You have completed all assigned follow-up tasks.')}</p>
        </div>
      ) : (
        <DataTable columns={columns} data={myFollowUps} emptyMessage={t('ไม่มีงานติดตามผลที่ค้างอยู่', 'No pending follow-ups assigned to your profile.')} />
      )}

      {/* Progress History Section */}
      {myProgress.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติความคืบหน้า', 'Progress History')}
          </h3>
          {myProgress.map(fp => {
            const followUp = myFollowUps.find(f => f.id === fp.followUpId)
            if (!followUp) return null
            return (
              <Card key={fp.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{followUp.task}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{fp.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${fp.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{fp.progress}%</span>
                  </div>
                </div>
                {fp.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">{fp.notes}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Progress Update Modal */}
      <Modal isOpen={showProgressModal} onClose={() => { setShowProgressModal(false); setSelectedFollowUp(null) }} title={t('อัปเดตความคืบหน้า', 'Update Progress')} size="md">
        <div className="space-y-4">
          <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-800">
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 mb-1">{t('งาน', 'Task')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{selectedFollowUp?.task}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ความคืบหน้า (%)', 'Progress (%)')}</label>
            <input
              type="range"
              min="0"
              max="100"
              value={progressValue}
              onChange={e => setProgressValue(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">0%</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{progressValue}%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">100%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('บันทึกเพิ่มเติม', 'Notes')}</label>
            <textarea
              value={progressNotes}
              onChange={e => setProgressNotes(e.target.value)}
              rows={3}
              placeholder={t('บันทึกสิ่งที่ทำไป หรือปัญหาที่พบ...', 'Record what you have done or any issues encountered...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => { setShowProgressModal(false); setSelectedFollowUp(null) }}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleUpdateProgress}>{t('บันทึก', 'Save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
