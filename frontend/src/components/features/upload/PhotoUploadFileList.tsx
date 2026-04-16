import type { UploadableFile, UploadStateMap } from '@/types/upload'
import { PhotoUploadThumbnail } from './PhotoUploadThumbnail'

interface PhotoUploadFileListProps {
  /** Array of files selected by the user. */
  files: UploadableFile[]
  /** Upload state for each file, keyed by file id. */
  uploadStates: UploadStateMap
  /** Callback to remove a file by its id. */
  onRemove: (id: string) => void
}

const DEFAULT_FILE_STATE = {
  status: 'idle' as const,
}

/**
 * Responsive grid of photo thumbnails.
 *
 * Stateless presenter — maps files → thumbnails.
 */
export function PhotoUploadFileList({
  files,
  uploadStates,
  onRemove,
}: PhotoUploadFileListProps) {
  if (files.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {files.map((file) => (
        <PhotoUploadThumbnail
          key={file.id}
          file={file}
          uploadState={uploadStates[file.id] ?? DEFAULT_FILE_STATE}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
