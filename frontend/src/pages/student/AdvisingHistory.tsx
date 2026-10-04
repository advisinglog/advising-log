// ============================================================
// Student — Advising History (Minimal White & Sky Blue)
// ============================================================

import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, StatusBadge, SearchInput, Button } from '@/components/ui'
import type { AdvisingRequest } from '@/types'
import { getLocalDateString } from '@/utils/dateUtils'
import { useState } from 'react'
import { FileEdit, Sparkles } from 'lucide-react'

export default function AdvisingHistory() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [timeframeFilter, setTimeframeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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
      // 1. Text Search Filter
      const q = search.trim().toLowerCase()
      if (q) {
        const cat = getCategoryLabel(r.category)
        const subCat = r.subCategory ? getSubCategoryLabel(r.subCategory) : ''
        const details = r.details || ''
        if (!cat.toLowerCase().includes(q) &&
            !subCat.toLowerCase().includes(q) &&
            !details.toLowerCase().includes(q)) {
          return false
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) {
        return false
      }

      // 3. Timeframe / Status Filter
      if (timeframeFilter !== 'all') {
        const apt = store.appointments.find(a => a.requestId === r.id)
        
        // Some timeframe filters require an appointment
        if (['present', 'future', 'past'].includes(timeframeFilter) && !apt) {
          return false
        }

        if (apt) {
          const today = getLocalDateString()
          const isPast = apt.scheduledDate < today
          const isToday = apt.scheduledDate === today
          const isFuture = apt.scheduledDate > today

          if (timeframeFilter === 'future' && !isFuture) return false
          if (timeframeFilter === 'past' && !isPast) return false
          if (timeframeFilter === 'present' && !isToday) return false
        }
      }

      return true
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
      if (apt) {
        return <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{apt.scheduledDate} · {apt.scheduledTime}</span>
      }
      if (r.preferredDate || r.preferredTime) {
        return <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.preferredDate}{r.preferredTime ? ` · ${r.preferredTime}` : ''}</span>
      }
      return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
    }},
    { key: 'status', header: t('สถานะ', 'Status'), render: (r: AdvisingRequest) => <StatusBadge status={r.status} /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('ประวัติและรายการนัดหมาย', 'Meetings & History')}
        description={t('ติดตามและตรวจสอบการนัดหมาย บันทึกผลการเข้าพบ และประวัติคำร้องขอรับคำปรึกษาทั้งหมด', 'Review your upcoming appointments, session logs, notes, and advising history.')}
        actions={
          <Button onClick={() => navigate('/student/request')}>
            <FileEdit className="h-4 w-4 mr-1.5" />
            {t('นัดพบอาจารย์', 'Meet Advisor')}
          </Button>
        }
      />
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="w-full sm:max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาตามหมวดหมู่ หรือคำสำคัญ...', 'Search by category or keyword...')} />
        </div>
        
        <select 
          className="w-full sm:w-48 text-sm border-slate-200 dark:border-slate-800 rounded-md shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2"
          value={timeframeFilter}
          onChange={(e) => setTimeframeFilter(e.target.value)}
        >
          <option value="all">{t('ช่วงเวลาทั้งหมด', 'All Timeframes')}</option>
          <option value="present">{t('วันนี้', 'Present (Today)')}</option>
          <option value="future">{t('อนาคต', 'Future')}</option>
          <option value="past">{t('อดีต', 'Past')}</option>
        </select>

        <select 
          className="w-full sm:w-48 text-sm border-slate-200 dark:border-slate-800 rounded-md shadow-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">{t('ทุกหมวดหมู่', 'All Categories')}</option>
          {store.categoryConfigs.filter(c => c.isActive !== false).map(cat => {
            const val = cat.value
            const label = getCategoryLabel(val) !== val ? getCategoryLabel(val) : ('label' in cat && cat.label ? cat.label : val)
            return (
              <option key={val} value={val}>
                {label}
              </option>
            )
          })}
        </select>
      </div>
      <DataTable
        columns={columns}
        data={myRequests}
        onRowClick={r => { markRequestViewed(r.id); navigate(`/student/history/${r.id}`) }}
        emptyMessage={t('ไม่พบประวัติคำร้องขอรับคำปรึกษา', 'No advising records found matching your search.')}
      />
    </div>
  )
}

