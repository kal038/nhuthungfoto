import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'

interface PresignRequest {
  fileName: string
  contentType: string
  fileSizeBytes: number
}

interface PresignURLResult {
  uploadUrl: string
  objectKey: string
  expiresIn: number
}

interface UploadPhotoResult {
  objectKey: string
}

/**
 * Uploads single photo via presigned URL.
 * 1. Fetch presigned URL from backend.
 * 2. PUT file directly to storage via fetch.
 */
async function uploadPhoto(file: File): Promise<UploadPhotoResult> {
  const body: PresignRequest = {
    fileName: file.name,
    contentType: file.type,
    fileSizeBytes: file.size,
  }

  const presign = await apiFetch<PresignURLResult>('presign', body)

  const res = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!res.ok) {
    throw new Error(`Upload thất bại: HTTP ${res.status}`)
  }

  return { objectKey: presign.objectKey }
}

/**
 * TanStack Query mutation for uploading single photo.
 */
export function useUploadPhotoMutation() {
  return useMutation({
    mutationFn: uploadPhoto,
  })
}
