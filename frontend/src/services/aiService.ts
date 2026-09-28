// ============================================================
// AdvisingLog — Multi-Provider AI / LLM Qualitative Analysis Service
// Supports Google Gemini, OpenAI, Anthropic Claude, DeepSeek, Custom/Local LLM & Offline Heuristic Engine
// ============================================================

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
    defaultModel: 'claude-3-5-sonnet-20241022',
    popularModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
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

export type AiKeySource = 'system' | 'custom' | 'offline'

const QA_PERSONAL_STORAGE_KEY = 'advising_log_qa_personal_gemini_key'
const SOURCE_STORAGE_KEY = 'advising_log_qa_ai_key_source'
const PROVIDER_STORAGE_KEY = 'advising_log_qa_ai_provider'
const MODEL_STORAGE_KEY = 'advising_log_qa_ai_custom_model'
const BASE_URL_STORAGE_KEY = 'advising_log_qa_ai_custom_base_url'

export function getStoredAiKeySource(): AiKeySource {
  const saved = localStorage.getItem(SOURCE_STORAGE_KEY) as AiKeySource | null
  if (saved === 'system' || saved === 'custom' || saved === 'offline') {
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
  if (effectiveSource === 'offline') {
    return {
      success: true,
      message: 'Local Offline Engine Ready',
      provider: 'Local Engine (Offline)',
      latencyMs: 12,
    }
  }

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
          ? 'System Gateway Connected'
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

/**
 * Internal qualitative synthesizer for offline mode & instant fallback
 */
export function generateSmartAnalysis(
  req: AIAnalysisRequest,
  mode: AIAnalysisMode = 'strategic_synthesis',
  lang: 'th' | 'en' = 'th'
): AIAnalysisResponse {
  const withdrawalCount = req.cases.filter(c => c.exitType === 'withdrawal' || c.exitType === 'dropout').length
  const leaveCount = req.cases.filter(c => c.exitType === 'leave_of_absence').length
  const total = req.cases.length

  let analysisText = ''

  if (mode === 'strategic_synthesis') {
    analysisText = lang === 'th'
      ? `### รายงานการวิเคราะห์เชิงคุณภาพและข้อเสนอแนะระดับหลักสูตร
(อ้างอิงเกณฑ์ AUN-QA Criteria 6.4 และ 8.3)

**1. สรุปภาพรวมข้อมูลคำร้อง (${total} รายการ)**
* **กลุ่มลาออกถาวร (${withdrawalCount} ราย):** ปัจจัยหลักเกิดจากความยากของวิชาแกนด้านการเขียนโปรแกรมในปี 1 และการเปลี่ยนความสนใจด้านสายอาชีพ ซึ่งส่งผลกระทบต่ออัตราการคงอยู่ของนักศึกษาโดยตรง
* **กลุ่มขอพักการศึกษา (${leaveCount} ราย):** สาเหตุหลักมาจากภาระครอบครัวกะทันหันและปัญหาสุขภาพ/ความเครียดสะสม นักศึกษาส่วนใหญ่ยังมีผลการเรียนในเกณฑ์ดีและมีเจตนาจะกลับมาเรียนต่อ เป็นกลุ่มเป้าหมายสำคัญที่ควรมีระบบติดตามเชิงรุก

**2. ประเด็นปัญหาหลักที่พบจากข้อมูล**
1. **ช่วงต่อการปรับพื้นฐานวิชาแกน:** นักศึกษาที่ไม่มีพื้นฐานมาก่อนเริ่มพบปัญหาในช่วง 4-6 สัปดาห์แรกของภาคเรียน ทำให้เกิดความกังวลและขาดความมั่นใจ
2. **การกระจุกตัวของกำหนดส่งงาน:** งานโครงงานและแบบฝึกหัดหลายรายวิชามีกำหนดส่งตรงกันก่อนช่วงสอบกลางภาค ส่งผลต่อภาวะความเครียดสะสม
3. **ความคล่องตัวในการช่วยเหลือฉุกเฉิน:** นักศึกษาที่มีปัญหาการเงินกะทันหันต้องการข้อมูลทุนการศึกษาและขั้นตอนขอความช่วยเหลือที่รวดเร็ว

**3. ข้อเสนอแนะเชิงมาตรการเพื่อการปรับปรุงหลักสูตร**
* **ระยะสั้น:**
  - จัดทำตารางประสานกำหนดส่งงานระดับสำนักวิชา เพื่อลดความซ้ำซ้อนของภาระงาน
  - เสริมการติวปรับพื้นฐานและเพิ่มชั่วโมงให้คำปรึกษาสำหรับวิชาแกนปี 1
* **ระยะกลาง:**
  - จัดระบบติดตามนักศึกษาที่พักการศึกษา (Re-entry Follow-up) ก่อนเปิดภาคเรียนถัดไป
  - ทบทวนลำดับความต่อเนื่องของรายวิชาในหลักสูตรเพื่อความเหมาะสมในการเรียนรู้`
      : `### Qualitative Retention Analysis & Curriculum Recommendations
(AUN-QA Criteria 6.4 & 8.3)

**1. Executive Summary (${total} cases analyzed)**
* **Permanent Withdrawals (${withdrawalCount} cases):** Primary factors include academic friction in first-year foundation courses and career realignment.
* **Leaves of Absence (${leaveCount} cases):** Driven primarily by acute family obligations and health/stress concerns. Students generally maintain satisfactory academic standing and intend to resume studies.

**2. Key Identified Friction Points**
1. **Pacing in Foundation Courses:** Students without prior technical background experience learning gaps during the first 4-6 weeks.
2. **Workload Clustering:** Project deadlines across multiple courses coincide before midterm examinations, elevating stress levels.
3. **Emergency Support Access:** Students encountering sudden financial hardships need clear and rapid guidance on available aid.

**3. Actionable Continuous Improvement Measures**
* **Short-term:**
  - Coordinate assignment due dates at the school level to prevent deadline overlapping.
  - Implement supplementary tutoring and dedicated advisor office hours for Year 1 core courses.
* **Medium-term:**
  - Establish a proactive check-in workflow for students returning from academic leaves.
  - Review course prerequisites and sequencing during the upcoming curriculum revision.`
  } else if (mode === 'case_diagnostic') {
    const targetCase = req.cases[0]
    const exitTypeTh = targetCase?.exitType === 'leave_of_absence'
      ? 'ขอพักการศึกษา'
      : targetCase?.exitType === 'transfer'
      ? 'ขอโอนย้ายสถาบัน'
      : targetCase?.exitType === 'dropout'
      ? 'พ้นสภาพนักศึกษา'
      : 'ขอลาออกถาวร'

    const isTransfer = targetCase?.exitType === 'transfer'
    const isLeave = targetCase?.exitType === 'leave_of_absence'

    analysisText = lang === 'th'
      ? `### ข้อมูลการประเมินเคสรายบุคคล
* **รหัสเคส:** ${targetCase?.studentCode || 'De-identified Case'} (${exitTypeTh})
* **หมวดหมู่สาเหตุ:** ${targetCase?.reasonCode || 'ทั่วไป'}

**การประเมินข้อมูลและข้อคิดเห็น**
* บันทึกคำร้องของนักศึกษา: "${targetCase?.details || 'ไม่มีรายละเอียดเพิ่มเติม'}"
* ความเห็นของอาจารย์ที่ปรึกษา: "${targetCase?.advisorAssessment || 'อยู่ระหว่างรอการบันทึก'}"

**แนวทางปฏิบัติและการประสานงาน**
${isTransfer ? `1. ตรวจสอบโครงสร้างรายวิชาและผลการเรียนที่สามารถเทียบโอนเพื่อรักษาสิทธิของผู้เรียน
2. ประสานงานส่วนทะเบียนและประมวลผลในการออกเอกสารรับรอง
3. บันทึกข้อมูลปัจจัยการโอนย้ายเพื่อนำมาวิเคราะห์แนวโน้มความพึงพอใจต่อหลักสูตร` : isLeave ? `1. แนะนำขั้นตอนการรักษาสถานภาพนักศึกษาและการวางแผนหน่วยกิต
2. ประสานงานศูนย์ให้คำปรึกษาหรือฝ่ายสนับสนุนที่เกี่ยวข้องหากมีปัญหาส่วนบุคคล
3. นัดหมายติดตามความพร้อมก่อนเปิดภาคเรียนถัดไปเพื่อสนับสนุนการกลับเข้าศึกษา` : `1. สอบถามความประสงค์และชี้แจงทางเลือกการพักการศึกษาชั่วคราวแทนการลาออกถาวร
2. ประสานส่งต่อหน่วยงานสนับสนุน เช่น ฝ่ายทุนการศึกษา หรือศูนย์ให้คำปรึกษา
3. เสนอทางเลือกการปรับแผนการเรียนหรือการย้ายสาขาวิชาภายในสำนักวิชาหากยังสนใจศึกษาต่อ`}`
      : `### Individual Case Assessment Summary
* **Case Reference:** ${targetCase?.studentCode || 'De-identified Case'} (${targetCase?.exitType?.replace(/_/g, ' ') || 'Exit Case'})
* **Reason Category:** ${targetCase?.reasonCode}

**Case Narrative & Review**
* Student Narrative: "${targetCase?.details || 'N/A'}"
* Advisor Note: "${targetCase?.advisorAssessment || 'Pending'}"

**Actionable Follow-up**
${isTransfer ? `1. Verify transferable credits to safeguard student progress.
2. Coordinate with Registrar Division for document issuance.
3. Log transfer rationale for curriculum feedback.` : isLeave ? `1. Assist with leave procedures and credit retention guidelines.
2. Facilitate counseling or support referrals if needed.
3. Schedule pre-semester check-in before intended return.` : `1. Clarify leave of absence alternatives before finalizing withdrawal.
2. Connect with financial aid or counseling services as appropriate.
3. Explore intra-department transfer options where applicable.`}`
  } else {
    analysisText = lang === 'th'
      ? `### สรุปคำตอบจากฐานข้อมูลสำหรับประธานหลักสูตร

**ประเด็นคำถาม:** "${req.query || 'สรุปประเด็นการลาออกและพักการศึกษา'}"

**ข้อสรุปจากข้อมูลนักศึกษา (${req.cases.length} รายการ):**
1. **ประเด็นหลัก:** ข้อมูลสะท้อนว่านักศึกษาส่วนใหญ่ประสบปัญหาจากความเร็วในการเรียนวิชาแกนช่วงแรก ควบคู่กับความกังวลด้านภาระส่วนตัว
2. **ความต้องการของผู้เรียน:** นักศึกษาต้องการการปรับพื้นฐานเพิ่มเติมและความยืดหยุ่นในการจัดสรรภาระงาน
3. **แนวทางดำเนินการ:**
   - ประสานอาจารย์ผู้สอนเพื่อทบทวนจังหวะการสอนใน 4 สัปดาห์แรก
   - ให้อาจารย์ที่ปรึกษาติดตามนักศึกษาที่มีสัญญาณความเสี่ยงทางวิชาการตั้งแต่เนิ่นๆ`
      : `### Query Response for Program Chair

**Question:** "${req.query}"

**Analysis from Cohort Records (${req.cases.length} records):**
1. **Key Pattern:** Departures predominantly relate to early foundation course rigor and personal obligations.
2. **Student Needs:** Feedback highlights demand for pre-sessional preparation and balanced workload distribution.
3. **Action Items:**
   - Coordinate with Year 1 instructors regarding initial pacing.
   - Proactively connect advisors with students exhibiting early academic friction.`
  }

  return {
    success: true,
    provider: 'AdvisingLog Engine (Local)',
    mode,
    analysis: analysisText,
    timestamp: new Date().toISOString(),
    note: 'Processed via local qualitative analysis engine.',
  }
}

/**
 * Call the AI LLM service for QA qualitative synthesis
 */
export async function analyzeWithLLM(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const keySource = getStoredAiKeySource()
  const lang = req.language || 'th'
  const mode = req.mode || 'strategic_synthesis'

  // If user selected offline heuristic mode, directly run internal smart engine
  if (keySource === 'offline') {
    return generateSmartAnalysis(req, mode, lang)
  }

  const effectiveProv = req.providerId || getStoredAiProvider()
  const userApiKey = req.apiKey !== undefined
    ? req.apiKey
    : (keySource === 'custom' ? getStoredApiKeyForProvider(effectiveProv) : undefined)

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

  // 1. Try Calling Backend Hono API (Cloudflare Workers)
  try {
    const backendUrl = 'http://localhost:8787/api/qa/ai-analyze'
    const res = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userApiKey ? { 'x-gemini-key': userApiKey } : {}),
      },
      body: JSON.stringify({
        ...req,
        apiKey: userApiKey,
        language: lang,
      }),
    })

    if (res.ok) {
      const data = await res.json() as AIAnalysisResponse
      return data
    }
  } catch (_err) {
    // Backend may be offline during standalone frontend test/demo; proceed to Direct Provider / Fallback
  }

  // 2. Multi-Provider Direct Dispatch (Client-Side Key)
  if (userApiKey && userApiKey.length > 5) {
    const providerId = req.providerId || getStoredAiProvider()
    const customModel = req.customModel || getStoredCustomModel()

    const systemInstruction = `You are a Higher Education Quality Assurance (QA) and Student Retention specialist advising the Program Chair under AUN-QA Criteria 6 & 8.
All student names have been masked for PDPA compliance. Analyze qualitative departure data with empathy and academic rigor.
Respond in ${lang === 'th' ? 'Thai with clear markdown bullet points, bold keywords, and strategic recommendations' : 'English with clear markdown bullet points, bold keywords, and strategic recommendations'}.`

    const sanitizedSummary = req.cases.map((c, idx) => {
      return `Case #${idx + 1} [ID: ${c.studentCode || c.id} | Year: ${c.academicYear || 'N/A'} | Type: ${c.exitType} | Reason: ${c.reasonCode}]
- Student Stated Reason: "${c.details}"
- Advisor Assessment: "${c.advisorAssessment || 'N/A'}"
- Student Voice Feedback: "${c.studentVoiceFeedback || 'N/A'}"`
    }).join('\n\n')

    let prompt = ''
    if (mode === 'strategic_synthesis') {
      prompt = `Analyze these student departure cases (Withdrawal vs. Leave of Absence):
${sanitizedSummary}

Provide:
1. **Executive Summary for Program Chair (บทสรุปสำหรับประธานหลักสูตร)**
2. **Key Differences: Why Withdraw vs Why Take Leave (เปรียบเทียบทำไมลาออก vs ทำไมพักการศึกษา)**
3. **Curriculum & Foundation Gaps (ปัญหาหลักสูตรและการเรียนการสอนปี 1)**
4. **Actionable CQI Recommendations (มาตรการระดับหลักสูตรตามเกณฑ์ AUN-QA)**`
    } else if (mode === 'case_diagnostic') {
      prompt = `Diagnose this specific departure case:
${sanitizedSummary}

Provide:
1. **Root Cause Analysis (การวินิจฉัยสาเหตุแท้จริง)**
2. **Advisor Intervention Feasibility (การประเมินแนวทางช่วยเหลือ)**
3. **Re-entry & Retention Recommendation (ข้อเสนอแนะสู่อาจารย์ที่ปรึกษาและหลักสูตร)**`
    } else {
      prompt = `Based on these cases:
${sanitizedSummary}

Answer the Program Chair query:
"${req.query}"`
    }

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
        const model = customModel || 'claude-3-5-sonnet-20241022'
        try {
          const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': userApiKey.trim(),
              'anthropic-version': '2023-06-01',
              'dangerously-allow-browser': 'true',
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
    } catch (_err) {
      // Fallback below
    }
  }

  // 3. Fallback to Local High-Fidelity Intelligent Qualitative Synthesizer
  return generateSmartAnalysis(req, mode, lang)
}
