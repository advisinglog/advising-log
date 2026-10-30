// ============================================================
// AdvisingLog — Multi-Provider AI / LLM Qualitative Analysis Service
// Supports Google Gemini, OpenAI, Anthropic Claude & DeepSeek. Never substitutes canned text:
// every failure is returned as an explicit error.
// ============================================================

import { getAdminContactEmail } from '@/utils/adminContact'

export interface AIAnalysisPayloadCase {
  id: string
  studentCode?: string
  academicYear?: string
  exitType: string
  reasonCode: string
  details: string
  advisorAssessment?: string
  studentVoiceFeedback?: string
}

export type AIAnalysisMode = 'strategic_synthesis' | 'chat_query' | 'case_diagnostic'

export type AIProviderId = 'gemini' | 'openai' | 'claude' | 'deepseek'

export interface AIProviderPreset {
  id: AIProviderId
  name: string
  labelTh: string
  labelEn: string
  taglineTh: string
  taglineEn: string
  badge: string
  defaultModel: string
  popularModels: string[]
  keyPlaceholder: string
  keyFormatHint: string
  keyPrefix?: string
  studioUrl: string
  baseUrl: string
}

export const AI_PROVIDER_PRESETS: Record<AIProviderId, AIProviderPreset> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    labelTh: 'Google Gemini',
    labelEn: 'Google Gemini',
    taglineTh: 'ประมวลผลรวดเร็ว มีโควตาฟรีจาก Google AI Studio',
    taglineEn: 'Fast & responsive with Google AI Studio free tier',
    badge: 'Google AI',
    defaultModel: 'gemini-1.5-flash',
    popularModels: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    keyPlaceholder: 'AIzaSy...',
    keyFormatHint: 'ขึ้นต้นด้วย AIzaSy... (Google AI Studio)',
    keyPrefix: 'AIzaSy',
    studioUrl: 'https://aistudio.google.com/app/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    labelTh: 'OpenAI (ChatGPT / GPT-4o)',
    labelEn: 'OpenAI (ChatGPT / GPT-4o)',
    taglineTh: 'มาตรฐานสากล คุณภาพการวิเคราะห์และความแม่นยำสูง',
    taglineEn: 'Industry standard with high diagnostic accuracy',
    badge: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    popularModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-proj-... / sk-...',
    keyFormatHint: 'ขึ้นต้นด้วย sk-... (OpenAI Platform)',
    keyPrefix: 'sk-',
    studioUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    labelTh: 'Anthropic Claude',
    labelEn: 'Anthropic Claude',
    taglineTh: 'โดดเด่นด้านภาษา ความเข้าใจบริบท และการเขียนเชิงวิชาการ',
    taglineEn: 'Exceptional qualitative reasoning & academic writing',
    badge: 'Anthropic',
    defaultModel: 'claude-sonnet-5-5',
    popularModels: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
    keyPlaceholder: 'sk-ant-api03-...',
    keyFormatHint: 'ขึ้นต้นด้วย sk-ant-... (Anthropic Console)',
    keyPrefix: 'sk-ant',
    studioUrl: 'https://console.anthropic.com/settings/keys',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek AI',
    labelTh: 'DeepSeek AI (V3 / R1)',
    labelEn: 'DeepSeek AI (V3 / R1)',
    taglineTh: 'ประสิทธิภาพการคิดวิเคราะห์เชิงลึกสูง คุ้มค่า',
    taglineEn: 'High deep-reasoning efficiency & affordability',
    badge: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    popularModels: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
    keyFormatHint: 'ขึ้นต้นด้วย sk-... (DeepSeek Platform)',
    keyPrefix: 'sk-',
    studioUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com/v1',
  },
}

export interface AIAnalysisRequest {
  mode?: AIAnalysisMode
  cases: AIAnalysisPayloadCase[]
  query?: string
  apiKey?: string
  providerId?: AIProviderId
  customModel?: string
  customBaseUrl?: string
  /** User-edited task instructions; replaces the default instructions for this mode */
  customInstructions?: string
  language?: 'th' | 'en'
  userHasAiAccess?: boolean
}

