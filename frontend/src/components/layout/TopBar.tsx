import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeToggle, UserAvatar } from '@/components/ui'
import { Bell, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '@/types'

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

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { currentUser, logout } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const store = useStore()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)

  if (!currentUser) return null

  const myNotifs = store.notifications.filter(n => n.userId === currentUser.id)
  const unreadCount = myNotifs.filter(n => !n.isRead).length

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
        navigate('/advisor/sessions')
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
            onClick={() => setShowNotifs(!showNotifs)}
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

        {/* User info chip with Google Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200/70 dark:border-slate-800">
          <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size="md" />
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{currentUser.name}</p>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono mt-0.5">{currentUser.code}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
            title={t('ออกจากระบบ', 'Sign out')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}



