import BackendDataStatus from '@/components/BackendDataStatus'
// ============================================================
// AdvisingLog — Admin Dashboard (Ultra-Modern, High-End SaaS)
// ============================================================

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTheme } from '@/contexts/ThemeContext'
import { PageHeader, Card, Button, UserAvatar } from '@/components/ui'
import {
  Users,
  BookOpen,
  Shield,
  ShieldCheck,
  FolderCog,
  ScrollText,
  FileCog,
  Tag,
  ArrowRight,
  Sparkles,
  Clock,
  UserCheck,
  ChevronRight,
  Bot,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Link, useNavigate } from 'react-router-dom'
import type { UserRole } from '@/types'

export default function AdminDashboard() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t } = useLanguage()
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [auditFilter, setAuditFilter] = useState<'all' | 'login' | 'roster' | 'request'>('all')

  if (!currentUser) return null

  // User breakdown
  const totalUsers = store.users.length
  const totalStudents = store.users.filter(u => u.role === 'student').length
  const totalAdvisors = store.users.filter(u => u.role === 'advisor').length
  const totalQAChairs = store.users.filter(u => u.role === 'qa_chair').length
  const totalAdmins = store.users.filter(u => u.role === 'admin').length
  const totalSuperAdmins = store.users.filter(u => u.role === 'super_admin').length
  const activeUserPct = totalUsers > 0 ? Math.round(store.users.filter(u => u.isActive).length / totalUsers * 100) : 0

  // Roster & Configuration stats
  const activeRosterCount = store.roster.filter(r => r.isActive).length
  const totalCategories = store.categoryConfigs.length
  const totalDocTypes = store.documentTypes.length

  const assignedStudents = new Set(store.roster.filter(r => r.isActive).map(r => r.studentId))
  const coveredStudents = store.users.filter(u => u.role === 'student' && assignedStudents.has(u.id)).length
  const coveragePct = totalStudents > 0 ? Math.round(coveredStudents / totalStudents * 100) : 0
  const averageLoad = totalAdvisors > 0 ? (activeRosterCount / totalAdvisors).toFixed(1) : '0'

  // Percentages for role distribution bar
  const studentPct = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 0
  const advisorPct = totalUsers > 0 ? Math.round((totalAdvisors / totalUsers) * 100) : 0
  const qaPct = totalUsers > 0 ? Math.round((totalQAChairs / totalUsers) * 100) : 0
  const adminPct = totalUsers > 0 ? Math.round((totalAdmins / totalUsers) * 100) : 0

  // Chart Theme configuration for dark/light
  const chartTheme = {
    tooltipBg: isDark ? '#0e1424' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#f8fafc' : '#0f172a',
  }

  // Role chart data for Donut Pie
  const roleChartData = [
    { name: t('นักศึกษา', 'Students'), value: totalStudents, color: '#0284c7' },
    { name: t('อาจารย์ที่ปรึกษา', 'Advisors'), value: totalAdvisors, color: '#0ea5e9' },
    { name: t('ประกันคุณภาพ', 'QA Chairs'), value: totalQAChairs, color: '#38bdf8' },
    { name: t('ผู้ดูแลระบบ', 'Admins'), value: totalAdmins, color: '#94a3b8' },
    { name: 'Super Admin', value: totalSuperAdmins, color: '#a855f7' },
  ].filter(d => d.value > 0)

  // Filtered audit logs
  const filteredLogs = store.auditLogs
    .filter(log => {
      if (auditFilter === 'login') return log.action.toLowerCase().includes('login')
      if (auditFilter === 'roster') return log.action.toLowerCase().includes('roster')
      if (auditFilter === 'request') {
        return (
          log.action.toLowerCase().includes('request') ||
          log.action.toLowerCase().includes('session') ||
          log.action.toLowerCase().includes('document')
        )
      }
      return true
    })
    .slice(0, 6)

  // Recent 5 Users
  const recentUsers = [...store.users].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)

  // Role metadata helper
  const roleMeta: Record<UserRole, { labelTh: string; labelEn: string; color: string; bg: string }> = {
    student: {
      labelTh: 'นักศึกษา',
      labelEn: 'Student',
      color: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-500/12 border-sky-200/70 dark:border-sky-500/25',
    },
    advisor: {
      labelTh: 'อาจารย์ที่ปรึกษา',
      labelEn: 'Faculty Advisor',
      color: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-500/12 border-sky-200/70 dark:border-sky-500/25',
    },
    qa_chair: {
      labelTh: 'ประกันคุณภาพ',
      labelEn: 'QA Chair',
      color: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-500/12 border-sky-200/70 dark:border-sky-500/25',
    },
    admin: {
      labelTh: 'ผู้ดูแลระบบ',
      labelEn: 'Admin',
      color: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-500/12 border-sky-200/70 dark:border-sky-500/25',
    },
    super_admin: {
      labelTh: 'ผู้ดูแลระบบระดับสูง',
      labelEn: 'Super Admin',
      color: 'text-purple-700 dark:text-purple-300',
      bg: 'bg-purple-50 dark:bg-purple-500/12 border-purple-200/70 dark:border-purple-500/25',
    },
  }

  // Quick module hub cards with top gradient lines
  const adminModules = [
    {
      title: t('จัดการผู้ใช้งาน', 'User Management'),
      desc: t('ตรวจสอบบัญชี กำหนดบทบาท และจัดการข้อมูลผู้ใช้งาน', 'Manage accounts, roles, and user authentications.'),
      count: `${totalUsers} ${t('บัญชี', totalUsers === 1 ? 'Account' : 'Accounts')}`,
      icon: <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      topGradient: 'from-sky-500 via-sky-400 to-sky-600',
      tagColor: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 border-sky-200/60 dark:border-sky-500/30',
      borderColor: 'hover:border-sky-300 dark:hover:border-sky-500/50',
      to: '/admin/users',
    },
    ...(currentUser.role === 'super_admin'
      ? [
          {
            title: t('จัดการระบบ AI', 'AI Governance'),
            desc: t('กำหนดค่าโมเดล จัดการ API Keys และควบคุมการเข้าถึง AI รายบุคคล', 'Manage Gemini/OpenAI API keys, LLM quotas, and user AI access.'),
            count: `${store.aiKeys.length} ${t('คีย์ในระบบ', store.aiKeys.length === 1 ? 'Key' : 'Keys')}`,
            icon: <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
            topGradient: 'from-purple-500 via-indigo-400 to-purple-600',
            tagColor: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/12 border-purple-200/60 dark:border-purple-500/30',
            borderColor: 'hover:border-purple-300 dark:hover:border-purple-500/50',
            to: '/admin/ai-governance',
          },
        ]
      : []),
    {
      title: t('จัดสรรอาจารย์ที่ปรึกษา', 'Student-Advisor Roster'),
      desc: t('จับคู่อาจารย์ที่ปรึกษากับนักศึกษา และดูแลความครอบคลุม', 'Pair advisors with advisees and track caseload distribution.'),
      count: `${activeRosterCount} ${t('คู่ในระบบ', activeRosterCount === 1 ? 'Pairing' : 'Pairings')}`,
      icon: <BookOpen className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      topGradient: 'from-sky-500 via-sky-400 to-sky-600',
      tagColor: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 border-sky-200/60 dark:border-sky-500/30',
      borderColor: 'hover:border-sky-300 dark:hover:border-sky-500/50',
      to: '/admin/roster',
    },
    {
      title: t('หมวดหมู่คำปรึกษา', 'Categories Configuration'),
      desc: t('ปรับแต่ง taxonomy หัวข้อการให้คำปรึกษา และระยะเวลาบริการ', 'Configure advising topics, subcategories, and service metrics.'),
      count: `${totalCategories} ${t('หมวดหมู่', totalCategories === 1 ? 'Category' : 'Categories')}`,
      icon: <Tag className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      topGradient: 'from-sky-500 via-sky-400 to-sky-600',
      tagColor: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 border-sky-200/60 dark:border-sky-500/30',
      borderColor: 'hover:border-sky-300 dark:hover:border-sky-500/50',
      to: '/admin/categories',
    },
    {
      title: t('ประเภทเอกสาร', 'Document Types'),
      desc: t('ตั้งค่าแบบฟอร์มคำร้อง ประเภทไฟล์ และรูปแบบการลงนาม', 'Define request forms, allowed file formats, and signatures.'),
      count: `${totalDocTypes} ${t('ประเภท', totalDocTypes === 1 ? 'Type' : 'Types')}`,
      icon: <FileCog className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      topGradient: 'from-sky-500 via-sky-400 to-sky-600',
      tagColor: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 border-sky-200/60 dark:border-sky-500/30',
      borderColor: 'hover:border-sky-300 dark:hover:border-sky-500/50',
      to: '/admin/document-types',
    },
    {
      title: t('ประวัติการทำงานระบบ', 'Security Audit Logs'),
      desc: t('บันทึกความปลอดภัย ตรวจสอบการทำรายการ และการเข้าถึงระบบ', 'Trace administrative actions, user logins, and data changes.'),
      count: `${store.auditLogs.length} ${t('เหตุการณ์', store.auditLogs.length === 1 ? 'Event' : 'Events')}`,
      icon: <ScrollText className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      topGradient: 'from-sky-500 via-sky-400 to-sky-600',
      tagColor: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 border-sky-200/60 dark:border-sky-500/30',
      borderColor: 'hover:border-sky-300 dark:hover:border-sky-500/50',
      to: '/admin/audit-logs',
    },
  ]

  if (store.backendStatus !== 'ready') return <BackendDataStatus />

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={
          currentUser.role === 'super_admin'
            ? t('ศูนย์บริหารจัดการ Super Admin', 'Super Admin Dashboard')
            : t('ศูนย์บริหารจัดการ Admin', 'Admin Dashboard')
        }
        description={t(
          'จัดการสิทธิ์ผู้ใช้งาน จัดสรรคู่ที่ปรึกษา ตรวจสอบหมวดหมู่ และติดตามความปลอดภัยของระบบ',
          'Manage user permissions, student-advisor roster mapping, and system configuration.'
        )}
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={() => navigate('/admin/users')}>
              <Users className="h-4 w-4 mr-1.5" />
              {t('จัดการผู้ใช้', 'Users')}
            </Button>
            <Button onClick={() => navigate('/admin/roster')}>
              <FolderCog className="h-4 w-4 mr-1.5" />
              {t('จัดสรรคู่ที่ปรึกษา', 'Manage Roster')}
            </Button>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>{t('ข้อมูลจากฐานข้อมูลระบบ', 'Data from the system database')}</span>
        <Button variant="secondary" size="sm" onClick={store.refreshBackend}>{t('รีเฟรชข้อมูล', 'Refresh data')}</Button>
      </div>

      {/* KPI Stat Cards Grid (Enhanced with Visual Trends) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group relative overflow-hidden bg-white dark:bg-[#0e1424] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-premium dark:hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 flex items-center justify-center ring-1 ring-sky-200/60 dark:ring-sky-500/25 shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/25">
              {activeUserPct}% {t('เปิดใช้งาน', 'Active')}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">{totalUsers}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{t('ผู้ใช้งานทั้งหมดในระบบ', 'Total Registered Users')}</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{totalStudents} {t('นักศึกษา', 'Students')}</span>
            <span>·</span>
            <span>{totalAdvisors} {t('อาจารย์', 'Advisors')}</span>
          </div>
        </Link>

        <Link to="/admin/users?role=student" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group relative overflow-hidden bg-white dark:bg-[#0e1424] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-premium dark:hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 flex items-center justify-center ring-1 ring-sky-200/60 dark:ring-sky-500/25 shadow-2xs group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/25">
              {studentPct}% {t('สัดส่วนผู้ใช้', 'Share')}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">{totalStudents}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{t('นักศึกษาที่ลงทะเบียน', 'Registered Students')}</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('สำนักวิชา ADT', 'School of ADT')}</span>
            <span>{t('บัญชีนักศึกษา', 'Student accounts')}</span>
          </div>
        </Link>

        <Link to="/admin/users?role=advisor" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group relative overflow-hidden bg-white dark:bg-[#0e1424] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-premium dark:hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 flex items-center justify-center ring-1 ring-sky-200/60 dark:ring-sky-500/25 shadow-2xs group-hover:scale-105 transition-transform">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/25">
              {advisorPct}% {t('สัดส่วนผู้ใช้', 'Share')}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">{totalAdvisors}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{t('อาจารย์ที่ปรึกษา', 'Faculty Advisors')}</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('อัตราส่วนเฉลี่ย', 'Avg Load')}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{averageLoad} {t('คน/ท่าน', 'advisees')}</span>
          </div>
        </Link>

        <Link to="/admin/roster" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group relative overflow-hidden bg-white dark:bg-[#0e1424] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-premium dark:hover:border-sky-500/40 hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 flex items-center justify-center ring-1 ring-sky-200/60 dark:ring-sky-500/25 shadow-2xs group-hover:scale-105 transition-transform">
              <FolderCog className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/25">
              {t('จับคู่สมบูรณ์', 'Mapped')}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans">{activeRosterCount}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{t('คู่ที่ปรึกษาที่จัดสรรแล้ว', 'Roster Pairings')}</p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{t('ความครอบคลุม', 'Coverage')}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{coveragePct}%</span>
          </div>
        </Link>
      </div>

      {/* Admin Modules Quick Launch Panel */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t('ศูนย์รวมการจัดการระบบ (Admin Modules)', 'Administrative Modules & Hub')}
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {adminModules.length} {t('โมดูลหลัก', 'Core Modules')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {adminModules.map(mod => (
            <div
              key={mod.to}
              onClick={() => navigate(mod.to)}
              className={`group relative overflow-hidden p-4 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200/80 dark:border-slate-800/80 ${mod.borderColor} shadow-xs hover:shadow-premium hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between`}
            >
              {/* Subtle top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mod.topGradient} opacity-90 group-hover:h-1.5 transition-all`} />

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    {mod.icon}
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${mod.tagColor}`}>
                    {mod.count}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {mod.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-sky-600 dark:text-sky-400 group-hover:text-sky-700 dark:group-hover:text-sky-300">
                <span>{t('เปิดจัดการ', 'Access module')}</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Left (Audit Trail with Filters) & Right (Donut Chart + Infra Health) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Audit Trail (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {t('ประวัติการทำงานล่าสุดของระบบ', 'Recent System Audit Activity')}
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('บันทึกการกระทำและเหตุการณ์ความปลอดภัยแบบเรียลไทม์', 'Real-time security and administrative events log')}
                    </p>
                  </div>
                </div>

                {/* Audit Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold">
                  <button
                    onClick={() => setAuditFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      auditFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('ทั้งหมด', 'All')}
                  </button>
                  <button
                    onClick={() => setAuditFilter('login')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      auditFilter === 'login'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('ล็อกอิน', 'Logins')}
                  </button>
                  <button
                    onClick={() => setAuditFilter('roster')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      auditFilter === 'roster'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('คู่ที่ปรึกษา', 'Roster')}
                  </button>
                  <button
                    onClick={() => setAuditFilter('request')}
                    className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                      auditFilter === 'request'
                        ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-2xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t('คำร้อง', 'Requests')}
                  </button>
                </div>
              </div>

              {/* Audit Event Items */}
              <div className="space-y-2.5">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const role = (log.userRole && roleMeta[log.userRole as UserRole]) || roleMeta.admin
                    const timeStr = log.createdAt
                      ? log.createdAt.replace('T', ' ').substring(11, 16)
                      : (log as any).timestamp
                        ? String((log as any).timestamp).replace('T', ' ').substring(11, 16)
                        : '--:--'
                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800/70 hover:shadow-xs transition-all flex items-start gap-3"
                      >
                        {/* User Avatar */}
                        <UserAvatar name={log.userName || 'User'} size="md" />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {log.description || '-'}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex-shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeStr}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                              {log.userName || 'System'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${role.bg} ${role.color}`}>
                              {t(role.labelTh, role.labelEn)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                              · {(log.action || '').replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {t('ไม่พบประวัติรายการในหมวดนี้', 'No log entries matching this filter')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t('เก็บบันทึกตาม พ.ร.บ. PDPA และ AUN-QA', 'Complies with PDPA & AUN-QA audit standards')}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/admin/audit-logs')}
                className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
              >
                {t('ดูทั้งหมด', 'View all')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: User Demographics (Donut Chart) + Infra Health (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Role Distribution Card with Donut Chart */}
          <Card>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                {t('สัดส่วนบทบาทผู้ใช้งาน (User Breakdown)', 'User Role Demographics')}
              </h3>
              <span className="text-xs font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/12 px-2.5 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/25">
                {totalUsers} {t('คน', 'total')}
              </span>
            </div>

            {/* Donut Chart with Center Label */}
            <div className="relative h-44 flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {roleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipText,
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.25)',
                    }}
                    itemStyle={{ color: chartTheme.tooltipText }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-sans">{totalUsers}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ผู้ใช้ทั้งหมด', 'Users')}</span>
              </div>
            </div>

            {/* Role breakdown grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link to="/admin/users?role=student" className="block hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t('นักศึกษา', 'Students')}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{totalStudents}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{studentPct}% {t('ของระบบ', 'share')}</p>
              </Link>

              <Link to="/admin/users?role=advisor" className="block hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    {t('อาจารย์', 'Advisors')}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{totalAdvisors}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{advisorPct}% {t('ของระบบ', 'share')}</p>
              </Link>

              <Link to="/admin/users?role=qa_chair" className="block hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-sky-300" />
                    {t('ประกันคุณภาพ', 'QA Chairs')}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{totalQAChairs}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{qaPct}% {t('ของระบบ', 'share')}</p>
              </Link>

              <Link to="/admin/users?role=admin" className="block hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    {t('ผู้ดูแลระบบ', 'Admins')}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{totalAdmins}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{adminPct}% {t('ของระบบ', 'share')}</p>
              </Link>
              <Link to="/admin/users?role=super_admin" className="block rounded-xl border border-slate-200/60 bg-slate-50/70 p-2 hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-800/80 dark:bg-slate-800/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Super Admin</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{totalSuperAdmins}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-400">{totalUsers > 0 ? Math.round(totalSuperAdmins / totalUsers * 100) : 0}% {t('ของระบบ', 'share')}</p>
              </Link>
            </div>
          </Card>





        </div>
      </div>

      {/* Bottom Section: Recently Registered Users */}
      <Card>
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('ผู้ใช้งานล่าสุดในระบบ', 'Recently Registered / Active Users')}
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {t('บัญชีผู้ใช้งานที่เปิดใช้งานและเข้าใช้งานล่าสุดในระบบ', 'Active accounts and role credentials')}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/admin/users')}
            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
          >
            {t('จัดการผู้ใช้ทั้งหมด', 'Manage all users')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {recentUsers.map(user => {
            const role = roleMeta[user.role] || roleMeta.student
            return (
              <div
                key={user.id}
                className="group p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800/80 hover:border-sky-300/80 dark:hover:border-sky-500/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <UserAvatar name={user.name} avatar={user.avatar} size="md" />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${role.bg} ${role.color}`}>
                    {t(role.labelTh, role.labelEn)}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {user.name}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                    {user.code}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-1">
                    {user.email}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
