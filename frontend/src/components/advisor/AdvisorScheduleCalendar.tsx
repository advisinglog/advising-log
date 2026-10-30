// ============================================================
// Advisor Schedule & Google Calendar Component
// ============================================================

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Video,
  Sparkles,
  ExternalLink,
  Globe,
} from 'lucide-react'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'
import { buildAdvisorCalendarUrl, openAdvisorCalendar } from '@/utils/calendarUtils'

export interface AdvisorScheduleCalendarProps {
  selectedDate: string // YYYY-MM-DD
  selectedTime?: string // HH:mm
  preferredDate?: string // Student's requested date
  preferredTime?: string // Student's requested time
  onSelectDate: (date: string) => void
  onSelectTime?: (time: string) => void
  studentName?: string
  studentCode?: string
  className?: string
  defaultTab?: 'system' | 'google'
}

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_NAMES_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdvisorScheduleCalendar({
  selectedDate,
  selectedTime,
  preferredDate,
  preferredTime,
  onSelectDate,
  onSelectTime,
  studentName: _studentName,
  studentCode: _studentCode,
  className = '',
  defaultTab = 'system',
}: AdvisorScheduleCalendarProps) {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t, language, getCategoryLabel } = useLanguage()

  // Active view tab: 'system' or 'google'
  const [activeTab, setActiveTab] = useState<'system' | 'google'>(defaultTab)
  const [googleCalendarMode, setGoogleCalendarMode] = useState<'WEEK' | 'MONTH'>('WEEK')

  // Initialize view date from selectedDate, preferredDate, or today
  const initialDate = useMemo(() => {
    const targetStr = selectedDate || preferredDate
    if (targetStr && targetStr.includes('-')) {
      const [y, m, d] = targetStr.split('-').map(Number)
      if (y && m) return new Date(y, m - 1, d || 1)
    }
    return new Date()
  }, [selectedDate, preferredDate])

  const [viewDate, setViewDate] = useState<Date>(initialDate)
  const todayStr = useMemo(() => getLocalDateString(new Date()), [])

  // Filter all active scheduled appointments for this advisor
  const advisorAppointments = useMemo(() => {
    return store.appointments.filter(
      a => (currentUser?.role === 'qa_chair' || isAdvisorMatch(a.advisorId, currentUser, store.users)) && a.status === 'scheduled'
    )
  }, [store.appointments, currentUser, store.users])

  // Month navigation for system view
  const prevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  const goToToday = () => {
    const now = new Date()
    setViewDate(now)
    onSelectDate(getLocalDateString(now))
  }
  const goToPreferred = () => {
    if (preferredDate) {
      const [y, m, d] = preferredDate.split('-').map(Number)
      if (y && m) setViewDate(new Date(y, m - 1, d || 1))
      onSelectDate(preferredDate)
      if (preferredTime && onSelectTime) onSelectTime(preferredTime)
    }
  }

  const currentYear = viewDate.getFullYear()
  const currentMonthIdx = viewDate.getMonth()
  const monthName = language === 'th' ? MONTH_NAMES_TH[currentMonthIdx] : MONTH_NAMES_EN[currentMonthIdx]
  const displayYear = language === 'th' ? currentYear + 543 : currentYear

  // Build Calendar Matrix
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonthIdx, 0).getDate()

    const cells: Array<{
      day: number
      dateStr: string
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
      isPreferred: boolean
      appointmentsCount: number
    }> = []

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevM = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1
      const prevY = currentMonthIdx === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPreferred: dateStr === preferredDate,
        appointmentsCount: advisorAppointments.filter(a => a.scheduledDate === dateStr).length,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPreferred: dateStr === preferredDate,
        appointmentsCount: advisorAppointments.filter(a => a.scheduledDate === dateStr).length,
      })
    }

    // Next month padding to fill grid
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonthIdx === 11 ? 0 : currentMonthIdx + 1
      const nextY = currentMonthIdx === 11 ? currentYear + 1 : currentYear
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        isPreferred: dateStr === preferredDate,
        appointmentsCount: advisorAppointments.filter(a => a.scheduledDate === dateStr).length,
      })
    }

    return cells
  }, [currentYear, currentMonthIdx, selectedDate, preferredDate, todayStr, advisorAppointments])

  // Appointments on selected date
  const selectedDateAppointments = useMemo(() => {
    const targetDate = selectedDate || todayStr
    return advisorAppointments
      .filter(a => a.scheduledDate === targetDate)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
  }, [advisorAppointments, selectedDate, todayStr])

  // Collision detection
  const collidedAppointment = useMemo(() => {
    if (!selectedTime) return null
    return selectedDateAppointments.find(a => a.scheduledTime.startsWith(selectedTime))
  }, [selectedDateAppointments, selectedTime])

  const advisorEmail = currentUser?.email || ''
  const googleCalendarEmbedUrl = useMemo(() => {
    return buildAdvisorCalendarUrl(advisorEmail, googleCalendarMode, selectedDate || preferredDate)
  }, [advisorEmail, googleCalendarMode, selectedDate, preferredDate])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Tab Bar: System Appointments vs Google Calendar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'system'
              ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span>{t('ตารางนัดหมาย & เวลาว่าง', 'Schedule & Appointments')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'google'
              ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600" />
            <span>Google Calendar</span>
          </button>
        </div>

        {/* View full Google Calendar */}
        <button
          type="button"
          onClick={() => openAdvisorCalendar(advisorEmail, selectedDate)}
          className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
        >
          <ExternalLink className="h-3 w-3" />
          <span className="hidden sm:inline">{t('เปิด Google Calendar', 'Open Calendar')}</span>
        </button>
      </div>

      {activeTab === 'system' ? (
        <div className="space-y-4">
          {/* Subheader Toolbar */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              {preferredDate && (
                <button
                  type="button"
                  onClick={goToPreferred}
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 transition-colors flex items-center gap-1 cursor-pointer"
                  title={t('ไปยังวันที่นักศึกษาขอเข้าพบ', 'Jump to requested date')}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{t('วันที่ นศ. ขอ', 'Req Date')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={goToToday}
                className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {t('วันนี้', 'Today')}
              </button>
            </div>

            {/* Month & Year Navigation */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-28 text-center">
                {monthName} {displayYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Calendar Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1">
            {(language === 'th' ? DAY_NAMES_TH : DAY_NAMES_EN).map((dayName, idx) => (
              <div key={dayName} className={idx === 0 || idx === 6 ? 'text-rose-500' : ''}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Matrix Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const hasAppointments = cell.appointmentsCount > 0
              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-11 sm:min-h-12 p-1 rounded-xl text-left transition-all border flex flex-col justify-between cursor-pointer ${cell.isSelected
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs font-bold'
                    : cell.isPreferred
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-400'
                      : cell.isCurrentMonth
                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-600'
                        : 'bg-slate-50/60 dark:bg-slate-900/30 border-transparent text-slate-400 dark:text-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-semibold ${cell.isSelected
                        ? 'text-white'
                        : cell.isToday
                          ? 'text-sky-600 dark:text-sky-400 font-bold'
                          : cell.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                    >
                      {cell.day}
                    </span>
                    {cell.isToday && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-sky-600 dark:bg-sky-400'
                          }`}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1 w-full truncate">
                    {hasAppointments ? (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold truncate ${cell.isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60'
                          }`}
                      >
                        {cell.appointmentsCount} {t('นัด', 'apt')}
                      </span>
                    ) : cell.isPreferred && !cell.isSelected ? (
                      <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                        {t('ขอเข้าพบ', 'Req')}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Schedule Detail for Selected Date */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>
                  {t('ตารางนัดหมายของท่านประจำวันที่', 'Advisor Appointments for')}{' '}
                  <span className="text-sky-600 dark:text-sky-400 font-mono">{selectedDate || todayStr}</span>
                </span>
              </h4>
              <span className="text-[10px] font-semibold text-slate-500">
                {selectedDateAppointments.length} {t('รายการ', 'scheduled')}
              </span>
            </div>

            {selectedDateAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedDateAppointments.map(apt => {
                  const student = store.users.find(u => u.id === apt.studentId)
                  const req = store.requests.find(r => r.id === apt.requestId)
                  return (
                    <div
                      key={apt.id}
                      className="p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="font-mono text-sky-700 dark:text-sky-300">{apt.scheduledTime}</span>
                          <span>·</span>
                          <span className="truncate">{student?.name || apt.studentId}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                          {req?.category && <span>{getCategoryLabel(req.category)}</span>}
                          {apt.location && (
                            <span className="flex items-center gap-1 truncate">
                              {apt.location.toLowerCase().includes('meet') || apt.location.toLowerCase().includes('http') ? (
                                <Video className="h-3 w-3 text-indigo-500 shrink-0" />
                              ) : (
                                <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{apt.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                        {t('มีนัดหมายแล้ว', 'Booked')}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 rounded-xl text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold">{t('ไม่มีนัดหมายในระบบ (ตารางว่างทั้งวัน)', 'No appointments scheduled today')}</p>
                </div>
              </div>
            )}

            {collidedAppointment && (
              <div className="p-3 rounded-xl text-xs flex items-start gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('ช่วงเวลานี้มีนัดหมายอื่นแล้ว', 'Time Slot Collision Warning')}</p>
                  <p className="text-[11px] mt-0.5">
                    {t(
                      `ท่านมีนัดกับนักศึกษาอื่น (${store.users.find(u => u.id === collidedAppointment.studentId)?.name || collidedAppointment.studentId}) ในเวลานี้แล้ว กรุณาเลือกช่วงเวลาอื่น`,
                      `You already have an appointment with another student (${store.users.find(u => u.id === collidedAppointment.studentId)?.name || collidedAppointment.studentId}) at this slot. Please choose another slot.`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Google Calendar Embed */
        <div className="space-y-3.5">
          <div className="p-3 bg-sky-50/80 dark:bg-sky-950/50 rounded-xl border border-sky-100 dark:border-sky-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {advisorEmail ? `${t('บัญชี Google:', 'Google Account:')} ${advisorEmail}` : t('Google Calendar ของอาจารย์', 'Advisor Google Calendar')}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {t('ตรวจสอบตารางสอน ประชุมคณะ และเวลาว่างของอาจารย์', 'Review teaching classes, faculty meetings, and availability.')}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setGoogleCalendarMode('WEEK')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer text-[11px] ${googleCalendarMode === 'WEEK' ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}
                >
                  {t('สัปดาห์', 'Week')}
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleCalendarMode('MONTH')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer text-[11px] ${googleCalendarMode === 'MONTH' ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}
                >
                  {t('เดือน', 'Month')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => openAdvisorCalendar(advisorEmail, selectedDate)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{t('เปิดเต็มจอ', 'Open Tab')}</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner">
            <iframe
              src={googleCalendarEmbedUrl}
              style={{ border: 0 }}
              width="100%"
              height="380"
              frameBorder="0"
              scrolling="no"
              className="w-full bg-white dark:bg-slate-900"
              title="Advisor Google Calendar"
            />
          </div>

        </div>
      )}
    </div>
  )
}
