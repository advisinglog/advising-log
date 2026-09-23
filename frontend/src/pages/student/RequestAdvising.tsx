// ============================================================
// Student — Request Advising Form
// ============================================================

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Button, Card, Modal } from '@/components/ui'
import { ADVISING_CATEGORIES, EXIT_REASON_CODES } from '@/types'
import type { AdvisingCategory, ExitType, ExitReasonCode } from '@/types'
import {
  Paperclip,
  User,
  ShieldCheck,
  MessageSquareHeart,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react'
import { buildAdvisorCalendarUrl, openAdvisorCalendar } from '@/utils/calendarUtils'

export default function RequestAdvising() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel, getExitReasonLabel } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialCategory = (searchParams.get('category') as AdvisingCategory) || ''
  const initialType = (searchParams.get('type') as ExitType) || 'withdrawal'

  const [category, setCategory] = useState<AdvisingCategory | ''>(initialCategory)
  const [subCategory, setSubCategory] = useState('')
  const [exitType, setExitType] = useState<ExitType>(initialType)
  const [exitReasonCode, setExitReasonCode] = useState<ExitReasonCode>('academic')
  const [details, setDetails] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [pdpaConsent, setPdpaConsent] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarTab, setCalendarTab] = useState<'google' | 'system'>('google')
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('')
  const [showAdvisorDropdown, setShowAdvisorDropdown] = useState(false)

  if (!currentUser) return null

  // Find active roster assignment for the current student (matching ID, code, or email, sorted by newest assignment)
  const matchingAssignments = store.roster
    .filter(
      r =>
        r.isActive &&
        (r.studentId === currentUser?.id ||
         (currentUser?.code && r.studentId?.toUpperCase() === currentUser.code.toUpperCase()) ||
         (currentUser?.email && r.studentId?.toLowerCase() === currentUser.email.toLowerCase()))
    )
    .sort((a, b) => (b.assignedAt || '').localeCompare(a.assignedAt || ''))

  const rosterEntry = matchingAssignments[0] || null
  const assignedAdvisor = rosterEntry
    ? store.users.find(
        u =>
          u.id === rosterEntry.advisorId ||
          (u.code && rosterEntry.advisorId && u.code.toUpperCase() === rosterEntry.advisorId.toUpperCase()) ||
          (u.email && rosterEntry.advisorId && u.email.toLowerCase() === rosterEntry.advisorId.toLowerCase())
      )
    : null

  // All active faculty advisors in system (strictly role advisor)
  const availableAdvisors = store.users.filter(
    u => u.role === 'advisor' && u.isActive
  )

  // Current selected advisor: if student selected one, use it; otherwise default to assignedAdvisor; if neither, first available
  const advisor = (selectedAdvisorId ? store.users.find(u => u.id === selectedAdvisorId) : null) || assignedAdvisor || availableAdvisors[0] || null
  const isAssignedAdvisor = !assignedAdvisor || advisor?.id === assignedAdvisor?.id

  // Advisor's existing scheduled appointments in system to detect collisions
  const advisorAppointments = store.appointments
    .filter(a => a.advisorId === advisor?.id && a.status === 'scheduled')
    .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))

  // Appointments specifically on the user's selected preferredDate
  const sameDateAppointments = preferredDate
    ? advisorAppointments.filter(a => a.scheduledDate === preferredDate)
    : []

  const selectedCategoryConfig = store.categoryConfigs.find(c => c.value === category)
  const subCategories = selectedCategoryConfig?.subCategories || []

  // Check if student completed Student Voice on the dedicated /student/voice page
  // Supports both identified responses and anonymous submissions tracked via completedVoiceStudents
  const hasVoiceResponse =
    store.studentVoiceResponses.some(
      v => v.studentId === currentUser.id || v.studentCode === currentUser.code
    ) ||
    store.completedVoiceStudents.includes(currentUser.id) ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true' ||
      localStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true'
    ))

  function handleFileSimulate() {
    const fakeFiles = ['study_plan.pdf', 'grade_transcript.pdf', 'petition_form.pdf']
    const random = fakeFiles[Math.floor(Math.random() * fakeFiles.length)]
    setAttachments(prev => [...prev, random])
    addToast('info', t('แนบไฟล์แล้ว', 'File attached'), `${random}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!category || !details || !preferredDate || !preferredTime || !pdpaConsent) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและยินยอม PDPA', 'Please fill in all required fields and give consent.'))
      return
    }

    if (!advisor) {
      addToast('error', t('ไม่พบอาจารย์ที่ปรึกษา', 'No Advisor'), t('คุณยังไม่มีอาจารย์ที่ปรึกษาในระบบ กรุณาติดต่อสำนักวิชา', 'You do not have an assigned advisor. Please contact admin.'))
      return
    }

    // Gate: withdrawal_leave strictly requires completing Student Voice at /student/voice first
    if (category === 'withdrawal_leave' && !hasVoiceResponse) {
      addToast(
        'warning',
        t('กรุณาทำแบบสำรวจก่อนส่งคำร้อง', 'Survey Required'),
        t('กำลังนำท่านไปยังหน้าแบบสำรวจเสียงของนักศึกษา (Student Voice)', 'Redirecting to Student Voice survey...')
      )
      navigate('/student/voice?return=/student/request?category=withdrawal_leave')
      return
    }

    const studentUser = store.users.find(
      u => u.id === currentUser?.id ||
           (currentUser?.code && u.code?.toUpperCase() === currentUser.code.toUpperCase()) ||
           (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
    )
    const effectiveStudentId = studentUser?.id || currentUser!.id

    // 1. Create AdvisingRequest
    const newRequest = store.addRequest({
      studentId: effectiveStudentId,
      advisorId: advisor.id,
      category: category as AdvisingCategory,
      subCategory: category === 'withdrawal_leave' ? exitType : (subCategory || undefined),
      details,
      preferredDate,
      preferredTime,
      attachments,
      pdpaConsent,
      status: 'requested',
    })

    // 2. If withdrawal/leave/transfer, also record ExitCase
    if (category === 'withdrawal_leave') {
      const newExitCase = store.addExitCase({
        studentId: currentUser!.id,
        advisorId: advisor.id,
        exitType,
        reasonCode: exitReasonCode,
        details,
        dataAnalysisConsent: true,
        preferredEffectiveDate: preferredDate,
        status: 'open',
      })

      store.addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        userRole: 'student',
        action: 'exit_case_created',
        description: `Created exit case (${exitType}) via advising request`,
        targetId: newExitCase.id,
      })
    }

    const exitTypeLabel = exitType === 'withdrawal'
      ? t('ขอลาออก', 'Withdrawal')
      : exitType === 'leave_of_absence'
      ? t('ลาพักการศึกษา', 'Leave of Absence')
      : t('ย้ายสาขาวิชา', 'Transfer')

    store.addNotification({
      userId: advisor.id,
      type: 'action_required',
      title: category === 'withdrawal_leave'
        ? t(`คำร้องขอนัดพบ: ${exitTypeLabel}`, `Meeting Request: ${exitTypeLabel}`)
        : t('คำร้องขอรับคำปรึกษาใหม่', 'New Advising Request'),
      message: `${currentUser!.name} (${currentUser!.code}) ${t('ยื่นคำร้อง:', 'submitted a request:')} ${category === 'withdrawal_leave' ? exitTypeLabel : getCategoryLabel(category)}`,
      relatedId: newRequest.id,
      isRead: false,
    })

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'student',
      action: 'request_created',
      description: `Created advising request for ${getCategoryLabel(category)}`,
      targetId: newRequest.id,
    })

    addToast('success', t('ยื่นคำร้องสำเร็จ', 'Request Submitted'), isAssignedAdvisor ? t('คำร้องของคุณถูกส่งไปยังอาจารย์ที่ปรึกษาเรียบร้อยแล้ว', 'Your advising request has been sent to your advisor.') : t(`คำร้องของคุณถูกส่งไปยัง ${advisor.name} เรียบร้อยแล้ว`, `Your advising request has been sent to ${advisor.name}.`))
    navigate('/student/history')
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <PageHeader
        title={t('ยื่นคำร้องขอรับคำปรึกษา', 'Request Advising Session')}
        description={t('กรอกรายละเอียดเพื่อนัดหมายเข้าพบอาจารย์ที่ปรึกษาทางวิชาการ', 'Schedule a meeting with your academic advisor. Fill in the required details below.')}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Advisor Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
          {/* Section Label & Advisor Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="advisor-select" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('อาจารย์ผู้รับคำร้อง / นัดหมายเข้าพบ', 'Select Advising Faculty / Advisor')} <span className="text-rose-500">*</span>
            </label>
            {isAssignedAdvisor && assignedAdvisor && (
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-800">
                {t('อาจารย์ที่ปรึกษาประจำตัว (ค่าเริ่มต้น)', 'Assigned Advisor (Default)')}
              </span>
            )}
            {!isAssignedAdvisor && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-800">
                {t('อาจารย์ท่านอื่นในสาขา', 'Other Faculty Member')}
              </span>
            )}
          </div>

          {/* Unified Controls Row: Dropdown + Balanced Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            {/* Custom Web Dropdown Trigger */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setShowAdvisorDropdown(!showAdvisorDropdown)}
                className="w-full h-full min-h-[50px] flex items-center justify-between px-3.5 py-2 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 bg-slate-50/70 dark:bg-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors shadow-2xs text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                      {advisor?.name || t('เลือกอาจารย์...', 'Select Faculty...')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      {advisor?.department || 'School of Applied Digital Technology (ADT)'}
                    </span>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${showAdvisorDropdown ? 'rotate-180 text-sky-500' : ''}`} />
              </button>

              {/* Custom Web Dropdown Menu */}
              {showAdvisorDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAdvisorDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto animate-[slideIn_0.12s_ease-out]">
                    {assignedAdvisor && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdvisorId(assignedAdvisor.id)
                          setShowAdvisorDropdown(false)
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          advisor?.id === assignedAdvisor.id
                            ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold flex items-center gap-1.5">
                            <span>{assignedAdvisor.name}</span>
                            <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/80 dark:border-emerald-800">
                              {t('ที่ปรึกษาประจำตัว', 'Assigned')}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {assignedAdvisor.department || 'School of Applied Digital Technology (ADT)'}
                            {assignedAdvisor.code ? ` · ${assignedAdvisor.code}` : ''}
                          </p>
                        </div>
                        {advisor?.id === assignedAdvisor.id && (
                          <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                        )}
                      </button>
                    )}

                    <div className="py-0.5">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                        {t('อาจารย์ท่านอื่นในสาขา / สำนักวิชา', 'Other Faculty in Department')}
                      </div>
                      {availableAdvisors
                        .filter(u => u.id !== assignedAdvisor?.id)
                        .map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedAdvisorId(u.id)
                              setShowAdvisorDropdown(false)
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                              advisor?.id === u.id
                                ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {u.department || 'School of Applied Digital Technology (ADT)'}
                                {u.code ? ` · ${u.code}` : ''}
                              </p>
                            </div>
                            {advisor?.id === u.id && (
                              <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {/* Hidden native select for form automation */}
              <select
                id="advisor-select"
                aria-hidden="true"
                tabIndex={-1}
                aria-label={t('อาจารย์ผู้รับคำร้อง / นัดหมายเข้าพบ', 'Select Advising Faculty / Advisor')}
                value={advisor?.id || ''}
                onChange={e => setSelectedAdvisorId(e.target.value)}
                className="sr-only"
              >
                {assignedAdvisor && (
                  <option value={assignedAdvisor.id}>
                    {assignedAdvisor.name}
                  </option>
                )}
                {availableAdvisors
                  .filter(u => u.id !== assignedAdvisor?.id)
                  .map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Calendar Availability Modal Button */}
            {advisor?.email && (
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl border border-sky-200/90 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-300 text-xs sm:text-sm font-semibold transition-all shadow-2xs whitespace-nowrap cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 active:scale-[0.98] flex-shrink-0"
              >
                <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{t('ดูตารางเวลาว่างอาจารย์', 'View Advisor Calendar')}</span>
              </button>
            )}
          </div>

          {!isAssignedAdvisor && advisor && (
            <p className="text-xs text-amber-700 dark:text-amber-300 pt-0.5 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {t(
                  `หมายเหตุ: การนัดหมายอาจารย์ท่านอื่น — ระบบจะแสดงตารางเวลาว่างและส่งคำร้องไปยัง ${advisor.name} โดยตรง`,
                  `Note: Scheduling with another faculty member — request will be routed directly to ${advisor.name}.`
                )}
              </span>
            </p>
          )}
        </div>

        <Card className="space-y-5">
          {/* Category */}
          <div>
            <label htmlFor="category-select" className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t('หมวดหมู่คำปรึกษา', 'Advising Category')} <span className="text-rose-500">*</span>
            </label>
            <select
              id="category-select"
              value={category}
              onChange={e => {
                setCategory(e.target.value as AdvisingCategory)
                setSubCategory('')
              }}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs cursor-pointer font-medium"
            >
              <option value="">{t('-- กรุณาเลือกหมวดหมู่ --', 'Select a category')}</option>
              {ADVISING_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{getCategoryLabel(c.value)}</option>
              ))}
            </select>
          </div>

          {/* When category is withdrawal_leave */}
          {category === 'withdrawal_leave' && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('ประเภทคำร้อง', 'Request Type')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'withdrawal', label: t('ขอลาออก', 'Withdrawal') },
                    { value: 'leave_of_absence', label: t('ลาพักการศึกษา', 'Leave of Absence') },
                    { value: 'transfer', label: t('ย้ายสาขาวิชา', 'Transfer') },
                  ].map(item => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setExitType(item.value as ExitType)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-colors cursor-pointer ${
                        exitType === item.value
                          ? 'border-sky-600 bg-sky-50/80 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('สาเหตุหลัก', 'Primary Reason')} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exitReasonCode}
                  onChange={e => setExitReasonCode(e.target.value as ExitReasonCode)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs cursor-pointer"
                >
                  {EXIT_REASON_CODES.map(r => (
                    <option key={r.value} value={r.value}>{getExitReasonLabel(r.value)}</option>
                  ))}
                </select>
              </div>

              {/* Student Voice Survey Link & Status */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                    <MessageSquareHeart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {t('แบบสำรวจเสียงของนักศึกษา (Student Voice)', 'Student Voice Survey')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {hasVoiceResponse
                        ? t('บันทึกข้อมูลเสียงของนักศึกษาเรียบร้อยแล้ว', 'Survey response recorded')
                        : t('จำเป็นต้องทำแบบสำรวจก่อนส่งคำร้องในหมวดนี้', 'Survey required before submitting this category')}
                    </p>
                  </div>
                </div>

                {hasVoiceResponse ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('ทำแบบสำรวจเรียบร้อยแล้ว', 'Survey Completed')}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/student/voice?return=/student/request?category=withdrawal_leave')}
                    className="text-xs whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    {t('ไปทำแบบสำรวจ Student Voice', 'Go to Student Voice Survey')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Sub-category for regular categories */}
          {category !== 'withdrawal_leave' && subCategories.length > 0 && (
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('หัวข้อย่อย', 'Sub-category')} <span className="text-slate-400 font-normal">({t('ไม่บังคับ', 'Optional')})</span>
              </label>
              <select
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs cursor-pointer"
              >
                <option value="">{t('-- เลือกหัวข้อย่อย --', 'Select specific topic')}</option>
                {subCategories.map(sc => (
                  <option key={sc} value={sc}>{sc}</option>
                ))}
              </select>
            </div>
          )}

          {/* Details */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t('รายละเอียดที่ต้องการปรึกษา', 'Details')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={4}
              placeholder={t('ระบุคำถาม ปัญหาที่พบ หรือประเด็นที่ต้องการปรึกษาอาจารย์...', 'Describe your questions, topics to discuss, or issues you are experiencing...')}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs resize-none leading-relaxed"
            />
          </div>

          {/* Date and Time Inputs */}
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                {t('วันและเวลาที่ประสงค์ขอเข้าพบ', 'Requested Date & Time')} <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t(
                  'ระบุวันและเวลาที่สะดวกเข้าพบ (สามารถกดปุ่มดูตารางเวลาว่างอาจารย์ได้ที่ด้านบน)',
                  'Propose a suitable date and time (you can view the advisor\'s calendar schedule using the button above).'
                )}
              </p>
            </div>

            {/* Date and Time Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('วันที่ต้องการเข้าพบ', 'Meeting Date')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('เวลาที่ต้องการเข้าพบ', 'Meeting Time')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={e => setPreferredTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
                />
              </div>
            </div>

            {/* Live Collision Feedback for Selected Date */}
            {preferredDate && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                  sameDateAppointments.length > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {sameDateAppointments.length > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">
                        {t(
                          `วันที่ ${preferredDate} อาจารย์มีนัดหมายในระบบแล้ว ${sameDateAppointments.length} รายการ:`,
                          `Selected date (${preferredDate}) has ${sameDateAppointments.length} existing booking(s):`
                        )}
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        {t('ช่วงเวลาที่ติดนัดหมาย:', 'Busy slots:')}{' '}
                        <span className="font-semibold">{sameDateAppointments.map(a => a.scheduledTime).join(', ')}</span>{' '}
                        — {t('แนะนำให้เลือกช่วงเวลาอื่นเพื่อหลีกเลี่ยงการนัดชนกัน', 'Please pick an open hour to avoid collision.')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="font-semibold">
                      {t(`วันที่ ${preferredDate} ยังไม่มีคิวนัดหมายในระบบ AdvisingLog (สามารถระบุเวลาที่สะดวกได้)`, `No existing AdvisingLog appointments on ${preferredDate}. You may propose an open hour.`)}
                    </p>
                  </>
                )}
              </div>
            )}


          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t('เอกสารประกอบ (ถ้ามี)', 'Supporting Documents')}
            </label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {attachments.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 rounded-lg text-xs font-medium text-sky-800 dark:text-sky-300">
                  <Paperclip className="h-3 w-3" />
                  {f}
                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-sky-400 hover:text-sky-700 dark:hover:text-sky-200 ml-0.5 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handleFileSimulate}>
              <Paperclip className="h-3.5 w-3.5 mr-1" /> {t('แนบไฟล์เอกสาร', 'Attach File')}
            </Button>
          </div>

          {/* PDPA Consent */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pdpaConsent}
                onChange={e => setPdpaConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-sky-600 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500/30 accent-sky-600"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 inline" /> {t('ความยินยอมข้อมูลส่วนบุคคล (PDPA Consent)', 'PDPA / Privacy & Advising Consent')} <span className="text-rose-500">*</span>
                </span>
                {t(
                  'ข้าพเจ้ายินยอมให้อาจารย์ที่ปรึกษาและมหาวิทยาลัยเก็บรวบรวมและใช้ข้อมูลทางการศึกษาเพื่อประโยชน์ในการให้คำปรึกษาทางวิชาการตามนโยบายคุ้มครองข้อมูลส่วนบุคคล',
                  'I consent to the collection and processing of my academic and personal information by assigned university advisors in accordance with the institution\'s privacy policy.'
                )}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate(-1)} type="button">
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={category === 'withdrawal_leave' && !hasVoiceResponse}
            >
              {t('ยืนยันส่งคำร้อง', 'Submit Request')}
            </Button>
          </div>
        </Card>
      </form>

      {/* Advisor Calendar Viewer Modal */}
      {advisor?.email && (
        <Modal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          title={t('ตารางเวลาของอาจารย์ที่ปรึกษา', "Advisor's Calendar Schedule")}
          size="xl"
        >
          <div className="space-y-3.5">
            {/* Advisor Summary Bar inside Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{advisor.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px] truncate">{advisor.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openAdvisorCalendar(advisor.email)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                title={t('เปิดดูในแท็บใหม่', 'Open in new tab')}
              >
                <span>{t('เปิดแท็บใหม่', 'Open in New Tab')}</span>
                <ExternalLink className="h-3.5 w-3.5 text-sky-500" />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={() => setCalendarTab('google')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    calendarTab === 'google'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  📅 {t('Google Calendar ของอาจารย์', "Advisor's Google Calendar")}
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarTab('system')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    calendarTab === 'system'
                      ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  📋 {t('คิวนัดหมายในระบบ AdvisingLog', 'AdvisingLog Queue')} ({advisorAppointments.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                {calendarTab === 'google' ? t('แสดงตารางปฏิทินแบบสัปดาห์', 'Weekly view') : t('แสดงเฉพาะคิวที่อนุมัติแล้ว', 'Confirmed slots')}
              </span>
            </div>

            {/* Tab 1: Embedded Google Calendar */}
            {calendarTab === 'google' && (
              <div className="w-full h-[460px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 shadow-inner relative">
                <iframe
                  src={buildAdvisorCalendarUrl(advisor.email)}
                  title={`${advisor.name} Google Calendar`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            )}

            {/* Tab 2: System Bookings */}
            {calendarTab === 'system' && (
              <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 max-h-[460px] overflow-y-auto space-y-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t('รายการนัดหมายที่ได้รับการอนุมัติแล้วของอาจารย์ท่านนี้ในระบบ AdvisingLog:', 'Approved advising appointments for this advisor in AdvisingLog:')}
                </p>
                {advisorAppointments.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {advisorAppointments.map(a => (
                      <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{a.scheduledDate}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" /> {a.scheduledTime}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 text-[11px]">{a.location}</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                          {t('มีนัดหมายแล้ว', 'Booked')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-8 text-center">
                    {t('ยังไม่มีคิวนัดหมายที่ปรึกษาในระบบช่วงนี้ สามารถเลือกเวลาที่สะดวกได้', 'No existing advising bookings found in this period. Feel free to propose an open slot.')}
                  </p>
                )}
              </div>
            )}

            {/* Modal Bottom Guidance & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                💡 {t('ตรวจสอบช่วงเวลาว่าง แล้วระบุวันและเวลาที่ต้องการในแบบฟอร์ม', 'Check available slots, then pick your preferred date & time in the form.')}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCalendarModal(false)}
                className="self-end sm:self-auto"
              >
                {t('ปิด', 'Close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
