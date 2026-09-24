// ============================================================
// Student — Student Voice Survey (Resignation / Leave)
// Voluntary survey for curriculum and support improvement
// ============================================================

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Button, Card } from '@/components/ui'
import type { ExitType } from '@/types'
import {
  MessageSquareHeart,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  UserCheck,
  Star,
  Send,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Check,
  LogOut,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  GraduationCap,
} from 'lucide-react'

const FACTOR_OPTIONS = [
  { id: 'curriculum_fit', th: 'ความยากของหลักสูตร / ไม่ตรงกับความถนัด', en: 'Curriculum Difficulty & Fit' },
  { id: 'workload_teaching', th: 'การสอนและภาระงานวิชาการ', en: 'Teaching Pace & Course Workload' },
  { id: 'financial', th: 'ปัญหาทางการเงินและค่าครองชีพ', en: 'Financial Hardship & Living Costs' },
  { id: 'mental_health', th: 'ความเครียดและสภาวะสุขภาพจิต', en: 'Mental Health & Stress' },
  { id: 'physical_health', th: 'ปัญหาสุขภาพทางกาย', en: 'Physical Health Issues' },
  { id: 'family_personal', th: 'ภาระครอบครัว / ความจำเป็นส่วนตัว', en: 'Family & Personal Commitments' },
  { id: 'career_shift', th: 'เป้าหมายอาชีพเปลี่ยนไป / ต้องการทำงาน', en: 'Career Path Redirection & Employment' },
  { id: 'campus_social', th: 'การปรับตัวและสภาพแวดล้อมในมหาวิทยาลัย', en: 'Campus Life & Social Adaptation' },
  { id: 'transfer', th: 'ต้องการโอนย้ายไปสถาบันหรือสาขาอื่น', en: 'University or Major Transfer' },
]