export interface AIAnalysisResponse {
  success: boolean
  provider: string
  mode: string
  analysis: string
  timestamp: string
  note?: string
  error?: string
}

export type AiKeySource = 'system' | 'custom'

const QA_PERSONAL_STORAGE_KEY = 'advising_log_qa_personal_gemini_key'
const SOURCE_STORAGE_KEY = 'advising_log_qa_ai_key_source'
const PROVIDER_STORAGE_KEY = 'advising_log_qa_ai_provider'
const MODEL_STORAGE_KEY = 'advising_log_qa_ai_custom_model'
const BASE_URL_STORAGE_KEY = 'advising_log_qa_ai_custom_base_url'

export function getStoredAiKeySource(): AiKeySource {
  const saved = localStorage.getItem(SOURCE_STORAGE_KEY) as AiKeySource | null
  if (saved === 'system' || saved === 'custom') {
    return saved
  }
  return 'system'
}

export function setStoredAiKeySource(source: AiKeySource): void {
  localStorage.setItem(SOURCE_STORAGE_KEY, source)
}

export function getStoredAiProvider(): AIProviderId {
  const saved = localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProviderId | null
  if (saved && AI_PROVIDER_PRESETS[saved]) {
    return saved
  }
  return 'gemini'
}

export function setStoredAiProvider(provider: AIProviderId): void {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
}

export function getStoredCustomModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || ''
}

export function setStoredCustomModel(model: string): void {
  if (model.trim()) {
    localStorage.setItem(MODEL_STORAGE_KEY, model.trim())
  } else {
    localStorage.removeItem(MODEL_STORAGE_KEY)
  }
}

export function getStoredCustomBaseUrl(): string {
  return localStorage.getItem(BASE_URL_STORAGE_KEY) || ''
}

export function setStoredCustomBaseUrl(url: string): void {
  if (url.trim()) {
    localStorage.setItem(BASE_URL_STORAGE_KEY, url.trim())
  } else {
    localStorage.removeItem(BASE_URL_STORAGE_KEY)
  }
}

export function getStoredGeminiKey(): string {
  return localStorage.getItem(QA_PERSONAL_STORAGE_KEY) || ''
}

export function setStoredGeminiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(QA_PERSONAL_STORAGE_KEY, key.trim())
  } else {
    localStorage.removeItem(QA_PERSONAL_STORAGE_KEY)
  }
}

export function clearStoredGeminiKey(): void {
  localStorage.removeItem(QA_PERSONAL_STORAGE_KEY)
}

export function getStoredApiKeyForProvider(providerId: AIProviderId): string {
  if (providerId === 'gemini') {
    return getStoredGeminiKey()
  }
  return localStorage.getItem(`advising_log_qa_key_${providerId}`) || ''
}

export function setStoredApiKeyForProvider(providerId: AIProviderId, key: string): void {
  if (providerId === 'gemini') {
    setStoredGeminiKey(key)
    return
  }
  if (key.trim()) {
    localStorage.setItem(`advising_log_qa_key_${providerId}`, key.trim())
  } else {
    localStorage.removeItem(`advising_log_qa_key_${providerId}`)
  }
}

export function isSystemAiEnabled(): boolean {
  try {
    const raw = localStorage.getItem('advising_log_system_api_config')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed.isAiApiEnabled !== false
    }
  } catch {}
  return true
}

