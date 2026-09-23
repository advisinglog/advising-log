import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'advising_log_theme'

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
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
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
