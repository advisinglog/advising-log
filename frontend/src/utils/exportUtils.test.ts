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

  it('exports AUN-QA 4.0 Excel report with 4 standard sheets and supplementary sheets in Thai', () => {
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
        { name: 'การเรียนและผลการศึกษา', count: 7, percentage: 47 },
        { name: 'ทุนการศึกษาและเอกสาร', count: 4, percentage: 27 },
      ],
      advisorWorkload: [
        { name: 'Dr. Prasit', requests: 8, sessions: 6, students: 10 },
      ],
      users: mockUsers,
      requests: [],
      exitCases: mockExitCases,
      studentVoiceResponses: mockStudentVoiceResponses,
      advisorAssessments: mockAdvisorAssessments,
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = vi.mocked(XLSX.writeFile).mock.calls[0]
    expect(filename).toMatch(/^AUN_QA_Advising_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('1. สรุปผู้บริหาร (Exec)')
    expect(wb.SheetNames).toContain('2. บริการและภาระงาน')
    expect(wb.SheetNames).toContain('3. ภาวะเสี่ยงและช่วยเหลือ')
    expect(wb.SheetNames).toContain('4. ผลลัพธ์และเสียงสะท้อน')
    expect(wb.SheetNames).toContain('5. เคสลาออก-ลาพัก')
    expect(wb.SheetNames).toContain('6. เสียงสะท้อน นศ.')
  })

  it('exports AUN-QA 4.0 Excel report in English when language is en', () => {
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
    expect(filename).toMatch(/^AUN_QA_Advising_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('1. Executive Summary')
    expect(wb.SheetNames).toContain('2. Advising & Workload')
    expect(wb.SheetNames).toContain('3. Risk & Intervention')
    expect(wb.SheetNames).toContain('4. Outcomes & Voice')
    expect(wb.SheetNames).toContain('5. Exit Cases')
    expect(wb.SheetNames).toContain('6. Student Voice')
  })

  it('exports Qualitative Retention Audit Excel report with case explorer and CQI sheets', () => {
    exportQualitativeExcelReport({
      language: 'th',
      cases: mockExitCases,
      users: mockUsers,
      studentVoiceResponses: mockStudentVoiceResponses,
      advisorAssessments: mockAdvisorAssessments,
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb, filename] = vi.mocked(XLSX.writeFile).mock.calls[0]
    expect(filename).toMatch(/^Qualitative_Retention_Diagnostic_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('1. เจาะลึกสาเหตุลาออก')
    expect(wb.SheetNames).toContain('2. สรุปมาตรการ CQI')
  })
})
