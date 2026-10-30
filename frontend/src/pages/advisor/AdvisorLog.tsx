import { useState, useEffect, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { PageHeader, Card, Button, EmptyState, DocumentViewerModal, Tabs, type DocumentViewerTarget } from '@/components/ui'
import {
  ClipboardCheck,
  User,
  PlusCircle,
  FileText,
  Eye,
  CheckCircle2,
  Pencil,
  CalendarClock,
  ChevronDown,
} from 'lucide-react'

import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'
import type { AdvisingRequest } from '@/types'

export default function AdvisorLog() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel } = useLanguage()
  const location = useLocation()

  type LogNavigationState = { appointmentId?: string; requestId?: string; studentId?: string }
  const navState = location.state as LogNavigationState | null

  // Preselected student if navigated from My Advisees, Appointments, or Dashboard
  const navStudent = navState?.studentId
    ? store.users.find(
        u =>
          u.id === navState.studentId ||
          u.code?.toUpperCase() === navState.studentId?.toUpperCase()
      )
    : null

  const isDirectStudentLog = Boolean(navStudent || (navState?.appointmentId && navState?.requestId && navState?.studentId))
  const [selectedRequestId, setSelectedRequestId] = useState<string>(navState?.requestId || '')
  const [section, setSection] = useState<'entry' | 'saved'>('entry')

  // Existing logs are editable only through the Saved Log tab.
  const [editingRequestId, setEditingRequestId] = useState('')
  const [summary, setSummary] = useState('')
  const [followUpTask, setFollowUpTask] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)
  const [autoApproveDocs, setAutoApproveDocs] = useState(true)

  // Auto-pull previous follow-ups interactive state
  const [extendingTaskId, setExtendingTaskId] = useState<string | null>(null)
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)

  // Resolve the actual request from the clicked appointment after backend data loads.
  const linkedAppointment = navState?.appointmentId
    ? store.appointments.find(a => a.id === navState.appointmentId)
    : undefined
  const linkedRequestId = linkedAppointment?.requestId || navState?.requestId || ''

  useEffect(() => {
    if (linkedRequestId) {
      setSelectedRequestId(linkedRequestId)
      setSection('entry')
    }
  }, [linkedRequestId])

  useEffect(() => {
    const existing = store.sessions.find(session => session.requestId === selectedRequestId)
    setSummary(existing?.summary || '')
  }, [selectedRequestId, store.sessions])

  function getAttachments(request: AdvisingRequest): DocumentViewerTarget[] {
    const studentObj = store.users.find(u => u.id === request.studentId)
    return (Array.isArray(request.attachments) ? request.attachments : []).map((attachment, index) => {
      let value = attachment as unknown
      if (typeof value === 'string' && value.startsWith('{')) {
        try {
          value = JSON.parse(value)
        } catch {}
      }

      if (typeof value === 'string') {
        const matchedDoc = store.documents.find(
          d => (d.studentId === request.studentId || (studentObj?.code && d.studentId.toUpperCase() === studentObj.code.toUpperCase())) &&
               (d.fileName === value || d.documentName === value)
        )
        return {
          id: matchedDoc?.id || `${request.id}-attachment-${index}`,
          fileName: matchedDoc?.fileName || value,
          title: matchedDoc?.documentName || value,
          fileUrl: matchedDoc?.fileUrl,
          cloudinaryPublicId: matchedDoc?.cloudinaryPublicId,
          signatureMethod: matchedDoc?.signatureMethod,
          studentName: studentObj?.name,
          studentCode: studentObj?.code,
          uploadedAt: matchedDoc?.uploadedAt,
        }
      }

      const file = value as Record<string, unknown>
      const fileName = String(file.fileName || file.name || file.originalFilename || `attachment-${index + 1}`)
      return {
        id: `${request.id}-attachment-${index}`,
        fileName,
        title: fileName,
        fileUrl: typeof file.fileUrl === 'string' ? file.fileUrl : typeof file.url === 'string' ? file.url : typeof file.secureUrl === 'string' ? file.secureUrl : undefined,
        cloudinaryPublicId: typeof file.cloudinaryPublicId === 'string' ? file.cloudinaryPublicId : typeof file.publicId === 'string' ? file.publicId : undefined,
        fileType: typeof file.fileType === 'string' ? file.fileType : undefined,
        signatureMethod: file.signatureMethod as any,
        studentName: studentObj?.name,
        studentCode: studentObj?.code,
        uploadedAt: typeof file.uploadedAt === 'string' ? file.uploadedAt : undefined,
      }
    })
  }

  if (!currentUser) return null

  // Keep recorded requests in Saved Log only, not in the new-entry dropdown.
  const eligibleRequests = store.requests.filter(r =>
    isAdvisorMatch(r.advisorId, currentUser, store.users) &&
    (r.status === 'scheduled' || r.status === 'completed' || r.status === 'closed')
  )
  const completedRequests = eligibleRequests.filter(r =>
    !store.sessions.some(session => session.requestId === r.id)
  )

  // Auto-select request if student was pre-selected and has an eligible request
  useEffect(() => {
    if (navStudent && !selectedRequestId) {
      const studentReq =
        completedRequests.find(r => r.studentId === navStudent.id) ||
        eligibleRequests.find(r => r.studentId === navStudent.id)
      if (studentReq) {
        setSelectedRequestId(studentReq.id)
      }
    }
  }, [navStudent, completedRequests, eligibleRequests, selectedRequestId])

  // A saved request can be selected for modification ONLY through its Edit button.
  const selectedReq = eligibleRequests.find(r =>
    r.id === selectedRequestId &&
    (completedRequests.some(pending => pending.id === r.id) || editingRequestId === r.id) &&
    (!navState?.studentId || !linkedRequestId || selectedRequestId !== linkedRequestId || r.studentId === navState.studentId)
  )

  const student = (selectedReq ? store.users.find(u => u.id === selectedReq.studentId) : null) || navStudent

  const appointment = selectedReq
    ? (linkedAppointment?.requestId === selectedReq.id
      ? linkedAppointment
      : store.appointments.find(a => a.requestId === selectedReq.id && isAdvisorMatch(a.advisorId, currentUser, store.users)))
    : null

  const existingSession = selectedRequestId
    ? store.sessions.find(session => session.requestId === selectedRequestId)
    : undefined

  const advisorSessions = store.sessions
    .filter(session => isAdvisorMatch(session.advisorId, currentUser, store.users))
    .sort((a, b) => {
      const bySessionDate = b.sessionDate.localeCompare(a.sessionDate)
      return bySessionDate || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
    })

  // Previous follow-up tasks for this student
  const studentFollowUps = student
    ? store.followUps.filter(
        f =>
          f.studentId === student.id ||
          (student.code && f.studentId?.toUpperCase() === student.code.toUpperCase())
      )
    : []
  const pendingFollowUps = studentFollowUps.filter(f => f.status !== 'completed')
  const completedFollowUps = studentFollowUps.filter(f => f.status === 'completed')

  function handleToggleFollowUp(fuId: string, status: 'completed' | 'in_progress', taskName: string) {
    store.updateFollowUpStatus(fuId, status)
    addToast(
      'success',
      t('บันทึกความคืบหน้าเรียบร้อย', 'Follow-up Updated'),
      status === 'completed'
        ? t(`ทำเครื่องหมายงาน "${taskName}" เสร็จสิ้นแล้ว`, `Marked "${taskName}" as completed.`)
        : t(`ปรับสถานะงาน "${taskName}" เป็นกำลังดำเนินการ`, `Marked "${taskName}" in progress.`)
    )
  }

  function handleExtendDueDate(fuId: string, newDueDate: string, taskName: string) {
    store.updateFollowUpStatus(fuId, 'in_progress', newDueDate)
    setExtendingTaskId(null)
    addToast(
      'success',
      t('ขยายวันกำหนดส่งเรียบร้อย', 'Due Date Extended'),
      t(
        `ขยายกำหนดส่งงาน "${taskName}" เป็นวันที่ ${newDueDate} แล้ว`,
        `Extended due date for "${taskName}" to ${newDueDate}.`
      )
    )
  }

  function editSavedLog(requestId: string) {
    setEditingRequestId(requestId)
    setSelectedRequestId(requestId)
    setSection('entry')
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const targetStudentId = selectedReq?.studentId || student?.id

    if (!targetStudentId || !summary.trim()) {
      addToast(
        'error',
        t('ข้อมูลไม่ครบถ้วน', 'Validation Error'),
        t('กรุณาระบุสรุปผลการให้คำปรึกษา', 'Please provide the advising summary.')
      )
      return
    }

    if (followUpTask.trim() && !followUpDate) {
      addToast(
        'error',
        t('กรุณาระบุวันกำหนดส่ง', 'Due Date Required'),
        t('กรุณาระบุวันที่กำหนดส่งสำหรับงานติดตามผลที่มอบหมาย', 'Please select a due date for the assigned follow-up task.')
      )
      return
    }

    if (!followUpTask.trim() && followUpDate) {
      addToast(
        'error',
        t('กรุณาระบุชื่องานติดตามผล', 'Follow-up Task Required'),
        t('กรุณาระบุรายละเอียดงานที่ต้องการมอบหมาย', 'Please specify the follow-up task description.')
      )
      return
    }

    const cleanSummary = summary.trim()
    const currentSession = selectedRequestId ? store.sessions.find(s => s.requestId === selectedRequestId) : undefined
    if (currentSession && editingRequestId !== selectedRequestId) {
      addToast(
        'error',
        t('รายการนี้บันทึกแล้ว', 'Already Recorded'),
        t('กรุณาแก้ไขจากแท็บบันทึกที่จัดเก็บแล้ว', 'Please use Edit in the Saved Log tab.')
      )
      return
    }

    // Resolve or generate requestId to satisfy foreign key requirement
    let reqId = selectedRequestId
    if (!reqId) {
      const anyReq = store.requests.find(
        r => r.studentId === targetStudentId && isAdvisorMatch(r.advisorId, currentUser, store.users)
      )
      if (anyReq) {
        reqId = anyReq.id
      } else {
        const walkInReq = store.addRequest({
          studentId: targetStudentId,
          advisorId: currentUser!.id,
          category: 'academic_performance',
          details: cleanSummary.slice(0, 150),
          preferredDate: getLocalDateString(),
          preferredTime: '10:00',
          attachments: [],
          pdpaConsent: true,
          status: 'completed',
        })
        reqId = walkInReq.id
      }
    }

    const session = currentSession
      ? (store.updateSession(currentSession.id, {
          sessionDate: getLocalDateString(),
          summary: cleanSummary,
          problem: cleanSummary,
          advice: cleanSummary,
        }),
        { ...currentSession, summary: cleanSummary, problem: cleanSummary, advice: cleanSummary })
      : store.addSession({
          requestId: reqId,
          appointmentId: appointment?.id || undefined,
          studentId: targetStudentId,
          advisorId: currentUser!.id,
          sessionDate: getLocalDateString(),
          summary: cleanSummary,
          problem: cleanSummary,
          advice: cleanSummary,
          actionsTaken: '',
          outcome: '',
        })

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'log_created',
      description: `Created advising log for ${student?.name || targetStudentId}`,
      targetId: session.id,
    })

    // Create follow-up if specified
    if (followUpTask.trim() && followUpDate) {
      const fu = store.addFollowUp({
        sessionId: session.id,
        requestId: reqId,
        studentId: targetStudentId,
        advisorId: currentUser!.id,
        task: followUpTask.trim(),
        dueDate: followUpDate,
        status: 'pending',
      })
      store.addNotification({
        userId: targetStudentId,
        type: 'action_required',
        title: t('งานติดตามผลใหม่จากอาจารย์', 'New Follow-up Task'),
        message: `${t('อาจารย์มอบหมายงานติดตามผล:', 'Your advisor has assigned a follow-up:')} ${followUpTask.trim()}`,
        relatedId: fu.id,
        isRead: false,
      })
      store.addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        userRole: 'advisor',
        action: 'followup_created',
        description: `Created follow-up for ${student?.name || targetStudentId}: ${followUpTask.trim()}`,
        targetId: fu.id,
      })
    }

    addToast(
      'success',
      t('บันทึกผลการให้คำปรึกษาแล้ว', 'Advising Log Saved'),
      t('บันทึกสรุปและประวัติการให้คำปรึกษาได้รับการอัปเดตเรียบร้อย', 'The session record and audit trail have been updated.')
    )
    setSelectedRequestId('')
    setEditingRequestId('')
    setSection('saved')
    setSummary('')
    setFollowUpTask('')
    setFollowUpDate('')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={t('บันทึกผลการเข้าพบอาจารย์ที่ปรึกษา', 'Advisor Log Entry')}
        description={t(
          'บันทึกสรุปผลการให้คำปรึกษา คำแนะนำ และกำหนดงานติดตามผลแก่นักศึกษาอย่างกระชับและรวดเร็ว',
          'Document session summary, guidance provided, and assign action items.'
        )}
      />

      <Tabs
        tabs={[
          { value: 'entry', label: t('บันทึกผลการเข้าพบ', 'Entry Log') },
          { value: 'saved', label: t('บันทึกที่จัดเก็บแล้ว', 'Saved Log'), count: advisorSessions.length },
        ]}
        active={section}
        onChange={value => setSection(value as 'entry' | 'saved')}
      />

      {section === 'saved' ? (
        advisorSessions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText className="h-6 w-6 text-emerald-500" />}
              title={t('ยังไม่มีบันทึกที่จัดเก็บไว้', 'No saved logs')}
              description={t('บันทึกผลการให้คำปรึกษาที่บันทึกแล้วจะปรากฏที่นี่', 'Saved advising session logs will appear here.')}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {advisorSessions.map(session => {
              const request = store.requests.find(r => r.id === session.requestId)
              const sessionStudent = store.users.find(u => u.id === session.studentId)
              const requestId = session.requestId
              const sessionAppointment = store.appointments.find(
                appointmentItem =>
                  appointmentItem.id === session.appointmentId ||
                  appointmentItem.requestId === session.requestId
              )
              return (
                <Card key={session.id} className="border-emerald-100 dark:border-emerald-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {sessionStudent?.name || session.studentId}
                        </h3>
                        {sessionStudent?.code && (
                          <span className="font-mono text-[11px] text-slate-500">{sessionStudent.code}</span>
                        )}
                        <div className="text-[11px]">
                          <span className="mr-3 text-emerald-700 dark:text-emerald-300">
                            {t('วันที่บันทึก:', 'Entry date:')} {session.createdAt.split('T')[0]}
                          </span>
                          <span className="text-sky-500 dark:text-sky-300">
                            {t('วันที่นัดหมาย:', 'Appointment date:')}{' '}
                            {sessionAppointment?.scheduledDate || request?.preferredDate || '-'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {request ? getCategoryLabel(request.category) : t('บันทึกการให้คำปรึกษา', 'Advising session')}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {session.summary || t('ไม่มีสรุปบันทึก', 'No summary recorded')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (requestId) editSavedLog(requestId)
                      }}
                      disabled={!requestId}
                      className="shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      {t('แก้ไข', 'Edit')}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      ) : completedRequests.length === 0 && !selectedReq && !student ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6 text-sky-500" />}
            title={t('ไม่มีนัดหมายที่รอการเขียนบันทึก', 'No sessions pending documentation')}
            description={t(
              'รายการนัดหมายที่ถึงกำหนดหรือเสร็จสิ้นแล้วจะปรากฏที่นี่เพื่อเขียนบันทึกผล หรือเลือกจากหน้านักศึกษาในความดูแล',
              'Scheduled sessions will appear here to write their official advising log.'
            )}
          />
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Direct Student Pre-selected banner (Locks student automatically without dropdown) */}
            {isDirectStudentLog && student ? (
              <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40 p-4 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-sky-600" />
                    {t('กำลังบันทึกผลการเข้าพบให้นักศึกษาคนนี้', 'Recording log for this student')}
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
                    {student.code}
                  </span>
                </div>
                <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {student.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedReq ? `${getCategoryLabel(selectedReq.category)} · ` : ''}
                  {t('สำนักวิชา / สาขา:', 'Department:')} {student.department || '-'}
                  {appointment?.scheduledDate
                    ? ` · ${t('วันนัดหมาย:', 'Appointment date:')} ${appointment.scheduledDate}`
                    : ''}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  {t(
                    'ข้อมูลนักศึกษาและคำร้องถูกเลือกให้อัตโนมัติ ไม่ต้องค้นหาใหม่',
                    'Student profile loaded automatically from the active selection.'
                  )}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('เลือกนัดหมายที่ต้องการบันทึกผล', 'Select Advising Session')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRequestId}
                  onChange={e => {
                    setEditingRequestId('')
                    setSelectedRequestId(e.target.value)
                  }}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs cursor-pointer"
                >
                  <option value="">
                    {t('-- เลือกรายการนัดหมายที่ต้องการบันทึก --', 'Select an advising session to log')}
                  </option>
                  {completedRequests.map(r => {
                    const s = store.users.find(u => u.id === r.studentId)
                    return (
                      <option key={r.id} value={r.id}>
                        {s?.name || r.studentId} ({s?.code || '-'}) — {getCategoryLabel(r.category)}
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Auto-Pulled Previous Follow-ups Section (ดึงการบ้านจากครั้งก่อนมาแสดงอัตโนมัติ) */}
            {student && (
              <div className="p-4 rounded-xl border border-amber-200/90 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {t('งานที่มอบหมายไว้จากครั้งก่อนหน้า (การบ้าน/สิ่งที่ต้องทำต่อ)', 'Previous Assigned Follow-up Tasks')}
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {t(
                          'ดึงงานเดิมของนักศึกษามาแสดงอัตโนมัติ ติ๊กเสร็จสิ้น หรือขยายกำหนดส่งได้ทันที',
                          'Auto-pulled from previous sessions. Check off done or extend due date.'
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full',
                      pendingFollowUps.length > 0
                        ? 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    )}
                  >
                    {pendingFollowUps.length > 0
                      ? `${pendingFollowUps.length} ${t('งานค้างส่ง', 'pending')}`
                      : t('ไม่มีงานค้าง', 'All completed')}
                  </span>
                </div>

                {pendingFollowUps.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {pendingFollowUps.map(fu => {
                      const isOverdue = fu.dueDate && fu.dueDate < getLocalDateString()
                      const isExtending = extendingTaskId === fu.id
                      return (
                        <div
                          key={fu.id}
                          className="p-3 rounded-xl border border-amber-200/70 dark:border-amber-900/60 bg-white dark:bg-slate-900 shadow-2xs transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                              <input
                                type="checkbox"
                                checked={fu.status === 'completed'}
                                onChange={() => handleToggleFollowUp(fu.id, 'completed', fu.task)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                                  {fu.task}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                                  <span
                                    className={cn(
                                      'font-mono text-[11px] px-2 py-0.5 rounded font-semibold',
                                      isOverdue
                                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    )}
                                  >
                                    {t('กำหนดส่ง:', 'Due:')} {fu.dueDate || '-'}
                                    {isOverdue && ` (${t('เกินกำหนดแล้ว', 'Overdue')})`}
                                  </span>
                                </div>
                              </div>
                            </label>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setExtendingTaskId(isExtending ? null : fu.id)}
                                className="text-xs h-7 px-2.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-slate-800"
                              >
                                <CalendarClock className="h-3.5 w-3.5 mr-1 text-sky-600" />
                                {isExtending ? t('ยกเลิก', 'Cancel') : t('ต่ออายุ / ขยายเวลา', 'Extend Date')}
                              </Button>
                            </div>
                          </div>

                          {/* Inline Extend Date Drawer */}
                          {isExtending && (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {t('เลือกวันกำหนดส่งใหม่:', 'New Due Date:')}
                              </span>
                              <input
                                type="date"
                                min={getLocalDateString()}
                                defaultValue={fu.dueDate || getLocalDateString()}
                                onChange={e => {
                                  if (e.target.value) {
                                    handleExtendDueDate(fu.id, e.target.value, fu.task)
                                  }
                                }}
                                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500/20"
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {t(
                        'นักศึกษาคนนี้ไม่มีงานติดตามผลที่ค้างอยู่ (งานเดิมเสร็จสิ้นครบถ้วนแล้ว)',
                        'No pending tasks! All previous follow-ups for this student are completed.'
                      )}
                    </span>
                  </div>
                )}

                {/* Toggle View Completed Tasks */}
                {completedFollowUps.length > 0 && (
                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                    <button
                      type="button"
                      onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                      className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform duration-200', showCompletedTasks ? 'rotate-180' : '')}
                      />
                      {showCompletedTasks
                        ? t('ซ่อนงานที่เสร็จสิ้นแล้ว', 'Hide completed tasks')
                        : t(
                            `ดูงานเดิมที่ทำเสร็จสิ้นแล้ว (${completedFollowUps.length} รายการ)`,
                            `View completed tasks (${completedFollowUps.length})`
                          )}
                    </button>

                    {showCompletedTasks && (
                      <div className="space-y-1.5 mt-2.5">
                        {completedFollowUps.map(cfu => (
                          <div
                            key={cfu.id}
                            className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className="line-through text-slate-400 dark:text-slate-500 truncate">
                                {cfu.task}
                              </span>
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono shrink-0">
                              {t('เสร็จเมื่อ', 'Completed')}: {cfu.completedAt || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Student & Request Summary Preview */}
            {selectedReq && (
              <div className="p-4 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/80 rounded-xl text-xs space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>{student?.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({student?.code})</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                    {getCategoryLabel(selectedReq.category)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                  <span className="text-slate-400 font-medium">{t('ประเด็นที่นักศึกษาขอคำปรึกษา:', 'Student Request Details:')}</span>{' '}
                  {selectedReq.details}
                </p>

                {/* Attached Documents Preview Box */}
                {(getAttachments(selectedReq).length > 0 ||
                  store.documents.some(
                    d =>
                      (d.studentId === selectedReq.studentId ||
                        (student?.code && d.studentId.toUpperCase() === student.code.toUpperCase())) &&
                      (d.status === 'uploaded' || d.status === 'required')
                  )) && (
                  <div className="pt-2 border-t border-sky-100 dark:border-sky-900/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      {t('เอกสารประกอบคำร้องและแบบฟอร์มแนบ', 'Attached Documents & Submitted Forms')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getAttachments(selectedReq).map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">{att.fileName}</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            type="button"
                            onClick={() => setPreviewDoc(att)}
                            className="h-7 text-[11px] px-2"
                          >
                            <Eye className="h-3 w-3 mr-1" /> {t('เปิดดู', 'View')}
                          </Button>
                        </div>
                      ))}
                      {store.documents
                        .filter(
                          d =>
                            (d.studentId === selectedReq.studentId ||
                              (student?.code && d.studentId.toUpperCase() === student.code.toUpperCase())) &&
                            (d.status === 'uploaded' || d.status === 'required')
                        )
                        .map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                          >
                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                              {doc.documentName || doc.fileName}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  id: doc.id,
                                  fileName: doc.fileName || doc.documentName,
                                  fileUrl: doc.fileUrl,
                                  cloudinaryPublicId: doc.cloudinaryPublicId,
                                })
                              }
                              className="h-7 text-[11px] px-2"
                            >
                              <Eye className="h-3 w-3 mr-1" /> {t('เปิดดู', 'View')}
                            </Button>
                          </div>
                        ))}
                    </div>

                    {/* Auto-endorse checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                      <input
                        type="checkbox"
                        checked={autoApproveDocs}
                        onChange={e => setAutoApproveDocs(e.target.checked)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('รับรองและลงนามเอกสารแนบพร้อมบันทึกการให้คำปรึกษานี้', 'Endorse & approve attached documents with this advising log')}
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Unified Summary Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('สรุปผลการให้คำปรึกษาและคำแนะนำ', 'Advising Notes & Summary')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('ครอบคลุมทั้งประเด็นปัญหา คำแนะนำทางวิชาการ และข้อตกลงร่วมกัน', 'Encompasses issues, advice, and next steps in one note')}
                </span>
              </div>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={6}
                placeholder={t(
                  'สรุปภาพรวมการเข้าพบ ปัญหาหรืออุปสรรคที่พบ คำแนะนำและแนวทางแก้ไขที่มอบให้แก่นักศึกษา รวมถึงข้อตกลงร่วมกัน...',
                  'Summarize the advising meeting, issues discussed, recommendations given, and agreed action items...'
                )}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none leading-relaxed shadow-xs"
              />
            </div>

            {existingSession && (
              <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    {t('บันทึกผลการเข้าพบที่บันทึกไว้แล้ว', 'Saved Session Log')}
                  </h3>
                  <span className="text-[10px] font-medium text-right">
                    <span className="block text-emerald-700 dark:text-emerald-300">
                      {t('วันที่บันทึก:', 'Entry date:')} {existingSession.createdAt.split('T')[0]}
                    </span>
                    <span className="block text-sky-500 dark:text-sky-300">
                      {t('วันที่นัดหมาย:', 'Appointment date:')}{' '}
                      {appointment?.scheduledDate || selectedReq?.preferredDate || '-'}
                    </span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {existingSession.summary || '-'}
                </p>
              </div>
            )}

            {/* Optional Follow-up Task Assignment */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{t('มอบหมายงานติดตามผล (ไม่บังคับ)', 'Assign Follow-up Task (Optional)')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                {t(
                  'หากมีสิ่งที่นักศึกษาต้องดำเนินการส่งต่อในภายหลัง สามารถระบุเพื่อแจ้งเตือนในระบบได้',
                  'Assign an action item if the student needs to submit documents or report progress.'
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={followUpTask}
                    onChange={e => setFollowUpTask(e.target.value)}
                    placeholder={t('เช่น นำส่งใบคำร้องขอถอนรายวิชา, ส่งเอกสารทุนการศึกษา...', 'e.g. Submit course withdrawal form, submit scholarship receipt...')}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    min={getLocalDateString()}
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                disabled={(!selectedReq && !student) || !summary.trim()}
              >
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
                {existingSession
                  ? t('บันทึกการแก้ไข', 'Update Log')
                  : t('บันทึกผลการให้คำปรึกษา', 'Save Advising Log')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Document Viewer Modal */}
      {previewDoc && (
        <DocumentViewerModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          doc={previewDoc}
        />
      )}
    </div>
  )
}
