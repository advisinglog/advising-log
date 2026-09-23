import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Card, Button, EmptyState } from '@/components/ui'
import { ClipboardCheck, User, PlusCircle } from 'lucide-react'

import { isAdvisorMatch } from '@/utils/advisorUtils'

export default function AdvisorLog() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel } = useLanguage()

  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [summary, setSummary] = useState('')
  const [problem, setProblem] = useState('')
  const [advice, setAdvice] = useState('')
  const [actionsTaken, setActionsTaken] = useState('')
  const [outcome, setOutcome] = useState('')
  const [followUpTask, setFollowUpTask] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')

  if (!currentUser) return null

  // Completed requests that don't have a session log yet
  const completedRequests = store.requests.filter(r =>
    isAdvisorMatch(r.advisorId, currentUser, store.users) && r.status === 'completed' &&
    !store.sessions.find(s => s.requestId === r.id)
  )

  const selectedReq = store.requests.find(r => r.id === selectedRequestId)
  const student = selectedReq ? store.users.find(u => u.id === selectedReq.studentId) : null
  const appointment = selectedReq ? store.appointments.find(a => a.requestId === selectedReq.id) : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRequestId || !summary || !problem || !advice) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง', 'Please complete all required fields.'))
      return
    }
    const session = store.addSession({
      requestId: selectedRequestId,
      appointmentId: appointment?.id || '',
      studentId: selectedReq!.studentId,
      advisorId: currentUser!.id,
      sessionDate: new Date().toISOString().split('T')[0],
      summary, problem, advice, actionsTaken, outcome,
    })
    store.updateRequestStatus(selectedRequestId, 'closed')
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'log_created',
      description: `Created advising log for ${student?.name}`,
      targetId: session.id,
    })

    // Create follow-up if specified
    if (followUpTask && followUpDate) {
      const fu = store.addFollowUp({
        sessionId: session.id,
        requestId: selectedRequestId,
        studentId: selectedReq!.studentId,
        advisorId: currentUser!.id,
        task: followUpTask,
        dueDate: followUpDate,
        status: 'pending',
      })
      store.addNotification({
        userId: selectedReq!.studentId,
        type: 'action_required',
        title: t('งานติดตามผลใหม่จากอาจารย์', 'New Follow-up Task'),
        message: `${t('อาจารย์มอบหมายงานติดตามผล:', 'Your advisor has assigned a follow-up:')} ${followUpTask}`,
        relatedId: fu.id,
        isRead: false,
      })
      store.addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        userRole: 'advisor',
        action: 'followup_created',
        description: `Created follow-up for ${student?.name}: ${followUpTask}`,
        targetId: fu.id,
      })
    }

    addToast('success', t('บันทึกผลการให้คำปรึกษาแล้ว', 'Advising Log Saved'), t('บันทึกและประวัติการให้คำปรึกษาได้รับการอัปเดตเรียบร้อย', 'The session record and audit trail have been updated.'))
    setSelectedRequestId(''); setSummary(''); setProblem(''); setAdvice(''); setActionsTaken(''); setOutcome(''); setFollowUpTask(''); setFollowUpDate('')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={t('บันทึกผลการเข้าพบอาจารย์ที่ปรึกษา', 'Advisor Log Entry')}
        description={t('บันทึกสรุปผลการให้คำปรึกษา คำแนะนำที่มอบหมาย และกำหนดงานติดตามผลแก่นักศึกษา', 'Document session notes, advice provided, and assign action items.')}
      />

      {completedRequests.length === 0 && !selectedRequestId ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6 text-sky-500" />}
            title={t('ไม่มีนัดหมายที่รอการเขียนบันทึก', 'No sessions pending documentation')}
            description={t('เมื่อคุณกด "เสร็จสิ้น" ในแท็บรายการนัดหมาย จะสามารถเขียนบันทึกผลการให้คำปรึกษาได้ที่นี่', 'Mark a scheduled session as \'Completed\' in the Sessions tab to write its official advising log.')}
          />
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('เลือกนัดหมายที่เสร็จสิ้นแล้ว', 'Select Completed Session')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRequestId}
                onChange={e => setSelectedRequestId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="">{t('-- เลือกรายการนัดหมายที่ต้องการบันทึก --', 'Select a completed session to log')}</option>
                {completedRequests.map(r => {
                  const s = store.users.find(u => u.id === r.studentId)
                  return (
                    <option key={r.id} value={r.id}>
                      {s?.name} ({s?.code}) — {getCategoryLabel(r.category)}
                    </option>
                  )
                })}
              </select>
            </div>

            {selectedReq && (
              <div className="p-4 bg-sky-50/40 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/80 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /> {t('นักศึกษา:', 'Student:')} {student?.name} ({student?.code})
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed"><span className="text-slate-400 font-medium">{t('หัวข้อคำร้อง:', 'Topic Details:')}</span> {selectedReq.details}</p>
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('สรุปผลการให้คำปรึกษา', 'Session Summary')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={3}
                placeholder={t('สรุปภาพรวมประเด็นการเข้าพบและพูดคุย...', 'High-level summary of the advising meeting...')}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('ปัญหา / อุปสรรคที่นักศึกษาประสบ', 'Student Problem / Challenges')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={problem}
                onChange={e => setProblem(e.target.value)}
                rows={2}
                placeholder={t('ปัญหาหลักที่พบระหว่างการให้คำปรึกษา...', 'Key issues identified during the session...')}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('คำแนะนำและแนวทางแก้ไขที่มอบให้', 'Advice & Solutions Provided')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={advice}
                onChange={e => setAdvice(e.target.value)}
                rows={2}
                placeholder={t('ข้อแนะนำทางวิชาการหรือแนวทางปฏิบัติตน...', 'Specific academic or personal recommendations given...')}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">{t('การดำเนินการทันที (ถ้ามี)', 'Actions Taken')}</label>
                <textarea
                  value={actionsTaken}
                  onChange={e => setActionsTaken(e.target.value)}
                  rows={2}
                  placeholder={t('ขั้นตอนที่ได้ดำเนินการไปแล้วระหว่างเข้าพบ...', 'Immediate steps completed...')}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">{t('ผลลัพธ์ที่คาดหวัง', 'Outcome / Expected Result')}</label>
                <textarea
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  rows={2}
                  placeholder={t('ผลลัพธ์หรือเป้าหมายที่คาดว่าจะเกิดขึ้น...', 'Expected follow-up result...')}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            {/* Follow-up section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('มอบหมายงานติดตามผล (ไม่บังคับ)', 'Assign Follow-up Task (Optional)')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('รายละเอียดงานที่มอบหมาย', 'Task Description')}</label>
                  <input
                    type="text"
                    value={followUpTask}
                    onChange={e => setFollowUpTask(e.target.value)}
                    placeholder={t('เช่น ส่งแบบคำร้องเพิ่ม-ถอนรายวิชาที่แก้ไขแล้ว', 'e.g. Submit updated course registration form')}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('กำหนดส่งงาน', 'Target Due Date')}</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary">{t('บันทึกผลการให้คำปรึกษา', 'Save Advising Log')}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

