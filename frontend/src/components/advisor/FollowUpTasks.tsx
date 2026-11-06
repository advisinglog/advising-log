import { useState } from 'react'
import { Plus, Trash2, Loader2, ListPlus } from 'lucide-react'
import { Modal, Button, CustomSelect, RequiredMark } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'
import type { AdvisingRequest, FollowUp } from '@/types'

export interface FollowUpDraft {
  task: string
  dueDate: string
}

export const emptyFollowUpDraft = (): FollowUpDraft => ({ task: '', dueDate: '' })

/** Drafts the advisor actually filled in (both fields empty = ignored row). */
export function filledDrafts(drafts: FollowUpDraft[]): FollowUpDraft[] {
  return drafts.filter(d => d.task.trim() || d.dueDate)
}

/** Returns which field is missing on a half-filled row, or null when every filled row is complete. */
export function draftsProblem(drafts: FollowUpDraft[]): 'missing_date' | 'missing_task' | null {
  for (const d of filledDrafts(drafts)) {
    if (!d.task.trim()) return 'missing_task'
    if (!d.dueDate) return 'missing_date'
  }
  return null
}

const inputClass =
  'w-full px-3 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs'

/** Editable list of follow-up tasks, each with its own due date. */
export function FollowUpTaskFields({ rows, onChange }: { rows: FollowUpDraft[]; onChange: (rows: FollowUpDraft[]) => void }) {
  const { t } = useLanguage()

  function update(index: number, patch: Partial<FollowUpDraft>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_10rem_auto] gap-2 items-center">
          <input
            type="text"
            aria-label={t(`งานที่ ${index + 1}`, `Task ${index + 1}`)}
            value={row.task}
            onChange={e => update(index, { task: e.target.value })}
            placeholder={t('เช่น นำส่งใบคำร้องขอถอนรายวิชา, ส่งเอกสารทุนการศึกษา...', 'e.g. Submit course withdrawal form, submit scholarship receipt...')}
            className={inputClass}
          />
          <input
            type="date"
            aria-label={t(`วันกำหนดส่งงานที่ ${index + 1}`, `Due date for task ${index + 1}`)}
            min={getLocalDateString()}
            value={row.dueDate}
            onChange={e => update(index, { dueDate: e.target.value })}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(rows.length > 1 ? rows.filter((_, i) => i !== index) : [emptyFollowUpDraft()])}
            aria-label={t('ลบงานนี้', 'Remove this task')}
            className="justify-self-end p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyFollowUpDraft()])}
        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('เพิ่มงาน', 'Add task')}
      </button>
    </div>
  )
}

/** Creates follow-up tasks for a case, notifies the student, and writes the audit trail. */
export function useAssignFollowUps() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { t } = useLanguage()

  return function assign({
    drafts,
    requestId,
    sessionId,
    studentId,
  }: {
    drafts: FollowUpDraft[]
    requestId?: string
    sessionId?: string
    studentId: string
  }): FollowUp[] {
    if (!currentUser) return []
    const studentName = store.users.find(u => u.id === studentId)?.name || studentId
    return filledDrafts(drafts).map(d => {
      const task = d.task.trim()
      const fu = store.addFollowUp({
        sessionId,
        requestId,
        studentId,
        advisorId: currentUser.id,
        task,
        dueDate: d.dueDate,
        status: 'pending',
      })
      store.addNotification({
        userId: studentId,
        type: 'action_required',
        title: t('งานติดตามผลใหม่จากอาจารย์', 'New Follow-up Task'),
        message: `${t('อาจารย์มอบหมายงานติดตามผล:', 'Your advisor has assigned a follow-up:')} ${task}`,
        relatedId: fu.id,
        isRead: false,
      })
      store.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: 'advisor',
        action: 'followup_created',
        description: `Created follow-up for ${studentName}: ${task}`,
        targetId: fu.id,
      })
      return fu
    })
  }
}

