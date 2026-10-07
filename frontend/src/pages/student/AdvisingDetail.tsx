// ============================================================
// Student — Advising Detail (Minimal White & Sky Blue)
// ============================================================

import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader, Card, StatusBadge, EmptyState, GoogleCalendarButton, DocumentViewerModal, type DocumentViewerTarget } from '@/components/ui'
import { ArrowLeft, Calendar, Paperclip, FileText, CheckCircle, Eye, XCircle } from 'lucide-react'
import { useState } from 'react'

export default function AdvisingDetail() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)

  const request = store.requests.find(r => r.id === id)
  if (!request) return <EmptyState title={t('ไม่พบข้อมูลคำร้อง', 'Request not found')} description={t('ไม่พบข้อมูลคำร้องขอรับคำปรึกษาที่ต้องการ', 'The requested advising record could not be located.')} />

  const advisor = store.users.find(u => u.id === request.advisorId)
  const appointment = store.appointments.find(a => a.requestId === request.id)
  const session = store.sessions.find(s => s.requestId === request.id)
  const followUps = store.followUps.filter(f => f.requestId === request.id)
  const catLabel = getCategoryLabel(request.category)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 sm:mb-5">
        <button
          onClick={() => navigate('/student/history')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-sky-700 dark:hover:text-sky-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> {t('กลับสู่ประวัติคำร้อง', 'Back to Advising History')}
        </button>
      </div>

      <PageHeader
        title={request.subCategory ? `${catLabel} — ${getSubCategoryLabel(request.subCategory)}` : catLabel}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="space-y-5 sm:space-y-6">
        {/* Cancellation Notice Banner (RED) */}
        {request.status === 'cancelled' && (
          <div className="p-4 sm:p-5 bg-rose-50/90 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 rounded-2xl shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 text-rose-800 dark:text-rose-200">
              <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold">{t('คำร้องขอคำปรึกษาถูกยกเลิก (Request Cancelled)', 'Advising Request Cancelled')}</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3.5 pb-3 border-b border-rose-200/70 dark:border-rose-900/60">
              <div>
                <span className="text-rose-600/80 dark:text-rose-400/80 font-medium block">{t('หมวดหมู่', 'Category')}</span>
                <p className="font-bold text-rose-950 dark:text-rose-100 mt-0.5">{catLabel}</p>
              </div>
              <div>
                <span className="text-rose-600/80 dark:text-rose-400/80 font-medium block">{t('อาจารย์ที่ปรึกษาผู้ทำการยกเลิก', 'Advisor')}</span>
                <p className="font-bold text-rose-950 dark:text-rose-100 mt-0.5">
                  {(request.cancelledBy ? store.users.find(u => u.id === request.cancelledBy)?.name : null) || advisor?.name || '-'}
                </p>
              </div>
              <div>
                <span className="text-rose-600/80 dark:text-rose-400/80 font-medium block">{t('วันและเวลานัดหมาย', 'Date set for appointment')}</span>
                <p className="font-bold text-rose-950 dark:text-rose-100 mt-0.5">
                  {appointment ? `${appointment.scheduledDate} ${appointment.scheduledTime || ''}` : `${request.preferredDate || '-'} ${request.preferredTime || ''}`}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block mb-1.5 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-rose-600" />
                {t('เหตุผลในการยกเลิก (Reason for Cancellation):', 'Reason for Cancellation:')}
              </span>
              <p className="text-xs sm:text-sm text-rose-950 dark:text-rose-100 bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-xl border-2 border-rose-200 dark:border-rose-900/80 leading-relaxed font-medium">
                {request.cancellationReason || t('ไม่มีการระบุเหตุผลในการยกเลิก', 'No cancellation reason provided.')}
              </p>
            </div>
          </div>
        )}

        {/* Request details */}
        <Card>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('รายละเอียดคำร้อง', 'Request Details')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('รหัสคำร้อง', 'Request ID')}</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{request.id}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('อาจารย์ที่ปรึกษา', 'Faculty Advisor')}</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{advisor?.name || '-'}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('วันที่ประสงค์ขอเข้าพบ', 'Requested Date')}</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{request.preferredDate}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('เวลาที่ประสงค์ขอเข้าพบ', 'Requested Time')}</span>
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{request.preferredTime}</p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">{t('ประเด็นที่ขอรับคำปรึกษา', 'Description')}</span>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50/60 dark:bg-slate-800/60 p-3 sm:p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              {request.details}
            </p>
          </div>

          {request.attachments.length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">{t('เอกสารแนบ', 'Attached Files')}</span>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map((item, i) => {
                  let fileObj: any = {}
                  let fileName = typeof item === 'string' ? item : ''
                  if (typeof item === 'string' && item.startsWith('{')) {
                    try {
                      fileObj = JSON.parse(item)
                      fileName = fileObj.fileName || fileName
                    } catch {}
                  }

                  const matchedDoc = store.documents.find(
                    d => (d.fileName === fileName || d.documentName === fileName)
                  )

                  const previewTarget: DocumentViewerTarget = {
                    id: matchedDoc?.id || `${request.id}-attachment-${i}`,
                    title: matchedDoc?.documentName || fileName,
                    fileName: matchedDoc?.fileName || fileName,
                    fileUrl: matchedDoc?.fileUrl || fileObj.fileUrl,
                    cloudinaryPublicId: matchedDoc?.cloudinaryPublicId || fileObj.cloudinaryPublicId,
                    signatureMethod: matchedDoc?.signatureMethod || fileObj.signatureMethod,
                    uploadedAt: matchedDoc?.uploadedAt,
                  }

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewDoc(previewTarget)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 border border-sky-200/80 dark:border-sky-800 rounded-lg text-xs font-medium text-sky-800 dark:text-sky-300 shadow-xs transition-colors cursor-pointer"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{fileName}</span>
                      <Eye className="h-3 w-3 ml-1 text-sky-500" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Appointment details and action card */}
        {appointment && (
          <Card>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('การนัดหมาย', 'Appointment')}
              </h3>
            </div>

            <div className="p-4 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800 rounded-xl mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">{t('วันที่นัดหมาย', 'Date')}</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{appointment.scheduledDate}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">{t('เวลานัดหมาย', 'Time')}</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{appointment.scheduledTime}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block font-medium">{t('สถานที่', 'Location')}</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{appointment.location}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <GoogleCalendarButton
                event={{
                  title: `Advising Meeting: ${currentUser?.name || 'Student'} & ${advisor?.name || 'Advisor'}`,
                  description: `Advising Topic: ${catLabel}\nLocation: ${appointment.location}\nDetails: ${request.details}`,
                  location: appointment.location,
                  date: appointment.scheduledDate,
                  time: appointment.scheduledTime,
                  attendeeEmails: [currentUser?.email || '', advisor?.email || ''],
                }}
                size="sm"
                variant="secondary"
              />
            </div>
          </Card>
        )}

        {/* Session log */}
        {session && (
          <Card>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> {t('บันทึกผลการเข้าพบอาจารย์ที่ปรึกษา', 'Advising Session Log')}
            </h3>
            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">{t('สรุปผลการให้คำปรึกษา', 'Session Summary')}</span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{session.summary}</p>
              </div>
              {session.advice && session.advice !== session.summary && (
                <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">{t('คำแนะนำและแนวทางปฏิบัติ', 'Advice & Guidance Provided')}</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{session.advice}</p>
                </div>
              )}
              {session.outcome && session.outcome !== session.summary && (
                <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">{t('ผลลัพธ์ / ข้อตกลงร่วมกัน', 'Outcome / Action Items')}</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{session.outcome}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Follow-ups */}
        {followUps.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3.5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('รายการงานที่ต้องติดตามผล', 'Assigned Follow-up Tasks')}
            </h3>
            <div className="space-y-2.5">
              {followUps.map(fu => {
                const evidenceDoc = store.documents.find(d => d.description?.includes(`followUpId:${fu.id}`))
                const progressRecord = store.followUpProgress.find(fp => fp.followUpId === fu.id)

                return (
                  <div key={fu.id} className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{fu.task}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 font-medium">{t('กำหนดส่ง:', 'Due:')} {fu.dueDate}</p>
                      </div>
                      <StatusBadge status={fu.status} />
                    </div>

                    {progressRecord?.notes && (
                      <div className="p-2.5 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs">
                        <span className="font-semibold text-sky-700 dark:text-sky-300 text-[11px] block mb-0.5">
                          {t('บันทึกผลการปฏิบัติงาน:', 'Student Action & Report:')}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-[11px]">
                          {progressRecord.notes}
                        </p>
                      </div>
                    )}

                    {evidenceDoc && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDoc({
                              title: evidenceDoc.fileName || evidenceDoc.documentName,
                              fileName: evidenceDoc.fileName || evidenceDoc.documentName,
                              fileUrl: evidenceDoc.fileUrl,
                              cloudinaryPublicId: evidenceDoc.cloudinaryPublicId,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/60 hover:bg-sky-100 cursor-pointer"
                        >
                          <span>{t('ดูไฟล์หลักฐาน', 'View Evidence')}: {evidenceDoc.fileName}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}

