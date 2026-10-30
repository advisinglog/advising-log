import BackendDataStatus from '@/components/BackendDataStatus'
// ============================================================
// AdvisingLog — Student-Advisor Roster Management (Admin)
// Cohort Assignment & Batch CSV Import with Duplicate Prevention
// ============================================================

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader, DataTable, Button, SearchInput, Modal } from '@/components/ui'
import {
  Upload,
  Plus,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  GitMerge,
} from 'lucide-react'
import type { StudentAdvisorAssignment, RosterImportEntry, RosterImportResult } from '@/types'

export default function Roster() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t } = useLanguage()

  // Search & Single Assignment Modal
  const [search, setSearch] = useState('')
  const [showAssign, setShowAssign] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedAdvisor, setSelectedAdvisor] = useState('')

  // CSV Import Modal & Wizard States
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert')
  const [csvText, setCsvText] = useState('')
  const [importPreview, setImportPreview] = useState<RosterImportResult | null>(null)
  const [importTab, setImportTab] = useState<'input' | 'preview'>('input')

  const activeRoster = store.roster.filter(r => r.isActive).filter(r => {
    if (!search.trim()) return true
    const student = store.users.find(u => u.id === r.studentId)
    const advisor = store.users.find(u => u.id === r.advisorId)
    const s = search.trim().toLowerCase()
    return (
      (student?.name && student.name.toLowerCase().includes(s)) ||
      (student?.code && student.code.toLowerCase().includes(s)) ||
      (student?.email && student.email.toLowerCase().includes(s)) ||
      (advisor?.name && advisor.name.toLowerCase().includes(s)) ||
      (advisor?.email && advisor.email.toLowerCase().includes(s)) ||
      (advisor?.code && advisor.code.toLowerCase().includes(s))
    )
  })

  const students = store.users.filter(u => u.role === 'student' && u.isActive)
  const advisors = store.users.filter(u => u.role === 'advisor' && u.isActive)

  function handleAssign() {
    if (!selectedStudent || !selectedAdvisor) return
    store.updateRosterEntry(selectedStudent, selectedAdvisor)
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'admin',
      action: 'roster_updated',
      description: `Assigned student ${selectedStudent} to advisor ${selectedAdvisor}`,
    })
    addToast(
      'success',
      t('อัปเดตคู่ที่ปรึกษาสำเร็จ', 'Roster Updated'),
      t('กำหนดอาจารย์ที่ปรึกษาให้นักศึกษาเรียบร้อย', 'Student assigned to advisor successfully.')
    )
    setShowAssign(false)
    setSelectedStudent('')
    setSelectedAdvisor('')
  }

  // Parse CSV text into array of entries
  function parseCsv(text: string): RosterImportEntry[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return []

    const entries: RosterImportEntry[] = []
    // Check if line 1 has headers
    const startIndex = lines[0].toLowerCase().includes('student') || lines[0].toLowerCase().includes('code') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''))
      if (parts.length >= 2 && parts[0] && parts[1]) {
        entries.push({
          studentCode: parts[0],
          advisorCodeOrEmail: parts[1],
          notes: parts[2] || '',
        })
      }
    }
    return entries
  }

  // Load sample CSV with realistic students and advisors
  function handleLoadSample() {
    const sample = `student_code,advisor_code_or_email,notes
6631503001,ADV001,Group A - Software Eng
6631503002,ADV002,Group B - Data Science
6531503001,ADV001,Group A - Senior Year
6531503002,ADV003,Group C - UX Design`
    setCsvText(sample)
    handleValidatePreview(sample, importMode)
  }

  // Download template CSV file
  function handleDownloadTemplate() {
    const templateContent = `student_code,advisor_code_or_email,notes
6631503001,ADV001,ตัวอย่างนักศึกษาคนที่ 1
6631503002,wirot.t@mfu.ac.th,ตัวอย่างใช้อีเมลอาจารย์
6531503001,ADV002,ตัวอย่างนักศึกษาคนที่ 3`
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'advisor_roster_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    addToast('info', t('ดาวน์โหลดไฟล์แม่แบบแล้ว', 'Template Downloaded'), 'advisor_roster_template.csv')
  }

  // Validate and generate live preview before committing
  function handleValidatePreview(customText?: string, mode: 'upsert' | 'replace' = importMode) {
    const raw = customText !== undefined ? customText : csvText
    const entries = parseCsv(raw)

    if (entries.length === 0) {
      addToast('warning', t('ไม่พบข้อมูลในไฟล์', 'No Data Found'), t('กรุณากรอกหรืออัปโหลดไฟล์ CSV ที่มีข้อมูลอย่างน้อย 1 แถว', 'Please provide CSV data with at least 1 row.'))
      return
    }

    const seenStudentCodes = new Set<string>()
    const preview: RosterImportResult['preview'] = []
    let added = 0
    let updated = 0
    let unchanged = 0
    let skipped = 0
    const errors: string[] = []

    for (const entry of entries) {
      const sCode = entry.studentCode
      const aTarget = entry.advisorCodeOrEmail.toLowerCase()

      if (seenStudentCodes.has(sCode)) {
        skipped++
        errors.push(`รหัสนักศึกษา ${sCode} ซ้ำกันในไฟล์ (ระบบจะยึดแถวแรกและข้ามแถวซ้ำ)`)
        continue
      }
      seenStudentCodes.add(sCode)

      const student = store.users.find(
        u =>
          u.role === 'student' &&
          (u.code.toLowerCase() === sCode.toLowerCase() ||
            u.email.toLowerCase() === sCode.toLowerCase() ||
            u.email.toLowerCase().startsWith(sCode.toLowerCase()))
      )
      if (!student) {
        skipped++
        errors.push(`ไม่พบนักศึกษา "${sCode}" ในระบบ (ระบุด้วยรหัสนักศึกษาหรืออีเมล)`)
        preview.push({
          studentCode: sCode,
          studentName: t('ไม่พบในระบบ', 'Unknown Student'),
          newAdvisorName: entry.advisorCodeOrEmail,
          action: 'error',
          errorReason: t(`ไม่พบนักศึกษา "${sCode}" ในระบบ`, `Student "${sCode}" not found`),
        })
        continue
      }

      const advisor = store.users.find(
        u =>
          u.role === 'advisor' &&
          (u.code.toLowerCase() === aTarget ||
            u.email.toLowerCase() === aTarget ||
            u.name.toLowerCase().includes(aTarget) ||
            u.id.toLowerCase() === aTarget)
      )

      if (!advisor) {
        skipped++
        errors.push(`ไม่พบอาจารย์ "${entry.advisorCodeOrEmail}" สำหรับนักศึกษา ${sCode}`)
        preview.push({
          studentCode: sCode,
          studentName: student.name,
          newAdvisorName: t('ไม่พบอาจารย์', 'Unknown Advisor'),
          action: 'error',
          errorReason: t(`ไม่พบอาจารย์ "${entry.advisorCodeOrEmail}"`, `Advisor "${entry.advisorCodeOrEmail}" not found`),
        })
        continue
      }

      const existingActive = store.roster.find(r => r.studentId === student.id && r.isActive)
      const oldAdvisor = existingActive ? store.users.find(u => u.id === existingActive.advisorId) : undefined

      if (!existingActive) {
        added++
        preview.push({
          studentCode: student.code,
          studentName: student.name,
          newAdvisorName: advisor.name,
          action: 'add',
        })
      } else if (existingActive.advisorId !== advisor.id) {
        updated++
        preview.push({
          studentCode: student.code,
          studentName: student.name,
          oldAdvisorName: oldAdvisor?.name,
          newAdvisorName: advisor.name,
          action: 'update',
        })
      } else {
        unchanged++
        preview.push({
          studentCode: student.code,
          studentName: student.name,
          oldAdvisorName: oldAdvisor?.name,
          newAdvisorName: advisor.name,
          action: 'no_change',
        })
      }
    }

    setImportPreview({
      mode,
      totalRows: entries.length,
      addedCount: added,
      updatedCount: updated,
      unchangedCount: unchanged,
      skippedCount: skipped,
      errors,
      preview,
    })
    setImportTab('preview')
  }

  // Commit the import into store
  function handleCommitImport() {
    const entries = parseCsv(csvText)
    if (entries.length === 0) return

    const result = store.batchImportRoster(entries, importMode)

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'admin',
      action: 'roster_batch_imported',
      description: `Batch imported roster from CSV (${importMode.toUpperCase()} mode): ${result.addedCount} added, ${result.updatedCount} re-assigned, ${result.unchangedCount} unchanged, ${result.errors.length} errors`,
    })

    addToast(
      'success',
      t('นำเข้าข้อมูลสำเร็จ', 'Roster Imported Successfully'),
      importMode === 'upsert'
        ? t(
            `โหมดอัปเดต: เพิ่มใหม่ ${result.addedCount} คู่, เปลี่ยนอาจารย์ ${result.updatedCount} คู่ (ข้อมูลเดิมไม่หาย)`,
            `Upsert: ${result.addedCount} new, ${result.updatedCount} reassigned (previous data preserved)`
          )
        : t(
            `โหมดแทนที่ทั้งหมด: กำหนดใหม่ทั้งหมด ${result.addedCount + result.updatedCount + result.unchangedCount} คู่`,
            `Full Replace: Configured ${result.addedCount + result.updatedCount + result.unchangedCount} pairings platform-wide`
          )
    )

    setShowImportModal(false)
    setCsvText('')
    setImportPreview(null)
    setImportTab('input')
  }

  const columns = [
    {
      key: 'studentCode',
      header: t('รหัสนักศึกษา', 'Student ID'),
      render: (r: StudentAdvisorAssignment) => (
        <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
          {store.users.find(u => u.id === r.studentId)?.code}
        </span>
      ),
    },
    {
      key: 'studentName',
      header: t('ชื่อ-นามสกุล นักศึกษา', 'Student Name'),
      render: (r: StudentAdvisorAssignment) => (
        <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
          {store.users.find(u => u.id === r.studentId)?.name}
        </span>
      ),
    },
    {
      key: 'advisor',
      header: t('อาจารย์ที่ปรึกษาที่ดูแล', 'Assigned Faculty Advisor'),
      render: (r: StudentAdvisorAssignment) => (
        <span className="text-xs text-sky-800 dark:text-sky-300 font-medium bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-100 dark:border-sky-800">
          {store.users.find(u => u.id === r.advisorId)?.name}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('วันที่มอบหมาย', 'Assignment Date'),
      render: (r: StudentAdvisorAssignment) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.assignedAt}</span>
      ),
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Action'),
      render: (r: StudentAdvisorAssignment) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedStudent(r.studentId)
            setSelectedAdvisor(r.advisorId)
            setShowAssign(true)
          }}
        >
          {t('เปลี่ยนอาจารย์', 'Change Advisor')}
        </Button>
      ),
    },
  ]

  if (store.backendStatus !== 'ready') return <BackendDataStatus />

  return (
    <div>
      <PageHeader
        title={t('บัญชีคู่ที่ปรึกษาทางวิชาการ', 'Student-Advisor Roster')}
        description={t(
          'กำหนดกลุ่มนักศึกษาและจับคู่นักศึกษากับอาจารย์ที่ปรึกษาประจำสาขา พร้อมระบบนำเข้า CSV อัจฉริยะ',
          'Configure advising cohorts and map students to designated faculty advisors with smart CSV batch import.'
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              <Upload className="h-4 w-4 mr-1.5 text-slate-500 dark:text-slate-400" />{' '}
              {t('นำเข้าไฟล์ CSV', 'Import CSV')}
            </Button>
            <Button
              onClick={() => {
                setSelectedStudent('')
                setSelectedAdvisor('')
                setShowAssign(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" /> {t('กำหนดที่ปรึกษา', 'Assign Advisor')}
            </Button>
          </div>
        }
      />

      <div className="mb-5 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('ค้นหาตามรหัสนักศึกษา หรือชื่ออาจารย์...', 'Search by student code or advisor...')}
        />
      </div>

      <DataTable
        columns={columns}
        data={activeRoster}
        emptyMessage={t('ไม่พบข้อมูลการจับคู่ที่ปรึกษาที่ตรงกับคำค้นหา', 'No roster assignments match search query.')}
      />

      {/* Manual Single Assign Modal */}
      <Modal
        isOpen={showAssign}
        onClose={() => setShowAssign(false)}
        title={t('จับคู่นักศึกษากับอาจารย์ที่ปรึกษา', 'Assign Student to Advisor')}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {t('นักศึกษา', 'Student')} *
            </label>
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="">{t('-- เลือกนักศึกษา (รหัส / อีเมล) --', 'Select student (Code / Email)')}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.email} ({s.name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
              {t('อาจารย์ที่ปรึกษา', 'Assigned Faculty Advisor')} *
            </label>
            <select
              value={selectedAdvisor}
              onChange={e => setSelectedAdvisor(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200/90 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              <option value="">{t('-- เลือกอาจารย์ที่ปรึกษา (อีเมล / ชื่อ) --', 'Select advisor (Email / Name)')}</option>
              {advisors.map(a => (
                <option key={a.id} value={a.id}>
                  {a.email} — {a.name} ({a.department})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setShowAssign(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleAssign}>
              {t('บันทึกการจับคู่', 'Save Assignment')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* CSV BATCH IMPORT WIZARD & MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title={t('นำเข้าข้อมูลคู่ที่ปรึกษาทางวิชาการ (CSV Roster Import)', 'Import Student-Advisor Roster via CSV')}
        size="lg"
      >
        <div className="space-y-4 text-xs">
          {/* FAQ & Policy Clarification Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 space-y-1">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold">
                <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{t('ข้อมูลจะซ้ำไหม? (Zero Duplicate)', 'Will Data Duplicate? (No!)')}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'ข้อมูลจะไม่ซ้ำเด็ดขาด! ระบบใช้ "รหัสนักศึกษา (Student Code)" เป็นคีย์หลัก นักศึกษา 1 คนจะมีอาจารย์ที่ปรึกษาที่ดูแลได้ 1 ท่านเท่านั้น หากมีรหัสซ้ำในไฟล์ ระบบจะแจ้งเตือนและยึดรายการแรกโดยอัตโนมัติ',
                  'Zero duplicates guaranteed! Student ID is the unique primary key; each student is mapped to exactly one active advisor. In-file duplicates are flagged automatically.'
                )}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 space-y-1">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold">
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{t('จะแทนที่ทั้งหมดไหม? (Mode Choice)', 'Will It Replace All? (You Choose!)')}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'ไม่แทนที่ทั้งหมดหากเลือกโหมด "อัปเดตและเพิ่มใหม่ (Upsert)" — นักศึกษาเดิมที่มีคู่อยู่แล้วและไม่มีชื่อในไฟล์นี้ จะไม่ถูกลบหรือเปลี่ยนแปลงใดๆ ทั้งสิ้น',
                  'Existing pairings remain untouched under "Upsert / Merge" mode. Previous allocations will not be lost unless you explicitly choose "Full Replace".'
                )}
              </p>
            </div>
          </div>

          {/* Import Mode Selection */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{t('เลือกโหมดการนำเข้า (Select Import Mode):', 'Select Import Mode:')}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Upsert / Merge */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  importMode === 'upsert'
                    ? 'bg-sky-50/60 dark:bg-sky-950/30 border-sky-500 ring-2 ring-sky-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="upsert"
                  checked={importMode === 'upsert'}
                  onChange={() => setImportMode('upsert')}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <GitMerge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('อัปเดตและเพิ่มใหม่ (Upsert / Merge)', 'Upsert / Merge')}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-extrabold">
                      {t('แนะนำ', 'Recommended')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {t(
                      'ข้อมูลเดิมไม่หาย! อัปเดตเปลี่ยนอาจารย์ให้นักศึกษาที่มีชื่อในไฟล์ และเพิ่มคู่ใหม่ ส่วนนักศึกษาคนอื่นที่ไม่ระบุในไฟล์จะคงเดิม',
                      'Safest mode. Reassigns advisors for listed students and adds new ones. Unlisted students remain completely untouched.'
                    )}
                  </p>
                </div>
              </label>

              {/* Option B: Full Replace */}
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  importMode === 'replace'
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <Layers className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    <span>{t('แทนที่ข้อมูลทั้งหมด (Full Replace / Overwrite)', 'Full Replace / Overwrite')}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {t(
                      'ล้างการจัดสรรคู่ที่ปรึกษาเดิมทั้งหมด และแทนที่ด้วยชุดข้อมูลในไฟล์นี้เท่านั้น (เหมาะสำหรับการจัดสรรใหม่ยกหลักสูตร)',
                      'Resets all current allocations and applies only the pairings in this file. Recommended for new academic year intake.'
                    )}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Navigation Tabs (Input vs Preview) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportTab('input')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  importTab === 'input'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t('1. วางข้อมูล / นำเข้า CSV', '1. CSV Data Input')}
              </button>

              <button
                type="button"
                onClick={() => handleValidatePreview()}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  importTab === 'preview'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t('2. ตรวจสอบพรีวิว', '2. Validation Preview')}</span>
                {importPreview && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">
                    {importPreview.preview.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('ดาวน์โหลดแม่แบบ CSV', 'Download Template')}</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('โหลดข้อมูลตัวอย่าง', 'Load Sample')}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: CSV INPUT */}
          {importTab === 'input' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {t('เนื้อหาไฟล์ CSV (รูปแบบ: รหัสนักศึกษา, รหัสหรืออีเมลอาจารย์, หมายเหตุ):', 'CSV Text (Format: student_code, advisor_code_or_email, notes):')}
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {csvText ? `${csvText.split(/\r?\n/).filter(Boolean).length} แถว` : '0 แถว'}
                  </span>
                </div>
                <textarea
                  rows={7}
                  placeholder={`student_code,advisor_code_or_email,notes\n6631503001,ADV001,Group A\n6631503002,wirot.t@mfu.ac.th,Group B`}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs"
                />
              </div>

              {/* Upload file directly */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {t('เลือกไฟล์ .csv จากคอมพิวเตอร์', 'Choose .csv file from your computer')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t('รองรับไฟล์ CSV เข้ารหัส UTF-8 ขั้นด้วยเครื่องหมายจุลภาค (,)', 'Supports comma-separated UTF-8 CSV files')}
                    </p>
                  </div>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = evt => {
                        const content = evt.target?.result as string
                        if (content) {
                          setCsvText(content)
                          handleValidatePreview(content, importMode)
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 shadow-2xs text-xs">
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    {t('เลือกไฟล์ CSV', 'Browse CSV')}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                  {t('ยกเลิก', 'Cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleValidatePreview()}
                  disabled={!csvText.trim()}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1" />
                  {t('ตรวจสอบความถูกต้องและพรีวิว', 'Validate & Preview')}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: VALIDATION & PREVIEW */}
          {importTab === 'preview' && (
            <div className="space-y-3">
              {importPreview ? (
                <>
                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('ทั้งหมด', 'Total')}</p>
                      <p className="text-base font-black text-slate-900 dark:text-slate-100">{importPreview.totalRows}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{t('🟢 เพิ่มใหม่', 'New')}</p>
                      <p className="text-base font-black text-emerald-700 dark:text-emerald-300">{importPreview.addedCount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center">
                      <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold uppercase">{t('🟡 เปลี่ยนอาจารย์', 'Reassign')}</p>
                      <p className="text-base font-black text-sky-700 dark:text-sky-300">{importPreview.updatedCount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('⚪ ไม่เปลี่ยนแปลง', 'Unchanged')}</p>
                      <p className="text-base font-black text-slate-700 dark:text-slate-300">{importPreview.unchangedCount}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase">{t('🔴 ข้อผิดพลาด', 'Errors')}</p>
                      <p className="text-base font-black text-rose-700 dark:text-rose-300">{importPreview.errors.length}</p>
                    </div>
                  </div>

                  {/* Errors alert if any */}
                  {importPreview.errors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        {t(`พบข้อผิดพลาด ${importPreview.errors.length} รายการ (ระบบจะข้ามรายการที่มีปัญหา):`, `Found ${importPreview.errors.length} invalid rows (will be skipped):`)}
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-300 space-y-0.5 max-h-24 overflow-y-auto">
                        {importPreview.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="min-w-max w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="p-2.5">{t('รหัสนักศึกษา', 'Student Code')}</th>
                          <th className="p-2.5">{t('ชื่อนักศึกษา', 'Student Name')}</th>
                          <th className="p-2.5">{t('อาจารย์เดิม', 'Previous Advisor')}</th>
                          <th className="p-2.5">{t('อาจารย์ใหม่ (ตาม CSV)', 'New Advisor (CSV)')}</th>
                          <th className="p-2.5 text-center">{t('ผลลัพธ์', 'Outcome')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {importPreview.preview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {row.studentCode}
                            </td>
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {row.studentName}
                            </td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400">
                              {row.oldAdvisorName || '-'}
                            </td>
                            <td className="p-2.5 font-semibold text-sky-700 dark:text-sky-300">
                              {row.newAdvisorName}
                            </td>
                            <td className="p-2.5 text-center">
                              {row.action === 'add' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" /> {t('เพิ่มใหม่', 'New')}
                                </span>
                              )}
                              {row.action === 'update' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                                  <ArrowRight className="h-3 w-3" /> {t('เปลี่ยนอาจารย์', 'Reassign')}
                                </span>
                              )}
                              {row.action === 'no_change' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {t('ไม่เปลี่ยนแปลง', 'No Change')}
                                </span>
                              )}
                              {row.action === 'error' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                  <AlertTriangle className="h-3 w-3" /> {t('ข้อผิดพลาด', 'Error')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setImportTab('input')}
                      className="text-xs text-sky-600 hover:underline cursor-pointer"
                    >
                      &larr; {t('กลับไปแก้ไขข้อความ CSV', 'Edit CSV Text')}
                    </button>

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                      <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                        {t('ยกเลิก', 'Cancel')}
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleCommitImport}
                        disabled={importPreview.addedCount === 0 && importPreview.updatedCount === 0}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        {t(
                          `ยืนยันการนำเข้า (${importPreview.addedCount + importPreview.updatedCount} รายการ)`,
                          `Confirm Import (${importPreview.addedCount + importPreview.updatedCount} entries)`
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p>{t('กรุณากรอกข้อมูล CSV แล้วคลิก "ตรวจสอบพรีวิว"', 'Please input CSV and click Validate & Preview.')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