export async function testAiConnection(
  customKey?: string,
  source?: AiKeySource,
  provider?: AIProviderId,
  model?: string,
  baseUrl?: string
): Promise<{ success: boolean; message: string; provider: string; latencyMs?: number }> {
  const effectiveSource = source || getStoredAiKeySource()
  const effectiveProvider = provider || getStoredAiProvider()
  const key = effectiveSource === 'custom'
    ? (customKey !== undefined ? customKey : getStoredApiKeyForProvider(effectiveProvider))
    : undefined

  if (effectiveSource === 'custom' && (!key || key.trim().length === 0)) {
    return {
      success: false,
      message: 'กรุณาระบุ API Key ก่อนทำการทดสอบการเชื่อมต่อ (API Key is required for testing)',
      provider: AI_PROVIDER_PRESETS[effectiveProvider]?.name || effectiveProvider,
      latencyMs: 0,
    }
  }

  const startTime = performance.now()

  try {
    const res = await analyzeWithLLM({
      mode: 'chat_query',
      cases: [],
      query: 'Ping Test Connection',
      apiKey: key,
      providerId: effectiveProvider,
      customModel: model,
      customBaseUrl: baseUrl,
      language: 'en',
      userHasAiAccess: true,
    })
    const latencyMs = Math.round(performance.now() - startTime)
    if (res.success) {
      return {
        success: true,
        message: effectiveSource === 'system'
          ? 'Default API key connected'
          : (key ? `${res.provider} Connected` : 'Engine Operational'),
        provider: res.provider,
        latencyMs,
      }
    } else {
      return {
        success: false,
        message: res.analysis || 'Connection failed',
        provider: res.provider,
        latencyMs,
      }
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime)
    return {
      success: false,
      message: err?.message || 'Connection error',
      provider: 'Error',
      latencyMs,
    }
  }
}

export interface AIPrompt {
  systemInstruction: string
  userPrompt: string
}

export const MAX_AI_INSTRUCTIONS_CHARS = 4000

/**
 * Default task instructions per mode. This is the only part of the prompt the
 * user may edit; the role/privacy rules and the case data stay locked.
 */
export function getDefaultAiInstructions(mode: AIAnalysisMode, query?: string): string {
  const style = 'Use clear markdown bullet points, bold keywords, and strategic recommendations.'
  if (mode === 'strategic_synthesis') {
    return `Analyze these student departure cases (Withdrawal vs. Leave of Absence) and provide:
1. **Executive Summary for Program Chair (บทสรุปสำหรับประธานหลักสูตร)**
2. **Key Differences: Why Withdraw vs Why Take Leave (เปรียบเทียบทำไมลาออก vs ทำไมพักการศึกษา)**
3. **Curriculum & Foundation Gaps (ปัญหาหลักสูตรและการเรียนการสอนปี 1)**
4. **Actionable CQI Recommendations (มาตรการระดับหลักสูตรตามเกณฑ์ AUN-QA)**

${style}`
  }
  if (mode === 'case_diagnostic') {
    return `Diagnose this specific departure case and provide:
1. **Root Cause Analysis (การวินิจฉัยสาเหตุแท้จริง)**
2. **Advisor Intervention Feasibility (การประเมินแนวทางช่วยเหลือ)**
3. **Re-entry & Retention Recommendation (ข้อเสนอแนะสู่อาจารย์ที่ปรึกษาและหลักสูตร)**

${style}`
  }
  return `Answer the Program Chair query:
"${query || ''}"

${style}`
}

const INSTRUCTIONS_STORAGE_PREFIX = 'advising_log_ai_instructions_'

/** Saved instruction edits (summary & case modes only; chat instructions contain the question) */
export function getStoredAiInstructions(mode: AIAnalysisMode): string | null {
  if (mode === 'chat_query') return null
  try {
    return localStorage.getItem(INSTRUCTIONS_STORAGE_PREFIX + mode)
  } catch {
    return null
  }
}

export function setStoredAiInstructions(mode: AIAnalysisMode, instructions: string | null): void {
  if (mode === 'chat_query') return
  try {
    if (instructions && instructions.trim() && instructions !== getDefaultAiInstructions(mode)) {
      localStorage.setItem(INSTRUCTIONS_STORAGE_PREFIX + mode, instructions)
    } else {
      localStorage.removeItem(INSTRUCTIONS_STORAGE_PREFIX + mode)
    }
  } catch {}
}

/**
 * Builds the locked parts of the prompt: role & privacy rules, and the de-identified case data.
 * Student codes/IDs are replaced by a sequential case number (PDPA).
 */
