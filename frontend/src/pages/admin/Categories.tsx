import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput, Modal } from '@/components/ui'
import type { AdvisingCategoryConfig } from '@/types'
import { Tag, Plus, Edit2, Trash2, X, CheckCircle2 } from 'lucide-react'

export default function Categories() {
  const store = useStore()
  const { t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdvisingCategoryConfig | null>(null)
  const [formKey, setFormKey] = useState('')
  const [formLabel, setFormLabel] = useState('')
  const [formSubCategories, setFormSubCategories] = useState<string[]>([])
  const [newSubInput, setNewSubInput] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete State
  const [categoryToDelete, setCategoryToDelete] = useState<AdvisingCategoryConfig | null>(null)

  const categories = store.categoryConfigs.filter(c => {
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    const label = (c.label || getCategoryLabel(c.value)).toLowerCase()
    return label.includes(s) || c.value.toLowerCase().includes(s)
  })

  function openCreateModal() {
    setEditingCategory(null)
    setFormKey('')
    setFormLabel('')
    setFormSubCategories([])
    setNewSubInput('')
    setFormIsActive(true)
    setShowModal(true)
  }

  function openEditModal(c: AdvisingCategoryConfig) {
    setEditingCategory(c)
    setFormKey(c.value)
    setFormLabel(c.label || getCategoryLabel(c.value))
    setFormSubCategories([...c.subCategories])
    setNewSubInput('')
    setFormIsActive(c.isActive)
    setShowModal(true)
  }

  function handleAddSubCategory() {
    const trimmed = newSubInput.trim()
    if (!trimmed) return
    if (formSubCategories.includes(trimmed)) {
      addToast('warning', t('หัวข้อย่อยซ้ำ', 'Duplicate Subcategory'), t('มีหัวข้อย่อยนี้อยู่แล้ว', 'This subcategory already exists.'))
      return
    }
    setFormSubCategories(prev => [...prev, trimmed])
    setNewSubInput('')
  }

  function handleRemoveSubCategory(idx: number) {
    setFormSubCategories(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    const cleanKey = formKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!cleanKey) {
      addToast('warning', t('กรุณากรอกรหัสหมวดหมู่', 'Category Key Required'), t('โปรดระบุรหัสอ้างอิงหมวดหมู่', 'Please enter a category key.'))
      return
    }

    const cleanLabel = formLabel.trim() || cleanKey

    if (editingCategory) {
      store.updateCategory(editingCategory.id, {
        value: cleanKey as any,
        label: cleanLabel,
        subCategories: formSubCategories,
        isActive: formIsActive,
      })
      addToast('success', t('บันทึกสำเร็จ', 'Updated Successfully'), t('แก้ไขข้อมูลหมวดหมู่เรียบร้อยแล้ว', 'Advising category has been updated.'))
    } else {
      // Check duplicate
      const exists = store.categoryConfigs.some(c => c.value.toLowerCase() === cleanKey)
      if (exists) {
        addToast('warning', t('รหัสหมวดหมู่ซ้ำ', 'Duplicate Key'), t('มีรหัสหมวดหมู่นี้ในระบบแล้ว', 'This category key already exists.'))
        return
      }

      store.addCategory({
        value: cleanKey as any,
        label: cleanLabel,
        subCategories: formSubCategories,
        isActive: formIsActive,
      })
      addToast('success', t('เพิ่มหมวดหมู่สำเร็จ', 'Category Added'), t('สร้างหมวดหมู่การให้คำปรึกษาใหม่เรียบร้อยแล้ว', 'New advising category has been created.'))
    }

    setShowModal(false)
  }

  function handleDeleteConfirm() {
    if (!categoryToDelete) return
    store.deleteCategory(categoryToDelete.id)
    addToast('success', t('ลบสำเร็จ', 'Deleted Successfully'), t('ลบหมวดหมู่การให้คำปรึกษาเรียบร้อยแล้ว', 'Category deleted.'))
    setCategoryToDelete(null)
  }

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
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => store.updateCategory(c.id, { isActive: !c.isActive })}>
            {c.isActive ? t('ปิดใช้งาน', 'Disable') : t('เปิดใช้งาน', 'Enable')}
          </Button>
          <button
            type="button"
            onClick={() => openEditModal(c)}
            title={t('แก้ไข', 'Edit')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCategoryToDelete(c)}
            title={t('ลบ', 'Delete')}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('การตั้งค่าหมวดหมู่การให้คำปรึกษา', 'Advising Categories')}
        description={t('กำหนดขอบเขตและหัวข้อประเด็นการให้คำปรึกษาสำหรับระบบอาจารย์ที่ปรึกษา', 'Configure available advising topic domains and sub-category taxonomies.')}
        actions={
          <Button onClick={openCreateModal} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>{t('เพิ่มหมวดหมู่ใหม่', 'Add Category')}</span>
          </Button>
        }
      />
      <div className="mb-5 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาหมวดหมู่...', 'Search categories...')} />
      </div>
      <DataTable columns={columns} data={categories} emptyMessage={t('ไม่พบข้อมูลหมวดหมู่', 'No categories found.')} />

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? t('แก้ไขหมวดหมู่การให้คำปรึกษา', 'Edit Advising Category') : t('เพิ่มหมวดหมู่การให้คำปรึกษาใหม่', 'Add Advising Category')}
        size="md"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('ชื่อหมวดหมู่การให้คำปรึกษา *', 'Category Display Name *')}
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="e.g. Mental Health Support / การสนับสนุนสุขภาวะทางจิต"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('รหัสอ้างอิงหมวดหมู่ (Internal Key) *', 'Category Key / Slug *')}
            </label>
            <input
              type="text"
              value={formKey}
              onChange={e => setFormKey(e.target.value)}
              placeholder="e.g. mental_health, academic_warning"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {t('ใช้ตัวอักษรภาษาอังกฤษตัวพิมพ์เล็กและเครื่องหมาย _ เท่านั้น', 'Lowercase alphanumeric characters and underscores only.')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('หัวข้อย่อย (Subcategories)', 'Subcategories')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubInput}
                onChange={e => setNewSubInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubCategory()
                  }
                }}
                placeholder={t('พิมพ์หัวข้อย่อยแล้วกดเพิ่ม...', 'Type subcategory and press Add...')}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Button size="sm" type="button" onClick={handleAddSubCategory}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('เพิ่ม', 'Add')}
              </Button>
            </div>

            {/* Subcategory Chips */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 min-h-[50px] items-center">
              {formSubCategories.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                  {t('ยังไม่มีหัวข้อย่อย', 'No subcategories added yet.')}
                </span>
              ) : (
                formSubCategories.map((sc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    <span>{sc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCategory(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="catActiveCheck"
              checked={formIsActive}
              onChange={e => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="catActiveCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              {t('เปิดใช้งานหมวดหมู่นี้ในระบบ', 'Active status (available for students & advisors)')}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{editingCategory ? t('บันทึกการแก้ไข', 'Save Changes') : t('สร้างหมวดหมู่', 'Create Category')}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        title={t('ยืนยันการลบหมวดหมู่', 'Delete Category')}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(
              `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${categoryToDelete ? getCategoryLabel(categoryToDelete.value) : ''}" ออกจากระบบ?`,
              `Are you sure you want to delete the category "${categoryToDelete?.value}"?`
            )}
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setCategoryToDelete(null)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              {t('ยืนยันการลบ', 'Confirm Delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
