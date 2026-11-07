import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'
import { exportAunQaExcelReport, exportQualitativeExcelReport } from './exportUtils'
import { mockUsers, mockExitCases, mockStudentVoiceResponses, mockAdvisorAssessments } from '@/test/fixtures'

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

  it('exports AUN-QA Excel report with multiple sheets and triggers download', () => {
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
    expect(filename).toMatch(/^AUN_QA_4\.0_Advising_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('1. สรุปภาพรวมผู้บริหาร')
    expect(wb.SheetNames).toContain('2. บริการและอาจารย์ที่ปรึกษา')
    expect(wb.SheetNames).toContain('3. ความเสี่ยงและการดูแล')
    expect(wb.SheetNames).toContain('4. ผลลัพธ์และบริการสนับสนุน')
    expect(wb.SheetNames).toContain('5. เคสลาออกและลาพัก')
    expect(wb.SheetNames).toContain('6. เสียงสะท้อนนักศึกษา')
  })

  it('exports AUN-QA Excel report in English when language is en', () => {
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
    expect(filename).toMatch(/^AUN_QA_4\.0_Advising_Report_\d{8}_\d{4}\.xlsx$/)
    expect(wb.SheetNames).toContain('1. Executive Summary')
    expect(wb.SheetNames).toContain('2. Advising & Advisor')
    expect(wb.SheetNames).toContain('3. Risk & Intervention')
    expect(wb.SheetNames).toContain('4. Outcome & Support')
    expect(wb.SheetNames).toContain('5. Exit Cases')
    expect(wb.SheetNames).toContain('6. Student Voice')
  })

  it('preserves true zero counts in AUN-QA export without injecting fabricated numbers', () => {
    exportAunQaExcelReport({
      language: 'th',
      metrics: {
        totalRequests: 0,
        totalSessions: 0,
        totalFollowUps: 0,
        fuRate: 0,
        totalExitCases: 0,
        totalWarnings: 0,
        totalVoiceResponses: 0,
        avgCurriculum: '0',
        avgTeaching: '0',
        avgAdvisor: '0',
        avgServices: '0',
        avgOverall: '0',
      },
      categoryData: [],
      advisorWorkload: [],
      users: [],
      requests: [],
      exitCases: [],
      studentVoiceResponses: [],
      earlyWarnings: [],
    })

    expect(XLSX.writeFile).toHaveBeenCalledTimes(1)
    const [wb] = vi.mocked(XLSX.writeFile).mock.calls[0]
    const sheet3 = wb.Sheets['3. ความเสี่ยงและการดูแล']
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet3)
    const academicRow = rows.find(r => r['รายการตัวชี้วัด (Indicator)'] === 'Academic Risk (GPA ต่ำ)')
    expect(academicRow?.['ผลการดำเนินงาน']).toBe('0')
    const probationRow = rows.find(r => r['รายการตัวชี้วัด (Indicator)'] === 'Probation Case')
    expect(probationRow?.['ผลการดำเนินงาน']).toBe('0')
    const financialRow = rows.find(r => r['รายการตัวชี้วัด (Indicator)'] === 'Financial Risk')
    expect(financialRow?.['ผลการดำเนินงาน']).toBe('0')
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
    expect(wb.SheetNames).toContain('เจาะลึกสาเหตุการลาออก')
    expect(wb.SheetNames).toContain('สรุปมาตรการ AUN-QA')
  })
})
