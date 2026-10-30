import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { ThemeToggle, UserAvatar } from '@/components/ui'
import {
  Bell,
  LogOut,
  Menu,
  ChevronDown,
  Check,
  ArrowLeftRight,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Notification, UserRole } from '@/types'
import api from '@/services/apiClient'
import {
  ROLE_CONFIGS,
  getAvailableRolesForUser,
  getRoleDefaultPath,
} from '@/utils/roleUtils'

const thaiNotificationTranslations: Record<string, { title: string; message: string }> = {
  NOT001: {
    title: 'นัดหมายถูกกำหนดแล้ว',
    message: 'นัดหมายเข้าพบอาจารย์ที่ปรึกษาของคุณถูกกำหนดไว้วันที่ 10 กันยายน 2569 เวลา 10:00 น. ณ ห้อง S2-301',
  },
  NOT002: {
    title: 'ต้องดำเนินการติดตามผล',
    message: 'กรุณาดำเนินการส่งแบบฟอร์มเพิ่มถอนรายวิชาก่อนถึงกำหนดเวลา',
  },
  NOT003: {
    title: 'ดำเนินการติดตามผลเสร็จสิ้น',
    message: 'ส่งแบบฟอร์มต่ออายุทุนการศึกษาของคุณเรียบร้อยแล้ว',
  },
  NOT004: {
    title: 'มีคำร้องขอรับคำปรึกษาใหม่',
    message: 'Nattapong Wongchai (6631503003) ยื่นคำร้องขอรับคำปรึกษาใหม่เกี่ยวกับปัญหาส่วนตัว',
  },
  NOT005: {
    title: 'มีคำร้องขอรับคำปรึกษาใหม่',
    message: 'Waraporn Chantara (6631503010) ยื่นคำร้องขอรับคำปรึกษาใหม่เกี่ยวกับผลการเรียน',
  },
  NOT006: {
    title: 'นัดหมายถูกกำหนดแล้ว',
    message: 'นัดหมายเข้าพบอาจารย์ที่ปรึกษาของคุณถูกกำหนดไว้วันที่ 15 กันยายน 2569 เวลา 10:00 น. ณ ห้อง S2-205',
  },
  NOT007: {
    title: 'ใกล้ถึงกำหนดส่งงานติดตามผล',
    message: 'งานติดตามผล “ส่งใบสมัครขอความช่วยเหลือทางการเงินฉุกเฉิน” ของคุณมีกำหนดส่งวันที่ 15 กันยายน',
  },
  NOT008: {
    title: 'มีคำร้องรอดำเนินการ',
    message: 'Kannika Thongkam (6631503004) มีคำร้องขอรับคำปรึกษาเกี่ยวกับการฝึกงาน/อาชีพที่รอการตรวจสอบ',
  },
}

