// ============================================================
// QA / Program Chair — Dashboard (Minimal White & Sky Blue)
// ============================================================

import { useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { PageHeader, Card, StatCard, Button } from '@/components/ui'
import { ADVISING_CATEGORIES, EXIT_REASON_CODES } from '@/types'
import { exportAunQaExcelReport } from '@/utils/exportUtils'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  UserX,
  CalendarClock,
  ListChecks,
  Download,
  MessageSquareHeart,
  Sparkles,
  Quote,
  Star,
  ShieldCheck,
  Brain,
  ArrowRight,
  Building2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import QualitativeExitAnalysis from './QualitativeExitAnalysis'

const PIE_COLORS = ['#0284c7', '#38bdf8', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981']


type VoiceScoreTone = 'sky' | 'emerald' | 'violet' | 'amber'

function VoiceScoreCard({
  label,
  value,
  score,
  icon,
}: {
  label: string
  value: string
  score: number
  icon: ReactNode
  tone?: VoiceScoreTone
}) {
  const pct = Math.min(100, Math.max(0, (score / 5) * 100))
  const barColor =
    score >= 4
      ? 'bg-emerald-500'
      : score >= 3
        ? 'bg-sky-500'
        : score > 0
          ? 'bg-amber-400'
          : 'bg-slate-200 dark:bg-slate-700'

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] p-4 shadow-sm hover:border-sky-300 dark:hover:border-sky-800 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl border border-sky-100 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {label}
          </div>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function QADashboard() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, language } = useLanguage()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'exit_qualitative' | 'student_voice'>('overview')

  const chartTheme = {
    grid: isDark ? '#1e293b' : '#f1f5f9',
    axis: isDark ? '#94a3b8' : '#64748b',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
  }

  const totalRequests = store.requests.length
  const totalSessions = store.sessions.length
  const totalFollowUps = store.followUps.length
  const totalExitCases = store.exitCases.length
  const totalWarnings = store.earlyWarnings.length
  const totalVoiceResponses = store.studentVoiceResponses.length

  // Category distribution
  const categoryData = ADVISING_CATEGORIES.map(c => {
    const count = store.requests.filter(r => r.category === c.value).length
    return {
      name: language === 'th' ? c.labelTh : c.labelEn,
      count,
      percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
    }
  }).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  // Exit reason distribution
  const exitData = EXIT_REASON_CODES.map(r => ({
    name: language === 'th' ? r.labelTh : r.labelEn,
    value: store.exitCases.filter(e => e.reasonCode === r.value).length,
  })).filter(d => d.value > 0)
  const exitTotal = exitData.reduce((sum, item) => sum + item.value, 0)

  // Advisor workload
  const advisorWorkload = store.users.filter(u => u.role === 'advisor').map(a => ({
    name: a.name.split(' ').pop() || a.name,
    fullName: a.name,
    requests: store.requests.filter(r => r.advisorId === a.id).length,
    sessions: store.sessions.filter(s => s.advisorId === a.id).length,
    students: store.roster.filter(r => r.advisorId === a.id && r.isActive).length,
  }))

  // Follow-up completion rate
  const completedFU = store.followUps.filter(f => f.status === 'completed').length
  const fuRate = totalFollowUps > 0 ? Math.round((completedFU / totalFollowUps) * 100) : 0

  // Student Voice Statistics
  const avgCurriculum = totalVoiceResponses > 0
    ? (store.studentVoiceResponses.reduce((acc, r) => acc + (r.ratings?.curriculumRelevance ?? (r as any).curriculumRating ?? 0), 0) / totalVoiceResponses).toFixed(1)
    : '0'
  const avgTeaching = totalVoiceResponses > 0
    ? (store.studentVoiceResponses.reduce((acc, r) => acc + (r.ratings?.teachingQuality ?? (r as any).teachingRating ?? 0), 0) / totalVoiceResponses).toFixed(1)
    : '0'
  const avgAdvisor = totalVoiceResponses > 0
    ? (store.studentVoiceResponses.reduce((acc, r) => acc + (r.ratings?.advisorSupport ?? (r as any).advisorRating ?? 0), 0) / totalVoiceResponses).toFixed(1)
    : '0'
  const avgServices = totalVoiceResponses > 0
    ? (store.studentVoiceResponses.reduce((acc, r) => acc + (r.ratings?.universityServices ?? (r as any).servicesRating ?? 0), 0) / totalVoiceResponses).toFixed(1)
    : '0'
  const avgOverall = totalVoiceResponses > 0
    ? (store.studentVoiceResponses.reduce((acc, r) => acc + (r.ratings?.overallExperience ?? (r as any).overallRating ?? 0), 0) / totalVoiceResponses).toFixed(1)
    : '0'

  // Student Voice factor frequency
  const factorCounts: Record<string, number> = {}
  store.studentVoiceResponses.forEach(r => {
    const factors = Array.isArray(r.primaryFactors) ? r.primaryFactors : []
    factors.forEach(f => {
      factorCounts[f] = (factorCounts[f] || 0) + 1
    })
  })
  const voiceFactorData = Object.entries(factorCounts)
    .map(([name, count]) => ({ name, fullName: name, count }))
    .sort((a, b) => b.count - a.count)

  function handleExport() {
    try {
      exportAunQaExcelReport({
        language,
        metrics: {
          totalRequests,
          totalSessions,
          totalFollowUps,
          fuRate,
          totalExitCases,
          totalWarnings,
          totalVoiceResponses,
          avgCurriculum,
          avgTeaching,
          avgAdvisor,
          avgServices,
          avgOverall,
        },
        categoryData,
        advisorWorkload: advisorWorkload.map(a => ({
          name: a.fullName || a.name,
          requests: a.requests,
          sessions: a.sessions,
          students: a.students,
        })),
        users: store.users,
        requests: store.requests,
        sessions: store.sessions,
        followUps: store.followUps,
        earlyWarnings: store.earlyWarnings,
        roster: store.roster,
        exitCases: store.exitCases,
        studentVoiceResponses: store.studentVoiceResponses,
        advisorAssessments: store.advisorAssessments,
      })

      store.addAuditLog({
        userId: currentUser?.id || 'QA001',
        userName: currentUser?.name || 'QA Coordinator',
        userRole: currentUser?.role || 'qa_chair',
        action: 'qa_exported_data',
        description: 'Exported official AUN-QA Excel report (.xlsx)',
      })

      addToast(
        'success',
        t('ส่งออกรายงาน AUN-QA เรียบร้อยแล้ว', 'AUN-QA Report Exported'),
        t(
          'ไฟล์รายงาน Excel (.xlsx) สรุปตัวชี้วัด ภาระงานอาจารย์ เคสลาออก และเสียงสะท้อน นศ. ถูกดาวน์โหลดแล้ว',
          'AUN-QA Excel report (.xlsx) including metrics, workload, exit cases, and student voice was downloaded successfully.'
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
    <div className="space-y-6">
      <PageHeader
        title={t('แดชบอร์ดประกันคุณภาพ & การประเมินผล', 'QA & Accreditation Dashboard')}
        description={t('ตัวชี้วัดการให้คำปรึกษาของอาจารย์ อัตราคงอยู่ของนักศึกษา และสถิติเพื่อการประกันคุณภาพการศึกษา (AUN-QA)', 'Faculty advising metrics, student persistence analytics, and accreditation evidence.')}
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5 text-slate-500" /> {t('ส่งออกรายงาน AUN-QA', 'Export AUN-QA Report')}
          </Button>
        }
      />

      {/* Modern Segmented Navigation Tabs */}
      <div className="p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{t('ภาพรวมระบบและตัวชี้วัด', 'General Metrics & Workload')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exit_qualitative')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'exit_qualitative'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Brain className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{t('วิเคราะห์เจาะลึกทำไมลาออก / พักการศึกษา (Qualitative)', 'Why Resign / Leave (Qualitative)')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60">
            {totalExitCases}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('student_voice')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'student_voice'
              ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquareHeart className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>{t('เสียงของนักศึกษา (กรณีลาออก/พักการศึกษา)', 'Student Voice — Resignation/Leave')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-800/60">
            {totalVoiceResponses}
          </span>
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <StatCard label={t('คำร้องทั้งหมด', 'Total Requests')} value={totalRequests} icon={<BarChart3 className="h-5 w-5" />} color="sky" />
            <StatCard label={t('ให้คำปรึกษาสำเร็จ', 'Completed Sessions')} value={totalSessions} icon={<CalendarClock className="h-5 w-5" />} color="sky" />
            <StatCard label={t('งานติดตามผลทั้งหมด', 'Total Follow-ups')} value={totalFollowUps} icon={<ListChecks className="h-5 w-5" />} color="sky" />
            <StatCard label={t('อัตราสำเร็จของงาน', 'Completion Rate')} value={`${fuRate}%`} icon={<TrendingUp className="h-5 w-5" />} color="sky" />
            <StatCard label={t('เคสขอลาออก/ลาพัก', 'Exit & Leaves')} value={totalExitCases} icon={<UserX className="h-5 w-5" />} color="red" />
            <StatCard label={t('เคสเตือนภัยวิชาการ', 'Early Warnings')} value={totalWarnings} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('สัดส่วนหัวข้อการขอคำปรึกษา', 'Advising Distribution by Topic')}
              </h3>
              {categoryData.length > 0 ? (
                <div className="h-80 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ top: 6, right: 24, bottom: 6, left: 16 }}
                      barCategoryGap={10}
                    >
                      <defs>
                        <linearGradient id="qaCategoryBarGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="60%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: chartTheme.axis }}
                        tickLine={false}
                        axisLine={false}
                        width={210}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', radius: 6 }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null
                          const d = payload[0].payload
                          return (
                            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md min-w-[190px] text-xs">
                              <p className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                                {d.name}
                              </p>
                              <div className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                                  {t('จำนวนคำร้อง', 'Requests')}
                                </span>
                                <span className="font-bold font-mono text-sky-600 dark:text-sky-400">
                                  {d.count} {t('คำร้อง', 'requests')} ({d.percentage}%)
                                </span>
                              </div>
                            </div>
                          )
                        }}
                      />
                      <Bar
                        dataKey="count"
                        fill="url(#qaCategoryBarGrad)"
                        radius={[0, 8, 8, 0]}
                        barSize={18}
                        background={{
                          fill: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                          radius: 8,
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-72 text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                  <BarChart3 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ยังไม่มีข้อมูลคำร้องในฐานข้อมูล', 'No Advising Requests Recorded Yet')}</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">{t('เมื่อนักศึกษายื่นคำร้องขอคำปรึกษา ระบบจะวิเคราะห์สัดส่วนหัวข้อที่นี่แบบ Real-time', 'When students submit advising requests, distribution analytics will display here automatically in real-time.')}</p>
                </div>
              )}
            </Card>

            {/* Exit Reason Distribution */}
            <Card className="flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" /> {t('สัดส่วนสาเหตุการขอลาออกและลาพัก', 'Exit & Leave Cases by Category')}
                </h3>
                <span className="inline-flex items-center rounded-full border border-sky-100 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/35 px-3 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 whitespace-nowrap">
                  {t(`${exitTotal} เคส`, `${exitTotal} total`)}
                </span>
              </div>
              <div className="flex-1">
                {exitData.length > 0 ? (
                  <div className="flex h-full min-h-[22rem] flex-col">
                    <div className="relative h-52 sm:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie
                            data={exitData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={88}
                            paddingAngle={3}
                            stroke={isDark ? '#0f172a' : '#ffffff'}
                            strokeWidth={4}
                          >
                            {exitData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || !payload.length) return null
                              const item = payload[0]
                              const count = Number(item.value || 0)
                              const percentage = exitTotal > 0 ? Math.round((count / exitTotal) * 100) : 0
                              return (
                                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md min-w-[190px] text-xs">
                                  <div className="flex items-center gap-2 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                                      style={{ backgroundColor: item.payload?.fill || (item as any).color }}
                                    />
                                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {t('จำนวนและสัดส่วน', 'Count & Share')}
                                    </span>
                                    <span className="font-bold font-mono text-sky-600 dark:text-sky-400">
                                      {count} {t('เคส', 'cases')} ({percentage}%)
                                    </span>
                                  </div>
                                </div>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-black leading-none text-slate-950 dark:text-white">{exitTotal}</div>
                          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-500 dark:text-sky-300">
                            {t('เคส', 'Cases')}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-1">
                      {exitData.map((item, i) => {
                        const percentage = exitTotal > 0 ? Math.round((item.value / exitTotal) * 100) : 0
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between py-2 text-xs"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                              />
                              <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.value}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({percentage}%)
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('exit_qualitative')}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-300 dark:hover:bg-sky-950/60 cursor-pointer"
                    >
                      <span>{t('วิเคราะห์เจาะลึกเชิงคุณภาพด้วย AI', 'Explore Qualitative AI Analysis')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-72 text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    <UserX className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ไม่มีข้อมูลเคสขอลาออก/ลาพัก', 'No Departure Cases Recorded')}</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">{t('ทุกชั้นปีมีสถานะปกติ ไม่พบนักศึกษาขอยื่นเรื่องลาออกในระบบ D1', 'All cohorts are in good standing with zero withdrawal filings.')}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Advisor Workload */}
          <Card>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ภาระงานอาจารย์ที่ปรึกษาและการมีส่วนร่วม', 'Faculty Advisor Workload & Engagement')}
            </h3>
            {advisorWorkload.length > 0 ? (
              <div className="h-56 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={advisorWorkload}
                    margin={{ top: 12, right: 16, bottom: 8, left: -10 }}
                    barGap={4}
                    barCategoryGap="22%"
                  >
                    <defs>
                      <linearGradient id="advisorGradStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="advisorGradRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                      <linearGradient id="advisorGradSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: chartTheme.axis }}
                      tickLine={false}
                      axisLine={{ stroke: chartTheme.grid }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartTheme.axis }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', radius: 8 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null
                        return (
                          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md min-w-[200px] text-xs">
                            <div className="font-bold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center justify-between">
                              <span>{payload[0]?.payload?.fullName || label}</span>
                              <span className="text-[10px] text-slate-400 font-normal">{t('ภาระงานที่ปรึกษา', 'Workload & Sessions')}</span>
                            </div>
                            <div className="space-y-1.5">
                              {payload.map((entry: any, i: number) => {
                                const dotColors = ['#0284c7', '#7c3aed', '#059669']
                                return (
                                  <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColors[i] || entry.color }} />
                                      <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                                    </div>
                                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                                      {entry.value}
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
                        const dotColors: Record<string, string> = {
                          students: '#0284c7',
                          requests: '#7c3aed',
                          sessions: '#059669',
                        }
                        const c = dotColors[entry.dataKey] || '#0284c7'
                        return (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 mr-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                            {val}
                          </span>
                        )
                      }}
                    />
                    <Bar
                      dataKey="students"
                      fill="url(#advisorGradStudents)"
                      name={t('นักศึกษาในความดูแล', 'Assigned Advisees')}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="requests"
                      fill="url(#advisorGradRequests)"
                      name={t('คำร้องที่ได้รับ', 'Student Requests')}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="sessions"
                      fill="url(#advisorGradSessions)"
                      name={t('ครั้งที่ให้คำปรึกษาสำเร็จ', 'Completed Sessions')}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                <CalendarClock className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t('ไม่มีข้อมูลอาจารย์ที่ปรึกษาที่ลงทะเบียน', 'No Faculty Advisors Registered')}</p>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'exit_qualitative' && (
        <QualitativeExitAnalysis />
      )}

      {activeTab === 'student_voice' && (
        /* Student Voice Tab */
        <div className="space-y-6">
          {/* Student Voice Header */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-sky-50/50 via-white to-white dark:from-sky-950/20 dark:via-[#0e1424] dark:to-[#0e1424] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {t('ข้อมูลเชิงคุณภาพเสียงของนักศึกษา', 'Student Voice Qualitative Analysis')}
                    </h2>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      AUN-QA Criteria 6 & 8
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                    {t(
                      'รวบรวมและวิเคราะห์ข้อมูลจากนักศึกษาที่ลาออกหรือลาพัก เพื่อปรับปรุงหลักสูตร',
                      'Aggregation and All leaves data for curriculum improvement.'
                    )}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 shrink-0 self-start lg:self-auto bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t('ไม่ระบุตัวตนและเก็บข้อมูลเป็นความลับ', 'De-identified & Confidential')}</span>
              </div>
            </div>
          </div>

          {/* Average Scores */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {t('คะแนนประสบการณ์จากนักศึกษา', 'Student Experience Scores')}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <VoiceScoreCard
                label={t('ความพึงพอใจต่อหลักสูตร', 'Curriculum Score')}
                value={`${avgCurriculum} / 5`}
                score={parseFloat(avgCurriculum)}
                icon={<Star className="h-5 w-5" />}
                tone="sky"
              />
              <VoiceScoreCard
                label={t('คุณภาพการสอน', 'Teaching Quality')}
                value={`${avgTeaching} / 5`}
                score={parseFloat(avgTeaching)}
                icon={<Star className="h-5 w-5" />}
                tone="sky"
              />
              <VoiceScoreCard
                label={t('การดูแลของอาจารย์ที่ปรึกษา', 'Advisor Mentorship')}
                value={`${avgAdvisor} / 5`}
                score={parseFloat(avgAdvisor)}
                icon={<Star className="h-5 w-5" />}
                tone="emerald"
              />
              <VoiceScoreCard
                label={t('การบริการและสิ่งอำนวยความสะดวก', 'University Services & Facilities')}
                value={`${avgServices} / 5`}
                score={parseFloat(avgServices)}
                icon={<Building2 className="h-5 w-5" />}
                tone="amber"
              />
              <VoiceScoreCard
                label={t('ประสบการณ์ภาพรวม', 'Overall Experience')}
                value={`${avgOverall} / 5`}
                score={parseFloat(avgOverall)}
                icon={<Sparkles className="h-5 w-5" />}
                tone="violet"
              />
            </div>
          </section>

          {/* Primary Factors Chart */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0e1424] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t(
                    'ปัจจัยสำคัญที่นักศึกษาระบุว่าส่งผลต่อการลาออก / ลาพัก',
                    'Key Contributing Factors from Student Voice'
                  )}
                </h3>
              </div>

              <span className="inline-flex items-center self-start rounded-full border border-sky-100 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/35 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {t(`${voiceFactorData.length} ปัจจัย`, `${voiceFactorData.length} factors`)}
              </span>
            </div>

            <div
              style={{ height: Math.max(360, voiceFactorData.length * 56) }}
              className="w-full"
            >
              {voiceFactorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={voiceFactorData}
                    layout="vertical"
                    margin={{ top: 8, right: 28, bottom: 8, left: 12 }}
                    barCategoryGap={12}
                  >
                    <defs>
                      <linearGradient id="qaVoiceFactorGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0369a1" />
                        <stop offset="50%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartTheme.grid}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: chartTheme.axis }}
                      tickLine={false}
                      axisLine={{ stroke: chartTheme.grid }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={260}
                      interval={0}
                      tick={{ fontSize: 12, fill: chartTheme.axis }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)', radius: 6 }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null
                        const d = payload[0].payload
                        return (
                          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-3 shadow-xl backdrop-blur-md min-w-[210px] text-xs">
                            <p className="font-bold text-slate-900 dark:text-slate-100 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                              {d.fullName || d.name}
                            </p>
                            <div className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-sky-500" />
                                {t('จำนวนครั้งที่ระบุ', 'Frequency')}
                              </span>
                              <span className="font-bold font-mono text-sky-600 dark:text-sky-400">
                                {d.count} {t('ครั้ง', 'mentions')}
                              </span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="url(#qaVoiceFactorGrad)"
                      radius={[0, 8, 8, 0]}
                      barSize={20}
                      background={{
                        fill: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                        radius: 8,
                      }}
                      name={t('จำนวนครั้งที่ถูกระบุ', 'Mentions')}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  {t('ยังไม่มีข้อมูลปัจจัยจากแบบสอบถาม', 'No survey factor data recorded')}
                </div>
              )}
            </div>
          </Card>

          {/* Qualitative Feedback */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-2">
                  <Quote className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t(
                    'เสียงสะท้อนและความคิดเห็นของนักศึกษา',
                    'Verbatim Student Voice Feedback'
                  )}
                </h3>
              </div>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(`${totalVoiceResponses} ความคิดเห็น`, `${totalVoiceResponses} responses`)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
              {store.studentVoiceResponses.map((res) => {
                const badgeConfig: Record<string, { className: string; label: string }> = {
                  withdrawal: {
                    className: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-300',
                    label: t('ลาออกถาวร', 'Withdrawal'),
                  },
                  dropout: {
                    className: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-300',
                    label: t('พ้นสภาพนักศึกษา', 'Dropout'),
                  },
                  transfer: {
                    className: 'border-purple-100 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/35 dark:text-purple-300',
                    label: t('โอนย้ายสถาบัน', 'Institution Transfer'),
                  },
                  leave_of_absence: {
                    className: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-300',
                    label: t('พักการศึกษา', 'Leave of Absence'),
                  },
                }
                const badge = badgeConfig[res.exitType] || badgeConfig.withdrawal

                return (
                  <article
                    key={res.id}
                    className="bg-white dark:bg-[#0e1424] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:border-sky-200 dark:hover:border-sky-900/60 transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-4">
                      {/* Meta */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {res.isAnonymous
                              ? t('ไม่ระบุตัวตน', 'Anonymous')
                              : res.studentCode || t('นักศึกษา', 'Student')}
                          </span>
                          <p className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {res.academicYear}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Factor tags */}
                      {Array.isArray(res.primaryFactors) && res.primaryFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {res.primaryFactors.map((fac, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                            >
                              {fac}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* What University Could Do */}
                      {res.whatCouldUniversityDoBetter && (
                        <div className="pl-3 border-l-2 border-sky-400 py-0.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            <Quote className="h-3 w-3 text-sky-500" />
                            <span>{t('สิ่งที่อยากให้มหาวิทยาลัยช่วยเหลือ', 'What the university could improve')}</span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed italic text-slate-700 dark:text-slate-300">
                            “{res.whatCouldUniversityDoBetter}”
                          </p>
                        </div>
                      )}

                      {/* Curriculum Suggestions */}
                      {res.curriculumImprovementSuggestions && (
                        <div className="pl-3 border-l-2 border-sky-500 py-0.5 space-y-1">
                          <p className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                            {t('ข้อเสนอแนะต่อหลักสูตร', 'Curriculum suggestion')}
                          </p>
                          <p className="text-xs sm:text-sm leading-relaxed italic text-slate-700 dark:text-slate-300">
                            “{res.curriculumImprovementSuggestions}”
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>{res.ratings?.overallExperience ?? (res as any).overallRating ?? 4}/5</span>
                      </div>
                      <span>{res.createdAt ? new Date(res.createdAt).toLocaleDateString() : '-'}</span>
                    </footer>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
