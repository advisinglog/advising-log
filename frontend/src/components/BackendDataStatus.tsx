import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button, Card } from '@/components/ui'

export default function BackendDataStatus() {
  const { backendStatus, refreshBackend } = useStore()
  const { t } = useLanguage()
  const loading = backendStatus === 'loading'
  return (
    <Card>
      <div role={loading ? 'status' : 'alert'} className="space-y-3 py-6 text-center">
        <p>{loading
          ? t('กำลังโหลดข้อมูลจากระบบ...', 'Loading data from the server...')
          : t('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อระบบแล้วลองอีกครั้ง', 'Unable to load data. Check the server connection and try again.')}</p>
        {!loading && <Button onClick={refreshBackend}>{t('ลองอีกครั้ง', 'Try again')}</Button>}
      </div>
    </Card>
  )
}
