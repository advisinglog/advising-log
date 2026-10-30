// ============================================================
// Advisor Dashboard — REG MFU Academic Information Style
// ============================================================

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/mock-store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, Button, Modal, AdvisorCohortBanner } from '@/components/ui'
import { FileEdit, CalendarClock, ListChecks, UserX, AlertTriangle, Clock, ArrowRight, UserPlus, CheckCircle2, Search, Users, RefreshCw, Upload } from 'lucide-react'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'

export default function AdvisorDashboard() {
  const { currentUser } = useAuth()
  const { t, language, getCategoryLabel } = useLanguage()
  const store = useStore()
  const { addToast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    store.refreshBackend()
    const refreshTimer = window.setInterval(store.refreshBackend, 10000)
    return () => window.clearInterval(refreshTimer)
  }, [store.refreshBackend])

  const [showAddAdvisee, setShowAddAdvisee] = useState(false)
  const [showImportCsv, setShowImportCsv] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvRows, setCsvRows] = useState<Array<{ name: string; code: string }>>([])
  const [csvImportMode, setCsvImportMode] = useState<'upsert' | 'replace'>('upsert')
  const [showAdviseeList, setShowAdviseeList] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  function parseStudentCsv(text: string): Array<{ name: string; code: string }> {
    const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (rows.length === 0) return []

    const firstRow = rows[0].split(/[,;\t]/).map(value => value.trim().toLowerCase())
    const nameHeaders = ['name', 'student_name', 'student name', 'ชื่อ', 'ชื่อ-นามสกุล']
    const codeHeaders = ['code', 'student_code', 'student code', 'student id', 'student_id', 'รหัสนักศึกษา']
    const nameIndex = firstRow.findIndex(value => nameHeaders.includes(value))
    const codeIndex = firstRow.findIndex(value => codeHeaders.includes(value))
    const hasHeader = nameIndex >= 0 || codeIndex >= 0
    const startIndex = hasHeader ? 1 : 0

    return rows.slice(startIndex).map(row => {
      const values = row.split(/[,;\t]/).map(value => value.trim().replace(/^["']|["']$/g, ''))
      return {
        name: values[hasHeader && nameIndex >= 0 ? nameIndex : 1] || '',
        code: values[hasHeader && codeIndex >= 0 ? codeIndex : 0] || '',
      }
    }).filter(row => row.name && row.code)
  }

  function previewStudentCsv(text: string) {
    const rows = parseStudentCsv(text)
    setCsvText(text)
    setCsvRows(rows)
    if (rows.length === 0) {
      addToast('error', t('ไฟล์ไม่ถูกต้อง', 'Invalid CSV'), t('ต้องมีคอลัมน์ชื่อและรหัสนักศึกษา', 'CSV must contain name and student ID columns.'))
    }
  }

  function handleImportCsvFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      previewStudentCsv(String(reader.result || ''))
    }
    reader.onerror = () => addToast('error', t('อ่านไฟล์ไม่สำเร็จ', 'Unable to Read File'), t('กรุณาลองเลือกไฟล์ CSV ใหม่อีกครั้ง', 'Please select the CSV file again.'))
    reader.readAsText(file, 'UTF-8')
  }

  function confirmStudentCsvImport() {
    let addedCount = 0
    let existingCount = 0
    let skippedCount = 0
    const seenCodes = new Set<string>()
    const importedCodes = new Set(csvRows.map(row => row.code.trim().toLowerCase()))

    for (const row of csvRows) {
        const code = row.code.trim()
        const normalizedCode = code.toLowerCase()
        if (seenCodes.has(normalizedCode)) {
          skippedCount++
          continue
        }
        seenCodes.add(normalizedCode)

        const existingStudent = store.users.find(user =>
          user.role === 'student' &&
          (user.code.toLowerCase() === normalizedCode || user.email.toLowerCase().startsWith(`${normalizedCode}@`))
        )

        const student = existingStudent || store.addUser({
          code,
          name: row.name.trim(),
          email: `${code.toLowerCase()}@lamduan.mfu.ac.th`,
          role: 'student',
          department: currentUser!.department || 'School of Applied Digital Technology (ADT)',
          isActive: true,
          hasAiAccess: false,
        })

        if (existingStudent && existingStudent.name !== row.name.trim()) {
          store.updateUser(existingStudent.id, { name: row.name.trim() })
        }
        if (existingStudent) existingCount++
        else addedCount++
        store.updateRosterEntry(student.id, currentUser!.id)
    }

    let removedCount = 0
    if (csvImportMode === 'replace') {
      for (const assignment of myAdvisees) {
        const student = store.users.find(user => user.id === assignment.studentId)
        const studentCode = student?.code?.toLowerCase()
        if (studentCode && !importedCodes.has(studentCode)) {
          store.deactivateRosterEntry(assignment.studentId, assignment.advisorId)
          removedCount++
        }
      }
    }

    setShowImportCsv(false)
    setCsvText('')
    setCsvRows([])
    addToast(
      'success',
      t('นำเข้าและจับคู่นักศึกษาสำเร็จ', 'Students Imported and Assigned'),
      t(
        `${csvImportMode === 'replace' ? 'แทนที่รายชื่อแล้ว' : 'อัปเดต/เพิ่มแล้ว'} เพิ่มใหม่ ${addedCount} คน, มีอยู่แล้ว ${existingCount} คน, นำออก ${removedCount} คน, ข้ามรายการซ้ำ ${skippedCount} รายการ`,
        `${csvImportMode === 'replace' ? 'Roster replaced.' : 'Roster updated.'} ${addedCount} added, ${existingCount} already registered, ${removedCount} removed, ${skippedCount} duplicates skipped.`
      )
    )
    store.refreshBackend()
  }

  if (!currentUser) return null

  const myAdvisees = store.roster.filter(r => isAdvisorMatch(r.advisorId, currentUser, store.users) && r.isActive)
  const adviseeStudents = myAdvisees
    .map(assignment => store.users.find(student =>
      student.role === 'student' && (
        student.id === assignment.studentId ||
        student.code?.toUpperCase() === assignment.studentId?.toUpperCase() ||
        student.email?.toLowerCase() === assignment.studentId?.toLowerCase()
      )
    ))
    .filter((student): student is NonNullable<typeof student> => Boolean(student))
    .filter((student, index, students) => students.findIndex(item => item.id === student.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name))
  const myRequests = store.requests.filter(r => isAdvisorMatch(r.advisorId, currentUser, store.users))
  const pendingRequests = myRequests.filter(r => r.status === 'requested' || r.status === 'pending')
  const confirmedApts = store.appointments
    .filter(a =>
      isAdvisorMatch(a.advisorId, currentUser, store.users) &&
      a.status === 'scheduled' &&
      a.studentConfirmed === true &&
      !a.studentDeclined &&
      store.requests.find(r => r.id === a.requestId)?.status !== 'cancelled'
    )
  const upcomingApts = confirmedApts
    .filter(a => (a.scheduledDate || '') >= getLocalDateString())
    .sort((a, b) => {
      const cmpDate = (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
      if (cmpDate !== 0) return cmpDate
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '')
    })

  const myFollowUps = store.followUps.filter(f => isAdvisorMatch(f.advisorId, currentUser, store.users) && f.status !== 'completed')
  const myExitCases = store.exitCases.filter(e => isAdvisorMatch(e.advisorId, currentUser, store.users) && e.status !== 'closed')
  const myWarnings = store.earlyWarnings.filter(w => isAdvisorMatch(w.advisorId, currentUser, store.users) && w.status !== 'resolved')
  const recentSessions = store.sessions.filter(s => isAdvisorMatch(s.advisorId, currentUser, store.users)).slice(0, 5)

  // List of all active students
  const allStudents = store.users.filter(u => u.role === 'student' && u.isActive)
  const filteredStudents = allStudents.filter(u => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return true
    return u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  function handleAddAdvisee() {
    if (!selectedStudentId) return
    const student = store.users.find(u => u.id === selectedStudentId)
    if (!student) return

    store.updateRosterEntry(selectedStudentId, currentUser!.id)
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'roster_updated',
      description: `Advisor added student ${student.name} (${student.code}) to their advisee cohort`,
      targetId: student.id,
    })

    addToast(
      'success',
      t('เพิ่มนักศึกษาในความดูแลสำเร็จ', 'Advisee Added Successfully'),
      t(`เพิ่ม ${student.name} (${student.code}) เข้าสู่บัญชีนักศึกษาในความดูแลแล้ว สามารถเข้าสู่ระบบได้ทันที`, `Added ${student.name} (${student.code}) to your advisee roster. Student can now log in immediately.`),
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
  }

  function handleRegisterAndAddAdvisee() {
    const raw = studentSearch.trim()
    if (!raw) return

    const code = raw.split('@')[0].toUpperCase()
    const email = raw.includes('@') ? raw.toLowerCase() : `${code.toLowerCase()}@lamduan.mfu.ac.th`
    const newStudentId = `STU_${Date.now().toString().slice(-6)}`

    const newStudent = {
      id: newStudentId,
      code,
      name: `Student ${code}`,
      email,
      role: 'student' as const,
      department: currentUser?.department || 'School of Applied Digital Technology (ADT)',
      isActive: true,
      createdAt: getLocalDateString(),
    }

    store.addUser(newStudent)
    store.updateRosterEntry(newStudentId, currentUser!.id)

    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'roster_updated',
      description: `Advisor registered and added new student ${code} to their advisee cohort`,
      targetId: newStudentId,
    })

    addToast(
      'success',
      t('ลงทะเบียนและเพิ่มนักศึกษาสำเร็จ', 'Student Registered & Added Successfully'),
      t(`ลงทะเบียน ${code} (${email}) เข้าสู่ระบบและความดูแลของคุณเรียบร้อยแล้ว นักศึกษาสามารถล็อกอินได้ทันที`, `Registered ${code} (${email}) and added to your cohort. The student can now log in immediately.`),
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
  }

  return (
    <div>
      {/* Advisor Cohort Banner (REG MFU Academic Portal Style) */}
      <AdvisorCohortBanner
        advisor={currentUser}
        adviseeCount={myAdvisees.length}
        school={currentUser.department ? (language === 'th' ? 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)' : 'School of Applied Digital Technology (ADT)') : undefined}
      />

      <PageHeader
        title={t('ระบบบริหารการให้คำปรึกษาทางวิชาการ', 'Advisor Academic Console')}
        description={t('ภาพรวมคำร้องขอเข้าพบ ตารางนัดหมาย และการติดตามผลนักศึกษาในความดูแล ภาคการศึกษา 1/2569', 'Overview of advising petitions, upcoming sessions, and advisee academic tracking for Semester 1/2026.')}
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/advisor/sessions')}>
              <CalendarClock className="h-4 w-4 mr-1.5" />
              {t('จัดการการให้คำปรึกษา', 'Manage Sessions')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <StatCard
          label={t('คำร้องรอการตอบรับ', 'Pending Requests')}
          value={pendingRequests.length}
          icon={<FileEdit className="h-5 w-5" />}
          color="amber"
          onClick={() => navigate('/advisor/sessions')}
        />
        <StatCard
          label={t('นัดหมายที่จัดไว้', 'Upcoming Sessions')}
          value={upcomingApts.length}
          icon={<CalendarClock className="h-5 w-5" />}
          color="sky"
          onClick={() => navigate('/advisor/sessions', { state: { tab: 'upcoming' } })}
        />
        <StatCard
          label={t('งานติดตามผลค้างอยู่', 'Open Follow-ups')}
          value={myFollowUps.length}
          icon={<ListChecks className="h-5 w-5" />}
          color="sky"
          onClick={() => navigate('/advisor/followups')}
        />
        <StatCard
          label={t('เคสขอลาพัก/ลาออก', 'Active Exit Cases')}
          value={myExitCases.length}
          icon={<UserX className="h-5 w-5" />}
          color="red"
          onClick={() => navigate('/advisor/exit-cases')}
        />
        <StatCard
          label={t('เคสเตือนภัยวิชาการ', 'Early Warnings')}
          value={myWarnings.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="amber"
          onClick={() => navigate('/advisor/warnings')}
        />
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t('บัญชีคู่ที่ปรึกษาทางวิชาการ', 'Student-Advisor Roster')}
          </h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={store.refreshBackend}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {t('รีเฟรช', 'Refresh')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowAddAdvisee(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              {t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowImportCsv(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t('นำเข้าไฟล์ CSV', 'Import CSV')}
            </Button>
          </div>
        </div>

        {adviseeStudents.length > 0 ? (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/60">
            <div>
              <p className="text-2xl font-extrabold text-sky-700 dark:text-sky-300">{adviseeStudents.length}</p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t('นักศึกษาในความดูแลทั้งหมด', 'Total Assigned Advisees')}
              </p>
            </div>
            <Button onClick={() => setShowAdviseeList(true)}>
              <Users className="h-4 w-4 mr-1.5" />
              {t('ดูรายชื่อนักศึกษา', 'View Advisee List')} ({adviseeStudents.length})
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400" />}
            title={t('ยังไม่มีนักศึกษาในความดูแล', 'No assigned advisees')}
            description={t('เพิ่มนักศึกษาเพื่อเริ่มติดตามและให้คำปรึกษา', 'Add students to start managing their advising activities.')}
            action={<Button size="sm" onClick={() => setShowAddAdvisee(true)}>{t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}</Button>}
          />
        )}
      </Card>

      <Modal
        isOpen={showAdviseeList}
        onClose={() => setShowAdviseeList(false)}
        title={t(`นักศึกษาในความดูแล (${adviseeStudents.length} คน)`, `Assigned Advisees (${adviseeStudents.length})`)}
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {adviseeStudents.map(student => (
            <div key={student.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{student.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{student.code}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[48%]">{student.email}</p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showImportCsv}
        onClose={() => setShowImportCsv(false)}
        title={t('นำเข้านักศึกษาจาก CSV', 'Import Students from CSV')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ไฟล์ต้องมีคอลัมน์รหัสนักศึกษาและชื่อ เช่น รหัสนักศึกษา,ชื่อ หรือ student_code,name', 'CSV must contain student ID and name columns, for example student_code,name.')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCsvImportMode('upsert')}
              className={`rounded-xl border p-3 text-left text-xs ${csvImportMode === 'upsert' ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">{t('อัปเดต / เพิ่มจากไฟล์', 'Update / Add from CSV')}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{t('เพิ่มรายการใหม่และอัปเดตชื่อ โดยไม่ลบคนเดิม', 'Add new students and update names without removing existing advisees.')}</p>
            </button>
            <button
              type="button"
              onClick={() => setCsvImportMode('replace')}
              className={`rounded-xl border p-3 text-left text-xs ${csvImportMode === 'replace' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">{t('แทนที่รายชื่อทั้งหมด', 'Replace Entire Roster')}</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{t('รายชื่อที่ไม่อยู่ในไฟล์จะถูกนำออกจากความดูแลของคุณ', 'Students missing from the CSV will be removed from your advisee roster.')}</p>
            </button>
          </div>
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Button size="sm" variant={csvRows.length === 0 ? 'primary' : 'secondary'} onClick={() => setCsvRows([])}>
              {t('1. นำเข้าข้อมูล', '1. Input Data')}
            </Button>
            <Button size="sm" variant={csvRows.length > 0 ? 'primary' : 'secondary'} disabled={csvRows.length === 0}>
              {t(`2. ตรวจสอบพรีวิว (${csvRows.length})`, `2. Preview (${csvRows.length})`)}
            </Button>
          </div>
          <textarea
            rows={5}
            value={csvText}
            onChange={event => previewStudentCsv(event.target.value)}
            placeholder={'รหัสนักศึกษา,ชื่อ\n6631503001,สมชาย ใจดี'}
            className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-sky-300 dark:border-sky-700 bg-sky-50/60 dark:bg-sky-950/20 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Upload className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('เลือกไฟล์ CSV จากเครื่อง', 'Choose a CSV file')}
              </span>
            </div>
            <input
              id="advisor-student-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsvFile}
              className="sr-only"
            />
            <label
              htmlFor="advisor-student-csv"
              className="inline-flex shrink-0 cursor-pointer items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
            >
              {t('เลือกไฟล์', 'Choose file')}
            </label>
          </div>
          {csvRows.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {csvRows.map((row, index) => (
                <div key={`${row.code}-${index}`} className="flex justify-between gap-3 px-3 py-2 text-xs border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">{row.code}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {csvImportMode === 'replace'
              ? t('โหมดแทนที่จะนำออกเฉพาะนักศึกษาที่อยู่ในความดูแลของคุณและไม่มีในไฟล์นี้', 'Replace mode removes only your current advisees that are missing from this file.')
              : t('นักศึกษาที่มีรหัสอยู่แล้วจะไม่สร้างซ้ำ ระบบจะอัปเดตชื่อและจับคู่กับคุณ', 'Existing student IDs are not duplicated; their name is updated and they are assigned to you.')}
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="secondary" onClick={() => setShowImportCsv(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button onClick={confirmStudentCsvImport} disabled={csvRows.length === 0}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {t(`ยืนยันการนำเข้า (${csvRows.length})`, `Confirm Import (${csvRows.length})`)}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Section Divider: Requests & Appointments ── */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-start">
          <span className="bg-slate-50 dark:bg-[#0b0f19] pr-3 text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileEdit className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            {t('รายการคำร้องและนัดหมายที่ต้องดำเนินการ', 'Pending Petitions & Action Items')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('คำร้องขอรับคำปรึกษาที่รอดำเนินการ', 'Pending Advising Requests')}
            </h3>
            {pendingRequests.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} ({pendingRequests.length}) <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {pendingRequests.length > 0 ? (
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map(r => {
                const student = store.users.find(u => u.id === r.studentId)
                const catLabel = getCategoryLabel(r.category)
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl cursor-pointer hover:bg-sky-50/40 dark:hover:bg-slate-800/80 hover:border-sky-200/60 dark:hover:border-sky-500/30 transition-all duration-150"
                    onClick={() => navigate('/advisor/sessions')}
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || r.studentId} <span className="font-mono text-slate-400 font-normal">({student?.code})</span></p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{catLabel} · <span className="text-slate-400 dark:text-slate-500">{t('วันที่สะดวก:', 'Pref:')} {r.preferredDate}</span></p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<FileEdit className="h-8 w-8 text-slate-400" />} title={t('ไม่มีคำร้องที่รอดำเนินการ', 'No pending requests')} description={t('คำร้องใหม่จากนักศึกษาจะแสดงที่นี่', 'New requests will appear here.')} />
          )}
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('นัดหมายที่กำลังจะมาถึง', 'Upcoming Appointments')}
            </h3>
            {upcomingApts.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions', { state: { tab: 'upcoming' } })} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} ({upcomingApts.length}) <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {upcomingApts.length > 0 ? (
            <div className="space-y-2">
              {upcomingApts.slice(0, 5).map(a => {
                const student = store.users.find(u => u.id === a.studentId)
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || a.studentId} <span className="font-mono text-slate-400 font-normal">({student?.code})</span></p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-sky-600 dark:text-sky-400" /> {a.scheduledDate} {a.scheduledTime} · {a.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => navigate('/advisor/log')}>
                        {t('บันทึกผล', 'Record Log')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<CalendarClock className="h-8 w-8 text-slate-400" />} title={t('ไม่มีนัดหมายเร็วๆ นี้', 'No upcoming appointments')} description={t('นัดหมายที่กำหนดแล้วจะแสดงที่นี่', 'Scheduled sessions will appear here.')} />
          )}
        </Card>

        {/* Open Follow-ups */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('งานติดตามผลที่ค้างอยู่', 'Open Follow-up Tasks')}
            </h3>
            {myFollowUps.length > 0 && (
              <button onClick={() => navigate('/advisor/followups')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} ({myFollowUps.length}) <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {myFollowUps.length > 0 ? (
            <div className="space-y-2">
              {myFollowUps.slice(0, 5).map(f => {
                const student = store.users.find(u => u.id === f.studentId)
                return (
                  <div key={f.id} className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{f.task}</p>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('นักศึกษา:', 'Student:')} {student?.name || f.studentId} · <span className="font-semibold text-slate-600 dark:text-slate-300">{t('กำหนด:', 'Due:')} {f.dueDate}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<ListChecks className="h-8 w-8 text-slate-400" />} title={t('ไม่มีงานติดตามผลที่ค้างอยู่', 'No open follow-up tasks')} description={t('งานติดตามผลทั้งหมดเสร็จสมบูรณ์แล้ว', 'All tasks are completed.')} />
          )}
        </Card>

        {/* Recent Session Logs */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> {t('ประวัติการให้คำปรึกษาล่าสุด', 'Recent Session Logs')}
            </h3>
            {recentSessions.length > 0 && (
              <button onClick={() => navigate('/advisor/sessions')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer">
                {t('ดูทั้งหมด', 'View all')} ({recentSessions.length}) <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {recentSessions.length > 0 ? (
            <div className="space-y-2">
              {recentSessions.slice(0, 5).map(s => {
                const student = store.users.find(u => u.id === s.studentId)
                return (
                  <div key={s.id} className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{student?.name || s.studentId}</p>
                      <span className="text-[11px] text-slate-400 font-medium">{s.sessionDate}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">{s.summary}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={<Clock className="h-8 w-8 text-slate-400" />} title={t('ยังไม่มีบันทึกการให้คำปรึกษา', 'No session logs yet')} description={t('บันทึกการให้คำปรึกษาจะแสดงที่นี่', 'Session records will appear here.')} />
          )}
        </Card>
      </div>

      {/* Add Advisee Modal */}
      <Modal
        isOpen={showAddAdvisee}
        onClose={() => { setShowAddAdvisee(false); setSelectedStudentId(''); setStudentSearch('') }}
        title={t('เพิ่มนักศึกษาในความดูแล (Add Advisee)', 'Add Student to My Advisee Cohort')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('ค้นหาและเลือกนักศึกษาเพื่อเพิ่มเข้าสู่รายชื่อในความดูแลของคุณ', 'Search and select a student to add them directly to your active advisee roster.')}
          </p>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('ค้นหาด้วยรหัสนักศึกษา หรือชื่อ-นามสกุล...', 'Search by student ID or name...')}
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Student Selection List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/50 dark:bg-slate-900/50">
            {filteredStudents.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-2.5">
                <p className="text-xs text-slate-400">{t('ไม่พบข้อมูลนักศึกษาในระบบ', 'No matching student found in master list')}</p>
                {studentSearch.trim() && (
                  <button
                    type="button"
                    onClick={handleRegisterAndAddAdvisee}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{t(`ลงทะเบียน & เพิ่ม "${studentSearch.trim()}" เข้าสู่ความดูแลทันที`, `Register & Add "${studentSearch.trim()}" as Advisee`)}</span>
                  </button>
                )}
              </div>
            ) : (
              filteredStudents.map(student => {
                const isCurrentAdvisee = myAdvisees.some(r => r.studentId === student.id)
                const isSelected = selectedStudentId === student.id
                return (
                  <div
                    key={student.id}
                    onClick={() => !isCurrentAdvisee && setSelectedStudentId(student.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isCurrentAdvisee
                        ? 'opacity-60 bg-slate-100 dark:bg-slate-800/30 cursor-not-allowed'
                        : isSelected
                        ? 'bg-sky-100/80 dark:bg-sky-950/80 border border-sky-400 dark:border-sky-700 font-bold text-sky-900 dark:text-sky-200'
                        : 'hover:bg-white dark:hover:bg-slate-800 bg-white/60 dark:bg-slate-800/40 border border-transparent text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{student.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{student.code} · {student.email}</span>
                    </div>
                    {isCurrentAdvisee ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                        {t('อยู่ในความดูแลแล้ว', 'Already Advisee')}
                      </span>
                    ) : isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowAddAdvisee(false); setSelectedStudentId(''); setStudentSearch('') }}
            >
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!selectedStudentId}
              onClick={handleAddAdvisee}
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              {t('ยืนยันเพิ่มนักศึกษา', 'Confirm Add Advisee')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
