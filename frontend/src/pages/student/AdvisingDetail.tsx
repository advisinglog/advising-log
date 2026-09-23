// ============================================================
// Student — Advising Detail (Minimal White & Sky Blue)
// ============================================================

import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, Card, StatusBadge, EmptyState, Button, Modal, GoogleCalendarButton } from '@/components/ui'
import { ArrowLeft, Calendar, Paperclip, FileText, CheckCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function AdvisingDetail() {
  const { id } = useParams<{ id: string }>()
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const request = store.requests.find(r => r.id === id)
  if (!request) return <EmptyState title={t('ไม่พบข้อมูลคำร้อง', 'Request not found')} description={t('ไม่พบข้อมูลคำร้องขอรับคำปรึกษาที่ต้องการ', 'The requested advising record could not be located.')} />

  const advisor = store.users.find(u => u.id === request.advisorId)
  const appointment = store.appointments.find(a => a.requestId === request.id)
  const session = store.sessions.find(s => s.requestId === request.id)
  const followUps = store.followUps.filter(f => f.requestId === request.id)
  const catLabel = getCategoryLabel(request.category)

  const canConfirmAppointment = appointment && appointment.status === 'scheduled' && !appointment.studentConfirmed && !appointment.studentDeclined

  function handleConfirmAppointment() {
    if (!appointment || !currentUser || !request) return
    store.confirmAppointment(appointment.id)
    store.addNotification({
      userId: request.advisorId,
      type: 'info',
      title: t('นักศึกษายืนยันการนัดหมาย', 'Student Confirmed Appointment'),
      message: `${currentUser.name} ${t('ยืนยันการนัดหมาย', 'confirmed the appointment')} ${appointment.scheduledDate} ${appointment.scheduledTime}`,
      relatedId: appointment.id,
      isRead: false,
    })
    addToast('success', t('ยืนยันการนัดหมายแล้ว', 'Appointment Confirmed'), t('อาจารย์ที่ปรึกษาจะได้รับการแจ้งเตือน', 'Your advisor has been notified.'))
  }

  function handleDeclineAppointment() {
    if (!appointment || !currentUser || !request) return
    store.declineAppointment(appointment.id, declineReason)
    store.addNotification({
      userId: request.advisorId,
      type: 'warning',
      title: t('นักศึกษาไม่สะดวกนัดหมาย', 'Student Declined Appointment'),
      message: `${currentUser.name} ${t('ไม่สะดวกนัดหมาย', 'declined the appointment')} ${appointment.scheduledDate} ${appointment.scheduledTime}${declineReason ? ` (${t('เหตุผล:', 'Reason:')} ${declineReason})` : ''}`,
      relatedId: appointment.id,
      isRead: false,
    })
    addToast('info', t('แจ้งอาจารย์ที่ปรึกษาแล้ว', 'Advisor Notified'), t('อาจารย์ที่ปรึกษาจะได้รับการแจ้งเตือน กรุณารอการนัดหมายใหม่', 'Your advisor has been notified. Please wait for a new appointment time.'))
    setShowDeclineModal(false)
    setDeclineReason('')
  }

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

      <PageHeader title={catLabel} actions={<StatusBadge status={request.status} />} />

      <div className="space-y-5 sm:space-y-6">
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
                {request.attachments.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 rounded-lg text-xs font-medium text-sky-800 dark:text-sky-300 shadow-xs">
                    <Paperclip className="h-3 w-3" /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Appointment action buttons */}
        {canConfirmAppointment && (
          <Card>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('การนัดหมาย', 'Appointment')}
            </h3>
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
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setShowDeclineModal(true)}>
                  <X className="h-4 w-4 mr-1.5" /> {t('ไม่สะดวก', 'Decline')}
                </Button>
                <Button onClick={handleConfirmAppointment}>
                  <CheckCircle className="h-4 w-4 mr-1.5" /> {t('ยืนยันการนัดหมาย', 'Confirm Appointment')}
                </Button>
              </div>
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
              {followUps.map(fu => (
                <div key={fu.id} className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{fu.task}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 font-medium">{t('กำหนดส่ง:', 'Due:')} {fu.dueDate}</p>
                  </div>
                  <StatusBadge status={fu.status} />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Decline appointment modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => { setShowDeclineModal(false); setDeclineReason('') }}
        title={t('แจ้งว่าไม่สะดวกนัดหมาย', 'Decline Appointment')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {t('กรุณาระบุเหตุผลที่ไม่สะดวกนัดหมาย เพื่อให้อาจารย์ที่ปรึกษาสามารถนัดหมายใหม่ได้เหมาะสมกว่า', 'Please provide a reason for declining the appointment so your advisor can reschedule accordingly.')}
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('เหตุผล (ถ้ามี)', 'Reason (optional)')}
            </label>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              rows={3}
              placeholder={t('ระบุเหตุผลที่ไม่สะดวกนัดหมาย...', 'State your reason for declining the appointment...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs resize-none leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => { setShowDeclineModal(false); setDeclineReason('') }}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button onClick={handleDeclineAppointment}>
              <X className="h-4 w-4 mr-1.5" /> {t('ยืนยันไม่สะดวก', 'Confirm Decline')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

