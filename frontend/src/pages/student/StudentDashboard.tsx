// ============================================================
// Student Dashboard — REG MFU Academic Information Style
// ============================================================

import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, Button, StudentProfileBanner, GoogleCalendarButton } from '@/components/ui'
import { Calendar, Clock, ListChecks, FileEdit, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function StudentDashboard() {
  const { currentUser } = useAuth()
  const { t, language, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const store = useStore()
  const navigate = useNavigate()

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

  // Find active advisor from roster
  const matchingRosterEntries = store.roster
    .filter(r => r.isActive && isCurrentStudent(r.studentId))
    .sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''))
  const rosterEntry = matchingRosterEntries[0] || null

  const advisor = rosterEntry
    ? store.users.find(
        u =>
          u.id === rosterEntry.advisorId ||
          (u.code && rosterEntry.advisorId && u.code.toUpperCase() === rosterEntry.advisorId.toUpperCase()) ||
          (u.email && rosterEntry.advisorId && u.email.toLowerCase() === rosterEntry.advisorId.toLowerCase())
      )
    : store.users.find(u => u.id === 'ADV001' || u.role === 'advisor')

  // My data (sorted chronologically so upcomingAppointment is the earliest pending session)
  const myRequests = store.requests.filter(r => isCurrentStudent(r.studentId))
  const myAppointments = store.appointments
    .filter(a => isCurrentStudent(a.studentId) && a.status === 'scheduled' && !a.studentDeclined)
    .sort((a, b) => {
      const cmpDate = a.scheduledDate.localeCompare(b.scheduledDate)
      if (cmpDate !== 0) return cmpDate
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    })
  const myFollowUps = store.followUps.filter(f => isCurrentStudent(f.studentId) && f.status !== 'completed')
  const upcomingAppointment = myAppointments[0]
  const upcomingReq = upcomingAppointment ? store.requests.find(r => r.id === upcomingAppointment.requestId) : null
  const upcomingAdvisor = upcomingAppointment ? store.users.find(u => u.id === upcomingAppointment.advisorId) : null

  return (
    <div>
      {/* Student Profile Hero Banner (REG MFU SIS Style) */}
      <StudentProfileBanner
        student={currentUser}
        advisor={advisor}
        school={currentUser.department ? (language === 'th' ? 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)' : 'School of Applied Digital Technology (ADT)') : undefined}
        major={t('สาขาวิชาวิศวกรรมซอฟต์แวร์', 'Software Engineering')}
      />

      <PageHeader
        title={t('บริการให้คำปรึกษาทางวิชาการ', 'Academic Advising Services')}
        description={t('ระบบติดตามผลการเข้าพบอาจารย์ที่ปรึกษา ตารางการนัดหมาย และรายการงานมอบหมายทางวิชาการ', 'Track advisor sessions, upcoming appointments, and assigned follow-up items.')}
        actions={
          <Button onClick={() => navigate('/student/request')}>
            <FileEdit className="h-4 w-4 mr-1.5" />
            {t('ยื่นคำร้องขอเข้าพบ', 'Request Advising')}
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label={t('คำร้องทั้งหมด', 'Total Requests')} value={myRequests.length} icon={<FileEdit className="h-5 w-5" />} color="sky" />
        <StatCard label={t('นัดหมายที่กำลังมาถึง', 'Upcoming Sessions')} value={myAppointments.length} icon={<Calendar className="h-5 w-5" />} color="sky" />
        <StatCard label={t('งานติดตามผลคงค้าง', 'Pending Follow-ups')} value={myFollowUps.length} icon={<ListChecks className="h-5 w-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Appointment */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ตารางนัดหมายที่กำลังจะมาถึง', 'Upcoming Advising Appointment')}
              </h3>
            </div>

            {upcomingAppointment ? (
              <div className="p-4 bg-sky-50/40 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="h-11 w-11 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{upcomingAppointment.scheduledDate}</p>
                        <StatusBadge status={upcomingAppointment.status} />
                        {upcomingAppointment.studentConfirmed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> {t('ยืนยันแล้ว', 'Confirmed')}
                          </span>
                        )}
                        {!upcomingAppointment.studentConfirmed && !upcomingAppointment.studentDeclined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> {t('รอยืนยันการนัดพบ', 'Awaiting Confirmation')}
                          </span>
                        )}
                      </div>
                      {upcomingAdvisor && (
                        <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold mt-1">
                          <span className="text-slate-400 dark:text-slate-400 font-medium">{t('อาจารย์ที่ปรึกษา:', 'Advisor:')}</span> {upcomingAdvisor.name}
                          {upcomingReq && (
                            <span className="font-normal text-slate-500 dark:text-slate-400">
                              {' '}({getCategoryLabel(upcomingReq.category)}{upcomingReq.subCategory ? ` · ${getSubCategoryLabel(upcomingReq.subCategory)}` : ''})
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-2 font-medium">
                        <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-semibold">
                          <Clock className="h-3.5 w-3.5" /> {upcomingAppointment.scheduledTime}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span><span className="text-slate-400 font-medium">{t('สถานที่:', 'Location:')}</span> {upcomingAppointment.location}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                    <GoogleCalendarButton
                      event={{
                        title: `Advising Meeting: ${currentUser.name} & ${upcomingAdvisor?.name || 'Advisor'}`,
                        description: `Advising Topic: ${upcomingReq ? getCategoryLabel(upcomingReq.category) : 'Academic Consultation'}\nLocation: ${upcomingAppointment.location}\nDate: ${upcomingAppointment.scheduledDate} ${upcomingAppointment.scheduledTime}`,
                        location: upcomingAppointment.location,
                        date: upcomingAppointment.scheduledDate,
                        time: upcomingAppointment.scheduledTime,
                        attendeeEmails: [currentUser.email, upcomingAdvisor?.email || ''],
                      }}
                      size="sm"
                      variant="secondary"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(upcomingAppointment.requestId ? `/student/history/${upcomingAppointment.requestId}` : '/student/history')}
                    >
                      {t('ดูรายละเอียด', 'View Details')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t('ไม่มีนัดหมายที่กำลังจะมาถึง', 'No upcoming appointments')}
                description={t('คุณยังไม่มีตารางนัดหมายเข้าพบอาจารย์ที่ปรึกษาในเร็วๆ นี้ สามารถยื่นคำร้องขอเข้าพบได้ตลอดเวลา', 'You have no scheduled appointments coming up. You can submit an advising request anytime.')}
                action={
                  <Button size="sm" onClick={() => navigate('/student/request')}>
                    {t('ยื่นคำร้องขอนัดหมาย', 'Request Advising Session')}
                  </Button>
                }
              />
            )}
          </Card>

          {/* Recent Advising Requests Table (REG MFU Academic Table Style) */}
          <Card>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติคำร้องขอรับคำปรึกษาล่าสุด', 'Recent Advising Petitions')}
              </h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/student/history')} className="text-xs text-sky-600 dark:text-sky-400">
                {t('ดูทั้งหมด', 'View All')} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {myRequests.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myRequests.slice(0, 4).map(req => {
                  const catLabel = getCategoryLabel(req.category)
                  return (
                    <div
                      key={req.id}
                      onClick={() => navigate(`/student/history/${req.id}`)}
                      className="py-3.5 px-2 hover:bg-sky-50/30 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {req.id}
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-900 dark:group-hover:text-sky-300">
                            {catLabel}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{req.details}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {t('ยื่นคำร้องเมื่อ:', 'Submitted on:')} {req.createdAt}
                          {req.preferredDate && ` · ${t('ขอเข้าพบ:', 'Requested:')} ${req.preferredDate} ${req.preferredTime || ''}`}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState title={t('ไม่พบประวัติคำร้อง', 'No advising petitions found')} description={t('คุณยังไม่มีประวัติการยื่นคำร้องขอรับคำปรึกษาในภาคการศึกษานี้', 'You have not submitted any advising requests in this academic term.')} />
            )}
          </Card>
        </div>

        {/* Right column (1 col) */}
        <div className="space-y-6">
          {/* Pending Follow-ups */}
          <Card>
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('งานที่ต้องดำเนินการ', 'Assigned Action Items')}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                {myFollowUps.length} {t('รายการ', 'Items')}
              </span>
            </div>

            {myFollowUps.length > 0 ? (
              <div className="space-y-2.5">
                {myFollowUps.slice(0, 4).map(fu => (
                  <div key={fu.id} className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 rounded-xl hover:border-sky-200 dark:hover:border-sky-800 transition-all">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{fu.task}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t('กำหนดส่ง:', 'Due:')} {fu.dueDate}</span>
                      <StatusBadge status={fu.status} />
                    </div>
                  </div>
                ))}
                <Button size="sm" variant="secondary" onClick={() => navigate('/student/followups')} className="w-full mt-2 text-xs">
                  {t('จัดการงานที่ต้องทำทั้งหมด', 'Manage All Action Items')}
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('ไม่มีงานค้างที่ต้องส่ง', 'All tasks completed')}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{t('คุณได้ปฏิบัติตามคำแนะนำครบถ้วนแล้ว', 'You have no pending advisor action items.')}</p>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}



