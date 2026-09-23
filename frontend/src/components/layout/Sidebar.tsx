import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import type { UserRole } from '@/types'
import {
  LayoutDashboard,
  FileEdit,
  History,
  FileText,
  ListChecks,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  Share2,
  UserX,
  BarChart3,
  Users,
  BookOpen,
  FolderCog,
  FileCog,
  ScrollText,
  GraduationCap,
  X,
  Sparkles,
  MessageSquareHeart,
  Bot,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentUser } = useAuth()
  const { t } = useLanguage()
  if (!currentUser) return null

  function getNavItems(role: UserRole): NavItem[] {
    switch (role) {
      case 'student':
        return [
          { to: '/student', label: t('หน้าหลัก', 'Dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: '/student/request', label: t('ยื่นคำร้องขอเข้าพบ', 'Request Advising'), icon: <FileEdit className="h-4 w-4" /> },
          { to: '/student/history', label: t('ประวัติการขอคำปรึกษา', 'Advising History'), icon: <History className="h-4 w-4" /> },
          { to: '/student/documents', label: t('เอกสารที่เกี่ยวข้อง', 'Documents'), icon: <FileText className="h-4 w-4" /> },
          { to: '/student/followups', label: t('งานที่ต้องดำเนินการ', 'Follow-ups'), icon: <ListChecks className="h-4 w-4" /> },
          { to: '/student/voice', label: t('เสียงของนักศึกษา', 'Student Voice'), icon: <MessageSquareHeart className="h-4 w-4" /> },
        ]
      case 'advisor':
        return [
          { to: '/advisor', label: t('แดชบอร์ดอาจารย์', 'Dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: '/advisor/sessions', label: t('การให้คำปรึกษา', 'Advising Sessions'), icon: <CalendarClock className="h-4 w-4" /> },
          { to: '/advisor/log', label: t('บันทึกผลการเข้าพบ', 'Advisor Log'), icon: <ClipboardList className="h-4 w-4" /> },
          { to: '/advisor/warnings', label: t('ระบบเตือนภัยวิชาการ', 'Early Warning'), icon: <AlertTriangle className="h-4 w-4" /> },
          { to: '/advisor/referrals', label: t('การส่งต่อหน่วยงาน', 'Referrals'), icon: <Share2 className="h-4 w-4" /> },
          { to: '/advisor/exit-cases', label: t('คำร้องขอลาพัก/ลาออก', 'Exit Cases'), icon: <UserX className="h-4 w-4" /> },
        ]
      case 'qa_chair':
        return [
          { to: '/qa', label: t('แดชบอร์ดประกันคุณภาพ', 'QA Dashboard'), icon: <BarChart3 className="h-4 w-4" /> },
          { to: '/qa/exit-review', label: t('ทบทวนเคสลาออก', 'Exit Case Review'), icon: <UserX className="h-4 w-4" /> },
        ]
      case 'admin':
        return [
          { to: '/admin', label: t('แดชบอร์ดผู้ดูแล', 'Admin Dashboard'), icon: <LayoutDashboard className="h-4 w-4" /> },
          { to: '/admin/users', label: t('จัดการผู้ใช้งาน', 'User Management'), icon: <Users className="h-4 w-4" /> },
          { to: '/admin/ai-governance', label: t('จัดการระบบ AI', 'AI Governance'), icon: <Bot className="h-4 w-4" /> },
          { to: '/admin/roster', label: t('จัดสรรอาจารย์ที่ปรึกษา', 'Student-Advisor Roster'), icon: <BookOpen className="h-4 w-4" /> },
          { to: '/admin/categories', label: t('หมวดหมู่คำปรึกษา', 'Categories'), icon: <FolderCog className="h-4 w-4" /> },
          { to: '/admin/document-types', label: t('ประเภทเอกสาร', 'Document Types'), icon: <FileCog className="h-4 w-4" /> },
          { to: '/admin/audit-logs', label: t('ประวัติการทำงานระบบ', 'Audit Logs'), icon: <ScrollText className="h-4 w-4" /> },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems(currentUser.role)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 z-40 h-full w-64 bg-white dark:bg-[#0e1424] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto shadow-xs',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 ring-2 ring-sky-100 dark:ring-sky-950">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 block leading-tight">
                Advising<span className="text-sky-600 dark:text-sky-400">Log</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider leading-tight">
                Academic Advisory
              </span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3.5 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/student' || item.to === '/advisor' || item.to === '/qa' || item.to === '/admin'}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group cursor-pointer',
                isActive
                  ? 'bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 font-bold border border-sky-200/70 dark:border-sky-500/30 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white border border-transparent',
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    'p-1 rounded-lg transition-colors',
                    isActive ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200',
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span className="font-medium">AdvisingLog v2.1</span>
          <span className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400">
            <Sparkles className="h-3 w-3" /> Online
          </span>
        </div>
      </aside>
    </>
  )
}


