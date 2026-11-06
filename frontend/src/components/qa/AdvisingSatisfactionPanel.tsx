import { Star, EyeOff } from 'lucide-react'
import { Card, EmptyState, StarDisplay } from '@/components/ui'
import { useStore } from '@/data/store'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * FR-13 / FR-15: average after-meeting satisfaction, with every score traceable to the
 * closed case it came from. Students stay de-identified (QA Iron Rule #2).
 */
export function AdvisingSatisfactionPanel() {
  const store = useStore()
  const { t, getCategoryLabel } = useLanguage()

  const closed = store.requests.filter(r => r.status === 'closed')
  const rated = closed
    .filter(r => r.satisfactionRating != null)
    .sort((a, b) => (b.satisfactionAt || '').localeCompare(a.satisfactionAt || ''))
  const average = rated.length
    ? rated.reduce((sum, r) => sum + (r.satisfactionRating || 0), 0) / rated.length
    : null
  const responseRate = closed.length ? Math.round((rated.length / closed.length) * 100) : 0

  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            {t('ความพึงพอใจหลังการเข้าพบ', 'Advising Satisfaction (after each meeting)')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('ทุกคะแนนแสดงที่มา: เคส หัวข้อ อาจารย์ และความคิดเห็น', 'Every score below links to the case it came from.')}
          </p>
        </div>
        <div className="flex items-end gap-5">
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-500 dark:text-slate-400">{t('คะแนนเฉลี่ย', 'Average')}</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {average != null ? average.toFixed(1) : '–'}<span className="text-sm font-semibold text-slate-400"> / 5</span>
            </p>
          </div>
          <div>
            <p className="text-[0.6875rem] font-semibold text-slate-500 dark:text-slate-400">{t('ตอบกลับ', 'Responses')}</p>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {rated.length} / {closed.length} {t('เคสที่ปิด', 'closed cases')} ({responseRate}%)
            </p>
          </div>
        </div>
      </div>

      {rated.length === 0 ? (
        <EmptyState
          icon={<Star className="h-8 w-8 text-slate-400" />}
          title={t('ยังไม่มีคะแนน', 'No ratings yet')}
          description={t('คะแนนจะแสดงเมื่อนักศึกษาให้คะแนนหลังอาจารย์ปิดเคส', 'Scores appear here after students rate a closed case.')}
        />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[36rem]">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="py-2 px-1 font-semibold">{t('คะแนน', 'Score')}</th>
                <th className="py-2 px-1 font-semibold">{t('ความคิดเห็น', 'Comment')}</th>
                <th className="py-2 px-1 font-semibold">{t('หัวข้อ', 'Topic')}</th>
                <th className="py-2 px-1 font-semibold">{t('อาจารย์', 'Advisor')}</th>
                <th className="py-2 px-1 font-semibold">{t('วันที่', 'Date')}</th>
                <th className="py-2 px-1 font-semibold">{t('อ้างอิงเคส', 'Case ref')}</th>
              </tr>
            </thead>
            <tbody>
              {rated.map(r => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 align-top">
                  <td className="py-2 px-1 whitespace-nowrap"><StarDisplay value={r.satisfactionRating || 0} /></td>
                  <td className="py-2 px-1 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{r.satisfactionComment || <span className="text-slate-400">—</span>}</td>
                  <td className="py-2 px-1 text-slate-700 dark:text-slate-300">{getCategoryLabel(r.category)}</td>
                  <td className="py-2 px-1 text-slate-700 dark:text-slate-300">{store.users.find(u => u.id === r.advisorId)?.name || r.advisorId}</td>
                  <td className="py-2 px-1 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.satisfactionAt ? new Date(r.satisfactionAt).toLocaleDateString() : '–'}</td>
                  <td className="py-2 px-1 font-mono text-slate-500 dark:text-slate-400">{r.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[0.6875rem] text-slate-500 dark:text-slate-400 mt-3">
        <EyeOff className="h-3.5 w-3.5" />
        {t('ไม่แสดงตัวตนนักศึกษา (PDPA) อาจารย์และผู้ดูแลระบบไม่เห็นคะแนนเหล่านี้', 'Students are not identified (PDPA). Advisors and admins cannot see these scores.')}
      </p>
    </Card>
  )
}
