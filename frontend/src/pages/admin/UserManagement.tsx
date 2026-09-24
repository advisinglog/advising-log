import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/data/mock-store'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, DataTable, StatusBadge, Button, SearchInput, Modal, UserAvatar } from '@/components/ui'
import type { User, UserRole } from '@/types'
import { ChevronDown, Bot, ExternalLink, UserPlus, ShieldCheck, User as UserIcon, Users, Info, Trash2, AlertTriangle } from 'lucide-react'
import { getLocalDateString } from '@/utils/dateUtils'

export default function UserManagement() {
  const store = useStore()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  // Delete User State
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Add User Modal State (Single & Bulk)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('advisor')
  const [newDept, setNewDept] = useState('School of Applied Digital Technology (ADT)')
  const [bulkDept, setBulkDept] = useState('School of Applied Digital Technology (ADT)')
  const [bulkText, setBulkText] = useState('')
  const [bulkDefaultStaffRole, setBulkDefaultStaffRole] = useState<UserRole>('advisor')
  const [bulkRoleOverrides, setBulkRoleOverrides] = useState<Record<string, UserRole>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper to derive readable name directly from email
  function deriveNameFromEmail(email: string): string {
    const prefix = email.trim().split('@')[0] || ''
    if (!prefix) return ''
    if (/^\d/.test(prefix)) {
      const digitMatch = prefix.match(/^\d+/)
      return digitMatch ? `Student ${digitMatch[0]}` : `Student ${prefix}`
    }
    const words = prefix
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    return words.length > 0 ? words.join(' ') : prefix
  }

  // Helper to derive code automatically without manual user input
  function deriveCode(role: UserRole, email: string): string {
    const emailPrefix = email.trim().split('@')[0]
    if (role === 'student' || /^\d/.test(emailPrefix) || email.includes('@student.') || email.includes('@lamduan.')) {
      const digitMatch = emailPrefix.match(/^\d+/)
      return digitMatch ? digitMatch[0] : emailPrefix
    }
    if (role === 'advisor') {
      const numbers = store.users
        .map(u => {
          const match = u.code.match(/^ADV(\d+)$/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => n > 0)
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
      return `ADV${String(maxNum + 1).padStart(3, '0')}`
    }
    if (role === 'qa_chair') {
      const numbers = store.users
        .map(u => {
          const match = u.code.match(/^QA(\d+)$/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => n > 0)
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
      return `QA${String(maxNum + 1).padStart(3, '0')}`
    }
    if (role === 'admin') {
      const numbers = store.users
        .map(u => {
          const match = u.code.match(/^ADM(\d+)$/i)
          return match ? parseInt(match[1], 10) : 0
        })
        .filter(n => n > 0)
      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
      return `ADM${String(maxNum + 1).padStart(3, '0')}`
    }
    return emailPrefix ? emailPrefix.toUpperCase() : `USR_${Date.now().toString().slice(-4)}`
  }

  // Auto-detect Student vs Non-Student from email format
  const emailPrefix = newEmail.trim().split('@')[0]
  const isStudentDetected =
    /^\d/.test(emailPrefix) ||
    newEmail.includes('@student.') ||
    newEmail.includes('@lamduan.')

  const isNonStudentDetected = Boolean(newEmail.trim()) && !isStudentDetected
  const effectiveRole: UserRole = isNonStudentDetected ? newRole : 'student'
  const derivedSingleName = deriveNameFromEmail(newEmail)

  // Parse bulk text into valid user objects with live preview
  const parsedBulkUsers = (() => {
    if (!bulkText.trim()) return []
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean)
    const existingEmails = new Set(store.users.map(u => u.email.toLowerCase()))

    return lines.map((line, idx) => {
      // Split by comma or tab: email, [name], [role], [department]
      const parts = line.split(/[,\t]/).map(p => p.trim())
      const email = parts[0] || ''
      const prefix = email.split('@')[0] || `user_${idx + 1}`
      const isStu = /^\d/.test(prefix) || email.includes('@student.') || email.includes('@lamduan.')

      const overrideRole = bulkRoleOverrides[email.toLowerCase()]
      let role: UserRole = isStu ? 'student' : (overrideRole || bulkDefaultStaffRole)
      let name = parts[1] || deriveNameFromEmail(email) || (isStu ? `Student ${prefix}` : prefix)
      let department = parts[3] || bulkDept

      if (!isStu && !overrideRole && parts[2]) {
        const r = parts[2].toLowerCase()
        if (r.includes('admin')) role = 'admin'
        else if (r.includes('qa') || r.includes('chair')) role = 'qa_chair'
        else if (r.includes('advisor') || r.includes('faculty')) role = 'advisor'
        else department = parts[2]
      }

      // If user typed department in parts[2] without role
      if (!isStu && !['admin', 'qa_chair', 'advisor'].includes(role) && parts[2]) {
        department = parts[2]
      }

      const code = deriveCode(role, email)
      const isDuplicate = existingEmails.has(email.toLowerCase())

      return {
        email,
        name,
        role,
        isStu,
        code,
        department: department || bulkDept || 'School of Applied Digital Technology (ADT)',
        isDuplicate,
      }
    }).filter(u => u.email.includes('@'))
  })()

  function openAddModal() {
    setAddMode('single')
    setNewEmail('')
    setNewRole('advisor')
    setNewDept('School of Applied Digital Technology (ADT)')
    setBulkDept('School of Applied Digital Technology (ADT)')
    setBulkText('')
    setBulkDefaultStaffRole('advisor')
    setBulkRoleOverrides({})
    setShowAddModal(true)
  }

  async function handleAddSingleUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) {
      addToast('error', t('กรุณากรอกอีเมลมหาวิทยาลัย', 'Please enter institutional email'))
      return
    }

    const email = newEmail.trim().toLowerCase()
    const exists = store.users.some(u => u.email.toLowerCase() === email)
    if (exists) {
      addToast('warning', t('อีเมลนี้ได้รับการลงทะเบียนในระบบแล้ว', 'This email is already registered in the system'))
      return
    }

    const autoCode = deriveCode(effectiveRole, email)
    const finalName = derivedSingleName || emailPrefix
    const generatedId = `${effectiveRole.toUpperCase().slice(0, 3)}_${Date.now().toString().slice(-6)}`

    const newUser: User = {
      id: generatedId,
      code: autoCode,
      name: finalName,
      email,
      role: effectiveRole,
      department: newDept || 'School of Applied Digital Technology (ADT)',
      isActive: true,
      hasAiAccess: effectiveRole !== 'student',
      createdAt: getLocalDateString(),
    }

    setIsSubmitting(true)
    try {
      store.addUser(newUser)
      addToast(
        'success',
        t('ลงทะเบียนผู้ใช้สำเร็จ', 'User Registered Successfully'),
        t(`ลงทะเบียน ${email} (${effectiveRole}) เรียบร้อยแล้ว`, `User email ${email} (${effectiveRole}) registered`)
      )
      setShowAddModal(false)
      setNewEmail('')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleBulkSubmit() {
    const validUsers = parsedBulkUsers.filter(u => !u.isDuplicate)
    if (validUsers.length === 0) {
      addToast('warning', t('ไม่มีรายชื่อใหม่ที่จะนำเข้า', 'No new users to import'))
      return
    }

    setIsSubmitting(true)
    try {
      const usersToInsert = validUsers.map(u => ({
        code: u.code,
        name: u.name,
        email: u.email.toLowerCase(),
        role: u.role,
        department: u.department,
        isActive: true,
        hasAiAccess: u.role !== 'student',
      }))

      await store.bulkAddUsers(usersToInsert)
      addToast(
        'success',
        t('นำเข้าผู้ใช้งานสำเร็จ', 'Bulk Import Successful'),
        t(`ลงทะเบียนผู้ใช้งานใหม่จำนวน ${validUsers.length} คน เรียบร้อยแล้ว`, `Successfully registered ${validUsers.length} new users into the system.`)
      )
      setShowAddModal(false)
      setBulkText('')
    } catch (err: any) {
      addToast('error', t('เกิดข้อผิดพลาดในการนำเข้า', 'Import Failed'), err.message || 'Error importing users')
    } finally {
      setIsSubmitting(false)
    }
  }

  const roleOptions: { value: UserRole | 'all'; labelTh: string; labelEn: string }[] = [
    { value: 'all', labelTh: 'ทุกบทบาท (All Roles)', labelEn: 'All Roles' },
    { value: 'student', labelTh: 'นักศึกษา (Student)', labelEn: 'Student' },
    { value: 'advisor', labelTh: 'อาจารย์ที่ปรึกษา (Advisor)', labelEn: 'Advisor' },
    { value: 'qa_chair', labelTh: 'ประกันคุณภาพ/ประธาน (QA)', labelEn: 'QA Chair' },
    { value: 'admin', labelTh: 'ผู้ดูแลระบบ (Admin)', labelEn: 'Admin' },
  ]

  const users = store.users.filter(u => {
    // Apply role filter
    if (roleFilter !== 'all' && u.role !== roleFilter) return false

    // Apply search filter
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    return (
      u.name.toLowerCase().includes(s) ||
      u.code.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    )
  })

  const columns = [
    {
      key: 'name',
      header: t('ชื่อ-นามสกุล', 'Full Name'),
      render: (u: User) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: t('รหัสนักศึกษา', 'Student ID'),
      render: (u: User) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-medium">
          {u.role === 'student' ? u.code : '—'}
        </span>
      ),
    },
    {
      key: 'role',
      header: t('บทบาทในระบบ', 'System Role'),
      render: (u: User) => {
        const roleLabels: Record<string, { th: string; en: string }> = {
          student: { th: 'นักศึกษา', en: 'Student' },
          advisor: { th: 'อาจารย์ที่ปรึกษา', en: 'Faculty Advisor' },
          qa_chair: { th: 'ประกันคุณภาพ/ประธานหลักสูตร', en: 'QA / Program Chair' },
          admin: { th: 'ผู้ดูแลระบบ', en: 'Admin' },
        }
        const r = roleLabels[u.role] || { th: u.role, en: u.role }
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            {t(r.th, r.en)}
          </span>
        )
      },
    },
    {
      key: 'dept',
      header: t('สำนักวิชา / ส่วนงาน', 'Department'),
      render: (u: User) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">{u.department || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: t('สถานะบัญชี', 'Account Status'),
      render: (u: User) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: t('การจัดการ', 'Actions'),
      render: (u: User) => {
        const superAdminEmail = ((import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || 'se.advisinglog@gmail.com').toLowerCase().trim()
        const isSuperAdmin = u.email?.toLowerCase().trim() === superAdminEmail || u.code === 'ADM-SUPER' || u.id === 'ADM_SE_GOOGLE'
        if (isSuperAdmin) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
              {t('คุ้มครองระดับระบบ', 'Root Protected')}
            </span>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant={u.isActive ? 'secondary' : 'primary'}
              onClick={() => {
                store.updateUser(u.id, { isActive: !u.isActive })
                addToast(
                  'info',
                  u.isActive ? t('ระงับการใช้งานบัญชี', 'Account Deactivated') : t('เปิดใช้งานบัญชี', 'Account Activated'),
                  t(`บัญชีของ ${u.name} (${u.code}) ถูก${u.isActive ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}แล้ว`, `User account for ${u.name} has been ${u.isActive ? 'deactivated' : 'activated'}.`)
                )
              }}
            >
              {u.isActive ? t('ปิดการใช้งาน', 'Deactivate') : t('เปิดใช้งาน', 'Activate')}
            </Button>
            <button
              type="button"
              onClick={() => setUserToDelete(u)}
              title={t('ลบบัญชีผู้ใช้ถาวร', 'Delete Account Permanently')}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('การจัดการผู้ใช้งาน', 'User Management')}
        description={t(
          'ตรวจสอบและจัดการบัญชีผู้ใช้งาน นักศึกษาและคณาจารย์ กำหนดบทบาทในระบบ และสถานะบัญชีการใช้งาน',
          'Manage student and faculty accounts, system roles, and account status.'
        )}
        actions={
          <Button onClick={openAddModal}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {t('เพิ่มผู้ใช้ / ลงทะเบียนอีเมล', 'Add User / Register Email')}
          </Button>
        }
      />

      {/* Quick Link to Dedicated AI Governance */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/40 to-white dark:from-[#0b101b] dark:via-[#0f172a] dark:to-[#0e1424] border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {t('ศูนย์ควบคุมระบบ AI และการกำหนดสิทธิ์ (AI Governance Hub)', 'AI & LLM Governance Console')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'สำหรับการเปิด/ปิดสิทธิ์ AI รายบุคคลของอาจารย์และ QA รวมทั้งตั้งค่า API Key ส่วนกลาง กรุณาใช้หน้าจัดการ AI โดยเฉพาะ',
                'To manage individual AI permissions for faculty/QA and configure central API keys, visit the dedicated AI Governance console.'
              )}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('/admin/ai-governance')}
          className="text-xs px-3 py-1.5 self-start sm:self-auto flex items-center gap-1.5 font-bold cursor-pointer"
        >
          <span>{t('ไปที่หน้าจัดการระบบ AI', 'Go to AI Governance')}</span>
          <ExternalLink className="h-3 w-3 text-sky-500" />
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="max-w-sm flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('ค้นหาตามชื่อ, รหัส หรืออีเมล...', 'Search by name, ID, or email...')}
          />
        </div>

        {/* Role Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <span>
              {t(
                roleOptions.find(r => r.value === roleFilter)?.labelTh || 'All Roles',
                roleOptions.find(r => r.value === roleFilter)?.labelEn || 'All Roles'
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {showRoleDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRoleDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800">
                {roleOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setRoleFilter(option.value as UserRole | 'all')
                      setShowRoleDropdown(false)
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors cursor-pointer ${
                      roleFilter === option.value
                        ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t(option.labelTh, option.labelEn)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        emptyMessage={t('ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไข', 'No users match the search and filter criteria.')}
      />

      {/* Add User / Pre-register Email Modal (Single & Bulk Import) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('เพิ่มและลงทะเบียนผู้ใช้งานใหม่ (User Registration)', 'User & Institutional Account Registration')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/70 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setAddMode('single')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                addMode === 'single'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('ลงทะเบียนทีละคน (Single User)', 'Single User Registration')}</span>
            </button>
            <button
              type="button"
              onClick={() => setAddMode('bulk')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                addMode === 'bulk'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('นำเข้าหลายคนพร้อมกัน (Bulk Import)', 'Bulk Import / Paste Roster')}</span>
            </button>
          </div>

          {/* TAB 1: SINGLE USER FORM */}
          {addMode === 'single' && (
            <form onSubmit={handleAddSingleUser} className="space-y-4 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(
                  'ผู้ใช้งานที่มีอีเมลตรงกับที่ระบุในรายการนี้เท่านั้นจึงจะสามารถเข้าสู่ระบบผ่าน Google OAuth ได้ โดยระบบจะตรวจหารหัสนักศึกษาและกำหนดบทบาทให้อัตโนมัติ',
                  'Only registered institutional emails will be permitted to log in via Google SSO. Student roles are auto-detected.'
                )}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t('อีเมล (Google Email) *', 'Email Address *')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. 6631503099@lamduan.mfu.ac.th or advisor@mfu.ac.th"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {isNonStudentDetected ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      {t('บทบาทในระบบ *', 'System Role *')}
                    </label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="advisor">{t('อาจารย์ที่ปรึกษา (Advisor)', 'Faculty Advisor')}</option>
                      <option value="qa_chair">{t('ประกันคุณภาพ/ประธานหลักสูตร (QA Chair)', 'QA Chair / Program Chair')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      {t('สำนักวิชา / ส่วนงาน', 'Department')}
                    </label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={e => setNewDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    {t('สำนักวิชา / ส่วนงาน', 'Department')}
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={e => setNewDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Dynamic Auto-Derived Info Preview */}
              {newEmail.includes('@') && (
                <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{t('รหัสประจำตัว (Code):', 'User Code:')}</span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                      {deriveCode(effectiveRole, newEmail)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="font-semibold">{t('ชื่อที่สร้างเบื้องต้น:', 'Initial Display Name:')}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {derivedSingleName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-sky-100 dark:border-sky-900/40 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
                    <span>
                      {t(
                        'ชื่อจริงและรูปโปรไฟล์จะอัปเดตตรงตาม Google Account โดยอัตโนมัติเมื่อผู้ใช้ล็อกอินครั้งแรก',
                        'Official name & picture will automatically sync with Google Account upon first login.'
                      )}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('ยกเลิก', 'Cancel')}
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {isSubmitting ? t('กำลังบันทึก...', 'Saving...') : t('ลงทะเบียนผู้ใช้', 'Register User')}
                </Button>
              </div>
            </form>
          )}

          {/* TAB 2: BULK IMPORT / ROSTER PASTE */}
          {addMode === 'bulk' && (
            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    {t('วางรายชื่ออีเมล (เพียงแค่วางอีเมล 1 บรรทัดต่อ 1 คน หรือรูปแบบ CSV) *', 'Paste Emails (1 email per line or CSV) *')}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {t('สร้างชื่อ, รหัส และบทบาทให้อัตโนมัติจากอีเมล', 'Name, code & role auto-derived from email')}
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={`6631501001@lamduan.mfu.ac.th\n6631501002@lamduan.mfu.ac.th\nprasit.k@mfu.ac.th\nsomchai.jaidee@mfu.ac.th\nchair.qa@mfu.ac.th, qa_chair`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Bulk Default Department Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {t('สำนักวิชา / ส่วนงาน (Department)', 'Department')}
                </label>
                <input
                  type="text"
                  value={bulkDept}
                  onChange={e => setBulkDept(e.target.value)}
                  placeholder="School of Applied Digital Technology (ADT)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Live Parsed Preview Table */}
              {parsedBulkUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {t('ตรวจสอบข้อมูลก่อนนำเข้า (Live Preview)', 'Live Preview')}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {parsedBulkUsers.filter(u => !u.isDuplicate).length} {t('คนพร้อมนำเข้า', 'users ready')}
                    </span>
                  </div>

                  {/* Batch Role Selector for Non-Students */}
                  {parsedBulkUsers.some(u => !u.isStu) && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        {t('บทบาทเริ่มต้นสำหรับอาจารย์/บุคลากร:', 'Default Role for Staff/Faculty:')}
                      </span>
                      <select
                        value={bulkDefaultStaffRole}
                        onChange={e => {
                          const newDef = e.target.value as UserRole
                          setBulkDefaultStaffRole(newDef)
                          setBulkRoleOverrides({})
                        }}
                        className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="advisor">{t('อาจารย์ที่ปรึกษา (Advisor)', 'Faculty Advisor')}</option>
                        <option value="qa_chair">{t('ประกันคุณภาพ/ประธานหลักสูตร (QA Chair)', 'QA Chair / Program Chair')}</option>
                      </select>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 divide-y divide-slate-200/60 dark:divide-slate-800">
                    {parsedBulkUsers.map((u, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {u.name} <span className="font-mono text-slate-400 font-normal">({u.email})</span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {u.department} <span className="font-mono text-slate-400">• Code: {u.code}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {u.isStu ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                              Student
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={e => {
                                const val = e.target.value as UserRole
                                setBulkRoleOverrides(prev => ({
                                  ...prev,
                                  [u.email.toLowerCase()]: val,
                                }))
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                u.role === 'qa_chair'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              }`}
                            >
                              <option value="advisor">Advisor</option>
                              <option value="qa_chair">QA Chair</option>
                            </select>
                          )}
                          {u.isDuplicate && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              {t('มีในระบบแล้ว', 'Duplicate')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('ยกเลิก', 'Cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || parsedBulkUsers.filter(u => !u.isDuplicate).length === 0}
                  className="font-bold"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  {isSubmitting
                    ? t('กำลังนำเข้า...', 'Importing...')
                    : `${t('นำเข้าผู้ใช้งานทั้งหมด', 'Register All')} (${parsedBulkUsers.filter(u => !u.isDuplicate).length})`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={Boolean(userToDelete)}
        onClose={() => !isDeleting && setUserToDelete(null)}
        title={t('ยืนยันการลบบัญชีผู้ใช้ถาวร', 'Confirm Permanent Account Deletion')}
        size="md"
      >
        {userToDelete && (
          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {t('การดำเนินการนี้ไม่สามารถย้อนกลับได้', 'This action cannot be undone.')}
                </p>
                <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                  {t(
                    'ข้อมูลบัญชีผู้ใช้และการจับคู่อาจารย์ที่ปรึกษาที่เกี่ยวข้องจะถูกลบออกจากฐานข้อมูลอย่างถาวร',
                    'The user account and associated advisor-student roster pairings will be permanently deleted from the database.'
                  )}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('ชื่อ-นามสกุล', 'Name')}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('อีเมล', 'Email')}:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('รหัสประจำตัว / บทบาท', 'Code / Role')}:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{userToDelete.code} ({userToDelete.role})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                {t('ยกเลิก', 'Cancel')}
              </Button>
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={async () => {
                  if (!userToDelete) return
                  setIsDeleting(true)
                  try {
                    const res = await store.deleteUser(userToDelete.id)
                    if (res && res.success === false) {
                      addToast('error', t('ไม่สามารถลบบัญชีได้', 'Failed to delete user'), res.error)
                    } else {
                      addToast(
                        'success',
                        t('ลบบัญชีผู้ใช้สำเร็จ', 'Account Deleted Successfully'),
                        t(`ลบบัญชี ${userToDelete.name} (${userToDelete.email}) ออกจากระบบแล้ว`, `User ${userToDelete.name} has been removed.`)
                      )
                      setUserToDelete(null)
                    }
                  } catch (err: any) {
                    addToast('error', t('เกิดข้อผิดพลาด', 'Error'), err.message || 'Deletion failed')
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {isDeleting ? t('กำลังลบ...', 'Deleting...') : t('ยืนยันลบบัญชีถาวร', 'Delete Account')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
