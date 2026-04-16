import { Upload, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { UploadableFile, UploadStateMap } from '@/types/upload'
import { DEFAULT_MAX_FILES, DEFAULT_MAX_FILE_SIZE_MB } from '@/types/upload'
import { PhotoUploadDropZone } from './PhotoUploadDropZone'
import { PhotoUploadFileList } from './PhotoUploadFileList'

interface PhotoUploadPanelProps {
  /** Selected files to display and upload. */
  files: UploadableFile[]
  /** Per-file upload states. */
  uploadStates: UploadStateMap
  /** Callback when new files are selected (via drop or file picker). */
  onFilesSelected: (files: File[]) => void
  /** Callback to remove a file from the queue. */
  onRemove: (id: string) => void
  /** Callback to start uploading all queued files. */
  onUpload: () => void
  /** Whether files are currently being uploaded. */
  isUploading: boolean
  /** Drag-active state for the drop zone. */
  isDragActive: boolean
  /** Drag event handlers — wired by the parent container. */
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  /** Max files allowed. */
  maxFiles?: number
  /** Max file size in MB. */
  maxFileSizeMB?: number
}

/**
 * Top-level upload panel that composes the drop zone + file list + upload button.
 *
 * Stateless presenter — all logic lives in the parent container / hooks.
 */
export function PhotoUploadPanel({
  files,
  uploadStates,
  onFilesSelected,
  onRemove,
  onUpload,
  isUploading,
  isDragActive,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB,
}: PhotoUploadPanelProps) {
  const hasFiles = files.length > 0
  const allUploaded = hasFiles && files.every(
    (f) => uploadStates[f.id]?.status === 'success',
  )
  const hasIdle = files.some(
    (f) => !uploadStates[f.id] || uploadStates[f.id].status === 'idle',
  )
  const canUpload = hasFiles && hasIdle && !isUploading

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="size-5 text-[var(--color-cta)]" />
          Tải ảnh lên
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Drop zone — hidden if max files reached AND not uploading */}
        {files.length < maxFiles && (
          <PhotoUploadDropZone
            onFilesSelected={onFilesSelected}
            isDragActive={isDragActive}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            disabled={isUploading}
            maxFileSizeMB={maxFileSizeMB}
          />
        )}

        {/* File previews grid */}
        <PhotoUploadFileList
          files={files}
          uploadStates={uploadStates}
          onRemove={onRemove}
        />

        {/* Footer: file count + upload button */}
        {hasFiles && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              {files.length} / {maxFiles} ảnh
              {allUploaded && (
                <span className="ml-2 text-emerald-600">
                  • Tải lên hoàn tất ✓
                </span>
              )}
            </p>

            {canUpload && (
              <Button
                onClick={onUpload}
                disabled={!canUpload}
                size="lg"
                className="gap-2 bg-[var(--color-cta)] text-white hover:bg-blue-700"
              >
                <Upload className="size-4" />
                Tải lên
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
