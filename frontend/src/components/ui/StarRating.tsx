import { useState } from 'react'
import { Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

export const RATING_LABELS: Array<[th: string, en: string]> = [
  ['ไม่พอใจมาก', 'Very poor'],
  ['ไม่พอใจ', 'Poor'],
  ['ปานกลาง', 'Okay'],
  ['พอใจ', 'Good'],
  ['พอใจมาก', 'Excellent'],
]

/** Read-only 1–5 stars. */
export function StarDisplay({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  return (
    <span className="inline-flex" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={cn(cls, n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600')} />
      ))}
    </span>
  )
}

/** Interactive 1–5 star picker (radio group) with the label of the hovered/selected score. */
export function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const { t } = useLanguage()
  const [hover, setHover] = useState(0)
  const shown = hover || value

  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {RATING_LABELS.map(([th, en], i) => {
        const score = i + 1
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} — ${t(th, en)}`}
            onClick={() => onChange(score)}
            onMouseEnter={() => setHover(score)}
            className="p-1 rounded-lg cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Star className={cn('h-7 w-7', score <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600')} />
          </button>
        )
      })}
      <span className="ml-2 text-xs font-semibold text-slate-600 dark:text-slate-300 min-h-4">
        {shown ? t(...RATING_LABELS[shown - 1]) : ''}
      </span>
    </div>
  )
}
