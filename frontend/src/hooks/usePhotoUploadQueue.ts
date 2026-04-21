import { useState, useCallback, useRef } from 'react'
import type { UploadableFile, UploadStateMap } from '@/types/upload'
import { ACCEPTED_IMAGE_TYPES, DEFAULT_MAX_FILE_SIZE_MB, DEFAULT_MAX_FILES } from '@/types/upload'
import { useUploadPhotoMutation } from '@/hooks/mutations/useUploadPhotoMutation'

interface UsePhotoUploadOptions {
  maxFiles?: number
  maxFileSizeMB?: number
  onUploadComplete?: (
    results: { id: string; objectKey: string; status: 'success' | 'error' }[],
  ) => void
}

/**
 * Smart hook managing full photo upload lifecycle:
 * file selection, validation, drag-and-drop, upload via mutation, cleanup.
 */
export function usePhotoUploadQueue(options: UsePhotoUploadOptions = {}) {
  const {
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
    onUploadComplete,
  } = options

  const [files, setFiles] = useState<UploadableFile[]>([])
  const [uploadStates, setUploadStates] = useState<UploadStateMap>({})
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const uploadPhoto = useUploadPhotoMutation()

  // ─── Validation ──────────────────────────────────────────

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        return `Định dạng không hỗ trợ: ${file.type || 'unknown'}`
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        return `Ảnh quá lớn (${(file.size / (1024 * 1024)).toFixed(1)}MB > ${maxFileSizeMB}MB)`
      }
      return null
    },
    [maxFileSizeMB],
  )

  // ─── File selection ──────────────────────────────────────

  const handleFilesSelected = useCallback(
    (newFiles: File[]) => {
      setFiles((prev) => {
        const remaining = maxFiles - prev.length
        if (remaining <= 0) return prev

        const batch = newFiles.slice(0, remaining)
        const uploadable: UploadableFile[] = []
        const newStates: UploadStateMap = {}

        for (const file of batch) {
          const id = crypto.randomUUID()
          const error = validateFile(file)

          uploadable.push({ id, file, preview: URL.createObjectURL(file) })
          newStates[id] = error ? { status: 'error', errorMessage: error } : { status: 'idle' }
        }

        setUploadStates((prev) => ({ ...prev, ...newStates }))
        return [...prev, ...uploadable]
      })
    },
    [maxFiles, validateFile],
  )

  // ─── Remove ──────────────────────────────────────────────

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) URL.revokeObjectURL(file.preview)
      return prev.filter((f) => f.id !== id)
    })
    setUploadStates((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  // ─── Upload all ──────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    const toUpload = files.filter(
      (f) => !uploadStates[f.id] || uploadStates[f.id].status === 'idle',
    )
    if (toUpload.length === 0) return

    setIsUploading(true)

    const results: { id: string; objectKey: string; status: 'success' | 'error' }[] = []

    for (const { id, file } of toUpload) {
      setUploadStates((prev) => ({ ...prev, [id]: { status: 'uploading' } }))

      try {
        const result = await uploadPhoto.mutateAsync(file)
        setUploadStates((prev) => ({ ...prev, [id]: { status: 'success' } }))
        results.push({ id, objectKey: result.objectKey, status: 'success' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Lỗi không xác định'
        setUploadStates((prev) => ({ ...prev, [id]: { status: 'error', errorMessage: message } }))
        console.log(message)
        results.push({ id, objectKey: '', status: 'error' })
      }
    }

    setIsUploading(false)
    onUploadComplete?.(results)
  }, [files, uploadStates, uploadPhoto, onUploadComplete])

  // ─── Drag-and-drop handlers ──────────────────────────────

  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (dragCounter.current === 1) {
      setIsDragActive(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current === 0) {
      setIsDragActive(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(Array.from(e.dataTransfer.files))
      }
    },
    [handleFilesSelected],
  )

  // ─── Reset ──────────────────────────────────────────────

  const reset = useCallback(() => {
    for (const file of files) URL.revokeObjectURL(file.preview)
    setFiles([])
    setUploadStates({})
    setIsUploading(false)
    setIsDragActive(false)
  }, [files])

  return {
    files,
    uploadStates,
    isDragActive,
    isUploading,
    onFilesSelected: handleFilesSelected,
    onRemove: handleRemove,
    onUpload: handleUpload,
    reset,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    maxFiles,
    maxFileSizeMB,
  }
}