function getRoleIcon(role: UserRole, className = 'h-4 w-4') {
  switch (role) {
    case 'advisor':
      return <GraduationCap className={className} />
    case 'qa_chair':
      return <BarChart3 className={className} />
    case 'admin':
    case 'super_admin':
      return <ShieldCheck className={className} />
    case 'student':
    default:
      return <UserIcon className={className} />
  }
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { currentUser, logout, switchRole } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { addToast } = useToast()
  const store = useStore()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    let active = true
    api.getNotifications(currentUser.id).then(result => {
      if (!active || !result?.notifications) return
      store.hydrateNotifications(result.notifications)
    })
    return () => { active = false }
  }, [currentUser?.id, store.hydrateNotifications])

  if (!currentUser) return null

  const availableRoles = getAvailableRolesForUser(currentUser)
  const canSwitchRole = availableRoles.length > 1
  const currentConfig = ROLE_CONFIGS[currentUser.role] || ROLE_CONFIGS.student

  const myNotifs = store.notifications.filter(n => n.userId === currentUser.id)
  const unreadCount = myNotifs.filter(n => !n.isRead).length

  const handleRoleSwitch = (targetRole: UserRole) => {
    if (targetRole === currentUser.role) {
      setShowProfileMenu(false)
      return
    }

    if (switchRole) {
      switchRole(targetRole)
    }

    setShowProfileMenu(false)
    const targetConfig = ROLE_CONFIGS[targetRole]
    const targetPath = getRoleDefaultPath(targetRole)

    addToast(
      'success',
      t('สลับบทบาทสำเร็จ', 'Role Switched Successfully'),
      t(
        `เข้าสู่โหมด "${targetConfig.labelTh}" เรียบร้อยแล้ว`,
        `Switched to "${targetConfig.labelEn}" workspace successfully.`
      )
    )

    navigate(targetPath)
  }

  const handleNotificationClick = (n: Notification) => {
    store.markNotificationRead(n.id)
    setShowNotifs(false)

    if (!n.relatedId) {
      if (currentUser.role === 'student') navigate('/student')
      else if (currentUser.role === 'advisor') navigate('/advisor')
      else if (currentUser.role === 'qa_chair') navigate('/qa')
      else if (currentUser.role === 'admin') navigate('/admin')
      return
    }

    const rel = n.relatedId

    if (currentUser.role === 'student') {
      if (rel.startsWith('APT')) {
        const apt = store.appointments.find(a => a.id === rel)
        if (apt?.requestId) {
          navigate(`/student/history/${apt.requestId}`)
        } else {
          navigate('/student/history')
        }
      } else if (rel.startsWith('REQ')) {
        navigate(`/student/history/${rel}`)
      } else if (rel.startsWith('DOC')) {
        navigate('/student/documents')
      } else if (rel.startsWith('FU')) {
        navigate('/student/followups')
      } else {
        navigate('/student/history')
      }
    } else if (currentUser.role === 'advisor') {
      if (rel.startsWith('APT') || rel.startsWith('REQ')) {
        navigate('/advisor/sessions')
      } else if (rel.startsWith('EW') || rel.startsWith('EWF')) {
        navigate('/advisor/warnings')
      } else if (rel.startsWith('EXIT')) {
        navigate('/advisor/exit-cases')
      } else if (rel.startsWith('FU')) {
        navigate('/advisor/followups')
      } else {
        navigate('/advisor/sessions')
      }
    } else if (currentUser.role === 'qa_chair') {
      if (rel.startsWith('EXIT')) {
        navigate('/qa/exit-review')
      } else {
        navigate('/qa')
      }
    } else if (currentUser.role === 'admin') {
      navigate('/admin')
    }
  }

  return (
    <header className="h-16 bg-white/90 dark:bg-[#0e1424]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-xs text-slate-900 dark:text-slate-100">
      {/* Left: Menu button (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer for desktop layout alignment */}
      <div className="hidden lg:block flex-1" />

      {/* Right: Language + Theme + Notifications + User */}
      <div className="flex items-center gap-1 sm:gap-2.5">
        {/* Language switch (TH/EN) */}
        <div className="flex items-center text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setLanguage('th')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'th'
                ? 'bg-sky-600 text-white shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
            }`}
          >
            TH
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-sky-600 text-white shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
            }`}
          >
            EN
          </button>
        </div>

        {/* Theme Toggle (Light / Dark / System) */}
        <ThemeToggle />

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifs(!showNotifs)
              setShowProfileMenu(false)
            }}
            className="relative text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-sky-600 text-white text-[10px] font-extrabold rounded-full h-4.5 w-4.5 flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-1.5rem)] max-w-88 bg-white dark:bg-[#0e1424] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto animate-[slideIn_0.15s_ease-out]">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t('การแจ้งเตือนของระบบ', 'System Notifications')}</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => { store.markAllNotificationsRead(currentUser.id); setShowNotifs(false) }}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold transition-colors cursor-pointer"
                    >
                      {t('อ่านทั้งหมดแล้ว', 'Mark all as read')}
                    </button>
                  )}
                </div>
                {myNotifs.length === 0 ? (
                  <p className="px-4 py-8 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">{t('ไม่มีการแจ้งเตือนใหม่', 'No pending notifications')}</p>
                ) : (
                  myNotifs.slice(0, 10).map(n => {
                    const translated = language === 'th' ? thaiNotificationTranslations[n.id] : undefined
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`px-5 py-3.5 border-b border-slate-50 dark:border-slate-800/60 cursor-pointer hover:bg-sky-50/30 dark:hover:bg-slate-800/60 transition-colors ${!n.isRead ? 'bg-sky-50/50 dark:bg-sky-500/10' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs ${n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100 font-bold'}`}>{translated?.title ?? n.title}</p>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0 mt-1 ring-2 ring-sky-100 dark:ring-sky-900" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{translated?.message ?? n.message}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* User Profile Trigger Button & Role Switcher Dropdown */}
        <div className="relative pl-1 sm:pl-2 border-l border-slate-200/70 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowNotifs(false)
            }}
            className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border transition-all cursor-pointer group ${
              showProfileMenu
                ? 'bg-sky-50/80 dark:bg-sky-500/15 border-sky-300 dark:border-sky-500/40 shadow-2xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/70 border-transparent hover:border-slate-200/70 dark:hover:border-slate-700/60'
            }`}
            aria-expanded={showProfileMenu}
            aria-haspopup="menu"
            title={t('โปรไฟล์และการสลับบทบาท', 'Profile & Role Switcher')}
          >
            <div className="relative">
              <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="md" />
              {canSwitchRole && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-sky-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-[#0e1424] shadow-xs"
                  title={t('สามารถสลับบทบาทได้', 'Multi-role enabled')}
                >
                  <ArrowLeftRight className="h-2 w-2 stroke-[2.5]" />
                </span>
              )}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {currentUser.name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold border ${currentConfig.badgeClass}`}>
                  {getRoleIcon(currentUser.role, 'h-2.5 w-2.5')}
                  <span>{language === 'th' ? currentConfig.shortLabelTh : currentConfig.shortLabelEn}</span>
                </span>
              </div>
            </div>

            <ChevronDown
              className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${
                showProfileMenu ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
              }`}
            />
          </button>

          {/* Profile and Role Switcher Dropdown Modal Card */}
          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 top-full mt-2.5 w-[calc(100vw-1.5rem)] max-w-88 sm:max-w-96 bg-white dark:bg-[#0e1424] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-[slideIn_0.15s_ease-out]">
                {/* User Identity Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60">
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="lg" />
                      <span className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-[#0e1424] shadow-xs border ${currentConfig.badgeClass}`}>
                        {getRoleIcon(currentUser.role, 'h-3 w-3')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {currentUser.name}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {currentUser.code} · {currentUser.email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${currentConfig.badgeClass}`}>
                          {getRoleIcon(currentUser.role, 'h-3 w-3')}
                          <span>{language === 'th' ? currentConfig.labelTh : currentConfig.labelEn}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Switching Section */}
                {canSwitchRole && (
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="flex items-center gap-1.5">
                        <ArrowLeftRight className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          {t('สลับบทบาทการทำงาน', 'Switch Role Workspace')}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded-full">
                        {availableRoles.length} {t('บทบาท', 'roles')}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {availableRoles.map(r => {
                        const config = ROLE_CONFIGS[r]
                        const isActive = r === currentUser.role
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleRoleSwitch(r)}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                              isActive
                                ? `${config.activeCardClass} shadow-2xs`
                                : 'border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/40 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                  isActive
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-sky-100 dark:group-hover:bg-sky-950/60 group-hover:text-sky-700 dark:group-hover:text-sky-300'
                                }`}
                              >
                                {getRoleIcon(r, 'h-4 w-4')}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-sky-950 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-300'}`}>
                                  {language === 'th' ? config.labelTh : config.labelEn}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                                  {language === 'th' ? config.descTh : config.descEn}
                                </p>
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-600 text-white shadow-xs">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  <span>{t('ใช้งานอยู่', 'Active')}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 flex items-center gap-0.5 transition-colors">
                                  <span>{t('สลับ', 'Switch')}</span>
                                  <span>→</span>
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="p-2.5 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 px-2 truncate font-medium">
                    {currentUser.department}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false)
                      logout()
                      navigate('/login')
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{t('ออกจากระบบ', 'Sign out')}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
