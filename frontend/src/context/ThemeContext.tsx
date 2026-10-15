import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ResolvedTheme, ThemeContextValue, ThemePreference } from '@/types/theme'
import { THEME_STORAGE_KEY, isThemePreference } from '@/types/theme'

const ThemeContext = createContext<ThemeContextValue | null>(null)

const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

const readStoredTheme = (fallback: ThemePreference): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : fallback
  } catch {
    // Storage can throw when cookies/site data are blocked.
    return fallback
  }
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemePreference
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStoredTheme(defaultTheme))
  const [systemDark, setSystemDark] = useState(prefersDark)

  // Track OS-level changes so `system` stays live.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // Apply the resolved theme to the document and persist the preference.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore write failures; theme still applies for this session.
    }
  }, [theme, resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => setThemeState(next), [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const isDark = current === 'dark' || (current === 'system' && prefersDark())
      return isDark ? 'light' : 'dark'
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
