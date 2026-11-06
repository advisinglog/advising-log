import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  analyzeWithLLM,
  buildAiPrompt,
  getStoredGeminiKey,
  setStoredGeminiKey,
  setStoredAiKeySource,
  clearStoredGeminiKey,
  type AIAnalysisPayloadCase,
} from './services/aiService'

describe('aiService (LLM Qualitative Retention Analysis)', () => {
  const sampleCases: AIAnalysisPayloadCase[] = [
    {
      id: 'EXIT001',
      studentCode: '6631503001',
      academicYear: 'Year 1',
      exitType: 'withdrawal',
      reasonCode: 'academic',
      details: 'Programming was too fast for beginners',
    },
  ]

  beforeEach(() => {
    clearStoredGeminiKey()
    setStoredAiKeySource('system')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds a de-identified prompt without student codes', () => {
    const { systemInstruction, userPrompt } = buildAiPrompt({
      mode: 'case_diagnostic',
      cases: [{ id: 'EXIT001', studentCode: '6631503001', exitType: 'withdrawal', reasonCode: 'academic', details: 'Too fast' }],
      language: 'en',
    })
    expect(systemInstruction).toContain('AUN-QA')
    expect(userPrompt).toContain('Case #1')
    expect(userPrompt).toContain('Too fast')
    expect(userPrompt).not.toContain('6631503001')
    expect(userPrompt).not.toContain('EXIT001')
  })

  it('uses edited instructions but keeps privacy rules and case data locked', () => {
    const cases = [{ id: 'EXIT001', studentCode: '6631503001', exitType: 'withdrawal', reasonCode: 'academic', details: 'Too fast' }]
    const edited = buildAiPrompt({ mode: 'strategic_synthesis', cases, language: 'en', customInstructions: 'Only list 2 recommendations.' })
    expect(edited.userPrompt).toContain('Only list 2 recommendations.')
    expect(edited.userPrompt).not.toContain('Executive Summary')
    expect(edited.userPrompt).toContain('Too fast')
    expect(edited.systemInstruction).toContain('PDPA')

    const fallback = buildAiPrompt({ mode: 'strategic_synthesis', cases, language: 'en', customInstructions: '   ' })
    expect(fallback.userPrompt).toContain('Executive Summary')
  })

  it('stores, retrieves, and clears Gemini API key in localStorage', () => {
    expect(getStoredGeminiKey()).toBe('')

    setStoredGeminiKey('AIzaSyTestKey12345')
    expect(getStoredGeminiKey()).toBe('AIzaSyTestKey12345')

    clearStoredGeminiKey()
    expect(getStoredGeminiKey()).toBe('')
  })

  it('returns the backend AI analysis and sends the reviewed, de-identified prompt', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true, provider: 'Google Gemini', mode: 'strategic_synthesis', analysis: 'REAL AI ANSWER', timestamp: 'now',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await analyzeWithLLM({ mode: 'strategic_synthesis', cases: sampleCases, language: 'en' })

    expect(result.success).toBe(true)
    expect(result.analysis).toBe('REAL AI ANSWER')
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    // Only the parts are sent; the server rebuilds the prompt. No finished prompt, no student codes.
    expect(body).not.toHaveProperty('userPrompt')
    expect(body).not.toHaveProperty('systemInstruction')
    expect(body.instructions).toContain('Executive Summary')
    expect(body.cases[0].details).toContain('Programming was too fast')
    expect(JSON.stringify(body)).not.toContain('6631503001')
  })

  // backend/src/index.test.ts pins the same text for the server-side builder: change both together
  it('builds exactly the prompt the server rebuilds', () => {
    const { systemInstruction, userPrompt } = buildAiPrompt({
      mode: 'chat_query',
      language: 'en',
      cases: [{ id: 'EXIT9', studentCode: '6600000000', academicYear: 'Year 1', exitType: 'withdrawal', reasonCode: 'financial', details: 'Cannot pay fees' }],
      customInstructions: 'List the top 3 causes.',
    })
    expect(systemInstruction).toBe(`You are a Higher Education Quality Assurance (QA) and Student Retention specialist advising the Program Chair under AUN-QA Criteria 6 & 8.
All student names and IDs have been removed for PDPA compliance. Never attempt to identify individual students.
Analyze qualitative departure data with empathy and academic rigor, using only the case data provided.
Respond in English.`)
    expect(userPrompt).toBe(`Student departure cases (de-identified):
Case #1 [Year: Year 1 | Type: withdrawal | Reason: financial]
- Student Stated Reason: "Cannot pay fees"
- Advisor Assessment: "N/A"
- Student Voice Feedback: "N/A"

Instructions:
List the top 3 causes.`)
  })

  it('returns an explicit error, not canned text, when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const result = await analyzeWithLLM({ mode: 'strategic_synthesis', cases: sampleCases, language: 'en' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('BACKEND_UNREACHABLE')
    expect(result.analysis).toContain('Could not reach the server')
  })

  it('passes backend errors through (e.g. no default API key)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false, provider: 'Default API key', mode: 'chat_query', analysis: 'No default API key is set.', error: 'NO_DEFAULT_API_KEY', timestamp: 'now',
    }), { status: 200 })))

    const result = await analyzeWithLLM({ mode: 'chat_query', cases: sampleCases, query: 'Why?', language: 'en' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NO_DEFAULT_API_KEY')
    expect(result.analysis).toContain('Contact the Admin: se.advisinglog@gmail.com')
  })

  it('asks for a key when "My own API key" is selected without one', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    setStoredAiKeySource('custom')

    const result = await analyzeWithLLM({ mode: 'strategic_synthesis', cases: sampleCases, language: 'en' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('PERSONAL_KEY_MISSING')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends a personal key straight to its provider, never to the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'GEMINI ANSWER' }] } }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    setStoredAiKeySource('custom')
    setStoredGeminiKey('AIzaSyTestKey12345')

    const result = await analyzeWithLLM({ mode: 'strategic_synthesis', cases: sampleCases, providerId: 'gemini', language: 'en' })

    expect(result.success).toBe(true)
    expect(result.analysis).toBe('GEMINI ANSWER')
    expect(String(fetchMock.mock.calls[0][0])).toContain('generativelanguage.googleapis.com')
    expect(fetchMock.mock.calls.every(c => !String(c[0]).includes('localhost:8787'))).toBe(true)
  })
})