export function buildLockedPromptParts(req: AIAnalysisRequest): { systemInstruction: string; caseData: string } {
  const lang = req.language || 'th'

  const systemInstruction = `You are a Higher Education Quality Assurance (QA) and Student Retention specialist advising the Program Chair under AUN-QA Criteria 6 & 8.
All student names and IDs have been removed for PDPA compliance. Never attempt to identify individual students.
Analyze qualitative departure data with empathy and academic rigor, using only the case data provided.
Respond in ${lang === 'th' ? 'Thai' : 'English'}.`

  const caseData = req.cases.map((c, idx) => {
    return `Case #${idx + 1} [Year: ${c.academicYear || 'N/A'} | Type: ${c.exitType} | Reason: ${c.reasonCode}]
- Student Stated Reason: "${c.details || 'N/A'}"
- Advisor Assessment: "${c.advisorAssessment || 'N/A'}"
- Student Voice Feedback: "${c.studentVoiceFeedback || 'N/A'}"`
  }).join('\n\n')

  return { systemInstruction, caseData }
}

/**
 * Single source of truth for the exact prompt sent to any LLM.
 * Shown to the user for review before every analysis, then sent verbatim.
 */
export function buildAiPrompt(req: AIAnalysisRequest): AIPrompt {
  const mode = req.mode || 'strategic_synthesis'
  const { systemInstruction, caseData } = buildLockedPromptParts(req)
  const instructions = (req.customInstructions?.trim()
    ? req.customInstructions.trim()
    : getDefaultAiInstructions(mode, req.query)
  ).slice(0, MAX_AI_INSTRUCTIONS_CHARS)

  const userPrompt = `Student departure cases (de-identified):
${caseData || '(no cases)'}

Instructions:
${instructions}`

  return { systemInstruction, userPrompt }
}

/**
 * Describes where a request will be processed, for the pre-analysis prompt review.
 */
export function describeAiDestination(req: AIAnalysisRequest): { label: string } {
  if (getStoredAiKeySource() === 'custom') {
    const providerId = req.providerId || getStoredAiProvider()
    const preset = AI_PROVIDER_PRESETS[providerId]
    const model = req.customModel || getStoredCustomModel() || preset?.defaultModel
    return { label: `${preset?.name || providerId} (${model})` }
  }
  return { label: 'Default API key (set by Admin)' }
}

// Errors only the Admin can fix: the message tells the user how to contact them
const ADMIN_FIXABLE_ERRORS = new Set(['AI_API_DISABLED', 'USER_AI_ACCESS_DENIED', 'NO_DEFAULT_API_KEY', 'GEMINI_API_ERROR'])

/**
 * Call the AI LLM service for QA qualitative synthesis
 */
export async function analyzeWithLLM(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const res = await requestAnalysis(req)
  if (!res.success && res.error && ADMIN_FIXABLE_ERRORS.has(res.error)) {
    const email = getAdminContactEmail()
    res.analysis += (req.language || 'th') === 'th'
      ? `\n\n📧 ติดต่อผู้ดูแลระบบ: ${email}`
      : `\n\n📧 Contact the Admin: ${email}`
  }
  return res
}

