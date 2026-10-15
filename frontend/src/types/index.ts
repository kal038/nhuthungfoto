/**
 * Shared TypeScript interfaces & types.
 *
 * Define the exact JSON shapes expected from the backend API here,
 * then import them into hooks and components as needed.
 */
export type { GalleryProfile, GallerySubmission, GalleryData } from './gallery'
export type { ThemePreference, ResolvedTheme, ThemeContextValue } from './theme'
export { THEME_STORAGE_KEY, isThemePreference } from './theme'
