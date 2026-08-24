import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { ApiError } from '@/lib/errors'
import type { CategoryScores } from '@/lib/grading'

/** GET /v1/submissions/:id/review response */
export interface SubmissionReview {
  submissionId: string
  overallScore: number | null
  categoryScores: CategoryScores
  comments: string | null
  reviewedAt: string
}

async function fetchReview(submissionId: string): Promise<SubmissionReview> {
  return apiFetch<SubmissionReview>(`/submissions/${submissionId}/review`)
}

/**
 * Student-facing: fetch Hùng's review for a completed submission.
 * Gate with `enabled` (e.g. status === 'COMPLETED' and dialog open) —
 * the backend 404s for any non-COMPLETED submission.
 */
export function useReview(submissionId: string, enabled: boolean) {
  return useAuthQuery<SubmissionReview>({
    queryKey: ['submissions', 'review', submissionId],
    queryFn: () => fetchReview(submissionId),
    enabled: enabled && !!submissionId,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => {
      // 404 means "no review yet" — never transient
      if (error instanceof ApiError && error.status < 500) return false
      return count < 2
    },
  })
}
