import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput, Modal } from '@/components/ui'
import type { AdvisingCategoryConfig } from '@/types'
import { Tag, Plus, Edit2, Trash2, X, CheckCircle2, Sparkles, BookOpen, Briefcase, HeartHandshake, Award, Globe, FlaskConical, LogOut } from 'lucide-react'

// Pre-built University Advising Category Templates with clean separate Thai & English
const PRESET_TEMPLATES = [
  {
    labelEn: 'Academic Advising & Course Planning',
    labelTh: 'การวางแผนการเรียนและคำแนะนำทางวิชาการ',
    value: 'academic_advising',
    icon: <BookOpen className="h-4 w-4 text-sky-500" />,
    subCategoriesEn: ['Course Registration', 'GPA Improvement Plan', 'Graduation Audit', 'Prerequisite Waiver'],
    subCategoriesTh: ['การลงทะเบียนรายวิชา', 'แผนพัฒนาผลการเรียน (GPA)', 'ตรวจสอบการสำเร็จการศึกษา', 'การขอปลดล็อกวิชาบังคับก่อน'],
  },
  {
    labelEn: 'Career & Internship Guidance',
    labelTh: 'การแนะแนวอาชีพและการฝึกงาน',
    value: 'career_internship',
    icon: <Briefcase className="h-4 w-4 text-amber-500" />,
    subCategoriesEn: ['Resume & Portfolio Review', 'Internship Placement', 'Job Search Strategy', 'Industry Mentorship'],
    subCategoriesTh: ['ตรวจเรซูเม่และพอร์ตโฟลิโอ', 'การจัดหาสถานที่ฝึกงาน', 'กลยุทธ์การหางาน', 'การปรึกษาผู้เชี่ยวชาญในสายงาน'],
  },
  {
    labelEn: 'Mental Health & Well-being Support',
    labelTh: 'การดูแลสุขภาวะและสุขภาพจิต',
    value: 'mental_health',
    icon: <HeartHandshake className="h-4 w-4 text-rose-500" />,
    subCategoriesEn: ['Stress & Burnout', 'Personal Counseling Referral', 'Academic Anxiety', 'Peer Support'],
    subCategoriesTh: ['ความเครียดและหมดไฟ', 'การส่งต่อผู้เชี่ยวชาญด้านจิตวิทยา', 'ความกังวลด้านการเรียน', 'การสนับสนุนจากเพื่อน'],
  },
  {
    labelEn: 'Scholarship & Financial Aid',
    labelTh: 'ทุนการศึกษาและความช่วยเหลือทางการเงิน',
    value: 'scholarship_aid',
    icon: <Award className="h-4 w-4 text-emerald-500" />,
    subCategoriesEn: ['Tuition Fee Waiver', 'Emergency Financial Grant', 'External Foundation Scholarship', 'Work-Study Program'],
    subCategoriesTh: ['ทุนยกเว้นค่าเล่าเรียน', 'ทุนช่วยเหลือฉุกเฉิน', 'ทุนมูลนิธิภายนอก', 'โครงการทำงานพิเศษในมหาวิทยาลัย'],
  },
  {
    labelEn: 'Study Abroad & Student Exchange',
    labelTh: 'การศึกษาต่อต่างประเทศและนักศึกษาแลกเปลี่ยน',
    value: 'study_abroad',
    icon: <Globe className="h-4 w-4 text-indigo-500" />,
    subCategoriesEn: ['Partner University Exchange', 'Credit Transfer Inquiry', 'Scholarship for Exchange', 'Visa & Documentation'],
    subCategoriesTh: ['โครงการแลกเปลี่ยนมหาวิทยาลัยคู่สัญญา', 'การเทียบโอนหน่วยกิต', 'ทุนโครงการแลกเปลี่ยน', 'วีซ่าและเอกสารเดินทาง'],
  },
  {
    labelEn: 'Senior Project & Research Mentorship',
    labelTh: 'โครงงานปริญญานิพนธ์และการวิจัย',
    value: 'research_project',
    icon: <FlaskConical className="h-4 w-4 text-purple-500" />,
    subCategoriesEn: ['Thesis Topic Selection', 'Advisor Matching', 'Lab Equipment Access', 'Research Publication'],
    subCategoriesTh: ['การเลือกหัวข้อปริญญานิพนธ์', 'การจับคู่อาจารย์ที่ปรึกษาวิจัย', 'การเข้าใช้ห้องปฏิบัติการ', 'การตีพิมพ์เผยแพร่ผลงานวิจัย'],
  },
  {
    labelEn: 'Withdrawal & Leave of Absence',
    labelTh: 'การลาพักการศึกษาหรือลาออก',
    value: 'withdrawal_leave',
    icon: <LogOut className="h-4 w-4 text-orange-500" />,
    subCategoriesEn: ['Temporary Leave of Absence', 'Major Transfer', 'Permanent Withdrawal', 'Academic Restart'],
    subCategoriesTh: ['การลาพักการศึกษาชั่วคราว', 'การขอย้ายสาขาวิชา', 'การขอลาออกจากการเป็นนักศึกษา', 'การขอเริ่มแผนการเรียนใหม่'],
  },
  {
    labelEn: 'Course Registration & Enrollment',
    labelTh: 'การลงทะเบียนเรียนและแผนการเรียน',
    value: 'registration',
    icon: <BookOpen className="h-4 w-4 text-cyan-500" />,
    subCategoriesEn: ['Add/Drop Course Petition', 'Section Change Request', 'Registration Hold Resolution', 'Credit Overload Permit'],
    subCategoriesTh: ['คำร้องขอเพิ่ม/ถอนรายวิชา', 'คำร้องขอย้ายกลุ่มเรียน', 'การปลดล็อกเงื่อนไขการลงทะเบียน', 'การขออนุมัติลงทะเบียนเกินหน่วยกิต'],
  },
]

