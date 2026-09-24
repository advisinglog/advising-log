import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, Modal, ConfirmDialog, DocumentViewerModal, type DocumentViewerTarget } from '@/components/ui'
import type { StudentDocument } from '@/types'
import { FileText, Upload, AlertCircle, FileUp, X, ShieldCheck, Trash2, PenTool, Fingerprint, FileCheck, Eye, Download, Loader2, ChevronDown, Check } from 'lucide-react'
import { uploadFileToCloudinary, getCloudinaryViewUrl } from '@/services/cloudinaryService'
import { getLocalDateString } from '@/utils/dateUtils'

export default function Documents() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false)
  const [descriptionText, setDescriptionText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [simulatedFileName, setSimulatedFileName] = useState('')
  const [hasConsentedEsign, setHasConsentedEsign] = useState(false)
  const [formError, setFormError] = useState('')
  const [targetRequiredDocId, setTargetRequiredDocId] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<StudentDocument | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const isCurrentStudent = (id?: string | null) => {
    if (!id) return false
    return studentIdentifiers.has(id) ||
      (currentUser.code && id.toUpperCase() === currentUser.code.toUpperCase()) ||
      (currentUser.email && id.toLowerCase() === currentUser.email.toLowerCase())
  }

  const myDocs = store.documents.filter(d => isCurrentStudent(d.studentId))
  const activeDocumentTypes = store.documentTypes.filter(d => d.isActive)

  const selectedDocType = activeDocumentTypes.find(d => d.id === selectedTypeId)
  const currentFileName = selectedFile?.name || simulatedFileName

  function resetForm() {
    setSelectedTypeId('')
    setShowDocTypeDropdown(false)
    setDescriptionText('')
    setSelectedFile(null)
    setSimulatedFileName('')
    setHasConsentedEsign(false)
    setFormError('')
    setTargetRequiredDocId(null)
    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleOpenModal(preselectedDoc?: StudentDocument) {
    resetForm()
    if (preselectedDoc) {
      setSelectedTypeId(preselectedDoc.documentTypeId)
      setTargetRequiredDocId(preselectedDoc.id)
    }
    setIsModalOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setSimulatedFileName('')
      setFormError('')
    }
  }

  function handleSimulateSample(sampleName: string) {
    setSelectedFile(null)
    setSimulatedFileName(sampleName)
    setFormError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleRemoveFile() {
    setSelectedFile(null)
    setSimulatedFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleUploadSubmit() {
    if (!currentUser) return
    setFormError('')

    if (!selectedDocType) {
      setFormError(t('กรุณาเลือกประเภทเอกสาร', 'Please select a document type.'))
      return
    }

    if (!currentFileName) {
      setFormError(t('กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด', 'Please attach a document file to upload.'))
      return
    }

    if (selectedDocType.signatureMethod === 'e_signature' && !hasConsentedEsign) {
      setFormError(t('กรุณายืนยันการลงนามดิจิทัล (E-Signature) ก่อนอัปโหลด', 'Please tick the box to confirm your electronic signature.'))
      return
    }

    setIsUploading(true)
    try {
      let cloudPublicId: string | undefined
      let cloudUrl: string | undefined

      // Real Cloudinary Upload if a real file is attached
      if (selectedFile) {
        const uploadRes = await uploadFileToCloudinary(selectedFile, {
          studentCode: currentUser.code || currentUser.id,
        })
        cloudPublicId = uploadRes.publicId
        cloudUrl = uploadRes.secureUrl
      } else {
        // Mock fallback for simulated demo files
        cloudPublicId = `advising_docs/${currentUser.code || 'std'}_${Date.now()}_${simulatedFileName}`
      }

      const today = getLocalDateString()
      const status: StudentDocument['status'] = selectedDocType.signatureMethod === 'e_signature' ? 'signed' : 'uploaded'

      let resultDocId = ''

      // If uploading for a specific existing required document, update it
      if (targetRequiredDocId) {
        store.updateDocument(targetRequiredDocId, {
          fileName: currentFileName,
          status: status,
          signatureMethod: selectedDocType.signatureMethod,
          uploadedAt: today,
          signedAt: selectedDocType.signatureMethod === 'e_signature' ? today : undefined,
          description: descriptionText.trim() || undefined,
          cloudinaryPublicId: cloudPublicId,
          fileUrl: cloudUrl,
        })
        resultDocId = targetRequiredDocId
      } else {
        // Otherwise, add a new row to the table
        const newDoc = store.addDocument({
          studentId: currentUser.id,
          documentTypeId: selectedDocType.id,
          documentName: selectedDocType.name,
          fileName: currentFileName,
          status: status,
          signatureMethod: selectedDocType.signatureMethod,
          uploadedAt: today,
          signedAt: selectedDocType.signatureMethod === 'e_signature' ? today : undefined,
          description: descriptionText.trim() || undefined,
          cloudinaryPublicId: cloudPublicId,
          fileUrl: cloudUrl,
        })
        resultDocId = newDoc.id
      }

      store.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'document_uploaded',
        description: `Uploaded ${selectedDocType.name} (${selectedDocType.signatureMethod === 'e_signature' ? 'E-Signature verified' : 'Wet Signature pending advisor review'}) to Cloudinary [${cloudPublicId}]`,
        targetId: resultDocId,
      })

      addToast(
        'success',
        t('อัปโหลดเอกสารสำเร็จ', 'Document Uploaded'),
        `${selectedDocType.name} ${t('ถูกอัปโหลดขึ้นระบบ Cloudinary และบันทึกเรียบร้อยแล้ว', 'has been successfully uploaded to Cloudinary.')}`
      )

      setIsModalOpen(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.message || 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  function handleConfirmDelete() {
    if (!docToDelete || !currentUser) return
    const targetName = docToDelete.documentName
    const targetId = docToDelete.id

    store.deleteDocument(targetId)

    store.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'document_uploaded',
      description: `Deleted document ${targetName}`,
      targetId: targetId,
    })

    addToast(
      'info',
      t('ลบเอกสารสำเร็จ', 'Document Deleted'),
      `${targetName} ${t('ถูกลบออกจากรายการแล้ว', 'has been removed from your list.')}`
    )

    setDocToDelete(null)
  }

  async function handleTriggerDownload(doc: StudentDocument) {
    let url = doc.fileUrl || ''
    if (!url && doc.cloudinaryPublicId) {
      url = getCloudinaryViewUrl(doc.cloudinaryPublicId)
    }
    if (!url) return

    setDownloadingDocId(doc.id)
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = blobUrl
      link.download = doc.fileName || `${doc.documentName}.pdf`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      addToast('success', t('ดาวน์โหลดสำเร็จ', 'Download Complete'), `${doc.fileName || doc.documentName}`)
    } catch (_err) {
      // Fallback direct link
      const link = window.document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.download = doc.fileName || doc.documentName
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } finally {
      setDownloadingDocId(null)
    }
  }

  const columns = [
    {
      key: 'name',
      header: t('ชื่อเอกสาร', 'Document Name'),
      render: (d: StudentDocument) => (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 block">{d.documentName}</span>
            {d.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{d.description}</p>
            )}
            {d.uploadedAt && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {t('อัปโหลดเมื่อ', 'Uploaded')}: {d.uploadedAt}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'method',
      header: t('รูปแบบการลงนาม', 'Signature Type'),
      render: (d: StudentDocument) => (
        <div className="inline-flex items-center gap-1.5">
          {d.signatureMethod === 'wet_signature' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
              <PenTool className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>{t('ลายมือจริง (Wet Signature)', 'Wet Signature')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
              <Fingerprint className="h-3 w-3 text-sky-600 dark:text-sky-400" />
              <span>{t('ลายเซ็นดิจิทัล (E-Signature)', 'E-Signature')}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'file',
      header: t('ชื่อไฟล์', 'File Name'),
      render: (d: StudentDocument) => {
        const hasFile = !!(d.fileUrl || d.cloudinaryPublicId || d.fileName)
        if (!hasFile || !d.fileName) {
          return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
        }

        return (
          <button
            type="button"
            onClick={() =>
              setPreviewDoc({
                id: d.id,
                title: d.documentName,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                cloudinaryPublicId: d.cloudinaryPublicId,
                uploadedAt: d.uploadedAt,
                studentName: currentUser.name,
                studentCode: currentUser.code,
                signatureMethod: d.signatureMethod,
                description: d.description,
              })
            }
            className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer group text-left"
            title={t('คลิกเพื่อเปิดดูตัวอย่างเอกสาร', 'Click to preview document in-app')}
          >
            <FileUp className="h-3.5 w-3.5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="truncate max-w-[170px] font-mono">{d.fileName}</span>
          </button>
        )
      },
    },
    {
      key: 'status',
      header: t('สถานะ', 'Status'),
      render: (d: StudentDocument) => <StatusBadge status={d.status} />,
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (d: StudentDocument) => {
        const hasFile = !!(d.fileUrl || d.cloudinaryPublicId || d.fileName)
        return (
          <div className="flex items-center gap-1 justify-end">
            {hasFile && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewDoc({
                      id: d.id,
                      title: d.documentName,
                      fileName: d.fileName,
                      fileUrl: d.fileUrl,
                      cloudinaryPublicId: d.cloudinaryPublicId,
                      uploadedAt: d.uploadedAt,
                      studentName: currentUser.name,
                      studentCode: currentUser.code,
                      signatureMethod: d.signatureMethod,
                      description: d.description,
                    })
                  }
                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                  title={t('ดูเอกสารในระบบ', 'Preview Document In-App')}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerDownload(d)}
                  disabled={downloadingDocId === d.id}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer disabled:opacity-50"
                  title={t('ดาวน์โหลดเอกสาร', 'Download File')}
                >
                  {downloadingDocId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </>
            )}
            {d.status === 'required' && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleOpenModal(d)}
              >
                <Upload className="h-3 w-3 mr-1" /> {t('อัปโหลด', 'Upload')}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setDocToDelete(d)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title={t('ลบเอกสาร', 'Delete document')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('เอกสารประกอบการศึกษา', 'Student Documents')}
        description={t('ตรวจสอบรายการแบบฟอร์ม เอกสารที่ต้องลงนาม และสถานะการจัดส่งเอกสาร', 'View required forms, signed paperwork, and submission status.')}
        actions={
          <Button
            variant="primary"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="h-4 w-4" />
            <span>{t('อัปโหลดเอกสาร', 'Upload Document')}</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={myDocs}
        emptyMessage={t('ไม่มีรายการเอกสารที่ต้องส่งในขณะนี้', 'No documents assigned to your profile.')}
      />

      {/* Upload Document Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={t('อัปโหลดเอกสารประกอบการศึกษา', 'Upload Document')}
        size="md"
      >
        <div className="space-y-4">
          {/* Error Message */}
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Document Type Dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="doctype-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('ประเภทเอกสาร / แบบฟอร์ม', 'Document Type')} <span className="text-rose-500">*</span>
            </label>

            {/* Custom Document Type Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                aria-label={t('ประเภทเอกสาร / แบบฟอร์ม', 'Document Type')}
                onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all shadow-2xs text-left cursor-pointer ${
                  !selectedTypeId
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:border-sky-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:border-sky-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-sky-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className={`truncate ${!selectedTypeId ? 'text-slate-400 dark:text-slate-500' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>
                    {selectedDocType ? selectedDocType.name : t('-- เลือกประเภทเอกสาร / แบบฟอร์ม --', '-- Select Document Type --')}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-150 flex-shrink-0 ${showDocTypeDropdown ? 'rotate-180 text-sky-500' : ''}`} />
              </button>

              {/* Custom Menu Dropdown */}
              {showDocTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDocTypeDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 max-h-64 overflow-y-auto animate-[slideIn_0.12s_ease-out]">
                    {activeDocumentTypes.map(dt => (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => {
                          setSelectedTypeId(dt.id)
                          setHasConsentedEsign(false)
                          setFormError('')
                          setShowDocTypeDropdown(false)
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          selectedTypeId === dt.id
                            ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                          <span className="truncate">{dt.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            dt.signatureMethod === 'wet_signature'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          }`}>
                            {dt.signatureMethod === 'wet_signature' ? t('ลายมือจริง', 'Wet') : t('ดิจิทัล', 'E-Sign')}
                          </span>
                        </div>
                        {selectedTypeId === dt.id && (
                          <Check className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Hidden native select for test & automation compatibility */}
              <select
                id="doctype-select"
                aria-label={t('ประเภทเอกสาร / แบบฟอร์ม', 'Document Type')}
                value={selectedTypeId}
                onChange={e => {
                  setSelectedTypeId(e.target.value)
                  setHasConsentedEsign(false)
                  setFormError('')
                }}
                className="sr-only"
              >
                <option value="">{t('-- เลือกประเภทเอกสาร --', '-- Select Document Type --')}</option>
                {activeDocumentTypes.map(dt => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Signature Type determined by Admin setting */}
          {selectedDocType && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t('รูปแบบการลงนาม (กำหนดโดยระบบ/ผู้ดูแล):', 'Validation Method (Configured by Admin):')}
                </span>
                {selectedDocType.signatureMethod === 'wet_signature' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-2xs">
                    <PenTool className="h-3 w-3" />
                    <span>{t('ลายมือจริง (Wet Signature)', 'Wet Signature')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white shadow-2xs">
                    <Fingerprint className="h-3 w-3" />
                    <span>{t('ลายเซ็นดิจิทัล (E-Signature)', 'E-Signature')}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {selectedDocType.signatureMethod === 'wet_signature'
                  ? t(
                      'เอกสารนี้ต้องลงลายมือชื่อจริงบนกระดาษ จากนั้นสแกนหรือถ่ายรูปเอกสารฉบับจริงเพื่ออัปโหลดเข้าระบบ',
                      'This document requires physical handwritten signature on paper. Please upload the scanned copy.'
                    )
                  : t(
                      'เอกสารนี้รองรับการลงลายมือชื่อดิจิทัลผ่านระบบ คุณสามารถกดยืนยันการลงนามอิเล็กทรอนิกส์ได้ทันที',
                      'This document supports digital signoff. You can confirm and submit your electronic signature online.'
                    )}
              </p>
            </div>
          )}

          {/* 2. Optional Description Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('คำอธิบาย / หมายเหตุเพิ่มเติม', 'Description / Remarks')}
            </label>
            <textarea
              rows={2}
              value={descriptionText}
              onChange={e => setDescriptionText(e.target.value)}
              placeholder={t('ระบุรายละเอียดหรือหมายเหตุประกอบเอกสาร (ถ้ามี)...', 'Enter description or additional remarks (optional)...')}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none shadow-2xs"
            />
          </div>

          {/* 3. Uploading Document */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('ไฟล์เอกสารที่ต้องการอัปโหลด', 'Upload Document File')} <span className="text-rose-500">*</span>
            </label>

            {/* Hidden native input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
            />

            {!currentFileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-colors bg-white dark:bg-slate-800/40 group shadow-2xs"
              >
                <div className="h-10 w-10 mx-auto rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <FileUp className="h-5 w-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('คลิกเพื่อเลือกไฟล์จากอุปกรณ์', 'Click to choose file from your device')}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  PDF, PNG, JPG หรือ DOCX (ขนาดไม่เกิน 10MB)
                </p>

                {/* Quick Simulation Presets */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {t('หรือเลือกไฟล์จำลอง:', 'Or quick demo files:')}
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleSimulateSample('scholarship_form_scanned.pdf')
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 transition-colors flex items-center gap-1"
                  >
                    <FileCheck className="h-3 w-3 text-sky-500" />
                    <span>scholarship_form_scanned.pdf</span>
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleSimulateSample('petition_document_signed.pdf')
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 transition-colors flex items-center gap-1"
                  >
                    <FileCheck className="h-3 w-3 text-sky-500" />
                    <span>petition_document_signed.pdf</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentFileName}
                    </p>
                    <p className="text-[10px] text-sky-700 dark:text-sky-300 font-medium">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : t('ไฟล์จำลองสำหรับทดสอบ', 'Demo attachment')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title={t('ลบไฟล์', 'Remove file')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* 4. Conditional: If e-signature, tick box. Else if wet-signature, no need for tick box */}
          {selectedDocType && (
            <div>
              {selectedDocType.signatureMethod === 'e_signature' ? (
                /* E-Signature tick box */
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/40 cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/60 transition-colors group">
                  <input
                    type="checkbox"
                    checked={hasConsentedEsign}
                    onChange={e => {
                      setHasConsentedEsign(e.target.checked)
                      setFormError('')
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      {t('ข้าพเจ้ายืนยันการลงนามอิเล็กทรอนิกส์ (E-Signature)', 'I confirm my Electronic Signature (E-Signature)')}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      {t(
                        'ข้าพเจ้ายืนยันว่าข้อมูลและเอกสารนี้ถูกต้องครบถ้วน และยินยอมให้ระบบบันทึกลายมือชื่ออิเล็กทรอนิกส์พร้อม Timestamp เพื่อเป็นหลักฐานตามระเบียบของมหาวิทยาลัย',
                        'I certify that this document is accurate and consent to applying an electronic signature timestamp as institutional evidence.'
                      )}
                    </p>
                  </div>
                </label>
              ) : (
                /* Wet-signature: no tick box needed (advisor checks for approval) */
                <div className="p-3.5 rounded-xl border border-amber-200/90 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <PenTool className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold block text-amber-900 dark:text-amber-200 mb-0.5">
                      {t('ไม่ต้องยืนยันลายเซ็นดิจิทัล (ไม่ต้องติ๊กกล่อง)', 'No digital checkbox required')}
                    </span>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                      {t(
                        'เอกสารประเภทนี้เป็นการลงนามจริงบนกระดาษ (Wet Signature) อาจารย์ที่ปรึกษาจะเป็นผู้ตรวจสอบลายมือชื่อและความถูกต้องเพื่ออนุมัติในระบบ',
                        'This document uses a physical wet signature. Your academic advisor will verify the physical signature and approve the submission.'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Footer with Upload document button */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              disabled={isUploading}
            >
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleUploadSubmit}
              disabled={
                isUploading ||
                !selectedTypeId ||
                !currentFileName ||
                (selectedDocType?.signatureMethod === 'e_signature' && !hasConsentedEsign)
              }
              className="flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{t('กำลังอัปโหลดไปยัง Cloudinary...', 'Uploading to Cloudinary...')}</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>{t('อัปโหลดเอกสาร', 'Upload Document')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={docToDelete !== null}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('ยืนยันการลบเอกสาร', 'Confirm Delete Document')}
        message={t(
          `คุณต้องการลบเอกสาร "${docToDelete?.documentName}" ใช่หรือไม่? หากลบแล้วไฟล์ที่อัปโหลดและรายการนี้จะถูกนำออกจากระบบ`,
          `Are you sure you want to delete "${docToDelete?.documentName}"? The uploaded file and record will be removed.`
        )}
        confirmLabel={t('ลบเอกสาร', 'Delete')}
        variant="danger"
      />

      {/* In-App Document Viewer & Downloader Modal */}
      <DocumentViewerModal
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}
