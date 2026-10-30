// ============================================================
// Advisor Schedule & Google Calendar Component
// Interactive calendar showing the advisor's availability,
// existing appointments, student requested slots, and
// direct Google Calendar integration to check free/busy schedule.
// ============================================================

import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
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
  Layers,
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
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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
  studentName,
  studentCode,
  className = '',
  defaultTab = 'system',
}: AdvisorScheduleCalendarProps) {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t, language, getCategoryLabel } = useLanguage()

  // Active view tab: 'system' (Advising appointments & slots) or 'google' (Google Calendar embed & availability check)
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
      a => isAdvisorMatch(a.advisorId, currentUser, store.users) && a.status === 'scheduled'
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

    // Next month padding to fill a complete 35 or 42 grid
    const totalCurrent = cells.length
    const totalTarget = totalCurrent > 35 ? 42 : 35
    for (let d = 1; d <= totalTarget - totalCurrent; d++) {
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
  }, [currentYear, currentMonthIdx, todayStr, selectedDate, preferredDate, advisorAppointments])

  // Appointments on the currently selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return []
    return advisorAppointments
      .filter(a => a.scheduledDate === selectedDate)
      .sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))
  }, [advisorAppointments, selectedDate])

  // Check if current slot is collided
  const collidedAppointment = useMemo(() => {
    if (!selectedDate || !selectedTime) return null
    return advisorAppointments.find(
      a => a.scheduledDate === selectedDate &&
           a.scheduledTime.startsWith(selectedTime)
    )
  }, [advisorAppointments, selectedDate, selectedTime])

  const advisorEmail = currentUser?.email || ''
  const googleCalendarEmbedUrl = buildAdvisorCalendarUrl(advisorEmail, googleCalendarMode, selectedDate)

  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] p-4 shadow-sm space-y-4 ${className}`}>
      {/* Top Header with Tab Switcher: System Schedule vs Google Calendar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            {activeTab === 'google' ? <Globe className="h-4 w-4 text-sky-600 dark:text-sky-400" /> : <Calendar className="h-4 w-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {activeTab === 'google' ? (
                <span>{t('Google Calendar ของอาจารย์', 'Advisor Google Calendar')}</span>
              ) : (
                <span>{monthName} {displayYear}</span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {activeTab === 'google'
                ? (advisorEmail || t('ตรวจสอบตารางว่างและภารกิจภายนอก', 'Check external calendar & free/busy slots'))
                : t('ปฏิทินตารางเวลาของอาจารย์', 'Advisor Schedule & Availability')}
            </p>
          </div>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'system'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-sky-600" />
            <span>{t('ตารางนัดหมาย & เวลาว่าง', 'Schedule & Slots')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'google'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span>{t('Google Calendar', 'Google Calendar')}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: SYSTEM ADVISING SCHEDULE & SLOT AVAILABILITY          */}
      {/* ============================================================ */}
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

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous Month"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next Month"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => openAdvisorCalendar(advisorEmail, selectedDate)}
                className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-800 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2 py-1 rounded-lg border border-sky-200/60 dark:border-sky-800/60 transition-colors flex items-center gap-1 cursor-pointer ml-1"
                title={t('เปิด Google Calendar ในแท็บใหม่', 'Open Google Calendar in new tab')}
              >
                <ExternalLink className="h-3 w-3 text-sky-600" />
                <span className="hidden sm:inline">{t('เปิด Google Calendar', 'Google Calendar')}</span>
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {(language === 'th' ? DAY_NAMES_TH : DAY_NAMES_EN).map((day, idx) => (
              <div
                key={day}
                className={`text-[10px] font-bold py-1 ${
                  idx === 0 || idx === 6
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map(cell => {
              const hasApts = cell.appointmentsCount > 0
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-[44px] sm:min-h-[48px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer relative text-left ${
                    cell.isSelected
                      ? 'bg-sky-600 text-white font-bold ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-[#0e1424] shadow-sm'
                      : cell.isPreferred
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/70 hover:bg-emerald-100'
                      : cell.isCurrentMonth
                      ? 'bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/60 text-slate-800 dark:text-slate-200'
                      : 'bg-transparent text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[11px] leading-none">
                    <span className={`font-semibold ${cell.isToday && !cell.isSelected ? 'h-4 w-4 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 flex items-center justify-center font-bold text-[10px]' : ''}`}>
                      {cell.day}
                    </span>

                    {cell.isPreferred && !cell.isSelected && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">★</span>
                    )}
                  </div>

                  {/* Status indicator on date cell */}
                  <div className="w-full mt-1 flex items-center justify-center">
                    {hasApts ? (
                      <span
                        className={`inline-flex items-center justify-center text-[9px] px-1 rounded font-bold leading-tight ${
                          cell.isSelected
                            ? 'bg-white/25 text-white'
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

          {/* Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-600" />
                <span>{t('วันที่เลือก', 'Selected')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t('วันที่ นศ. ขอ', 'Student requested')}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>{t('มีนัดหมายแล้ว', 'Has appointments')}</span>
              </span>
            </div>
            {preferredDate && (
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {studentName && <span className="text-slate-500 mr-1">({studentName}{studentCode ? ` ${studentCode}` : ''}):</span>}
                {t('นศ. ขอวันที่:', 'Requested:')} <strong>{preferredDate} {preferredTime ? `· ${preferredTime}` : ''}</strong>
              </span>
            )}
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

            {/* Existing appointments on this date */}
            {selectedDateAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedDateAppointments.map(apt => {
                  const student = store.users.find(u => u.id === apt.studentId)
                  const req = store.requests.find(r => r.id === apt.requestId)
                  const isCollidedWithSelectedTime = selectedTime && apt.scheduledTime.startsWith(selectedTime)
                  return (
                    <div
                      key={apt.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                        isCollidedWithSelectedTime
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="font-mono text-sky-700 dark:text-sky-300">{apt.scheduledTime}</span>
                          <span>·</span>
                          <span className="truncate">{student?.name || apt.studentId}</span>
                          {student?.code && (
                            <span className="font-mono text-slate-400 font-normal text-[11px]">
                              ({student.code})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                          {req?.category && <span>{getCategoryLabel(req.category)}</span>}
                          {apt.location && (
                            <span className="flex items-center gap-1">
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

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0 border border-rose-200/60 dark:border-rose-800/60">
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
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    {t('ท่านสามารถตอบรับและระบุเวลาที่สะดวกได้ทันที หรือคลิกดู Google Calendar ด้านล่างเพื่อเช็คภารกิจอื่น', 'Free in AdvisingLog. Feel free to choose any slot or check Google Calendar below.')}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Link Banner to Switch to Google Calendar */}
            <div className="p-2.5 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 truncate">
                  {t('ต้องการเช็คตารางสอนหรือภารกิจอื่นใน Google Calendar หรือไม่?', 'Cross-check classes & external events in Google Calendar?')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('google')}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:underline shrink-0 cursor-pointer"
              >
                {t('ดู Google Calendar', 'View Google Calendar')} →
              </button>
            </div>

            {/* Real-time Collision Warning if chosen slot is already booked */}
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
        /* ============================================================ */
        /* TAB 2: GOOGLE CALENDAR EMBED & AVAILABILITY CHECK            */
        /* ============================================================ */
        <div className="space-y-3.5">
          {/* Google Calendar Controls Bar */}
          <div className="p-3 bg-sky-50/80 dark:bg-sky-950/50 rounded-xl border border-sky-100 dark:border-sky-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {advisorEmail ? `${t('บัญชี Google:', 'Google Account:')} ${advisorEmail}` : t('Google Calendar ของอาจารย์', 'Advisor Google Calendar')}
                </span>
                <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                  {t('เชื่อมต่อแล้ว', 'Connected')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {t(
                  'ตรวจสอบตารางสอน ประชุมคณะ และเวลาว่างของอาจารย์ เพื่อเลือกเวลาที่สะดวกให้นักศึกษา',
                  'Review teaching classes, faculty meetings, and availability to select a conflict-free slot.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setGoogleCalendarMode('WEEK')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer text-[11px] ${
                    googleCalendarMode === 'WEEK'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t('สัปดาห์', 'Week')}
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleCalendarMode('MONTH')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer text-[11px] ${
                    googleCalendarMode === 'MONTH'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {t('เดือน', 'Month')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => openAdvisorCalendar(advisorEmail, selectedDate)}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title={t('เปิด Google Calendar ในแท็บใหม่เต็มจอ', 'Open Google Calendar in full tab')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{t('เปิดเต็มจอ (แท็บใหม่)', 'Open Full Tab')}</span>
              </button>
            </div>
          </div>

          {/* Embedded Google Calendar iframe */}
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
            {/* Fallback & New Tab Quick Action Overlay Footer */}
            <div className="p-2 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                {t('หากปฏิทินไม่แสดงผลเนื่องจากการตั้งค่าเบราว์เซอร์', 'If calendar does not load due to browser settings:')}
              </span>
              <button
                type="button"
                onClick={() => openAdvisorCalendar(advisorEmail, selectedDate)}
                className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
                <span>{t('คลิกเพื่อเปิด Google Calendar โดยตรง', 'Click to open Google Calendar directly')}</span>
              </button>
            </div>
          </div>

          {/* Collision Alert if slot is occupied */}
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
      )}
    </div>
  )
}
