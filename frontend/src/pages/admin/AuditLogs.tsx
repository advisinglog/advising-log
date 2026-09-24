import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, SearchInput, Pagination } from '@/components/ui'
import type { AuditLog } from '@/types'

export default function AuditLogs() {
  const store = useStore()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const logs = store.auditLogs.filter(l => {
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    const name = l.userName ? l.userName.toLowerCase() : ''
    const action = l.action ? l.action.toLowerCase() : ''
    const desc = l.description ? l.description.toLowerCase() : ''
    return name.includes(s) || action.includes(s) || desc.includes(s)
  })

  const totalPages = Math.ceil(logs.length / pageSize)
  const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize)

  const columns = [
    {
      key: 'date',
      header: t('วัน-เวลา', 'Timestamp'),
      render: (l: AuditLog) => {
        const rawDate = l.createdAt || (l as any).timestamp
        const dateStr = rawDate ? String(rawDate).replace('T', ' ').substring(0, 19) : '-'
        return (
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
            {dateStr}
          </span>
        )
      },
    },
    {
      key: 'user',
      header: t('ผู้ดำเนินการ', 'Actor'),
      render: (l: AuditLog) => {
        const roleLabels: Record<string, { th: string; en: string }> = {
          student: { th: 'นักศึกษา', en: 'Student' },
          advisor: { th: 'อาจารย์ที่ปรึกษา', en: 'Faculty Advisor' },
          qa_chair: { th: 'ประกันคุณภาพ/ประธานหลักสูตร', en: 'QA / Program Chair' },
          admin: { th: 'ผู้ดูแลระบบ', en: 'Admin' },
        }
        const r = roleLabels[l.userRole] || { th: l.userRole || 'Admin', en: l.userRole || 'Admin' }
        return (
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{l.userName || '-'}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">{t(r.th, r.en)}</p>
          </div>
        )
      },
    },
    {
      key: 'action',
      header: t('ประเภทเหตุการณ์', 'Event Action'),
      render: (l: AuditLog) => (
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-100 dark:border-sky-800">
          {l.action}
        </span>
      ),
    },
    {
      key: 'desc',
      header: t('รายละเอียดเหตุการณ์', 'Event Details'),
      render: (l: AuditLog) => <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{l.description}</span>,
    },
    {
      key: 'target',
      header: t('รหัสอ้างอิงเป้าหมาย', 'Entity Ref'),
      render: (l: AuditLog) => <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{l.targetId || '—'}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('ประวัติการตรวจสอบและบันทึกความปลอดภัยระบบ', 'Audit Trail & Security Logs')}
        description={t('บันทึกกิจกรรมย้อนหลังที่เปลี่ยนแปลงไม่ได้ ครอบคลุมการให้คำปรึกษา การจัดสรรคู่ที่ปรึกษา และการอนุมัติคำร้อง', 'Immutable record of advising actions, roster changes, document uploads, and case reviews.')}
      />
      <div className="mb-5 max-w-sm">
        <SearchInput value={search} onChange={e => { setSearch(e); setPage(1) }} placeholder={t('ค้นหาประวัติการทำงาน...', 'Search audit logs...')} />
      </div>
      <DataTable columns={columns} data={paginatedLogs} emptyMessage={t('ไม่พบบันทึกการตรวจสอบที่ตรงกับคำค้นหา', 'No audit logs match query.')} />
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}

