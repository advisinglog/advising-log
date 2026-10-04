import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput, Modal } from '@/components/ui'
import type { DocumentType } from '@/types'
import { FileText, PenTool, Fingerprint, Plus, Edit2, Trash2, CheckCircle2, Sparkles, FileCheck, ArrowRightLeft, Clock, GraduationCap, AlertCircle } from 'lucide-react'

// Pre-built University Document Templates with clean separate Thai & English
const PRESET_DOCUMENTS = [
  {
    nameEn: 'Scholarship Renewal Form',
    nameTh: 'แบบฟอร์มขอรับและต่ออายุทุนการศึกษา',
    signatureMethod: 'wet_signature' as const,
    icon: <GraduationCap className="h-4 w-4 text-emerald-500" />,
    descEn: 'Official scholarship continuation paperwork requiring advisor wet signature.',
    descTh: 'แบบฟอร์มต่ออายุทุนการศึกษาที่ต้องมีลายมือชื่อจริงของอาจารย์ที่ปรึกษา',
  },
  {
    nameEn: 'Leave of Absence Form',
    nameTh: 'คำร้องขอลาพักการศึกษา',
    signatureMethod: 'wet_signature' as const,
    icon: <Clock className="h-4 w-4 text-amber-500" />,
    descEn: 'Formal petition to temporarily suspend studies for personal or medical reasons.',
    descTh: 'คำร้องขอหยุดพักการเรียนชั่วคราวด้วยเหตุผลส่วนตัวหรือสุขภาพ',
  },
  {
    nameEn: 'Internship Agreement',
    nameTh: 'หนังสือยินยอมและข้อตกลงการฝึกงาน',
    signatureMethod: 'e_signature' as const,
    icon: <FileCheck className="h-4 w-4 text-cyan-500" />,
    descEn: 'Co-op and summer internship agreement with digital e-signature.',
    descTh: 'หนังสือยินยอมและข้อตกลงการฝึกงาน/สหกิจศึกษาพร้อมลายมือชื่ออิเล็กทรอนิกส์',
  },
  {
    nameEn: 'Course Add/Drop Form',
    nameTh: 'คำร้องขอเพิ่มหรือถอนรายวิชา',
    signatureMethod: 'e_signature' as const,
    icon: <FileText className="h-4 w-4 text-sky-500" />,
    descEn: 'Course schedule change or section swap with digital endorsement.',
    descTh: 'คำร้องขอปรับเปลี่ยนรายวิชาหรือสลับกลุ่มเรียนผ่านระบบดิจิทัล',
  },
  {
    nameEn: 'Withdrawal Form',
    nameTh: 'คำร้องขอพ้นสภาพหรือลาออก',
    signatureMethod: 'wet_signature' as const,
    icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
    descEn: 'Permanent resignation or withdrawal form requiring physical sign-off.',
    descTh: 'คำร้องขอลาออกจากการเป็นนักศึกษาอย่างเป็นทางการ',
  },
  {
    nameEn: 'Recommendation Request',
    nameTh: 'คำร้องขอหนังสือรับรองจากอาจารย์',
    signatureMethod: 'e_signature' as const,
    icon: <Sparkles className="h-4 w-4 text-indigo-500" />,
    descEn: 'Faculty recommendation letter request for jobs or postgraduate study.',
    descTh: 'คำร้องขอหนังสือรับรองความประพฤติหรือผลการเรียนจากอาจารย์',
  },
  {
    nameEn: 'Grade Appeal & Review Form',
    nameTh: 'คำร้องขอทบทวนผลการเรียน',
    signatureMethod: 'wet_signature' as const,
    icon: <AlertCircle className="h-4 w-4 text-purple-500" />,
    descEn: 'Formal grade examination review requiring dean signature.',
    descTh: 'คำร้องขอตรวจสอบคะแนนและผลการเรียนอย่างเป็นทางการ',
  },
  {
    nameEn: 'Change of Major / Program Transfer',
    nameTh: 'คำร้องขอย้ายสาขาวิชา',
    signatureMethod: 'wet_signature' as const,
    icon: <ArrowRightLeft className="h-4 w-4 text-blue-500" />,
    descEn: 'Transfer request between majors or academic schools.',
    descTh: 'คำร้องขอย้ายหลักสูตรหรือสำนักวิชา',
  },
]

