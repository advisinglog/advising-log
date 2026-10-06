// ============================================================
// Student Official University Forms Download Page
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  PageHeader,
  Card,
  Button,
  SearchInput,
  DocumentViewerModal,
  type DocumentViewerTarget,
} from '@/components/ui'
import {
  FileText,
  Download,
  Eye,
  PenTool,
  Fingerprint,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { SignatureMethod } from '@/types'
import { getCloudinaryDownloadUrl } from '@/services/cloudinaryService'

// Standard Preset English/Thai Form Name Localizer
const PRESET_FORM_NAMES: Record<string, { en: string; th: string; descriptionEn: string; descriptionTh: string; suggestedCategory: string }> = {
  'Exit Petition Form (คำร้องขอลาออก)': {
    en: 'Exit Petition Form (Withdrawal Request)',
    th: 'แบบคำร้องขอลาออกจากการเป็นนักศึกษา',
    descriptionEn: 'Official petition for voluntary university withdrawal. Requires physical handwritten signature and academic clearance.',
    descriptionTh: 'แบบฟอร์มขอลาออกโดยความสมัครใจ ต้องใช้ลายเซ็นจริงบนกระดาษและผ่านการให้คำปรึกษาจากอาจารย์',
    suggestedCategory: 'withdrawal_leave',
  },
  'Leave of Absence Request (คำร้องขอลาพักการศึกษา)': {
    en: 'Leave of Absence Request Form',
    th: 'แบบคำร้องขอลาพักการศึกษา',
    descriptionEn: 'Formal request to temporarily suspend studies for one or two semesters. Requires handwritten signatures.',
    descriptionTh: 'แบบฟอร์มขอพักการเรียนชั่วคราว 1-2 ภาคการศึกษา ต้องใช้ลายเซ็นจริงบนกระดาษ',
    suggestedCategory: 'withdrawal_leave',
  },
  'Late Registration Petition (คำร้องขอลงทะเบียนล่าช้า)': {
    en: 'Late Registration / Add-Drop Petition',
    th: 'แบบคำร้องขอลงทะเบียนเรียน / เพิ่ม-ถอนล่าช้า',
    descriptionEn: 'Petition to add or drop courses after the official university deadline. Supports electronic signatures.',
    descriptionTh: 'แบบฟอร์มขอเพิ่มหรือถอนรายวิชาหลังจากเลยกำหนดเวลาทางการ สามารถลงลายมือชื่อดิจิทัลได้',
    suggestedCategory: 'registration',
  },
  'Study Plan / Degree Audit Form (แผนการเรียน)': {
    en: 'Study Plan & Degree Audit Form',
    th: 'แบบฟอร์มแผนการเรียนและการตรวจสอบหลักสูตร',
    descriptionEn: 'Academic plan document for tracking curriculum completion, prerequisite checks, and graduation roadmaps.',
    descriptionTh: 'เอกสารวางแผนการเรียน ตรวจสอบวิชาบังคับก่อน และความคืบหน้าการสำเร็จการศึกษา',
    suggestedCategory: 'academic_progress',
  },
  'Scholarship / Financial Aid Form (คำร้องขอรับทุน)': {
    en: 'Scholarship & Financial Aid Endorsement Form',
    th: 'แบบคำร้องขอรับทุนการศึกษา / เงินกู้ยืมเพื่อการศึกษา',
    descriptionEn: 'Application and advisor endorsement sheet for institutional scholarships or student loans.',
    descriptionTh: 'เอกสารสมัครทุนการศึกษาและหนังสือรับรองจากอาจารย์ที่ปรึกษา',
    suggestedCategory: 'scholarship_document',
  },
  'Supporting Evidence / Medical Note (เอกสารหลักฐาน/ใบรับรองแพทย์)': {
    en: 'Supporting Evidence & Medical Certificate',
    th: 'เอกสารหลักฐานประกอบ / ใบรับรองแพทย์',
    descriptionEn: 'Official medical certificates, hospital receipts, or external supporting documents. No university template or signature required.',
    descriptionTh: 'ใบรับรองแพทย์ ใบเสร็จ หรือเอกสารหลักฐานจากหน่วยงานภายนอก เป็นเอกสารของนักศึกษาเอง ไม่ต้องใช้แบบฟอร์มของมหาวิทยาลัย',
    suggestedCategory: 'general_consultation',
  },
}

export default function StudentForms() {
  const navigate = useNavigate()
  const store = useStore()
  const { language, t } = useLanguage()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<'all' | SignatureMethod>('all')
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null)

  const activeDocTypes = store.documentTypes.filter(d => d.isActive)

  // Localized title & description helper
  function getDocDetails(name: string) {
    const preset = PRESET_FORM_NAMES[name]
    if (preset) {
      return {
        title: language === 'th' ? preset.th : preset.en,
        description: language === 'th' ? preset.descriptionTh : preset.descriptionEn,
        suggestedCategory: preset.suggestedCategory,
      }
    }
    return {
      title: name,
      description: t(
        'แบบฟอร์มทางการสำหรับการดำเนินการทางวิชาการและการให้คำปรึกษา',
        'Official university form for academic and advising procedures.'
      ),
      suggestedCategory: 'general_consultation',
    }
  }

  // Filter forms
  const filteredForms = activeDocTypes.filter(dt => {
    const details = getDocDetails(dt.name)
    const matchesSearch =
      dt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      details.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      details.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesMethod =
      selectedMethodFilter === 'all' || dt.signatureMethod === selectedMethodFilter

    return matchesSearch && matchesMethod
  })

  // Download official uploaded form file helper
  async function handleDownloadTemplate(dt: typeof activeDocTypes[0]) {
    if (!dt.templateFileUrl) return
    setDownloadingDocId(dt.id)
    try {
      // Open the fl_attachment URL directly — Cloudinary sends the correct
      // Content-Disposition header so the file downloads with the right name/ext.
      const downloadUrl = getCloudinaryDownloadUrl(dt.templateFileUrl)
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloadingDocId(null)
    }
  }

  // Open Preview Modal
  function handlePreviewTemplate(dt: typeof activeDocTypes[0]) {
    if (!dt.templateFileUrl && !dt.templatePublicId) return
    const details = getDocDetails(dt.name)
    setPreviewDoc({
      id: dt.id,
      title: details.title,
      fileName: dt.templateFileName || `${dt.name}_Template.pdf`,
      fileUrl: dt.templateFileUrl || undefined,
      cloudinaryPublicId: dt.templatePublicId || undefined,
      signatureMethod: dt.signatureMethod,
      description: details.description,
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title={t('ดาวน์โหลดแบบฟอร์ม', 'Download University Forms')}
        description={t(
          'ศูนย์รวมแบบฟอร์มคำร้องฉบับทางการของมหาวิทยาลัย ดาวน์โหลดเพื่อพิมพ์ กรอกข้อมูล และตรวจสอบประเภทลายเซ็นที่ต้องใช้ก่อนนัดพบอาจารย์',
          'Download official university blank petition forms, review required signature methods, and prepare your documents before meeting your advisor.'
        )}
      />

      {/* 3-Step Quick Guide Banner */}
      <div className="bg-gradient-to-br from-sky-50/90 via-sky-50/40 to-slate-50/80 dark:from-sky-950/40 dark:via-slate-900/40 dark:to-slate-900/60 border border-sky-200/80 dark:border-sky-800/60 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {t('ขั้นตอนการเตรียมและยื่นแบบฟอร์ม', 'How to Use University Forms')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('3 ขั้นตอนง่ายๆ ในการเตรียมเอกสารสำหรับการเข้าพบอาจารย์ที่ปรึกษา', '3 simple steps to prepare your documents before your advising session')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl border border-sky-100/80 dark:border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                1
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('ดาวน์โหลดแบบฟอร์ม', '1. Download Form')}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
              {t('เลือกดาวน์โหลดแบบฟอร์มทางการที่ต้องการใช้จากรายการด้านล่าง', 'Download the official blank template from the catalog below.')}
            </p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl border border-sky-100/80 dark:border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                2
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('กรอกและลงลายมือชื่อ', '2. Fill & Sign')}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
              {t(
                'ตรวจสอบประเภทลายเซ็น (เซ็นจริงบนกระดาษ หรือ E-Sign บน iPad/PDF) แล้วลงนามให้เรียบร้อย',
                'Check the signature badge (Physical Signature on paper vs. E-Sign) and complete your signature.'
              )}
            </p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl border border-sky-100/80 dark:border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                3
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('แนบไฟล์ในนัดหมาย', '3. Attach to Booking')}
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
              {t(
                'อัปโหลดไฟล์ที่กรอกแล้วในขั้นตอนนัดพบอาจารย์ เพื่อให้อาจารย์ตรวจและลงนามรับรอง',
                'Upload your completed file during Meet Advisor booking for your advisor to review and endorse.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('ค้นหาชื่อแบบฟอร์ม...', 'Search forms by name...')}
          />
        </div>

        {/* Signature Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedMethodFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedMethodFilter === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {t('ทั้งหมด', 'All Forms')} ({activeDocTypes.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethodFilter('wet_signature')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedMethodFilter === 'wet_signature'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
          >
            <PenTool className="h-3 w-3" />
            <span>{t('ลายเซ็นจริงบนกระดาษ', 'Physical Signature')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethodFilter('e_signature')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedMethodFilter === 'e_signature'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-900/60'
            }`}
          >
            <Fingerprint className="h-3 w-3" />
            <span>{t('ลายเซ็นดิจิทัล', 'E-Signature')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethodFilter('none')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedMethodFilter === 'none'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>{t('ไม่ต้องลงลายมือชื่อ', 'No Signature')}</span>
          </button>
        </div>
      </div>

      {/* Forms Catalog Grid */}
      {filteredForms.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t('ไม่พบแบบฟอร์มที่ค้นหา', 'No matching forms found')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองลายเซ็นประเภทอื่น', 'Try a different search term or change your signature method filter.')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredForms.map(dt => {
            const details = getDocDetails(dt.name)
            const isPhysical = dt.signatureMethod === 'wet_signature'
            const isNone = dt.signatureMethod === 'none'
            const hasUploadedFile = !!dt.templateFileUrl
            const isDownloading = downloadingDocId === dt.id

            return (
              <div
                key={dt.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-sky-300 dark:hover:border-sky-700 transition-all group"
              >
                <div className="space-y-3">
                  {/* Top Signature Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        isPhysical
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60'
                          : isNone
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60'
                          : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/60'
                      }`}
                    >
                      {isPhysical ? (
                        <PenTool className="h-3.5 w-3.5" />
                      ) : isNone ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Fingerprint className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isPhysical
                          ? t('ลายเซ็นจริงบนกระดาษ', 'Physical Signature Required')
                          : isNone
                          ? t('ไม่ต้องลงลายมือชื่อ', 'No Signature Required')
                          : t('ลายเซ็นดิจิทัล (E-Sign)', 'E-Signature Permitted')}
                      </span>
                    </span>
                  </div>

                  {/* Form Title & Description with icon box */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPhysical
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                          : isNone
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      {isPhysical ? (
                        <PenTool className="h-5 w-5" />
                      ) : isNone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Fingerprint className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                        {details.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {details.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons / Status Indicator */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {hasUploadedFile ? (
                      <>
                        {/* Direct Download Button */}
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleDownloadTemplate(dt)}
                          disabled={isDownloading}
                          className="text-xs font-semibold shadow-xs"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              <span>{t('กำลังโหลด...', 'Downloading...')}</span>
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5 mr-1" />
                              <span>{t('ดาวน์โหลดฟอร์ม', 'Download Form')}</span>
                            </>
                          )}
                        </Button>

                        {/* Preview Button */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePreviewTemplate(dt)}
                          className="text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-500 dark:text-slate-400" />
                          <span>{t('ดูตัวอย่าง', 'Preview')}</span>
                        </Button>
                      </>
                    ) : isNone ? (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 italic">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{t('เป็นเอกสารของนักศึกษาเอง (ไม่ต้องดาวน์โหลดฟอร์ม)', 'Student provides own document (No template needed)')}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{t('ติดต่อสำนักวิชาเพื่อรับแบบฟอร์มฉบับจริง', 'Contact department office for official paper form')}</span>
                      </span>
                    )}
                  </div>

                  {/* Fast Link to Book Advising for this specific topic */}
                  <button
                    type="button"
                    onClick={() => navigate(`/student/request?category=${details.suggestedCategory}`)}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ml-auto"
                  >
                    <span>{t('นัดพบอาจารย์', 'Book Advising')}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* In-App Document Viewer & Downloader Modal */}
      <DocumentViewerModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}
