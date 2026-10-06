// ============================================================
// Student — Request Advising Form (3-Step Interactive Wizard)
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Button, Card, Modal } from '@/components/ui'
import { EXIT_REASON_CODES } from '@/types'
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
  Check,
  Coins,
  BookOpen,
  Briefcase,
  HeartHandshake,
  LogOut,
  Tag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Edit3,
  Upload,
  FileText,
  Loader2,
  FileCheck2,
  Globe,
  Search,
} from 'lucide-react'
import { buildAdvisorCalendarUrl, openAdvisorCalendar } from '@/utils/calendarUtils'
import { getLocalDateString } from '@/utils/dateUtils'
import { uploadFileToCloudinary } from '@/services/cloudinaryService'

interface UploadedAttachment {
  file?: File
  fileName: string
  fileUrl?: string
  cloudinaryPublicId?: string
  format?: string
  size?: number
}

export default function RequestAdvising() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel, getExitReasonLabel, getSubCategoryLabel } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialCategory = (searchParams.get('category') as AdvisingCategory) || ''
  const initialType = (searchParams.get('type') as ExitType) || 'withdrawal'

  // Wizard Step state: 1: Topic & Advisor, 2: Schedule & Details, 3: Review & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  const [category, setCategory] = useState<AdvisingCategory | ''>(initialCategory)
  const [subCategory, setSubCategory] = useState('')
  const [exitType, setExitType] = useState<ExitType>(initialType)
  const [exitReasonCode, setExitReasonCode] = useState<ExitReasonCode>('academic')
  const [details, setDetails] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [pdpaConsent, setPdpaConsent] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarTab, setCalendarTab] = useState<'google' | 'system'>('google')
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('')
  const [isAdvisorDropdownOpen, setIsAdvisorDropdownOpen] = useState(false)
  const [advisorSearch, setAdvisorSearch] = useState('')
  const advisorDropdownRef = useRef<HTMLDivElement>(null)
  const [showExitReasonDropdown, setShowExitReasonDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isAdvisorDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (advisorDropdownRef.current && !advisorDropdownRef.current.contains(e.target as Node)) {
        setIsAdvisorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAdvisorDropdownOpen])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // 10MB limit check
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', t('ขนาดไฟล์เกินกำหนด', 'File Too Large'), t('ไฟล์ต้องมีขนาดไม่เกิน 10MB', 'File size must not exceed 10MB.'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Duplicate check
    if (attachments.some(a => a.fileName === file.name)) {
      addToast('warning', t('ไฟล์นี้ถูกแนบแล้ว', 'File Already Selected'), file.name)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const newAtt: UploadedAttachment = {
      file,
      fileName: file.name,
      format: file.name.split('.').pop()?.toLowerCase(),
      size: file.size,
    }
    setAttachments(prev => [...prev, newAtt])
    addToast('info', t('แนบไฟล์แล้ว (จะอัปโหลดเมื่อยืนยันคำร้อง)', 'File Selected'), file.name)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function getCategoryIcon(cat: AdvisingCategory | string | '', isSelected: boolean = false) {
    const iconClass = `h-5 w-5 transition-colors ${isSelected ? 'text-white' : ''}`
    switch (cat) {
      case 'scholarship_document':
      case 'scholarship_aid':
      case 'financial':
        return <Coins className={`${iconClass} ${isSelected ? '' : 'text-emerald-600 dark:text-emerald-400'}`} />
      case 'registration':
      case 'academic_advising':
      case 'academic_performance':
        return <BookOpen className={`${iconClass} ${isSelected ? '' : 'text-sky-600 dark:text-sky-400'}`} />
      case 'student_status':
        return <ShieldCheck className={`${iconClass} ${isSelected ? '' : 'text-indigo-600 dark:text-indigo-400'}`} />
      case 'internship_career':
      case 'career_internship':
        return <Briefcase className={`${iconClass} ${isSelected ? '' : 'text-amber-600 dark:text-amber-400'}`} />
      case 'personal':
      case 'mental_health':
        return <HeartHandshake className={`${iconClass} ${isSelected ? '' : 'text-rose-600 dark:text-rose-400'}`} />
      case 'study_abroad':
        return <Globe className={`${iconClass} ${isSelected ? '' : 'text-purple-600 dark:text-purple-400'}`} />
      case 'withdrawal_leave':
      case 'graduation_exit':
        return <LogOut className={`${iconClass} ${isSelected ? '' : 'text-orange-600 dark:text-orange-400'}`} />
      default:
        return <Tag className={`${iconClass} ${isSelected ? '' : 'text-sky-600 dark:text-sky-400'}`} />
    }
  }

  if (!currentUser) return null

  // Find active roster assignment for current student
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

  // All active faculty advisors
  const availableAdvisors = store.users.filter(
    u => u.role === 'advisor' && u.isActive
  )

  const advisor = (selectedAdvisorId ? store.users.find(u => u.id === selectedAdvisorId) : null) || assignedAdvisor || null
  const isAssignedAdvisor = Boolean(assignedAdvisor && advisor?.id === assignedAdvisor?.id)

  const advisorAppointments = store.appointments
    .filter(a => a.advisorId === advisor?.id && a.status === 'scheduled')
    .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || '') || (a.scheduledTime || '').localeCompare(b.scheduledTime || ''))

  const sameDateAppointments = preferredDate
    ? advisorAppointments.filter(a => a.scheduledDate === preferredDate)
    : []

  const selectedCategoryConfig = store.categoryConfigs.find(c => c.value === category)
  const subCategories = selectedCategoryConfig?.subCategories || []

  // Check if student completed Student Voice
  const hasVoiceResponse =
    store.studentVoiceResponses.some(
      v => v.studentId === currentUser.id || v.studentCode === currentUser.code
    ) ||
    store.completedVoiceStudents.includes(currentUser.id) ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true' ||
      localStorage.getItem(`student_voice_completed_${currentUser.id}`) === 'true'
    ))

  function validateStep1(): boolean {
    if (!advisor) {
      addToast('error', t('กรุณาเลือกอาจารย์', 'Advisor Required'), t('กรุณาเลือกอาจารย์ที่ปรึกษาเพื่อรับคำร้อง', 'Please select a faculty advisor.'))
      return false
    }
    if (!category) {
      addToast('error', t('กรุณาเลือกหมวดหมู่', 'Category Required'), t('กรุณาเลือกหมวดหมู่คำปรึกษาที่ต้องการ', 'Please select an advising category.'))
      return false
    }
    if (category === 'withdrawal_leave' && !hasVoiceResponse) {
      addToast('warning', t('กรุณาทำแบบสำรวจก่อน', 'Survey Required'), t('กรุณาทำแบบสำรวจเสียงสะท้อนนักศึกษา (Student Voice) ก่อนดำเนินการต่อ', 'Please complete the Student Voice survey first.'))
      navigate('/student/voice?return=/student/request?category=withdrawal_leave')
      return false
    }
    return true
  }

  function validateStep2(): boolean {
    if (!details.trim()) {
      addToast('error', t('กรุณาระบุรายละเอียด', 'Details Required'), t('กรุณากรอกรายละเอียดหรือประเด็นที่ต้องการปรึกษาอาจารย์', 'Please describe the topics or questions to discuss.'))
      return false
    }
    if (!preferredDate) {
      addToast('error', t('กรุณาเลือกวันที่', 'Date Required'), t('กรุณาเลือกวันที่ต้องการเข้าพบอาจารย์', 'Please choose a preferred meeting date.'))
      return false
    }
    const todayStr = getLocalDateString()
    if (preferredDate < todayStr) {
      addToast('error', t('วันที่ไม่ถูกต้อง', 'Invalid Date'), t('ไม่สามารถเลือกวันที่ในอดีตได้', 'Cannot select a past date.'))
      return false
    }
    if (!preferredTime) {
      addToast('error', t('กรุณาเลือกเวลา', 'Time Required'), t('กรุณาระบุเวลาที่ต้องการเข้าพบ', 'Please specify a preferred meeting time.'))
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!category || !details || !preferredDate || !preferredTime || !pdpaConsent) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนและยินยอม PDPA', 'Please fill in all required fields and give consent.'))
      return
    }

    const todayStr = getLocalDateString()
    if (preferredDate < todayStr) {
      addToast(
        'error',
        t('วันที่ไม่ถูกต้อง', 'Invalid Date'),
        t('ไม่สามารถเลือกวันที่ในอดีตได้ กรุณาเลือกวันปัจจุบันหรือวันถัดไป', 'Cannot select a past date. Please choose today or a future date.')
      )
      return
    }

    if (!advisor) {
      addToast(
        'error',
        t('กรุณาเลือกอาจารย์ผู้รับคำร้อง', 'Advisor Required'),
        t('คุณยังไม่ได้เลือกอาจารย์ที่ปรึกษา กรุณาเลือกอาจารย์ที่ต้องการส่งคำร้องให้', 'Please select a faculty advisor from the list before submitting.')
      )
      return
    }

    // Gate: withdrawal_leave strictly requires completing Student Voice
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

    setIsSubmitting(true)
    try {
      // Upload pending local files to Cloudinary on final submit only
      const processedAttachments: UploadedAttachment[] = []
      for (const att of attachments) {
        if (att.file) {
          try {
            const res = await uploadFileToCloudinary(att.file, {
              studentCode: currentUser?.code,
              folder: 'advising_attachments',
            })
            processedAttachments.push({
              fileName: res.originalFilename || att.fileName,
              fileUrl: res.secureUrl,
              cloudinaryPublicId: res.publicId,
              format: res.format,
              size: res.bytes,
            })
          } catch (err: unknown) {
            const error = err as Error
            console.error('Failed to upload file to Cloudinary:', error)
            processedAttachments.push({
              fileName: att.fileName,
              fileUrl: '',
            })
          }
        } else {
          processedAttachments.push(att)
        }
      }

      // 1. Create AdvisingRequest
      const newRequest = store.addRequest({
        studentId: effectiveStudentId,
        advisorId: advisor.id,
        category: category as AdvisingCategory,
        subCategory: category === 'withdrawal_leave' ? exitType : (subCategory || undefined),
        details,
        preferredDate,
        preferredTime,
        attachments: processedAttachments.map(a => JSON.stringify(a)),
        pdpaConsent,
        status: 'requested',
      })

      // Sync attached documents into store.documents for unified document tracking
      if (processedAttachments.length > 0) {
        processedAttachments.forEach(att => {
          store.addDocument({
            studentId: effectiveStudentId,
            documentName: att.fileName,
            fileName: att.fileName,
            documentTypeId: category === 'scholarship_document' ? 'doc-scholarship' : category === 'withdrawal_leave' ? 'doc-exit' : 'doc-general',
            status: 'uploaded',
            signatureMethod: 'e_signature',
            cloudinaryPublicId: att.cloudinaryPublicId,
            fileUrl: att.fileUrl,
            uploadedAt: getLocalDateString(),
          })
        })
      }

      // 2. If withdrawal/leave/transfer, also record ExitCase
      if (category === 'withdrawal_leave') {
        const newExitCase = store.addExitCase({
          studentId: effectiveStudentId,
          advisorId: advisor.id,
          exitType,
          reasonCode: exitReasonCode,
          details,
          dataAnalysisConsent: true,
          preferredEffectiveDate: preferredDate,
          status: 'open',
        })

        store.addAuditLog({
          userId: effectiveStudentId,
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
    } catch (err) {
      console.error(err)
      addToast('error', t('เกิดข้อผิดพลาด', 'Submission Error'), t('ไม่สามารถส่งคำร้องได้ กรุณาลองใหม่อีกครั้ง', 'Could not submit request. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Active pending follow-ups from earlier sessions for this student
  const effectiveStudent = store.users.find(
    u => u.id === currentUser?.id ||
         (currentUser?.code && u.code?.toUpperCase() === currentUser.code.toUpperCase()) ||
         (currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
  ) || currentUser

  const pendingTasks = (store.followUps || []).filter(
    f => (f.studentId === effectiveStudent?.id || (currentUser?.code && f.studentId?.toUpperCase() === currentUser.code.toUpperCase())) &&
         f.status !== 'completed'
  )

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <PageHeader
        title={t('ยื่นคำร้องขอรับคำปรึกษา', 'Request Advising Session')}
        description={t('ขั้นตอนการขอนัดหมายเข้าพบอาจารย์ที่ปรึกษาอย่างเป็นระบบและสะดวกรวดเร็ว', 'Schedule a meeting with your academic advisor through a simple, guided 3-step process.')}
      />

      {/* 3-Step Wizard Navigation Indicator */}
      <div className="mb-6 bg-slate-100 dark:bg-slate-800/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
          {[
            { step: 1, label: t('1. หัวข้อและอาจารย์', '1. Topic & Advisor'), icon: <Tag className="h-4 w-4" /> },
            { step: 2, label: t('2. วันเวลาและรายละเอียด', '2. Schedule & Details'), icon: <Calendar className="h-4 w-4" /> },
            { step: 3, label: t('3. ตรวจสอบและยืนยัน', '3. Review & Submit'), icon: <ShieldCheck className="h-4 w-4" /> },
          ].map(s => {
            const isActive = currentStep === s.step
            const isCompleted = currentStep > s.step
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step === 1) setCurrentStep(1)
                  if (s.step === 2 && validateStep1()) setCurrentStep(2)
                  if (s.step === 3 && validateStep1() && validateStep2()) setCurrentStep(3)
                }}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs font-extrabold'
                    : isCompleted
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100/90 font-bold border border-sky-200/60 dark:border-sky-800/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-medium'
                }`}
              >
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                  isActive ? 'bg-white/25 text-white font-extrabold' : isCompleted ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium'
                }`}>
                  {isCompleted ? <Check className="h-3 w-3" /> : s.step}
                </div>
                <span className="truncate hidden sm:inline">{s.label}</span>
                <span className="truncate sm:hidden">{s.step}</span>
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ============================================================ */}
        {/* STEP 1: Advisor & Category Selection */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-[fadeIn_0.15s_ease-out]">
            {/* Gentle Reminder for Open Tasks from Previous Sessions */}
            {pendingTasks.length > 0 && (
              <div className="bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-slate-50/80 dark:from-sky-950/40 dark:via-slate-900/40 dark:to-slate-900/60 border border-sky-200/80 dark:border-sky-800/60 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs mt-0.5">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sky-950 dark:text-sky-100 text-sm">
                      {t(
                        `คุณมี ${pendingTasks.length} สิ่งที่ต้องทำจากการเข้าพบครั้งก่อน`,
                        `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''} from previous advising`
                      )}
                    </p>
                    <p className="text-xs text-sky-800/80 dark:text-sky-300/80 mt-1 leading-relaxed">
                      {t(
                        'หากติดปัญหาหรือไม่แน่ใจในการทำภารกิจเดิม คุณสามารถนำมาพูดคุยหรือปรึกษาอาจารย์ในการนัดหมายครั้งนี้ได้โดยตรง',
                        'If you encountered roadblocks with your previous action items, you can discuss them with your advisor during this session.'
                      )}
                    </p>
                    <div className="mt-3 space-y-2">
                      {pendingTasks.slice(0, 3).map(fu => (
                        <div key={fu.id} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/80 px-3.5 py-2 rounded-xl border border-sky-100 dark:border-slate-800 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0 ring-2 ring-sky-200 dark:ring-sky-900" />
                          <span className="truncate font-medium">{fu.task}</span>
                          {fu.dueDate && (
                            <span className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-md font-mono text-[10px] font-medium ml-auto flex-shrink-0 border border-sky-200/60 dark:border-sky-800/50">
                              {t('ครบกำหนด:', 'Due:')} {fu.dueDate}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Interactive Advisor Selection Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{t('อาจารย์ที่ปรึกษาผู้รับคำร้อง', 'Faculty Advisor')}</span>
                  <span className="text-rose-500">*</span>
                </label>
                {selectedAdvisorId && assignedAdvisor && selectedAdvisorId !== assignedAdvisor.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdvisorId('')
                      setIsAdvisorDropdownOpen(false)
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-semibold cursor-pointer underline decoration-dotted self-start sm:self-auto"
                  >
                    {t('↩ คืนค่าเป็นอาจารย์ที่ปรึกษาประจำตัว', '↩ Reset to Assigned')}
                  </button>
                )}
              </div>

              {/* Main Interactive Custom Advisor Card / Selector */}
              <div ref={advisorDropdownRef} className="relative">
                {advisor ? (
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5 transition-all hover:border-sky-300 dark:hover:border-sky-700/60 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Advisor Profile Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                          {advisor.name.split(' ').map(n => n[0]).slice(0, 2).join('') || <User className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {advisor.name}
                            </p>
                            {isAssignedAdvisor ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                {t('อาจารย์ที่ปรึกษาประจำตัว', 'Assigned Advisor')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/60">
                                {t('อาจารย์ประจำสาขา', 'Faculty Advisor')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {advisor.email || advisor.department || 'School of Applied Digital Technology (ADT)'}
                            {advisor.code ? ` · ${advisor.code}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions (Change Advisor + Calendar) */}
                      <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setIsAdvisorDropdownOpen(prev => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <span>{t('สลับอาจารย์', 'Switch Advisor')}</span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isAdvisorDropdownOpen ? 'rotate-180 text-sky-500' : 'text-slate-400'}`} />
                        </button>

                        {advisor.email && (
                          <button
                            type="button"
                            onClick={() => setShowCalendarModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200/90 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-300 text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
                            title={t('เปิดดูตารางเวลาว่างและคิวนัดหมาย', 'View schedule and busy slots')}
                          >
                            <Calendar className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>{t('ดูตารางว่าง', 'Calendar')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>{t('ยังไม่ได้เลือกอาจารย์ที่ปรึกษา', 'No advisor currently selected.')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdvisorDropdownOpen(prev => !prev)}
                      className="px-3 py-1 rounded-lg bg-amber-600 text-white font-semibold text-xs cursor-pointer"
                    >
                      {t('เลือกอาจารย์', 'Select Advisor')}
                    </button>
                  </div>
                )}

                {/* Floating Custom Dropdown Menu */}
                {isAdvisorDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={advisorSearch}
                          onChange={e => setAdvisorSearch(e.target.value)}
                          placeholder={t('ค้นหาชื่อหรือสาขาวิชาอาจารย์...', 'Search advisor by name or department...')}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {/* Assigned Advisor Pin Item */}
                      {assignedAdvisor && (!advisorSearch || assignedAdvisor.name.toLowerCase().includes(advisorSearch.toLowerCase())) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdvisorId(assignedAdvisor.id)
                            setIsAdvisorDropdownOpen(false)
                            setAdvisorSearch('')
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            advisor?.id === assignedAdvisor.id
                              ? 'bg-sky-50/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-100 border border-sky-200/80 dark:border-sky-800/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{assignedAdvisor.name}</span>
                                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                  {t('อาจารย์ที่ปรึกษาประจำตัว', 'Assigned Advisor')}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">{assignedAdvisor.department || assignedAdvisor.email}</p>
                            </div>
                          </div>
                          {advisor?.id === assignedAdvisor.id && <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0 ml-2" />}
                        </button>
                      )}

                      {/* Other Faculty Advisors */}
                      {availableAdvisors
                        .filter(u => u.id !== assignedAdvisor?.id)
                        .filter(u => {
                          if (!advisorSearch.trim()) return true
                          const q = advisorSearch.toLowerCase()
                          return u.name.toLowerCase().includes(q) || (u.department && u.department.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))
                        })
                        .map(u => {
                          const isSelected = advisor?.id === u.id
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedAdvisorId(u.id)
                                setIsAdvisorDropdownOpen(false)
                                setAdvisorSearch('')
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-sky-50/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-100 border border-sky-200/80 dark:border-sky-800/60'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.department || u.email}</p>
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0 ml-2" />}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden native select for accessibility & automation testing */}
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
                  <option value={assignedAdvisor.id}>{assignedAdvisor.name}</option>
                )}
                {availableAdvisors
                  .filter(u => u.id !== assignedAdvisor?.id)
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
              </select>
            </div>

            {/* Category Selection Cards */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="category-select" className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t('เลือกหมวดหมู่เรื่องที่ต้องการปรึกษา', 'Choose Advising Topic')} <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('คลิกเลือกหัวข้อที่ตรงกับความต้องการของคุณมากที่สุด', 'Select the category that best matches your concern.')}
                  </p>
                </div>
              </div>

              {/* Grid of Interactive Visual Category Cards (ARIA Radio Group) */}
              <div
                role="radiogroup"
                aria-label={t('หมวดหมู่คำปรึกษา', 'Advising Category')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
              >
                {store.categoryConfigs.filter(c => c.isActive !== false).length > 0 ? (
                  store.categoryConfigs.filter(c => c.isActive !== false).map(c => {
                    const isSelected = category === c.value
                    const catLabel = getCategoryLabel(c.value)
                    return (
                      <div
                        key={c.value}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setCategory(c.value as AdvisingCategory)
                          setSubCategory('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setCategory(c.value as AdvisingCategory)
                            setSubCategory('')
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative select-none group ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 shadow-xs ring-2 ring-sky-500/20'
                            : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 shadow-2xs hover:shadow-xs'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-sky-100/90 dark:group-hover:bg-slate-700/90 shadow-2xs'
                        }`}>
                          {getCategoryIcon(c.value, isSelected)}
                        </div>
                        <div className="min-w-0 flex-1 pr-2">
                          <p className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-sky-900 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {catLabel}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {c.value === 'withdrawal_leave'
                              ? t('แบบคำร้องขอพ้นสภาพหรือพักการศึกษา', 'Exit, leave or major transfer form')
                              : c.value === 'scholarship_document'
                              ? t('ลงนามรับรองทุนและเอกสารราชการ', 'Scholarship & Petitions')
                              : t('ปรึกษาและขอคำแนะนำทางวิชาการ', 'Advising & Guidance')}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-sky-500 text-white flex items-center justify-center flex-shrink-0 self-center">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-full py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('ยังไม่มีการตั้งค่าหมวดหมู่ในฐานข้อมูล โปรดติดต่อผู้ดูแลระบบ', 'No advising categories configured in the database yet. Please contact an administrator.')}
                    </p>
                  </div>
                )}
              </div>

              {/* Native select for test automation & accessibility */}
              <select
                id="category-select"
                aria-label={t('หมวดหมู่คำปรึกษา', 'Advising Category')}
                value={category}
                onChange={e => {
                  setCategory(e.target.value as AdvisingCategory)
                  setSubCategory('')
                }}
                className="sr-only"
              >
                <option value="">{t('-- กรุณาเลือกหมวดหมู่ --', 'Select a category')}</option>
                {store.categoryConfigs.filter(c => c.isActive !== false).map(c => {
                  const catLabel = getCategoryLabel(c.value)
                  return (
                    <option key={c.value} value={c.value}>{catLabel}</option>
                  )
                })}
              </select>

              {/* Sub-category for regular categories */}
              {category && category !== 'withdrawal_leave' && subCategories.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label htmlFor="subcategory-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('หัวข้อย่อยเฉพาะด้าน', 'Specific Sub-topic')} <span className="text-slate-400 font-normal">({t('ไม่บังคับ', 'Optional')})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSubCategory('')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        !subCategory
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {t('ทั่วไป / ไม่ระบุ', 'General / None')}
                    </button>
                    {subCategories.map(sc => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setSubCategory(sc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          subCategory === sc
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {getSubCategoryLabel(sc)}
                      </button>
                    ))}
                  </div>

                  {/* Hidden select for test compatibility */}
                  <select
                    id="subcategory-select"
                    aria-hidden="true"
                    tabIndex={-1}
                    value={subCategory}
                    onChange={e => setSubCategory(e.target.value)}
                    className="sr-only"
                  >
                    <option value="">{t('-- เลือกหัวข้อย่อย --', 'Select specific topic')}</option>
                    {subCategories.map(sc => (
                      <option key={sc} value={sc}>{getSubCategoryLabel(sc)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* When category is withdrawal_leave */}
              {category === 'withdrawal_leave' && (
                <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-amber-50/30 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
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
                    <label htmlFor="exit-reason-select" className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      {t('สาเหตุหลัก', 'Primary Reason')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowExitReasonDropdown(!showExitReasonDropdown)}
                        className="w-full min-h-[42px] flex items-center justify-between px-3.5 py-2 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-sky-400 dark:hover:border-sky-600 transition-colors shadow-2xs text-left cursor-pointer"
                      >
                        <span className="truncate">{getExitReasonLabel(exitReasonCode)}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${showExitReasonDropdown ? 'rotate-180 text-sky-500' : ''}`} />
                      </button>

                      {showExitReasonDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowExitReasonDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 max-h-60 overflow-y-auto animate-[slideIn_0.12s_ease-out]">
                            {EXIT_REASON_CODES.map(r => (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => {
                                  setExitReasonCode(r.value as ExitReasonCode)
                                  setShowExitReasonDropdown(false)
                                }}
                                className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                                  exitReasonCode === r.value
                                    ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <span>{getExitReasonLabel(r.value)}</span>
                                {exitReasonCode === r.value && (
                                  <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      <select
                        id="exit-reason-select"
                        aria-hidden="true"
                        tabIndex={-1}
                        value={exitReasonCode}
                        onChange={e => setExitReasonCode(e.target.value as ExitReasonCode)}
                        className="sr-only"
                      >
                        {EXIT_REASON_CODES.map(r => (
                          <option key={r.value} value={r.value}>{getExitReasonLabel(r.value)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Student Voice Survey Card */}
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
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
            </Card>

            {/* Step 1 Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={() => navigate(-1)} type="button">
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={category === 'withdrawal_leave' && !hasVoiceResponse}
                  onClick={() => {
                    if (validateStep1()) {
                      setCurrentStep(2)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className="gap-1.5 font-bold"
                >
                  <span>{t('ถัดไป', 'Next')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: Schedule & Details */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-[fadeIn_0.15s_ease-out]">
            <Card className="space-y-5">
              {/* Date & Time Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      {t('วันและเวลาที่ประสงค์ขอเข้าพบ', 'Requested Date & Time')} <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('ระบุวันและเวลาที่สะดวกเข้าพบ', 'Select your preferred day and time slot.')}
                    </p>
                  </div>
                  {advisor?.email && (
                    <button
                      type="button"
                      onClick={() => setShowCalendarModal(true)}
                      className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {t('เช็คปฏิทินว่าง', 'Check Schedule')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t('วันที่ต้องการเข้าพบ', 'Meeting Date')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={preferredDate}
                      min={getLocalDateString()}
                      onChange={e => setPreferredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
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
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-xs"
                    />
                  </div>
                </div>

                {/* Collision Banner */}
                {preferredDate && sameDateAppointments.length > 0 && (
                  <div className="p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
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
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('รายละเอียดหรือประเด็นที่ต้องการปรึกษา', 'Consultation Details & Questions')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  rows={4}
                  placeholder={t('ระบุคำถาม ปัญหาที่พบ หรือประเด็นที่ต้องการปรึกษาอาจารย์อย่างชัดเจน...', 'Describe your questions, concerns, or specific points you would like to discuss with your advisor...')}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs resize-none leading-relaxed"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t('เอกสารประกอบและแบบคำร้อง (ถ้ามี)', 'Supporting Documents & Forms')}
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                    {t('รองรับ PDF, รูปภาพ, Word (ไม่เกิน 10MB)', 'Supports PDF, Image, Word up to 10MB')}
                  </span>
                </div>

                {/* Contextual guidance banner for special categories */}
                {(category === 'scholarship_document' || category === 'withdrawal_leave' || category === 'registration') && (
                  <div className="p-3 bg-sky-50/80 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/80 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      {category === 'scholarship_document'
                        ? t('การรับรองเอกสารทุนการศึกษา', 'Scholarship Document Endorsement')
                        : category === 'withdrawal_leave'
                        ? t('เอกสารประกอบคำร้องขอลาพัก / ลาออก', 'Exit Petition Supporting Files')
                        : t('เอกสารการลงทะเบียน / เพิ่ม-ถอน', 'Registration & Petition Documents')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      {t(
                        'แนบไฟล์แบบฟอร์มหรือเอกสารหลักฐานที่นี่ อาจารย์ที่ปรึกษาจะสามารถเปิดดูและลงนามรับรองเอกสารได้โดยตรงเมื่อบันทึกผลการเข้าพบ',
                        'Attach your completed form or evidence here. Your advisor will be able to preview and endorse the document directly when logging your session.'
                      )}
                    </p>
                  </div>
                )}

                {/* Link to Dedicated Forms Download Catalog */}
                <div className="p-3.5 bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {t('ยังไม่มีแบบฟอร์มคำร้อง? ดาวน์โหลดเอกสารฉบับเปล่าได้ที่นี่', 'Need a blank form? Download official university templates here')}
                    </span>
                  </div>
                  <a
                    href="/student/forms"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline flex-shrink-0 whitespace-nowrap"
                  >
                    <span>{t('ดูแบบฟอร์มทั้งหมด', 'Browse Forms')}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Attached files list */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 pb-1">
                    {attachments.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800 rounded-xl text-xs font-medium text-sky-800 dark:text-sky-200 shadow-2xs">
                        <FileText className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="truncate max-w-[200px] font-semibold">{f.fileName}</span>
                        {f.size && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            ({f.size > 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1 cursor-pointer font-bold text-sm"
                          title={t('ลบไฟล์', 'Remove file')}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Upload Buttons & Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  className="hidden"
                />

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{t('เลือกไฟล์จากเครื่อง', 'Select File from Device')}</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Step 2 Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={() => setCurrentStep(1)} type="button" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>{t('ย้อนกลับ', 'Back')}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  if (validateStep2()) {
                    setCurrentStep(3)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }
                }}
                className="gap-1.5 font-bold"
              >
                <span>{t('ถัดไป', 'Next')}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: Review & Submit */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-[fadeIn_0.15s_ease-out]">
            {/* Visual Review Summary Card */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-sky-500 text-white flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('สรุปรายละเอียดคำร้องขอนัดหมาย', 'Summary & Confirmation')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันส่งคำร้อง', 'Please review all information before final submission.')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  {t('แก้ไขข้อมูล', 'Edit')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">{t('อาจารย์ที่ปรึกษา', 'Advisor')}</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-500" />
                    <span>{advisor?.name}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{advisor?.department || 'ADT'}</p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">{t('หมวดหมู่คำปรึกษา', 'Category')}</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    {getCategoryIcon(category)}
                    <span>{category ? getCategoryLabel(category) : '-'}</span>
                  </p>
                  {subCategory && (
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">{getSubCategoryLabel(subCategory)}</p>
                  )}
                  {category === 'withdrawal_leave' && (
                    <p className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
                      {exitType === 'withdrawal' ? t('ขอลาออก', 'Withdrawal') : exitType === 'leave_of_absence' ? t('ลาพักการศึกษา', 'Leave') : t('ย้ายสาขา', 'Transfer')}
                      {` · ${getExitReasonLabel(exitReasonCode)}`}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">{t('วันและเวลานัดหมาย', 'Proposed Schedule')}</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sky-500" />
                    <span>{preferredDate} {preferredTime ? `· ${preferredTime}` : ''}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {t('รออาจารย์ตอบรับและระบุสถานที่/ช่องทางเข้าพบ', 'Pending advisor confirmation of location / channel')}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block mb-1">{t('เอกสารแนบ', 'Attachments')}</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-sky-500" />
                    <span>{attachments.length > 0 ? `${attachments.length} ${t('ไฟล์', 'file(s)')}` : t('ไม่มีเอกสารแนบ', 'None')}</span>
                  </p>
                  {attachments.length > 0 && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{attachments.map(a => a.fileName).join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Consultation Details Excerpt */}
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 text-xs block mb-1 font-medium">{t('รายละเอียดที่ระบุ', 'Consultation Details')}</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {details || '-'}
                </p>
              </div>

              {/* PDPA Consent Checkbox */}
              <div className="p-4 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpaConsent}
                    onChange={e => setPdpaConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-sky-600 border-slate-300 dark:border-slate-600 rounded focus:ring-sky-500/30 accent-sky-600 cursor-pointer"
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
            </Card>

            {/* Step 3 Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={() => setCurrentStep(2)} type="button" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>{t('ย้อนกลับ', 'Back')}</span>
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !pdpaConsent || (category === 'withdrawal_leave' && !hasVoiceResponse)}
                className="gap-2 font-bold px-6 py-2.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('กำลังส่งคำร้องและอัปโหลดไฟล์...', 'Submitting & Uploading...')}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{t('ยืนยันนัดพบอาจารย์', 'Confirm Meeting')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
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
