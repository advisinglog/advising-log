import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, Card, Button, EmptyState } from '@/components/ui'
import { ClipboardCheck, User, PlusCircle, Lightbulb, Sparkles, Check } from 'lucide-react'

import { isAdvisorMatch } from '@/utils/advisorUtils'

export default function AdvisorLog() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getCategoryLabel } = useLanguage()

  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [summary, setSummary] = useState('')
  const [followUpTask, setFollowUpTask] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [activeTemplateIdx, setActiveTemplateIdx] = useState<number | null>(null)

  if (!currentUser) return null

  // Example templates for advisor guidance
  const EXAMPLE_TEMPLATES = [
    {
      title: t('ผลการเรียน / แผนการเรียน', 'Academic & Study Planning'),
      badge: t('วิชาการ', 'Academic'),
      text: t(
        'นักศึกษาปรึกษาเรื่องผลการเรียนและกังวลเรื่องเกรดเฉลี่ย (GPA) ต่ำกว่าเกณฑ์ ได้ร่วมกันวิเคราะห์ปัญหาพบว่าจัดสรรเวลาทบทวนบทเรียนไม่เพียงพอ ได้ให้คำแนะนำเทคนิคการจัดตารางอ่านหนังสือ (Time-blocking) วางแผนลงทะเบียนเรียนวิชาปรับเกรดในภาคการศึกษาถัดไป และนัดหมายติดตามผลหลังสอบกลางภาค',
        'Advisee consulted regarding academic standing and GPA concerns. Identified time management issues during exam preparation. Recommended time-blocking study methods, planned prerequisite retakes for next term, and scheduled a mid-term progress follow-up.'
      ),
    },
    {
      title: t('การเพิ่ม-ถอน / แผนลงทะเบียน', 'Registration & Course Drop'),
      badge: t('ลงทะเบียน', 'Registration'),
      text: t(
        'นักศึกษาขอคำปรึกษาเรื่องการถอนรายวิชาเนื่องจากภาระงานหนักและคะแนนสอบย่อยไม่เป็นไปตามเป้า ได้ให้คำแนะนำในการพิจารณาเงื่อนไขรายวิชาต่อเนื่อง (Prerequisite) และผลกระทบต่อเกรดเฉลี่ย โดยแนะนำให้ยื่นคำร้องถอนรายวิชาภายในกำหนด และวางแผนลงเรียนใหม่ในภาคฤดูร้อน',
        'Advisee requested guidance on withdrawing from a heavy course to safeguard GPA. Reviewed prerequisite dependencies and recommended submitting the course drop petition within deadline, planning a retake in the summer session.'
      ),
    },
    {
      title: t('การปรับตัว / ปัญหาส่วนตัว', 'Adaptation & Well-being'),
      badge: t('การใช้ชีวิต', 'Life & Well-being'),
      text: t(
        'นักศึกษาเข้าพบเพื่อปรึกษาเรื่องการปรับตัวเข้ากับสภาพแวดล้อมมหาวิทยาลัยและความเครียดจากการเรียน ได้รับฟัง ให้กำลังใจ และแนะนำเทคนิคการบริหารความเครียด รวมถึงแนะนำช่องทางขอรับคำปรึกษาด้านสุขภาพจิตของมหาวิทยาลัยเพิ่มเติม บรรยากาศการพูดคุยเป็นไปด้วยความเข้าใจ',
        'Advisee shared feelings of stress and adjustment difficulties in university life. Provided active listening, supportive encouragement, and stress coping techniques, alongside university counseling resource contacts.'
      ),
    },
  ]

  // Completed requests that don't have a session log yet
  const completedRequests = store.requests.filter(r =>
    isAdvisorMatch(r.advisorId, currentUser, store.users) && r.status === 'completed' &&
    !store.sessions.find(s => s.requestId === r.id)
  )

  const selectedReq = store.requests.find(r => r.id === selectedRequestId)
  const student = selectedReq ? store.users.find(u => u.id === selectedReq.studentId) : null
  const appointment = selectedReq ? store.appointments.find(a => a.requestId === selectedReq.id) : null

  function handleApplyTemplate(templateText: string, idx: number) {
    if (!summary.trim() || window.confirm(t('ต้องการแทนที่ข้อความสรุปด้วยตัวอย่างนี้หรือไม่?', 'Replace current text with this example template?'))) {
      setSummary(templateText)
      setActiveTemplateIdx(idx)
      addToast('info', t('นำตัวอย่างไปใส่ในช่องสรุปแล้ว', 'Example applied to summary'), t('สามารถปรับแต่งเนื้อหาเพิ่มเติมให้ตรงกับเคสจริงได้เลย', 'You can now customize it to fit the actual session.'))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRequestId || !summary.trim()) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณาเลือกนัดหมายและระบุสรุปผลการให้คำปรึกษา', 'Please select a session and provide the advising summary.'))
      return
    }

    const cleanSummary = summary.trim()
    const session = store.addSession({
      requestId: selectedRequestId,
      appointmentId: appointment?.id || '',
      studentId: selectedReq!.studentId,
      advisorId: currentUser!.id,
      sessionDate: new Date().toISOString().split('T')[0],
      summary: cleanSummary,
      problem: cleanSummary,
      advice: cleanSummary,
      actionsTaken: '',
      outcome: '',
    })

    store.updateRequestStatus(selectedRequestId, 'closed')
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'log_created',
      description: `Created advising log for ${student?.name}`,
      targetId: session.id,
    })

    // Create follow-up if specified
    if (followUpTask.trim() && followUpDate) {
      const fu = store.addFollowUp({
        sessionId: session.id,
        requestId: selectedRequestId,
        studentId: selectedReq!.studentId,
        advisorId: currentUser!.id,
        task: followUpTask.trim(),
        dueDate: followUpDate,
        status: 'pending',
      })
      store.addNotification({
        userId: selectedReq!.studentId,
        type: 'action_required',
        title: t('งานติดตามผลใหม่จากอาจารย์', 'New Follow-up Task'),
        message: `${t('อาจารย์มอบหมายงานติดตามผล:', 'Your advisor has assigned a follow-up:')} ${followUpTask.trim()}`,
        relatedId: fu.id,
        isRead: false,
      })
      store.addAuditLog({
        userId: currentUser!.id,
        userName: currentUser!.name,
        userRole: 'advisor',
        action: 'followup_created',
        description: `Created follow-up for ${student?.name}: ${followUpTask.trim()}`,
        targetId: fu.id,
      })
    }

    addToast('success', t('บันทึกผลการให้คำปรึกษาแล้ว', 'Advising Log Saved'), t('บันทึกสรุปและประวัติการให้คำปรึกษาได้รับการอัปเดตเรียบร้อย', 'The session record and audit trail have been updated.'))
    setSelectedRequestId('')
    setSummary('')
    setFollowUpTask('')
    setFollowUpDate('')
    setActiveTemplateIdx(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={t('บันทึกผลการเข้าพบอาจารย์ที่ปรึกษา', 'Advisor Log Entry')}
        description={t('บันทึกสรุปผลการให้คำปรึกษา คำแนะนำ และกำหนดงานติดตามผลแก่นักศึกษาอย่างกระชับและรวดเร็ว', 'Document session summary, guidance provided, and assign action items.')}
      />

      {completedRequests.length === 0 && !selectedRequestId ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6 text-sky-500" />}
            title={t('ไม่มีนัดหมายที่รอการเขียนบันทึก', 'No sessions pending documentation')}
            description={t('เมื่อคุณกด "เสร็จสิ้น" ในแท็บรายการนัดหมาย จะสามารถเขียนบันทึกผลการให้คำปรึกษาได้ที่นี่', 'Mark a scheduled session as \'Completed\' in the Sessions tab to write its official advising log.')}
          />
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Session Selector */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                {t('เลือกนัดหมายที่เสร็จสิ้นแล้ว', 'Select Completed Session')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRequestId}
                onChange={e => setSelectedRequestId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs cursor-pointer"
              >
                <option value="">{t('-- เลือกรายการนัดหมายที่ต้องการบันทึก --', 'Select a completed session to log')}</option>
                {completedRequests.map(r => {
                  const s = store.users.find(u => u.id === r.studentId)
                  return (
                    <option key={r.id} value={r.id}>
                      {s?.name} ({s?.code}) — {getCategoryLabel(r.category)}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Selected Student & Request Summary Preview */}
            {selectedReq && (
              <div className="p-4 bg-sky-50/50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/80 rounded-xl text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>{student?.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({student?.code})</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                    {getCategoryLabel(selectedReq.category)}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                  <span className="text-slate-400 font-medium">{t('ประเด็นที่นักศึกษาขอคำปรึกษา:', 'Student Request Details:')}</span>{' '}
                  {selectedReq.details}
                </p>
              </div>
            )}

            {/* Writing Guide & Examples Box */}
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('ตัวอย่างแนวทางการเขียนสรุป (คลิกเพื่อนำไปใช้)', 'Advising Notes Writing Guide & Examples')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('ยุบรวมทั้งปัญหา คำแนะนำ และข้อตกลงไว้ในที่เดียว สามารถคลิกปุ่มตัวอย่างเพื่อคัดลอกลงในช่องได้ทันที', 'Combines challenges, recommendations, and agreements into one place. Click any example to use.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {EXAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 shadow-2xs ${
                      activeTemplateIdx === idx
                        ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 ring-1 ring-sky-400/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {tmpl.title}
                        </span>
                        <span className="text-[9px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950 px-1.5 py-0.2 rounded">
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-4">
                        "{tmpl.text}"
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.text, idx)}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer self-start ${
                        activeTemplateIdx === idx
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300'
                      }`}
                    >
                      {activeTemplateIdx === idx ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>{t('กำลังใช้งานตัวอย่างนี้', 'Template Applied')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          <span>{t('ใช้ตัวอย่างนี้', 'Use Example')}</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Unified Summary Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('สรุปผลการให้คำปรึกษาและคำแนะนำ', 'Advising Notes & Summary')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t('ครอบคลุมทั้งประเด็นปัญหา คำแนะนำทางวิชาการ และข้อตกลงร่วมกัน', 'Encompasses issues, advice, and next steps in one note')}
                </span>
              </div>
              <textarea
                value={summary}
                onChange={e => {
                  setSummary(e.target.value)
                  if (activeTemplateIdx !== null) setActiveTemplateIdx(null)
                }}
                rows={6}
                placeholder={t(
                  'สรุปภาพรวมการเข้าพบ ปัญหาหรืออุปสรรคที่พบ คำแนะนำและแนวทางแก้ไขที่มอบให้แก่นักศึกษา รวมถึงข้อตกลงร่วมกัน...',
                  'Summarize the advising meeting, issues discussed, recommendations given, and agreed action items...'
                )}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none leading-relaxed shadow-xs"
              />
            </div>

            {/* Optional Follow-up Task Assignment */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <PlusCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{t('มอบหมายงานติดตามผล (ไม่บังคับ)', 'Assign Follow-up Task (Optional)')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                {t('หากมีสิ่งที่นักศึกษาต้องดำเนินการส่งต่อในภายหลัง สามารถระบุเพื่อแจ้งเตือนในระบบได้', 'Assign an action item if the student needs to submit documents or report progress.')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('รายละเอียดงานที่มอบหมาย', 'Task Description')}
                  </label>
                  <input
                    type="text"
                    value={followUpTask}
                    onChange={e => setFollowUpTask(e.target.value)}
                    placeholder={t('เช่น ส่งแบบคำร้องเพิ่ม-ถอนรายวิชาที่แก้ไขแล้ว', 'e.g. Submit updated course registration form')}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('กำหนดส่งงาน', 'Target Due Date')}
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary">
                {t('บันทึกผลการให้คำปรึกษา', 'Save Advising Log')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}


