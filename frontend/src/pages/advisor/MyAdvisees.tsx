// ============================================================
// AdvisingLog — My Advisees (Advisor Student Cohort Management)
// ============================================================

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStore } from '@/data/store'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  PageHeader,
  AdvisorCohortBanner,
  Card,
  StatCard,
  Button,
  SearchInput,
  Modal,
  EmptyState,
  ConfirmDialog,
} from '@/components/ui'
import {
  Users,
  UserPlus,
  Upload,
  RefreshCw,
  ClipboardList,
  CalendarClock,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Trash2,
  Eye,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react'
import { isAdvisorMatch } from '@/utils/advisorUtils'
import { getLocalDateString } from '@/utils/dateUtils'
import type { User } from '@/types'

export default function MyAdvisees() {
  const { currentUser } = useAuth()
  const store = useStore()
  const { addToast } = useToast()
  const { t, language, getCategoryLabel } = useLanguage()
  const navigate = useNavigate()

  // Search & Filter
  const [search, setSearch] = useState('')

  // Add Advisee Modal State
  const [showAddAdvisee, setShowAddAdvisee] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')

  // Import CSV Modal State
  const [showImportCsv, setShowImportCsv] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvRows, setCsvRows] = useState<Array<{ name: string; code: string }>>([])
  const [csvImportMode, setCsvImportMode] = useState<'upsert' | 'replace'>('upsert')

  // History & Detail Modal State
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<User | null>(null)

  // Remove Advisee State
  const [studentToRemove, setStudentToRemove] = useState<User | null>(null)

  if (!currentUser) return null

  // 1. Get Advisees assigned to this advisor
  const myAdvisees = store.roster.filter(
    r => isAdvisorMatch(r.advisorId, currentUser, store.users) && r.isActive
  )

  const adviseeStudents: User[] = myAdvisees
    .map(assignment =>
      store.users.find(
        student =>
          student.role === 'student' &&
          (student.id === assignment.studentId ||
            student.code?.toUpperCase() === assignment.studentId?.toUpperCase() ||
            student.email?.toLowerCase() === assignment.studentId?.toLowerCase())
      )
    )
    .filter((student): student is User => Boolean(student))
    .filter((student, index, students) => students.findIndex(item => item.id === student.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name))

  // 2. Filter advisees based on search query
  const filteredAdvisees = adviseeStudents.filter(student => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      student.name.toLowerCase().includes(q) ||
      student.code.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      (student.department && student.department.toLowerCase().includes(q))
    )
  })

  // 3. Advisee-related metrics
  const adviseeIds = new Set(adviseeStudents.map(s => s.id))

  const totalSessionsWithAdvisees = store.sessions.filter(
    s => isAdvisorMatch(s.advisorId, currentUser, store.users) && adviseeIds.has(s.studentId)
  ).length

  const pendingRequestsFromAdvisees = store.requests.filter(
    r =>
      isAdvisorMatch(r.advisorId, currentUser, store.users) &&
      adviseeIds.has(r.studentId) &&
      (r.status === 'requested' || r.status === 'pending')
  ).length

  const warningAdviseesCount = store.earlyWarnings.filter(
    w =>
      isAdvisorMatch(w.advisorId, currentUser, store.users) &&
      adviseeIds.has(w.studentId) &&
      w.status !== 'resolved'
  ).length

  // CSV parsing
  function parseStudentCsv(text: string): Array<{ name: string; code: string }> {
    const rows = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
    if (rows.length === 0) return []

    const firstRow = rows[0].split(/[,;\t]/).map(value => value.trim().toLowerCase())
    const nameHeaders = ['name', 'student_name', 'student name', 'ชื่อ', 'ชื่อ-นามสกุล']
    const codeHeaders = ['code', 'student_code', 'student code', 'student id', 'student_id', 'รหัสนักศึกษา']
    const nameIndex = firstRow.findIndex(value => nameHeaders.includes(value))
    const codeIndex = firstRow.findIndex(value => codeHeaders.includes(value))
    const hasHeader = nameIndex >= 0 || codeIndex >= 0
    const startIndex = hasHeader ? 1 : 0

    return rows
      .slice(startIndex)
      .map(row => {
        const values = row.split(/[,;\t]/).map(value => value.trim().replace(/^["']|["']$/g, ''))
        return {
          name: values[hasHeader && nameIndex >= 0 ? nameIndex : 1] || '',
          code: values[hasHeader && codeIndex >= 0 ? codeIndex : 0] || '',
        }
      })
      .filter(row => row.name && row.code)
  }

  function previewStudentCsv(text: string) {
    const rows = parseStudentCsv(text)
    setCsvText(text)
    setCsvRows(rows)
    if (rows.length === 0) {
      addToast(
        'error',
        t('ไฟล์ไม่ถูกต้อง', 'Invalid CSV'),
        t('ต้องมีคอลัมน์ชื่อและรหัสนักศึกษา', 'CSV must contain name and student ID columns.')
      )
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
    reader.onerror = () =>
      addToast(
        'error',
        t('อ่านไฟล์ไม่สำเร็จ', 'Unable to Read File'),
        t('กรุณาลองเลือกไฟล์ CSV ใหม่อีกครั้ง', 'Please select the CSV file again.')
      )
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

      const existingStudent = store.users.find(
        user =>
          user.role === 'student' &&
          (user.code.toLowerCase() === normalizedCode || user.email.toLowerCase().startsWith(`${normalizedCode}@`))
      )

      const student =
        existingStudent ||
        store.addUser({
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

  // Add Advisee logic
  const allStudents = store.users.filter(u => u.role === 'student' && u.isActive)
  const selectableStudents = allStudents.filter(u => {
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
      t(
        `เพิ่ม ${student.name} (${student.code}) เข้าสู่บัญชีนักศึกษาในความดูแลแล้ว`,
        `Added ${student.name} (${student.code}) to your advisee roster.`
      )
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
    store.refreshBackend()
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
      t(
        `ลงทะเบียน ${code} (${email}) เข้าสู่ระบบและความดูแลของคุณเรียบร้อยแล้ว`,
        `Registered ${code} (${email}) and added to your cohort.`
      )
    )

    setShowAddAdvisee(false)
    setSelectedStudentId('')
    setStudentSearch('')
    store.refreshBackend()
  }

  // Remove Advisee handler
  function handleRemoveAdvisee() {
    if (!studentToRemove) return
    store.deactivateRosterEntry(studentToRemove.id, currentUser!.id)
    store.addAuditLog({
      userId: currentUser!.id,
      userName: currentUser!.name,
      userRole: 'advisor',
      action: 'roster_updated',
      description: `Advisor removed student ${studentToRemove.name} (${studentToRemove.code}) from cohort`,
      targetId: studentToRemove.id,
    })
    addToast(
      'success',
      t('นำนักศึกษาออกจากความดูแลเรียบร้อย', 'Advisee Removed Successfully'),
      t(
        `นำ ${studentToRemove.name} (${studentToRemove.code}) ออกจากบัญชีความดูแลแล้ว`,
        `Removed ${studentToRemove.name} (${studentToRemove.code}) from your cohort.`
      )
    )
    setStudentToRemove(null)
    store.refreshBackend()
  }

  // History modal data for selected student
  const studentSessions = useMemo(() => {
    if (!selectedStudentHistory) return []
    return store.sessions
      .filter(s => s.studentId === selectedStudentHistory.id)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
  }, [selectedStudentHistory, store.sessions])

  const studentRequests = useMemo(() => {
    if (!selectedStudentHistory) return []
    return store.requests
      .filter(r => r.studentId === selectedStudentHistory.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [selectedStudentHistory, store.requests])

  return (
    <div className="space-y-6">
      {/* Advisor Cohort Banner */}
      <AdvisorCohortBanner
        advisor={currentUser}
        adviseeCount={adviseeStudents.length}
        school={
          currentUser.department
            ? language === 'th'
              ? 'สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ (ADT)'
              : 'School of Applied Digital Technology (ADT)'
            : undefined
        }
      />

      {/* Page Header */}
      <PageHeader
        title={t('นักศึกษาในความดูแล (My Advisees)', 'My Advisees')}
        description={t(
          'รายชื่อนักศึกษาในความดูแลทั้งหมด ตรวจสอบข้อมูลติดต่อ ประวัติการเข้าพบ และจัดการรายชื่อคู่ที่ปรึกษา',
          'Overview of all assigned advisees, contact information, advising history, and cohort management.'
        )}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={store.refreshBackend}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {t('รีเฟรช', 'Refresh')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowImportCsv(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {t('นำเข้าไฟล์ CSV', 'Import CSV')}
            </Button>
            <Button size="sm" onClick={() => setShowAddAdvisee(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              {t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}
            </Button>
          </div>
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('นักศึกษาในความดูแลทั้งหมด', 'Total Advisees')}
          value={adviseeStudents.length}
          icon={<Users className="h-5 w-5" />}
          color="sky"
        />
        <StatCard
          label={t('การให้คำปรึกษาที่ผ่านมา', 'Total Sessions Held')}
          value={totalSessionsWithAdvisees}
          icon={<ClipboardList className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          label={t('คำร้องรอการตอบรับ', 'Pending Petitions')}
          value={pendingRequestsFromAdvisees}
          icon={<Clock className="h-5 w-5" />}
          color="amber"
          onClick={() => navigate('/advisor/sessions')}
        />
        <StatCard
          label={t('เคสที่ต้องเฝ้าระวัง', 'Early Warning Alerts')}
          value={warningAdviseesCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={warningAdviseesCount > 0 ? 'red' : 'sky'}
          onClick={() => navigate('/advisor/warnings')}
        />
      </div>

      {/* Search and Advisees Table */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {t(`รายชื่อนักศึกษาในความดูแล (${filteredAdvisees.length} คน)`, `Assigned Advisee Roster (${filteredAdvisees.length})`)}
            </h3>
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('ค้นหารหัส, ชื่อ, อีเมล...', 'Search by code, name, email...')}
            />
          </div>
        </div>

        {filteredAdvisees.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200/70 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">{t('รหัสนักศึกษา', 'Student ID')}</th>
                  <th className="px-4 py-3.5">{t('ชื่อ-นามสกุล', 'Student Name')}</th>
                  <th className="px-4 py-3.5">{t('สำนักวิชา / สาขา', 'Department / School')}</th>
                  <th className="px-4 py-3.5">{t('ข้อมูลติดต่อ', 'Contact Info')}</th>
                  <th className="px-4 py-3.5 text-center">{t('ประวัติการพบ', 'Sessions')}</th>
                  <th className="px-4 py-3.5 text-right">{t('การจัดการ', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredAdvisees.map(student => {
                  const studentSessionsCount = store.sessions.filter(
                    s => s.studentId === student.id && isAdvisorMatch(s.advisorId, currentUser, store.users)
                  ).length
                  const lastSession = store.sessions
                    .filter(s => s.studentId === student.id && isAdvisorMatch(s.advisorId, currentUser, store.users))
                    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))[0]

                  return (
                    <tr
                      key={student.id}
                      className="bg-white dark:bg-slate-900 hover:bg-sky-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-semibold text-xs text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-100 dark:border-sky-800">
                          {student.code}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                          {student.name}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {student.department || '-'}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{student.email}</span>
                        </div>
                        {student.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{student.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Sessions Count & Last Date */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {studentSessionsCount} {t('ครั้ง', 'times')}
                        </span>
                        {lastSession && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {t('ล่าสุด', 'Last')}: {lastSession.sessionDate}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedStudentHistory(student)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden md:inline">{t('ประวัติ', 'History')}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/advisor/log', { state: { studentId: student.id } })}
                          >
                            <ClipboardList className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden md:inline">{t('บันทึก Log', 'Log')}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => setStudentToRemove(student)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400" />}
            title={
              search
                ? t('ไม่พบนักศึกษาที่ค้นหา', 'No Advisees Found')
                : t('ยังไม่มีนักศึกษาในความดูแล', 'No Assigned Advisees')
            }
            description={
              search
                ? t('ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง', 'Try adjusting your search criteria.')
                : t('เพิ่มนักศึกษาในความดูแล หรือนำเข้าผ่านไฟล์ CSV เพื่อเริ่มติดตามผล', 'Add students or import from CSV to begin advising management.')
            }
            action={
              !search ? (
                <Button size="sm" onClick={() => setShowAddAdvisee(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  {t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}
                </Button>
              ) : undefined
            }
          />
        )}
      </Card>

      {/* Modal: View Student Advising History */}
      <Modal
        isOpen={Boolean(selectedStudentHistory)}
        onClose={() => setSelectedStudentHistory(null)}
        title={
          selectedStudentHistory
            ? t(
                `ประวัติการให้คำปรึกษา: ${selectedStudentHistory.name} (${selectedStudentHistory.code})`,
                `Advising History: ${selectedStudentHistory.name} (${selectedStudentHistory.code})`
              )
            : ''
        }
        size="lg"
      >
        {selectedStudentHistory && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedStudentHistory.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {selectedStudentHistory.code} • {selectedStudentHistory.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedStudentHistory.department || '-'}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const sId = selectedStudentHistory.id
                  setSelectedStudentHistory(null)
                  navigate('/advisor/log', { state: { studentId: sId } })
                }}
              >
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                {t('บันทึกการเข้าพบใหม่', 'New Meeting Note')}
              </Button>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('บันทึกการให้คำปรึกษาที่ผ่านมา', 'Past Advising Session Logs')} ({studentSessions.length})
              </h4>
              {studentSessions.length > 0 ? (
                <div className="space-y-2.5 max-h-[40vh] overflow-y-auto">
                  {studentSessions.map(sess => (
                    <div
                      key={sess.id}
                      className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 text-sky-600" />
                          {sess.sessionDate}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {sess.outcome || 'Completed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                        {sess.summary}
                      </p>
                      {sess.advice && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {t('คำแนะนำ', 'Advice')}: {sess.advice}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  {t('ยังไม่มีบันทึกการเข้าพบสำหรับนักศึกษาท่านนี้', 'No session logs recorded for this student yet.')}
                </p>
              )}
            </div>

            {/* Past Petitions / Requests */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t('คำร้องขอรับคำปรึกษา', 'Advising Petitions')} ({studentRequests.length})
              </h4>
              {studentRequests.length > 0 ? (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {studentRequests.map(req => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {getCategoryLabel(req.category)}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{req.details}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center">
                  {t('ไม่มีคำร้องที่บันทึกไว้', 'No petitions on record.')}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add Advisee */}
      <Modal
        isOpen={showAddAdvisee}
        onClose={() => {
          setShowAddAdvisee(false)
          setSelectedStudentId('')
          setStudentSearch('')
        }}
        title={t('เพิ่มนักศึกษาในความดูแล', 'Add Advisee')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('ค้นหานักศึกษาในระบบ', 'Search Student in System')}
            </label>
            <input
              type="text"
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder={t('พิมพ์รหัส เช่น 6631503xxx หรือชื่อ...', 'Enter student ID or name...')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('เลือกนักศึกษาจากผลการค้นหา', 'Select Student')}
            </label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {selectableStudents.length > 0 ? (
                selectableStudents.map(student => {
                  const isAssigned = adviseeIds.has(student.id)
                  const isSelected = selectedStudentId === student.id
                  return (
                    <button
                      key={student.id}
                      type="button"
                      disabled={isAssigned}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200'
                          : isAssigned
                          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {student.code} • {student.email}
                        </p>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {t('อยู่ในความดูแลแล้ว', 'Already in cohort')}
                        </span>
                      ) : isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                      ) : null}
                    </button>
                  )
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  {t('ไม่พบข้อมูลนักศึกษาในระบบ', 'No student found.')}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
            {studentSearch.trim() && selectableStudents.length === 0 ? (
              <Button size="sm" variant="secondary" onClick={handleRegisterAndAddAdvisee}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                {t(`ลงทะเบียนรหัส ${studentSearch.trim()} และเพิ่มทันที`, `Register ${studentSearch.trim()} & Add`)}
              </Button>
            ) : <span />}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setShowAddAdvisee(false)
                  setSelectedStudentId('')
                  setStudentSearch('')
                }}
              >
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <Button size="sm" disabled={!selectedStudentId} onClick={handleAddAdvisee}>
                {t('เพิ่มเข้าความดูแล', 'Confirm Add')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Import CSV */}
      <Modal
        isOpen={showImportCsv}
        onClose={() => {
          setShowImportCsv(false)
          setCsvText('')
          setCsvRows([])
        }}
        title={t('นำเข้านักศึกษาจาก CSV', 'Import Students from CSV')}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              'ไฟล์ต้องมีคอลัมน์รหัสนักศึกษาและชื่อ เช่น รหัสนักศึกษา,ชื่อ หรือ student_code,name',
              'CSV must contain student ID and name columns, for example student_code,name.'
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCsvImportMode('upsert')}
              className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                csvImportMode === 'upsert'
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">{t('อัปเดต / เพิ่มเพิ่ม', 'Upsert / Append')}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('เพิ่มนักศึกษาใหม่โดยไม่ลบรายชื่อเดิมในบัญชี', 'Add or update without removing current advisees.')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setCsvImportMode('replace')}
              className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                csvImportMode === 'replace'
                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">{t('แทนที่ทั้งหมด', 'Replace All')}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('ปลดนักศึกษาที่ไม่มีในไฟล์ออกจากบัญชีความดูแลของคุณ', 'Unassign advisees not listed in this CSV file.')}
              </p>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('เลือกไฟล์ CSV', 'Choose CSV File')}
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsvFile}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('หรือวางข้อความ CSV โดยตรง', 'Or paste CSV text')}
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={e => previewStudentCsv(e.target.value)}
              placeholder="student_code,name&#10;6631503001,Somchai Jaidee&#10;6631503002,Ploy Srisuk"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {csvRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t(`ตัวอย่างข้อมูลที่จะนำเข้า (${csvRows.length} คน)`, `Preview (${csvRows.length} students)`)}
              </p>
              <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50 dark:bg-slate-800/40">
                {csvRows.slice(0, 10).map((r, i) => (
                  <div key={i} className="text-[11px] flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-mono">{r.code}</span>
                    <span className="font-semibold">{r.name}</span>
                  </div>
                ))}
                {csvRows.length > 10 && (
                  <p className="text-[10px] text-slate-400 text-center">
                    {t(`และอีก ${csvRows.length - 10} รายการ...`, `and ${csvRows.length - 10} more...`)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowImportCsv(false)
                setCsvText('')
                setCsvRows([])
              }}
            >
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button size="sm" disabled={csvRows.length === 0} onClick={confirmStudentCsvImport}>
              {t('ยืนยันการนำเข้า', 'Confirm Import')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Remove Dialog */}
      <ConfirmDialog
        isOpen={Boolean(studentToRemove)}
        onClose={() => setStudentToRemove(null)}
        onConfirm={handleRemoveAdvisee}
        title={t('ยืนยันการนำนักศึกษาออกจากความดูแล', 'Confirm Advisee Removal')}
        message={
          studentToRemove
            ? t(
                `คุณต้องการนำ ${studentToRemove.name} (${studentToRemove.code}) ออกจากบัญชีนักศึกษาในความดูแลของคุณใช่หรือไม่?`,
                `Are you sure you want to remove ${studentToRemove.name} (${studentToRemove.code}) from your advisee cohort?`
              )
            : ''
        }
        confirmLabel={t('นำออก', 'Remove')}
        cancelLabel={t('ยกเลิก', 'Cancel')}
        variant="danger"
      />
    </div>
  )
}
