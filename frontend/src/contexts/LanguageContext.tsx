// ============================================================
// AdvisingLog — Bilingual Language Context (TH / EN)
// Complete Thai / English localization support for MFU SIS
// ============================================================

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { ADVISING_CATEGORIES, REFERRAL_DESTINATIONS, EXIT_REASON_CODES, EARLY_WARNING_TYPES, EXIT_TYPES } from '@/types'

export type Language = 'th' | 'en'

export const ADVISING_SUBCATEGORIES: Record<string, { labelTh: string; labelEn: string }> = {
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
    const item = ADVISING_CATEGORIES.find(c => c.value === value)
    if (!item) return value
    return language === 'th' ? item.labelTh : item.labelEn
  }

  function getSubCategoryLabel(value: string): string {
    if (!value) return ''
    const item = ADVISING_SUBCATEGORIES[value]
    if (item) {
      return language === 'th' ? item.labelTh : item.labelEn
    }
    // Also support finding by labelTh if value was already stored in Thai
    const foundByTh = Object.values(ADVISING_SUBCATEGORIES).find(entry => entry.labelTh === value)
    if (foundByTh) {
      return language === 'th' ? foundByTh.labelTh : foundByTh.labelEn
    }
    // Check if it's an exit type
    const exitItem = EXIT_TYPES.find(e => e.value === value)
    if (exitItem) {
      return language === 'th' ? exitItem.labelTh : exitItem.labelEn
    }
    return value
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
