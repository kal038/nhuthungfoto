import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadableFile, UploadFileState } from '@/types/upload'

interface PhotoUploadThumbnailProps {
  file: UploadableFile
  uploadState: UploadFileState
  onRemove: (id: string) => void
}

/**
 * Single photo thumbnail with status overlay.
 * Stateless presenter.
 */
export function PhotoUploadThumbnail({
  file,
  uploadState,
  onRemove,
}: PhotoUploadThumbnailProps) {
  const { status, errorMessage } = uploadState
  const isRemovable = status !== 'uploading'

  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-zinc-200"
      title={file.file.name}
    >
      {/* Preview image */}
      <img
        src={file.preview}
        alt={`Xem trước: ${file.file.name}`}
        className="size-full object-cover"
        loading="lazy"
      />

      {/* Overlay — uploading */}
      {status === 'uploading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <style>{`@keyframes thumbnail-spin { to { transform: rotate(360deg); } }`}</style>
          <div
            className="upload-spinner size-7 rounded-full border-[2.5px] border-white/30 border-t-white"
            style={{
              animation: 'thumbnail-spin 0.75s linear infinite',
            }}
          />
        </div>
      )}

      {/* Overlay — success */}
      {status === 'success' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <CheckCircle2 className="size-6 text-emerald-400" />
        </div>
      )}

      {/* Overlay — error */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
          <AlertCircle className="size-5 text-red-400" />
          <span className="max-w-[90%] truncate px-1 text-center text-[10px] text-red-300">
            {errorMessage || 'Lỗi tải lên'}
          </span>
        </div>
      )}

      {/* Remove button */}
      {isRemovable && (
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          className={cn(
            'absolute right-1.5 top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          )}
          aria-label={`Xóa ${file.file.name}`}
        >
          <X className="size-3.5" />
        </button>
      )}

      {/* File name on hover */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 transition-opacity',
          'opacity-0 group-hover:opacity-100',
          status !== 'idle' && 'hidden',
        )}
      >
        <p className="truncate text-[10px] font-medium text-white">
          {file.file.name}
        </p>
        <p className="text-[10px] text-white/70">
          {(file.file.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      </div>
    </div>
  )
}