export default function DocumentTypes() {
  const store = useStore()
  const { language, t } = useLanguage()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null)
  const [formName, setFormName] = useState('')
  const [formSignatureMethod, setFormSignatureMethod] = useState<'wet_signature' | 'e_signature'>('e_signature')
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete State
  const [docTypeToDelete, setDocTypeToDelete] = useState<DocumentType | null>(null)

  // Dynamic localization dictionary helper for standard known form names
  function getLocalizedDocName(name: string): string {
    const found = PRESET_DOCUMENTS.find(
      p => p.nameEn.toLowerCase() === name.toLowerCase() || p.nameTh.toLowerCase() === name.toLowerCase()
    )
    if (found) {
      return language === 'th' ? found.nameTh : found.nameEn
    }
    return name
  }

  const docTypes = store.documentTypes.filter(d => {
    if (!search.trim()) return true
    const localized = getLocalizedDocName(d.name).toLowerCase()
    return localized.includes(search.trim().toLowerCase()) || d.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  function applyPreset(preset: typeof PRESET_DOCUMENTS[0]) {
    setFormName(language === 'th' ? preset.nameTh : preset.nameEn)
    setFormSignatureMethod(preset.signatureMethod)
    setFormIsActive(true)
  }

  function handleLoadAllPresets() {
    let addedCount = 0
    for (const preset of PRESET_DOCUMENTS) {
      const exists = store.documentTypes.some(
        d => d.name.toLowerCase() === preset.nameEn.toLowerCase() || d.name.toLowerCase() === preset.nameTh.toLowerCase()
      )
      if (!exists) {
        store.addDocumentType({
          name: preset.nameEn,
          signatureMethod: preset.signatureMethod,
          isActive: true,
        })
        addedCount++
      }
    }
    if (addedCount > 0) {
      addToast('success', t('ติดตั้งแม่แบบเอกสารสำเร็จ', 'Document Templates Loaded'), t(`เพิ่มแบบฟอร์มมาตรฐาน ${addedCount} รายการเรียบร้อยแล้ว`, `Added ${addedCount} standard document forms.`))
    } else {
      addToast('info', t('มีแบบฟอร์มครบแล้ว', 'All Forms Present'), t('แบบฟอร์มมาตรฐานทั้งหมดมีอยู่ในระบบแล้ว', 'All standard forms are already configured.'))
    }
  }

  function openCreateModal() {
    setEditingDocType(null)
    setFormName('')
    setFormSignatureMethod('e_signature')
    setFormIsActive(true)
    setShowModal(true)
  }

  function openEditModal(d: DocumentType) {
    setEditingDocType(d)
    setFormName(getLocalizedDocName(d.name))
    setFormSignatureMethod(d.signatureMethod)
    setFormIsActive(d.isActive)
    setShowModal(true)
  }

  function handleSave() {
    const cleanName = formName.trim()
    if (!cleanName) {
      addToast('warning', t('กรุณากรอกชื่อเอกสาร', 'Document Name Required'), t('โปรดระบุชื่อแบบฟอร์มเอกสาร', 'Please enter a document name.'))
      return
    }

    if (editingDocType) {
      store.updateDocumentType(editingDocType.id, {
        name: cleanName,
        signatureMethod: formSignatureMethod,
        isActive: formIsActive,
      })
      addToast('success', t('บันทึกสำเร็จ', 'Updated Successfully'), t('แก้ไขประเภทเอกสารเรียบร้อยแล้ว', 'Document type has been updated.'))
    } else {
      store.addDocumentType({
        name: cleanName,
        signatureMethod: formSignatureMethod,
        isActive: formIsActive,
      })
      addToast('success', t('เพิ่มเอกสารสำเร็จ', 'Document Type Added'), t('สร้างประเภทเอกสารใหม่เรียบร้อยแล้ว', 'New document type has been created.'))
    }

    setShowModal(false)
  }

  function handleDeleteConfirm() {
    if (!docTypeToDelete) return
    store.deleteDocumentType(docTypeToDelete.id)
    addToast('success', t('ลบสำเร็จ', 'Deleted Successfully'), t('ลบประเภทเอกสารเรียบร้อยแล้ว', 'Document type deleted.'))
    setDocTypeToDelete(null)
  }

  const columns = [
    {
      key: 'name',
      header: t('ชื่อเอกสาร / แบบฟอร์ม', 'Document Name'),
      render: (d: DocumentType) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-sky-700 dark:text-sky-300 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{getLocalizedDocName(d.name)}</span>
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
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => store.updateDocumentType(d.id, { isActive: !d.isActive })}>
            {d.isActive ? t('ปิดใช้งาน', 'Disable') : t('เปิดใช้งาน', 'Enable')}
          </Button>
          <button
            type="button"
            onClick={() => openEditModal(d)}
            title={t('แก้ไข', 'Edit')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDocTypeToDelete(d)}
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
        title={t('การกำหนดแบบฟอร์มและเอกสาร', 'Document Types & Templates')}
        description={t('จัดการแบบฟอร์มการให้คำปรึกษาที่จำเป็น รูปแบบการลงนาม และเอกสารระเบียบข้อบังคับ', 'Configure mandatory advising forms, signoff methods, and compliance documentation.')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleLoadAllPresets} className="flex items-center gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('ติดตั้งแม่แบบมาตรฐาน', 'Load All Form Presets')}</span>
            </Button>
            <Button onClick={openCreateModal} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>{t('เพิ่มประเภทเอกสาร', 'Add Document Type')}</span>
            </Button>
          </div>
        }
      />

      {/* Quick 1-Click Form Presets Banner */}
      <div className="p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 dark:from-sky-950/30 dark:via-slate-900 dark:to-sky-950/20 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {t('แม่แบบแบบฟอร์มมหาวิทยาลัยมาตรฐาน', 'Standard Academic Forms')}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('คลิกเพื่อเพิ่มแบบฟอร์มการลาออก/ลาพัก และคำร้องทั่วไปพร้อมรูปแบบการลงนามที่ถูกต้อง', 'Click any form preset to auto-fill title and signature requirements.')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
          {PRESET_DOCUMENTS.map((preset, idx) => {
            const isAlreadyAdded = store.documentTypes.some(
              d => d.name.toLowerCase() === preset.nameEn.toLowerCase() || d.name.toLowerCase() === preset.nameTh.toLowerCase()
            )
            const formTitle = language === 'th' ? preset.nameTh : preset.nameEn
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setEditingDocType(null)
                  applyPreset(preset)
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
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{formTitle}</p>
                    {isAlreadyAdded && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex-shrink-0">
                        {t('มีแล้ว', 'Added')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      preset.signatureMethod === 'e_signature'
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    }`}>
                      {preset.signatureMethod === 'e_signature' ? t('ลายเซ็นดิจิทัล', 'E-Signature') : t('ลายมือจริง', 'Wet Signature')}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-5 max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder={t('ค้นหาแบบฟอร์มเอกสาร...', 'Search documents...')} />
      </div>
      <DataTable columns={columns} data={docTypes} emptyMessage={t('ไม่พบข้อมูลแบบฟอร์มเอกสาร', 'No document types found.')} />

      {/* Add / Edit Document Type Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDocType ? t('แก้ไขประเภทเอกสาร', 'Edit Document Type') : t('เพิ่มประเภทเอกสารใหม่', 'Add Document Type')}
        size="md"
      >
        <div className="space-y-4 pt-1">
          {/* Quick Preset Selector inside modal */}
          {!editingDocType && (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {t('เลือกจากแม่แบบด่วน', 'Quick Fill from Template')}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_DOCUMENTS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-500 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer truncate max-w-[200px]"
                  >
                    {language === 'th' ? p.nameTh : p.nameEn}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('ชื่อแบบฟอร์ม / เอกสาร *', 'Document Name *')}
            </label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder={t('เช่น คำร้องขอลาพักการศึกษา', 'e.g. Leave of Absence Request')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              {t('รูปแบบการลงนามที่ต้องการ', 'Required Validation / Signature Method')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormSignatureMethod('e_signature')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  formSignatureMethod === 'e_signature'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Fingerprint className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{t('ลายเซ็นดิจิทัล', 'E-Signature')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  {t('ลงชื่อออนไลน์ผ่านระบบ AdvisingLog', 'Direct in-app cryptographic signature')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormSignatureMethod('wet_signature')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  formSignatureMethod === 'wet_signature'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <PenTool className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>{t('ลายมือจริง', 'Wet Signature')}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  {t('พิมพ์เอกสารออกมาเซ็นด้วยปากกา', 'Physical printout and signed with pen')}
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="docActiveCheck"
              checked={formIsActive}
              onChange={e => setFormIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="docActiveCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              {t('เปิดใช้งานเอกสารประเภทนี้ในระบบ', 'Active status (available for students & advisors)')}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{editingDocType ? t('บันทึกการแก้ไข', 'Save Changes') : t('สร้างประเภทเอกสาร', 'Create Document Type')}</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={docTypeToDelete !== null}
        onClose={() => setDocTypeToDelete(null)}
        title={t('ยืนยันการลบประเภทเอกสาร', 'Delete Document Type')}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(
              `คุณแน่ใจหรือไม่ว่าต้องการลบแบบฟอร์มเอกสาร "${docTypeToDelete ? getLocalizedDocName(docTypeToDelete.name) : ''}" ออกจากระบบ?`,
              `Are you sure you want to delete the document type "${docTypeToDelete?.name}"?`
            )}
          </p>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setDocTypeToDelete(null)}>
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
