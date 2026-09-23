// ============================================================
// QA / Program Chair — Qualitative Exit & Retention Analysis
// Deep diagnosis of "Why do students resign / take leave?"
// AUN-QA Criteria 6 & 8 Alignment (Student Voice + Advisor Diagnosis)
// ============================================================

import { useState, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Card, Button, Modal, StatusBadge } from '@/components/ui'
import { EXIT_REASON_CODES } from '@/types'
import type { ExitCase, ExitType } from '@/types'
import {
  Brain,
  UserX,
  Sparkles,
  Quote,
  ShieldCheck,
  HeartHandshake,
  GraduationCap,
  DollarSign,
  Compass,
  Search,
  Eye,
  CheckCircle2,
  MessageSquareHeart,
  Layers,
  Download,
  Lightbulb,
  Heart,
  Users,
  Bot,
  Send,
  Loader2,
  Copy,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react'
import {
  analyzeWithLLM,
  type AIAnalysisPayloadCase,
} from '@/services/aiService'
import { exportQualitativeExcelReport } from '@/utils/exportUtils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'


type MetricTone = 'rose' | 'amber' | 'sky' | 'purple' | 'emerald'

const metricToneStyles: Record<
  MetricTone,
  { icon: string; value: string; border: string }
> = {
  rose: {
    icon: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:border-rose-900/50',
    value: 'text-slate-950 dark:text-white',
    border: 'hover:border-rose-200 dark:hover:border-rose-900/70',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-900/50',
    value: 'text-slate-950 dark:text-white',
    border: 'hover:border-amber-200 dark:hover:border-amber-900/70',
  },
  sky: {
    icon: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/35 dark:text-sky-300 dark:border-sky-900/50',
    value: 'text-slate-950 dark:text-white',
    border: 'hover:border-sky-200 dark:hover:border-sky-900/70',
  },
  purple: {
    icon: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-900/50',
    value: 'text-slate-950 dark:text-white',
    border: 'hover:border-violet-200 dark:hover:border-violet-900/70',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900/50',
    value: 'text-slate-950 dark:text-white',
    border: 'hover:border-emerald-200 dark:hover:border-emerald-900/70',
  },
}

function MetricTile({
  label,
  value,
  icon,
  tone,
}: {
  label: ReactNode
  value: number
  icon: ReactNode
  tone: MetricTone
}) {
  const styles = metricToneStyles[tone]

  return (
    <div
      className={`min-h-[112px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] p-4 shadow-sm transition-all ${styles.border}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`h-10 w-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${styles.icon}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className={`text-2xl font-bold leading-none ${styles.value}`}>{value}</div>
          <div className="mt-2 text-[13px] font-medium leading-5 text-slate-700 dark:text-slate-300">
            {label}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QualitativeExitAnalysis() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, language, getExitReasonLabel, getExitTypeLabel } = useLanguage()
  const { isDark } = useTheme()

  // Filter states
  const [selectedExitType, setSelectedExitType] = useState<ExitType | 'all'>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [privacyMask, setPrivacyMask] = useState(true)
  const [drilldownCase, setDrilldownCase] = useState<ExitCase | null>(null)

  // AI states
  const [aiMode, setAiMode] = useState<'strategic' | 'chat'>('strategic')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<string>('Google Gemini 1.5 Flash')
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [caseAiDiagnostic, setCaseAiDiagnostic] = useState<Record<string, string>>({})
  const [caseAiLoading, setCaseAiLoading] = useState(false)

  // 1. Master System Switch
  const isSystemAiEnabled = store.systemApiConfig?.isAiApiEnabled !== false
  // 2. Per-User Authorization (Look up current user's latest hasAiAccess in store.users)
  const latestUser = store.users.find(u => u.id === currentUser?.id) || currentUser
  const isUserAiAuthorized = latestUser ? (latestUser.hasAiAccess !== false) : true
  // Both must be true
  const isAiFullyOperational = isSystemAiEnabled && isUserAiAuthorized

  // De-identified Case payloads for LLM
  const casePayloads: AIAnalysisPayloadCase[] = useMemo(() => {
    return store.exitCases.map(c => {
      const student = store.users.find(u => u.id === c.studentId)
      const assess = store.advisorAssessments.find(a => a.exitCaseId === c.id)
      const voice = store.studentVoiceResponses.find(v => v.exitCaseId === c.id || v.studentId === c.studentId)
      return {
        id: c.id,
        studentCode: student?.code || c.studentId,
        academicYear: voice?.academicYear,
        exitType: c.exitType,
        reasonCode: c.reasonCode,
        details: c.details,
        advisorAssessment: assess?.assessment,
        studentVoiceFeedback: voice?.whatCouldUniversityDoBetter || voice?.curriculumImprovementSuggestions,
      }
    })
  }, [store.exitCases, store.users, store.advisorAssessments, store.studentVoiceResponses])

  async function handleRunAiStrategicSynthesis() {
    setAiLoading(true)
    try {
      const res = await analyzeWithLLM({
        mode: 'strategic_synthesis',
        cases: casePayloads,
        language,
        userHasAiAccess: isUserAiAuthorized,
      })
      setAiResult(res.analysis)
      setAiProvider(res.provider)
      if (res.success) {
        addToast('success', t('AI วิเคราะห์สำเร็จ', 'AI Analysis Complete'), t('สร้างบทวิเคราะห์เชิงกลยุทธ์เรียบร้อยแล้ว', 'Generated strategic qualitative synthesis successfully.'))
      } else {
        addToast('warning', t('ไม่สามารถประมวลผลได้', 'Notice'), res.analysis)
      }
    } catch (err: any) {
      addToast('error', t('เกิดข้อผิดพลาด', 'Error'), err.message || t('ไม่สามารถประมวลผล AI ได้', 'AI processing failed'))
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSendAiChat(customQuery?: string) {
    const query = customQuery || chatInput
    if (!query.trim()) return

    const userMsg = { role: 'user' as const, text: query.trim(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    setAiChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setAiLoading(true)

    try {
      const res = await analyzeWithLLM({
        mode: 'chat_query',
        cases: casePayloads,
        query: userMsg.text,
        language,
        userHasAiAccess: isUserAiAuthorized,
      })
      const aiMsg = { role: 'assistant' as const, text: res.analysis, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      setAiChatMessages(prev => [...prev, aiMsg])
      setAiProvider(res.provider)
    } catch (err: any) {
      const errorMsg = { role: 'assistant' as const, text: t('ขออภัย เกิดข้อผิดพลาดในการประมวลผลคำตอบ', 'Sorry, an error occurred while processing the response.'), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      setAiChatMessages(prev => [...prev, errorMsg])
    } finally {
      setAiLoading(false)
    }
  }

  async function handleRunCaseAiDiagnostic(targetCase: ExitCase) {
    setCaseAiLoading(true)
    const singlePayload = casePayloads.filter(c => c.id === targetCase.id)
    try {
      const res = await analyzeWithLLM({
        mode: 'case_diagnostic',
        cases: singlePayload.length > 0 ? singlePayload : casePayloads.slice(0, 1),
        language,
        userHasAiAccess: isUserAiAuthorized,
      })
      setCaseAiDiagnostic(prev => ({ ...prev, [targetCase.id]: res.analysis }))
    } catch (err: any) {
      addToast('error', t('เกิดข้อผิดพลาด', 'Error'), err.message)
    } finally {
      setCaseAiLoading(false)
    }
  }


  const chartTheme = {
    grid: isDark ? '#1e293b' : '#f1f5f9',
    axis: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
  }

  // --- Visual palette:
  // Sky/Navy = primary QA interface
  // Rose = permanent withdrawal / critical attrition
  // Amber = leave of absence / temporary interruption
  // Emerald = positive action / successful intervention
  // Other theme colors are used only as small semantic icon accents.

  // --- Calculations: Why Resign vs Why Leave ---
  const withdrawalCases = useMemo(() => {
    return store.exitCases.filter(e => e.exitType === 'withdrawal' || e.exitType === 'dropout' || e.exitType === 'transfer')
  }, [store.exitCases])

  const leaveCases = useMemo(() => {
    return store.exitCases.filter(e => e.exitType === 'leave_of_absence')
  }, [store.exitCases])

  const totalDepartures = store.exitCases.length
  const withdrawalCount = withdrawalCases.length
  const leaveCount = leaveCases.length

  // Comparative reasons data for chart
  const comparativeChartData = useMemo(() => {
    return EXIT_REASON_CODES.map(r => {
      const wCount = withdrawalCases.filter(e => e.reasonCode === r.value).length
      const lCount = leaveCases.filter(e => e.reasonCode === r.value).length
      return {
        reason: language === 'th' ? r.labelTh : r.labelEn,
        rawReason: r.value,
        withdrawal: wCount,
        leave: lCount,
        total: wCount + lCount,
      }
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total)
  }, [withdrawalCases, leaveCases, language])

  // Count by thematic clusters
  const academicCount = store.exitCases.filter(e => e.reasonCode === 'academic').length
  const mentalHealthCount = store.exitCases.filter(e => e.reasonCode === 'mental_health').length
  const financialCount = store.exitCases.filter(e => e.reasonCode === 'financial').length
  const familyCount = store.exitCases.filter(e => e.reasonCode === 'personal_family' || e.reasonCode === 'health').length

  // Dynamically synthesized qualitative themes from real exit cases & student surveys
  const thematicSyntheses = useMemo(() => {
    const totalCases = store.exitCases.length || 1

    const themeDefinitions = [
      {
        key: 'academic',
        matchReason: (code: string) => code === 'academic',
        label: t('วิชาการ & หลักสูตร', 'Academic & Rigor'),
        icon: <GraduationCap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />,
        badgeTone: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-900/40',
        defaultAction: t(
          'จัด Pre-sessional Coding Boot Camp ก่อนเปิดเทอม และเพิ่มระบบเพื่อนติว (Peer Tutoring)',
          'Implement Pre-sessional Coding Boot Camp and Peer-Assisted Learning (PAL).'
        ),
      },
      {
        key: 'health_wellbeing',
        matchReason: (code: string) => code === 'mental_health' || code === 'health',
        label: t('สุขภาพจิต & สุขภาวะ', 'Mental Health & Well-being'),
        icon: <Heart className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />,
        badgeTone: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-900/40',
        defaultAction: t(
          'จัดทำ Assignment Coordination Matrix กระจายส่งงาน และเปิดช่องทางด่วนเข้าพบนักจิตบำบัด',
          'Coordinate assignment deadlines and establish student mental health fast-track.'
        ),
      },
      {
        key: 'financial',
        matchReason: (code: string) => code === 'financial',
        label: t('การเงิน & ค่าครองชีพ', 'Financial Hardship'),
        icon: <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
        badgeTone: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40',
        defaultAction: t(
          'จัดตั้ง Emergency Discretionary Relief Fund ระดับสำนักวิชา และจัดสรรตำแหน่ง TA/Student Work-Study',
          'Establish emergency relief micro-grants & expand student work-study jobs.'
        ),
      },
      {
        key: 'family_personal',
        matchReason: (code: string) => code === 'personal_family' || code === 'personal' || code === 'family',
        label: t('ครอบครัว & สุขภาพกาย', 'Family & Physical Health'),
        icon: <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
        badgeTone: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/40',
        defaultAction: t(
          'เปิดระบบ One-Stop Digital Petition สำหรับลาพัก และจัดระบบบันทึกเทปบรรยาย (Lecture Archive)',
          'Provide streamlined digital leave petition and lecture archive for recuperating students.'
        ),
      },
      {
        key: 'career_shift',
        matchReason: (code: string) => code === 'career_shift' || code === 'transfer' || code === 'career_work' || code === 'other',
        label: t('ความถนัด & เป้าหมายอาชีพ', 'Career & Major Alignment'),
        icon: <Compass className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
        badgeTone: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40',
        defaultAction: t(
          'ปรับปรุงหลักสูตรให้มี Micro-credentials / Minor Degree และการแนะแนวอาชีพเชิงรุก',
          'Introduce flexible minor tracks and proactive career advising.'
        ),
      },
    ]

    return themeDefinitions.map(def => {
      const matchingCases = store.exitCases.filter(c => def.matchReason(c.reasonCode))
      const count = matchingCases.length
      const percentage = Math.round((count / totalCases) * 100)
      const withdrawalCount = matchingCases.filter(c => c.exitType === 'withdrawal').length
      const leaveCount = matchingCases.filter(c => c.exitType === 'leave_of_absence').length

      // Pull real student statements from matching cases and matching student voice responses
      const studentVoices: Array<{ quote: string; studentName?: string; studentCode?: string }> = []
      matchingCases.forEach(c => {
        if (c.details && c.details.trim()) {
          const student = store.users.find(u => u.id === c.studentId)
          studentVoices.push({
            quote: c.details,
            studentName: student?.name,
            studentCode: student?.code,
          })
        }
        const voice = store.studentVoiceResponses.find(v => v.exitCaseId === c.id || v.studentId === c.studentId)
        if (voice?.whatCouldUniversityDoBetter && voice.whatCouldUniversityDoBetter.trim()) {
          studentVoices.push({
            quote: voice.whatCouldUniversityDoBetter,
            studentName: voice.isAnonymous ? t('ไม่ระบุตัวตน', 'Anonymous') : voice.studentCode,
          })
        }
      })

      // Pull real advisor diagnoses
      const advisorDiagnoses: Array<{ diagnosis: string; advisorName?: string }> = []
      matchingCases.forEach(c => {
        const assess = store.advisorAssessments.find(a => a.exitCaseId === c.id)
        if (assess?.assessment && assess.assessment.trim()) {
          const advisor = store.users.find(u => u.id === (assess.advisorId || c.advisorId))
          advisorDiagnoses.push({
            diagnosis: assess.assessment,
            advisorName: advisor?.name,
          })
        }
      })

      // Pull custom recommendations if recorded by advisors
      const recordedAction = matchingCases.find(c => {
        const assess = store.advisorAssessments.find(a => a.exitCaseId === c.id)
        return Boolean(assess?.recommendation || assess?.actionsTaken)
      })
      const assessObj = recordedAction ? store.advisorAssessments.find(a => a.exitCaseId === recordedAction.id) : null
      const dynamicAction = assessObj?.recommendation || assessObj?.actionsTaken || def.defaultAction

      return {
        ...def,
        count,
        percentage,
        withdrawalCount,
        leaveCount,
        studentVoices,
        advisorDiagnoses,
        action: dynamicAction,
      }
    })
  }, [store.exitCases, store.advisorAssessments, store.studentVoiceResponses, store.users, language, t])

  // Filtered cases for Explorer
  const filteredCases = useMemo(() => {
    return store.exitCases.filter(e => {
      // Type filter
      if (selectedExitType !== 'all' && e.exitType !== selectedExitType) {
        return false
      }

      // Voice survey student year lookup
      const voice = store.studentVoiceResponses.find(v => v.exitCaseId === e.id || v.studentId === e.studentId)
      if (selectedYear !== 'all') {
        if (!voice?.academicYear.toLowerCase().includes(selectedYear.toLowerCase())) {
          return false
        }
      }

      // Theme filter
      if (selectedTheme !== 'all') {
        if (selectedTheme === 'academic' && e.reasonCode !== 'academic') return false
        if (selectedTheme === 'mental_health' && e.reasonCode !== 'mental_health') return false
        if (selectedTheme === 'financial' && e.reasonCode !== 'financial') return false
        if (selectedTheme === 'family' && e.reasonCode !== 'personal_family' && e.reasonCode !== 'health') return false
        if (selectedTheme === 'career' && e.reasonCode !== 'transfer' && e.reasonCode !== 'career_work') return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const stu = store.users.find(u => u.id === e.studentId)
        const adv = store.users.find(u => u.id === e.advisorId)
        const assess = store.advisorAssessments.find(a => a.exitCaseId === e.id)
        const matchText = `${stu?.name || ''} ${stu?.code || ''} ${adv?.name || ''} ${e.details} ${assess?.assessment || ''} ${voice?.whatCouldUniversityDoBetter || ''}`.toLowerCase()
        if (!matchText.includes(q)) return false
      }

      return true
    })
  }, [store.exitCases, store.studentVoiceResponses, store.users, store.advisorAssessments, selectedExitType, selectedYear, selectedTheme, searchQuery])

  function handleExportQualitative() {
    try {
      exportQualitativeExcelReport({
        language,
        cases: filteredCases,
        users: store.users,
        studentVoiceResponses: store.studentVoiceResponses,
        advisorAssessments: store.advisorAssessments,
      })

      store.addAuditLog({
        userId: currentUser?.id || 'QA001',
        userName: currentUser?.name || 'QA Coordinator',
        userRole: currentUser?.role || 'qa_chair',
        action: 'qa_exported_data',
        description: 'Exported Qualitative Exit & Retention Analysis Report (AUN-QA Criteria 6 & 8)',
      })

      addToast(
        'success',
        t('ส่งออกรายงานการวิเคราะห์เชิงคุณภาพแล้ว', 'Qualitative Report Exported'),
        t(
          'ไฟล์รายงาน Excel (.xlsx) การวิเคราะห์เจาะลึกสาเหตุการลาออกและพักการศึกษาถูกดาวน์โหลดเรียบร้อย',
          'Qualitative retention diagnostic Excel report (.xlsx) downloaded successfully.'
        )
      )
    } catch (err: any) {
      addToast(
        'error',
        t('การส่งออกรายงานล้มเหลว', 'Export Failed'),
        err?.message || t('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel', 'Failed to generate Excel file')
      )
    }
  }

  return (
    <div className="space-y-8 text-slate-700 dark:text-slate-200 font-sans antialiased">
      {/* Top Banner: Qualitative Diagnosis Focus */}
      <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-sky-50/35 to-white dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 p-4 sm:p-5 md:p-6 shadow-premium transition-all duration-200 hover:border-sky-200/90 dark:hover:border-sky-500/35 hover:shadow-premium-hover flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600 pointer-events-none" />
        <div className="absolute left-0 top-1 bottom-0 w-1 bg-gradient-to-b from-sky-100 via-transparent to-transparent dark:from-sky-500/20 pointer-events-none" aria-hidden="true" />
        

        <div className="relative z-10 flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
          <div className="h-14 w-14 sm:h-16 sm:w-16 md:h-18 md:w-18 rounded-2xl bg-white/80 dark:bg-sky-950/50 border-2 border-sky-100 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 flex items-center justify-center flex-shrink-0 shadow-sm ring-4 ring-sky-50/80 dark:ring-sky-500/10 transition-transform duration-200 group-hover:scale-[1.03]">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {t('การวิเคราะห์ปัญหาเชิงคุณภาพ: ทำไมเด็กลาออก / พักการศึกษา?', 'Qualitative Analysis: Why Do Students Resign or Take Leave?')}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800">
                <Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                AUN-QA Criteria 6.4 & 8.3
              </span>
            </div>
            <p className="max-w-4xl text-sm sm:text-base leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              {t(
                'จำแนกและวิเคราะห์เจาะลึกสาเหตุรากเหง้า (Root Causes) เปรียบเทียบระหว่างกลุ่ม "ขอลาออกถาวร" (ไม่ถนัดในสาขา/เป้าหมายเปลี่ยน) กับกลุ่ม "ขอพักการศึกษาชั่วคราว" (ภาระครอบครัว/สุขภาพจิต) โดยสังเคราะห์จากคำพูดจริงของนักศึกษาและผลวินิจฉัยของอาจารย์ที่ปรึกษา',
                'In-depth comparative root-cause diagnosis contrasting Permanent Withdrawals (foundation gaps / career redirection) against Temporary Leaves of Absence (family caregiving / burnout), synthesizing student voices with faculty advisor evaluations.'
              )}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 flex-shrink-0 self-start xl:self-auto">
          <Button variant="secondary" size="sm" onClick={handleExportQualitative} className="bg-white/85 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/25 text-slate-700 dark:text-slate-300 shadow-xs">
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            {t('ส่งออกรายงานวิเคราะห์เชิงคุณภาพ', 'Export Qualitative Audit')}
          </Button>
        </div>
      </div>
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricTile
          label={t('ขอลาออกถาวร (Withdrawal)', 'Permanent Withdrawal')}
          value={withdrawalCount}
          icon={<UserX className="h-[18px] w-[18px]" />}
          tone="rose"
        />
        <MetricTile
          label={t('ขอพักการศึกษา (Leave)', 'Leave of Absence')}
          value={leaveCount}
          icon={<HeartHandshake className="h-[18px] w-[18px]" />}
          tone="amber"
        />
        <MetricTile
          label={t('ปัญหาหลักสูตร / วิชาการ', 'Academic / Rigor')}
          value={academicCount}
          icon={<GraduationCap className="h-[18px] w-[18px]" />}
          tone="sky"
        />
        <MetricTile
          label={t('สุขภาพจิต & ความเครียด', 'Mental Health & Stress')}
          value={mentalHealthCount}
          icon={<Brain className="h-[18px] w-[18px]" />}
          tone="purple"
        />
        <MetricTile
          label={t('ปัญหาเศรษฐกิจ / การเงิน', 'Financial Hardship')}
          value={financialCount}
          icon={<DollarSign className="h-[18px] w-[18px]" />}
          tone="emerald"
        />
        <MetricTile
          label={t('ครอบครัว / สุขภาพกาย', 'Family & Physical')}
          value={familyCount}
          icon={<Users className="h-[18px] w-[18px]" />}
          tone="sky"
        />
      </div>

      {/* ============================================================ */}
      {/* AI QUALITATIVE ANALYSIS (POWERED BY LLM) */}
      {/* ============================================================ */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] overflow-hidden shadow-sm relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-sky-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {t('ผู้ช่วย AI วิเคราะห์ปัญหาเชิงคุณภาพ', 'AI Qualitative Analysis')}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {aiProvider}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('ประมวลผลข้อความเชิงคุณภาพ สังเคราะห์ Root Causes และให้คำปรึกษาประธานหลักสูตรตามเกณฑ์ AUN-QA', 'LLM-powered thematic reasoning, root-cause diagnostics, and accreditation guidance.')}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleRunAiStrategicSynthesis()}
              disabled={aiLoading || !isAiFullyOperational}
              className="cursor-pointer shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t('AI กำลังวิเคราะห์...', 'Analyzing...')}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {t('วิเคราะห์ภาพรวมเชิงกลยุทธ์ด้วย AI', 'Generate AI Synthesis')}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Level 1: System Admin Disabled Notice */}
        {!isSystemAiEnabled && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">
                  {t('ระบบ AI ถูกปิดการใช้งานชั่วคราวโดยผู้ดูแลระบบ', 'AI system is currently disabled by System Administrator')}
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                  {t('ผู้ดูแลระบบได้ปิดสวิตช์ AI API ไว้ หากต้องการใช้งานกรุณาแจ้งผู้ดูแลระบบเพื่อเปิดสวิตช์ที่ Admin Console', 'API calls are paused platform-wide. Please request the administrator to re-enable in Admin Console.')}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 self-start sm:self-auto uppercase tracking-wide">
              {t('ระงับบริการชั่วคราว', 'Paused')}
            </span>
          </div>
        )}

        {/* Level 2: Per-User Access Revoked Notice */}
        {isSystemAiEnabled && !isUserAiAuthorized && (
          <div className="mb-4 p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold">
                  {t('บัญชีของคุณไม่ได้รับสิทธิ์เข้าถึงระบบ AI', 'Your account does not have AI authorization')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('ผู้ดูแลระบบได้จำกัดสิทธิ์การใช้งาน AI ของบัญชีนี้ไว้ หากจำเป็นต้องใช้งานกรุณาติดต่อผู้ดูแลระบบเพื่อขออนุมัติสิทธิ์ที่หน้าจัดการผู้ใช้งาน', 'The administrator has restricted AI access for your user account. Please request authorization in User Management.')}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 self-start sm:self-auto uppercase tracking-wide">
              {t('ไม่มีสิทธิ์ใช้งาน', 'Unauthorized')}
            </span>
          </div>
        )}

        {/* AI Modes Toggle */}


        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setAiMode('strategic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              aiMode === 'strategic'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t('บทวิเคราะห์เชิงกลยุทธ์ (Strategic Synthesis)', 'Strategic Synthesis')}</span>
          </button>

          <button
            type="button"
            onClick={() => setAiMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              aiMode === 'chat'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>{t('ถาม-ตอบกับ AI', 'AI Q&A')}</span>
            {aiChatMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-sky-200/50 text-sky-900 font-bold">
                {aiChatMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* View Mode A: Strategic Synthesis */}
        {aiMode === 'strategic' && (
          <div className="space-y-3">
            {aiResult ? (
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-sky-100 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{t('วิเคราะห์สังเคราะห์จากเคสทั้งหมดในระบบ', 'Synthesized across all cohort departure records')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult)
                      addToast('success', t('คัดลอกแล้ว', 'Copied'), t('คัดลอกบทวิเคราะห์ AI ไปยังคลิปบอร์ดแล้ว', 'Copied AI analysis to clipboard.'))
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{t('คัดลอก', 'Copy')}</span>
                  </button>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-6 text-slate-800 dark:text-slate-200 whitespace-pre-line">
                  {aiResult}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-dashed border-sky-200 dark:border-slate-800 space-y-3 p-4">
                <div className="h-10 w-10 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {t('ยังไม่ได้สร้างบทวิเคราะห์เชิงกลยุทธ์รอบปัจจุบัน', 'No current AI synthesis generated yet')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('คลิกปุ่ม "วิเคราะห์ภาพรวมเชิงกลยุทธ์ด้วย AI" ด้านบน เพื่อให้ LLM ประมวลผลเคสทั้งหมดและร่างข้อเสนอแนะส่งประธานหลักสูตร', 'Click "Generate AI Synthesis" to evaluate departure causes and formulate AUN-QA interventions.')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleRunAiStrategicSynthesis()}
                  disabled={aiLoading}
                  className="cursor-pointer mx-auto"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {t('วิเคราะห์ภาพรวมเชิงกลยุทธ์ด้วย AI', 'Generate AI Synthesis')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* View Mode B: Interactive AI Chat */}
        {aiMode === 'chat' && (
          <div className="space-y-3">
            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" />
                {t('คำถามแนะนำ:', 'Suggested Prompts:')}
              </span>
              {[
                { labelTh: 'ทำไมเด็กปี 1 ถึงลาออกเยอะ?', labelEn: 'Why do Year 1 students resign?' },
                { labelTh: 'เปรียบเทียบสาเหตุการลาออกกับการพักการศึกษา', labelEn: 'Compare withdrawal vs leave drivers' },
                { labelTh: 'เสนอแนวทางปรับปรุงวิชาการเขียนโปรแกรมปี 1', labelEn: 'Recommendations for Year 1 programming' },
                { labelTh: 'วิเคราะห์ความเสี่ยงด้านสุขภาพจิตและภาวะหมดไฟ', labelEn: 'Evaluate mental health & burnout risk' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendAiChat(language === 'th' ? chip.labelTh : chip.labelEn)}
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 transition-all cursor-pointer shadow-2xs"
                >
                  {language === 'th' ? chip.labelTh : chip.labelEn}
                </button>
              ))}
            </div>

            {/* Chat History Container */}
            <div className="max-h-80 overflow-y-auto space-y-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/70 dark:border-slate-800">
              {aiChatMessages.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 space-y-1.5">
                  <Bot className="h-7 w-7 mx-auto text-sky-500 opacity-60" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    {t('ระบบ AI พร้อมตอบคำถามเชิงคุณภาพเกี่ยวกับข้อมูลนักศึกษา', 'AI is ready to analyze qualitative student data.')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {t('พิมพ์คำถามหรือเลือกหัวข้อแนะนำด้านบนเพื่อเริ่มสนทนา', 'Type a question or click a suggested prompt above.')}
                  </p>
                </div>
              ) : (
                aiChatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                        msg.role === 'user'
                          ? 'bg-sky-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs whitespace-pre-line'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-70 text-[10px]">
                        <span>{msg.role === 'user' ? t('ประธานหลักสูตร / QA', 'Program Chair / QA') : 'AdvisingLog AI'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))
              )}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
                    <span>{t('AI กำลังอ่านเคสและประมวลคำตอบ...', 'AI is synthesizing departure records...')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault()
                handleSendAiChat()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={t('พิมพ์คำถามเชิงคุณภาพ เช่น ทำไมเด็กถึงหมดไฟ, วิชาไหนยากที่สุด...', 'Ask qualitative questions e.g. Why are students burning out, which subjects struggle most...')}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={aiLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={aiLoading || !chatInput.trim()}
                className="cursor-pointer flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {t('ส่งคำถาม', 'Send')}
              </Button>
            </form>
          </div>
        )}
      </Card>

      {/* ============================================================ */}
      {/* SECTION 1: COMPARATIVE "WHY RESIGN VS WHY LEAVE" MATRIX */}
      {/* ============================================================ */}
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t('เปรียบเทียบสาเหตุ: "ทำไมเด็กลาออก?" VS "ทำไมเด็กขอพักการศึกษา?"', 'Comparative Matrix: Why Students Resign vs. Why They Take Leave')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t(
                'ความแตกต่างของสาเหตุหลักและมาตรการช่วยเหลือระหว่างการลาออกถาวรและการขอพักการศึกษาชั่วคราว',
                'Critical divergence in root drivers and intervention paths between permanent departures and temporary leaves.'
              )}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-3 py-1 rounded-full border border-sky-200/60 dark:border-sky-500/20 self-start sm:self-auto">
            {t(`รวมทั้งหมด ${totalDepartures} เคส`, `Total ${totalDepartures} Cases`)}
          </span>
        </div>

        {/* Side-by-side Comparative Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* Column A: Withdrawal (ทำไมลาออก) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-rose-500">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center flex-shrink-0">
                  <UserX className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('กลุ่มขอลาออกถาวร (Permanent Withdrawal / Drop-out)', 'Permanent Withdrawal / Drop-out')}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t(`พบ ${withdrawalCount} เคส (${totalDepartures > 0 ? Math.round((withdrawalCount / totalDepartures) * 100) : 0}% ของเคสออกทั้งหมด)`, `${withdrawalCount} cases (${totalDepartures > 0 ? Math.round((withdrawalCount / totalDepartures) * 100) : 0}% of all departures)`)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
                {t('ความเสี่ยงตกหล่น', 'Attrition Risk')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Point 1 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {t('อันดับ 1: ความยากของหลักสูตร / ไม่ตรงความถนัด (Foundation Gap)', 'Rank 1: Curriculum Rigor & Foundation Gap')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded">
                    ~50%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'นักศึกษาปี 1 ที่ไม่มีพื้นฐานการเขียนโปรแกรม/ตรรกะคณิตศาสตร์มาก่อน เรียนตามไม่ทันในวิชาแกน ภาระงานหนักและปรับตัวกับความเร็วการสอนไม่ทัน จนเกิดความท้อแท้และตัดสินใจลาออก',
                    'First-year students lacking prior coding background struggle with rapid lecture pacing in core programming, triggering severe demoralization and departure.'
                  )}
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-300 italic leading-6 bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-rose-400 leading-6">
                  "{t('วิชาเขียนโปรแกรมปี 1 สอนเร็วมาก การบ้านหนักสำหรับคนไม่มีพื้นฐาน อยากให้มีวิชาปรับพื้นฐานหรือติวเสริมเข้มข้น', 'Programming pace was too fast with heavy homework for beginners without prior tech experience.')}"
                </div>
              </div>

              {/* Point 2 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {t('อันดับ 2: ค้นพบเป้าหมายอาชีพใหม่ / ย้ายสาขา (Career Redirection)', 'Rank 2: Career Path Redirection')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded">
                    ~30%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'ค้นพบว่าไม่ชอบงานด้านเขียนโค้ดเชิงลึก แต่สนใจงานสร้างสรรค์ เช่น Graphic Design, Animation, หรือ Digital Marketing จึงลาออกเพื่อไปศึกษาต่อสาขาอื่น',
                    'Realization of misalignment with deep software engineering, opting to transfer toward Digital Media Arts or Design.'
                  )}
                </p>
              </div>

              {/* Point 3 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {t('อันดับ 3: วิกฤตเศรษฐกิจครอบครัวระยะยาว (Financial Crisis)', 'Rank 3: Long-term Financial Hardship')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded">
                    ~20%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'ครอบครัวสูญเสียรายได้หลักกะทันหัน นักศึกษาจำเป็นต้องออกไปทำงานประจำเต็มเวลาเพื่อหารายได้จุนเจือ ไม่สามารถเรียนควบคู่ได้',
                    'Severe household income shock compelling the student to seek full-time employment to support dependents.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Column B: Leave of Absence (ทำไมพักการศึกษา) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-slate-200/80 dark:border-slate-700/70 text-amber-600 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t('กลุ่มขอพักการศึกษาชั่วคราว (Leave of Absence)', 'Temporary Leave of Absence')}
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t(`พบ ${leaveCount} เคส (${totalDepartures > 0 ? Math.round((leaveCount / totalDepartures) * 100) : 0}% ของเคสออกทั้งหมด)`, `${leaveCount} cases (${totalDepartures > 0 ? Math.round((leaveCount / totalDepartures) * 100) : 0}% of all departures)`)}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700/70">
                {t('โอกาสรักษาผู้เรียน 100%', '100% Retention Target')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Point 1 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {t('อันดับ 1: ภาระครอบครัวกะทันหัน / ดูแลผู้ป่วย (Family Caregiving)', 'Rank 1: Family Caregiving & Obligations')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                    ~50%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'บิดามารดาหรือคนในครอบครัวเจ็บป่วยเรื้อรัง ต้องกลับไปช่วยดูแลที่ต่างจังหวัด นักศึกษามีผลการเรียนดีและมีเจตนารมณ์จะกลับมาเรียนต่ออย่างแน่นอน',
                    'Parental acute or chronic illness necessitating hometown caregiving. Students maintain solid GPA and express firm intent to return.'
                  )}
                </p>
                <div className="text-xs text-slate-600 dark:text-slate-300 italic leading-6 bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-lg border-l-2 border-amber-400 leading-6">
                  "{t('คุณแม่ป่วยเรื้อรัง ต้องกลับไปช่วยดูแลอย่างใกล้ชิด วางแผนจะกลับมาศึกษาต่อในปีการศึกษาถัดไปแน่นอน', 'Taking leave to nurse an ill parent at hometown; planning to return next academic year without fail.')}"
                </div>
              </div>

              {/* Point 2 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {t('อันดับ 2: สุขภาพจิต & ภาวะหมดไฟสะสม (Mental Health & Burnout)', 'Rank 2: Mental Health & Burnout Recovery')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                    ~30%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'ภาวะเครียดสะสมรุนแรง วิตกกังวลต่อการสอบ และนอนไม่หลับเรื้อรัง แพทย์แนะนำให้พักฟื้นและบำบัด 1 ภาคการศึกษาก่อนกลับเข้าสู่ระบบเรียน',
                    'Clinical burnout, insomnia, and acute exam anxiety. Psychiatrists recommend 1 semester medical recuperation leave.'
                  )}
                </p>
              </div>

              {/* Point 3 */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {t('อันดับ 3: ปัญหาสุขภาพทางกาย / อุบัติเหตุ (Physical Health / Surgery)', 'Rank 3: Physical Health & Surgery Recovery')}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 px-1.5 py-0.5 rounded">
                    ~20%
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-6">
                  {t(
                    'การผ่าตัดเอ็นข้อเข่าหรือการรักษาพยาบาลต่อเนื่อง 4-6 เดือน ไม่สามารถเดินทางมาเรียนได้สะดวก มีใบรับรองแพทย์ชัดเจน',
                    'Orthopedic surgical recovery or prolonged medical treatment requiring temporary hiatus from on-campus attendance.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparative Bar Chart: Reasons by Exit Type */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight mb-3 flex items-center gap-2">
            <BarChart className="h-4 w-4 text-sky-600" />
            {t('กราฟเปรียบเทียบสัดส่วนสาเหตุแยกตามประเภทการออก (Withdrawal vs. Leave of Absence)', 'Reasons Comparison by Exit Type')}
          </h4>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparativeChartData}
                margin={{ left: 0, right: 24, top: 14, bottom: 4 }}
                barGap={6}
                barCategoryGap="22%"
              >
                <defs>
                  <linearGradient id="compWithdrawalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                  <linearGradient id="compLeaveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="reason"
                  tick={{ fontSize: 11, fill: chartTheme.axis }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.grid }}
                  interval={0}
                  height={54}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: chartTheme.axis }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', radius: 8 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null
                    return (
                      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md min-w-[210px] text-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          {label}
                        </div>
                        <div className="space-y-1.5">
                          {payload.map((entry: any, i: number) => {
                            const c = entry.dataKey === 'withdrawal' ? '#e11d48' : '#d97706'
                            return (
                              <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                                  <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                                </div>
                                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                                  {entry.value} {t('เคส', 'cases')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '16px', fontSize: '11px' }}
                  formatter={(val, entry: any) => {
                    const c = entry.dataKey === 'withdrawal' ? '#e11d48' : '#d97706'
                    return (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mr-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                        {val}
                      </span>
                    )
                  }}
                />
                <Bar
                  dataKey="withdrawal"
                  name={t('ขอลาออกถาวร (Withdrawal)', 'Permanent Withdrawal')}
                  fill="url(#compWithdrawalGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="leave"
                  name={t('ขอพักการศึกษา (Leave of Absence)', 'Leave of Absence')}
                  fill="url(#compLeaveGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* SECTION 2: THEMATIC QUALITATIVE SYNTHESIS (DYNAMIC THEMES) */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Quote className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t('การสังเคราะห์ปัญหาเชิงคุณภาพจำแนกตามแกนปัญหา (Thematic Root-Cause Synthesis)', 'Thematic Qualitative Problem Synthesis')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                'ประมวลผลเสียงสะท้อนจริงของนักศึกษา (Student Voice) ประกบผลวินิจฉัยของอาจารย์ที่ปรึกษา (Advisor Diagnostic) จากฐานข้อมูลระบบ',
                'Synthesizing authentic Student Verbatim Voices with Faculty Advisor Assessments and Continuous Quality Improvement (CQI) actions.'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {thematicSyntheses.map(theme => {
            const hasCases = theme.count > 0
            const primaryVoice = theme.studentVoices[0]
            const primaryDiagnosis = theme.advisorDiagnoses[0]

            return (
              <div
                key={theme.key}
                className="bg-white dark:bg-[#0e1424] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-sky-200 dark:hover:border-sky-900/60 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header: Category & Metric */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5">
                      {theme.icon}
                      {theme.label}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${theme.badgeTone}`}>
                      {theme.count} {t('เคส', 'Cases')} ({theme.percentage}%)
                    </span>
                  </div>

                  {/* Sub breakdown: Withdrawals vs Leaves */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {theme.withdrawalCount} {t('ลาออก', 'Withdrawal')}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {theme.leaveCount} {t('ลาพัก', 'Leave')}
                    </span>
                  </div>

                  {/* Real Student Voice */}
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm space-y-1.5">
                    <div className="font-semibold text-sky-700 dark:text-sky-300 text-xs flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Quote className="h-3.5 w-3.5" />
                        {t('เสียงสะท้อนนักศึกษา (Student Voice):', 'Student Voice:')}
                      </span>
                      {primaryVoice?.studentCode && (
                        <span className="text-[10px] font-mono font-normal text-slate-400">
                          {privacyMask ? 'ID Masked' : primaryVoice.studentCode}
                        </span>
                      )}
                    </div>
                    {primaryVoice ? (
                      <p className="text-slate-700 dark:text-slate-200 italic leading-relaxed text-xs">
                        "{primaryVoice.quote}"
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 text-xs italic">
                        {t('ไม่มีเสียงสะท้อนข้อความสำหรับหมวดนี้', 'No written verbatim recorded for this theme.')}
                      </p>
                    )}
                  </div>

                  {/* Real Advisor Diagnosis */}
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs sm:text-sm space-y-1.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        {t('การวินิจฉัยของอาจารย์ที่ปรึกษา:', 'Advisor Evaluation:')}
                      </span>
                      {primaryDiagnosis?.advisorName && (
                        <span className="text-[10px] font-normal text-slate-400">
                          {primaryDiagnosis.advisorName}
                        </span>
                      )}
                    </div>
                    {primaryDiagnosis ? (
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                        {primaryDiagnosis.diagnosis}
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500 text-xs italic">
                        {hasCases
                          ? t('รอการบันทึกการวินิจฉัยเพิ่มเติมจากอาจารย์', 'Awaiting advisor diagnostic notes.')
                          : t('ไม่มีเคสรายงานในหมวดหมู่นี้', 'No reported cases under this theme.')}
                      </p>
                    )}
                  </div>
                </div>

                {/* CQI Action Recommendation */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('มาตรการแก้ไข AUN-QA Criteria 6.4:', 'AUN-QA CQI Action:')}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {theme.action}
                  </p>
                </div>
              </div>
            )
          })}

          {/* Executive Synthesis Summary Card */}
          <div className="bg-white dark:bg-[#0e1424] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-900/60 transition-all">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-semibold text-xs">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                {t('บทสรุปข้อเสนอแนะเชิงกลยุทธ์ (Chair Executive Action)', 'Chair Executive Strategic Action')}
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {t('ภาพรวมสถิติและมาตรการยกระดับอัตราคงอยู่', 'Cohort Attrition Summary & Action Priorities')}
              </h4>

              <div className="grid grid-cols-2 gap-2 py-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('เคสขอออก/พักทั้งหมด', 'Total Exit Cases')}</p>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{store.exitCases.length} {t('ราย', 'cases')}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('เสียงสะท้อนนักศึกษา', 'Student Voices')}</p>
                  <p className="text-base font-bold text-sky-600 dark:text-sky-400 mt-0.5">{store.studentVoiceResponses.length} {t('ชุด', 'surveys')}</p>
                </div>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 dark:text-sky-400 font-bold">1.</span>
                  <span>{t('จัดค่ายปรับพื้นฐานการเขียนโค้ด (Coding Boot Camp) เสริมทักษะนักศึกษาปี 1', 'Mandate pre-sessional coding boot camp for first-year cohorts.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 dark:text-sky-400 font-bold">2.</span>
                  <span>{t('เชื่อมต่อระบบ Early Warning เพื่อแจ้งเตือนอาจารย์ที่ปรึกษาเมื่อพบสัญญาณขาดเรียน', 'Trigger proactive Early Warning advising on attendance drop.')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-sky-600 dark:text-sky-400 font-bold">3.</span>
                  <span>{t('ติดตามนักศึกษาที่ขอพักการศึกษาให้กลับมารายงานตัวตามแผนการศึกษา', 'Provide dedicated study roadmaps for students on hiatus.')}</span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{t('เป้าหมาย Retention: > 92%', 'Retention Target: > 92%')}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">AUN-QA Criterion 8</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3: INTERACTIVE CASE-BY-CASE QUALITATIVE EXPLORER */}
      {/* ============================================================ */}
      <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {t('สำรวจเคสและเจาะลึกปัญหาเชิงคุณภาพรายกรณี (Qualitative Case Explorer)', 'Case-by-Case Qualitative Problem Explorer')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('สืบค้นและวิเคราะห์สาเหตุแท้จริงของนักศึกษาแต่ละเคส พร้อมทั้งเสียงสะท้อนและการช่วยเหลือของอาจารย์', 'Filterable individual exit cases linking stated reasons, advisor interventions, and verbatim feedback.')}
            </p>
          </div>

          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={() => setPrivacyMask(!privacyMask)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all self-start md:self-auto cursor-pointer"
          >
            <ShieldCheck className={`h-4 w-4 ${privacyMask ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <span>{privacyMask ? t('คุ้มครองข้อมูลส่วนบุคคล (PDPA Masked)', 'PDPA Masked') : t('แสดงชื่อ-สกุลจริง (Revealed)', 'Full Names Revealed')}</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('ค้นหาคีย์เวิร์ด, รหัสนักศึกษา, อาการ...', 'Search keyword, code, diagnostic...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Exit Type Filter */}
          <div>
            <select
              value={selectedExitType}
              onChange={e => setSelectedExitType(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
            >
              <option value="all">{t('ทุกประเภทคำร้อง (All Types)', 'All Exit Types')}</option>
              <option value="withdrawal">{t('ขอลาออกถาวร (Withdrawal)', 'Withdrawal')}</option>
              <option value="leave_of_absence">{t('ขอพักการศึกษา (Leave of Absence)', 'Leave of Absence')}</option>
              <option value="transfer">{t('ขอโอนย้ายสถาบัน (Institution Transfer)', 'Institution Transfer')}</option>
              <option value="dropout">{t('พ้นสภาพนักศึกษา (Dropout)', 'Dropout')}</option>
            </select>
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
            >
              <option value="all">{t('ทุกชั้นปี (All Years)', 'All Academic Years')}</option>
              <option value="Year 1">{t('ชั้นปีที่ 1 (Year 1)', 'Year 1')}</option>
              <option value="Year 2">{t('ชั้นปีที่ 2 (Year 2)', 'Year 2')}</option>
              <option value="Year 3">{t('ชั้นปีที่ 3 (Year 3)', 'Year 3')}</option>
              <option value="Year 4">{t('ชั้นปีที่ 4 (Year 4)', 'Year 4')}</option>
            </select>
          </div>

          {/* Thematic Filter */}
          <div>
            <select
              value={selectedTheme}
              onChange={e => setSelectedTheme(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer"
            >
              <option value="all">{t('ทุกหมวดปัญหา (All Themes)', 'All Problem Themes')}</option>
              <option value="academic">{t('ด้านวิชาการ/หลักสูตร', 'Academic Rigor')}</option>
              <option value="mental_health">{t('ด้านสุขภาพจิต/ความเครียด', 'Mental Health')}</option>
              <option value="financial">{t('ด้านการเงิน/ค่าครองชีพ', 'Financial')}</option>
              <option value="family">{t('ด้านครอบครัว/สุขภาพกาย', 'Family & Health')}</option>
              <option value="career">{t('ด้านความถนัด/เป้าหมายอาชีพ', 'Career & Transfer')}</option>
            </select>
          </div>
        </div>

        {/* Case Cards Grid */}
        <div className="space-y-3.5">
          {filteredCases.length > 0 ? (
            filteredCases.map(c => {
              const student = store.users.find(u => u.id === c.studentId)
              const advisor = store.users.find(u => u.id === c.advisorId)
              const assessment = store.advisorAssessments.find(a => a.exitCaseId === c.id)
              const voice = store.studentVoiceResponses.find(v => v.exitCaseId === c.id || v.studentId === c.studentId)

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-sm space-y-4"
                >
                  {/* Top Bar: Badges + Student Code */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        if (c.exitType === 'transfer') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200/80 dark:border-purple-800">
                              <span className="inline-flex items-center gap-1.5">
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                {t('ขอโอนย้ายสถาบัน', 'Institution Transfer')}
                              </span>
                            </span>
                          )
                        }
                        if (c.exitType === 'dropout') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800">
                              <span className="inline-flex items-center gap-1.5">
                                <UserX className="h-3.5 w-3.5" />
                                {t('พ้นสภาพนักศึกษา', 'Dropout')}
                              </span>
                            </span>
                          )
                        }
                        if (c.exitType === 'leave_of_absence') {
                          return (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800">
                              <span className="inline-flex items-center gap-1.5">
                                <HeartHandshake className="h-3.5 w-3.5" />
                                {t('ขอพักการศึกษา', 'Leave of Absence')}
                              </span>
                            </span>
                          )
                        }
                        return (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800">
                            <span className="inline-flex items-center gap-1.5">
                              <UserX className="h-3.5 w-3.5" />
                              {t('ขอลาออกถาวร', 'Withdrawal')}
                            </span>
                          </span>
                        )
                      })()}

                      <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {privacyMask ? (student?.code || c.studentId) : `${student?.name} (${student?.code})`}
                      </span>

                      {voice?.academicYear && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          • {voice.academicYear}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/20">
                        {getExitReasonLabel(c.reasonCode)}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>

                  {/* Why? Qualitative Comparison Box */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    {/* Left: What Student Stated */}
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">
                        {t('เหตุผลที่นักศึกษาระบุ (Student Voice Details):', 'Student Stated Reason:')}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        "{c.details}"
                      </p>
                      {voice?.whatCouldUniversityDoBetter && (
                        <p className="text-[11px] text-sky-700 dark:text-sky-300 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 mt-1.5 flex items-center gap-1.5">
                          <Lightbulb className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span>{t('สิ่งที่อยากให้ ม. ปรับปรุง:', 'University Feedback:')} "{voice.whatCouldUniversityDoBetter}"</span>
                        </p>
                      )}
                    </div>

                    {/* Right: Advisor Assessment */}
                    <div className="p-4 bg-white dark:bg-slate-800/40 rounded-xl border border-sky-200/80 dark:border-sky-900/50 space-y-2">
                      <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wider flex items-center justify-between">
                        <span>{t('การวินิจฉัยของอาจารย์ที่ปรึกษา:', 'Advisor Diagnostic:')}</span>
                        <span className="font-medium text-[10px] text-slate-400">{advisor?.name}</span>
                      </span>
                      {assessment ? (
                        <>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            {assessment.assessment}
                          </p>
                          {assessment.recommendation && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 pt-1 border-t border-sky-100/80 dark:border-sky-900/40 mt-1.5 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                              <span>{t('ข้อเสนอแนะ:', 'Recommendation:')} {assessment.recommendation}</span>
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 italic">
                          {t('รออาจารย์ที่ปรึกษาบันทึกผลการประเมิน', 'Pending advisor formal assessment filing.')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Drilldown trigger */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-medium mr-1">{t('แท็กปัญหา:', 'Root Tags:')}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                        #{c.reasonCode}
                      </span>
                      {c.exitType === 'leave_of_absence' ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px]">
                          #ReEntryPlanned
                        </span>
                      ) : c.exitType === 'transfer' ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px]">
                          #TransferOut
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-[10px]">
                          #PermanentDeparture
                        </span>
                      )}
                      {c.preferredEffectiveDate && (
                        <span className="text-xs text-slate-400">
                          • {t('วันที่มีผล:', 'Effective:')} {c.preferredEffectiveDate}
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDrilldownCase(c)}
                      className="cursor-pointer"
                    >
                      <Eye className="h-3 w-3 mr-1 text-sky-600 dark:text-sky-400" />
                      {t('ดูผลวินิจฉัยฉบับเต็ม', 'Full Diagnostic Profile')}
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-10 text-xs text-slate-400">
              {t('ไม่พบข้อมูลเคสที่ตรงกับเงื่อนไขการค้นหา', 'No exit cases found matching selected filters.')}
            </div>
          )}
        </div>
      </Card>

      {/* ============================================================ */}
      {/* MODAL: COMPLETE QUALITATIVE DIAGNOSTIC PROFILE */}
      {/* ============================================================ */}
      {drilldownCase && (
        <Modal
          isOpen={!!drilldownCase}
          onClose={() => setDrilldownCase(null)}
          title={t('แฟ้มประเมินปัญหาเชิงคุณภาพกรณีขอลาออก / ลาพัก', 'Full Qualitative Exit Diagnostic Profile')}
          size="lg"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">{t('นักศึกษา', 'Student')}</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {privacyMask
                    ? store.users.find(u => u.id === drilldownCase.studentId)?.code
                    : store.users.find(u => u.id === drilldownCase.studentId)?.name}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{t('อาจารย์ที่ปรึกษา', 'Advisor')}</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {store.users.find(u => u.id === drilldownCase.advisorId)?.name}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{t('ประเภทคำร้อง', 'Exit Type')}</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {getExitTypeLabel(drilldownCase.exitType)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">{t('สาเหตุหลัก', 'Primary Reason')}</span>
                <p className="font-bold text-sky-700 dark:text-sky-400 mt-0.5">
                  {getExitReasonLabel(drilldownCase.reasonCode)}
                </p>
              </div>
            </div>

            {/* Stated Reason */}
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                {t('คำอธิบายเหตุผลของนักศึกษา (Verbatim Student Voice)', 'Verbatim Student Voice')}
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/80 leading-relaxed italic">
                "{drilldownCase.details}"
              </p>
            </div>

            {/* Voluntary Student Voice Survey Details (if available) */}
            {(() => {
              const voice = store.studentVoiceResponses.find(
                v => v.exitCaseId === drilldownCase.id || v.studentId === drilldownCase.studentId
              )
              if (!voice) return null

              return (
                <div className="p-3.5 bg-sky-50/50 dark:bg-sky-950/30 rounded-xl border border-slate-200/80 dark:border-slate-700/70 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/70 pb-2">
                    <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                      <MessageSquareHeart className="h-4 w-4 text-sky-600" />
                      {t('แบบประเมินประสบการณ์ของนักศึกษา (Student Voice Survey)', 'Student Voice Survey Response')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                      AUN-QA Criteria 6 & 8
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    <div>{t('หลักสูตร:', 'Curriculum:')} <strong className="text-sky-700 dark:text-sky-300">{voice.ratings?.curriculumRelevance ?? 4}/5</strong></div>
                    <div>{t('การสอน:', 'Teaching:')} <strong className="text-sky-700 dark:text-sky-300">{voice.ratings?.teachingQuality ?? 4}/5</strong></div>
                    <div>{t('อาจารย์ที่ปรึกษา:', 'Advisor:')} <strong className="text-sky-700 dark:text-sky-300">{voice.ratings?.advisorSupport ?? 5}/5</strong></div>
                    <div>{t('การบริการ:', 'Services:')} <strong className="text-sky-700 dark:text-sky-300">{voice.ratings?.universityServices ?? 4}/5</strong></div>
                    <div>{t('ภาพรวม:', 'Overall:')} <strong className="text-sky-700 dark:text-sky-300">{voice.ratings?.overallExperience ?? 4}/5</strong></div>
                  </div>

                  {voice.curriculumImprovementSuggestions && (
                    <div className="pt-1.5 text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-sky-800 dark:text-sky-300 block text-xs">{t('ข้อเสนอแนะต่อหลักสูตร:', 'Curriculum Suggestion:')}</span>
                      <p className="italic">"{voice.curriculumImprovementSuggestions}"</p>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Advisor Evaluation */}
            {(() => {
              const assess = store.advisorAssessments.find(a => a.exitCaseId === drilldownCase.id)
              if (!assess) {
                return (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-400 italic">
                    {t('ยังไม่มีบันทึกการประเมินจากอาจารย์ที่ปรึกษา', 'No advisor assessment filed.')}
                  </div>
                )
              }

              return (
                <div className="space-y-2.5 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t('ผลการวินิจฉัยเชิงลึกของอาจารย์ที่ปรึกษา', 'Advisor Formal Diagnostic Assessment')}
                  </span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <div>
                      <span className="text-slate-400 font-medium block text-xs">{t('ผลการสัมภาษณ์และประเมิน:', 'Interview Evaluation:')}</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{assess.assessment}</p>
                    </div>
                    {assess.contributingFactors && (
                      <div>
                        <span className="text-slate-400 font-medium block text-xs">{t('ปัจจัยแวดล้อมที่ส่งผล:', 'Contributing Factors:')}</span>
                        <p className="text-slate-700 dark:text-slate-300">{assess.contributingFactors}</p>
                      </div>
                    )}
                    {assess.actionsTaken && (
                      <div>
                        <span className="text-slate-400 font-medium block text-xs">{t('มาตรการที่ได้ดำเนินการแล้ว:', 'Actions Taken:')}</span>
                        <p className="text-slate-700 dark:text-slate-300">{assess.actionsTaken}</p>
                      </div>
                    )}
                    {assess.recommendation && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-xs">{t('ข้อเสนอแนะสู่คณะกรรมการหลักสูตร:', 'Committee Recommendation:')}</span>
                        <p className="text-slate-900 dark:text-slate-100 font-semibold">{assess.recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* AI Case Diagnostic Section */}
            <div className="p-3.5 bg-sky-50/60 dark:bg-sky-950/25 rounded-xl border border-sky-200/70 dark:border-sky-900/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                  {t('การวินิจฉัยเชิงลึกด้วย AI (AI Case Diagnostic):', 'AI Individual Case Diagnostic:')}
                </span>
                {!caseAiDiagnostic[drilldownCase.id] && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRunCaseAiDiagnostic(drilldownCase)}
                    disabled={caseAiLoading}
                    className="cursor-pointer text-[11px] py-1 h-7"
                  >
                    {caseAiLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {t('กำลังวินิจฉัย...', 'Diagnosing...')}
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3 mr-1 text-purple-600" />
                        {t('ประมวลผลเคสนี้ด้วย AI', 'Run AI Diagnostic')}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {caseAiDiagnostic[drilldownCase.id] ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-[11px] sm:text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line pt-1 border-t border-sky-200/50 dark:border-sky-900/40">
                  {caseAiDiagnostic[drilldownCase.id]}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  {t('คลิกปุ่มเพื่อสั่งให้ AI วิเคราะห์สาเหตุแท้จริง ความเป็นไปได้ในการชะลอการออก และแผนช่วยเหลือนักศึกษาเคสนี้', 'Click above to let AI diagnose underlying drivers and evaluate retention feasibility for this student.')}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDrilldownCase(null)}>
                {t('ปิดหน้าต่าง', 'Close Profile')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  )
}
