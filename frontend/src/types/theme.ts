/** User-chosen theme preference. `system` follows the OS setting. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Theme actually applied to the document after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark'

/** Shape exposed by the theme context. */
export interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
  toggleTheme: () => void
}

/** localStorage key shared with the inline bootstrap script in index.html. */
export const THEME_STORAGE_KEY = 'nhuthungfoto-theme'

/** Narrows an unknown value to a valid `ThemePreference`. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}
