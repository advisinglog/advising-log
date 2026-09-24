// ============================================================
// Advisor — Advising Sessions (Minimal & Streamlined)
// ============================================================

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Tabs, DataTable, StatusBadge, Button, Modal, GoogleCalendarButton, DocumentViewerModal, SearchInput, type DocumentViewerTarget } from '@/components/ui'
import type { AdvisingRequest } from '@/types'
import { Calendar, CheckCircle2, Eye, FileText, Sparkles } from 'lucide-react'
import { isAdvisorMatch } from '@/utils/advisorUtils'

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
  const [schedLoc, setSchedLoc] = useState('')

  const isRecentRequest = (request: AdvisingRequest) => {
    const createdAt = new Date(request.createdAt).getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return Number.isFinite(createdAt) && createdAt >= sevenDaysAgo
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
      if (!search) return true
      const student = store.users.find(u => u.id === r.studentId)
      const searchable = [
        r.createdAt,
        getCategoryLabel(r.category),
        r.subCategory ? getSubCategoryLabel(r.subCategory) : '',
        r.details,
        student?.name || '',
        student?.code || '',
      ].join(' ').toLowerCase()
      return searchable.includes(search.toLowerCase())
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
    setSchedDate('')
    setSchedTime('')
    setSchedLoc('')
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
    { key: 'date', header: t('วันที่ยื่น', 'Date'), render: (r: AdvisingRequest) => (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.createdAt}</span>
        {isRecentRequest(r) && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-[10px] font-bold text-sky-700 dark:text-sky-300"><Sparkles className="h-3 w-3" />{t('ใหม่', 'New')}</span>}
      </div>
    ) },
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
    { key: 'student', header: t('นักศึกษา', 'Student'), render: (r: AdvisingRequest) => {
      const student = store.users.find(u => u.id === r.studentId)
      return <div><span className="text-xs text-slate-700 dark:text-slate-300 font-medium block">{student?.name || '-'}</span><span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{student?.code || '-'}</span></div>
    } },
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
    {
      key: 'status',
      header: t('สถานะ', 'Status'),
      render: (r: AdvisingRequest) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (r: AdvisingRequest) => {
        const s = store.users.find(u => u.id === r.studentId)
        const apt = store.appointments.find(a => a.requestId === r.id && a.status === 'scheduled')
        return (
          <div className="flex items-center gap-2 flex-wrap">
            {r.status === 'scheduled' && (
              <>
                <GoogleCalendarButton
                  event={{
                    title: `Advising Meeting: ${s?.name || r.studentId} & ${currentUser.name}`,
                    description: `Advising Topic: ${getCategoryLabel(r.category)}\nStudent Code: ${s?.code || ''}\nLocation: ${apt?.location || 'Office / Online'}\nDetails: ${r.details}`,
                    location: apt?.location || 'Office / Online',
                    date: apt?.scheduledDate || r.preferredDate,
                    time: apt?.scheduledTime || r.preferredTime,
                    attendeeEmails: [s?.email || '', currentUser.email],
                  }}
                  label={t('ปฏิทิน', 'Calendar')}
                  size="sm"
                  variant="secondary"
                />
                <Button size="sm" variant="primary" onClick={() => handleComplete(r)}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {t('เสร็จสิ้น', 'Complete')}
                </Button>
              </>
            )}

            {(r.status === 'requested' || r.status === 'pending') && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setSelectedReq(r)
                  setSchedDate(r.preferredDate || '')
                  setSchedTime(r.preferredTime || '')
                  setSchedLoc('Faculty Office S2-301')
                  setShowSchedule(true)
                }}
              >
                <Calendar className="h-3 w-3 mr-1" /> {t('นัดหมาย', 'Schedule')}
              </Button>
            )}

            {r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'closed' && (
              <Button size="sm" variant="ghost" onClick={() => handleCancel(r)} className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">
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

      <div className="mb-5 sm:mb-6 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาตามหมวดหมู่ ชื่อนักศึกษา หรือคำสำคัญ...', 'Search by category, student, or keyword...')} />
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1"><Sparkles className="h-3 w-3 text-sky-500" /> {t('ป้าย “ใหม่” หมายถึงรายการที่ยื่นภายใน 7 วันล่าสุด', '“New” means submitted within the last 7 days')}</p>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={r => setDetailReq(r)}
        emptyMessage={t(`ไม่พบรายการในสถานะนี้`, `No ${tab} sessions found.`)}
      />

      <Modal
        isOpen={Boolean(detailReq)}
        onClose={() => setDetailReq(null)}
        title={t('รายละเอียดคำร้องขอคำปรึกษา', 'Advising Request Details')}
        size="lg"
      >
        {detailReq && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div><span className="text-slate-400 block">{t('นักศึกษา', 'Student')}</span><p className="font-semibold mt-1">{store.users.find(u => u.id === detailReq.studentId)?.name || '-'}</p></div>
              <div><span className="text-slate-400 block">{t('รหัสคำร้อง', 'Request ID')}</span><p className="font-semibold mt-1">{detailReq.id}</p></div>
              <div><span className="text-slate-400 block">{t('วันที่นัดหมาย', 'Requested date')}</span><p className="font-semibold mt-1">{detailReq.preferredDate}</p></div>
              <div><span className="text-slate-400 block">{t('เวลา', 'Time')}</span><p className="font-semibold mt-1">{detailReq.preferredTime}</p></div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">{t('หัวข้อและรายละเอียด', 'Topic and details')}</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4">{detailReq.details || '-'}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">{t('ไฟล์แนบ', 'Attachments')}</h4>
              <div className="space-y-2">
                {getAttachments(detailReq).length === 0 && <p className="text-xs text-slate-400">{t('ไม่มีไฟล์แนบ', 'No attachments')}</p>}
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
    </div>
  )
}
