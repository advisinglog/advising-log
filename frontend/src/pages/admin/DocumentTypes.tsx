import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput } from '@/components/ui'
import type { DocumentType } from '@/types'
import { FileText, PenTool, Fingerprint } from 'lucide-react'

export default function DocumentTypes() {
  const store = useStore()
  const { t } = useLanguage()
  const [search, setSearch] = useState('')

  const docTypes = store.documentTypes.filter(d => {
    if (!search.trim()) return true
    return d.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  const columns = [
    {
      key: 'name',
      header: t('ชื่อเอกสาร / แบบฟอร์ม', 'Document Name'),
      render: (d: DocumentType) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{d.name}</span>
        </div>
      ),
    },
    {
      key: 'signature',
      header: t('รูปแบบการลงนาม', 'Validation Method'),
      render: (d: DocumentType) => (
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => store.updateDocumentType(d.id, { signatureMethod: 'wet_signature' })}
            className={`px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
              d.signatureMethod === 'wet_signature'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-700 dark:hover:text-amber-400'
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>{t('ลายมือจริง', 'Wet Signature')}</span>
          </button>
          <button
            type="button"
            onClick={() => store.updateDocumentType(d.id, { signatureMethod: 'e_signature' })}
            className={`px-3 py-1.5 border-l border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 ${
              d.signatureMethod === 'e_signature'
                ? 'bg-sky-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 hover:text-sky-700 dark:hover:text-sky-400'
            }`}
          >
            <Fingerprint className="h-3 w-3" />
            <span>{t('ลายเซ็นดิจิทัล', 'E-Signature')}</span>
          </button>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('สถานะ', 'Status'),
      render: (d: DocumentType) => <StatusBadge status={d.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Action'),
      render: (d: DocumentType) => (
        <Button size="sm" variant="secondary" onClick={() => store.updateDocumentType(d.id, { isActive: !d.isActive })}>
          {d.isActive ? t('ปิดใช้งาน', 'Disable') : t('เปิดใช้งาน', 'Enable')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('การกำหนดแบบฟอร์มและเอกสาร', 'Document Types & Templates')}
        description={t('จัดการแบบฟอร์มการให้คำปรึกษาที่จำเป็น รูปแบบการลงนาม และเอกสารระเบียบข้อบังคับ', 'Configure mandatory advising forms, signoff methods, and compliance documentation.')}
      />
      <div className="mb-5 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาแบบฟอร์มเอกสาร...', 'Search documents...')} />
      </div>
      <DataTable columns={columns} data={docTypes} emptyMessage={t('ไม่พบข้อมูลแบบฟอร์มเอกสาร', 'No document types found.')} />
    </div>
  )
}
