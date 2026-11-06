import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// User-adjustable text size, as a percentage of the default root font size.
// Users can only enlarge text; the last option is the hard maximum so layouts
// (sidebar, tables, cards) don't break from oversizing.
export const FONT_SCALE_OPTIONS = [100, 110, 120, 130] as const
export const DEFAULT_FONT_SCALE = FONT_SCALE_OPTIONS[0]
export const MAX_FONT_SCALE = FONT_SCALE_OPTIONS[FONT_SCALE_OPTIONS.length - 1]

/** Snap any value to the nearest allowed option (so 500 → 130, 90 → 100). */
function clampFontScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FONT_SCALE
  return FONT_SCALE_OPTIONS.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best
  , DEFAULT_FONT_SCALE as number)
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  toggleTheme: () => void
  fontScale: number
  setFontScale: (scale: number) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'advising_log_theme'
const FONT_SCALE_STORAGE_KEY = 'advising_log_font_scale'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
    return 'system'
  })

  const [fontScale, setFontScaleState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(FONT_SCALE_STORAGE_KEY)
      if (stored !== null) return clampFontScale(Number(stored))
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
    return DEFAULT_FONT_SCALE
  })

  // Scale the root font size; Tailwind sizes are rem-based, so the whole UI follows
  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.style.fontSize = fontScale === DEFAULT_FONT_SCALE ? '' : `${fontScale}%`
  }, [fontScale])

  const setFontScale = (scale: number) => {
    const next = clampFontScale(scale)
    setFontScaleState(next)
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next))
    } catch {
      // Ignore localStorage write errors
    }
  }

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  // Listen to OS system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const isDark = theme === 'system' ? systemPrefersDark : theme === 'dark'

  // Apply or remove .dark class and sync color-scheme property
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const body = document.body

    if (isDark) {
      root.classList.add('dark')
      body?.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      body?.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [isDark])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch {
      // Ignore localStorage write errors
    }

    if (typeof document !== 'undefined') {
      const willBeDark = newTheme === 'system' ? systemPrefersDark : newTheme === 'dark'
      const root = document.documentElement
      const body = document.body
      if (willBeDark) {
        root.classList.add('dark')
        body?.classList.add('dark')
        root.style.colorScheme = 'dark'
      } else {
        root.classList.remove('dark')
        body?.classList.remove('dark')
        root.style.colorScheme = 'light'
      }
    }
  }

  const toggleTheme = () => {
    // If currently dark, switch to light; if light, switch to dark
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme, fontScale, setFontScale }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