/** Shows a toast for a half-filled row; returns true when the drafts are OK to save. */
export function useCheckDrafts() {
  const { t } = useLanguage()
  const { addToast } = useToast()
  return function check(drafts: FollowUpDraft[], requireOne: boolean): boolean {
    const problem = draftsProblem(drafts)
    if (problem === 'missing_date') {
      addToast('error', t('กรุณาระบุวันกำหนดส่ง', 'Due Date Required'), t('ทุกงานต้องมีวันกำหนดส่ง', 'Every task needs a due date.'))
      return false
    }
    if (problem === 'missing_task') {
      addToast('error', t('กรุณาระบุชื่องานติดตามผล', 'Follow-up Task Required'), t('กรุณาระบุรายละเอียดงานที่ต้องการมอบหมาย', 'Please specify the follow-up task description.'))
      return false
    }
    if (requireOne && filledDrafts(drafts).length === 0) {
      addToast('error', t('ยังไม่มีงาน', 'No task yet'), t('กรุณาเพิ่มอย่างน้อย 1 งาน', 'Please add at least one task.'))
      return false
    }
    return true
  }
}

/** Open cases (notes written, not closed yet) the advisor can still add tasks to. */
export function useOpenCases(): AdvisingRequest[] {
  const { currentUser } = useAuth()
  const store = useStore()
  return store.requests.filter(
    r =>
      r.status === 'completed' &&
      isAdvisorMatch(r.advisorId, currentUser, store.users) &&
      store.sessions.some(s => s.requestId === r.id)
  )
}

/** "Add task" from the Follow-ups page: pick an open case, then assign one or more tasks. */
export function AddFollowUpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()
  const { addToast } = useToast()
  const assign = useAssignFollowUps()
  const check = useCheckDrafts()
  const openCases = useOpenCases()
  const [requestId, setRequestId] = useState('')
  const [rows, setRows] = useState<FollowUpDraft[]>([emptyFollowUpDraft()])
  const [saving, setSaving] = useState(false)

  function reset() {
    setRequestId('')
    setRows([emptyFollowUpDraft()])
    setSaving(false)
  }

  function handleSave() {
    const request = openCases.find(r => r.id === requestId)
    if (!request) {
      addToast('error', t('กรุณาเลือกเคส', 'Choose a case'), t('เลือกเคสที่ต้องการเพิ่มงาน', 'Pick the case to add tasks to.'))
      return
    }
    if (!check(rows, true)) return
    setSaving(true)
    const session = store.sessions
      .filter(s => s.requestId === request.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const created = assign({ drafts: rows, requestId: request.id, sessionId: session?.id, studentId: request.studentId })
    addToast(
      'success',
      t(`มอบหมายงานแล้ว ${created.length} งาน`, `${created.length} task(s) assigned`),
      t('เคสยังเปิดอยู่จนกว่านักศึกษาจะทำงานครบ', 'The case stays open until the student finishes them.')
    )
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose() }} title={t('เพิ่มงานติดตามผล', 'Add Follow-up Task')} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t('เคส', 'Case')} <RequiredMark />
          </label>
          <CustomSelect
            ariaLabel={t('เคส', 'Case')}
            value={requestId}
            onChange={setRequestId}
            placeholder={t('-- เลือกเคสที่ยังเปิดอยู่ --', 'Choose an open case')}
            options={openCases.map(r => {
              const s = store.users.find(u => u.id === r.studentId)
              return { value: r.id, label: `${s?.name || r.studentId} (${s?.code || '-'})`, description: getCategoryLabel(r.category) }
            })}
          />
          {openCases.length === 0 && (
            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-1.5">
              {t('ยังไม่มีเคสที่เปิดอยู่ ต้องบันทึกผลการเข้าพบก่อนจึงจะเพิ่มงานได้', 'No open cases yet. Write meeting notes first, then you can add tasks.')}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {t('งานที่มอบหมาย', 'Tasks')} <RequiredMark />
          </p>
          <FollowUpTaskFields rows={rows} onChange={setRows} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={() => { reset(); onClose() }} disabled={saving}>{t('ยกเลิก', 'Cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ListPlus className="h-4 w-4 mr-1.5" />}
            {t('มอบหมายงาน', 'Assign')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
