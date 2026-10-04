import { useState } from 'react'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput, Modal } from '@/components/ui'
import type { DocumentType } from '@/types'
import { FileText, PenTool, Fingerprint, Plus, Edit2, Trash2, CheckCircle2 } from 'lucide-react'

export default function DocumentTypes() {
  const store = useStore()
  const { t } = useLanguage()
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

  const docTypes = store.documentTypes.filter(d => {
    if (!search.trim()) return true
    return d.name.toLowerCase().includes(search.trim().toLowerCase())
  })

  function openCreateModal() {
    setEditingDocType(null)
    setFormName('')
    setFormSignatureMethod('e_signature')
    setFormIsActive(true)
    setShowModal(true)
  }

  function openEditModal(d: DocumentType) {
    setEditingDocType(d)
    setFormName(d.name)
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
          <Button onClick={openCreateModal} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            <span>{t('เพิ่มประเภทเอกสาร', 'Add Document Type')}</span>
          </Button>
        }
      />
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
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('ชื่อแบบฟอร์ม / เอกสาร *', 'Document Name *')}
            </label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="e.g. Leave of Absence Form (คำร้องขอลาพักการศึกษา)"
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
              `คุณแน่ใจหรือไม่ว่าต้องการลบแบบฟอร์มเอกสาร "${docTypeToDelete ? docTypeToDelete.name : ''}" ออกจากระบบ?`,
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
