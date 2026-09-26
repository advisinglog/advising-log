import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'
import { exportAunQaExcelReport, exportQualitativeExcelReport } from './exportUtils'
import { mockUsers, mockExitCases, mockStudentVoiceResponses, mockAdvisorAssessments } from '@/data/mock-data'

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>()
  return {
    ...actual,
    default: {
      ...actual,
      writeFile: vi.fn(),
    },
    writeFile: vi.fn(),
  }
})

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports clean 4-sheet AUN-QA 4.0 Excel report strictly matching the PDF specification', () => {
    exportAunQaExcelReport({
      language: 'th',
      metrics: {
        totalRequests: 15,
        totalSessions: 12,
        totalFollowUps: 8,
        fuRate: 88,
        totalExitCases: 5,
        totalWarnings: 4,
        totalVoiceResponses: 6,
        avgCurriculum: '4.2',
        avgTeaching: '4.0',
        avgAdvisor: '4.8',
        avgServices: '4.1',
        avgOverall: '4.5',
      },
      categoryData: [
        { name: 'ทุนการศึกษา', count: 4, percentage: 27 },
        { name: 'ลงทะเบียนเรียน', count: 3, percentage: 20 },
      ],
      users: mockUsers,
      requests: [],
      exitCases: mockExitCases,
      studentVoiceResponses: mockStudentVoiceResponses,
      advisorAssessments: mockAdvisorAssessments,
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = vi.mocked(XLSX.writeFile).mock.calls[0]
    expect(filename).toMatch(/^AUN_QA_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toEqual([
      'Sheet 1 Executive Summary',
      'Sheet 2 Advising Service',
      'Sheet 3 Student Risk',
      'Sheet 4 Student Outcome',
    ])
  })

  it('exports clean 4-sheet AUN-QA report in English when language is en', () => {
    exportAunQaExcelReport({
      language: 'en',
      metrics: {
        totalRequests: 10,
        totalSessions: 8,
        totalFollowUps: 5,
        fuRate: 90,
        totalExitCases: 2,
        totalWarnings: 1,
        totalVoiceResponses: 3,
        avgCurriculum: '4.0',
        avgTeaching: '4.0',
        avgAdvisor: '5.0',
        avgServices: '4.0',
        avgOverall: '4.0',
      },
      users: mockUsers,
      requests: [],
      exitCases: mockExitCases,
      studentVoiceResponses: mockStudentVoiceResponses,
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = vi.mocked(XLSX.writeFile).mock.calls[0]
    expect(filename).toMatch(/^AUN_QA_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toHaveLength(4)
    expect(wb.SheetNames).toContain('Sheet 1 Executive Summary')
    expect(wb.SheetNames).toContain('Sheet 2 Advising Service')
    expect(wb.SheetNames).toContain('Sheet 3 Student Risk')
    expect(wb.SheetNames).toContain('Sheet 4 Student Outcome')
  })

  it('exports Qualitative Retention Audit Excel report cleanly', () => {
    exportQualitativeExcelReport({
      language: 'th',
      cases: mockExitCases,
      users: mockUsers,
      studentVoiceResponses: mockStudentVoiceResponses,
      advisorAssessments: mockAdvisorAssessments,
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = vi.mocked(XLSX.writeFile).mock.calls[0]
    expect(filename).toMatch(/^Qualitative_Retention_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('เจาะลึกสาเหตุการลาออก')
  })
})
