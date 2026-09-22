// ============================================================
// AdvisingLog — AUN-QA Excel Export Utility
// Professional Multi-Sheet Workbook Generation using SheetJS (XLSX)
// ============================================================

import * as XLSX from 'xlsx'
import type { ExitCase, StudentVoiceResponse, User, AdvisingRequest } from '@/types'
import { EXIT_TYPES, EXIT_REASON_CODES } from '@/types'

export interface AunQaExportOptions {
  language?: 'th' | 'en'
  metrics: {
    totalRequests: number
    totalSessions: number
    totalFollowUps: number
    fuRate: number
    totalExitCases: number
    totalWarnings: number
    totalVoiceResponses: number
    avgCurriculum: string
    avgTeaching: string
    avgAdvisor: string
    avgServices: string
    avgOverall: string
  }
  categoryData?: Array<{ name: string; count: number; percentage: number }>
  advisorWorkload?: Array<{ name: string; requests: number; sessions: number; students: number }>
  users: User[]
  requests: AdvisingRequest[]
  exitCases: ExitCase[]
  studentVoiceResponses: StudentVoiceResponse[]
  advisorAssessments?: Array<{ exitCaseId: string; assessment: string; recommendation?: string; resolution?: string }>
}

export interface QualitativeExportOptions {
  language?: 'th' | 'en'
  cases: ExitCase[]
  users: User[]
  studentVoiceResponses: StudentVoiceResponse[]
  advisorAssessments: Array<{
    exitCaseId: string
    assessment: string
    contributingFactors?: string
    actionsTaken?: string
    recommendation?: string
    resolution?: string
  }>
}

/**
 * Format timestamp for filenames: YYYYMMDD_HHmm
 */
function getFileTimestamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}_${hh}${mm}`
}

function getStatusText(status: string, language: 'th' | 'en'): string {
  const map: Record<string, { th: string; en: string }> = {
    open: { th: 'รอดำเนินการ', en: 'Open' },
    submitted: { th: 'ยื่นคำร้องแล้ว', en: 'Submitted' },
    under_review: { th: 'อยู่ระหว่างตรวจสอบ', en: 'Under Review' },
    advisor_reviewed: { th: 'อาจารย์ประเมินแล้ว', en: 'Advisor Reviewed' },
    chair_approved: { th: 'ประธานหลักสูตรอนุมัติ', en: 'Chair Approved' },
    resolved: { th: 'ยุติเคสแล้ว', en: 'Resolved' },
    closed: { th: 'ปิดเคสแล้ว', en: 'Closed' },
    completed: { th: 'เสร็จสมบูรณ์', en: 'Completed' },
    cancelled: { th: 'ยกเลิก', en: 'Cancelled' },
  }
  const item = map[status]
  if (!item) return status
  return language === 'th' ? item.th : item.en
}

function getExitTypeText(type: string, language: 'th' | 'en'): string {
  const item = EXIT_TYPES.find(e => e.value === type)
  if (!item) return type
  return language === 'th' ? item.labelTh : item.labelEn
}

function getExitReasonText(code: string, language: 'th' | 'en'): string {
  const item = EXIT_REASON_CODES.find(r => r.value === code)
  if (!item) return code
  return language === 'th' ? item.labelTh : item.labelEn
}

/**
 * Compute visual display width for Thai and Latin characters
 * Thai combining vowels/tone marks do not add horizontal width.
 */
function getStringDisplayWidth(str: string): number {
  if (!str) return 0
  const nonCombining = str.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '')
  let width = 0
  for (const ch of nonCombining) {
    const code = ch.charCodeAt(0)
    if (code >= 0x0E00 && code <= 0x0E7F) {
      width += 1.35
    } else if (code > 255) {
      width += 1.8
    } else {
      width += 1.0
    }
  }
  return Math.ceil(width)
}

/**
 * Format worksheet columns, row heights, and auto-filters
 */
function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, any>[]): void {
  if (!data || data.length === 0) return
  const keys = Object.keys(data[0])
  const colWidths = keys.map(key => {
    let maxLen = getStringDisplayWidth(key)
    for (const row of data) {
      const val = row[key]
      if (val !== null && val !== undefined) {
        const len = getStringDisplayWidth(String(val))
        if (len > maxLen) maxLen = Math.min(len, 60)
      }
    }

    if (key.includes('ลำดับ') || key === 'No.') {
      return { wch: 8 }
    }
    if (key.includes('รหัส') || key.includes('ID') || key.includes('Code')) {
      return { wch: Math.max(maxLen + 3, 14) }
    }
    if (key.includes('วันที่') || key.includes('Date')) {
      return { wch: Math.max(maxLen + 3, 15) }
    }
    if (key.includes('สถานะ') || key.includes('Status')) {
      return { wch: Math.max(maxLen + 3, 16) }
    }
    if (key.includes('หน่วยนับ') || key.includes('Unit')) {
      return { wch: Math.max(maxLen + 3, 12) }
    }
    if (key.includes('เกณฑ์') || key.includes('Criteria')) {
      return { wch: Math.max(maxLen + 3, 16) }
    }
    return { wch: Math.max(maxLen + 3, 14) }
  })
  ws['!cols'] = colWidths
  ws['!rows'] = [{ hpt: 25 }]

  if (ws['!ref']) {
    ws['!autofilter'] = { ref: ws['!ref'] }
  }
}

/**
 * Apply uniform left alignment across all worksheet cells (headers and data)
 * Ensuring all columns align to the left consistently in all spreadsheet viewers
 */
function formatWorksheet(ws: XLSX.WorkSheet, data: Record<string, any>[]): void {
  if (!ws['!ref'] || !data || data.length === 0) return

  autoFitColumns(ws, data)

  const range = XLSX.utils.decode_range(ws['!ref'])

  for (let R = range.s.r; R <= range.e.r; ++R) {
    const isHeader = R === range.s.r
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[cellAddress]
      if (!cell) continue

      // Convert numeric cells to string representation to guarantee strict left-alignment across all spreadsheet viewers
      if (!isHeader && cell.t === 'n') {
        cell.t = 's'
        cell.v = String(cell.v)
      }

      // Explicit left alignment for both headers and content
      cell.s = {
        font: isHeader ? { bold: true, name: 'Calibri' } : { name: 'Calibri' },
        alignment: {
          horizontal: 'left',
          vertical: 'center',
          wrapText: true,
        },
      }
    }
  }
}

/**
 * Export full AUN-QA accreditation report with multiple detailed sheets
 */
export function exportAunQaExcelReport(options: AunQaExportOptions): void {
  const { language = 'th', metrics, categoryData = [], advisorWorkload = [], users, exitCases, studentVoiceResponses, advisorAssessments = [] } = options
  const isTh = language === 'th'
  const wb = XLSX.utils.book_new()

  // -------------------------------------------------------------
  // Sheet 1: Summary Metrics (สรุปตัวชี้วัด AUN-QA)
  // -------------------------------------------------------------
  const summaryRows = [
    {
      [isTh ? 'ลำดับ' : 'No.']: 1,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 3.2',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'งานบริการและให้คำปรึกษา' : 'Academic & Advising Support',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'จำนวนคำร้องขอคำปรึกษาทั้งหมด' : 'Total Advising Requests',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalRequests ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คำร้อง' : 'requests',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 2,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 3.2',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'งานบริการและให้คำปรึกษา' : 'Academic & Advising Support',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'การให้คำปรึกษาที่เสร็จสิ้น' : 'Completed Advising Sessions',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalSessions ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'ครั้ง' : 'sessions',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 3,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 3.2',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'การติดตามผลและประสิทธิผล' : 'Follow-up & Effectiveness',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'จำนวนงานติดตามผลทั้งหมด' : 'Total Follow-up Tasks',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalFollowUps ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'งาน' : 'tasks',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 4,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 3.2',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'การติดตามผลและประสิทธิผล' : 'Follow-up & Effectiveness',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'อัตราความสำเร็จของงานติดตามผล' : 'Follow-up Completion Rate',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${metrics.fuRate}%`,
      [isTh ? 'หน่วยนับ' : 'Unit']: '%',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 5,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6.4 & 8.3',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'ความเสี่ยงและอัตราคงอยู่' : 'Student Retention & Risk',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'เคสเตือนภัยวิชาการ/ความเสี่ยง' : 'Early Warning Cases',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalWarnings ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'เคส' : 'cases',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 6,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6.4 & 8.3',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'ความเสี่ยงและอัตราคงอยู่' : 'Student Retention & Risk',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'เคสขอลาออกและลาพักการศึกษา' : 'Total Exit & Leave Cases',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalExitCases ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'เคส' : 'cases',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 7,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'จำนวนผู้ตอบแบบประเมินเสียงสะท้อน' : 'Total Survey Responses',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: String(metrics.totalVoiceResponses ?? 0),
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คน' : 'respondents',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 8,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'ความพึงพอใจต่อหลักสูตร' : 'Curriculum Structure Score',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${parseFloat(metrics.avgCurriculum).toFixed(2)}`,
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คะแนน (เต็ม 5)' : 'score (out of 5)',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 9,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'คุณภาพการจัดการเรียนการสอน' : 'Teaching Quality Score',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${parseFloat(metrics.avgTeaching).toFixed(2)}`,
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คะแนน (เต็ม 5)' : 'score (out of 5)',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 10,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'การดูแลของอาจารย์ที่ปรึกษา' : 'Advisor Mentorship Score',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${parseFloat(metrics.avgAdvisor).toFixed(2)}`,
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คะแนน (เต็ม 5)' : 'score (out of 5)',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 11,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'การบริการและสิ่งอำนวยความสะดวก' : 'University Services Score',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${parseFloat(metrics.avgServices).toFixed(2)}`,
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คะแนน (เต็ม 5)' : 'score (out of 5)',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 12,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.5',
      [isTh ? 'หมวดหมู่งาน' : 'Metric Category']: isTh ? 'เสียงสะท้อนนักศึกษา (Student Voice)' : 'Student Voice Feedback',
      [isTh ? 'รายการตัวชี้วัด' : 'Indicator']: isTh ? 'ความพึงพอใจประสบการณ์ภาพรวม' : 'Overall Experience Score',
      [isTh ? 'ผลการดำเนินงาน' : 'Recorded Value']: `${parseFloat(metrics.avgOverall).toFixed(2)}`,
      [isTh ? 'หน่วยนับ' : 'Unit']: isTh ? 'คะแนน (เต็ม 5)' : 'score (out of 5)',
    },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  formatWorksheet(wsSummary, summaryRows)
  XLSX.utils.book_append_sheet(wb, wsSummary, isTh ? 'สรุปตัวชี้วัด AUN-QA' : 'AUN-QA Summary')

  // -------------------------------------------------------------
  // Sheet 2: Advisor Workload (ภาระงานอาจารย์ที่ปรึกษา)
  // -------------------------------------------------------------
  const sortedAdvisorWorkload = [...advisorWorkload].sort((a, b) => (b.requests || 0) - (a.requests || 0))
  const advisorRows = sortedAdvisorWorkload.map((a, idx) => {
    const rate = a.requests > 0 ? `${Math.round((a.sessions / a.requests) * 100)}%` : '0%'
    return {
      [isTh ? 'ลำดับ' : 'No.']: idx + 1,
      [isTh ? 'ชื่ออาจารย์ที่ปรึกษา' : 'Advisor Name']: a.name,
      [isTh ? 'จำนวน นศ. ในความดูแล' : 'Advisees Assigned']: String(a.students ?? 0),
      [isTh ? 'คำร้องขอคำปรึกษาที่ได้รับ' : 'Requests Received']: String(a.requests ?? 0),
      [isTh ? 'การให้คำปรึกษาที่เสร็จสิ้น' : 'Completed Sessions']: String(a.sessions ?? 0),
      [isTh ? 'อัตราการดูแลสำเร็จ (%)' : 'Completion Rate (%)']: rate,
    }
  })
  if (advisorRows.length > 0) {
    const wsAdvisor = XLSX.utils.json_to_sheet(advisorRows)
    formatWorksheet(wsAdvisor, advisorRows)
    XLSX.utils.book_append_sheet(wb, wsAdvisor, isTh ? 'ภาระงานอาจารย์' : 'Advisor Workload')
  }

  // -------------------------------------------------------------
  // Sheet 3: Advising Topic Distribution (สัดส่วนหัวข้อการขอคำปรึกษา)
  // -------------------------------------------------------------
  if (categoryData.length > 0) {
    const sortedCategoryData = [...categoryData].sort((a, b) => (b.count || 0) - (a.count || 0))
    const topicRows = sortedCategoryData.map((c, idx) => ({
      [isTh ? 'ลำดับ' : 'No.']: idx + 1,
      [isTh ? 'หัวข้อการให้คำปรึกษา' : 'Advising Topic']: c.name,
      [isTh ? 'จำนวนคำร้อง' : 'Request Count']: String(c.count ?? 0),
      [isTh ? 'สัดส่วน (%)' : 'Share (%)']: `${c.percentage}%`,
    }))
    const wsTopic = XLSX.utils.json_to_sheet(topicRows)
    formatWorksheet(wsTopic, topicRows)
    XLSX.utils.book_append_sheet(wb, wsTopic, isTh ? 'สัดส่วนหัวข้อคำปรึกษา' : 'Topic Distribution')
  }

  // -------------------------------------------------------------
  // Sheet 4: Exit & Leave Cases (รายการเคสขอลาออกและลาพัก)
  // -------------------------------------------------------------
  const sortedExitCases = [...exitCases].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return db - da
  })

  const exitRows = sortedExitCases.map((c, idx) => {
    const student = users.find(u => u.id === c.studentId)
    const advisor = users.find(u => u.id === c.advisorId)
    const assessment = advisorAssessments.find(a => a.exitCaseId === c.id)
    const voice = studentVoiceResponses.find(v => v.exitCaseId === c.id || v.studentId === c.studentId)

    return {
      [isTh ? 'ลำดับ' : 'No.']: idx + 1,
      [isTh ? 'รหัสเคส' : 'Case ID']: c.id,
      [isTh ? 'วันที่บันทึกคำร้อง' : 'Created At']: c.createdAt ? c.createdAt.split('T')[0] : '-',
      [isTh ? 'รหัสนักศึกษา' : 'Student Code']: student?.code || c.studentId,
      [isTh ? 'ชื่อ-สกุลนักศึกษา' : 'Student Name']: student?.name || c.studentId,
      [isTh ? 'ชั้นปีที่ศึกษา' : 'Academic Year']: voice?.academicYear || '-',
      [isTh ? 'ประเภทคำร้อง' : 'Exit Type']: getExitTypeText(c.exitType, language),
      [isTh ? 'สาเหตุหลัก' : 'Declared Reason']: getExitReasonText(c.reasonCode, language),
      [isTh ? 'วันที่มีผล' : 'Effective Date']: c.preferredEffectiveDate || '-',
      [isTh ? 'สถานะเคส' : 'Status']: getStatusText(c.status, language),
      [isTh ? 'อาจารย์ที่ปรึกษา' : 'Faculty Advisor']: advisor?.name || c.advisorId,
      [isTh ? 'เหตุผลที่นักศึกษาระบุ' : 'Student Stated Details']: c.details || '-',
      [isTh ? 'มติคณะกรรมการ' : 'Committee Resolution']: assessment?.resolution || '-',
    }
  })
  if (exitRows.length > 0) {
    const wsExit = XLSX.utils.json_to_sheet(exitRows)
    formatWorksheet(wsExit, exitRows)
    XLSX.utils.book_append_sheet(wb, wsExit, isTh ? 'เคสลาออก-ลาพัก' : 'Exit Cases')
  }

  // -------------------------------------------------------------
  // Sheet 5: Student Voice Responses (ผลสำรวจเสียงสะท้อนนักศึกษา)
  // -------------------------------------------------------------
  const sortedVoice = [...studentVoiceResponses].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return db - da
  })

  const voiceRows = sortedVoice.map((v, idx) => {
    return {
      [isTh ? 'ลำดับ' : 'No.']: idx + 1,
      [isTh ? 'รหัสแบบประเมิน' : 'Response ID']: v.id,
      [isTh ? 'วันที่ส่งแบบประเมิน' : 'Submitted Date']: v.createdAt ? v.createdAt.split('T')[0] : '-',
      [isTh ? 'รหัสเคส' : 'Exit Case ID']: v.exitCaseId || '-',
      [isTh ? 'ประเภทคำร้อง' : 'Exit Type']: getExitTypeText(v.exitType, language),
      [isTh ? 'ชั้นปีที่ศึกษา' : 'Academic Year']: v.academicYear || '-',
      [isTh ? 'ปัจจัยสำคัญที่ส่งผล' : 'Primary Factors']: Array.isArray(v.primaryFactors) ? v.primaryFactors.join(', ') : '-',
      [isTh ? 'คะแนนหลักสูตร (1-5)' : 'Curriculum Rating']: String(v.ratings?.curriculumRelevance ?? 0),
      [isTh ? 'คะแนนการสอน (1-5)' : 'Teaching Rating']: String(v.ratings?.teachingQuality ?? 0),
      [isTh ? 'คะแนนอาจารย์ที่ปรึกษา (1-5)' : 'Advisor Rating']: String(v.ratings?.advisorSupport ?? 0),
      [isTh ? 'คะแนนบริการมหาวิทยาลัย (1-5)' : 'Services Rating']: String(v.ratings?.universityServices ?? 0),
      [isTh ? 'คะแนนภาพรวม (1-5)' : 'Overall Rating']: String(v.ratings?.overallExperience ?? 0),
      [isTh ? 'สิ่งที่อยากให้มหาวิทยาลัยปรับปรุง' : 'University Improvement']: v.whatCouldUniversityDoBetter || '-',
      [isTh ? 'ข้อเสนอแนะต่อหลักสูตร' : 'Curriculum Suggestions']: v.curriculumImprovementSuggestions || '-',
      [isTh ? 'ข้อคิดเห็นถึงรุ่นน้อง' : 'Advice for Future Students']: v.adviceForFutureStudents || '-',
    }
  })
  if (voiceRows.length > 0) {
    const wsVoice = XLSX.utils.json_to_sheet(voiceRows)
    formatWorksheet(wsVoice, voiceRows)
    XLSX.utils.book_append_sheet(wb, wsVoice, isTh ? 'เสียงสะท้อนนักศึกษา' : 'Student Voice')
  }

  // Trigger file download
  const filename = `AUN_QA_Advising_Report_${getFileTimestamp()}.xlsx`
  XLSX.writeFile(wb, filename)
}

