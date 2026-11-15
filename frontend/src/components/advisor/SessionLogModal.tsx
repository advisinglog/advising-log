// ============================================================
// Advisor — Saved advising log details (read-only popup)
// Shared by the Advising Log page and the Follow-ups page.
// ============================================================

import { useState } from 'react'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button, DocumentViewerModal, Modal, StatusBadge, type DocumentViewerTarget } from '@/components/ui'
import { ClipboardCheck, Clock, Eye, FileText, Paperclip, Pencil, Sparkles, Trash2 } from 'lucide-react'
import type { AdvisingRequest, StudentDocument, User } from '@/types'

/** Turns a request's stored attachments into targets the document viewer can open. */
export function getRequestAttachments(
  request: AdvisingRequest,
  users: User[],
  documents: StudentDocument[],
): DocumentViewerTarget[] {
  const studentObj = users.find(u => u.id === request.studentId)
  return (Array.isArray(request.attachments) ? request.attachments : []).map((attachment, index) => {
    let value = attachment as unknown
    if (typeof value === 'string' && value.startsWith('{')) {
      try {
        value = JSON.parse(value)
      } catch {}
    }

    if (typeof value === 'string') {
      const matchedDoc = documents.find(
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
      signatureMethod: file.signatureMethod as DocumentViewerTarget['signatureMethod'],
      studentName: studentObj?.name,
      studentCode: studentObj?.code,
      uploadedAt: typeof file.uploadedAt === 'string' ? file.uploadedAt : undefined,
    }
  })
}

interface SessionLogModalProps {
  sessionId: string | null
  onClose: () => void
  /** Shown as "Edit Log" when provided. */
  onEdit?: (requestId: string) => void
  /** Shown as "Delete Log" when provided. */
  onDelete?: (sessionId: string) => void
}

export function SessionLogModal({ sessionId, onClose, onEdit, onDelete }: SessionLogModalProps) {
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)

  const session = sessionId ? store.sessions.find(s => s.id === sessionId) : null
  if (!session) return null

  const request = store.requests.find(r => r.id === session.requestId)
  const student = store.users.find(u => u.id === session.studentId)
  const appointment = store.appointments.find(
    a => a.id === session.appointmentId || (request && a.requestId === request.id)
  )
  const followUps = store.followUps.filter(
    f => f.sessionId === session.id || (request && f.requestId === request.id)
  )
  const attachments = request ? getRequestAttachments(request, store.users, store.documents) : []

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        title={t('รายละเอียดบันทึกการให้คำปรึกษา', 'Advising Log Details')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Student & Session Meta Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">{t('ข้อมูลนักศึกษา', 'Student Information')}</span>
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{student?.name || session.studentId}</p>
              {student?.code && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {t('รหัสนักศึกษา:', 'Student ID:')} {student.code}
                </p>
              )}
              {student?.department && (
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  {t('สำนักวิชา / สาขา:', 'Department:')} {student.department}
                </p>
              )}
              {student?.email && (
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  {t('อีเมล:', 'Email:')} {student.email}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">{t('ข้อมูลการเข้าพบ', 'Session Information')}</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                <span className="text-slate-400 font-normal mr-1">{t('วันที่บันทึก:', 'Recorded Date:')}</span>
                {session.sessionDate}
              </p>
              {appointment?.scheduledDate && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400 mr-1">{t('วัน-เวลานัดหมาย:', 'Scheduled Slot:')}</span>
                  {appointment.scheduledDate} {appointment.scheduledTime || ''}
                </p>
              )}
              {appointment?.location && (
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  <span className="text-slate-400 mr-1">{t('สถานที่ / รูปแบบ:', 'Location / Mode:')}</span>
                  {appointment.location}
                </p>
              )}
              <div className="pt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200">
                  {request ? getCategoryLabel(request.category) : t('การให้คำปรึกษาทั่วไป', 'General Advising')}
                </span>
              </div>
            </div>
          </div>

          {/* Student Request Topic / Reason if available */}
          {request?.details && (
            <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-1">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-sky-600" />
                {t('รายละเอียดที่นักศึกษาแจ้งขอเข้าพบ', 'Student Consultation Request Notes')}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {request.details}
              </p>
            </div>
          )}

          {/* Advising Summary */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              {t('สรุปผลการให้คำปรึกษาและข้อตกลงร่วมกัน', 'Session Summary & Discussion')}
            </span>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {session.summary || t('ไม่มีสรุปบันทึก', 'No summary recorded')}
            </div>
          </div>

          {/* Advice Given if distinct */}
          {session.advice && session.advice !== session.summary && (
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                {t('คำแนะนำและแนวทางแก้ไขจากอาจารย์', 'Advisor Guidance & Advice')}
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {session.advice}
              </div>
            </div>
          )}

          {/* Follow-up Tasks, with the student's submission and evidence file */}
          {followUps.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                {t('งานติดตามผลที่มอบหมาย', 'Assigned Follow-up Tasks')} ({followUps.length})
              </span>
              <div className="space-y-2">
                {followUps.map(fu => {
                  const progress = store.followUpProgress.find(p => p.followUpId === fu.id)
                  const evidenceDoc = store.documents.find(d => d.description?.includes(`followUpId:${fu.id}`))
                  return (
                    <div
                      key={fu.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {fu.task}
                          </p>
                          <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-0.5">
                            {t('กำหนดส่ง:', 'Due Date:')} {fu.dueDate || '-'}
                          </p>
                        </div>
                        <StatusBadge status={fu.status} />
                      </div>

                      {progress?.notes && (
                        <div className="p-2.5 rounded-lg bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300">
                          <p className="flex items-center gap-1.5 font-semibold text-sky-800 dark:text-sky-300 mb-1">
                            <Sparkles className="h-3 w-3" />
                            {t('ผลการปฏิบัติงานของนักศึกษา:', 'Student Submission:')}
                          </p>
                          <p className="whitespace-pre-wrap">{progress.notes}</p>
                        </div>
                      )}

                      {evidenceDoc && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1 text-xs"
                          onClick={() => setPreviewDoc({
                            id: evidenceDoc.id,
                            title: evidenceDoc.documentName,
                            fileName: evidenceDoc.fileName || evidenceDoc.documentName,
                            fileUrl: evidenceDoc.fileUrl,
                            cloudinaryPublicId: evidenceDoc.cloudinaryPublicId,
                            uploadedAt: evidenceDoc.uploadedAt,
                            studentName: student?.name,
                            studentCode: student?.code,
                            description: evidenceDoc.description,
                          })}
                        >
                          <Paperclip className="h-3 w-3" />
                          {evidenceDoc.fileName || t('ดูไฟล์หลักฐาน', 'View Evidence')}
                          <Eye className="h-3 w-3 opacity-70" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Request Attachments */}
          {attachments.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Paperclip className="h-4 w-4 text-slate-500" />
                {t('เอกสารแนบ', 'Attached Documents')} ({attachments.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map(doc => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-white dark:bg-slate-900 text-left transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {doc.title || doc.fileName}
                      </span>
                    </div>
                    <span className="text-[0.6875rem] text-sky-600 dark:text-sky-400 shrink-0 ml-2">
                      {t('เปิดดู', 'View')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => onDelete(session.id)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t('ลบบันทึก', 'Delete Log')}
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              {onEdit && session.requestId && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => onEdit(session.requestId!)}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  {t('แก้ไขบันทึก', 'Edit Log')}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onClose}>
                {t('ปิด', 'Close')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Rendered after the popup so it stacks on top of it */}
      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </>
  )
}
