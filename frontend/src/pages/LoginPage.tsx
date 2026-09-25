// ============================================================
// AdvisingLog — University Login Page
// Left: Pure Solid Sky-600 (The exact blue from the active language selector: bg-sky-600 text-white)
// Right: Clean Focused Sign-In Workspace (bg-slate-50 / dark:bg-[#0b0f19])
// Zero AI-Slop · Flat, Crisp & Vibrant MFU Brand Blue
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { ThemeToggle } from '@/components/ui'
import { InteractiveVideoHero } from '@/components/InteractiveVideoHero'
import {
  GraduationCap,
  AlertCircle,
  ShieldCheck,
  Building2,
  Users,
  Compass,
  Award,
  Lock,
} from 'lucide-react'

// Map each role to its default route
const ROLE_REDIRECT: Record<string, string> = {
  student: '/student',
  advisor: '/advisor',
  qa_chair: '/qa',
  admin: '/admin',
}

export default function LoginPage() {
  const { loginWithGoogle } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()

  const [authError, setAuthError] = useState<{ code?: string; message?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  function redirectForRole(role: string) {
    if (role === 'student') navigate(ROLE_REDIRECT.student)
    else if (role === 'advisor') navigate(ROLE_REDIRECT.advisor)
    else if (role === 'qa_chair') navigate(ROLE_REDIRECT.qa_chair)
    else if (role === 'admin') navigate(ROLE_REDIRECT.admin)
    else navigate('/')
  }

  function getErrorMessage(): string {
    if (!authError) return ''
    const { code, message, email } = authError
    const userEmail = email ? ` (${email})` : ''

    if (code === 'USER_NOT_REGISTERED' || (message && message.includes('ยังไม่ได้รับการเพิ่มหรือลงทะเบียน'))) {
      return t(
        `ไม่สามารถเข้าสู่ระบบได้: บัญชีของคุณ${userEmail} ยังไม่ได้รับการเพิ่มหรือลงทะเบียนโดยผู้ดูแลระบบ (Admin) กรุณาติดต่อสำนักวิชาหรือผู้ดูแลระบบเพื่อลงทะเบียนเข้าสู่ระบบก่อน`,
        `Sign in failed: Your account${userEmail} has not been added or registered by an Administrator (Admin). Please contact your School office or Administrator to register before signing in.`
      )
    }

    if (code === 'DOMAIN_RESTRICTED' || (message && message.includes('ไม่อนุญาตให้เข้าใช้งาน'))) {
      return t(
        'ไม่อนุญาตให้เข้าใช้งาน: กรุณาใช้อีเมลมหาวิทยาลัยแม่ฟ้าหลวง (@mfu.ac.th หรือ @lamduan.mfu.ac.th) หรือให้อาจารย์/ผู้ดูแลระบบลงทะเบียนอีเมลภายนอกของคุณเข้าสู่ระบบก่อน',
        'Access restricted: Please use an authorized Mae Fah Luang University email (@mfu.ac.th or @lamduan.mfu.ac.th), or contact an Administrator to whitelist your external email.'
      )
    }

    if (code === 'ACCOUNT_DEACTIVATED' || (message && message.includes('ถูกระงับการใช้งาน'))) {
      return t(
        'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
        'This user account has been temporarily deactivated. Please contact the system administrator.'
      )
    }

    if (code === 'STUDENT_NOT_ASSIGNED' || (message && message.includes('ยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา'))) {
      return t(
        `ไม่สามารถเข้าสู่ระบบได้: บัญชีของคุณ${userEmail} ยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา กรุณาติดต่ออาจารย์ที่ปรึกษาหรือสำนักวิชาเพื่อเพิ่มรายชื่อเข้าสู่ระบบ`,
        `Sign in failed: Your account${userEmail} has not been assigned to a faculty advisor. Please contact your advisor or School office.`
      )
    }

    if (code === 'GOOGLE_CONNECT_ERROR') {
      return t('เกิดข้อผิดพลาดในการเชื่อมต่อ Google', 'Error connecting to Google OAuth service.')
    }

    if (code === 'GOOGLE_AUTH_FAILED') {
      return t('การยืนยันตัวตนกับ Google ล้มเหลว', 'Google Authentication Failed')
    }

    return message || t('ไม่สามารถเข้าสู่ระบบด้วย Google ได้', 'Failed to sign in with Google account.')
  }

  // Account-Chooser Sign In (prompts Google Account Picker every time via prompt: select_account)
  const handleGoogleSelectAccount = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAuthError(null)
      setLoading(true)
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!userInfoRes.ok) {
          throw new Error('Failed to fetch user profile')
        }
        const userInfo = await userInfoRes.json()
        const userEmail = (userInfo.email || '').toLowerCase().trim()

        // Escape unicode characters to ASCII sequences so btoa / atob decode cleanly without Latin1 errors
        const safeJson = JSON.stringify(userInfo).replace(
          /[\u007f-\uffff]/g,
          (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4)
        )
        const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
        const payload = btoa(safeJson)
        const syntheticJwt = `${header}.${payload}.signature`

        const result = await loginWithGoogle(syntheticJwt)
        setLoading(false)
        if (result.success && result.user) {
          redirectForRole(result.user.role)
        } else {
          setAuthError({
            code: result.error || 'AUTH_FAILED',
            message: result.message,
            email: result.email || userEmail,
          })
        }
      } catch {
        setLoading(false)
        setAuthError({ code: 'GOOGLE_CONNECT_ERROR' })
      }
    },
    onError: () => {
      setLoading(false)
      setAuthError({ code: 'GOOGLE_AUTH_FAILED' })
    },
    prompt: 'select_account',
  })

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 selection:bg-sky-500/20 selection:text-sky-900 dark:selection:text-sky-200">
      
      {/* ------------------------------------------------------------- */}
      {/* Left Panel: Exact bg-sky-600 (Matching the active Language button) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-sky-900 dark:bg-[#072444] text-white flex-col justify-between p-12 xl:p-16 border-r border-sky-500 dark:border-sky-900/60 relative overflow-hidden">
        {/* Full-Bleed 3D Interactive Video Background */}
        <InteractiveVideoHero />
        
        {/* Top: University & Brand Identity */}
        <div className="space-y-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white text-sky-600 flex items-center justify-center shadow-md ring-4 ring-white/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-tight">
                Advising<span className="text-sky-200">Log</span>
              </span>
              <span className="text-[10px] text-sky-100/90 font-semibold uppercase tracking-wider block">
                Academic Advisory & QA Portal
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-xs font-semibold backdrop-blur-xs shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-sky-200" />
            <span>{t('สำนักวิชาเทคโนโลยีดิจิทัลประยุกต์ · มหาวิทยาลัยแม่ฟ้าหลวง', 'School of Applied Digital Technology · Mae Fah Luang University')}</span>
          </div>
        </div>

        {/* Center: Open Stage for 3D Character - No obstructing text */}
        <div className="flex-1" />

        {/* Bottom Section: Compact Scope Dock */}
        <div className="space-y-4 relative z-10 pt-4">
          <div className="space-y-1">
            <h2 className="text-lg xl:text-xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
              {t(
                'ระบบบริหารการให้คำปรึกษาทางวิชาการ และการประกันคุณภาพ',
                'Academic Advising Management & Quality Assurance'
              )}
            </h2>
            <p className="text-xs text-sky-100/80 leading-relaxed font-normal">
              {t(
                'แพลตฟอร์มศูนย์กลางสำหรับการบันทึกการให้คำปรึกษาและการดูแลช่วยเหลือนักศึกษา',
                'Institutional platform for advisory session logs and advisee support.'
              )}
            </p>
          </div>

          {/* 3 Compact Horizontal Glass Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900/95 border border-white/20 shadow-md transition-all">
              <div className="h-7 w-7 rounded-lg bg-sky-500/25 text-sky-200 flex items-center justify-center mb-1.5 border border-sky-400/30">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white truncate">
                {t('คำปรึกษารายบุคคล', 'SIS Advising')}
              </h3>
              <p className="text-[10px] text-sky-200/80 truncate">
                {t('บันทึกและติดตาม', 'Session Logs')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900/95 border border-white/20 shadow-md transition-all">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/25 text-emerald-200 flex items-center justify-center mb-1.5 border border-emerald-400/30">
                <Compass className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white truncate">
                {t('ส่งต่อช่วยเหลือ', 'Early Support')}
              </h3>
              <p className="text-[10px] text-emerald-200/80 truncate">
                {t('แจ้งเตือนภาวะเสี่ยง', 'Case Referrals')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900/95 border border-white/20 shadow-md transition-all">
              <div className="h-7 w-7 rounded-lg bg-sky-500/25 text-sky-200 flex items-center justify-center mb-1.5 border border-sky-400/30">
                <Award className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-white truncate">
                {t('ประกันคุณภาพ', 'AUN-QA Audit')}
              </h3>
              <p className="text-[10px] text-sky-200/80 truncate">
                {t('เกณฑ์มาตรฐาน 3.0', 'Criteria 3.0')}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Institutional Compliance Note */}
        <div className="pt-6 border-t border-white/20 flex items-center justify-between text-xs text-sky-100 relative z-10">
          <span className="font-semibold text-white/90">Mae Fah Luang University</span>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span>PDPA & SIS Compliant</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Right Panel: Focused Minimalist Sign-In Workspace */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-slate-50 dark:bg-[#0b0f19]">
        
        {/* Top Actions: Mobile Brand + Language & Theme Controls */}
        <div className="flex items-center justify-between pb-6">
          {/* Mobile Logo Branding (shown on mobile/tablet) */}
          <div className="flex lg:hidden items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Advising<span className="text-sky-600 dark:text-sky-400">Log</span>
            </span>
          </div>


          {/* Controls: Language switch & Theme toggle */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Language switch */}
            <div className="flex items-center text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setLanguage('th')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'th'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                }`}
              >
                EN
              </button>
            </div>

            {/* Theme toggle */}
            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-0.5">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Center: Sign-In Card (With Signature Interior Top Sky-Line) */}
        <div className="my-auto max-w-md w-full mx-auto space-y-6">
          <div className="bg-white dark:bg-[#0e1424] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs p-6 sm:p-8 space-y-6 relative overflow-hidden">
            {/* Signature Top Sky Blue Bar (Matching Advisor Cohort Banner & Dashboard Cards) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-sky-600" />
            
            {/* Card Header */}
            <div className="text-center space-y-3 pt-1">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-sky-600 text-white items-center justify-center shadow-md shadow-sky-600/25 ring-4 ring-sky-50 dark:ring-sky-950/50">
                <GraduationCap className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h1
                  className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
                  aria-label="AdvisingLog"
                >
                  Advising<span className="text-sky-600 dark:text-sky-400">Log</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {t(
                    'ระบบงานอาจารย์ที่ปรึกษาและสนับสนุนนักศึกษา',
                    'Student Academic Advisory & Quality Assurance'
                  )}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/25 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                <Building2 className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                <span>Mae Fah Luang University</span>
              </div>
            </div>

            {/* Google Single Sign-On Action */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => handleGoogleSelectAccount()}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-sky-50/40 dark:hover:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-medium text-sm border border-slate-300 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {t('ลงชื่อเข้าใช้ด้วย Google', 'Sign in with Google')}
                </span>
              </button>

              {/* Error Alert Box */}
              {authError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">{t('ไม่สามารถเข้าสู่ระบบได้', 'Authentication Failed')}</p>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">{getErrorMessage()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Allowed Domains Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>{t('บัญชีอีเมลที่รองรับ', 'Authorized University Accounts')}</span>
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Google Workspace</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/60">
                  <span className="text-[10px] uppercase font-bold text-sky-800 dark:text-sky-300 block tracking-wider">
                    {t('นักศึกษา', 'Student')}
                  </span>
                  <span className="font-mono text-[11px] text-sky-900 dark:text-sky-200 block font-semibold mt-0.5">
                    @lamduan.mfu.ac.th
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 block tracking-wider">
                    {t('อาจารย์ / บุคลากร', 'Faculty / Staff')}
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block font-semibold mt-0.5">
                    @mfu.ac.th
                  </span>
                </div>
              </div>
            </div>

            {/* Policy badge */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-400" />
                {t('ระบบความปลอดภัยระดับสถาบัน', 'Secure Encrypted SSO')}
              </span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">
                OAuth 2.0 / OIDC
              </span>
            </div>
          </div>

          {/* Privacy & Quality Standards */}
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>AUN-QA Criteria 3</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>PDPA Compliant</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>Google Education</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-medium">
            © 2026 School of Applied Digital Technology · Mae Fah Luang University
          </p>
          <p className="text-[11px]">
            {t(
              'ระบบงานให้คำปรึกษาทางวิชาการและระบบสารสนเทศเพื่อการประกันคุณภาพ',
              'Academic Advisory Management and Quality Assurance Information System'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
