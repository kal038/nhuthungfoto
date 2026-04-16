import { usePhotoUploadQueue } from '@/hooks/usePhotoUploadQueue'
import { PhotoUploadPanel } from '@/components/features/upload'

/**
 * Smart container that wires the `usePhotoUploadQueue` hook
 * into the `PhotoUploadPanel` presenter.
 *
 * Usage:
 * ```tsx
 * <PhotoUploadContainer />
 * ```
 */
export function PhotoUploadContainer() {
  const upload = usePhotoUploadQueue({
    maxFiles: 10,
    maxFileSizeMB: 20,
    onUploadComplete: (results) => {
      const succeeded = results.filter((r) => r.status === 'success')
      const failed = results.filter((r) => r.status === 'error')

      if (succeeded.length > 0) {
        // TODO: Notify parent / invalidate queries / navigate
        console.log(`${succeeded.length} ảnh tải lên thành công`, succeeded)
      }
      if (failed.length > 0) {
        console.warn(`${failed.length} ảnh tải lên thất bại`, failed)
      }
    },
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
