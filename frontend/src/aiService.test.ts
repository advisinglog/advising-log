import { describe, it, expect, beforeEach } from 'vitest'
import {
  analyzeWithLLM,
  getStoredGeminiKey,
  setStoredGeminiKey,
  clearStoredGeminiKey,
  type AIAnalysisPayloadCase,
} from './services/aiService'

describe('aiService (LLM Qualitative Retention Analysis)', () => {
  beforeEach(() => {
    clearStoredGeminiKey()
  })

  it('stores, retrieves, and clears Gemini API key in localStorage', () => {
    expect(getStoredGeminiKey()).toBe('')

    setStoredGeminiKey('AIzaSyTestKey12345')
    expect(getStoredGeminiKey()).toBe('AIzaSyTestKey12345')

    clearStoredGeminiKey()
    expect(getStoredGeminiKey()).toBe('')
  })

  it('performs strategic synthesis using the smart offline qualitative engine when no key is set', async () => {
    const mockCases: AIAnalysisPayloadCase[] = [
      {
        id: 'EXIT001',
        studentCode: '6631503001',
        academicYear: 'Year 1',
        exitType: 'withdrawal',
        reasonCode: 'academic',
        details: 'Programming was too fast for beginners without prior tech experience',
        advisorAssessment: 'Foundation gap in algorithms',
        studentVoiceFeedback: 'Needs pre-sessional boot camp',
      },
      {
        id: 'EXIT002',
        studentCode: '6531503002',
        academicYear: 'Year 2',
        exitType: 'leave_of_absence',
        reasonCode: 'personal_family',
        details: 'Family caregiving emergency',
        advisorAssessment: 'Temporary leave, intends to return',
        studentVoiceFeedback: 'Will return next semester',
      },
    ]

    const result = await analyzeWithLLM({
      mode: 'strategic_synthesis',
      cases: mockCases,
      language: 'th',
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('strategic_synthesis')
    expect(result.analysis).toContain('AUN-QA')
    expect(result.analysis).toContain('กลุ่มลาออกถาวร')
    expect(result.analysis).toContain('กลุ่มขอพักการศึกษา')
  })

  it('responds to interactive AI chat queries with qualitative insights', async () => {
    const mockCases: AIAnalysisPayloadCase[] = [
      {
        id: 'EXIT001',
        exitType: 'withdrawal',
        reasonCode: 'academic',
        details: 'Found code syntax difficult',
      },
    ]

    const result = await analyzeWithLLM({
      mode: 'chat_query',
      cases: mockCases,
      query: 'ทำไมเด็กถึงหมดไฟ?',
      language: 'th',
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('chat_query')
    expect(result.analysis).toContain('ทำไมเด็กถึงหมดไฟ?')
  })

  it('generates case diagnostic evaluation for an individual departure case', async () => {
    const singleCase: AIAnalysisPayloadCase = {
      id: 'EXIT001',
      studentCode: '6631503001',
      academicYear: 'Year 1',
      exitType: 'withdrawal',
      reasonCode: 'academic',
      details: 'Pacing too rapid in programming core courses',
      advisorAssessment: 'Struggled with loops and functions',
    }

    const result = await analyzeWithLLM({
      mode: 'case_diagnostic',
      cases: [singleCase],
      language: 'th',
    })

    expect(result.success).toBe(true)
    expect(result.mode).toBe('case_diagnostic')
    expect(result.analysis).toContain('ข้อมูลการประเมินเคสรายบุคคล')
    expect(result.analysis).toContain('6631503001')
  })

  it('supports English synthesis when requested', async () => {
    const mockCases: AIAnalysisPayloadCase[] = [
      {
        id: 'EXIT001',
        exitType: 'withdrawal',
        reasonCode: 'academic',
        details: 'Foundation gap in coding',
      },
    ]

    const result = await analyzeWithLLM({
      mode: 'strategic_synthesis',
      cases: mockCases,
      language: 'en',
    })

    expect(result.success).toBe(true)
    expect(result.analysis).toContain('Qualitative Retention Analysis')
    expect(result.analysis).toContain('Permanent Withdrawals')
  })
})
