// ============================================================
// In-App Document Viewer & Downloader Modal
// ============================================================

import { useState, useEffect } from 'react'
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from './index'
import { useLanguage } from '@/contexts/LanguageContext'

export interface DocumentViewerTarget {
  id?: string
  title?: string
  fileName?: string
  fileUrl?: string
  cloudinaryPublicId?: string
  fileType?: string
  uploadedAt?: string
  studentName?: string
  studentCode?: string
  signatureMethod?: 'wet_signature' | 'e_signature'
  status?: string
  description?: string
}

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  document: DocumentViewerTarget | null
  cloudName?: string
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  document,
  cloudName,
}: DocumentViewerModalProps) {
  const { t } = useLanguage()
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !document) return null

  const cName = cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ''
  
  // Resolve view URL
  let resolvedUrl = document.fileUrl || ''
  if (!resolvedUrl && document.cloudinaryPublicId) {
    if (document.cloudinaryPublicId.startsWith('http') || document.cloudinaryPublicId.startsWith('blob:')) {
      resolvedUrl = document.cloudinaryPublicId
    } else if (cName) {
      resolvedUrl = `https://res.cloudinary.com/${cName}/image/upload/${document.cloudinaryPublicId}`
    }
  }

  // Detect extension
  const fileName = document.fileName || document.title || 'document'
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension) || resolvedUrl.includes('/image/upload/') && !resolvedUrl.endsWith('.pdf')
  const isPdf = extension === 'pdf' || resolvedUrl.endsWith('.pdf') || resolvedUrl.includes('.pdf')

  // In-app file downloader
  async function handleInAppDownload() {
    if (!resolvedUrl) return
    setIsDownloading(true)
    setDownloadError(null)

    try {
      const response = await fetch(resolvedUrl)
      if (!response.ok) throw new Error('Failed to fetch file for download')
      const blob = await response.blob()
      
      const blobUrl = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = blobUrl
      link.download = fileName.includes('.') ? fileName : `${fileName}.${extension || 'pdf'}`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (_err) {
      // Fallback for CORS or direct links
      try {
        const link = window.document.createElement('a')
        link.href = resolvedUrl
        link.target = '_blank'
        link.download = fileName
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
      } catch (fallbackErr: any) {
        setDownloadError(fallbackErr.message || 'Download failed')
      }
    } finally {
      setIsDownloading(false)
    }
  }

  function handleZoomIn() {
    setZoom(prev => Math.min(prev + 25, 250))
  }

  function handleZoomOut() {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  function handleRotate() {
    setRotation(prev => (prev + 90) % 360)
  }

  function handleResetView() {
    setZoom(100)
    setRotation(0)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeIn_0.15s_ease-out]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl w-full flex flex-col z-10 transition-all duration-200 text-slate-900 dark:text-slate-100 overflow-hidden ${
          isFullscreen ? 'h-full max-h-[98vh] max-w-[98vw]' : 'h-[90vh] max-h-[880px] max-w-5xl'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
              {isPdf ? <FileText className="h-5 w-5" /> : isImage ? <ImageIcon className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {document.title || document.fileName || t('เอกสาร', 'Document')}
                </h3>
                {extension && (
                  <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {extension}
                  </span>
                )}
                {document.signatureMethod === 'e_signature' && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t('E-Signature', 'E-Signature')}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                {document.studentName ? `${document.studentName} (${document.studentCode || ''}) • ` : ''}
                {document.uploadedAt ? `${t('อัปโหลดเมื่อ', 'Uploaded')}: ${document.uploadedAt}` : fileName}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct In-App Download */}
            <Button
              size="sm"
              variant="primary"
              onClick={handleInAppDownload}
              disabled={isDownloading || !resolvedUrl}
              className="flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden sm:inline">{t('กำลังดาวน์โหลด...', 'Downloading...')}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('ดาวน์โหลด', 'Download')}</span>
                </>
              )}
            </Button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? t('ย่อหน้าต่าง', 'Exit Fullscreen') : t('ขยายเต็มจอ', 'Fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('ปิด', 'Close')}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-toolbar for Image Controls */}
        {isImage && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[11px] text-slate-500 dark:text-slate-400">
                {t('มุมมอง:', 'View:')} {zoom}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                title={t('ซูมออก', 'Zoom Out')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 250}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
                title={t('ซูมเข้า', 'Zoom In')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title={t('หมุนภาพ 90°', 'Rotate 90°')}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              {(zoom !== 100 || rotation !== 0) && (
                <button
                  onClick={handleResetView}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 ml-1 transition-colors"
                >
                  {t('รีเซ็ต', 'Reset')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Viewer Content Body */}
        <div className="flex-1 bg-slate-950/5 dark:bg-slate-950/40 p-3 sm:p-6 overflow-auto flex items-center justify-center relative">
          {downloadError && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5 shadow-lg">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{downloadError}</span>
            </div>
          )}

          {!resolvedUrl ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                {t('ไม่พบลิงก์เอกสาร', 'Document File Unavailable')}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {t('เอกสารนี้ยังไม่ได้อัปโหลดไฟล์จริง หรือไฟล์ยังไม่ถูกจัดเก็บ', 'No document file has been stored for this entry.')}
              </p>
            </div>
          ) : isPdf ? (
            /* PDF Embedded In-App Viewport */
            <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner">
              <iframe
                src={`${resolvedUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full min-h-[500px] border-none"
                title={document.title || 'PDF Document Viewer'}
              />
            </div>
          ) : isImage ? (
            /* Image In-App Viewport with Zoom & Rotation */
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 select-none">
              <div
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                }}
                className="inline-block shadow-2xl rounded-xl overflow-hidden max-w-full bg-white dark:bg-slate-900"
              >
                <img
                  src={resolvedUrl}
                  alt={fileName}
                  className="max-h-[70vh] w-auto object-contain rounded-xl"
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            /* Generic / Office Documents Fallback */
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md w-full shadow-md">
              <div className="h-16 w-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
                <FileCheck className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                {fileName}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {t(
                  'ไฟล์นี้เป็นรูปแบบเอกสารภายนอก คุณสามารถกดดาวน์โหลดไฟล์มาเปิดดูบนอุปกรณ์ของคุณได้ทันที',
                  'This document format is ready for download to view on your device.'
                )}
              </p>
              <Button
                variant="primary"
                onClick={handleInAppDownload}
                disabled={isDownloading}
                className="w-full justify-center flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('กำลังดาวน์โหลด...', 'Downloading...')}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>{t('ดาวน์โหลดเอกสาร', 'Download File')}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer info & remarks */}
        {document.description && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
              {t('หมายเหตุ:', 'Remarks:')}
            </span>
            <span className="truncate">{document.description}</span>
          </div>
        )}
      </div>
    </div>
  )
}
