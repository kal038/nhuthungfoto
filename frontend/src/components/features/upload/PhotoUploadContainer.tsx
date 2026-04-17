import { usePhotoUploadQueue } from '@/hooks/usePhotoUploadQueue'
import { PhotoUploadPanel } from '@/components/features/upload'

interface PhotoUploadContainerProps {
  maxFiles?: number
  maxFileSizeMB?: number
  onUploadComplete?: (results: { id: string; objectKey: string; status: 'success' | 'error' }[]) => void
}

/**
 * Smart container that wires the `usePhotoUploadQueue` hook
 * into the `PhotoUploadPanel` presenter.
 *
 * Usage:
 * ```tsx
 * <PhotoUploadContainer />
 * <PhotoUploadContainer onUploadComplete={handleUpload} />
 * ```
 */
export function PhotoUploadContainer({
  maxFiles = 10,
  maxFileSizeMB = 20,
  onUploadComplete,
}: PhotoUploadContainerProps) {
  const upload = usePhotoUploadQueue({
    maxFiles,
    maxFileSizeMB,
    onUploadComplete,
  })

  return (
    <PhotoUploadPanel
      files={upload.files}
      uploadStates={upload.uploadStates}
      onFilesSelected={upload.onFilesSelected}
      onRemove={upload.onRemove}
      onUpload={upload.onUpload}
      isUploading={upload.isUploading}
      isDragActive={upload.isDragActive}
      onDragEnter={upload.onDragEnter}
      onDragLeave={upload.onDragLeave}
      onDragOver={upload.onDragOver}
      onDrop={upload.onDrop}
      maxFiles={upload.maxFiles}
      maxFileSizeMB={upload.maxFileSizeMB}
    />
  )
}
