import { Upload, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_IMAGE_TYPES,
  DEFAULT_MAX_FILE_SIZE_MB,
} from '@/types/upload'

interface PhotoUploadDropZoneProps {
  /** Callback when user selects files via input or drop. */
  onFilesSelected: (files: File[]) => void
  /** Whether the user is currently dragging files over the zone. */
  isDragActive: boolean
  /** Drag event handlers — wired by the parent container. */
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  /** Whether uploads are in-progress (disables interaction). */
  disabled?: boolean
  /** Maximum file size in MB to display in the hint text. */
  maxFileSizeMB?: number
}

/**
 * Drag-and-drop zone for selecting photo files.
 *
 * Stateless presenter — all state management & validation
 * is handled by the parent container.
 */
export function PhotoUploadDropZone({
  onFilesSelected,
  isDragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  disabled = false,
  maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
}: PhotoUploadDropZoneProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files))
      // Reset the input so the same file can be re-selected
      e.target.value = ''
    }
  }

  const acceptString = ACCEPTED_IMAGE_TYPES.join(',')

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all',
        'cursor-pointer',
        isDragActive
          ? 'border-[var(--color-cta)] bg-blue-50/50'
          : 'border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-100/50',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {/* Hidden file input */}
      <input
        id="photo-upload-input"
        type="file"
        multiple
        accept={acceptString}
        onChange={handleInputChange}
        className="absolute inset-0 z-10 cursor-pointer opacity-0"
        disabled={disabled}
        aria-label="Chọn ảnh để tải lên"
      />

      {/* Icon */}
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-full transition-colors',
          isDragActive
            ? 'bg-blue-100 text-[var(--color-cta)]'
            : 'bg-zinc-100 text-zinc-400',
        )}
      >
        {isDragActive ? (
          <Upload className="size-6" />
        ) : (
          <ImagePlus className="size-6" />
        )}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p className="font-heading text-sm font-semibold text-zinc-700">
          {isDragActive ? 'Thả ảnh vào đây' : 'Kéo thả ảnh vào đây'}
        </p>
        <p className="text-sm text-zinc-500">
          hoặc{' '}
          <span className="font-medium text-[var(--color-cta)] underline underline-offset-2">
            chọn từ máy
          </span>
        </p>
      </div>

      {/* Hint */}
      <p className="text-xs text-zinc-400">
        JPG, PNG hoặc WebP • Tối đa {maxFileSizeMB}MB mỗi ảnh
      </p>
    </div>
  )
}
