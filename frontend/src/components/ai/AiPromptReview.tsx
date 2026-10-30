// ============================================================
// AI Prompt Review — shows the exact prompt that will be sent to the AI before
// any analysis runs, and lets the user edit the task instructions. The role &
// privacy rules and the de-identified case data stay locked. Every confirmed
// run is written to the audit log. Used by every AI feature.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { Modal, Button } from '@/components/ui'
import { Send, Copy, ShieldCheck, Globe, ChevronDown, Lock, RotateCcw, Pencil } from 'lucide-react'
import {
  buildAiPrompt,
  buildLockedPromptParts,
  describeAiDestination,
  getDefaultAiInstructions,
  getStoredAiInstructions,
  setStoredAiInstructions,
  MAX_AI_INSTRUCTIONS_CHARS,
  type AIAnalysisRequest,
} from '@/services/aiService'

/**
 * Returns `reviewPrompt(req)` which opens the review dialog and resolves to the
 * confirmed request (including any edited instructions), or null if cancelled,
 * plus the dialog element to render.
 */
export function useAiPromptReview() {
  const { currentUser } = useAuth()
  const store = useStore()
  const [pending, setPending] = useState<AIAnalysisRequest | null>(null)
  const resolverRef = useRef<((req: AIAnalysisRequest | null) => void) | null>(null)

  const reviewPrompt = useCallback((req: AIAnalysisRequest) => {
    setPending(req)
    return new Promise<AIAnalysisRequest | null>(resolve => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((confirmed: AIAnalysisRequest | null) => {
    if (confirmed) {
      const mode = confirmed.mode || 'strategic_synthesis'
      const edited = !!confirmed.customInstructions
      const destination = describeAiDestination(confirmed)
      store.addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Unknown',
        userRole: currentUser?.role || 'qa_chair',
        action: 'ai_analysis_run',
        description: `AI analysis (${mode}) on ${confirmed.cases.length} de-identified cases via ${destination.label}${edited ? ' — instructions edited by user' : ''}`,
        metadata: edited ? JSON.stringify({ customInstructions: confirmed.customInstructions }) : undefined,
      })
    }
    resolverRef.current?.(confirmed)
    resolverRef.current = null
    setPending(null)
  }, [store, currentUser])

  const dialog = (
    <AiPromptReviewModal
      pending={pending}
      onConfirm={settle}
      onCancel={() => settle(null)}
    />
  )

  return { reviewPrompt, promptReviewDialog: dialog }
}

function AiPromptReviewModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: AIAnalysisRequest | null
  onConfirm: (req: AIAnalysisRequest) => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [showFull, setShowFull] = useState(false)
  const [instructions, setInstructions] = useState('')

  const mode = pending?.mode || 'strategic_synthesis'
  const defaultInstructions = pending ? getDefaultAiInstructions(mode, pending.query) : ''

  useEffect(() => {
    setShowFull(false)
    if (pending) {
      const m = pending.mode || 'strategic_synthesis'
      setInstructions(pending.customInstructions || getStoredAiInstructions(m) || getDefaultAiInstructions(m, pending.query))
    }
  }, [pending])

  if (!pending) return null

  const isEdited = instructions.trim() !== defaultInstructions.trim()
  const isEmpty = !instructions.trim()
  const finalReq: AIAnalysisRequest = { ...pending, customInstructions: isEdited && !isEmpty ? instructions : undefined }
  const prompt = buildAiPrompt(finalReq)
  const { caseData } = buildLockedPromptParts(pending)
  const destination = describeAiDestination(pending)
  const caseCount = pending.cases.length
  const taskLabel = mode === 'chat_query'
    ? t('ตอบคำถามของคุณ', 'Answer your question')
    : mode === 'case_diagnostic'
    ? t('วิเคราะห์เคสนี้รายบุคคล', 'Analyze this single case')
    : t('สรุปภาพรวมทุกเคส', 'Summarize all cases')
  const fullText = `[SYSTEM]\n${prompt.systemInstruction}\n\n[USER]\n${prompt.userPrompt}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText)
      addToast('success', t('คัดลอกแล้ว', 'Copied'), t('คัดลอกพรอมต์ไปยังคลิปบอร์ดแล้ว', 'Prompt copied to clipboard.'))
    } catch {
      addToast('error', t('คัดลอกไม่สำเร็จ', 'Copy failed'), t('ไม่สามารถเข้าถึงคลิปบอร์ดได้', 'Clipboard is not available.'))
    }
  }

  function handleConfirm() {
    // Remember edits for next time (summary & case modes; chat instructions contain the question)
    setStoredAiInstructions(mode, isEdited ? instructions : null)
    onConfirm(finalReq)
  }

  const lockedLabel = (
    <span className="inline-flex items-center gap-1 ml-2 font-normal normal-case text-slate-400">
      <Lock className="h-3 w-3" />
      {t('ล็อก แก้ไขไม่ได้', 'Locked')}
    </span>
  )

  return (
    <Modal
      isOpen
      onClose={onCancel}
      size="lg"
      title={t('ตรวจสอบพรอมต์ก่อนส่งให้ AI', 'Review AI Prompt Before Analysis')}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold">
            <Globe className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            {t('ปลายทาง:', 'Destination:')} {destination.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {t(`${caseCount} เคส (ลบชื่อและรหัสนักศึกษาแล้ว)`, `${caseCount} cases (names & student IDs removed)`)}
          </span>
        </div>

        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
          <dt className="text-slate-500 dark:text-slate-400">{t('งาน', 'Task')}</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">{taskLabel}</dd>
          {pending.query && (
            <>
              <dt className="text-slate-500 dark:text-slate-400">{t('คำถาม', 'Question')}</dt>
              <dd className="text-slate-800 dark:text-slate-200 break-words">"{pending.query}"</dd>
            </>
          )}
          <dt className="text-slate-500 dark:text-slate-400">{t('ข้อมูลที่ส่ง', 'Data sent')}</dt>
          <dd className="text-slate-800 dark:text-slate-200">
            {t(`${caseCount} เคส ส่งไปยัง ${destination.label}`, `${caseCount} cases sent to ${destination.label}`)}
          </dd>
        </dl>

        {/* Editable: task instructions */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label htmlFor="ai-instructions" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Pencil className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              {t('คำสั่งถึง AI (แก้ไขได้)', 'Instructions for the AI (editable)')}
              {isEdited && (
                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 text-[10px] font-semibold">
                  {t('แก้ไขแล้ว', 'Edited')}
                </span>
              )}
            </label>
            {isEdited && (
              <button
                type="button"
                onClick={() => setInstructions(defaultInstructions)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                {t('คืนค่าเริ่มต้น', 'Reset to default')}
              </button>
            )}
          </div>
          <textarea
            id="ai-instructions"
            value={instructions}
            onChange={e => setInstructions(e.target.value.slice(0, MAX_AI_INSTRUCTIONS_CHARS))}
            rows={7}
            className="w-full px-3 py-2.5 text-[11px] leading-relaxed font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-y"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
            <span>
              {isEmpty
                ? t('ช่องนี้ว่าง จะใช้คำสั่งเริ่มต้นแทน', 'Empty: the default instructions will be used.')
                : t('กฎความเป็นส่วนตัวและข้อมูลเคสถูกล็อกไว้ แก้ไขไม่ได้', 'Privacy rules and case data are locked and cannot be edited.')}
            </span>
            <span>{instructions.length.toLocaleString()} / {MAX_AI_INSTRUCTIONS_CHARS.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFull(!showFull)}
          aria-expanded={showFull}
          className="flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFull ? 'rotate-180' : ''}`} />
          {showFull
            ? t('ซ่อนพรอมต์ฉบับเต็ม', 'Hide full prompt')
            : t(`ดูพรอมต์ฉบับเต็ม (${(prompt.systemInstruction.length + prompt.userPrompt.length).toLocaleString()} ตัวอักษร)`, `View full prompt (${(prompt.systemInstruction.length + prompt.userPrompt.length).toLocaleString()} characters)`)}
        </button>

        {showFull && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {t(
                'ข้อความด้านล่างคือพรอมต์ฉบับเต็มที่จะถูกส่งไปยังผู้ให้บริการ AI ภายนอก',
                'Below is the full prompt that will be sent to the external AI provider.'
              )}
            </p>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                {t('กฎของระบบ', 'System Rules')}
                {lockedLabel}
              </div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0b1020] p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-mono">
                {prompt.systemInstruction}
              </pre>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                {t('ข้อมูลเคส', 'Case Data')}
                {lockedLabel}
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-[#0b1020] p-3 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-mono">
                {caseData || t('(ไม่มีเคส)', '(no cases)')}
              </pre>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleCopy} className="text-xs font-semibold cursor-pointer">
            <Copy className="h-3.5 w-3.5 mr-1" />
            {t('คัดลอกพรอมต์', 'Copy Prompt')}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="cursor-pointer">
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleConfirm} className="font-bold cursor-pointer shadow-2xs">
              <Send className="h-3.5 w-3.5 mr-1" />
              {t('ยืนยันและวิเคราะห์', 'Confirm & Analyze')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