export default function Categories() {
  const store = useStore()
  const { language, t, getCategoryLabel, getSubCategoryLabel } = useLanguage()
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

  function handleLabelChange(text: string) {
    setFormLabel(text)
    // Automatically derive clean key from label if creating new
    if (!editingCategory) {
      const derived = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 32)
      setFormKey(derived)
    }
  }

  function applyPreset(preset: typeof PRESET_TEMPLATES[0]) {
    setFormLabel(language === 'th' ? preset.labelTh : preset.labelEn)
    setFormKey(preset.value)
    setFormSubCategories(language === 'th' ? [...preset.subCategoriesTh] : [...preset.subCategoriesEn])
  }

  function handleLoadAllPresets() {
    let addedCount = 0
    for (const preset of PRESET_TEMPLATES) {
      const exists = store.categoryConfigs.some(c => c.value.toLowerCase() === preset.value.toLowerCase())
      if (!exists) {
        store.addCategory({
          value: preset.value as any,
          label: preset.labelEn,
          subCategories: preset.subCategoriesEn,
          isActive: true,
        })
        addedCount++
      }
    }
    if (addedCount > 0) {
      addToast('success', t('ติดตั้งแม่แบบสำเร็จ', 'Presets Loaded'), t(`เพิ่มหมวดหมู่แนะนำ ${addedCount} รายการเรียบร้อยแล้ว`, `Added ${addedCount} standard advising categories.`))
    } else {
      addToast('info', t('มีหมวดหมู่ครบแล้ว', 'All Presets Present'), t('หมวดหมู่แนะนำทั้งหมดมีอยู่ในระบบแล้ว', 'All standard categories are already configured.'))
    }
  }

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
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
            {getCategoryLabel(c.value) !== c.value ? getCategoryLabel(c.value) : (c.label || c.value)}
          </span>
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
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleLoadAllPresets} className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('ติดตั้งแม่แบบมาตรฐาน', 'Load All Presets')}</span>
            </Button>
            <Button onClick={openCreateModal} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>{t('เพิ่มหมวดหมู่ใหม่', 'Add Category')}</span>
            </Button>
          </div>
        }
      />

      {/* Quick 1-Click Template Banner */}
      <div className="p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-sky-950/20 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {t('แม่แบบหมวดหมู่แนะนำด่วน', 'Recommended Category Presets')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('คลิกเพื่อเปิดแบบฟอร์มพร้อมกรอกข้อมูลและหัวข้อย่อยให้อัตโนมัติ', 'Click any preset below to auto-fill category name and subtopics instantly.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {PRESET_TEMPLATES.map((preset, idx) => {
            const isAlreadyAdded = store.categoryConfigs.some(c => c.value.toLowerCase() === preset.value.toLowerCase())
            const labelText = language === 'th' ? preset.labelTh : preset.labelEn
            const subList = language === 'th' ? preset.subCategoriesTh : preset.subCategoriesEn

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setEditingCategory(null)
                  applyPreset(preset)
                  setFormIsActive(true)
                  setShowModal(true)
                }}
                className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  isAlreadyAdded
                    ? 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                    : 'bg-white dark:bg-slate-800 border-sky-200 dark:border-sky-800/60 hover:border-sky-400 hover:shadow-xs hover:-translate-y-0.5'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/60 flex-shrink-0 mt-0.5">
                  {preset.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{labelText}</p>
                    {isAlreadyAdded && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                        {t('มีแล้ว', 'Added')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {subList.slice(0, 2).join(', ')}...
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

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
          {/* Quick Preset Selector inside modal */}
          {!editingCategory && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {t('เลือกจากแม่แบบด่วน', 'Quick Fill from Template')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {language === 'th' ? p.labelTh : p.labelEn}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('ชื่อหมวดหมู่การให้คำปรึกษา *', 'Category Display Name *')}
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={e => handleLabelChange(e.target.value)}
              placeholder={t('เช่น การดูแลสุขภาวะและสุขภาพจิต', 'e.g. Mental Health & Well-being Support')}
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
              placeholder={t('เช่น mental_health, academic_advising', 'e.g. mental_health, academic_advising')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {t('สร้างให้อัตโนมัติจากชื่อหมวดหมู่ หรือแก้ไขตามที่ต้องการ', 'Auto-generated from category name. You can customize it if needed.')}
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
                  {t('ยังไม่มีหัวข้อย่อย (กดเพิ่มด้านบน)', 'No subcategories added yet.')}
                </span>
              ) : (
                formSubCategories.map((sc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    <span>{getSubCategoryLabel(sc)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCategory(idx)}
                      className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
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
              `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${categoryToDelete ? (getCategoryLabel(categoryToDelete.value) || categoryToDelete.label) : ''}" ออกจากระบบ?`,
              `Are you sure you want to delete the category "${categoryToDelete?.label || categoryToDelete?.value}"?`
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
