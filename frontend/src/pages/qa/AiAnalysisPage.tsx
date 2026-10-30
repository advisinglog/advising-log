// ============================================================
// QA / Program Chair — AI Analysis (sidebar page)
// AI summary & Q&A over de-identified exit cases, plus personal API key settings
// ============================================================

import { useLanguage } from '@/contexts/LanguageContext'
import { PageHeader } from '@/components/ui'
import QualitativeExitAnalysis from './QualitativeExitAnalysis'

export default function AiAnalysisPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ผู้ช่วยวิเคราะห์ AI', 'AI Analysis')}
        description={t(
          'สรุปและถาม-ตอบข้อมูลเคสลาออก / พักการศึกษาด้วย AI (ลบชื่อและรหัสนักศึกษาแล้ว) ตรวจสอบพรอมต์ได้ทุกครั้งก่อนส่ง',
          'Summarize and ask questions about de-identified exit cases with AI. You review the prompt before anything is sent.'
        )}
      />
      <QualitativeExitAnalysis view="ai" />
    </div>
  )
}