export default function StudentVoiceSurvey() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const linkedExitCaseId = searchParams.get('caseId') || undefined
  const returnUrl = searchParams.get('return') || undefined
  const studentExitCase = store.exitCases.find(
    e => e.studentId === currentUser?.id || (linkedExitCaseId && e.id === linkedExitCaseId)
  )

  const [isAnonymous, setIsAnonymous] = useState(false)
  const [exitType, setExitType] = useState<ExitType>(studentExitCase?.exitType || 'withdrawal')
  const [showExitTypeDropdown, setShowExitTypeDropdown] = useState(false)
  const [academicYear, setAcademicYear] = useState('Year 2 (ชั้นปีที่ 2)')
  const [showAcademicYearDropdown, setShowAcademicYearDropdown] = useState(false)
  const [selectedFactors, setSelectedFactors] = useState<string[]>([])

  const EXIT_TYPE_OPTIONS: { value: ExitType; labelTh: string; labelEn: string; icon: typeof LogOut }[] = [
    { value: 'withdrawal', labelTh: 'ขอลาออกจากการเป็นนักศึกษา (Withdrawal)', labelEn: 'Withdrawal / Drop Out', icon: LogOut },
    { value: 'leave_of_absence', labelTh: 'ขอลาพักการศึกษา (Leave of Absence)', labelEn: 'Leave of Absence', icon: Clock },
    { value: 'transfer', labelTh: 'ขอโอนย้ายสถาบัน / สาขา (Transfer)', labelEn: 'Transfer Institution / Major', icon: ArrowRightLeft },
    { value: 'dropout', labelTh: 'พ้นสภาพ / อื่นๆ (Dropout / Discontinuation)', labelEn: 'Dropout / Discontinuation', icon: AlertCircle },
  ]

  const ACADEMIC_YEAR_OPTIONS = [
    { value: 'Year 1 (ชั้นปีที่ 1)', labelTh: 'Year 1 (ชั้นปีที่ 1)', labelEn: 'Year 1 (ชั้นปีที่ 1)' },
    { value: 'Year 2 (ชั้นปีที่ 2)', labelTh: 'Year 2 (ชั้นปีที่ 2)', labelEn: 'Year 2 (ชั้นปีที่ 2)' },
    { value: 'Year 3 (ชั้นปีที่ 3)', labelTh: 'Year 3 (ชั้นปีที่ 3)', labelEn: 'Year 3 (ชั้นปีที่ 3)' },
    { value: 'Year 4+ (ชั้นปีที่ 4 ขึ้นไป)', labelTh: 'Year 4+ (ชั้นปีที่ 4 ขึ้นไป)', labelEn: 'Year 4+ (ชั้นปีที่ 4 ขึ้นไป)' },
  ]

  const selectedExitTypeOpt = EXIT_TYPE_OPTIONS.find(o => o.value === exitType) || EXIT_TYPE_OPTIONS[0]
  const SelectedExitIcon = selectedExitTypeOpt.icon
  
  // Ratings
  const [curriculumRating, setCurriculumRating] = useState(3)
  const [teachingRating, setTeachingRating] = useState(3)
  const [advisorRating, setAdvisorRating] = useState(4)
  const [servicesRating, setServicesRating] = useState(3)
  const [overallRating, setOverallRating] = useState(3)

  // Open feedback
  const [whatCouldUniversityDoBetter, setWhatCouldUniversityDoBetter] = useState('')
  const [curriculumImprovementSuggestions, setCurriculumImprovementSuggestions] = useState('')
  const [adviceForFutureStudents, setAdviceForFutureStudents] = useState('')
  const [shareWithAdvisor, setShareWithAdvisor] = useState(true)

  const [isSubmitted, setIsSubmitted] = useState(false)

  if (!currentUser) return null

  const hasAlreadyCompleted = Boolean(
    store.studentVoiceResponses.some(
      v => v.studentId === currentUser.id || v.studentCode === currentUser.code
    ) ||
    store.completedVoiceStudents.includes(currentUser.id) ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true' ||
      localStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true'
    ))
  )

  function toggleFactor(factorId: string) {
    setSelectedFactors(prev => {
      const opt = FACTOR_OPTIONS.find(o => o.id === factorId || o.th === factorId || o.en === factorId)
      const targetId = opt ? opt.id : factorId
      const exists = prev.some(f => f === targetId || (opt && (f === opt.th || f === opt.en)))
      if (exists) {
        return prev.filter(f => f !== targetId && (!opt || (f !== opt.th && f !== opt.en)))
      } else {
        return [...prev, targetId]
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (selectedFactors.length === 0) {
      addToast(
        'warning',
        t('กรุณาเลือกปัจจัย', 'Factor Required'),
        t('กรุณาเลือกปัจจัยสำคัญที่ส่งผลต่อการตัดสินใจอย่างน้อย 1 รายการ', 'Please select at least 1 primary factor.')
      )
      return
    }

    const finalFactors = selectedFactors.map(f => {
      const opt = FACTOR_OPTIONS.find(o => o.id === f || o.th === f || o.en === f)
      return opt ? (language === 'th' ? opt.th : opt.en) : f
    })

    const response = store.addStudentVoiceResponse({
      exitCaseId: linkedExitCaseId || studentExitCase?.id,
      studentId: isAnonymous ? undefined : currentUser!.id,
      studentCode: isAnonymous ? undefined : currentUser!.code,
      isAnonymous,
      exitType,
      academicYear,
      primaryFactors: finalFactors,
      ratings: {
        curriculumRelevance: curriculumRating,
        teachingQuality: teachingRating,
        advisorSupport: advisorRating,
        universityServices: servicesRating,
        overallExperience: overallRating,
      },
      whatCouldUniversityDoBetter,
      curriculumImprovementSuggestions,
      adviceForFutureStudents,
      shareWithAdvisor,
    })

    // Decoupled gate: mark student user account as having completed the survey gate
    // while keeping response payload anonymous in studentVoiceResponses
    store.markVoiceSurveyCompleted(currentUser!.id)
    try {
      sessionStorage.setItem(`student_voice_completed_${currentUser!.id}`, 'true')
      localStorage.setItem(`student_voice_completed_${currentUser!.id}`, 'true')
    } catch {}

    store.addAuditLog({
      userId: isAnonymous ? 'ANONYMOUS_STUDENT' : currentUser!.id,
      userName: isAnonymous ? 'Anonymous Student' : currentUser!.name,
      userRole: 'student',
      action: 'student_voice_submitted',
      description: `Submitted Student Voice exit survey (${exitType.replace(/_/g, ' ')})`,
      targetId: response.id,
    })

    addToast(
      'success',
      t('ขอบคุณสำหรับความคิดเห็น', 'Feedback Received'),
      t('ข้อมูลของคุณถูกบันทึกเพื่อใช้พัฒนาหลักสูตรและการดูแลนักศึกษาต่อไป', 'Your voice has been recorded to improve the curriculum and student support.')
    )

    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="text-center py-10 px-6 sm:px-12 border-sky-200/80 bg-gradient-to-b from-sky-50/40 via-white to-white dark:from-slate-900 dark:to-slate-900 shadow-xl">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-5 ring-8 ring-emerald-50 dark:ring-emerald-900/30 shadow-inner">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
            {t('ขอบคุณสำหรับทุกเสียงสะท้อนของคุณ', 'Thank You for Sharing Your Voice')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
            {t(
              'มหาวิทยาลัยและสำนักวิชาขอขอบคุณที่สละเวลาบอกเล่าเรื่องราวของคุณ ข้อมูลทั้งหมดจะถูกนำไปใช้วางแผนปรับปรุงหลักสูตร เพิ่มการดูแลรุ่นน้อง และยกระดับการประกันคุณภาพการศึกษา (AUN-QA)',
              'The School deeply appreciates your candid feedback. Your inputs will directly inform our curriculum development, early student support, and AUN-QA continuous improvement initiatives.'
            )}
          </p>

          <div className="p-4 bg-sky-50/70 dark:bg-sky-950/40 rounded-2xl border border-sky-100 dark:border-sky-800/60 max-w-md mx-auto text-left text-xs space-y-2 mb-8">
            <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>{t('การรักษาความลับและความเป็นส่วนตัว', 'Confidentiality Assurance')}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
              {t(
                'แบบสอบถามนี้ไม่มีผลกระทบใดๆ ต่อกระบวนการอนุมัติหรือขั้นตอนการลาออก/ลาพัก และจะไม่ถูกนำไปใช้ในทางอื่นนอกเหนือจากการพัฒนาการศึกษา',
                'This survey has zero effect on your formal resignation/leave workflow and is kept strictly for educational quality enhancement.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {returnUrl ? (
              <>
                <Button variant="primary" onClick={() => navigate(returnUrl)}>
                  {t('ดำเนินการยื่นคำร้องขอเข้าพบต่อ', 'Continue to Advising Request')}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <Button variant="secondary" onClick={() => navigate('/student')}>
                  {t('กลับสู่หน้าหลักนักศึกษา', 'Return to Student Dashboard')}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => navigate('/student')}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                {t('กลับสู่หน้าหลักนักศึกษา', 'Return to Student Dashboard')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <PageHeader
        title={t('เสียงของนักศึกษา (กรณีลาออก/พักการศึกษา)', 'Student Voice — Resignation/Leave')}
        description={t(
          'แบบสอบถามโดยสมัครใจ เพื่อให้นักศึกษาเล่าด้วยคำพูดของตนเอง ข้อมูลใช้พัฒนาหลักสูตรเท่านั้นและไม่มีผลต่อกระบวนการลาออก',
          'Voluntary survey in your own words. Used only to improve the programme and does NOT affect your resignation process.'
        )}
      />

      {/* Official Guarantee Banner */}
      <div className="relative overflow-hidden mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white via-sky-50/30 to-blue-50/40 dark:from-[#0e1424] dark:via-[#111827] dark:to-[#0c1222] border border-sky-200/80 dark:border-slate-800/90 shadow-xs dark:shadow-premium flex items-start gap-3.5 sm:gap-4 transition-all">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-600/25 ring-2 ring-sky-100 dark:ring-sky-400/20">
          <MessageSquareHeart className="h-5 w-5" />
        </div>
        <div className="relative z-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('แบบสอบถามความสมัครใจเพื่อพัฒนาคุณภาพการศึกษา', 'Voluntary Quality Improvement Survey')}
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-500/30 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
              AUN-QA Criteria 6 & 8
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed">
            {t(
              'คำตอบของคุณมีคุณค่าอย่างยิ่งในการช่วยอาจารย์และมหาวิทยาลัยทำความเข้าใจปัญหาที่แท้จริง เพื่อปรับปรุงเนื้อหาหลักสูตร วิธีการสอน และระบบช่วยเหลือนักศึกษาในอนาคต',
              'Your sincere feedback helps faculty and leadership understand real challenges to improve curriculum content, teaching methodologies, and support structures for future students.'
            )}
          </p>
        </div>
      </div>

      {/* Completion Notification if already submitted / completed earlier */}
      {hasAlreadyCompleted && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {t('คุณได้ทำแบบสำรวจเสียงของนักศึกษาเรียบร้อยแล้ว', 'You have already completed the Student Voice survey')}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {t(
                  'ระบบได้บันทึกสถานะเรียบร้อยแล้ว ท่านสามารถดำเนินการส่งคำร้องขอรับคำปรึกษาต่อได้ทันที',
                  'Your survey completion is recorded. You may proceed directly to your advising request.'
                )}
              </p>
            </div>
          </div>
          {returnUrl && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate(returnUrl)}
              className="whitespace-nowrap text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs self-end sm:self-auto"
            >
              {t('ดำเนินการยื่นคำร้องต่อ', 'Continue to Advising Request')}
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identity & Context */}
        <Card className="space-y-5 border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-black">1</span>
              {t('ข้อมูลสถานะและการไม่ระบุตัวตน', 'Context & Anonymity')}
            </h3>
            
            {/* Anonymity Switch */}
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isAnonymous
                  ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-200 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isAnonymous ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-purple-600" />
                  <span>{t('โหมดไม่ระบุตัวตน (เปิดอยู่)', 'Anonymous Mode: ON')}</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-3.5 w-3.5 text-sky-600" />
                  <span>{t('ระบุตัวตนนักศึกษา', 'Student Identity Attached')}</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Case Category Dropdown */}
            <div>
              <label htmlFor="exit-type-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('กรณีที่เกิดขึ้น', 'Case Category')} <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  aria-label={t('กรณีที่เกิดขึ้น', 'Case Category')}
                  onClick={() => {
                    setShowExitTypeDropdown(!showExitTypeDropdown)
                    setShowAcademicYearDropdown(false)
                  }}
                  className="w-full min-h-[42px] flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium transition-all shadow-2xs text-left cursor-pointer hover:border-sky-400"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="h-6 w-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-sky-400">
                      <SelectedExitIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {language === 'th' ? selectedExitTypeOpt.labelTh : selectedExitTypeOpt.labelEn}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${showExitTypeDropdown ? 'rotate-180 text-sky-500' : ''}`} />
                </button>

                {showExitTypeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowExitTypeDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto animate-[slideIn_0.12s_ease-out]">
                      {EXIT_TYPE_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        const isSelected = exitType === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setExitType(opt.value)
                              setShowExitTypeDropdown(false)
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                              <span className="truncate">{language === 'th' ? opt.labelTh : opt.labelEn}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Hidden native select for test & automation compatibility */}
                <select
                  id="exit-type-select"
                  aria-label={t('กรณีที่เกิดขึ้น', 'Case Category')}
                  value={exitType}
                  onChange={e => setExitType(e.target.value as ExitType)}
                  className="sr-only"
                >
                  {EXIT_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {language === 'th' ? opt.labelTh : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Academic Year Dropdown */}
            <div>
              <label htmlFor="academic-year-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('ชั้นปีการศึกษาปัจจุบัน', 'Academic Year')} <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <button
                  type="button"
                  aria-label={t('ชั้นปีการศึกษาปัจจุบัน', 'Academic Year')}
                  onClick={() => {
                    setShowAcademicYearDropdown(!showAcademicYearDropdown)
                    setShowExitTypeDropdown(false)
                  }}
                  className="w-full min-h-[42px] flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium transition-all shadow-2xs text-left cursor-pointer hover:border-sky-400"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div className="h-6 w-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-sky-400">
                      <GraduationCap className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {academicYear}
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${showAcademicYearDropdown ? 'rotate-180 text-sky-500' : ''}`} />
                </button>

                {showAcademicYearDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAcademicYearDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto animate-[slideIn_0.12s_ease-out]">
                      {ACADEMIC_YEAR_OPTIONS.map(opt => {
                        const isSelected = academicYear === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setAcademicYear(opt.value)
                              setShowAcademicYearDropdown(false)
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                                : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                              <span className="truncate">{opt.value}</span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Hidden native select for test & automation compatibility */}
                <select
                  id="academic-year-select"
                  aria-label={t('ชั้นปีการศึกษาปัจจุบัน', 'Academic Year')}
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  className="sr-only"
                >
                  {ACADEMIC_YEAR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Key Driving Factors */}
        <Card className="space-y-4 border-slate-200/80 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-black">2</span>
              {t('ปัจจัยสำคัญที่มีผลต่อการตัดสินใจ', 'Primary Factors Influencing Your Decision')}
              <span className="text-rose-500">*</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('เลือกได้มากกว่า 1 ข้อตามความเป็นจริง', 'Select all that apply to your actual circumstances')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FACTOR_OPTIONS.map(opt => {
              const label = language === 'th' ? opt.th : opt.en
              const isSelected = selectedFactors.some(
                f => f === opt.id || f === opt.th || f === opt.en
              )
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleFactor(opt.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-semibold shadow-xs ring-1 ring-sky-300/40'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3" />}
                  </div>
                  <span className="leading-snug">{label}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Section 3: Experience Ratings */}
        <Card className="space-y-4 border-slate-200/80 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-black">3</span>
              {t('การประเมินประสบการณ์การเรียนรู้และการสนับสนุน (1 = น้อยที่สุด, 5 = มากที่สุด)', 'Experience & Support Ratings (1-5 Scale)')}
            </h3>
          </div>

          <div className="space-y-4">
            {[
              {
                id: 'curriculum',
                label: t('ความน่าสนใจและความทันสมัยของโครงสร้างหลักสูตร', 'Curriculum Structure & Relevance'),
                val: curriculumRating,
                set: setCurriculumRating,
              },
              {
                id: 'teaching',
                label: t('คุณภาพการเรียนการสอนและความเอาใจใส่ของอาจารย์ผู้สอน', 'Teaching Quality & Faculty Support'),
                val: teachingRating,
                set: setTeachingRating,
              },
              {
                id: 'advisor',
                label: t('การให้คำแนะนำและช่วยเหลือของอาจารย์ที่ปรึกษา', 'Advisor Guidance & Mentorship'),
                val: advisorRating,
                set: setAdvisorRating,
              },
              {
                id: 'services',
                label: t('สิ่งอำนวยความสะดวกและบริการนักศึกษาของมหาวิทยาลัย', 'University Facilities & Student Services'),
                val: servicesRating,
                set: setServicesRating,
              },
              {
                id: 'overall',
                label: t('ความพึงพอใจต่อประสบการณ์โดยรวมในหลักสูตร', 'Overall Program Experience Satisfaction'),
                val: overallRating,
                set: setOverallRating,
              },
            ].map(metric => (
              <div key={metric.id} className="p-3 bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{metric.label}</span>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => metric.set(star)}
                      className={`p-1 rounded-lg transition-transform hover:scale-110 cursor-pointer ${
                        metric.val >= star
                          ? 'text-amber-500'
                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                      }`}
                    >
                      <Star className={`h-5 w-5 ${metric.val >= star ? 'fill-amber-500' : ''}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1.5 w-6 text-right font-mono">
                    {metric.val}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section 4: In Your Own Words */}
        <Card className="space-y-4 border-slate-200/80 dark:border-slate-800">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs font-black">4</span>
              {t('เล่าด้วยคำพูดของตนเอง (In Your Own Words)', 'In Your Own Words')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('บอกเล่าความในใจ ประสบการณ์จริง หรือสิ่งที่ต้องการให้ปรับปรุง', 'Express your honest thoughts, experiences, and suggestions')}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t(
                  '1. มีสิ่งใดที่มหาวิทยาลัยหรือสำนักวิชาสามารถทำได้ดีกว่านี้เพื่อช่วยเหลือหรือสนับสนุนคุณ?',
                  '1. What could the university or school have done differently to support you better?'
                )}
              </label>
              <textarea
                value={whatCouldUniversityDoBetter}
                onChange={e => setWhatCouldUniversityDoBetter(e.target.value)}
                rows={3}
                placeholder={t(
                  'บอกเล่าสิ่งที่อยากให้มี เช่น ทุนการศึกษา การแนะแนว การลดภาระงาน การติวเสริม...',
                  'Describe what support or interventions would have made a difference...'
                )}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t(
                  '2. ข้อเสนอแนะในการพัฒนาและปรับปรุงหลักสูตร หรือวิธีการเรียนการสอน',
                  '2. Suggestions to improve curriculum structure, coursework, or instructional methods'
                )}
              </label>
              <textarea
                value={curriculumImprovementSuggestions}
                onChange={e => setCurriculumImprovementSuggestions(e.target.value)}
                rows={3}
                placeholder={t(
                  'ข้อเสนอแนะเกี่ยวกับรายวิชา การจัดสรรเวลา ความยืดหยุ่นของหลักสูตร...',
                  'Suggestions regarding courses, pacing, curriculum flexibility...'
                )}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t(
                  '3. ข้อคิดหรือคำแนะนำที่คุณอยากฝากถึงเพื่อนๆ และรุ่นน้องในอนาคต',
                  '3. Advice or words of encouragement for current and future students'
                )}
              </label>
              <textarea
                value={adviceForFutureStudents}
                onChange={e => setAdviceForFutureStudents(e.target.value)}
                rows={2}
                placeholder={t(
                  'คำแนะนำเรื่องการเรียน การปรับตัว หรือการขอความช่วยเหลือ...',
                  'Advice regarding study habits, seeking guidance early...'
                )}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>
        </Card>

        {/* Section 5: Consent & Sharing Preferences */}
        <Card className="p-4 sm:p-5 border-slate-200/80 dark:border-slate-800 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareWithAdvisor}
              onChange={e => setShareWithAdvisor(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-sky-600 focus:ring-sky-500/20 border-slate-300 dark:border-slate-600 cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {t(
                'อนุญาตให้อาจารย์ที่ปรึกษาเข้าถึงข้อเสนอแนะเชิงสร้างสรรค์นี้ เพื่อนำไปพัฒนาการให้คำปรึกษาแก่นักศึกษารุ่นถัดไป',
                'Allow academic advisors to read this feedback to enhance advising practices for future advisees.'
              )}
            </span>
          </label>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>
              {t(
                'ข้อมูลทั้งหมดจะถูกประมวลผลเพื่อการประกันคุณภาพการศึกษา (AUN-QA) และพัฒนาหลักสูตรเท่านั้น ไม่มีการนำไปพิจารณาเรื่องวินัยหรือกระบวนการลาออก',
                'All data will be processed strictly for AUN-QA accreditation and continuous improvement without affecting exit approval.'
              )}
            </span>
          </div>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
          <Button className="w-full sm:w-auto" variant="secondary" type="button" onClick={() => navigate('/student')}>
            {t('ไว้ทำภายหลัง', 'Skip / Later')}
          </Button>
          <Button className="w-full sm:w-auto" variant="primary" type="submit">
            <Send className="h-4 w-4 mr-1.5" />
            {t('ส่งแบบสอบถามเสียงของนักศึกษา', 'Submit Student Voice')}
          </Button>
        </div>
      </form>
    </div>
  )
}
