import { useState } from 'react'
import {
  Bot,
  Power,
  ShieldCheck,
  KeyRound,
  Users,
  Search,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  ScrollText,
  Zap,
  Plus,
  Trash2,
  Star,
  Sparkles,
  CheckCircle2,
  UserCheck,
  UserX,
  Activity,
} from 'lucide-react'
import { PageHeader, Button, UserAvatar, Modal } from '@/components/ui'
import { useStore } from '@/data/mock-store'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalDateString } from '@/utils/dateUtils'
import api from '@/services/apiClient'
import type { User, AiApiKey } from '@/types'

export default function AiGovernance() {
  const store = useStore()
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const { t } = useLanguage()

  const [activeTab, setActiveTab] = useState<'overview' | 'personnel' | 'audit'>('overview')

  // Multi-Key Management Modal & State
  const [showAddKeyModal, setShowAddKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyIsDefault, setNewKeyIsDefault] = useState(false)
  const [showKeyPassword, setShowKeyPassword] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)
  const [keyLatencies, setKeyLatencies] = useState<Record<string, number>>({})

  // Personnel filter state (strictly faculty/staff - excluding students!)
  const [personnelSearch, setPersonnelSearch] = useState('')
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'all' | 'advisor' | 'qa_chair' | 'admin'>('all')
  const [personnelAiFilter, setPersonnelAiFilter] = useState<'all' | 'granted' | 'revoked'>('all')

  const isEnabled = store.systemApiConfig?.isAiApiEnabled !== false

  // Master Switch Handler
  const handleToggleMasterSwitch = () => {
    const nextState = !isEnabled
    store.toggleAiApi(nextState, currentUser?.name || 'Admin')
    addToast(
      nextState ? 'success' : 'warning',
      nextState
        ? t('เปิดใช้งานระบบ AI / LLM เรียบร้อย', 'AI / LLM API Enabled')
        : t('ปิดการใช้งานระบบ AI / LLM ทั้งหมดแล้ว', 'AI / LLM API Disabled'),
      nextState
        ? t('ระบบ AI พร้อมให้บริการสำหรับผู้ที่ได้รับสิทธิ์', 'AI system is now operational for authorized users.')
        : t('ระงับการเรียกโมเดลภาษาภายนอกทั้งหมดชั่วคราว', 'All outbound LLM requests are halted.')
    )
  }

  // Open Add Key Modal
  const handleOpenAddKeyModal = () => {
    setNewKeyName('')
    setNewKeyValue('')
    setNewKeyIsDefault(store.aiKeys.length === 0)
    setShowKeyPassword(false)
    setShowAddKeyModal(true)
  }

  // Add Key Submit
  const handleAddKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyValue.trim()) {
      addToast('error', t('กรุณาระบุ Gemini API Key', 'Please enter a Gemini API Key'))
      return
    }

    setIsSavingKey(true)
    try {
      const name = newKeyName.trim() || `Gemini Key ${getLocalDateString()}`
      await store.addAiKey(name, newKeyValue.trim(), newKeyIsDefault)
      addToast(
        'success',
        t('เพิ่มและบันทึก API Key สำเร็จ', 'API Key Added & Saved'),
        t(`บันทึกกุญแจ "${name}" ลงในฐานข้อมูล Cloudflare D1 เรียบร้อยแล้ว`, `Saved key "${name}" to Cloudflare D1 database.`)
      )
      setShowAddKeyModal(false)
      setNewKeyName('')
      setNewKeyValue('')
    } catch (err: any) {
      addToast('error', t('บันทึกล้มเหลว', 'Save Failed'), err.message || 'Error saving API key')
    } finally {
      setIsSavingKey(false)
    }
  }

  // Set Default Key
  const handleSetDefaultKey = async (key: AiApiKey) => {
    try {
      await store.setDefaultAiKey(key.id)
      addToast(
        'success',
        t('เปลี่ยนกุญแจหลักสำเร็จ', 'Default Key Updated'),
        t(`ตั้งค่า "${key.name}" เป็นกุญแจหลัก (Default) เรียบร้อยแล้ว`, `Set "${key.name}" as the active default key.`)
      )
    } catch (err: any) {
      addToast('error', t('ตั้งค่าล้มเหลว', 'Update Failed'), err.message || 'Error updating default key')
    }
  }

  // Delete Key
  const handleDeleteKey = async (key: AiApiKey) => {
    try {
      await store.deleteAiKey(key.id)
      addToast(
        'info',
        t('ลบกุญแจแล้ว', 'API Key Removed'),
        t(`ลบ "${key.name}" ออกจากฐานข้อมูล Cloudflare D1 เรียบร้อยแล้ว`, `Deleted "${key.name}" from D1 database.`)
      )
    } catch (err: any) {
      addToast('error', t('ลบล้มเหลว', 'Delete Failed'), err.message || 'Error deleting API key')
    }
  }

  // Test Individual Key with Latency Benchmarking
  const handleTestKey = async (key: AiApiKey) => {
    setTestingKeyId(key.id)
    const startTime = performance.now()
    try {
      const res = await api.testAiKey(key.id)
      const durationMs = Math.round(performance.now() - startTime)
      if (res && res.success) {
        setKeyLatencies(prev => ({ ...prev, [key.id]: durationMs }))
        addToast(
          'success',
          t('ทดสอบการเชื่อมต่อสำเร็จ', 'Connection Test Passed'),
          t(`กุญแจ "${key.name}" เชื่อมต่อ Google Gemini 1.5 Flash ได้สมบูรณ์ (${durationMs}ms)`, `Key "${key.name}" connected to Gemini 1.5 Flash successfully (${durationMs}ms).`)
        )
      } else {
        addToast(
          'error',
          t('การเชื่อมต่อล้มเหลว', 'Connection Failed'),
          res?.message || t('ไม่สามารถเชื่อมต่อ Google Gemini ด้วยกุญแจนี้ได้', 'Could not connect to Google Gemini with this key.')
        )
      }
    } catch (err: any) {
      addToast('error', t('ทดสอบล้มเหลว', 'Test Error'), err.message || 'Network error')
    } finally {
      setTestingKeyId(null)
    }
  }

  // Handle Toggle Individual Personnel AI Access
  const handleTogglePersonnelAi = (targetUser: User) => {
    const nextState = !targetUser.hasAiAccess
    store.toggleUserAiAccess(targetUser.id, nextState, currentUser?.name || 'Admin')
    addToast(
      nextState ? 'success' : 'info',
      nextState ? t('อนุมัติสิทธิ์ AI เรียบร้อย', 'AI Access Granted') : t('ระงับสิทธิ์ AI เรียบร้อย', 'AI Access Revoked'),
      t(
        `ปรับปรุงสิทธิ์ของ ${targetUser.name} เป็น: ${nextState ? 'อนุมัติ' : 'ระงับ'}`,
        `Updated permissions for ${targetUser.name}: ${nextState ? 'Allowed' : 'Revoked'}`
      )
    )
  }

  // Batch Grant All Faculty
  const handleGrantAllFaculty = () => {
    facultyAndStaff.forEach(u => {
      if (!u.hasAiAccess) {
        store.toggleUserAiAccess(u.id, true, currentUser?.name || 'Admin')
      }
    })
    addToast(
      'success',
      t('อนุมัติสิทธิ์อาจารย์/บุคลากรทั้งหมดแล้ว', 'Granted All Faculty Access'),
      t('เปิดใช้งานสิทธิ์ AI ให้กับอาจารย์และบุคลากรทุกท่านเรียบร้อยแล้ว', 'Enabled AI privileges for all faculty and QA staff.')
    )
  }

  // Batch Revoke All Faculty
  const handleRevokeAllFaculty = () => {
    facultyAndStaff.forEach(u => {
      if (u.hasAiAccess) {
        store.toggleUserAiAccess(u.id, false, currentUser?.name || 'Admin')
      }
    })
    addToast(
      'info',
      t('ระงับสิทธิ์บุคลากรทั้งหมดแล้ว', 'Revoked All Personnel Access'),
      t('ระงับสิทธิ์การใช้งาน AI ของบุคลากรทั้งหมดชั่วคราว', 'Revoked AI privileges for all personnel.')
    )
  }

  // Personnel List — EXCLUDE STUDENTS STRICTLY!
  const facultyAndStaff = store.users.filter(u => u.role !== 'student')
  const totalPersonnelCount = facultyAndStaff.length
  const authorizedPersonnelCount = facultyAndStaff.filter(u => u.hasAiAccess === true).length

  // Filtered Personnel
  const filteredPersonnel = facultyAndStaff.filter(u => {
    if (personnelRoleFilter !== 'all' && u.role !== personnelRoleFilter) return false
    if (personnelAiFilter === 'granted' && u.hasAiAccess !== true) return false
    if (personnelAiFilter === 'revoked' && u.hasAiAccess === true) return false

    const s = personnelSearch.trim().toLowerCase()
    if (!s) return true
    return (
      u.name.toLowerCase().includes(s) ||
      u.code.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.department && u.department.toLowerCase().includes(s))
    )
  })

  // Filter AI Audit Logs
  const aiAuditLogs = store.auditLogs.filter(log =>
    log.action === 'user_ai_access_toggled' ||
    log.action.includes('ai') ||
    log.description.toLowerCase().includes('ai') ||
    log.description.toLowerCase().includes('llm')
  )

  const activeKey = store.aiKeys.find(k => k.isDefault) || store.aiKeys[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('จัดการระบบ AI & กำหนดสิทธิ์ (AI Governance)', 'AI & LLM Governance Console')}
        description={t(
          'ศูนย์รวมการควบคุมโมเดลภาษาขนาดใหญ่ (LLM) สวิตช์หลักของระบบ การตั้งค่า API Key และการกระจายสิทธิ์เฉพาะคณาจารย์และฝ่ายประกันคุณภาพ',
          'Enterprise AI Governance: Master system switch, API credentials, model configuration, and role-targeted delegation for faculty & QA.'
        )}
      />

      {/* ============================================================ */}
      {/* VISUAL COMMAND CENTER: LIVE SYSTEM HEALTH & MASTER CONTROLS */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Top Accent Strip */}
        <div className={`h-1.5 w-full ${isEnabled ? 'bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600' : 'bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600'}`} />

        <div className="p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left Status Group */}
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isEnabled
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-xs'
                }`}
              >
                <Bot className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t('สวิตช์ควบคุมหลักของระบบ (Tier 1 System Master Switch)', 'Tier 1 System Master Switch')}
                  </h2>

                  {/* Live Status Pill with Pulse */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isEnabled
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60'
                    }`}
                  >
                    <span className="relative flex h-2 w-2">
                      {isEnabled && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </span>
                    {isEnabled ? t('API: เปิดใช้งานอยู่ (Active)', 'API: Active') : t('API: ปิดใช้งาน (Disabled)', 'API: Disabled')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  {t(
                    'สวิตช์ตัดการทำงานฉุกเฉินระดับมหาวิทยาลัย เมื่อปิดสวิตช์นี้ ระบบจะระงับการเชื่อมต่อ Gemini LLM ทุกจุดทันที เพื่อความปลอดภัยและการควบคุมงบประมาณ',
                    'Enterprise kill-switch. Halts all outbound Gemini LLM requests immediately across all system features.'
                  )}
                </p>
              </div>
            </div>

            {/* Right Master Switch Button */}
            <div className="flex items-center gap-3">
              <Button
                variant={isEnabled ? 'danger' : 'primary'}
                onClick={handleToggleMasterSwitch}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs sm:text-sm px-5 py-2.5 font-bold cursor-pointer shadow-xs transition-all"
              >
                <Power className="h-4 w-4" />
                <span>
                  {isEnabled
                    ? t('คลิกเพื่อปิด AI ทั้งระบบ (Shut Down)', 'Turn Off System AI')
                    : t('คลิกเพื่อเปิดใช้งาน AI (Activate)', 'Turn On System AI')}
                </span>
              </Button>
            </div>
          </div>

          {/* Mini Telemetry Quick Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Cpu className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{t('โมเดลหลัก', 'Engine')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Gemini 1.5 Flash</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <KeyRound className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{t('กุญแจในระบบ', 'Active Key')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-mono">
                  {activeKey ? activeKey.name : t('ไม่มีกุญแจ', 'None')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Users className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{t('บุคลากรมีสิทธิ์', 'Authorized')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {authorizedPersonnelCount} / {totalPersonnelCount} {t('คน', 'users')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <Activity className="h-4 w-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{t('ประวัติความปลอดภัย', 'Audit Logs')}</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {aiAuditLogs.length} {t('รายการ', 'events')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* NAVIGATION TABS (SEGMENTED MINIMAL STYLE) */}
      {/* ============================================================ */}
      <div className="flex gap-2 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px ${
            activeTab === 'overview'
              ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="h-4 w-4" />
          <span>{t('การตั้งค่าระบบหลัก & API Key', 'System & API Config')}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {store.aiKeys.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px ${
            activeTab === 'personnel'
              ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t('กำหนดสิทธิ์บุคลากร (อาจารย์ / QA)', 'Personnel Access (Faculty & QA)')}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
            {authorizedPersonnelCount}/{totalPersonnelCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap -mb-px ${
            activeTab === 'audit'
              ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>{t('ประวัติความปลอดภัย AI (AI Audit)', 'AI Security Logs')}</span>
          {aiAuditLogs.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {aiAuditLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: SYSTEM & API CREDENTIALS (CLEAN CREDENTIAL CARDS) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: API Keys Management */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>{t('รายการ Gemini API Key ในระบบ', 'Gemini API Credentials')}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800">
                    {store.aiKeys.length} {t('กุญแจ', 'keys')}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('เชื่อมต่อ Cloudflare D1 เข้ารหัสกุญแจปลอดภัยระดับ Server-side', 'Encrypted and stored securely in Cloudflare D1')}
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddKeyModal}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>{t('เพิ่ม API Key ใหม่', 'Add New API Key')}</span>
              </Button>
            </div>

            {/* Keys Visual Cards Grid */}
            <div className="space-y-3">
              {store.aiKeys.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                      {t('ยังไม่มีการบันทึก Gemini API Key ในฐานข้อมูล', 'No Gemini API Keys Added Yet')}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      {t(
                        'เพิ่ม Gemini API Key ของคุณเพื่อเปิดใช้งานการวิเคราะห์เชิงคุณภาพอัตโนมัติ (AUN-QA) กุญแจแรกจะถูกตั้งเป็นกุญแจหลักโดยอัตโนมัติ',
                        'Add your Gemini API Key to enable AI analytics. The first key added becomes the active default.'
                      )}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleOpenAddKeyModal} className="text-xs font-bold px-4 py-2">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('เพิ่ม API Key แรก', 'Add First API Key')}
                  </Button>
                </div>
              ) : (
                store.aiKeys.map(k => {
                  const isTesting = testingKeyId === k.id
                  const latency = keyLatencies[k.id]
                  return (
                    <div
                      key={k.id}
                      className={`p-4 rounded-xl border transition-all ${
                        k.isDefault
                          ? 'bg-white dark:bg-slate-900 border-sky-400 dark:border-sky-600 shadow-xs ring-1 ring-sky-300/40 dark:ring-sky-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              k.isDefault
                                ? 'bg-sky-600 text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <KeyRound className="h-4 w-4" />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {k.name}
                              </span>
                              {k.isDefault ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                                  <Sparkles className="h-3 w-3 text-sky-500" />
                                  {t('กุญแจหลักที่ใช้งานอยู่ (Active Default)', 'Active Default')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                  {t('กุญแจสำรอง', 'Secondary')}
                                </span>
                              )}

                              {typeof latency === 'number' && (
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                                  ⚡ {latency}ms
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
                                {k.maskedKey}
                              </span>
                              <span className="text-[11px] text-slate-400">• {k.model || 'gemini-1.5-flash'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0">
                          {!k.isDefault && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSetDefaultKey(k)}
                              className="text-[11px] font-semibold px-2.5 py-1 text-sky-600 dark:text-sky-400 cursor-pointer"
                            >
                              <Star className="h-3.5 w-3.5 mr-1" />
                              {t('ตั้งเป็นกุญแจหลัก', 'Use as Default')}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleTestKey(k)}
                            disabled={isTesting}
                            className="text-[11px] font-semibold px-2.5 py-1 cursor-pointer"
                          >
                            <Zap className={`h-3.5 w-3.5 mr-1 text-sky-500 ${isTesting ? 'animate-spin' : ''}`} />
                            {isTesting ? t('ทดสอบ...', 'Testing...') : t('ทดสอบ', 'Test')}
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteKey(k)}
                            className="text-[11px] font-semibold p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            aria-label={t('ลบกุญแจ', 'Delete Key')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* PDPA & Data Privacy Policy Card */}
            <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-800/50 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span>{t('การปกป้องข้อมูลส่วนบุคคล (PDPA Data Protection Policy)', 'PDPA Protection Policy')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t(
                  'ข้อมูลเคสที่ส่งไปวิเคราะห์กับ LLM จะถูกนิรนาม (De-identified) โดยอัตโนมัติ โดยระบบจะไม่ส่งชื่อจริง นามสกุล เลขประจำตัวประชาชน หรือเบอร์โทรศัพท์ของนักศึกษาออกไปยังภายนอกเด็ดขาด',
                  'All outbound prompts are strictly stripped of PII. API keys are stored securely server-side in Cloudflare D1.'
                )}
              </p>
            </div>
          </div>

          {/* Column 3: Telemetry & Specs */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('สถิติและโควตาการใช้งาน', 'Quota & Telemetry')}
                </h3>
              </div>

              {/* Authorized Progress */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{t('บุคลากรที่ได้รับสิทธิ์', 'Authorized Personnel')}</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {Math.round((authorizedPersonnelCount / (totalPersonnelCount || 1)) * 100)}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{authorizedPersonnelCount}</span>
                  <span className="text-xs text-slate-400">/ {totalPersonnelCount} {t('คน', 'users')}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                    style={{ width: `${(authorizedPersonnelCount / (totalPersonnelCount || 1)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Model Specifications */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">{t('โมเดล AI หลัก', 'Primary Model')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Gemini 1.5 Flash</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">{t('ผู้ให้บริการ', 'Provider')}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Google AI Studio</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">{t('โหมดสำรองออฟไลน์', 'Offline Fallback')}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('พร้อมทำงาน', 'Ready')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: PERSONNEL ACCESS DELEGATION (EXCLUDES STUDENTS STRICTLY) */}
      {/* ============================================================ */}
      {activeTab === 'personnel' && (
        <div className="space-y-4">
          {/* Faculty-Only Notice Banner with Batch Controls */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{t('ระบบกำหนดสิทธิ์เฉพาะบุคลากร (Faculty & QA Staff Only)', 'Faculty & QA Staff Delegation')}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                      {authorizedPersonnelCount} / {totalPersonnelCount} {t('ได้รับอนุมัติ', 'authorized')}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(
                      'จำกัดสิทธิ์เฉพาะคณาจารย์และเจ้าหน้าที่ประกันคุณภาพเท่านั้น (ระบบตัดนักศึกษาออกทั้งหมด 100% เพื่อความปลอดภัย)',
                      'Restricted to faculty and QA personnel only. Students are completely excluded.'
                    )}
                  </p>
                </div>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGrantAllFaculty}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                  {t('อนุมัติทั้งหมด', 'Grant All')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRevokeAllFaculty}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  {t('ระงับทั้งหมด', 'Revoke All')}
                </Button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('ค้นหาชื่อ, รหัสบุคลากร, สำนักวิชา...', 'Search name, employee ID, department...')}
                  value={personnelSearch}
                  onChange={e => setPersonnelSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400 transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={personnelRoleFilter}
                  onChange={e => setPersonnelRoleFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">{t('ทุกบทบาทบุคลากร (All Faculty & Staff)', 'All Faculty & Staff')}</option>
                  <option value="qa_chair">{t('ประกันคุณภาพ / ประธานสาขา (QA Chair)', 'QA Chair')}</option>
                  <option value="advisor">{t('อาจารย์ที่ปรึกษา (Advisor)', 'Advisor')}</option>
                  <option value="admin">{t('ผู้ดูแลระบบ (Admin)', 'Admin')}</option>
                </select>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setPersonnelAiFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      personnelAiFilter === 'all'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t('ทั้งหมด', 'All')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonnelAiFilter('granted')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      personnelAiFilter === 'granted'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-sky-700 dark:text-sky-400'
                    }`}
                  >
                    {t('เฉพาะมีสิทธิ์', 'Allowed')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPersonnelAiFilter('revoked')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      personnelAiFilter === 'revoked'
                        ? 'bg-slate-700 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t('ระงับสิทธิ์', 'Revoked')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Personnel Visual Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPersonnel.length === 0 ? (
              <div className="col-span-full p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs sm:text-sm">
                {t('ไม่พบบุคลากรที่ตรงกับเงื่อนไขการค้นหา', 'No personnel matching the search criteria.')}
              </div>
            ) : (
              filteredPersonnel.map(u => {
                const hasAccess = u.hasAiAccess === true
                const roleLabels: Record<string, { th: string; en: string }> = {
                  advisor: { th: 'อาจารย์ที่ปรึกษา', en: 'Faculty Advisor' },
                  qa_chair: { th: 'ประกันคุณภาพ / ประธาน', en: 'QA / Chair' },
                  admin: { th: 'ผู้ดูแลระบบ', en: 'Admin' },
                }
                const r = roleLabels[u.role] || { th: u.role, en: u.role }

                return (
                  <div
                    key={u.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      hasAccess
                        ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={u.name} avatar={u.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {u.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {t(r.th, r.en)}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400">
                            {u.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {u.department || 'School of Applied Digital Technology (ADT)'}
                        </p>
                      </div>
                    </div>

                    {/* Permission Toggle Pill */}
                    <button
                      type="button"
                      onClick={() => handleTogglePersonnelAi(u)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs border flex-shrink-0 ${
                        hasAccess
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
                      }`}
                      title={t('คลิกเพื่อเปิดหรือระงับสิทธิ์ AI สำหรับบุคคลนี้', 'Click to grant or revoke AI permission')}
                    >
                      <Bot className={`h-3.5 w-3.5 ${hasAccess ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                      <span>{hasAccess ? t('มีสิทธิ์ AI (Allowed)', 'Allowed') : t('ระงับสิทธิ์ (Revoked)', 'Revoked')}</span>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: AI SECURITY & AUDIT TRAIL */}
      {/* ============================================================ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <ScrollText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('บันทึกประวัติความปลอดภัยและการปรับแต่งสิทธิ์ AI', 'AI Security & Access Modification Logs')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('บันทึกการเปิด-ปิดสวิตช์หลัก การสลับสิทธิ์รายบุคคล และการแก้ไขกุญแจ API แบบเรียลไทม์', 'Real-time audit trail of all AI permissions and master switch toggles.')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
            {aiAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs sm:text-sm text-slate-400">
                {t('ยังไม่มีประวัติการใช้งาน AI หรือการแก้ไขสิทธิ์ในระบบ', 'No AI audit logs recorded yet.')}
              </div>
            ) : (
              aiAuditLogs.map(log => (
                <div key={log.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>{log.userName} ({log.userRole})</span>
                        <span>•</span>
                        <span>{log.createdAt || ''}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
                    {log.action}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD API KEY */}
      {/* ============================================================ */}
      <Modal
        isOpen={showAddKeyModal}
        onClose={() => setShowAddKeyModal(false)}
        title={t('เพิ่ม Google Gemini API Key', 'Add Google Gemini API Key')}
        size="md"
      >
        <form onSubmit={handleAddKeySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('ชื่อระบุของกุญแจ (Key Name / Identifier)', 'Key Name')}
            </label>
            <input
              type="text"
              placeholder={t('เช่น Gemini 1.5 Flash (Production)', 'e.g. Gemini 1.5 Flash (Production)')}
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('กุญแจ Gemini API Key', 'Gemini API Key')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showKeyPassword ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={newKeyValue}
                onChange={e => setNewKeyValue(e.target.value)}
                required
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKeyPassword(!showKeyPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKeyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {t('สร้างกุญแจได้ฟรีจาก Google AI Studio (ai.google.dev)', 'Generate free keys from Google AI Studio (ai.google.dev)')}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="set-default-key-checkbox"
              checked={newKeyIsDefault}
              onChange={e => setNewKeyIsDefault(e.target.checked)}
              className="h-4 w-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
            />
            <label htmlFor="set-default-key-checkbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              {t('ตั้งค่าเป็นกุญแจหลัก (Active Default Key)', 'Set as the Active Default Key')}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setShowAddKeyModal(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSavingKey}>
              {isSavingKey ? t('กำลังบันทึก...', 'Saving...') : t('บันทึกกุญแจ', 'Save Key')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
