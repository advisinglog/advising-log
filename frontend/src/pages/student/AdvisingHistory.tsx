// ============================================================
// Student — Advising History (Minimal White & Sky Blue)
// ============================================================

import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, StatusBadge, SearchInput, Button } from '@/components/ui'
import type { AdvisingRequest } from '@/types'
import { useState } from 'react'
import { FileEdit, Clock, X, CheckCircle, Sparkles } from 'lucide-react'

export default function AdvisingHistory() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const viewedRequestsKey = currentUser ? `advising_log_viewed_requests_${currentUser.id}` : ''

  const getViewedRequests = (): string[] => {
    if (!viewedRequestsKey) return []
    try {
      const stored = JSON.parse(localStorage.getItem(viewedRequestsKey) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  }

  const isNewRequest = (request: AdvisingRequest) => !getViewedRequests().includes(request.id)

  const markRequestViewed = (requestId: string) => {
    const viewedRequests = getViewedRequests()
    if (!viewedRequests.includes(requestId)) {
      localStorage.setItem(viewedRequestsKey, JSON.stringify([...viewedRequests, requestId]))
    }
  }

  if (!currentUser) return null

  // Multi-identifier student match (handles ID, student code, email, or DB user aliases)
  const studentIdentifiers = new Set<string>([
    currentUser.id,
    currentUser.code,
    currentUser.email?.toLowerCase(),
    ...store.users
      .filter(u =>
        u.id === currentUser.id ||
        (currentUser.code && u.code?.toUpperCase() === currentUser.code.toUpperCase()) ||
        (currentUser.email && u.email?.toLowerCase() === currentUser.email.toLowerCase())
      )
      .flatMap(u => [u.id, u.code, u.email?.toLowerCase()].filter(Boolean) as string[])
  ].filter(Boolean) as string[])

  const myRequests = store.requests
    .filter(r =>
      studentIdentifiers.has(r.studentId) ||
      (currentUser.code && r.studentId?.toUpperCase() === currentUser.code.toUpperCase()) ||
      (currentUser.email && r.studentId?.toLowerCase() === currentUser.email.toLowerCase())
    )
    .filter(r => {
      if (!search.trim()) return true
      const s = search.trim().toLowerCase()
      const cat = getCategoryLabel(r.category)
      const subCat = r.subCategory ? getSubCategoryLabel(r.subCategory) : ''
      const details = r.details || ''
      return cat.toLowerCase().includes(s) ||
        subCat.toLowerCase().includes(s) ||
        details.toLowerCase().includes(s)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const columns = [
    { key: 'date', header: t('วันที่ยื่น', 'Date'), render: (r: AdvisingRequest) => (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.createdAt}</span>
        {isNewRequest(r) && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-[10px] font-bold text-sky-700 dark:text-sky-300"><Sparkles className="h-3 w-3" />{t('ใหม่', 'New')}</span>}
      </div>
    ) },
    {
      key: 'category',
      header: t('หมวดหมู่', 'Category'),
      render: (r: AdvisingRequest) => (
        <div>
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 block">{getCategoryLabel(r.category)}</span>
          {r.subCategory && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {getSubCategoryLabel(r.subCategory)}
            </span>
          )}
        </div>
      ),
    },
    { key: 'advisor', header: t('อาจารย์ที่ปรึกษา', 'Faculty Advisor'), render: (r: AdvisingRequest) => <span className="text-xs text-slate-600 dark:text-slate-300">{store.users.find(u => u.id === r.advisorId)?.name || '-'}</span> },
    { key: 'appointment', header: t('เวลานัดหมาย', 'Appointment'), render: (r: AdvisingRequest) => {
      const apt = store.appointments.find(a => a.requestId === r.id)
      if (!apt) {
        if (r.preferredDate || r.preferredTime) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {r.preferredDate}{r.preferredTime ? ` · ${r.preferredTime}` : ''}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-500 dark:text-slate-400 rounded border border-slate-200/80 dark:border-slate-700">
                {t('เวลาที่ขอ', 'Requested')}
              </span>
            </div>
          )
        }
        return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
      }

      let statusIndicator = null
      if (apt.status === 'scheduled' && !apt.studentConfirmed && !apt.studentDeclined) {
        statusIndicator = (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-medium text-amber-700 dark:text-amber-300">
            <Clock className="h-3 w-3" /> {t('รอยืนยัน', 'Confirm')}
          </span>
        )
      } else if (apt.studentDeclined) {
        statusIndicator = (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-medium text-rose-700 dark:text-rose-300">
            <X className="h-3 w-3" /> {t('ไม่สะดวก', 'Declined')}
          </span>
        )
      } else if (apt.studentConfirmed) {
        statusIndicator = (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-3 w-3" /> {t('ยืนยันแล้ว', 'Confirmed')}
          </span>
        )
      }

      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{apt.scheduledDate} · {apt.scheduledTime}</span>
          {statusIndicator}
        </div>
      )
    }},
    { key: 'status', header: t('สถานะ', 'Status'), render: (r: AdvisingRequest) => <StatusBadge status={r.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('ประวัติคำร้องขอรับคำปรึกษา', 'Advising History')}
        description={t('ติดตามและตรวจสอบประวัติการขอคำปรึกษา บันทึก และตารางนัดหมายทั้งหมด', 'Review all past and ongoing advising requests, notes, and session logs.')}
        actions={
          <Button onClick={() => navigate('/student/request')}>
            <FileEdit className="h-4 w-4 mr-1.5" />
            {t('ยื่นคำร้องขอเข้าพบ', 'Request Advising')}
          </Button>
        }
      />
      <div className="mb-5 sm:mb-6 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาตามหมวดหมู่ หรือคำสำคัญ...', 'Search by category or keyword...')} />
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1"><Sparkles className="h-3 w-3 text-sky-500" /> {t('ป้าย “ใหม่” จะหายเมื่อเปิดดูรายการแล้ว', '“New” disappears after you open the request')}</p>
      <DataTable
        columns={columns}
        data={myRequests}
        onRowClick={r => { markRequestViewed(r.id); navigate(`/student/history/${r.id}`) }}
        emptyMessage={t('ไม่พบประวัติคำร้องขอรับคำปรึกษา', 'No advising records found matching your search.')}
      />
    </div>
  )
}

