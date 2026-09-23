// ============================================================
// Student — Request Advising Form
// ============================================================

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Button, Card } from '@/components/ui'
import { ADVISING_CATEGORIES, EXIT_REASON_CODES } from '@/types'
import type { AdvisingCategory, ExitType, ExitReasonCode } from '@/types'
import {
  Paperclip,
  User,
  ShieldCheck,
  MessageSquareHeart,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'

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
  const advisor = rosterEntry
    ? store.users.find(
        u =>
          u.id === rosterEntry.advisorId ||
          (u.code && rosterEntry.advisorId && u.code.toUpperCase() === rosterEntry.advisorId.toUpperCase()) ||
          (u.email && rosterEntry.advisorId && u.email.toLowerCase() === rosterEntry.advisorId.toLowerCase())
      )
    : null

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

    // 1. Create AdvisingRequest
    const newRequest = store.addRequest({
      studentId: currentUser!.id,
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

    addToast('success', t('ยื่นคำร้องสำเร็จ', 'Request Submitted'), t('คำร้องของคุณถูกส่งไปยังอาจารย์ที่ปรึกษาเรียบร้อยแล้ว', 'Your advising request has been sent to your advisor.'))
    navigate('/student/history')
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <PageHeader
        title={t('ยื่นคำร้องขอรับคำปรึกษา', 'Request Advising Session')}
        description={t('กรอกรายละเอียดเพื่อนัดหมายเข้าพบอาจารย์ที่ปรึกษาทางวิชาการ', 'Schedule a meeting with your academic advisor. Fill in the required details below.')}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Advisor banner */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 flex-shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">{t('อาจารย์ที่ปรึกษาที่รับผิดชอบ', 'Assigned Advisor')}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {advisor ? `${advisor.name} · ${advisor.department || 'School of Applied Digital Technology (ADT)'}` : t('ยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา', 'No assigned advisor')}
            </p>
          </div>
        </div>

        <Card className="space-y-5">
          {/* Category */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t('หมวดหมู่คำปรึกษา', 'Advising Category')} <span className="text-rose-500">*</span>
            </label>
            <select
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

          {/* Date and Time */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('วันที่ประสงค์ขอเข้าพบ', 'Requested Date')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('เวลาที่ประสงค์ขอเข้าพบ', 'Requested Time')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={e => setPreferredTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
              {t(
                '* เป็นวันและเวลาที่นักศึกษาเสนอขอเข้าพบเบื้องต้น โดยอาจารย์ที่ปรึกษาสามารถปรับเปลี่ยนตามตารางเวลาที่เหมาะสมได้',
                '* Proposed meeting slot for advisor\'s consideration. Final schedule may be adjusted by the advisor.'
              )}
            </p>
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
    </div>
  )
}
