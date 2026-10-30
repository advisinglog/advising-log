import { useState, useEffect, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Card, Button, EmptyState, DocumentViewerModal, Tabs, type DocumentViewerTarget } from '@/components/ui'
import { ClipboardCheck, User, PlusCircle, FileText, Eye, CheckCircle2, Pencil } from 'lucide-react'

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
  // Only a Dashboard Record Log click uses the direct, preselected view.
  // Opening Advisor Log from the sidebar keeps the original dropdown workflow.
  const isDashboardRecordLog = Boolean(navState?.appointmentId && navState?.requestId && navState?.studentId)
  const [selectedRequestId, setSelectedRequestId] = useState<string>(navState?.requestId || '')
  const [section, setSection] = useState<'entry' | 'saved'>('entry')
  // Existing logs are editable only through the Saved Log tab.
  const [editingRequestId, setEditingRequestId] = useState('')
  const [summary, setSummary] = useState('')
  const [followUpTask, setFollowUpTask] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)
  const [autoApproveDocs, setAutoApproveDocs] = useState(true)

  // Resolve the actual request from the clicked appointment after backend data loads.
  // Never trust route state as authorization; the request is checked against the advisor.
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
    const student = store.users.find(u => u.id === request.studentId)
    return (Array.isArray(request.attachments) ? request.attachments : []).map((attachment, index) => {
      let value = attachment as unknown
      if (typeof value === 'string' && value.startsWith('{')) {
        try {
          value = JSON.parse(value)
        } catch {}
      }

      if (typeof value === 'string') {
        const matchedDoc = store.documents.find(
          d => (d.studentId === request.studentId || (student?.code && d.studentId.toUpperCase() === student.code.toUpperCase())) &&
               (d.fileName === value || d.documentName === value)
        )
        return {
          id: matchedDoc?.id || `${request.id}-attachment-${index}`,
          fileName: matchedDoc?.fileName || value,
          title: matchedDoc?.documentName || value,
          fileUrl: matchedDoc?.fileUrl,
          cloudinaryPublicId: matchedDoc?.cloudinaryPublicId,
          signatureMethod: matchedDoc?.signatureMethod,
          studentName: student?.name,
          studentCode: student?.code,
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
        studentName: student?.name,
        studentCode: student?.code,
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

  // A saved request can be selected for modification ONLY through its Edit button.
  const selectedReq = eligibleRequests.find(r =>
    r.id === selectedRequestId &&
    (completedRequests.some(pending => pending.id === r.id) || editingRequestId === r.id) &&
    (!navState?.studentId || !linkedRequestId || selectedRequestId !== linkedRequestId || r.studentId === navState.studentId)
  )
  const student = selectedReq ? store.users.find(u => u.id === selectedReq.studentId) : null
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

  function editSavedLog(requestId: string) {
    setEditingRequestId(requestId)
    setSelectedRequestId(requestId)
    setSection('entry')
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedReq || !summary.trim()) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณาเลือกนัดหมายและระบุสรุปผลการให้คำปรึกษา', 'Please select a session and provide the advising summary.'))
      return
    }

    if (followUpTask.trim() && !followUpDate) {
      addToast('error', t('กรุณาระบุวันกำหนดส่ง', 'Due Date Required'), t('กรุณาระบุวันที่กำหนดส่งสำหรับงานติดตามผลที่มอบหมาย', 'Please select a due date for the assigned follow-up task.'))
      return
    }

    if (!followUpTask.trim() && followUpDate) {
      addToast('error', t('กรุณาระบุชื่องานติดตามผล', 'Follow-up Task Required'), t('กรุณาระบุรายละเอียดงานที่ต้องการมอบหมาย', 'Please specify the follow-up task description.'))
      return
    }

    const cleanSummary = summary.trim()
    const existingSession = store.sessions.find(s => s.requestId === selectedRequestId)
    if (existingSession && editingRequestId !== selectedRequestId) {
      addToast('error', t('รายการนี้บันทึกแล้ว', 'Already Recorded'), t('กรุณาแก้ไขจากแท็บบันทึกที่จัดเก็บแล้ว', 'Please use Edit in the Saved Log tab.'))
      return
    }
    const session = existingSession
      ? (store.updateSession(existingSession.id, {
          sessionDate: getLocalDateString(),
          summary: cleanSummary,
          problem: cleanSummary,
          advice: cleanSummary,
        }), { ...existingSession, summary: cleanSummary, problem: cleanSummary, advice: cleanSummary })
      : store.addSession({
          requestId: selectedRequestId,
          appointmentId: appointment?.id || undefined,
          studentId: selectedReq!.studentId,
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
      description: `Created advising log for ${student?.name}`,
      targetId: session.id,
    })

    // Create follow-up if specified
    if (followUpTask.trim() && followUpDate) {
      const fu = store.addFollowUp({
        sessionId: session.id,
        requestId: selectedRequestId,
        studentId: selectedReq!.studentId,
        advisorId: currentUser!.id,
        task: followUpTask.trim(),
        dueDate: followUpDate,
        status: 'pending',
      })
      store.addNotification({
        userId: selectedReq!.studentId,
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
        description: `Created follow-up for ${student?.name}: ${followUpTask.trim()}`,
        targetId: fu.id,
      })
    }

    addToast('success', t('บันทึกผลการให้คำปรึกษาแล้ว', 'Advising Log Saved'), t('บันทึกสรุปและประวัติการให้คำปรึกษาได้รับการอัปเดตเรียบร้อย', 'The session record and audit trail have been updated.'))
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
        description={t('บันทึกสรุปผลการให้คำปรึกษา คำแนะนำ และกำหนดงานติดตามผลแก่นักศึกษาอย่างกระชับและรวดเร็ว', 'Document session summary, guidance provided, and assign action items.')}
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
              const sessionAppointment = store.appointments.find(appointment =>
                appointment.id === session.appointmentId ||
                appointment.requestId === session.requestId
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
                            {t('วันที่นัดหมาย:', 'Appointment date:')} {sessionAppointment?.scheduledDate || request?.preferredDate || '-'}
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
      ) : completedRequests.length === 0 && !selectedReq ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6 text-sky-500" />}
            title={t('ไม่มีนัดหมายที่รอการเขียนบันทึก', 'No sessions pending documentation')}
            description={t('รายการนัดหมายที่ถึงกำหนดหรือเสร็จสิ้นแล้วจะปรากฏที่นี่เพื่อเขียนบันทึกผล', 'Scheduled sessions will appear here to write their official advising log.')}
          />
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dashboard Record Log: preselect appointment; sidebar: only requests without a saved session. */}
            {isDashboardRecordLog ? (
              selectedReq ? (
                <div className="rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-4 space-y-2">
                  <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {t('กำลังบันทึกผลให้นักศึกษาคนนี้', 'Recording log for this student')}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {student?.name || selectedReq.studentId} {student?.code ? `(${student.code})` : ''}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {getCategoryLabel(selectedReq.category)} · {t('วันที่นัดหมาย:', 'Appointment date:')} {appointment?.scheduledDate || selectedReq.preferredDate || '-'}
                    {appointment?.scheduledTime ? ` · ${appointment.scheduledTime}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('ข้อมูลนักศึกษาและคำร้องถูกเลือกให้อัตโนมัติจากรายการที่กด', 'Student, request and appointment are loaded automatically from the selected record.')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {eligibleRequests.some(r => r.id === linkedRequestId) && store.sessions.some(s => s.requestId === linkedRequestId)
                    ? t('นัดหมายนี้บันทึกผลแล้ว กรุณาเปิดแท็บบันทึกที่จัดเก็บแล้วเพื่อดูหรือแก้ไข', 'This appointment has already been recorded. Use Saved Log to view or edit it.')
                    : t('ไม่พบคำร้องของนักศึกษาที่เลือก หรือรายการนี้ไม่อยู่ในความดูแลของคุณ', 'The selected request is unavailable or is not assigned to you.')}
                </p>
              )
            ) : (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('เลือกนัดหมายที่ต้องการบันทึกผล', 'Select Advising Session')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRequestId}
                  onChange={e => { setEditingRequestId(''); setSelectedRequestId(e.target.value) }}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs cursor-pointer"
                >
                  <option value="">{t('-- เลือกรายการนัดหมายที่ต้องการบันทึก --', 'Select an advising session to log')}</option>
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

                {/* Open Tasks from Previous Sessions */}
                {(() => {
                  const studentPendingFollowUps = store.followUps.filter(
                    f => (f.studentId === selectedReq.studentId || (student?.code && f.studentId?.toUpperCase() === student.code.toUpperCase())) &&
                         f.status !== 'completed'
                  )
                  if (studentPendingFollowUps.length === 0) return null
                  return (
                    <div className="pt-2 border-t border-sky-100 dark:border-sky-900/60 space-y-1.5">
                      <span className="text-[11px] font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        {t(`งานติดตามผลที่ค้างอยู่ (${studentPendingFollowUps.length} รายการ)`, `Previous Pending Tasks (${studentPendingFollowUps.length})`)}
                      </span>
                      <div className="space-y-1">
                        {studentPendingFollowUps.map(fu => (
                          <div key={fu.id} className="flex items-center justify-between gap-2 bg-white/90 dark:bg-slate-900/80 p-2 rounded-lg border border-sky-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-200">
                            <span className="truncate font-medium">{fu.task}</span>
                            {fu.dueDate && <span className="font-mono text-[10px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-200/50 dark:border-sky-800/50 shrink-0">{t('กำหนด:', 'Due:')} {fu.dueDate}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Attached Documents Preview Box */}
                {(getAttachments(selectedReq).length > 0 || store.documents.some(d => (d.studentId === selectedReq.studentId || (student?.code && d.studentId.toUpperCase() === student.code.toUpperCase())) && (d.status === 'uploaded' || d.status === 'required'))) && (
                  <div className="pt-2 border-t border-sky-100 dark:border-sky-900/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      {t('เอกสารประกอบคำร้องและแบบฟอร์มแนบ', 'Attached Documents & Submitted Forms')}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {getAttachments(selectedReq).map(att => (
                        <div key={att.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                          <span className="truncate font-medium text-slate-700 dark:text-slate-300">{att.fileName}</span>
                          <Button size="sm" variant="secondary" type="button" onClick={() => setPreviewDoc(att)} className="h-7 text-[11px] px-2">
                            <Eye className="h-3 w-3 mr-1" /> {t('เปิดดู', 'View')}
                          </Button>
                        </div>
                      ))}
                      {store.documents
                        .filter(d => (d.studentId === selectedReq.studentId || (student?.code && d.studentId.toUpperCase() === student.code.toUpperCase())) && (d.status === 'uploaded' || d.status === 'required'))
                        .map(doc => (
                          <div key={doc.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">{doc.documentName || doc.fileName}</span>
                            <Button
                              size="sm"
                              variant="secondary"
                              type="button"
                              onClick={() => setPreviewDoc({
                                id: doc.id,
                                title: doc.documentName,
                                fileName: doc.fileName || doc.documentName,
                                fileUrl: doc.fileUrl,
                                cloudinaryPublicId: doc.cloudinaryPublicId,
                              })}
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
                      {t('วันที่นัดหมาย:', 'Appointment date:')} {appointment?.scheduledDate || selectedReq?.preferredDate || '-'}
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
                {t('หากมีสิ่งที่นักศึกษาต้องดำเนินการส่งต่อในภายหลัง สามารถระบุเพื่อแจ้งเตือนในระบบได้', 'Assign an action item if the student needs to submit documents or report progress.')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('รายละเอียดงานที่มอบหมาย', 'Task Description')}
                  </label>
                  <input
                    type="text"
                    value={followUpTask}
                    onChange={e => setFollowUpTask(e.target.value)}
                    placeholder={t('เช่น ส่งแบบคำร้องเพิ่ม-ถอนรายวิชาที่แก้ไขแล้ว', 'e.g. Submit updated course registration form')}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('กำหนดส่งงาน', 'Target Due Date')}
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    min={getLocalDateString()}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" disabled={!selectedReq}>
                {t('บันทึกผลการให้คำปรึกษา', 'Save Advising Log')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Document Preview Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

    </div>
  )
}
