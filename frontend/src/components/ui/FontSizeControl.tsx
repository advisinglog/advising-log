import { useEffect, useRef, useState } from 'react'
import { ALargeSmall, Check } from 'lucide-react'
import { useTheme, FONT_SCALE_OPTIONS, DEFAULT_FONT_SCALE, MAX_FONT_SCALE } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

const SIZE_LABELS: Record<number, [th: string, en: string]> = {
  100: ['ปกติ', 'Default'],
  110: ['ใหญ่', 'Large'],
  120: ['ใหญ่ขึ้น', 'Larger'],
  130: ['ใหญ่ที่สุด', 'Largest'],
}

/** Segmented picker: each option previews "Aa" at its own size. */
function SizeOptions({ onPicked }: { onPicked?: () => void }) {
  const { fontScale, setFontScale } = useTheme()
  const { t } = useLanguage()

  return (
    <div role="radiogroup" aria-label={t('ขนาดตัวอักษร', 'Text size')} className="grid grid-cols-4 gap-1.5">
      {FONT_SCALE_OPTIONS.map((scale, index) => {
        const isActive = scale === fontScale
        const [th, en] = SIZE_LABELS[scale]
        return (
          <button
            key={scale}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${t(th, en)} (${scale}%)`}
            onClick={() => {
              setFontScale(scale)
              onPicked?.()
            }}
            className={cn(
              'relative flex flex-col items-center justify-end gap-1 rounded-xl border px-1 pt-2 pb-1.5 h-[4.25rem] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
              isActive
                ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-2xs dark:border-sky-400/70 dark:bg-sky-950/50 dark:text-sky-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:text-sky-300'
            )}
          >
            {isActive && <Check className="absolute top-1 right-1 h-3 w-3" aria-hidden="true" />}
            {/* Fixed px so each preview shows its relative size regardless of the current scale */}
            <span aria-hidden="true" className="font-bold leading-none" style={{ fontSize: `${15 + index * 3}px` }}>
              Aa
            </span>
            <span className="text-[0.625rem] font-semibold leading-tight text-center">{t(th, en)}</span>
          </button>
        )
      })}
    </div>
  )
}

interface FontSizeControlProps {
  /** `popover`: icon button that opens a panel. `inline`: the picker itself (e.g. inside a menu). */
  variant?: 'popover' | 'inline'
  className?: string
}

export function FontSizeControl({ variant = 'popover', className = '' }: FontSizeControlProps) {
  const { fontScale } = useTheme()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    // Close on any press outside the trigger + panel. A document listener is used instead of a
    // fixed overlay, because ancestors with backdrop-blur/transform would trap a fixed overlay.
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (variant === 'inline') {
    return (
      <div className={className}>
        <SizeOptions />
      </div>
    )
  }

  const isEnlarged = fontScale !== DEFAULT_FONT_SCALE
  const label = t('ขนาดตัวอักษร', 'Text size')

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} (${fontScale}%)`}
        title={`${label} (${fontScale}%)`}
        className={cn(
          'relative h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
          open
            ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/25'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
        )}
      >
        <ALargeSmall className="h-5 w-5" />
        {/* Dot shows the text has been enlarged */}
        {isEnlarged && (
          <span aria-hidden="true" className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-full mt-2.5 z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl dark:border-slate-800 dark:bg-[#0e1424] animate-[slideIn_0.15s_ease-out]"
        >
          <div className="flex items-baseline justify-between px-0.5 pb-2.5">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</span>
            <span className="text-[0.625rem] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              {fontScale}% · {t(`สูงสุด ${MAX_FONT_SCALE}%`, `max ${MAX_FONT_SCALE}%`)}
            </span>
          </div>
          <SizeOptions />
          <p className="px-0.5 pt-2.5 text-[0.625rem] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('ปรับขนาดตัวอักษรทั้งระบบ บันทึกไว้ในอุปกรณ์นี้', 'Applies to the whole app and is saved on this device.')}
          </p>
        </div>
      )}
    </div>
  )
}
