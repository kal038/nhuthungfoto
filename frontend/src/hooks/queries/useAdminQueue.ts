import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { ApiError } from '@/lib/errors'

/** Single item in the admin queue list — mirrors backend AdminSubmissionItem */
export interface AdminSubmissionItem {
  id: string
  photoUrl: string | null
  studentName: string | null
  studentEmail: string | null
  moduleTitle: string | null
  moduleSlug: string | null
  createdAt: string
  waitingDays: number
}

/** GET /v1/admin/queue response */
export interface AdminQueueResponse {
  submissions: AdminSubmissionItem[]
  total: number
}

/** GET /v1/admin/queue/:id response */
export interface AdminSubmissionDetail {
  id: string
  photoUrl: string | null
  student: {
    username: string | null
    email: string | null
    skillLevel: string | null
  }
  module: {
    title: string | null
    slug: string | null
  }
  createdAt: string
  waitingDays: number
}

async function fetchAdminQueue(): Promise<AdminQueueResponse> {
  return apiFetch<AdminQueueResponse>('/admin/queue')
}

async function fetchAdminSubmission(id: string): Promise<AdminSubmissionDetail> {
  return apiFetch<AdminSubmissionDetail>(`/admin/queue/${id}`)
}

export function useAdminQueue() {
  return useAuthQuery<AdminQueueResponse>({
    queryKey: ['admin', 'queue'],
    queryFn: fetchAdminQueue,
    staleTime: 30 * 1000, // queue is time-sensitive
  })
}

export function useAdminSubmission(id: string) {
  return useAuthQuery<AdminSubmissionDetail>({
    queryKey: ['admin', 'queue', id],
    queryFn: () => fetchAdminSubmission(id),
    enabled: !!id,
    retry: (count, error) => {
      // 404 (not found) and 409 (not awaiting review) are never transient, so don't have to retry for those
      if (error instanceof ApiError && error.status < 500) return false
      return count < 2
    },
  })
}
