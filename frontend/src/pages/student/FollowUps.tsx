import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, StatusBadge, Button, GoogleCalendarButton, Modal, DocumentViewerModal, type DocumentViewerTarget } from '@/components/ui'
import type { FollowUp } from '@/types'
import {
  CheckCircle2,
  ListChecks,
  Calendar,
  User,
  ArrowRight,
  UploadCloud,
  FileText,
  X,
  Send,
  History,
  Paperclip,
  Eye,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { uploadFileToCloudinary } from '@/services/cloudinaryService'
import { getLocalDateString } from '@/utils/dateUtils'

export default function FollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()
  const navigate = useNavigate()

  // Submission Modal state
  const [selectedTask, setSelectedTask] = useState<FollowUp | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Document Viewer Modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)

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

  const myFollowUps = store.followUps.filter(isMyMyFollowUp => isMyFollowUp(isMyMyFollowUp))
  const pendingTasks = myFollowUps.filter(f => f.status !== 'completed')
  const completedTasks = myFollowUps.filter(f => f.status === 'completed')

  const openSubmitModal = (f: FollowUp) => {
    setSelectedTask(f)
    setSubmissionNotes('')
    setSelectedFile(null)
  }

  const closeSubmitModal = () => {
    if (isSubmitting) return
    setSelectedTask(null)
    setSubmissionNotes('')
    setSelectedFile(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 15 * 1024 * 1024) {
        addToast('error', t('ไฟล์มีขนาดใหญ่เกินไป', 'File Too Large'), t('ขนาดไฟล์ต้องไม่เกิน 15MB', 'File size must not exceed 15MB'))
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.size > 15 * 1024 * 1024) {
        addToast('error', t('ไฟล์มีขนาดใหญ่เกินไป', 'File Too Large'), t('ขนาดไฟล์ต้องไม่เกิน 15MB', 'File size must not exceed 15MB'))
        return
      }
      setSelectedFile(file)
    }
  }

  async function handleSubmitProgress(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTask) return

    const trimmedNotes = submissionNotes.trim()
    if (!trimmedNotes) {
      addToast('error', t('กรุณาระบุรายละเอียด', 'Details Required'), t('กรุณาระบุสรุปสิ่งที่ได้ดำเนินการหรือผลการปฏิบัติงาน', 'Please provide a summary of the actions taken.'))
      return
    }

    setIsSubmitting(true)

    try {
      let uploadedCloudId: string | undefined = undefined
      let uploadedFileUrl: string | undefined = undefined

      // Upload evidence file if selected
      if (selectedFile) {
        try {
          const res = await uploadFileToCloudinary(selectedFile, {
            folder: 'follow_up_evidence',
            studentCode: currentUser?.code,
            logId: selectedTask.id,
          })
          uploadedCloudId = res.publicId
          uploadedFileUrl = res.secureUrl
        } catch {
          // Fallback in case Cloudinary upload fails
          uploadedFileUrl = URL.createObjectURL(selectedFile)
        }

        // Store document record linked to this follow-up
        const defaultDocType = store.documentTypes?.[0]
        store.addDocument({
          studentId: currentUser!.id,
          documentTypeId: defaultDocType?.id || 'DT_FOLLOWUP',
          documentName: `${t('หลักฐานส่งงาน:', 'Task Evidence:')} ${selectedTask.task}`,
          fileName: selectedFile.name,
          status: 'uploaded',
          signatureMethod: 'none',
          uploadedAt: getLocalDateString(),
          description: `followUpId:${selectedTask.id} | ${trimmedNotes}`,
          cloudinaryPublicId: uploadedCloudId,
          fileUrl: uploadedFileUrl,
        })
      }

      // 1. Update Follow-up status to completed
      store.updateFollowUpStatus(selectedTask.id, 'completed')

      // 2. Save Follow-up Progress record
      store.addFollowUpProgress({
        followUpId: selectedTask.id,
        studentId: currentUser!.id,
        progress: 100,
        notes: trimmedNotes,
        status: 'submitted',
      })

      // 3. Notify Advisor
      if (selectedTask.advisorId) {
        store.addNotification({
          userId: selectedTask.advisorId,
          type: 'info',
          title: t('นักศึกษารายงานผลงานมอบหมายแล้ว', 'Student Submitted Follow-up Task'),
          message: `${currentUser!.name} (${currentUser!.code || currentUser!.id}) ${t('ได้ส่งรายงานผลงาน:', 'submitted report for:')} "${selectedTask.task}"`,
          relatedId: selectedTask.id,
          isRead: false,
        })
      }

      // 4. Audit Log
      store.addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        userRole: 'student',
        action: 'followup_completed' as any,
        description: `Completed task: ${selectedTask.task} | Summary: ${trimmedNotes}${selectedFile ? ` (Attached: ${selectedFile.name})` : ''}`,
        targetId: selectedTask.id,
      })

      addToast('success', t('ส่งรายงานผลเรียบร้อยแล้ว', 'Report Submitted Successfully'), selectedTask.task)
      closeSubmitModal()
    } catch {
      addToast('error', t('เกิดข้อผิดพลาดในการส่ง', 'Submission Error'), t('ไม่สามารถส่งรายงานผลได้ กรุณาลองใหม่อีกครั้ง', 'Unable to submit report. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const getEvidenceDocForTask = (taskId: string) => {
    return store.documents.find(d => d.description?.includes(`followUpId:${taskId}`))
  }

  const getProgressForTask = (taskId: string) => {
    return store.followUpProgress.find(fp => fp.followUpId === taskId)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title={t('สิ่งที่ต้องทำต่อและการส่งงาน', 'Tasks, Next Steps & Submissions')}
        description={t('รายงานผลการปฏิบัติงานตามที่อาจารย์ที่ปรึกษามอบหมาย พร้อมแนบหลักฐานเพื่อให้อาจารย์ตรวจสอบความถูกต้อง', 'Submit progress reports and evidence for action items recommended by your advisor.')}
      />

      {/* 1. Pending Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t('งานที่ต้องทำ (รอดำเนินการ)', 'Pending Tasks')}
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
              {t('คุณได้ปฏิบัติตามคำแนะนำของอาจารย์ครบถ้วนแล้ว สามารถดูประวัติการส่งงานได้ที่หมวดด้านล่าง', 'You have no pending action items. Check completed submissions below.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map(f => {
              const advisor = store.users.find(u => u.id === f.advisorId)
              return (
                <div
                  key={f.id}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {f.task}
                      </span>
                      <StatusBadge status={f.status} />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                      {f.dueDate && (
                        <span className="flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/50 dark:border-rose-900/40">
                          <Calendar className="h-3 w-3" />
                          {t('กำหนดส่ง:', 'Due:')} {f.dueDate}
                        </span>
                      )}
                      {advisor && (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <User className="h-3 w-3 text-slate-400" />
                          {t('อาจารย์ผู้มอบหมาย:', 'Assigned by:')} {advisor.name}
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
                      onClick={() => openSubmitModal(f)}
                      className="gap-1.5 font-bold shadow-xs cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{t('รายงานผล / ส่งงาน', 'Submit & Report')}</span>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. Completed Tasks Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t('ประวัติงานที่ส่งและเสร็จสิ้นแล้ว', 'Completed Tasks & Submissions')}
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              {completedTasks.length}
            </span>
          </h3>
        </div>

        {completedTasks.length === 0 ? (
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
            {t('ยังไม่มีประวัติการส่งงานที่เสร็จสิ้น', 'No completed task submissions yet.')}
          </div>
        ) : (
          <div className="space-y-3">
            {completedTasks.map(f => {
              const advisor = store.users.find(u => u.id === f.advisorId)
              const evidenceDoc = getEvidenceDocForTask(f.id)
              const progressRecord = getProgressForTask(f.id)

              return (
                <div
                  key={f.id}
                  className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-950/60 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {f.task}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        {t('เสร็จสิ้นแล้ว', 'Completed')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                      {f.completedAt && (
                        <span>{t('ส่งเมื่อ:', 'Completed on:')} {f.completedAt}</span>
                      )}
                      {advisor && (
                        <span>{t('อาจารย์:', 'Advisor:')} {advisor.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Student Submission Notes */}
                  {progressRecord?.notes && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <Sparkles className="h-3 w-3 text-sky-500" />
                        {t('บันทึกผลการปฏิบัติงานของนักศึกษา:', 'Student Action & Report:')}
                      </p>
                      <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {progressRecord.notes}
                      </p>
                    </div>
                  )}

                  {/* Attached Evidence Document Button */}
                  {evidenceDoc && (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setPreviewDoc({
                            title: evidenceDoc.fileName || evidenceDoc.documentName,
                            fileName: evidenceDoc.fileName || evidenceDoc.documentName,
                            fileUrl: evidenceDoc.fileUrl,
                            cloudinaryPublicId: evidenceDoc.cloudinaryPublicId,
                          })
                        }
                        className="gap-1.5 text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200/70 dark:border-sky-800/60 hover:bg-sky-100"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{evidenceDoc.fileName || t('ดูไฟล์หลักฐาน', 'View Evidence')}</span>
                        <Eye className="h-3 w-3 ml-0.5 opacity-70" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Submit & Report Modal */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={closeSubmitModal}
          title={t('รายงานผลการปฏิบัติงาน / ส่งงาน', 'Submit Follow-up Progress')}
          size="lg"
        >
          <form onSubmit={handleSubmitProgress} className="space-y-4 p-1">
            {/* Task summary banner */}
            <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/60 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-950 dark:text-sky-200">
                <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>{selectedTask.task}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-sky-800 dark:text-sky-300">
                {selectedTask.dueDate && (
                  <span>{t('กำหนดส่ง:', 'Due:')} {selectedTask.dueDate}</span>
                )}
                <span>
                  {t('อาจารย์:', 'Advisor:')}{' '}
                  {store.users.find(u => u.id === selectedTask.advisorId)?.name || 'Advisor'}
                </span>
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/60 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('คำแนะนำในการรายงานผล', 'Submission Guidance')}</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  {t(
                    'โปรดระบุรายละเอียดว่าได้ไปดำเนินการอย่างไร ผลลัพธ์เป็นอย่างไร หรือระบุข้อตกลงที่ได้รับ พร้อมแนบรูปถ่ายหรือเอกสารหลักฐาน (ถ้ามี) เพื่อให้อาจารย์ที่ปรึกษาตรวจสอบความถูกต้องได้',
                    'Please describe the steps you took, results achieved, and attach supporting photos or documents so your advisor can verify.'
                  )}
                </p>
              </div>
            </div>

            {/* Action Taken & Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('บันทึกสิ่งที่ได้ดำเนินการ / ผลการปฏิบัติ', 'Actions Taken & Summary of Results')}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={submissionNotes}
                onChange={e => setSubmissionNotes(e.target.value)}
                placeholder={t(
                  'ตัวอย่าง: ได้ไปพบอาจารย์ประจำวิชาเพื่อขอคำแนะนำเพิ่มเติมและปรับตารางอ่านหนังสือเรียบร้อยแล้ว...',
                  'e.g. Met with course instructor, received feedback, and revised study plan...'
                )}
                rows={4}
                required
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Evidence File Upload (Cloudinary / File) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {t('แนบไฟล์หลักฐาน (รูปภาพ / PDF / เอกสาร)', 'Attach Evidence (Image / PDF / Document)')}{' '}
                <span className="text-slate-400 font-normal">({t('ไม่บังคับ', 'Optional')})</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.zip"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-xl text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <UploadCloud className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t('คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่', 'Click to browse or drag and drop file here')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {t('รองรับ PDF, PNG, JPG, DOCX ขนาดไม่เกิน 15MB', 'Supports PDF, PNG, JPG, DOCX up to 15MB')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-950/60 rounded-xl border border-sky-200/70 dark:border-sky-800/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={closeSubmitModal}
                disabled={isSubmitting}
              >
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="gap-2 font-bold shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('กำลังส่งข้อมูล...', 'Submitting...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t('ยืนยันส่งรายงานผล', 'Submit & Mark Completed')}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}
