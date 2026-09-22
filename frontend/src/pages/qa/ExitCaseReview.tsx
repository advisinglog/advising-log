import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, Modal, SearchInput, DocumentViewerModal, type DocumentViewerTarget } from '@/components/ui'
import {
  Eye,
  CheckCircle2,
  MessageSquareHeart,
  Brain,
  AlertTriangle,
  ShieldCheck,
  FileCheck2,
  FileText,
  FileUp,
} from 'lucide-react'
import type { ExitCase } from '@/types'

export default function ExitCaseReview() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getExitReasonLabel, getExitTypeLabel } = useLanguage()

  // State
  const [selectedCase, setSelectedCase] = useState<ExitCase | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocumentViewerTarget | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'under_review' | 'closed'>('all')

  // Finalize & Close Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [committeeDecision, setCommitteeDecision] = useState<
    'approved_departure' | 'approved_with_followup' | 'remediation_offered'
  >('approved_departure')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!currentUser) return null

  // QA can see all cases in the curriculum
  const allReviewCases = store.exitCases

  // Filtered cases by search and status
  const filteredCases = allReviewCases.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    const stu = store.users.find(u => u.id === e.studentId)
    const adv = store.users.find(u => u.id === e.advisorId)
    const reason = getExitReasonLabel(e.reasonCode).toLowerCase()
    const exitTypeLabel = getExitTypeLabel(e.exitType).toLowerCase()
    const rawExitType = (e.exitType || '').toLowerCase().replace(/_/g, ' ')
    return (
      (stu?.name && stu.name.toLowerCase().includes(s)) ||
      (stu?.code && stu.code.toLowerCase().includes(s)) ||
      (adv?.name && adv.name.toLowerCase().includes(s)) ||
      e.id.toLowerCase().includes(s) ||
      reason.includes(s) ||
      exitTypeLabel.includes(s) ||
      rawExitType.includes(s) ||
      (e.preferredEffectiveDate && e.preferredEffectiveDate.toLowerCase().includes(s)) ||
      (e.details && e.details.toLowerCase().includes(s))
    )
  })

  const openCount = allReviewCases.filter(e => e.status === 'open').length
  const underReviewCount = allReviewCases.filter(e => e.status === 'under_review').length
  const closedCount = allReviewCases.filter(e => e.status === 'closed').length

  const columns = [
    {
      key: 'student',
      header: t('นักศึกษา', 'Student'),
      render: (e: ExitCase) => {
        const s = store.users.find(u => u.id === e.studentId)
        return (
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
              {s?.name || e.studentId}
            </p>
            <p className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
              {s?.code || ''}
            </p>
          </div>
        )
      },
    },
    {
      key: 'advisor',
      header: t('อาจารย์ที่ปรึกษา', 'Faculty Advisor'),
      render: (e: ExitCase) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          {store.users.find(u => u.id === e.advisorId)?.name || e.advisorId}
        </span>
      ),
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
      header: t('สาเหตุหลัก', 'Primary Reason'),
      render: (e: ExitCase) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {getExitReasonLabel(e.reasonCode)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('สถานะ', 'Status'),
      render: (e: ExitCase) => <StatusBadge status={e.status} />,
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Action'),
      render: (e: ExitCase) => (
        <Button size="sm" variant="secondary" onClick={() => handleView(e)}>
          <Eye className="h-3 w-3 mr-1 text-slate-500 dark:text-slate-400" />{' '}
          {t('ตรวจสอบ', 'Review')}
        </Button>
      ),
    },
  ]

  function handleView(e: ExitCase) {
    setSelectedCase(e)
    setResolutionNotes('')
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'qa_chair',
      action: 'qa_viewed_case',
      description: `QA viewed exit case ${e.id}`,
      targetId: e.id,
    })
  }

  function handleOpenFinalizeModal() {
    if (!selectedCase) return
    const assessment = store.advisorAssessments.find(a => a.exitCaseId === selectedCase.id)
    if (assessment?.resolution) {
      setResolutionNotes(assessment.resolution)
    } else {
      setResolutionNotes('')
    }
    setShowFinalizeModal(true)
  }

  function handleConfirmFinalize(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!selectedCase) return

    if (!resolutionNotes.trim()) {
      addToast(
        'error',
        t('กรุณาระบุมติคณะกรรมการ', 'Resolution Required'),
        t(
          'กรุณาระบุข้อสรุปหรือมติของคณะกรรมการหลักสูตรก่อนปิดเคส',
          'Please provide committee resolution notes before closing the case.'
        )
      )
      return
    }

    setIsSubmitting(true)

    const decisionLabels: Record<string, string> = {
      approved_departure: t('อนุมัติการลาออก/ลาพักตามคำร้อง', 'Approved Departure Request'),
      approved_with_followup: t(
        'อนุมัติพร้อมจัดทำแผนติดตามผล (Re-entry Plan)',
        'Approved with Re-entry Support Plan'
      ),
      remediation_offered: t(
        'จัดมาตรการช่วยเหลือและให้คำปรึกษาเพิ่มเติม',
        'Remediation & Counseling Offered'
      ),
    }

    const fullResolution = `[${decisionLabels[committeeDecision] || committeeDecision}] ${resolutionNotes.trim()}`

    store.updateExitCaseStatus(selectedCase.id, 'closed')
    store.updateAdvisorAssessmentResolution(selectedCase.id, fullResolution)

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'qa_chair',
      action: 'exit_case_updated',
      description: `QA closed exit case ${selectedCase.id} with resolution: ${fullResolution}`,
      targetId: selectedCase.id,
    })

    addToast(
      'success',
      t('บันทึกมติและปิดเคสเรียบร้อย', 'Case Finalized & Closed'),
      t(
        'บันทึกมติคณะกรรมการและปิดเคสคำร้องอย่างเป็นทางการแล้ว',
        'Committee resolution recorded and exit case formally closed.'
      )
    )

    setIsSubmitting(false)
    setShowFinalizeModal(false)
    setSelectedCase(null)
    setResolutionNotes('')
  }

  const assessment = selectedCase
    ? store.advisorAssessments.find(a => a.exitCaseId === selectedCase.id)
    : null
  const voiceResponse = selectedCase
    ? store.studentVoiceResponses.find(
        v => v.exitCaseId === selectedCase.id || v.studentId === selectedCase.studentId
      )
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ทบทวนเคสขอลาออก / ลาพักการศึกษา', 'Exit & Departure Case Review')}
        description={t(
          'ตรวจสอบการขอลาออกของนักศึกษา ติดตามการให้ความช่วยเหลือของอาจารย์ที่ปรึกษา และบันทึกมติสรุปผลในระดับหลักสูตร (AUN-QA Criteria 6 & 8)',
          'Review student withdrawal cases, evaluate advisor interventions, and record committee final resolutions for accreditation evidence.'
        )}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t(
              'ค้นหาตามชื่อนักศึกษา, รหัส, อาจารย์, หรือประเภทคำร้อง...',
              'Search by student, code, advisor, or exit type...'
            )}
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('ทั้งหมด', 'All')} ({allReviewCases.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'open'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('รออาจารย์ประเมิน', 'Awaiting Advisor')} ({openCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('under_review')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'under_review'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('อยู่ระหว่างตรวจสอบ', 'Under Review')} ({underReviewCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              statusFilter === 'closed'
                ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {t('ปิดเคสแล้ว', 'Closed')} ({closedCount})
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCases}
        emptyMessage={t(
          'ไม่พบรายการเคสที่ตรงกับเงื่อนไขการค้นหา',
          'No exit cases match your filter criteria.'
        )}
      />

      {/* Case Review Detail Modal */}
      {selectedCase && !showFinalizeModal && (
        <Modal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          title={t(
            'การตรวจสอบเคสขอลาออก / ลาพักอย่างเป็นทางการ',
            'Exit Case Formal Review'
          )}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs p-3.5 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('นักศึกษา', 'Student')}
                </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {store.users.find(u => u.id === selectedCase.studentId)?.name ||
                    selectedCase.studentId}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('อาจารย์ที่ปรึกษา', 'Faculty Advisor')}
                </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {store.users.find(u => u.id === selectedCase.advisorId)?.name ||
                    selectedCase.advisorId}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('ประเภทคำร้อง', 'Exit Type')}
                </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {getExitTypeLabel(selectedCase.exitType)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('สาเหตุ', 'Reason')}
                </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {getExitReasonLabel(selectedCase.reasonCode)}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('วันที่มีผล', 'Effective Date')}
                </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedCase.preferredEffectiveDate}
                </p>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-400 block font-medium">
                  {t('สถานะ', 'Status')}
                </span>
                <div className="mt-1">
                  <StatusBadge status={selectedCase.status} />
                </div>
              </div>
            </div>

            {/* Committee Final Resolution Banner (If already closed or recorded) */}
            {assessment?.resolution && (
              <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {t(
                      'มติคณะกรรมการประจำหลักสูตร (Committee Resolution):',
                      'Formal Committee Resolution:'
                    )}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                    {t('มีมติเรียบร้อย', 'Recorded')}
                  </span>
                </div>
                <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                  {assessment.resolution}
                </p>
              </div>
            )}

            {/* Qualitative Root-Cause Diagnostic Banner for QA */}
            <div className="p-3.5 bg-gradient-to-r from-sky-50 to-indigo-50/40 dark:from-sky-950/40 dark:to-indigo-950/30 rounded-xl border border-sky-200/80 dark:border-sky-900/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  {t(
                    'การวิเคราะห์ปัญหาเชิงคุณภาพ (Qualitative Problem Diagnosis):',
                    'Qualitative Problem Diagnosis:'
                  )}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  #{selectedCase.reasonCode}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedCase.exitType === 'withdrawal' || selectedCase.exitType === 'dropout'
                  ? t(
                      'เคสลาออกถาวร: สะท้อนปัญหาเชิงลึกด้านความพร้อมการเรียนและเป้าหมายอาชีพ ควรพิจารณาผลกระทบต่อเกณฑ์รับเข้าและการปูพื้นฐานปี 1',
                      'Permanent Departure: Underlying factor points to academic foundation gap / career realignment; impacts Term 1 onboarding.'
                    )
                  : t(
                      'เคสพักการศึกษาชั่วคราว: นักศึกษามีเจตนารมณ์จะกลับมาเรียนต่อ ต้องประสานงานติดตามผลเพื่อสนับสนุนการกลับเข้าศึกษา (Re-entry retention)',
                      'Temporary Leave: Student intends to resume studies; requires structured re-entry roadmap and ongoing wellness check-ins.'
                    )}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                {t('เหตุผลที่นักศึกษาระบุ', 'Student Stated Reason')}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                {selectedCase.details}
              </p>
            </div>

            {/* Student Voice Survey Data (if available) */}
            {voiceResponse && (
              <div className="border-t border-sky-100 dark:border-sky-900/60 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquareHeart className="h-4 w-4 text-sky-600" />
                    {t(
                      'เสียงของนักศึกษา (Student Voice Survey Response)',
                      'Student Voice Survey Response'
                    )}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
                    AUN-QA
                  </span>
                </div>

                <div className="space-y-2 p-3.5 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-900/40 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-b border-sky-100/80 dark:border-sky-800/60 pb-2">
                    <span>
                      {t('คะแนนหลักสูตร:', 'Curriculum:')}{' '}
                      <strong className="text-sky-700 dark:text-sky-300">
                        {voiceResponse.ratings?.curriculumRelevance ?? 4}/5
                      </strong>
                    </span>
                    <span>
                      {t('คุณภาพการสอน:', 'Teaching:')}{' '}
                      <strong className="text-sky-700 dark:text-sky-300">
                        {voiceResponse.ratings?.teachingQuality ?? 4}/5
                      </strong>
                    </span>
                    <span>
                      {t('การดูแลของอาจารย์:', 'Advisor:')}{' '}
                      <strong className="text-sky-700 dark:text-sky-300">
                        {voiceResponse.ratings?.advisorSupport ?? 5}/5
                      </strong>
                    </span>
                    <span>
                      {t('ภาพรวม:', 'Overall:')}{' '}
                      <strong className="text-sky-700 dark:text-sky-300">
                        {voiceResponse.ratings?.overallExperience ?? 4}/5
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {(voiceResponse.primaryFactors || []).map((fac, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {fac}
                      </span>
                    ))}
                  </div>

                  {voiceResponse.whatCouldUniversityDoBetter && (
                    <p className="text-slate-700 dark:text-slate-300 italic pt-1 leading-relaxed">
                      "{voiceResponse.whatCouldUniversityDoBetter}"
                    </p>
                  )}
                </div>
              </div>
            )}

            {assessment ? (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                  {t(
                    'บันทึกความเห็นอย่างเป็นทางการของอาจารย์ที่ปรึกษา',
                    'Advisor Formal Assessment'
                  )}
                </h4>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                      {t('ผลการประเมินและการสัมภาษณ์', 'Assessment Evaluation')}
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {assessment.assessment}
                    </p>
                  </div>
                  {assessment.contributingFactors && (
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                        {t('ปัจจัยแวดล้อมที่ส่งผลกระทบ', 'Contributing Factors')}
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {assessment.contributingFactors}
                      </p>
                    </div>
                  )}
                  {assessment.actionsTaken && (
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                        {t('มาตรการช่วยเหลือที่ได้ดำเนินการแล้ว', 'Actions Taken')}
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {assessment.actionsTaken}
                      </p>
                    </div>
                  )}
                  {assessment.recommendation && (
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                        {t('ข้อเสนอแนะของอาจารย์ที่ปรึกษา', 'Advisor Recommendation')}
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {assessment.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">
                      {t('รอดำเนินการประเมินจากอาจารย์ที่ปรึกษา', 'Awaiting Faculty Advisor Assessment')}
                    </span>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                      {t(
                        'นักศึกษายื่นคำร้องแล้ว แต่อาจารย์ที่ปรึกษายังไม่ได้บันทึกผลการประเมินความเห็น (สามารถประสานอาจารย์ หรือพิจารณาสรุปมติในระดับหลักสูตรได้)',
                        'The student has filed the exit request, but the faculty advisor has not recorded their assessment yet.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSelectedCase(null)}>
                {t('ปิด', 'Close')}
              </Button>
              {selectedCase.status !== 'closed' && (
                <Button variant="primary" onClick={handleOpenFinalizeModal}>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />{' '}
                  {t('สรุปผลและบันทึกมติปิดเคส', 'Finalize & Record Resolution')}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Committee Finalization & Close Modal */}
      {selectedCase && showFinalizeModal && (
        <Modal
          isOpen={showFinalizeModal}
          onClose={() => setShowFinalizeModal(false)}
          title={t(
            'บันทึกมติคณะกรรมการและปิดเคสคำร้อง',
            'Committee Final Resolution & Case Finalization'
          )}
          size="md"
        >
          <form onSubmit={handleConfirmFinalize} className="space-y-4">
            {/* Warning Banner */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">
                  {t('การดำเนินการนี้จะเป็นการยุติเคสอย่างเป็นทางการ', 'Official Case Finalization')}
                </span>
                <p className="leading-relaxed opacity-90">
                  {t(
                    'เมื่อปิดเคส สถานะจะถูกเปลี่ยนเป็น "Closed" และมติของคณะกรรมการจะถูกบันทึกลงฐานข้อมูลเพื่อใช้เป็นหลักฐานการประกันคุณภาพ AUN-QA',
                    'Closing this case updates its status to "Closed" and permanently records committee CQI resolutions for accreditation.'
                  )}
                </p>
              </div>
            </div>

            {!assessment && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {t(
                    'เคสนี้ยังไม่มีบันทึกผลการประเมินจากอาจารย์ที่ปรึกษา (มตินี้จะเป็นการพิจารณาโดยตรงจากคณะกรรมการ)',
                    'Advisor assessment has not been submitted. This resolution will be recorded directly by the committee.'
                  )}
                </span>
              </div>
            )}

            {/* Case Summary Pill */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  {t('เคสคำร้องของนักศึกษา', 'Student Case')}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {store.users.find(u => u.id === selectedCase.studentId)?.name ||
                    selectedCase.studentId}{' '}
                  (#{selectedCase.id})
                </span>
              </div>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                {getExitTypeLabel(selectedCase.exitType)}
              </span>
            </div>

            {/* Decision Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('มติผลการพิจารณาของคณะกรรมการ', 'Committee Official Decision')} *
              </label>
              <div className="space-y-2">
                {[
                  {
                    id: 'approved_departure',
                    label: t(
                      'อนุมัติการลาออก / ลาพักตามคำร้อง',
                      'Approve Departure / Leave as Requested'
                    ),
                    desc: t(
                      'เห็นควรให้ดำเนินการตามความประสงค์ของนักศึกษา',
                      'Agree with student request without retention intervention'
                    ),
                  },
                  {
                    id: 'approved_with_followup',
                    label: t(
                      'อนุมัติพร้อมจัดทำแผนติดตามผล (Re-entry Plan)',
                      'Approve with Re-entry Support Plan'
                    ),
                    desc: t(
                      'กำหนดแผนติดต่อเพื่อประสานงานการกลับเข้าศึกษาต่อ',
                      'Establish follow-up schedule to support academic return'
                    ),
                  },
                  {
                    id: 'remediation_offered',
                    label: t(
                      'จัดมาตรการช่วยเหลือและให้คำปรึกษาเพิ่มเติม',
                      'Remediation & Counseling Offered'
                    ),
                    desc: t(
                      'ส่งต่อนักศึกษาไปยังหน่วยงานช่วยเหลือเพื่อชะลอการออก',
                      'Offer academic or financial remediation before final exit'
                    ),
                  },
                ].map(opt => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      committeeDecision === opt.id
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="committeeDecision"
                      value={opt.id}
                      checked={committeeDecision === opt.id}
                      onChange={() => setCommitteeDecision(opt.id as any)}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {opt.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                {t(
                  'บันทึกมติคณะกรรมการและข้อเสนอแนะเชิงกลยุทธ์ (CQI Notes) *',
                  'Committee Resolution & CQI Action Notes *'
                )}
              </label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder={t(
                  'ระบุสรุปการสัมภาษณ์ มติการประชุมหลักสูตร หรือข้อเสนอแนะเพื่อนำไปปรับปรุงหลักสูตรและการเรียนการสอน...',
                  'Record meeting conclusions, re-entry timeline, or curriculum improvements...'
                )}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isSubmitting}
              >
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !resolutionNotes.trim()}
              >
                <FileCheck2 className="h-4 w-4 mr-1.5" />
                {t('ยืนยันปิดเคสอย่างเป็นทางการ', 'Confirm & Close Case')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* In-App Document Viewer & Downloader Modal */}
      <DocumentViewerModal
        isOpen={previewDoc !== null}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  )
}
