/**
 * Shared grading category metadata.
 * Keys must match backend gradingRequestSchema (backend/src/schema/grading.ts) — keep in sync.
 */
export const CATEGORY_KEYS = [
  'composition',
  'exposure',
  'creativity',
  'storytelling',
  'focus',
] as const

export type CategoryKey = (typeof CATEGORY_KEYS)[number]

export type CategoryScores = Record<CategoryKey, number>

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  composition: 'Bố cục',
  exposure: 'Phơi sáng',
  creativity: 'Sáng tạo',
  storytelling: 'Kể chuyện',
  focus: 'Lấy nét',
}