async function requestAnalysis(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const keySource = req.apiKey !== undefined ? 'custom' : getStoredAiKeySource()
  const lang = req.language || 'th'
  const mode = req.mode || 'strategic_synthesis'

  const effectiveProv = req.providerId || getStoredAiProvider()
  const userApiKey = req.apiKey !== undefined
    ? req.apiKey
    : (keySource === 'custom' ? getStoredApiKeyForProvider(effectiveProv) : undefined)
  const { systemInstruction, userPrompt: prompt } = buildAiPrompt(req)

  // 1. Check Master Switch (System-Wide)
  if (!isSystemAiEnabled()) {
    return {
      success: false,
      provider: 'System Admin Disabled',
      mode,
      analysis: lang === 'th'
        ? '⚠️ ระบบบริการ AI / LLM ถูกปิดการใช้งานชั่วคราวโดยผู้ดูแลระบบ (AI API Disabled by System Administrator)\n\nหากต้องการใช้งานฟังก์ชัน AI Qualitative Synthesis กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสวิตช์ใช้งานในหน้า Admin Console'
        : '⚠️ AI / LLM service is currently disabled by the System Administrator.\n\nPlease contact your system administrator to re-enable AI services in the Admin Console.',
      error: 'AI_API_DISABLED',
      timestamp: new Date().toISOString(),
      note: 'Admin toggled AI API off',
    }
  }

  // 2. Check Per-User Granular Authorization
  if (req.userHasAiAccess === false) {
    return {
      success: false,
      provider: 'Access Denied',
      mode,
      analysis: lang === 'th'
        ? '⚠️ บัญชีของคุณไม่ได้รับสิทธิ์เข้าถึงระบบ AI จากผู้ดูแลระบบ (Individual AI Access Revoked)\n\nกรุณาติดต่อผู้ดูแลระบบหลักสูตรเพื่อขออนุมัติเปิดสิทธิ์ใช้งาน AI รายบุคคล'
        : '⚠️ Your account does not have individual access privileges to the AI system.\n\nPlease contact the System Administrator to request per-user AI authorization.',
      error: 'USER_AI_ACCESS_DENIED',
      timestamp: new Date().toISOString(),
      note: 'User hasAiAccess is false',
    }
  }

  // A personal key must be sent only to the provider it belongs to — never to the
  // system gateway, which would treat it as a Gemini key and silently fall back.
  if (keySource === 'custom' && (!userApiKey || userApiKey.trim().length <= 5)) {
    return {
      success: false,
      provider: AI_PROVIDER_PRESETS[effectiveProv]?.name || effectiveProv,
      mode,
      analysis: lang === 'th'
        ? '⚠️ ยังไม่ได้ใส่คีย์ API ของคุณ กรุณาเพิ่มในเมนู "คีย์ API"'
        : '⚠️ No API key set. Please add your key under "API Key".',
      error: 'PERSONAL_KEY_MISSING',
      timestamp: new Date().toISOString(),
    }
  }

  // 1. System Gateway: Backend Hono API (Cloudflare Workers) with the admin-managed key
  if (keySource === 'system') {
    try {
      const backendUrl = 'http://localhost:8787/api/qa/ai-analyze'
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          cases: req.cases,
          query: req.query,
          language: lang,
          systemInstruction,
          userPrompt: prompt,
        }),
      })

      const data = await res.json().catch(() => null) as AIAnalysisResponse | null
      if (data && typeof data.analysis === 'string') {
        return data
      }
      return aiError(mode, 'Default API key', 'BACKEND_ERROR', lang === 'th'
        ? `⚠️ เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ${res.status}) กรุณาลองใหม่อีกครั้ง`
        : `⚠️ The server returned an error (HTTP ${res.status}). Please try again.`)
    } catch (_err) {
      return aiError(mode, 'Default API key', 'BACKEND_UNREACHABLE', lang === 'th'
        ? '⚠️ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่'
        : '⚠️ Could not reach the server. Please check that the backend is running.')
    }
  }

  // 2. Multi-Provider Direct Dispatch (Personal Key)
  if (userApiKey && userApiKey.length > 5) {
    const providerId = effectiveProv
    const customModel = req.customModel || getStoredCustomModel()

    try {
      // 2A. Google Gemini Provider
      if (providerId === 'gemini') {
        const targetModel = customModel || 'gemini-1.5-flash'
        const candidateEndpoints = [
          `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`,
          `https://generativelanguage.googleapis.com/v1/models/${targetModel}:generateContent`,
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        ]

        let lastErrorMsg = ''
        for (const endpoint of candidateEndpoints) {
          try {
            const geminiUrl = `${endpoint}?key=${encodeURIComponent(userApiKey.trim())}`
            const geminiRes = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 2048,
                },
              }),
            })

            if (geminiRes.ok) {
              const data = await geminiRes.json() as any
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                const match = endpoint.match(/models\/([^:]+)/)
                const modelTag = match ? match[1] : targetModel
                return {
                  success: true,
                  provider: `Google Gemini (${modelTag})`,
                  mode,
                  analysis: text,
                  timestamp: new Date().toISOString(),
                }
              }
            } else {
              try {
                const errData = await geminiRes.json() as any
                lastErrorMsg = errData?.error?.message || `HTTP ${geminiRes.status}: ${geminiRes.statusText}`
              } catch {
                lastErrorMsg = `HTTP ${geminiRes.status}: ${geminiRes.statusText}`
              }
            }
          } catch (fetchErr: any) {
            lastErrorMsg = fetchErr?.message || 'Network error'
          }
        }

        return {
          success: false,
          provider: `Google Gemini (${targetModel})`,
          mode,
          analysis: `Gemini API Error: ${lastErrorMsg || 'Request failed. Please verify your Google AI Studio API key.'}`,
          error: 'GEMINI_API_ERROR',
          timestamp: new Date().toISOString(),
        }
      }

      // 2B. Anthropic Claude Provider
      if (providerId === 'claude') {
        const model = customModel || 'claude-sonnet-5-5'
        try {
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': userApiKey.trim(),
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              system: systemInstruction,
              messages: [{ role: 'user', content: prompt }],
            }),
          })
          if (claudeRes.ok) {
            const data = await claudeRes.json() as any
            const text = data?.content?.[0]?.text
            if (text) {
              return {
                success: true,
                provider: `Anthropic Claude (${model})`,
                mode,
                analysis: text,
                timestamp: new Date().toISOString(),
              }
            }
          } else {
            const errData = await claudeRes.json().catch(() => null) as any
            const errMsg = errData?.error?.message || `HTTP ${claudeRes.status}: ${claudeRes.statusText}`
            return {
              success: false,
              provider: `Anthropic Claude (${model})`,
              mode,
              analysis: `Claude API Error: ${errMsg}`,
              error: 'CLAUDE_API_ERROR',
              timestamp: new Date().toISOString(),
            }
          }
        } catch (fetchErr: any) {
          return {
            success: false,
            provider: `Anthropic Claude (${model})`,
            mode,
            analysis: `Claude Connection Error: ${fetchErr?.message || 'Network error'}`,
            error: 'CLAUDE_NETWORK_ERROR',
            timestamp: new Date().toISOString(),
          }
        }
      }

      // 2C. OpenAI / DeepSeek Endpoints
      if (providerId === 'openai' || providerId === 'deepseek') {
        const baseUrl = providerId === 'openai'
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://api.deepseek.com/v1/chat/completions'

        const brandLabel = providerId === 'openai' ? 'OpenAI' : 'DeepSeek AI'
        const defaultModel = providerId === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat'
        const model = customModel || defaultModel

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }
        if (userApiKey && userApiKey.trim() !== 'none') {
          headers['Authorization'] = `Bearer ${userApiKey.trim()}`
        }

        try {
          const openAiRes = await fetch(baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 2048,
            }),
          })

          if (openAiRes.ok) {
            const data = await openAiRes.json() as any
            const text = data?.choices?.[0]?.message?.content
            if (text) {
              return {
                success: true,
                provider: `${brandLabel} (${model})`,
                mode,
                analysis: text,
                timestamp: new Date().toISOString(),
              }
            }
          } else {
            const errData = await openAiRes.json().catch(() => null) as any
            const errMsg = errData?.error?.message || `HTTP ${openAiRes.status}: ${openAiRes.statusText}`
            return {
              success: false,
              provider: `${brandLabel} (${model})`,
              mode,
              analysis: `${brandLabel} API Error: ${errMsg}`,
              error: `${providerId.toUpperCase()}_API_ERROR`,
              timestamp: new Date().toISOString(),
            }
          }
        } catch (fetchErr: any) {
          return {
            success: false,
            provider: `${brandLabel} (${model})`,
            mode,
            analysis: `${brandLabel} Connection Error: ${fetchErr?.message || 'Network error'}`,
            error: `${providerId.toUpperCase()}_NETWORK_ERROR`,
            timestamp: new Date().toISOString(),
          }
        }
      }
    } catch (err: any) {
      return aiError(mode, AI_PROVIDER_PRESETS[providerId]?.name || providerId, 'AI_REQUEST_FAILED', `⚠️ ${err?.message || 'AI request failed'}`)
    }
  }

  // The provider answered but returned no text
  return aiError(mode, AI_PROVIDER_PRESETS[effectiveProv]?.name || effectiveProv, 'AI_EMPTY_RESPONSE', lang === 'th'
    ? '⚠️ AI ไม่ได้ส่งคำตอบกลับมา กรุณาลองใหม่อีกครั้ง'
    : '⚠️ The AI returned no answer. Please try again.')
}

function aiError(mode: string, provider: string, error: string, analysis: string): AIAnalysisResponse {
  return { success: false, provider, mode, analysis, error, timestamp: new Date().toISOString() }
}
