import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput } from '@/components/ui'
import type { AdvisingCategoryConfig } from '@/types'
import { Tag } from 'lucide-react'

export default function Categories() {
  const store = useStore()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const [search, setSearch] = useState('')

  const categories = store.categoryConfigs.filter(c => {
    if (!search) return true
    const label = getCategoryLabel(c.value).toLowerCase()
    return label.includes(search.toLowerCase()) || c.value.toLowerCase().includes(search.toLowerCase())
  })

  const columns = [
    {
      key: 'label',
      header: t('ชื่อหมวดหมู่การให้คำปรึกษา', 'Category Name'),
      render: (c: AdvisingCategoryConfig) => (
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{getCategoryLabel(c.value)}</span>
        </div>
      ),
    },
    { key: 'value', header: t('รหัสอ้างอิงระบบ', 'Internal Key'), render: (c: AdvisingCategoryConfig) => <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{c.value}</span> },
    {
      key: 'sub',
      header: t('หัวข้อย่อยที่กำหนด', 'Configured Sub-categories'),
      render: (c: AdvisingCategoryConfig) => (
        <div className="flex flex-wrap gap-1.5 max-w-sm">
          {c.subCategories.slice(0, 3).map((sc, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100/80 dark:bg-slate-800 rounded-md text-[11px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700">
              {getSubCategoryLabel(sc)}
            </span>
          ))}
          {c.subCategories.length > 3 && (
            <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/60 rounded-md text-[11px] font-medium text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800">
              +{c.subCategories.length - 3} {t('รายการเพิ่มเติม', 'more')}
            </span>
          )}
          {c.subCategories.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{t('ไม่มี', 'None configured')}</span>}
        </div>
      ),
    },
    { key: 'status', header: t('สถานะ', 'Status'), render: (c: AdvisingCategoryConfig) => <StatusBadge status={c.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: t('การจัดการ', 'Action'),
      render: (c: AdvisingCategoryConfig) => (
        <Button size="sm" variant="secondary" onClick={() => store.updateCategory(c.id, { isActive: !c.isActive })}>
          {c.isActive ? t('ปิดใช้งาน', 'Disable') : t('เปิดใช้งาน', 'Enable')}
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('การตั้งค่าหมวดหมู่การให้คำปรึกษา', 'Advising Categories')}
        description={t('กำหนดขอบเขตและหัวข้อประเด็นการให้คำปรึกษาสำหรับระบบอาจารย์ที่ปรึกษา', 'Configure available advising topic domains and sub-category taxonomies.')}
      />
      <div className="mb-5 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาหมวดหมู่...', 'Search categories...')} />
      </div>
      <DataTable columns={columns} data={categories} emptyMessage={t('ไม่พบข้อมูลหมวดหมู่', 'No categories found.')} />
    </div>
  )
}

