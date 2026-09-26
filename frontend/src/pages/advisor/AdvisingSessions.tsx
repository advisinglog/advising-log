// ============================================================
// Advisor — Advising Sessions (Minimal & Streamlined)
// ============================================================

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Tabs, DataTable, Button, Modal, DocumentViewerModal, SearchInput, type DocumentViewerTarget } from '@/components/ui'
import type { AdvisingRequest } from '@/types'
import { Calendar, Eye, FileText, Sparkles, Building2, Video, CheckCircle2, MapPin, Link2 } from 'lucide-react'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { openGoogleCalendarEvent } from '@/utils/calendarUtils'

export default function AdvisingSessions() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()

  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [selectedReq, setSelectedReq] = useState<AdvisingRequest | null>(null)
  const [detailReq, setDetailReq] = useState<AdvisingRequest | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)

  const [showSchedule, setShowSchedule] = useState(false)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [meetingMode, setMeetingMode] = useState<'in_person' | 'online'>('in_person')
  const [schedLoc, setSchedLoc] = useState('')
  const [autoOpenCalendar, setAutoOpenCalendar] = useState(true)

  const viewedRequestsKey = currentUser ? `advising_log_viewed_requests_${currentUser.id}` : ''

  const getViewedRequests = (): string[] => {
    if (!viewedRequestsKey) return []
    try {
      const stored = JSON.parse(localStorage.getItem(viewedRequestsKey) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  }

  const [viewedRequestIds, setViewedRequestIds] = useState<string[]>(getViewedRequests)

  const isNewRequest = (request: AdvisingRequest) => !viewedRequestIds.includes(request.id)

  const markRequestViewed = (requestId: string) => {
    setViewedRequestIds(previous => {
      if (previous.includes(requestId)) return previous
      const next = [...previous, requestId]
      localStorage.setItem(viewedRequestsKey, JSON.stringify(next))
      return next
    })
  }

  if (!currentUser) return null

  const myRequests = store.requests.filter(r => isAdvisorMatch(r.advisorId, currentUser, store.users))

  const filterMap: Record<string, string[]> = {
    pending: ['requested', 'pending'],
    upcoming: ['scheduled'],
    completed: ['completed', 'closed'],
    cancelled: ['cancelled'],
  }

  const filtered = myRequests
    .filter(r => filterMap[tab]?.includes(r.status))
    .filter(r => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      const student = store.users.find(u => u.id === r.studentId)
      const searchable = [
        r.createdAt,
        getCategoryLabel(r.category),
        r.subCategory ? getSubCategoryLabel(r.subCategory) : '',
        r.details,
        student?.name || '',
        student?.code || '',
      ].join(' ').toLowerCase()
      return searchable.includes(q)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function getAttachments(request: AdvisingRequest): DocumentViewerTarget[] {
    return (Array.isArray(request.attachments) ? request.attachments : []).map((attachment, index) => {
      const value = attachment as unknown
      if (typeof value === 'string') {
        return { id: `${request.id}-attachment-${index}`, fileName: value, title: value }
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
      }
    })
  }

  const tabs = [
    { value: 'pending', label: t('คำร้องรอการตอบรับ', 'Pending Requests'), count: myRequests.filter(r => ['requested', 'pending'].includes(r.status)).length },
    { value: 'upcoming', label: t('นัดหมายที่ยืนยันแล้ว', 'Upcoming Sessions'), count: myRequests.filter(r => r.status === 'scheduled').length },
    { value: 'completed', label: t('เสร็จสิ้นแล้ว', 'Completed'), count: myRequests.filter(r => ['completed', 'closed'].includes(r.status)).length },
    { value: 'cancelled', label: t('ยกเลิก', 'Cancelled'), count: myRequests.filter(r => r.status === 'cancelled').length },
  ]

  function handleSchedule() {
    if (!selectedReq || !currentUser) return
    const finalLocation = schedLoc.trim()
    if (!finalLocation) {
      addToast(
        'error',
        t('กรุณาระบุสถานที่หรือลิงก์เข้าพบ', 'Location / Link Required'),
        meetingMode === 'in_person'
          ? t('กรุณาระบุห้องพักอาจารย์หรือสถานที่เข้าพบ', 'Please specify the room number or meeting location.')
          : t('กรุณาระบุลิงก์ห้องประชุมออนไลน์ เช่น Google Meet หรือ Zoom', 'Please specify the virtual meeting link (e.g. Google Meet or Zoom).')
      )
      return
    }

    markRequestViewed(selectedReq.id)
    const apt = store.addAppointment({
      requestId: selectedReq.id,
      studentId: selectedReq.studentId,
      advisorId: currentUser!.id,
      scheduledDate: schedDate,
      scheduledTime: schedTime,
      location: finalLocation,
      status: 'scheduled',
    })
    store.updateRequestStatus(selectedReq.id, 'scheduled')
    store.addNotification({
      userId: selectedReq.studentId,
      type: 'info',
      title: t('ยืนยันนัดหมายเวลาเข้าพบอาจารย์แล้ว', 'Appointment Confirmed'),
      message: `${t('อาจารย์ที่ปรึกษายืนยันการนัดหมายเข้าพบในวันที่', 'Your advising appointment has been confirmed for')} ${schedDate} ${schedTime} (${finalLocation})`,
      relatedId: apt.id,
      isRead: false,
    })
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'appointment_scheduled',
      description: `Confirmed appointment for ${store.users.find(u => u.id === selectedReq.studentId)?.name}`,
      targetId: apt.id,
    })

    const student = store.users.find(u => u.id === selectedReq.studentId)
    if (autoOpenCalendar) {
      openGoogleCalendarEvent({
        title: `Advising Meeting: ${student?.name || selectedReq.studentId} & ${currentUser.name}`,
        description: `Advising Topic: ${getCategoryLabel(selectedReq.category)}\nStudent Code: ${student?.code || ''}\nLocation / Platform: ${finalLocation}\nDetails: ${selectedReq.details}`,
        location: finalLocation,
        date: schedDate,
        time: schedTime,
        attendeeEmails: [student?.email || '', currentUser.email],
      })
    }

    addToast(
      'success',
      t('ยืนยันนัดหมายสำเร็จ', 'Appointment Confirmed'),
      autoOpenCalendar
        ? t('บันทึกนัดหมายและเปิด Google Calendar เพื่อส่งคำเชิญแล้ว', 'Appointment saved & Google Calendar opened for invitation.')
        : `${schedDate} · ${schedTime}`
    )
    setShowSchedule(false)
    setSelectedReq(null)
  }

  function handleCancel(req: AdvisingRequest) {
    markRequestViewed(req.id)
    store.updateRequestStatus(req.id, 'cancelled')
    const apt = store.appointments.find(a => a.requestId === req.id && a.status === 'scheduled')
    if (apt) store.updateAppointmentStatus(apt.id, 'cancelled')
    addToast('info', t('ยกเลิกคำร้องแล้ว', 'Request Cancelled'))
  }

  const columns = [
    { key: 'date', header: t('วันที่ยื่น', 'Date'), render: (r: AdvisingRequest) => (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.createdAt}</span>
        {isNewRequest(r) && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-[10px] font-bold text-sky-700 dark:text-sky-300"><Sparkles className="h-3 w-3" />{t('ใหม่', 'New')}</span>}
      </div>
    ) },
    { key: 'student', header: t('นักศึกษา', 'Student'), render: (r: AdvisingRequest) => {
      const student = store.users.find(u => u.id === r.studentId)
      return <div><span className="text-xs text-slate-700 dark:text-slate-300 font-medium block">{student?.name || '-'}</span><span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{student?.code || '-'}</span></div>
    } },
    {
      key: 'category',
      header: t('หมวดหมู่', 'Category'),
      render: (r: AdvisingRequest) => {
        return (
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 block">{getCategoryLabel(r.category)}</span>
            {r.subCategory && <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{getSubCategoryLabel(r.subCategory)}</span>}
          </div>
        )
      },
    },
    {
      key: 'meetingSlot',
      header: t('วันและเวลานัดหมาย', 'Meeting Time'),
      render: (r: AdvisingRequest) => {
        const apt = store.appointments.find(a => a.requestId === r.id && a.status === 'scheduled')
        if (apt) {
          return (
            <div className="inline-flex flex-col bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-3 py-2">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {apt.scheduledDate} · {apt.scheduledTime}
              </p>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">{apt.location}</p>
            </div>
          )
        }
        return (
          <div className="inline-flex flex-col bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {r.preferredDate} · {r.preferredTime}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('เวลาที่นักศึกษาเสนอ', 'Proposed slot')}</p>
          </div>
        )
      },
    },
    ...(tab === 'pending' || tab === 'upcoming'
      ? [
          {
            key: 'actions',
            header: t('การจัดการ', 'Actions'),
            render: (r: AdvisingRequest) => {
              return (
                <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                  {(r.status === 'requested' || r.status === 'pending') && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        markRequestViewed(r.id)
                        setSelectedReq(r)
                        setSchedDate(r.preferredDate || new Date().toISOString().split('T')[0])
                        setSchedTime(r.preferredTime || '10:00')
                        setMeetingMode('in_person')
                        setSchedLoc('')
                        setAutoOpenCalendar(true)
                        setShowSchedule(true)
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {t('ตอบรับ', 'Confirm')}
                    </Button>
                  )}

                  {r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'closed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(r)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      {t('ยกเลิก', 'Cancel')}
                    </Button>
                  )}
                </div>
              )
            },
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title={t('รายการการให้คำปรึกษาทางวิชาการ', 'Advising Sessions')}
        description={t('ตรวจสอบคำร้องของนักศึกษา กำหนดเวลานัดหมายเข้าพบ และบันทึกผลการให้คำปรึกษา', 'Review student advising requests, schedule appointments, and mark sessions complete.')}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="mb-5 sm:mb-6 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาตามหมวดหมู่ ชื่อนักศึกษา หรือคำสำคัญ...', 'Search by category, student, or keyword...')} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={r => { markRequestViewed(r.id); setDetailReq(r) }}
        emptyMessage={t(`ไม่พบรายการในสถานะนี้`, `No ${tab} sessions found.`)}
      />

      <Modal
        isOpen={Boolean(detailReq)}
        onClose={() => setDetailReq(null)}
        title={t('รายละเอียดคำร้องขอคำปรึกษา', 'Advising Request Details')}
        size="md"
      >
        {detailReq && (
          <div className="space-y-4">
            {/* Student Name */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">{t('นักศึกษาผู้ยื่นคำร้อง', 'Student')}</span>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {store.users.find(u => u.id === detailReq.studentId)?.name || '-'}
                <span className="text-xs font-mono font-normal text-slate-500 ml-2">
                  ({store.users.find(u => u.id === detailReq.studentId)?.code || '-'})
                </span>
              </p>
            </div>

            {/* Topic & Details (What is not in the table) */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">{t('รายละเอียดที่นักศึกษาต้องการปรึกษา', 'Consultation Details')}</h4>
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3.5 text-slate-800 dark:text-slate-200">
                {detailReq.details || '-'}
              </p>
            </div>

            {/* Attachments (What is not in the table) */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">{t('ไฟล์แนบ', 'Attachments')}</h4>
              <div className="space-y-2">
                {getAttachments(detailReq).length === 0 && <p className="text-xs text-slate-400 py-1">{t('ไม่มีไฟล์แนบ', 'No attachments')}</p>}
                {getAttachments(detailReq).map(file => {
                  const hasFile = Boolean(file.fileUrl || file.cloudinaryPublicId)
                  return (
                    <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                      <span className="flex items-center gap-2 min-w-0 text-xs font-medium truncate"><FileText className="h-4 w-4 text-sky-600 shrink-0" />{file.fileName}</span>
                      <Button size="sm" variant={hasFile ? 'secondary' : 'ghost'} disabled={!hasFile} onClick={() => setPreviewDoc(file)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> {hasFile ? t('เปิดดู', 'Open') : t('ไม่มีไฟล์', 'Unavailable')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <DocumentViewerModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Confirm Appointment Modal */}
      <Modal
        isOpen={showSchedule}
        onClose={() => setShowSchedule(false)}
        title={t('ยืนยันการนัดหมายเข้าพบอาจารย์ที่ปรึกษา', 'Confirm Advising Appointment')}
        size="md"
      >
        {selectedReq && (
          <div className="space-y-4">
            {/* Student & Agreed Slot Banner */}
            <div className="rounded-xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>{store.users.find(u => u.id === selectedReq.studentId)?.name || '-'}</span>
                  <span className="font-mono text-slate-500 font-normal">({store.users.find(u => u.id === selectedReq.studentId)?.code || '-'})</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                  {getCategoryLabel(selectedReq.category)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('วัน-เวลาที่นักศึกษาขอเข้าพบ:', 'Requested Slot:')}</span>
                <span className="font-bold">{schedDate} · {schedTime}</span>
              </div>
            </div>

            {/* Meeting Mode Selector (In-person vs Online) */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('รูปแบบการเข้าพบ', 'Meeting Format')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingMode('in_person')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    meetingMode === 'in_person'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{t('เข้าพบตัวต่อตัว (Onsite)', 'In-Person (Onsite)')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMeetingMode('online')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    meetingMode === 'online'
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Video className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('ออนไลน์ (Virtual)', 'Online (Virtual)')}</span>
                </button>
              </div>
            </div>

            {/* Location / Platform link field */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {meetingMode === 'in_person' ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sky-600" />
                    {t('สถานที่ / ห้องเข้าพบ', 'Specific Room / Location')} *
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-indigo-600" />
                    {t('แพลตฟอร์มหรือลิงก์ห้องประชุม', 'Meeting Platform / Link')} *
                  </span>
                )}
              </label>

              <input
                type="text"
                value={schedLoc}
                onChange={e => setSchedLoc(e.target.value)}
                placeholder={
                  meetingMode === 'in_person'
                    ? t('เช่น ห้องพักอาจารย์ S2-301', 'e.g. Office Room S2-301')
                    : t('เช่น ลิงก์ Google Meet หรือ Zoom', 'e.g. Google Meet or Zoom link')
                }
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Google Calendar Sync Checkbox */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoOpenCalendar}
                  onChange={e => setAutoOpenCalendar(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {t('เพิ่มลงใน Google Calendar ของคุณและส่งคำเชิญให้นักศึกษา', 'Add to your Google Calendar & invite student')}
                </span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setShowSchedule(false)}>
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <Button variant="primary" onClick={handleSchedule}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {t('ยืนยันนัดหมาย', 'Confirm Appointment')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
