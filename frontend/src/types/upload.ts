/**
 * Upload feature type definitions.
 */

/** A file selected by the user, enriched with client-side metadata. */
export interface UploadableFile {
  id: string
  file: File
  preview: string
}

/** Per-file upload state, keyed by UploadableFile.id. */
export interface UploadFileState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  errorMessage?: string
}

/** Map from UploadableFile.id → its upload state. */
export type UploadStateMap = Record<string, UploadFileState>

/** Accepted image MIME types for photo uploads. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Default maximum file size in megabytes. */
export const DEFAULT_MAX_FILE_SIZE_MB = 20

/** Default maximum number of files per upload batch. */
export const DEFAULT_MAX_FILES = 10
