// ============================================================
// AdvisingLog — Bilingual Language Context (TH / EN)
// Complete Thai / English localization support for MFU SIS
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { ADVISING_CATEGORIES, REFERRAL_DESTINATIONS, EXIT_REASON_CODES, EARLY_WARNING_TYPES, EXIT_TYPES } from '@/types'

export type Language = 'th' | 'en'

const CATEGORY_LABELS: Record<string, { labelTh: string; labelEn: string }> = {
  academic_advising: { labelTh: 'การวางแผนการเรียนและคำแนะนำทางวิชาการ', labelEn: 'Academic Advising & Course Planning' },
  academic_performance: { labelTh: 'ผลการเรียน / GPA / ภาวะวิทยาทัณฑ์', labelEn: 'Academic Performance / GPA / Probation' },
  career_internship: { labelTh: 'การแนะแนวอาชีพและการฝึกงาน', labelEn: 'Career & Internship Guidance' },
  internship_career: { labelTh: 'ฝึกงาน / สหกิจศึกษา / อาชีพ', labelEn: 'Internship / Co-op / Career' },
  mental_health: { labelTh: 'การดูแลสุขภาวะและสุขภาพจิต', labelEn: 'Mental Health & Well-being Support' },
  scholarship_aid: { labelTh: 'ทุนการศึกษาและความช่วยเหลือทางการเงิน', labelEn: 'Scholarship & Financial Aid' },
  scholarship_document: { labelTh: 'ทุนการศึกษา / ลงนามเอกสาร', labelEn: 'Scholarship / Document Signing' },
  study_abroad: { labelTh: 'การศึกษาต่อต่างประเทศและนักศึกษาแลกเปลี่ยน', labelEn: 'Study Abroad & Student Exchange' },
  research_project: { labelTh: 'โครงงานปริญญานิพนธ์และการวิจัย', labelEn: 'Senior Project & Research Mentorship' },
  registration: { labelTh: 'การลงทะเบียนเรียนและแผนการเรียน', labelEn: 'Course Registration & Enrollment' },
  course_enrollment: { labelTh: 'การลงทะเบียนเรียนและแผนการเรียน', labelEn: 'Course Enrollment & Study Plan' },
  student_status: { labelTh: 'สถานภาพนักศึกษา', labelEn: 'Student Status' },
  financial: { labelTh: 'ปัญหาทางการเงิน / ค่าธรรมเนียม', labelEn: 'Financial Issues' },
  scholarship_financial: { labelTh: 'ทุนการศึกษาและภาระค่าใช้จ่าย', labelEn: 'Scholarships & Financial Support' },
  personal: { labelTh: 'ปัญหาส่วนตัว / การปรับตัว', labelEn: 'Personal Issues' },
  wellbeing_adjustment: { labelTh: 'การปรับตัวและสุขภาวะในการใช้ชีวิต', labelEn: 'Adjustment & Student Well-being' },
  withdrawal_leave: { labelTh: 'การลาพักการศึกษาหรือลาออก', labelEn: 'Withdrawal & Leave of Absence' },
  other: { labelTh: 'เรื่องอื่น ๆ', labelEn: 'Other Inquiries' },
}