/**
 * Export qualitative retention audit report with root-cause analysis
 */
export function exportQualitativeExcelReport(options: QualitativeExportOptions): void {
  const { language = 'th', cases, users, studentVoiceResponses, advisorAssessments } = options
  const isTh = language === 'th'
  const wb = XLSX.utils.book_new()

  // -------------------------------------------------------------
  // Sheet 1: Qualitative Diagnostic Cases (เจาะลึกรายกรณี)
  // -------------------------------------------------------------
  const sortedCases = [...cases].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return db - da
  })

  const caseRows = sortedCases.map((c, idx) => {
    const student = users.find(u => u.id === c.studentId)
    const advisor = users.find(u => u.id === c.advisorId)
    const assessment = advisorAssessments.find(a => a.exitCaseId === c.id)
    const voice = studentVoiceResponses.find(v => v.exitCaseId === c.id || v.studentId === c.studentId)

    return {
      [isTh ? 'ลำดับ' : 'No.']: idx + 1,
      [isTh ? 'รหัสเคส' : 'Case ID']: c.id,
      [isTh ? 'วันที่บันทึกคำร้อง' : 'Created At']: c.createdAt ? c.createdAt.split('T')[0] : '-',
      [isTh ? 'รหัสนักศึกษา' : 'Student Code']: student?.code || c.studentId,
      [isTh ? 'ชื่อ-สกุลนักศึกษา' : 'Student Name']: student?.name || c.studentId,
      [isTh ? 'ชั้นปีที่ศึกษา' : 'Academic Year']: voice?.academicYear || '-',
      [isTh ? 'ประเภทคำร้อง' : 'Exit Type']: getExitTypeText(c.exitType, language),
      [isTh ? 'สาเหตุหลัก' : 'Declared Reason']: getExitReasonText(c.reasonCode, language),
      [isTh ? 'สถานะเคส' : 'Status']: getStatusText(c.status, language),
      [isTh ? 'อาจารย์ที่ปรึกษา' : 'Faculty Advisor']: advisor?.name || c.advisorId,
      [isTh ? 'เหตุผลที่นักศึกษาระบุ' : 'Student Stated Details']: c.details || '-',
      [isTh ? 'การวินิจฉัยของอาจารย์ที่ปรึกษา' : 'Advisor Diagnostic']: assessment?.assessment || '-',
      [isTh ? 'ปัจจัยแวดล้อมที่ส่งผลกระทบ' : 'Contributing Factors']: assessment?.contributingFactors || '-',
      [isTh ? 'มาตรการช่วยเหลือที่ได้ทำแล้ว' : 'Actions Taken']: assessment?.actionsTaken || '-',
      [isTh ? 'ข้อเสนอแนะต่อหลักสูตร/QA' : 'Advisor Recommendation']: assessment?.recommendation || '-',
      [isTh ? 'มติคณะกรรมการ' : 'Committee Resolution']: assessment?.resolution || '-',
      [isTh ? 'คะแนนภาพรวม (1-5)' : 'Overall Rating']: voice?.ratings?.overallExperience != null ? String(voice.ratings.overallExperience) : '-',
      [isTh ? 'ข้อเสนอแนะพัฒนาจากนักศึกษา' : 'Student Voice Feedback']: voice?.whatCouldUniversityDoBetter || voice?.curriculumImprovementSuggestions || '-',
    }
  })

  const wsCases = XLSX.utils.json_to_sheet(caseRows)
  formatWorksheet(wsCases, caseRows)
  XLSX.utils.book_append_sheet(wb, wsCases, isTh ? 'เจาะลึกสาเหตุการลาออก' : 'Qualitative Case Explorer')

  // -------------------------------------------------------------
  // Sheet 2: Retention Overview & CQI Actions
  // -------------------------------------------------------------
  const withdrawalCount = cases.filter(c => c.exitType === 'withdrawal' || c.exitType === 'dropout').length
  const leaveCount = cases.filter(c => c.exitType === 'leave_of_absence').length
  const summaryRows = [
    {
      [isTh ? 'ลำดับ' : 'No.']: 1,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6 & 8',
      [isTh ? 'หมวดหมู่การวิเคราะห์' : 'Analysis Category']: isTh ? 'อัตราคงอยู่ของนักศึกษา (Retention)' : 'Student Retention Metrics',
      [isTh ? 'ตัวชี้วัด / มาตรการ' : 'Indicator / Intervention']: isTh ? 'จำนวนการออกกลางคันทั้งหมด (Total Departures)' : 'Total Departures',
      [isTh ? 'จำนวน / ผลการประเมิน' : 'Value / Result']: String(cases.length),
      [isTh ? 'หน่วยนับ / สถานะ' : 'Unit / Status']: isTh ? 'เคส' : 'cases',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 2,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6.4',
      [isTh ? 'หมวดหมู่การวิเคราะห์' : 'Analysis Category']: isTh ? 'อัตราคงอยู่ของนักศึกษา (Retention)' : 'Student Retention Metrics',
      [isTh ? 'ตัวชี้วัด / มาตรการ' : 'Indicator / Intervention']: isTh ? 'ขอลาออกถาวร (Permanent Withdrawal / Dropout)' : 'Permanent Withdrawal',
      [isTh ? 'จำนวน / ผลการประเมิน' : 'Value / Result']: String(withdrawalCount),
      [isTh ? 'หน่วยนับ / สถานะ' : 'Unit / Status']: isTh ? 'เคส' : 'cases',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 3,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6.4',
      [isTh ? 'หมวดหมู่การวิเคราะห์' : 'Analysis Category']: isTh ? 'อัตราคงอยู่ของนักศึกษา (Retention)' : 'Student Retention Metrics',
      [isTh ? 'ตัวชี้วัด / มาตรการ' : 'Indicator / Intervention']: isTh ? 'ขอพักการศึกษาชั่วคราว (Leave of Absence)' : 'Leave of Absence',
      [isTh ? 'จำนวน / ผลการประเมิน' : 'Value / Result']: String(leaveCount),
      [isTh ? 'หน่วยนับ / สถานะ' : 'Unit / Status']: isTh ? 'เคส' : 'cases',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 4,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 6.4',
      [isTh ? 'หมวดหมู่การวิเคราะห์' : 'Analysis Category']: isTh ? 'มาตรการพัฒนาคุณภาพอย่างต่อเนื่อง (CQI)' : 'CQI Interventions',
      [isTh ? 'ตัวชี้วัด / มาตรการ' : 'Indicator / Intervention']: isTh ? 'Pre-sessional Coding Boot Camp + PAL ปูพื้นฐาน นศ. ใหม่' : 'Pre-sessional Coding Boot Camp + PAL',
      [isTh ? 'จำนวน / ผลการประเมิน' : 'Value / Result']: isTh ? 'เป้าหมายลด Drop ปี 1 ลง 30%' : 'Target: Reduce Year 1 Dropout by 30%',
      [isTh ? 'หน่วยนับ / สถานะ' : 'Unit / Status']: isTh ? 'เตรียมพร้อมเปิดภาคเรียนถัดไป' : 'Ready for Next Term',
    },
    {
      [isTh ? 'ลำดับ' : 'No.']: 5,
      [isTh ? 'เกณฑ์ AUN-QA' : 'AUN-QA Criteria']: 'Criteria 8.3',
      [isTh ? 'หมวดหมู่การวิเคราะห์' : 'Analysis Category']: isTh ? 'มาตรการพัฒนาคุณภาพอย่างต่อเนื่อง (CQI)' : 'CQI Interventions',
      [isTh ? 'ตัวชี้วัด / มาตรการ' : 'Indicator / Intervention']: isTh ? 'ระบบคัดกรองส่งต่อศูนย์สุขภาวะทางจิต (Mental Health Fast-track)' : 'Counselling Fast-track & Deadline Matrix',
      [isTh ? 'จำนวน / ผลการประเมิน' : 'Value / Result']: isTh ? 'ข้อตกลงร่วมกับศูนย์สุขภาวะจิต' : 'MOU with Counselling Center',
      [isTh ? 'หน่วยนับ / สถานะ' : 'Unit / Status']: isTh ? 'อยู่ระหว่างดำเนินการ' : 'In Progress',
    },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  formatWorksheet(wsSummary, summaryRows)
  XLSX.utils.book_append_sheet(wb, wsSummary, isTh ? 'สรุปมาตรการ AUN-QA' : 'CQI Action Summary')

  // Trigger file download
  const filename = `Qualitative_Retention_Diagnostic_Report_${getFileTimestamp()}.xlsx`
  XLSX.writeFile(wb, filename)
}
