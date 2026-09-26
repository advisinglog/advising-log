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
  Clock,
  Cpu,
  Lock,
  Layers,
  ScrollText,
  Zap,
  Plus,
  Trash2,
  Star,
  Sparkles,
} from 'lucide-react'
import { PageHeader, Button, DataTable, StatusBadge, UserAvatar, Modal } from '@/components/ui'
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
  const { t, language } = useLanguage()

  const [activeTab, setActiveTab] = useState<'overview' | 'personnel' | 'audit'>('overview')

  // Multi-Key Management Modal & State
  const [showAddKeyModal, setShowAddKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeyIsDefault, setNewKeyIsDefault] = useState(false)
  const [showKeyPassword, setShowKeyPassword] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null)

  // Personnel filter state (strictly faculty/staff - excluding students!)
  const [personnelSearch, setPersonnelSearch] = useState('')
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'all' | 'advisor' | 'qa_chair' | 'admin'>('all')
  const [personnelAiFilter, setPersonnelAiFilter] = useState<'all' | 'granted' | 'revoked'>('all')

  const isEnabled = store.systemApiConfig?.isAiApiEnabled !== false
  const provider = store.systemApiConfig?.provider || 'Google Gemini'
  const model = store.systemApiConfig?.model || 'gemini-1.5-flash'

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

  // Test Individual Key
  const handleTestKey = async (key: AiApiKey) => {
    setTestingKeyId(key.id)
    try {
      const res = await api.testAiKey(key.id)
      if (res && res.success) {
        addToast(
          'success',
          t('ทดสอบการเชื่อมต่อสำเร็จ', 'Connection Test Passed'),
          t(`กุญแจ "${key.name}" เชื่อมต่อ Google Gemini 1.5 Flash ได้สมบูรณ์`, `Key "${key.name}" connected to Gemini 1.5 Flash successfully.`)
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('จัดการระบบ AI & กำหนดสิทธิ์ (AI Governance)', 'AI & LLM Governance Console')}
        description={t(
          'ศูนย์รวมการควบคุมโมเดลภาษาขนาดใหญ่ (LLM) สวิตช์หลักของระบบ การตั้งค่า API Key และการกระจายสิทธิ์เฉพาะคณาจารย์และฝ่ายประกันคุณภาพ',
          'Enterprise AI Governance: Master system switch, API credentials, model configuration, and role-targeted delegation for faculty & QA.'
        )}
      />

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200/70 dark:border-slate-800 mb-8 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>{t('การตั้งค่าระบบหลัก & API Key', 'System & API Config')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'personnel'
              ? 'border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>{t('กำหนดสิทธิ์บุคลากร (อาจารย์ / QA)', 'Personnel Access (Faculty & QA)')}</span>
          <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-500/12 text-sky-800 dark:text-sky-300 font-bold border border-sky-200/60 dark:border-sky-500/25">
            {authorizedPersonnelCount} / {totalPersonnelCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 -mb-px whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>{t('ประวัติความปลอดภัย AI (AI Audit)', 'AI Security Logs')}</span>
          {aiAuditLogs.length > 0 && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-slate-700/60">
              {aiAuditLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: SYSTEM OVERVIEW & API CONFIGURATION */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Master Switch Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-sky-50/35 to-white dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 p-6 sm:p-8 shadow-premium transition-all duration-200 hover:border-sky-200/90 dark:hover:border-sky-500/35 hover:shadow-premium-hover">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600" />
            <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-sky-400/70" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isEnabled
                      ? 'bg-white/80 dark:bg-sky-950/50 border-2 border-sky-100 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 shadow-sm ring-4 ring-sky-50/80 dark:ring-sky-500/10'
                      : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-sm ring-4 ring-slate-50/80 dark:ring-slate-700/30'
                  }`}
                >
                  <Bot className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      {t('สวิตช์ควบคุมหลักของระบบ (Tier 1 System Master Switch)', 'Tier 1 System Master Switch')}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isEnabled
                          ? 'bg-emerald-100 dark:bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/25'
                          : 'bg-rose-100 dark:bg-rose-500/12 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-500/25'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {isEnabled ? t('API: เปิดใช้งานอยู่ (Active)', 'API: Active') : t('API: ปิดใช้งาน (Disabled)', 'API: Disabled')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {t(
                      'สวิตช์ปิดฉุกเฉินระดับมหาวิทยาลัย หากปิดสวิตช์นี้ ระบบจะระงับการเรียกใช้ AI / LLM ทุกจุดในระบบทันที ไม่ว่าผู้ใช้รายบุคคลจะมีสิทธิ์หรือไม่ เหมาะสำหรับควบคุมงบประมาณหรือช่วงปิดปรับปรุง',
                      'Emergency kill-switch. When turned off, all AI / LLM requests are blocked immediately regardless of user permissions.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant={isEnabled ? 'danger' : 'primary'}
                  onClick={handleToggleMasterSwitch}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm px-6 py-3 font-bold cursor-pointer"
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
          </div>

          {/* Configuration Grid: Multi-Key API Management & Model Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Multi-Key API Management */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200/70 dark:border-slate-800/80 shadow-premium space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-500/25 flex items-center justify-center shadow-xs">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>{t('การจัดการกุญแจโมเดลภาษา (Multi-Key Management)', 'Multi-Key AI Gateway')}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/50">
                        {store.aiKeys.length} {t('กุญแจในระบบ', 'Keys in D1')}
                      </span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {provider} ({model}) · {t('บันทึกปลอดภัยใน Cloudflare D1', 'Securely stored in Cloudflare D1')}
                    </span>
                  </div>
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

              {/* Keys List */}
              <div className="space-y-3">
                {store.aiKeys.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                      <KeyRound className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {t('ยังไม่มีการบันทึก Gemini API Key ในฐานข้อมูล', 'No Gemini API Keys Added Yet')}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        {t(
                          'เพิ่ม Gemini API Key ของคุณเพื่อเปิดใช้งานการวิเคราะห์เชิงคุณภาพอัตโนมัติ (AUN-QA) กุญแจแรกที่เพิ่มจะถูกตั้งเป็นกุญแจหลัก (Default) โดยอัตโนมัติ',
                          'Add your Gemini API Key to enable live AI synthesis. The first key you add will automatically become the active default.'
                        )}
                      </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleOpenAddKeyModal} className="text-xs font-bold px-4 py-2">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {t('เพิ่ม API Key แรก', 'Add First API Key')}
                    </Button>
                  </div>
                ) : (
                  store.aiKeys.map(k => (
                    <div
                      key={k.id}
                      className={`p-4 rounded-xl border transition-all duration-200 ${
                        k.isDefault
                          ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800/80 shadow-xs ring-1 ring-sky-200/50 dark:ring-sky-500/20'
                          : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              k.isDefault
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <KeyRound className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{k.name}</span>
                              {k.isDefault ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-200/80 dark:border-sky-500/30">
                                  <Sparkles className="h-3 w-3 text-sky-500" />
                                  {t('กุญแจหลักที่ใช้งานอยู่ (Active Default)', 'Active Default')}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                  {t('กุญแจสำรอง', 'Secondary')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 font-semibold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                                {k.maskedKey}
                              </span>
                              <span className="text-[10px] text-slate-400">• {k.model || 'gemini-1.5-flash'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {!k.isDefault && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSetDefaultKey(k)}
                              className="text-[11px] font-bold px-2.5 py-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                            >
                              <Star className="h-3.5 w-3.5 mr-1" />
                              {t('ตั้งเป็นกุญแจหลัก', 'Use as Default')}
                            </Button>
                          )}

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleTestKey(k)}
                            disabled={testingKeyId === k.id}
                            className="text-[11px] font-bold px-2.5 py-1 cursor-pointer"
                          >
                            <Zap className={`h-3.5 w-3.5 mr-1 text-sky-500 ${testingKeyId === k.id ? 'animate-spin' : ''}`} />
                            {testingKeyId === k.id ? t('ทดสอบ...', 'Testing...') : t('ทดสอบ', 'Test')}
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteKey(k)}
                            className="text-[11px] font-bold px-2.5 py-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PDPA & Security Guarantee Card */}
              <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-200/70 dark:border-sky-800/50 text-sm space-y-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                  <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span>{t('การปกป้องข้อมูลส่วนบุคคล (PDPA Data Protection Policy)', 'PDPA Protection Policy')}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {t(
                    'ข้อมูลเคสที่ส่งไปวิเคราะห์กับ LLM จะถูกนิรนาม (De-identified) โดยอัตโนมัติ โดยระบบจะไม่ส่งชื่อจริง นามสกุล เลขบัตรประชาชน หรือเบอร์โทรศัพท์ของนักศึกษาออกไปยังภายนอกเด็ดขาด กุญแจ API ทั้งหมดถูกเข้ารหัสและบันทึกใน Cloudflare D1 บนเซิร์ฟเวอร์',
                    'All outbound prompts are strictly stripped of PII. API keys are stored securely server-side in Cloudflare D1 and accessed directly by backend workers.'
                  )}
                </p>
              </div>
            </div>

            {/* Column 3: Telemetry & Model Overview */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200/70 dark:border-slate-800/80 shadow-premium space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/80 pb-4">
                <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-500/25 flex items-center justify-center shadow-xs">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('สถิติและโควตาการใช้งาน', 'Quota & Telemetry')}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-200/60 dark:border-sky-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('บุคลากรที่ได้รับสิทธิ์', 'Authorized Personnel')}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                      {Math.round((authorizedPersonnelCount / (totalPersonnelCount || 1)) * 100)}%
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{authorizedPersonnelCount} / {totalPersonnelCount}</p>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{ width: `${(authorizedPersonnelCount / (totalPersonnelCount || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('โมเดลหลักที่เปิดใช้งาน', 'Active LLM Engine')}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">Gemini 1.5 Flash</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-500/25 flex items-center justify-center">
                      <Zap className="h-5 w-5" />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/12 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-500/25">
                    Fast & Cost-Smart
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t('โหมดสำรองกรณีออฟไลน์', 'Offline Fallback Engine')}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{t('เปิดทำงานอัตโนมัติ', 'Active & Ready')}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Smart Engine
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
          {/* Strict Role Filtering Notice Banner */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-sky-50/35 to-white dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20 p-5 shadow-premium flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-sky-400 to-sky-600" />
            <div className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-sky-400/70" />
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-white/80 dark:bg-sky-950/50 border-2 border-sky-100 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shadow-sm ring-4 ring-sky-50/80 dark:ring-sky-500/10 flex-shrink-0">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm">
                  <span>{t('ระบบกำหนดสิทธิ์เฉพาะบุคลากร (Faculty & QA Staff Only)', 'Faculty & QA Staff Delegation')}</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                    {authorizedPersonnelCount} / {totalPersonnelCount} {t('ได้รับอนุมัติ', 'authorized')}
                  </span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {t(
                    'หน้านี้คัดกรองเฉพาะอาจารย์และฝ่ายประกันคุณภาพเท่านั้น (ตัดนักศึกษาออกทั้งหมด 100%) เพื่อป้องกันการเปิดสิทธิ์ผิดคนและควบคุมค่าใช้จ่ายอย่างรัดกุม',
                    'Restricted to faculty and QA personnel only. Students are completely excluded from AI access privileges.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto bg-white dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setPersonnelAiFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  personnelAiFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {t('ทั้งหมด', 'All')}
              </button>
              <button
                type="button"
                onClick={() => setPersonnelAiFilter('granted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  personnelAiFilter === 'granted'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50'
                }`}
              >
                {t('เฉพาะมีสิทธิ์', 'Allowed')}
              </button>
              <button
                type="button"
                onClick={() => setPersonnelAiFilter('revoked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  personnelAiFilter === 'revoked'
                    ? 'bg-slate-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                {t('ระงับสิทธิ์', 'Revoked')}
              </button>
            </div>
          </div>

          {/* Search & Role Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('ค้นหาชื่อ, รหัสบุคลากร, สำนักวิชา...', 'Search name, employee ID, department...')}
                value={personnelSearch}
                onChange={e => setPersonnelSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={personnelRoleFilter}
                onChange={e => setPersonnelRoleFilter(e.target.value as any)}
                className="px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer transition-all"
              >
                <option value="all">{t('ทุกบทบาทบุคลากร (All Faculty & Staff)', 'All Faculty & Staff')}</option>
                <option value="qa_chair">{t('ประกันคุณภาพ / ประธานสาขา (QA Chair)', 'QA Chair')}</option>
                <option value="advisor">{t('อาจารย์ที่ปรึกษา (Advisor)', 'Advisor')}</option>
                <option value="admin">{t('ผู้ดูแลระบบ (Admin)', 'Admin')}</option>
              </select>
            </div>
          </div>

          {/* Personnel Table */}
          <div className="bg-white dark:bg-[#0e1424] rounded-2xl border border-slate-200/70 dark:border-slate-800/80 overflow-hidden shadow-premium">
            <DataTable
              data={filteredPersonnel}
              columns={[
                {
                  key: 'name',
                  header: t('อาจารย์ / บุคลากร', 'Faculty & Staff'),
                  render: (u: User) => (
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-400 font-mono">
                          {u.code} • {u.email}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  header: t('บทบาท', 'Role'),
                  render: (u: User) => {
                    const roleLabels: Record<string, { th: string; en: string }> = {
                      advisor: { th: 'อาจารย์ที่ปรึกษา', en: 'Faculty Advisor' },
                      qa_chair: { th: 'ประกันคุณภาพ / ประธาน', en: 'QA / Chair' },
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
                  key: 'aiAccess',
                  header: t('สิทธิ์การใช้งาน AI', 'AI Access'),
                  render: (u: User) => {
                    const hasAccess = u.hasAiAccess === true
                    return (
                      <button
                        type="button"
                        onClick={() => handleTogglePersonnelAi(u)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                          hasAccess
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750'
                        }`}
                        title={t('คลิกเพื่อเปิดหรือระงับสิทธิ์ AI สำหรับบุคคลนี้', 'Click to grant or revoke AI permission')}
                      >
                        <Bot className={`h-3.5 w-3.5 ${hasAccess ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                        <span>{hasAccess ? t('มีสิทธิ์ AI (Allowed)', 'Allowed') : t('ระงับสิทธิ์ (Revoked)', 'Revoked')}</span>
                      </button>
                    )
                  },
                },
                {
                  key: 'status',
                  header: t('สถานะบัญชี', 'Account Status'),
                  render: (u: User) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} />,
                },
              ]}
              emptyMessage={t('ไม่พบข้อมูลบุคลากรที่ตรงกับเงื่อนไข', 'No matching faculty or staff found')}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: AI SECURITY AUDIT LOGS */}
      {/* ============================================================ */}
      {activeTab === 'audit' && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0e1424] border border-slate-200/70 dark:border-slate-800/80 shadow-premium">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200/60 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-500/25 flex items-center justify-center shadow-xs">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('บันทึกการกระทำและประวัติความปลอดภัย AI (AI Governance Audit Trail)', 'AI Governance Audit Trail')}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {aiAuditLogs.length} {t('รายการที่บันทึก', 'entries recorded')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {t('บันทึกเรียลไทม์', 'Real-time')}
                </span>
              </div>
            </div>

            {aiAuditLogs.length === 0 ? (
              <div className="py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mx-auto mb-4">
                  <ScrollText className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {t('ยังไม่มีประวัติการเปลี่ยนแปลงสิทธิ์ AI ในระบบ', 'No AI security events logged yet.')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t('การเปลี่ยนแปลงสิทธิ์ AI และการกระทำที่เกี่ยวข้องจะถูกบันทึกที่นี่เมื่อเกิดขึ้น', 'AI permission changes and related actions will be logged here as they occur.')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiAuditLogs.map((log, index) => (
                  <div 
                    key={log.id} 
                    className="group relative p-4 rounded-xl bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-sky-200/70 dark:hover:border-sky-800/60 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">{log.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{log.userName}</span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="font-mono text-xs">{log.userRole}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{new Date(log.createdAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Timeline connector for consecutive items */}
                    {index < aiAuditLogs.length - 1 && (
                      <div className="absolute left-9 top-12 bottom-0 w-px bg-gradient-to-b from-sky-200/60 to-transparent dark:from-sky-800/60" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD API KEY MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={showAddKeyModal}
        onClose={() => setShowAddKeyModal(false)}
        title={t('เพิ่ม Google Gemini API Key ใหม่', 'Add New Google Gemini API Key')}
      >
        <form onSubmit={handleAddKeySubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'กุญแจ API จะถูกเข้ารหัสและบันทึกโดยตรงลงในฐานข้อมูล Cloudflare D1 บนเซิร์ฟเวอร์ และจะพร้อมใช้งานสำหรับคณาจารย์และฝ่ายประกันคุณภาพที่ได้รับสิทธิ์ทันที',
              'The API key is encrypted and stored in Cloudflare D1 on the server. Authorized faculty and QA team can immediately use it.'
            )}
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('ชื่อเรียก / คำอธิบายกุญแจ (Key Name) *', 'Key Label / Description *')}
            </label>
            <input
              type="text"
              required
              placeholder={t('เช่น กุญแจหลักสำนักวิชา, Research Gemini 1.5', 'e.g. Primary Faculty Key, Backup Flash Key')}
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {t('Google Gemini API Key (Secret) *', 'Google Gemini API Key (Secret) *')}
            </label>
            <div className="relative">
              <input
                type={showKeyPassword ? 'text' : 'password'}
                required
                placeholder="AIzaSy..."
                value={newKeyValue}
                onChange={e => setNewKeyValue(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKeyPassword(!showKeyPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                {showKeyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="setAsDefaultCheckbox"
              checked={newKeyIsDefault}
              onChange={e => setNewKeyIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="setAsDefaultCheckbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              {t('ตั้งเป็นกุญแจหลักทันที (Set as Active Default Key)', 'Set as Active Default Key')}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={() => setShowAddKeyModal(false)}>
              {t('ยกเลิก', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSavingKey} className="font-bold">
              <Lock className="h-3.5 w-3.5 mr-1" />
              {isSavingKey ? t('กำลังบันทึก...', 'Saving...') : t('บันทึกลงฐานข้อมูล D1', 'Save to Cloudflare D1')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