export const ADVISING_SUBCATEGORIES: Record<string, { labelTh: string; labelEn: string }> = {
  // Database category configuration keys
  'gpa_improvement': { labelTh: 'การพัฒนาผลการเรียน', labelEn: 'GPA Improvement' },
  'study_plan': { labelTh: 'การวางแผนการเรียน', labelEn: 'Study Plan' },
  'probation_support': { labelTh: 'การช่วยเหลือด้านวิทยาทัณฑ์', labelEn: 'Probation Support' },
  'honors_guidance': { labelTh: 'คำแนะนำเพื่อเกียรตินิยม', labelEn: 'Honors Guidance' },
  'course_prerequisites': { labelTh: 'วิชาบังคับก่อน', labelEn: 'Course Prerequisites' },
  'overload_request': { labelTh: 'คำร้องลงทะเบียนเกินหน่วยกิต', labelEn: 'Overload Request' },
  'schedule_conflict': { labelTh: 'ตารางเรียนทับซ้อน', labelEn: 'Schedule Conflict' },
  'general_education': { labelTh: 'วิชาศึกษาทั่วไป', labelEn: 'General Education' },
  'scholarship_renewal': { labelTh: 'การต่ออายุทุนการศึกษา', labelEn: 'Scholarship Renewal' },
  'emergency_fund': { labelTh: 'ทุนฉุกเฉิน', labelEn: 'Emergency Fund' },
  'student_loan': { labelTh: 'กองทุนกู้ยืมเพื่อการศึกษา', labelEn: 'Student Loan' },
  'tuition_installment': { labelTh: 'การผ่อนชำระค่าธรรมเนียมการศึกษา', labelEn: 'Tuition Installment' },
  'summer_internship': { labelTh: 'การฝึกงานภาคฤดูร้อน', labelEn: 'Summer Internship' },
  'coop_program': { labelTh: 'โครงการสหกิจศึกษา', labelEn: 'Co-op Program' },
  'portfolio_review': { labelTh: 'การตรวจสอบแฟ้มสะสมผลงาน', labelEn: 'Portfolio Review' },
  'industry_mentorship': { labelTh: 'การให้คำปรึกษาจากภาคอุตสาหกรรม', labelEn: 'Industry Mentorship' },
  'university_life': { labelTh: 'การใช้ชีวิตในมหาวิทยาลัย', labelEn: 'University Life' },
  'stress_management': { labelTh: 'การจัดการความเครียด', labelEn: 'Stress Management' },
  'living_support': { labelTh: 'ความช่วยเหลือด้านการใช้ชีวิต', labelEn: 'Living Support' },
  'peer_relations': { labelTh: 'ความสัมพันธ์กับเพื่อน', labelEn: 'Peer Relations' },
  'temporary_leave': { labelTh: 'การลาพักการศึกษาชั่วคราว', labelEn: 'Temporary Leave' },
  'major_transfer': { labelTh: 'การย้ายสาขาวิชา', labelEn: 'Major Transfer' },
  'university_withdrawal': { labelTh: 'การลาออกจากมหาวิทยาลัย', labelEn: 'University Withdrawal' },
  'academic_restart': { labelTh: 'การเริ่มต้นการเรียนใหม่', labelEn: 'Academic Restart' },
  'general_inquiry': { labelTh: 'ข้อสอบถามทั่วไป', labelEn: 'General Inquiry' },
  'special_request': { labelTh: 'คำร้องพิเศษ', labelEn: 'Special Request' },
  'การลงทะเบียนรายวิชา': { labelTh: 'การลงทะเบียนรายวิชา', labelEn: 'Course Registration' },
  'แผนพัฒนาผลการเรียน (GPA)': { labelTh: 'แผนพัฒนาผลการเรียน (GPA)', labelEn: 'GPA Improvement Plan' },
  'ตรวจสอบการสำเร็จการศึกษา': { labelTh: 'ตรวจสอบการสำเร็จการศึกษา', labelEn: 'Graduation Verification' },
  'การขอปลดล็อกวิชาบังคับก่อน': { labelTh: 'การขอปลดล็อกวิชาบังคับก่อน', labelEn: 'Prerequisite Override' },
  'ตรวจเรซูเม่และพอร์ตโฟลิโอ': { labelTh: 'ตรวจเรซูเม่และพอร์ตโฟลิโอ', labelEn: 'Resume & Portfolio Review' },
  'การจัดหาสถานที่ฝึกงาน': { labelTh: 'การจัดหาสถานที่ฝึกงาน', labelEn: 'Internship Placement' },
  'กลยุทธ์การหางาน': { labelTh: 'กลยุทธ์การหางาน', labelEn: 'Job Search Strategy' },
  'การปรึกษาผู้เชี่ยวชาญในสายงาน': { labelTh: 'การปรึกษาผู้เชี่ยวชาญในสายงาน', labelEn: 'Industry Mentorship' },
  'ความเครียดและหมดไฟ': { labelTh: 'ความเครียดและหมดไฟ', labelEn: 'Stress & Burnout' },
  'การส่งต่อผู้เชี่ยวชาญด้านจิตวิทยา': { labelTh: 'การส่งต่อผู้เชี่ยวชาญด้านจิตวิทยา', labelEn: 'Mental Health Referral' },
  'ความกังวลด้านการเรียน': { labelTh: 'ความกังวลด้านการเรียน', labelEn: 'Academic Anxiety' },
  'การสนับสนุนจากเพื่อน': { labelTh: 'การสนับสนุนจากเพื่อน', labelEn: 'Peer Support' },
  'Resume & Portfolio Review': { labelTh: 'ตรวจเรซูเม่และพอร์ตโฟลิโอ', labelEn: 'Resume & Portfolio Review' },
  'Internship Placement': { labelTh: 'การจัดหาสถานที่ฝึกงาน', labelEn: 'Internship Placement' },
  'Job Search Strategy': { labelTh: 'กลยุทธ์การหางาน', labelEn: 'Job Search Strategy' },
  'Personal Counseling Referral': { labelTh: 'การส่งต่อผู้เชี่ยวชาญด้านจิตวิทยา', labelEn: 'Personal Counseling Referral' },
  'Tuition Fee Waiver': { labelTh: 'ทุนยกเว้นค่าเล่าเรียน', labelEn: 'Tuition Fee Waiver' },
  'Emergency Financial Grant': { labelTh: 'ทุนช่วยเหลือฉุกเฉิน', labelEn: 'Emergency Financial Grant' },
  'External Foundation Scholarship': { labelTh: 'ทุนมูลนิธิภายนอก', labelEn: 'External Foundation Scholarship' },
  'Work-Study Program': { labelTh: 'โครงการทำงานพิเศษในมหาวิทยาลัย', labelEn: 'Work-Study Program' },
  'Partner University Exchange': { labelTh: 'โครงการแลกเปลี่ยนมหาวิทยาลัยคู่สัญญา', labelEn: 'Partner University Exchange' },
  'Credit Transfer Inquiry': { labelTh: 'การเทียบโอนหน่วยกิต', labelEn: 'Credit Transfer Inquiry' },
  'Scholarship for Exchange': { labelTh: 'ทุนโครงการแลกเปลี่ยน', labelEn: 'Scholarship for Exchange' },
  'Visa & Documentation': { labelTh: 'วีซ่าและเอกสารเดินทาง', labelEn: 'Visa & Documentation' },
  'Thesis Topic Selection': { labelTh: 'การเลือกหัวข้อปริญญานิพนธ์', labelEn: 'Thesis Topic Selection' },
  'Advisor Matching': { labelTh: 'การจับคู่อาจารย์ที่ปรึกษาวิจัย', labelEn: 'Advisor Matching' },
  'Lab Equipment Access': { labelTh: 'การเข้าใช้ห้องปฏิบัติการ', labelEn: 'Lab Equipment Access' },
  'Research Publication': { labelTh: 'การตีพิมพ์เผยแพร่ผลงานวิจัย', labelEn: 'Research Publication' },
  'Temporary Leave of Absence': { labelTh: 'การลาพักการศึกษาชั่วคราว', labelEn: 'Temporary Leave of Absence' },
  'Academic Restart': { labelTh: 'การขอเริ่มแผนการเรียนใหม่', labelEn: 'Academic Restart' },
  'Add/Drop Course Petition': { labelTh: 'คำร้องขอเพิ่ม/ถอนรายวิชา', labelEn: 'Add/Drop Course Petition' },
  'Section Change Request': { labelTh: 'คำร้องขอย้ายกลุ่มเรียน', labelEn: 'Section Change Request' },
  'Registration Hold Resolution': { labelTh: 'การปลดล็อกเงื่อนไขการลงทะเบียน', labelEn: 'Registration Hold Resolution' },
  'Credit Overload Permit': { labelTh: 'การขออนุมัติลงทะเบียนเกินหน่วยกิต', labelEn: 'Credit Overload Permit' },

  // ทุนการศึกษา / ลงนามเอกสาร (Scholarship / Document Signing)
  'Scholarship Renewal': { labelTh: 'ต่อสัญญา / รายงานตัวรับทุนการศึกษา', labelEn: 'Scholarship Renewal' },
  'Recommendation Letter': { labelTh: 'ขอหนังสือรับรอง / จดหมายรับรองจากอาจารย์', labelEn: 'Recommendation Letter' },
  'Certificate Request': { labelTh: 'ขอเอกสารรับรองความประพฤติ / การศึกษา', labelEn: 'Certificate Request' },
  'Transcript Request': { labelTh: 'ขอตรวจสอบ / รับรองใบแสดงผลการเรียน (Transcript)', labelEn: 'Transcript Request' },

  // ปัญหาทางการเงิน / ค่าธรรมเนียม (Financial Issues)
  'Tuition Payment': { labelTh: 'การผ่อนผัน / ชำระค่าธรรมเนียมการศึกษา', labelEn: 'Tuition Payment' },
  'Financial Aid': { labelTh: 'กองทุนกู้ยืมเพื่อการศึกษา (กยศ. / กรอ.)', labelEn: 'Financial Aid' },
  'Emergency Fund': { labelTh: 'ทุนการศึกษาฉุกเฉิน / เงินช่วยเหลือพิเศษ', labelEn: 'Emergency Fund' },
  'Work-Study': { labelTh: 'ทุนทำงานพิเศษ / งานช่วยเหลือนักศึกษา', labelEn: 'Work-Study' },

  // การลงทะเบียนเรียน / เพิ่ม-ถอน (Course Registration)
  'Course Registration': { labelTh: 'การวางแผนลงทะเบียนรายวิชา', labelEn: 'Course Registration' },
  'Add/Drop': { labelTh: 'การเพิ่ม - ลด - ถอนรายวิชา', labelEn: 'Add/Drop' },
  'Registration Hold': { labelTh: 'การปลดล็อกเงื่อนไข / สถานะระงับการลงทะเบียน', labelEn: 'Registration Hold' },
  'Section Change': { labelTh: 'การขอย้ายกลุ่มเรียน (Section Change)', labelEn: 'Section Change' },

  // สถานภาพนักศึกษา (Student Status)
  'Enrollment Verification': { labelTh: 'การยืนยันสถานภาพการเป็นนักศึกษา', labelEn: 'Enrollment Verification' },
  'Status Change': { labelTh: 'การขอเปลี่ยนแปลงสถานภาพ / ข้อมูลทะเบียน', labelEn: 'Status Change' },
  'Readmission': { labelTh: 'การขอคืนสภาพการเป็นนักศึกษา', labelEn: 'Readmission' },

  // ผลการเรียน / GPA / ภาวะวิทยาทัณฑ์ (Academic Performance)
  'GPA Recovery Plan': { labelTh: 'แผนฟื้นฟูผลการเรียน / ดึงเกรดเฉลี่ย', labelEn: 'GPA Recovery Plan' },
  'Probation Counseling': { labelTh: 'การให้คำปรึกษาภาวะวิทยาทัณฑ์ (Probation)', labelEn: 'Probation Counseling' },
  'Course Planning': { labelTh: 'การวางแผนรายวิชาแก้ตก / รีเกรด', labelEn: 'Course Planning' },
  'Academic Support': { labelTh: 'การขอรับติวเตอร์หรือความช่วยเหลือด้านวิชาการ', labelEn: 'Academic Support' },

  // ฝึกงาน / สหกิจศึกษา / อาชีพ (Internship / Career)
  'Internship Search': { labelTh: 'การค้นหาสถานที่ฝึกงาน', labelEn: 'Internship Search' },
  'Co-op Placement': { labelTh: 'การประสานงานสหกิจศึกษา (Co-op)', labelEn: 'Co-op Placement' },
  'Career Guidance': { labelTh: 'การแนะแนวทางอาชีพและการเตรียมตัวสมัครงาน', labelEn: 'Career Guidance' },
  'Recommendation': { labelTh: 'การขอหนังสือรับรองความประพฤติเพื่อสมัครงาน', labelEn: 'Recommendation' },

  // ปัญหาส่วนตัว / การปรับตัว (Personal Issues)
  'Stress / Wellbeing': { labelTh: 'ความเครียด / สุขภาพจิต / คุณภาพชีวิต', labelEn: 'Stress / Wellbeing' },
  'Conflict Resolution': { labelTh: 'การปรับตัวและปฏิสัมพันธ์กับเพื่อนร่วมชั้น', labelEn: 'Conflict Resolution' },
  'Accommodation': { labelTh: 'ปัญหาหอพักและความเป็นอยู่ในมหาวิทยาลัย', labelEn: 'Accommodation' },
  'General Guidance': { labelTh: 'คำปรึกษาและข้อคิดเห็นทั่วไป', labelEn: 'General Guidance' },

  // การขอลาพัก / ขอลาออก / ย้ายสาขา (Withdrawal / Leave)
  'Temporary Leave': { labelTh: 'การขอลาพักการศึกษาชั่วคราว', labelEn: 'Temporary Leave' },
  'Permanent Withdrawal': { labelTh: 'การขอลาออกจากการเป็นนักศึกษา', labelEn: 'Permanent Withdrawal' },
  'Transfer Out': { labelTh: 'การขอโอนย้ายสถานศึกษา / ย้ายสาขา', labelEn: 'Transfer Out' },
  'withdrawal': { labelTh: 'ขอลาออก', labelEn: 'Withdrawal' },
  'leave_of_absence': { labelTh: 'ลาพักการศึกษา', labelEn: 'Leave of Absence' },
  'transfer': { labelTh: 'ย้ายสาขาวิชา', labelEn: 'Transfer' },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (th: string, en: string) => string
  formatAcademicTerm: () => string
  getCategoryLabel: (value: string) => string
  getSubCategoryLabel: (value: string) => string
  getReferralLabel: (value: string) => string
  getExitReasonLabel: (value: string) => string
  getExitTypeLabel: (value: string) => string
  getWarningTypeLabel: (value: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('advising_log_lang')
    return (saved === 'en' || saved === 'th') ? saved : 'th'
  })

  useEffect(() => {
    localStorage.setItem('advising_log_lang', language)
    document.documentElement.lang = language
  }, [language])

  function setLanguage(lang: Language) {
    setLanguageState(lang)
  }

  // Dual-text helper: selects Thai or English dynamically
  function t(th: string, en: string): string {
    return language === 'th' ? th : en
  }

  function formatAcademicTerm(): string {
    return language === 'th'
      ? 'ภาคการศึกษา 1/2569'
      : 'Semester 1 / Academic Year 2026'
  }

  function getCategoryLabel(value: string): string {
    if (!value) return ''
    const canonical = CATEGORY_LABELS[value]
    if (canonical) return language === 'th' ? canonical.labelTh : canonical.labelEn
    const item = ADVISING_CATEGORIES.find(c => c.value === value)
    if (item) return language === 'th' ? item.labelTh : item.labelEn
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function getSubCategoryLabel(value: string): string {
    if (!value) return ''
    // Some older local records were decoded as UTF-8 text interpreted as
    // Latin-1. Repair that display-only value before looking up translations.
    let displayValue = value
    if (/[ÃÂà-ÿ]/.test(value)) {
      try {
        const repaired = decodeURIComponent(escape(value))
        if (repaired && repaired !== value) displayValue = repaired
      } catch {
        // Keep the original value when it is not valid legacy text.
      }
    }

    const item = ADVISING_SUBCATEGORIES[value] || ADVISING_SUBCATEGORIES[displayValue]
    if (item) {
      return language === 'th' ? item.labelTh : item.labelEn
    }
    // Also support finding by labelTh if value was already stored in Thai
    const normalizedValue = displayValue.trim().toLowerCase()
    const foundByTh = Object.values(ADVISING_SUBCATEGORIES).find(entry =>
      entry.labelTh === value ||
      entry.labelTh === displayValue ||
      entry.labelEn.toLowerCase() === normalizedValue
    )
    if (foundByTh) {
      return language === 'th' ? foundByTh.labelTh : foundByTh.labelEn
    }
    // Check if it's an exit type
    const exitItem = EXIT_TYPES.find(e => e.value === value)
    if (exitItem) {
      return language === 'th' ? exitItem.labelTh : exitItem.labelEn
    }
    return displayValue
  }

  function getReferralLabel(value: string): string {
    const item = REFERRAL_DESTINATIONS.find(d => d.value === value)
    if (!item) return value
    return language === 'th' ? item.labelTh : item.labelEn
  }

  function getExitReasonLabel(value: string): string {
    const item = EXIT_REASON_CODES.find(r => r.value === value)
    if (!item) return value
    return language === 'th' ? item.labelTh : item.labelEn
  }

  function getExitTypeLabel(value: string): string {
    const item = EXIT_TYPES.find(e => e.value === value)
    if (!item) return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return language === 'th' ? item.labelTh : item.labelEn
  }

  function getWarningTypeLabel(value: string): string {
    const item = EARLY_WARNING_TYPES.find(w => w.value === value)
    if (!item) return value
    return language === 'th' ? item.labelTh : item.labelEn
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      formatAcademicTerm,
      getCategoryLabel,
      getSubCategoryLabel,
      getReferralLabel,
      getExitReasonLabel,
      getExitTypeLabel,
      getWarningTypeLabel,
    }}>
      {children}
    </LanguageContext.Provider>
  )
}
