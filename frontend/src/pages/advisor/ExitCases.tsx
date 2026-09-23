// ============================================================
// Advisor — Exit Cases (Minimal White & Sky Blue)
// ============================================================

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, Modal, DocumentViewerModal, type DocumentViewerTarget } from '@/components/ui'
import type { ExitCase } from '@/types'
import { Eye, MessageSquareHeart, FileText, FileUp } from 'lucide-react'

import { isAdvisorMatch } from '@/utils/advisorUtils'

export default function ExitCases() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getExitReasonLabel, getExitTypeLabel } = useLanguage()
  const [selectedCase, setSelectedCase] = useState<ExitCase | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [assessment, setAssessment] = useState('')
  const [factors, setFactors] = useState('')
  const [actions, setActions] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)

  if (!currentUser) return null
  const myCases = store.exitCases.filter(e => isAdvisorMatch(e.advisorId, currentUser, store.users))

  const columns = [
    {
      key: 'student',
      header: t('นักศึกษา', 'Student'),
      render: (e: ExitCase) => {
        const s = store.users.find(u => u.id === e.studentId)
        return (
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{s?.name}</p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">{s?.code}</p>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: t('ประเภทคำร้อง', 'Exit Type'),
      render: (e: ExitCase) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {getExitTypeLabel(e.exitType)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: t('สาเหตุที่ระบุ', 'Declared Reason'),
      render: (e: ExitCase) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {getExitReasonLabel(e.reasonCode)}
        </span>
      ),
    },
    { key: 'date', header: t('วันที่มีผล', 'Effective Date'), render: (e: ExitCase) => <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{e.preferredEffectiveDate}</span> },
    { key: 'status', header: t('สถานะ', 'Status'), render: (e: ExitCase) => <StatusBadge status={e.status} /> },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (e: ExitCase) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setSelectedCase(e)}>
            <Eye className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" /> {t('ดูรายละเอียด', 'View')}
          </Button>
          {e.status !== 'closed' && (
            <Button size="sm" variant="primary" onClick={() => { setSelectedCase(e); setShowAssessment(true) }}>
              {t('ประเมินความเห็น', 'Assess')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  function handleSaveAssessment(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!selectedCase || !assessment || !recommendation) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกความเห็นและข้อเสนอแนะของอาจารย์', 'Please provide an assessment and recommendation.'))
      return
    }
    store.addAdvisorAssessment({
      exitCaseId: selectedCase.id,
      advisorId: currentUser!.id,
      assessment,
      contributingFactors: factors,
      actionsTaken: actions,
      referralsMade: '',
      followUpAttempts: '',
      recommendation,
      resolution: '',
    })
    store.updateExitCaseStatus(selectedCase.id, 'under_review')
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'exit_case_updated',
      description: `Submitted assessment for exit case ${selectedCase.id}`,
      targetId: selectedCase.id,
    })
    addToast('success', t('บันทึกผลการประเมินแล้ว', 'Assessment Submitted'), t('บันทึกความเห็นของอาจารย์ที่ปรึกษาและส่งต่อไปยังประธานหลักสูตร/QA เรียบร้อยแล้ว', 'Advisor assessment saved and forwarded to QA review.'))
    setShowAssessment(false); setSelectedCase(null); setAssessment(''); setFactors(''); setActions(''); setRecommendation('')
  }

  return (
    <div>
      <PageHeader
        title={t('รายการเคสขอลาออก / ลาพักการศึกษา', 'Exit & Dropout Cases')}
        description={t('ตรวจสอบและประเมินความเห็นอาจารย์ที่ปรึกษาสำหรับคำร้องขอลาออกและลาพักของนักศึกษา', 'Review student withdrawal and leave requests and record faculty advisor assessments.')}
      />
      <DataTable columns={columns} data={myCases} emptyMessage={t('ไม่พบคำร้องขอลาพักหรือลาออกของนักศึกษาในความดูแล', 'No student exit cases assigned.')} />

      {/* View Case Modal */}
      {selectedCase && !showAssessment && (
        <Modal isOpen={!!selectedCase} onClose={() => setSelectedCase(null)} title={t('รายละเอียดคำร้องขอลาออก / ลาพัก', 'Exit Case Details')} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('นักศึกษา', 'Student')}</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{store.users.find(u => u.id === selectedCase.studentId)?.name}</p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('ประเภท', 'Exit Type')}</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{getExitTypeLabel(selectedCase.exitType)}</p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('สาเหตุ', 'Reason')}</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{getExitReasonLabel(selectedCase.reasonCode)}</p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">{t('สถานะ', 'Status')}</span>
                <div className="mt-1"><StatusBadge status={selectedCase.status} /></div>
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">{t('เหตุผลประกอบจากนักศึกษา', 'Student Stated Details')}</span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                {selectedCase.details}
              </p>
            </div>
            {/* Student Voice Survey (if shared) */}
            {(() => {
              const svr = store.studentVoiceResponses.find(v => (v.exitCaseId === selectedCase.id || v.studentId === selectedCase.studentId) && v.shareWithAdvisor)
              if (!svr) return null
              return (
                <div className="border-t border-sky-100 dark:border-sky-900/60 pt-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquareHeart className="h-4 w-4 text-sky-600" />
                      {t('เสียงสะท้อนของนักศึกษา (Student Voice Feedback)', 'Student Voice Feedback')}
                    </h4>
                  </div>
                  <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/40 text-xs space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(svr.primaryFactors) ? svr.primaryFactors : []).map((fac, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {fac}
                        </span>
                      ))}
                    </div>
                    {svr.whatCouldUniversityDoBetter && (
                      <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        "{svr.whatCouldUniversityDoBetter}"
                      </p>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Supporting Student Documents */}
            {(() => {
              const studentDocs = store.documents.filter(d => d.studentId === selectedCase.studentId)
              if (studentDocs.length === 0) return null
              return (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-sky-600" />
                    {t('เอกสารประกอบคำร้องของนักศึกษา', 'Student Supporting Documents')}
                  </h4>
                  <div className="space-y-1.5">
                    {studentDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileUp className="h-3.5 w-3.5 text-sky-600 flex-shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.documentName}</span>
                          {doc.fileName && <span className="text-[11px] font-mono text-slate-400 truncate">({doc.fileName})</span>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              setPreviewDoc({
                                id: doc.id,
                                title: doc.documentName,
                                fileName: doc.fileName,
                                fileUrl: doc.fileUrl,
                                cloudinaryPublicId: doc.cloudinaryPublicId,
                                studentName: store.users.find(u => u.id === selectedCase.studentId)?.name,
                                uploadedAt: doc.uploadedAt,
                                signatureMethod: doc.signatureMethod,
                              })
                            }
                            className="text-[11px] h-7 px-2"
                          >
                            <Eye className="h-3 w-3 mr-1" /> {t('ดูเอกสาร', 'View')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </Modal>
      )}

      {/* Assessment Modal */}
      <Modal isOpen={showAssessment} onClose={() => { setShowAssessment(false); setSelectedCase(null) }} title={t('บันทึกผลการประเมินคำร้องโดยอาจารย์ที่ปรึกษา', 'Advisor Exit Assessment')} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ความเห็นและบันทึกการสัมภาษณ์นักศึกษา', 'Advisor Evaluation & Notes')} *</label>
            <textarea
              value={assessment}
              onChange={e => setAssessment(e.target.value)}
              rows={3}
              placeholder={t('บันทึกข้อเท็จจริงจากการพูดคุย ความเห็นเชิงวิชาการ และเหตุผลที่นักศึกษาประสงค์จะออก...', 'Your professional assessment of the student\'s departure...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ปัจจัยแวดล้อมที่ส่งผลกระทบ', 'Contributing Factors')}</label>
            <textarea
              value={factors}
              onChange={e => setFactors(e.target.value)}
              rows={2}
              placeholder={t('เช่น ปัญหาผลการเรียน ภาระค่าใช้จ่าย การย้ายถิ่นฐาน...', 'Academic difficulty, financial pressure, relocation...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('มาตรการช่วยเหลือและแนวทางแก้ไขที่ได้พยายามแล้ว', 'Preventative Actions Tried')}</label>
            <textarea
              value={actions}
              onChange={e => setActions(e.target.value)}
              rows={2}
              placeholder={t('การแนะนำแผนการเรียนใหม่ การส่งต่อทุน หรือการให้เวลาปรับตัว...', 'Academic remediation, referrals made, counseling sessions...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ข้อเสนอแนะต่อประธานหลักสูตร / ประกันคุณภาพ', 'Recommendation to QA & Chair')} *</label>
            <textarea
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
              rows={2}
              placeholder="Recommended next steps for QA review..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => { setShowAssessment(false); setSelectedCase(null) }}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={() => handleSaveAssessment()}>{t('บันทึกความเห็นอาจารย์', 'Submit Assessment')}</Button>
          </div>
        </div>
      </Modal>

      {/* In-App Document Viewer & Downloader Modal */}
      <DocumentViewerModal
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}

