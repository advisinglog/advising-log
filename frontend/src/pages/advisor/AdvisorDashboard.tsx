// ============================================================
// Advisor Dashboard — REG MFU Academic Information Style
// ============================================================

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, Button, Modal, AdvisorCohortBanner, GoogleCalendarButton } from '@/components/ui'
import { FileEdit, CalendarClock, ListChecks, UserX, AlertTriangle, Clock, ArrowRight, UserPlus, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Inline Mini Calendar ──────────────────────────────────────────────────────
interface MiniCalendarProps {
  appointmentDates: Set<string>   // 'YYYY-MM-DD' strings
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}

function MiniCalendar({ appointmentDates, selectedDate, onSelectDate }: MiniCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-based

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const MONTH_NAMES_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
  const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function cellDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  return (
    <Card className="mb-6 border-t-4 border-t-sky-600 dark:border-t-sky-500 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {MONTH_NAMES_TH[viewMonth]}{' '}
              <span className="text-slate-400 font-normal text-xs">/ {MONTH_NAMES_EN[viewMonth]} {viewYear}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              คลิกที่วันที่เพื่อกรองนัดหมายการให้คำปรึกษา
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct link to Google Calendar */}
          <a
            href="https://calendar.google.com/calendar/u/0/r"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-semibold border border-sky-200 dark:border-sky-800/60 transition-all cursor-pointer shadow-2xs"
            title="Open your Google Calendar"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Open Google Calendar</span>
          </a>

          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40"
            >
              Clear filter
            </button>
          )}

          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl py-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-slate-600 dark:text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = cellDateStr(day)
          const isToday = dateStr === todayStr
          const hasAppt = appointmentDates.has(dateStr)
          const isSelected = selectedDate === dateStr

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={[
                'relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer',
                isSelected
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-105 ring-2 ring-sky-300 dark:ring-sky-500'
                  : isToday
                  ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold ring-2 ring-sky-400 dark:ring-sky-500'
                  : hasAppt
                  ? 'bg-sky-50/80 dark:bg-sky-950/40 text-slate-800 dark:text-slate-100 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200/70 dark:border-sky-800/50'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {day}
              {hasAppt && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend & Sync note */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-600 dark:bg-sky-400 inline-block" />
            มีนัดหมาย (Has appointment)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 ring-2 ring-sky-400 dark:ring-sky-500 inline-block" />
            วันนี้ (Today)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-lg bg-sky-600 inline-block" />
            เลือกอยู่ (Selected)
          </span>
        </div>
        <span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
          💡 Syncs with Google Calendar 1-Click Sync
        </span>
      </div>
    </Card>
  )
}

export default function AdvisorDashboard() {
  const { currentUser } = useAuth()
  const { t, language, getCategoryLabel } = useLanguage()
  const store = useStore()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [showAddAdvisee, setShowAddAdvisee] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null)

  if (!currentUser) return null

  const myAdvisees = store.roster.filter(r => r.advisorId === currentUser.id && r.isActive)
  const myRequests = store.requests.filter(r => r.advisorId === currentUser.id)
  const pendingRequests = myRequests.filter(r => r.status === 'requested' || r.status === 'pending')
  const upcomingApts = store.appointments
    .filter(a => a.advisorId === currentUser.id && a.status === 'scheduled')
    .sort((a, b) => {
      const cmpDate = (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
      if (cmpDate !== 0) return cmpDate
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    })

  // Calendar: set of all appointment dates (for dot markers)
  const appointmentDates = new Set(upcomingApts.map(a => a.scheduledDate).filter(Boolean) as string[])

  // Calendar: filter upcoming appointments by selected date
  const filteredUpcomingApts = calendarSelectedDate
    ? upcomingApts.filter(a => a.scheduledDate === calendarSelectedDate)
    : upcomingApts

  const myFollowUps = store.followUps.filter(f => f.advisorId === currentUser.id && f.status !== 'completed')
  const myExitCases = store.exitCases.filter(e => e.advisorId === currentUser.id && e.status !== 'closed')
  const myWarnings = store.earlyWarnings.filter(w => w.advisorId === currentUser.id && w.status !== 'resolved')
  const recentSessions = store.sessions.filter(s => s.advisorId === currentUser.id).slice(0, 5)

  // List of all active students
  const allStudents = store.users.filter(u => u.role === 'student' && u.isActive)
  const filteredStudents = allStudents.filter(u => {
    if (!studentSearch) return true
    const q = studentSearch.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function handleAddAdvisee() {
    if (!selectedStudentId) return
    const student = store.users.find(u => u.id === selectedStudentId)
    if (!student) return

    store.updateRosterEntry(selectedStudentId, currentUser!.id)
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'roster_updated',
      description: `Advisor added student ${student.name} (${student.code}) to their advisee cohort`,
      targetId: student.id,
    })

    addToast(
      'success',
      t('เพิ่มนักศึกษาในความดูแลสำเร็จ', 'Advisee Added Successfully'),
      t(`เพิ่ม ${student.name} (${student.code}) เข้าสู่บัญชีนักศึกษาในความดูแลแล้ว สามารถเข้าสู่ระบบได้ทันที`, `Added ${student.name} (${student.code}) to your advisee roster. Student can now log in immediately.`),
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
  }

  function handleRegisterAndAddAdvisee() {
    const raw = studentSearch.trim()
    if (!raw) return

    const code = raw.split('@')[0].toUpperCase()
    const email = raw.includes('@') ? raw.toLowerCase() : `${code.toLowerCase()}@lamduan.mfu.ac.th`
    const newStudentId = `STU_${Date.now().toString().slice(-6)}`

    const newStudent = {
      id: newStudentId,
      code,
      name: `Student ${code}`,
      email,
      role: 'student' as const,
      department: currentUser?.department || 'School of Applied Digital Technology (ADT)',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    }

    store.addUser(newStudent)
    store.updateRosterEntry(newStudentId, currentUser!.id)

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'roster_updated',
      description: `Advisor registered and added new student ${code} to their advisee cohort`,
      targetId: newStudentId,
    })

    addToast(
      'success',
      t('ลงทะเบียนและเพิ่มนักศึกษาสำเร็จ', 'Student Registered & Added Successfully'),
      t(`ลงทะเบียน ${code} (${email}) เข้าสู่ระบบและความดูแลของคุณเรียบร้อยแล้ว นักศึกษาสามารถล็อกอินได้ทันที`, `Registered ${code} (${email}) and added to your cohort. The student can now log in immediately.`),
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
  }

  return (
    <div>
      {/* Advisor Cohort Banner (REG MFU Academic Portal Style) */}
      <AdvisorCohortBanner
        advisor={currentUser}
        adviseeCount={myAdvisees.length || 18}
        school={currentUser.department ? (language === 'th' ? 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)' : 'School of Applied Digital Technology (ADT)') : undefined}
        semester={t('1/2569', 'Semester 1 / Academic Year 2026')}
      />

      <PageHeader
        title={t('ระบบบริหารการให้คำปรึกษาทางวิชาการ', 'Advisor Academic Console')}
        description={t('ภาพรวมคำร้องขอเข้าพบ ตารางนัดหมาย และการติดตามผลนักศึกษาในความดูแล ภาคการศึกษา 1/2569', 'Overview of advising petitions, upcoming sessions, and advisee academic tracking for Semester 1/2026.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowAddAdvisee(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}
            </Button>
            <Button onClick={() => navigate('/advisor/sessions')}>
              <CalendarClock className="h-4 w-4 mr-1.5" />
              {t('จัดการการให้คำปรึกษา', 'Manage Sessions')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label={t('คำร้องรอการตอบรับ', 'Pending Requests')} value={pendingRequests.length} icon={<FileEdit className="h-5 w-5" />} color="amber" />
        <StatCard label={t('นัดหมายที่ยืนยันแล้ว', 'Upcoming Sessions')} value={upcomingApts.length} icon={<CalendarClock className="h-5 w-5" />} color="sky" />
        <StatCard label={t('งานติดตามผลค้างอยู่', 'Open Follow-ups')} value={myFollowUps.length} icon={<ListChecks className="h-5 w-5" />} color="sky" />
        <StatCard label={t('เคสขอลาพัก/ลาออก', 'Active Exit Cases')} value={myExitCases.length} icon={<UserX className="h-5 w-5" />} color="red" />
        <StatCard label={t('เคสเตือนภัยวิชาการ', 'Early Warnings')} value={myWarnings.length} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
      </div>

      {/* ── Section Divider 1: Calendar ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-start">
          <span className="bg-slate-50 dark:bg-[#0b0f19] pr-3 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            {t('ตารางการให้คำปรึกษาประจำเดือน', 'Monthly Advising Calendar')}
          </span>
        </div>
      </div>

      {/* ── Mini Calendar ──────────────────────────────────────── */}
      <MiniCalendar
        appointmentDates={appointmentDates}
        selectedDate={calendarSelectedDate}
        onSelectDate={setCalendarSelectedDate}
      />

      {/* ── Section Divider 2: Requests & Appointments ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-start">
          <span className="bg-slate-50 dark:bg-[#0b0f19] pr-3 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileEdit className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            {t('รายการคำร้องและนัดหมายที่ต้องดำเนินการ', 'Pending Petitions & Action Items')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('คำร้องขอรับคำปรึกษาที่รอดำเนินการ', 'Pending Advising Requests')}
            </h3>
            {pendingRequests.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {pendingRequests.length > 0 ? (
            <div className="space-y-2">
              {pendingRequests.map(r => {
                const student = store.users.find(u => u.id === r.studentId)
                const catLabel = getCategoryLabel(r.category)
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl cursor-pointer hover:bg-sky-50/40 dark:hover:bg-slate-800/80 hover:border-sky-200/60 dark:hover:border-sky-500/30 transition-all duration-150"
                    onClick={() => navigate('/advisor/sessions')}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || r.studentId} <span className="font-mono text-slate-400 font-normal">({student?.code})</span></p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{catLabel} · <span className="text-slate-400 dark:text-slate-500">{t('วันที่สะดวก:', 'Pref:')} {r.preferredDate}</span></p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<FileEdit className="h-8 w-8 text-slate-400" />} title={t('ไม่มีคำร้องที่รอดำเนินการ', 'No pending requests')} description={t('คำร้องใหม่จากนักศึกษาจะแสดงที่นี่', 'New requests will appear here.')} />
          )}
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('นัดหมายที่กำลังจะมาถึง', 'Upcoming Appointments')}
            </h3>
            {upcomingApts.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {upcomingApts.length > 0 ? (
            <div className="space-y-2">
              {upcomingApts.map(a => {
                const student = store.users.find(u => u.id === a.studentId)
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || a.studentId} <span className="font-mono text-slate-400 font-normal">({student?.code})</span></p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-sky-600 dark:text-sky-400" /> {a.scheduledDate} {a.scheduledTime} · {a.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GoogleCalendarButton
                        event={{
                          title: `Advising Meeting: ${student?.name || a.studentId} & ${currentUser.name}`,
                          description: `Advising Appointment with ${student?.name || a.studentId} (${student?.code || ''})\nLocation: ${a.location}\nDate: ${a.scheduledDate} ${a.scheduledTime}`,
                          location: a.location,
                          date: a.scheduledDate,
                          time: a.scheduledTime,
                          attendeeEmails: [student?.email || '', currentUser.email],
                        }}
                        label={t('เพิ่มลงปฏิทิน', 'Calendar')}
                        size="sm"
                        variant="secondary"
                      />
                      <Button size="sm" onClick={() => navigate('/advisor/log')}>
                        {t('บันทึกผล', 'Record Log')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<CalendarClock className="h-8 w-8 text-slate-400" />} title={t('ไม่มีนัดหมายเร็วๆ นี้', 'No upcoming appointments')} description={t('นัดหมายที่กำหนดแล้วจะแสดงที่นี่', 'Scheduled sessions will appear here.')} />
          )}
        </Card>

        {/* Open Follow-ups */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('งานติดตามผลที่ค้างอยู่', 'Open Follow-up Tasks')}
            </h3>
            {myFollowUps.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {myFollowUps.length > 0 ? (
            <div className="space-y-2">
              {myFollowUps.map(f => {
                const student = store.users.find(u => u.id === f.studentId)
                return (
                  <div key={f.id} className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{f.task}</p>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('นักศึกษา:', 'Student:')} {student?.name || f.studentId} · <span className="font-semibold text-slate-600 dark:text-slate-300">{t('กำหนด:', 'Due:')} {f.dueDate}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<ListChecks className="h-8 w-8 text-slate-400" />} title={t('ไม่มีงานติดตามผลที่ค้างอยู่', 'No open follow-up tasks')} description={t('งานติดตามผลทั้งหมดเสร็จสมบูรณ์แล้ว', 'All tasks are completed.')} />
          )}
        </Card>

        {/* Recent Session Logs */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติการให้คำปรึกษาล่าสุด', 'Recent Session Logs')}
            </h3>
            {recentSessions.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.map(s => {
                const student = store.users.find(u => u.id === s.studentId)
                return (
                  <div key={s.id} className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || s.studentId}</p>
                      <span className="text-[11px] text-slate-400 font-medium">{s.sessionDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">{s.summary}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<Clock className="h-8 w-8 text-slate-400" />} title={t('ยังไม่มีบันทึกการให้คำปรึกษา', 'No session logs yet')} description={t('บันทึกการให้คำปรึกษาจะแสดงที่นี่', 'Session records will appear here.')} />
          )}
        </Card>
      </div>

      {/* Add Advisee Modal */}
      <Modal
        isOpen={showAddAdvisee}
        onClose={() => { setShowAddAdvisee(false); setSelectedStudentId(''); setStudentSearch('') }}
        title={t('เพิ่มนักศึกษาในความดูแล (Add Advisee)', 'Add Student to My Advisee Cohort')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ค้นหาและเลือกนักศึกษาเพื่อเพิ่มเข้าสู่รายชื่อในความดูแลของคุณ', 'Search and select a student to add them directly to your active advisee roster.')}
          </p>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('ค้นหาด้วยรหัสนักศึกษา หรือชื่อ-นามสกุล...', 'Search by student ID or name...')}
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Student Selection List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/50 dark:bg-slate-900/50">
            {filteredStudents.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-2.5">
                <p className="text-xs text-slate-400">{t('ไม่พบข้อมูลนักศึกษาในระบบ', 'No matching student found in master list')}</p>
                {studentSearch.trim() && (
                  <button
                    type="button"
                    onClick={handleRegisterAndAddAdvisee}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{t(`ลงทะเบียน & เพิ่ม "${studentSearch.trim()}" เข้าสู่ความดูแลทันที`, `Register & Add "${studentSearch.trim()}" as Advisee`)}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredStudents.map(student => {
                const isCurrentAdvisee = myAdvisees.some(r => r.studentId === student.id)
                const isSelected = selectedStudentId === student.id
                return (
                  <div
                    key={student.id}
                    onClick={() => !isCurrentAdvisee && setSelectedStudentId(student.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isCurrentAdvisee
                        ? 'opacity-60 bg-slate-100 dark:bg-slate-800/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-sky-100/80 dark:bg-sky-950/80 border border-sky-400 dark:border-sky-700 font-bold text-sky-900 dark:text-sky-200'
                        : 'hover:bg-white dark:hover:bg-slate-800 bg-white/60 dark:bg-slate-800/40 border border-transparent text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{student.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{student.code} · {student.email}</span>
                    </div>
                    {isCurrentAdvisee ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                        {t('อยู่ในความดูแลแล้ว', 'Already Advisee')}
                      </span>
                    ) : isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddAdvisee(false); setSelectedStudentId(''); setStudentSearch('') }}
            >
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!selectedStudentId}
              onClick={handleAddAdvisee}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t('ยืนยันเพิ่มนักศึกษา', 'Confirm Add Advisee')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
