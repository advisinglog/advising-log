import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, StatusBadge, Button, Modal, Card } from '@/components/ui'
import { EARLY_WARNING_TYPES } from '@/types'
import type { EarlyWarningCase, EarlyWarningType, EarlyWarningSeverity, EarlyWarningFollowUp } from '@/types'
import { Plus, FileText, Clock, CheckCircle2 } from 'lucide-react'

import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'

export default function EarlyWarning() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, getWarningTypeLabel } = useLanguage()
  const [showCreate, setShowCreate] = useState(false)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [selectedWarning, setSelectedWarning] = useState<EarlyWarningCase | null>(null)
  const [studentId, setStudentId] = useState('')
  const [warningType, setWarningType] = useState<EarlyWarningType | ''>('')
  const [severity, setSeverity] = useState<EarlyWarningSeverity | ''>('')
  const [description, setDescription] = useState('')
  const [recommendedAction, setRecommendedAction] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [followUpActions, setFollowUpActions] = useState('')
  const [followUpOutcome, setFollowUpOutcome] = useState('')

  if (!currentUser) return null
  const myWarnings = store.earlyWarnings.filter(w => isAdvisorMatch(w.advisorId, currentUser, store.users))
  const myFollowUps = store.earlyWarningFollowUps.filter(fw => isAdvisorMatch(fw.advisorId, currentUser, store.users))
  const myStudents = store.roster
    .filter(r => isAdvisorMatch(r.advisorId, currentUser, store.users) && r.isActive)
    .map(r => store.users.find(u => u.id === r.studentId)!)
    .filter(Boolean)

  function handleCreate() {
    if (!studentId || !warningType || !severity || !description) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง', 'Please complete all required fields.'))
      return
    }
    const ew = store.addEarlyWarning({
      studentId,
      advisorId: currentUser!.id,
      warningType: warningType as EarlyWarningType,
      severity: severity as EarlyWarningSeverity,
      description,
      dateDetected: getLocalDateString(),
      recommendedAction,
      followUpDate,
      status: 'active',
    })
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'warning_created',
      description: `Created early warning for ${store.users.find(u => u.id === studentId)?.name}`,
      targetId: ew.id,
    })
    addToast('success', t('สร้างเคสเตือนภัยวิชาการแล้ว', 'Early Warning Created'), t('เคสถูกบันทึกและอยู่ภายใต้การเฝ้าระวังติดตามผล', 'The case is now active under monitoring.'))
    setShowCreate(false)
    setStudentId(''); setWarningType(''); setSeverity(''); setDescription(''); setRecommendedAction(''); setFollowUpDate('')
  }

  function handleAddFollowUp() {
    if (!selectedWarning || !followUpNotes) {
      addToast('error', t('ข้อมูลไม่ครบถ้วน', 'Validation Error'), t('กรุณากรอกข้อมูลที่จำเป็นให้ครบทุกช่อง', 'Please complete all required fields.'))
      return
    }
    const fw = store.addEarlyWarningFollowUp({
      warningId: selectedWarning.id,
      advisorId: currentUser!.id,
      notes: followUpNotes,
      actionsTaken: followUpActions,
      outcome: followUpOutcome,
      followUpDate: getLocalDateString(),
      status: 'in_progress',
    })
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'warning_followup_added',
      description: `Added follow-up for warning ${selectedWarning.id}`,
      targetId: fw.id,
    })
    addToast('success', t('บันทึกการติดตามแล้ว', 'Follow-up Added'), t('บันทึกรายละเอียดการติดตามแล้ว', 'Follow-up details recorded successfully.'))
    setShowFollowUp(false)
    setSelectedWarning(null)
    setFollowUpNotes('')
    setFollowUpActions('')
    setFollowUpOutcome('')
  }

  function getFollowUpsForWarning(warningId: string): EarlyWarningFollowUp[] {
    return myFollowUps.filter(fw => fw.warningId === warningId)
  }

  const columns = [
    {
      key: 'student',
      header: t('นักศึกษา', 'Student'),
      render: (w: EarlyWarningCase) => {
        const s = store.users.find(u => u.id === w.studentId)
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
      header: t('ประเภทปัจจัยเสี่ยง', 'Warning Factor'),
      render: (w: EarlyWarningCase) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {getWarningTypeLabel(w.warningType)}
        </span>
      ),
    },
    { key: 'severity', header: t('ระดับความรุนแรง', 'Severity'), render: (w: EarlyWarningCase) => <StatusBadge status={w.severity} /> },
    { key: 'detected', header: t('วันที่ตรวจพบ', 'Detected On'), render: (w: EarlyWarningCase) => <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{w.dateDetected}</span> },
    { key: 'followup', header: t('วันที่ต้องติดตามผล', 'Follow-up Date'), render: (w: EarlyWarningCase) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{w.followUpDate || '—'}</span> },
    { key: 'status', header: t('สถานะ', 'Status'), render: (w: EarlyWarningCase) => <StatusBadge status={w.status} /> },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (w: EarlyWarningCase) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setSelectedWarning(w); setShowFollowUp(true) }}
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> {t('บันทึกติดตาม', 'Add Follow-up')}
          </Button>
          {(w.status === 'active' || w.status === 'monitoring') && (
            <>
              {w.status === 'active' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { store.updateEarlyWarningStatus(w.id, 'monitoring'); addToast('info', t('ปรับสถานะเป็นกำลังเฝ้าระวังแล้ว', 'Status updated to Monitoring')) }}
                >
                  {t('เฝ้าระวัง', 'Monitor')}
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                onClick={() => { store.updateEarlyWarningStatus(w.id, 'resolved'); addToast('success', t('ยุติเคสแล้ว', 'Warning Resolved'), t('บันทึกเคสว่าได้รับการแก้ไขเรียบร้อยแล้ว', 'Case marked resolved.')) }}
              >
                {t('แก้ไขแล้ว', 'Resolve')}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('ระบบเตือนภัยวิชาการนักศึกษา', 'Student Early Warning System')}
        description={t('ตรวจจับและเฝ้าระวังความเสี่ยงด้านผลการเรียน การเข้าชั้นเรียน หรือปัญหาส่วนตัวเพื่อเข้าช่วยเหลือได้ทันท่วงที', 'Detect academic, attendance, or personal risk factors early to intervene promptly.')}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> {t('บันทึกเตือนภัยใหม่', 'Create Warning')}
          </Button>
        }
      />
      <DataTable columns={columns} data={myWarnings} emptyMessage={t('ไม่พบเคสเตือนภัยวิชาการที่กำลังดำเนินการ', 'No active early warning cases detected.')} />

      {/* Follow-up History Section */}
      {myWarnings.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติการติดตาม', 'Follow-up History')}
          </h3>
          {myWarnings.map(w => {
            const followUps = getFollowUpsForWarning(w.id)
            if (followUps.length === 0) return null
            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{store.users.find(u => u.id === w.studentId)?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{getWarningTypeLabel(w.warningType)} · {w.dateDetected}</p>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="space-y-2">
                  {followUps.map(fw => (
                    <div key={fw.id} className="p-3 bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{fw.createdAt}</span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={fw.status} />
                          {fw.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                store.updateEarlyWarningFollowUpStatus(fw.id, 'completed')
                                addToast('success', t('ดำเนินการติดตามผลเสร็จสิ้นแล้ว', 'Follow-up Marked Completed'))
                              }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              {t('เสร็จสิ้น', 'Complete')}
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mb-1">{fw.notes}</p>
                      {fw.actionsTaken && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">{t('การดำเนินการ', 'Actions')}: {fw.actionsTaken}</p>
                      )}
                      {fw.outcome && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">{t('ผลลัพธ์', 'Outcome')}: {fw.outcome}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('สร้างเคสเตือนภัยวิชาการใหม่', 'Create Early Warning Case')} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('เลือกนักศึกษาในความดูแล', 'Select Advisee Student')} *</label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="">{t('-- เลือกนักศึกษา --', 'Select a student')}</option>
              {myStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ประเภทปัจจัยเสี่ยง', 'Warning Factor')} *</label>
              <select
                value={warningType}
                onChange={e => setWarningType(e.target.value as EarlyWarningType)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">{t('-- เลือกประเภท --', 'Select type')}</option>
                {EARLY_WARNING_TYPES.map(wt => (
                  <option key={wt.value} value={wt.value}>{wt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ระดับความรุนแรง', 'Severity Level')} *</label>
              <select
                value={severity}
                onChange={e => setSeverity(e.target.value as EarlyWarningSeverity)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">{t('-- เลือกระดับ --', 'Select severity')}</option>
                <option value="low">{t('ความเสี่ยงต่ำ', 'Low Risk')}</option>
                <option value="medium">{t('ความเสี่ยงปานกลาง', 'Medium Risk')}</option>
                <option value="high">{t('ความเสี่ยงสูง', 'High Risk')}</option>
                <option value="critical">{t('ความเสี่ยงวิกฤตเร่งด่วน', 'Critical Urgent Risk')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ข้อสังเกตและคำอธิบายความเสี่ยง', 'Observations & Risk Description')} *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={t('อธิบายพฤติกรรมหรือปัญหาที่พบเห็น...', 'Describe what behavior or performance flags were observed...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('การแทรกแซงที่แนะนำ', 'Recommended Intervention')}</label>
            <textarea
              value={recommendedAction}
              onChange={e => setRecommendedAction(e.target.value)}
              rows={2}
              placeholder={t('การดำเนินการหรือหน่วยงานที่ควรประสาน...', 'Recommended actions or support units to involve...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('วันที่กำหนดติดตาม', 'Follow-up Target Date')}</label>
            <input
              type="date"
              value={followUpDate}
              onChange={e => setFollowUpDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleCreate}>{t('สร้างเตือนภัย', 'Create Warning')}</Button>
          </div>
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal isOpen={showFollowUp} onClose={() => { setShowFollowUp(false); setSelectedWarning(null) }} title={t('บันทึกการติดตาม', 'Add Follow-up')} size="md">
        <div className="space-y-4">
          <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 rounded-xl border border-sky-100 dark:border-sky-800">
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 mb-1">{t('นักศึกษา', 'Student')}</p>
            <p className="text-xs text-slate-700 dark:text-slate-300">{store.users.find(u => u.id === selectedWarning?.studentId)?.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{selectedWarning?.description}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('บันทึกการติดตาม', 'Follow-up Notes')} *</label>
            <textarea
              value={followUpNotes}
              onChange={e => setFollowUpNotes(e.target.value)}
              rows={3}
              placeholder={t('บันทึกสิ่งที่หารือ คำตอบของนักศึกษา ข้อสังเกต...', 'Document what was discussed, student\'s response, observations...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('การดำเนินการ', 'Actions Taken')}</label>
            <textarea
              value={followUpActions}
              onChange={e => setFollowUpActions(e.target.value)}
              rows={2}
              placeholder={t('การดำเนินการที่ทำไป (การส่งต่อ การนัดพบ การปรับแก้)...', 'What actions were taken (referrals, meetings, adjustments)...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">{t('ผลลัพธ์', 'Outcome')}</label>
            <textarea
              value={followUpOutcome}
              onChange={e => setFollowUpOutcome(e.target.value)}
              rows={2}
              placeholder={t('สถานะปัจจุบัน การปรับปรุง ขั้นตอนถัดไป...', 'Current status, improvement, next steps...')}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => { setShowFollowUp(false); setSelectedWarning(null) }}>{t('ยกเลิก', 'Cancel')}</Button>
            <Button variant="primary" onClick={handleAddFollowUp}>{t('บันทึก', 'Save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

