import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Tabs, DataTable, StatusBadge, Button, Modal, Card, GoogleCalendarButton } from '@/components/ui'
import type { AdvisingRequest, RequestProgress } from '@/types'
import { Calendar, CheckCircle2, Eye, TrendingUp, Clock } from 'lucide-react'

export default function AdvisingSessions() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel } = useLanguage()
  const [tab, setTab] = useState('pending')
  const [selectedReq, setSelectedReq] = useState<AdvisingRequest | null>(null)
  const [detailReq, setDetailReq] = useState<AdvisingRequest | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [schedLoc, setSchedLoc] = useState('')
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [progressNotes, setProgressNotes] = useState('')

  if (!currentUser) return null

  const myRequests = store.requests.filter(r => r.advisorId === currentUser.id)
  const myProgress = store.requestProgress.filter(rp => rp.advisorId === currentUser.id)

  function handleUpdateProgress() {
    if (!selectedReq || !currentUser) return
    store.updateRequestProgress(
      `${selectedReq.id}-progress`,
      progressValue,
      progressNotes
    )
    store.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: 'advisor',
      action: 'followup_completed' as any,
      description: `Updated progress for request ${selectedReq.id}: ${progressValue}%`,
      targetId: selectedReq.id,
    })
    addToast('success', t('อัปเดตความคืบหน้าแล้ว', 'Progress Updated'), t('บันทึกความคืบหน้าคำร้องเรียบร้อยแล้ว', 'Progress has been recorded successfully.'))
    setShowProgressModal(false)
    setSelectedReq(null)
    setProgressValue(0)
    setProgressNotes('')
  }

  function getProgressForRequest(requestId: string): RequestProgress | undefined {
    return myProgress.find(rp => rp.requestId === requestId)
  }
  const filterMap: Record<string, string[]> = {
    pending: ['requested', 'pending'],
    upcoming: ['scheduled'],
    completed: ['completed', 'closed'],
    cancelled: ['cancelled'],
  }
  const filtered = myRequests.filter(r => filterMap[tab]?.includes(r.status))

  const tabs = [
    { value: 'pending', label: t('คำร้องรอการตอบรับ', 'Pending Requests'), count: myRequests.filter(r => ['requested', 'pending'].includes(r.status)).length },
    { value: 'upcoming', label: t('นัดหมายที่ยืนยันแล้ว', 'Upcoming Sessions'), count: myRequests.filter(r => r.status === 'scheduled').length },
    { value: 'completed', label: t('เสร็จสิ้นแล้ว', 'Completed'), count: myRequests.filter(r => ['completed', 'closed'].includes(r.status)).length },
    { value: 'cancelled', label: t('ยกเลิก', 'Cancelled'), count: myRequests.filter(r => r.status === 'cancelled').length },
  ]

  function handleAccept(req: AdvisingRequest) {
    store.updateRequestStatus(req.id, 'pending')
    addToast('success', t('ตอบรับคำร้องแล้ว', 'Request Accepted'), t('คุณสามารถกำหนดเวลานัดหมายกับนักศึกษาได้ทันที', 'You can now schedule an appointment with the student.'))
  }

  function handleSchedule() {
    if (!selectedReq || !schedDate || !schedTime || !schedLoc) return
    const apt = store.addAppointment({
      requestId: selectedReq.id,
      studentId: selectedReq.studentId,
      advisorId: currentUser!.id,
      scheduledDate: schedDate,
      scheduledTime: schedTime,
      location: schedLoc,
      status: 'scheduled',
    })
    store.updateRequestStatus(selectedReq.id, 'scheduled')
    store.addNotification({
      userId: selectedReq.studentId,
      type: 'info',
      title: t('นัดหมายเวลาเข้าพบอาจารย์แล้ว', 'Appointment Scheduled'),
      message: `${t('อาจารย์ที่ปรึกษานัดหมายเข้าพบในวันที่', 'Your advising appointment has been scheduled for')} ${schedDate} ${schedTime} (${schedLoc})`,
      relatedId: apt.id,
      isRead: false,
    })
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'appointment_scheduled',
      description: `Scheduled appointment for ${store.users.find(u => u.id === selectedReq.studentId)?.name}`,
      targetId: apt.id,
    })
    addToast('success', t('นัดหมายสำเร็จ', 'Appointment Scheduled'), `${schedDate} · ${schedTime}`)
    setShowSchedule(false)
    setSelectedReq(null)
    setSchedDate(''); setSchedTime(''); setSchedLoc('')
  }

  function handleCancel(req: AdvisingRequest) {
    store.updateRequestStatus(req.id, 'cancelled')
    const apt = store.appointments.find(a => a.requestId === req.id && a.status === 'scheduled')
    if (apt) store.updateAppointmentStatus(apt.id, 'cancelled')
    addToast('info', t('ยกเลิกคำร้องแล้ว', 'Request Cancelled'))
  }

  function handleComplete(req: AdvisingRequest) {
    store.updateRequestStatus(req.id, 'completed')
    const apt = store.appointments.find(a => a.requestId === req.id && a.status === 'scheduled')
    if (apt) store.updateAppointmentStatus(apt.id, 'completed')
    addToast('success', t('บันทึกเสร็จสิ้นแล้ว', 'Marked as Completed'), t('คุณสามารถเขียนบันทึกผลการให้คำปรึกษาได้ทันที', 'You can now proceed to write an advising log.'))
  }

  const columns = [
    {
      key: 'student',
      header: t('นักศึกษา', 'Student'),
      render: (r: AdvisingRequest) => {
        const s = store.users.find(u => u.id === r.studentId)
        return (
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{s?.name}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">{s?.code}</p>
          </div>
        )
      },
    },
    {
      key: 'category',
      header: t('หมวดหมู่', 'Category'),
      render: (r: AdvisingRequest) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {getCategoryLabel(r.category)}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('วันที่ยื่นคำร้อง', 'Requested Date'),
      render: (r: AdvisingRequest) => <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.createdAt}</span>,
    },
    {
      key: 'preferred',
      header: t('วัน-เวลาที่ประสงค์ขอเข้าพบ', 'Requested Slot'),
      render: (r: AdvisingRequest) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {r.preferredDate} · {r.preferredTime}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('สถานะ', 'Status'),
      render: (r: AdvisingRequest) => <StatusBadge status={r.status} />,
    },
    {
      key: 'progress',
      header: t('ความคืบหน้า', 'Progress'),
      render: (r: AdvisingRequest) => {
        const rp = getProgressForRequest(r.id)
        if (!rp) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${rp.progress}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{rp.progress}%</span>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (r: AdvisingRequest) => {
        const s = store.users.find(u => u.id === r.studentId)
        const apt = store.appointments.find(a => a.requestId === r.id && a.status === 'scheduled')
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => setDetailReq(r)}>
              <Eye className="h-3 w-3 mr-1" /> {t('ดูรายละเอียด', 'View')}
            </Button>
            {r.status === 'scheduled' && (
              <GoogleCalendarButton
                event={{
                  title: `Advising Meeting: ${s?.name || r.studentId} & ${currentUser.name}`,
                  description: `Advising Topic: ${getCategoryLabel(r.category)}\nStudent Code: ${s?.code || ''}\nLocation: ${apt?.location || 'Office / Online'}\nDetails: ${r.details}`,
                  location: apt?.location || 'Office / Online',
                  date: apt?.scheduledDate || r.preferredDate,
                  time: apt?.scheduledTime || r.preferredTime,
                  attendeeEmails: [s?.email || '', currentUser.email],
                }}
                label={t('ปฏิทิน & เชิญ', 'Invite & Calendar')}
                size="sm"
                variant="secondary"
              />
            )}
            {r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'closed' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setSelectedReq(r); setShowProgressModal(true) }}
              >
                <TrendingUp className="h-3 w-3 mr-1" /> {t('อัปเดตความคืบหน้า', 'Update Progress')}
              </Button>
            )}
            {r.status === 'requested' && (
              <Button size="sm" variant="primary" onClick={() => handleAccept(r)}>
                {t('ตอบรับ', 'Accept')}
              </Button>
            )}
            {(r.status === 'requested' || r.status === 'pending') && (
              <Button size="sm" variant="secondary" onClick={() => { setSelectedReq(r); setShowSchedule(true) }}>
                <Calendar className="h-3 w-3 mr-1 text-sky-600 dark:text-sky-400" /> {t('นัดหมาย', 'Schedule')}
              </Button>
            )}
            {r.status === 'scheduled' && (
              <Button size="sm" variant="primary" onClick={() => handleComplete(r)}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> {t('เสร็จสิ้น', 'Complete')}
              </Button>
            )}
            {r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'closed' && (
              <Button size="sm" variant="ghost" onClick={() => handleCancel(r)}>
                {t('ยกเลิก', 'Cancel')}
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('รายการการให้คำปรึกษาทางวิชาการ', 'Advising Sessions')}
        description={t('ตรวจสอบคำร้องของนักศึกษา กำหนดเวลานัดหมายเข้าพบ และบันทึกผลการให้คำปรึกษา', 'Review student advising requests, schedule appointments, and mark sessions complete.')}
      />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={setDetailReq}
        emptyMessage={t(`ไม่พบรายการในสถานะนี้`, `No ${tab} sessions found.`)}
      />

      {/* Request Details Modal */}
      <Modal
        isOpen={!!detailReq}
        onClose={() => setDetailReq(null)}
        title={t('รายละเอียดคำร้องของนักศึกษา', 'Student Request Details')}
        size="lg"
      >
        {detailReq && (() => {
          const student = store.users.find(u => u.id === detailReq.studentId)
          const appointment = store.appointments.find(a => a.requestId === detailReq.id)
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('นักศึกษา', 'Student')}</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{student?.name || '-'} ({student?.code || '-'})</p>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('รหัสคำร้อง', 'Request ID')}</span>
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{detailReq.id}</p>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('หมวดหมู่', 'Category')}</span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{getCategoryLabel(detailReq.category)}</p>
                  {detailReq.subCategory && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{detailReq.subCategory}</p>}
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('สถานะ', 'Status')}</span>
                  <StatusBadge status={detailReq.status} />
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">{t('รายละเอียดที่นักศึกษาเขียน', 'Student Description')}</span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  {detailReq.details}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('วันที่ยื่นคำร้อง', 'Submitted')}</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{detailReq.createdAt}</p>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block mb-1">{t('วันที่/เวลาที่ประสงค์ขอเข้าพบ', 'Preferred Meeting')}</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{detailReq.preferredDate} · {detailReq.preferredTime}</p>
                </div>
                {appointment && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-sky-800 dark:text-sky-300 font-bold block mb-0.5">{t('นัดหมายที่กำหนดแล้ว', 'Scheduled Appointment')}</span>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">{appointment.scheduledDate} · {appointment.scheduledTime} · {appointment.location}</p>
                    </div>
                    <GoogleCalendarButton
                      event={{
                        title: `Advising Meeting: ${student?.name || detailReq.studentId} & ${currentUser.name}`,
                        description: `Advising Topic: ${getCategoryLabel(detailReq.category)}\nLocation: ${appointment.location}\nDetails: ${detailReq.details}`,
                        location: appointment.location,
                        date: appointment.scheduledDate,
                        time: appointment.scheduledTime,
                        attendeeEmails: [student?.email || '', currentUser.email],
                      }}
                      size="sm"
                      variant="primary"
                    />
                  </div>
                )}
              </div>

              {(() => {
                const rawAttachments = detailReq.attachments
                const attachmentsList: string[] = Array.isArray(rawAttachments)
                  ? rawAttachments
                  : typeof rawAttachments === 'string'
                    ? (() => { try { const p = JSON.parse(rawAttachments); return Array.isArray(p) ? p : [] } catch { return [] } })()
                    : []
                if (attachmentsList.length === 0) return null
                return (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">{t('เอกสารแนบ', 'Attachments')}</span>
                    <div className="flex flex-wrap gap-2">
                      {attachmentsList.map(file => (
                        <span key={file} className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300 font-medium">
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })()}
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={showSchedule} onClose={() => setShowSchedule(false)} title={t('นัดหมายเวลาเข้าพบอาจารย์ที่ปรึกษา', 'Schedule Advising Appointment')} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('วันที่นัดหมาย', 'Appointment Date')} *</label>
            <input
              type="date"
              value={schedDate}
              onChange={e => setSchedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('เวลานัดหมาย', 'Appointment Time')} *</label>
            <input
              type="time"
              value={schedTime}
              onChange={e => setSchedTime(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('สถานที่ / ห้องเข้าพบ', 'Location / Meeting Room')} *</label>
            <input
              type="text"
              value={schedLoc}
              onChange={e => setSchedLoc(e.target.value)}
              placeholder={t('เช่น ห้องพักอาจารย์ S2-301 หรือ Zoom Online', 'e.g. Office Room S2-301 or Online (Zoom)')}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowSchedule(false)}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleSchedule}>{t('ยืนยันนัดหมาย', 'Confirm Schedule')}</Button>
          </div>
        </div>
      </Modal>

      {/* Progress History Section */}
      {myProgress.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติความคืบหน้าคำร้อง', 'Request Progress History')}
          </h3>
          {myProgress.map(rp => {
            const request = myRequests.find(r => r.id === rp.requestId)
            if (!request) return null
            return (
              <Card key={rp.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{getCategoryLabel(request.category)}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{store.users.find(u => u.id === request.studentId)?.name} · {rp.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full"
                        style={{ width: `${rp.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{rp.progress}%</span>
                  </div>
                </div>
                {rp.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">{rp.notes}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Progress Update Modal */}
      <Modal isOpen={showProgressModal} onClose={() => { setShowProgressModal(false); setSelectedReq(null) }} title={t('อัปเดตความคืบหน้าคำร้อง', 'Update Request Progress')} size="md">
        <div className="space-y-4">
          <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-800">
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 mb-1">{t('คำร้อง', 'Request')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{getCategoryLabel(selectedReq?.category || '')}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{store.users.find(u => u.id === selectedReq?.studentId)?.name}</p>
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
            <Button variant="secondary" onClick={() => { setShowProgressModal(false); setSelectedReq(null) }}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleUpdateProgress}>{t('บันทึก', 'Save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

