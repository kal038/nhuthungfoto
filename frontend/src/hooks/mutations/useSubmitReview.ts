import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import type { CategoryScores } from '@/lib/grading'
import type { AdminQueueResponse } from '@/hooks/queries/useAdminQueue'

export interface SubmitReviewInput {
  submissionId: string
  overallScore: number
  categoryScores: CategoryScores
  comment: string
}

/** POST /v1/admin/queue/:id/review response */
export interface SubmitReviewResult {
  submissionId: string
  status: 'COMPLETED'
}

async function submitReview({
  submissionId,
  ...body
}: SubmitReviewInput): Promise<SubmitReviewResult> {
  // body is exactly { overallScore, categoryScores, comment } —
  // backend gradingRequestSchema is .strict(), no extra keys allowed
  return apiFetch<SubmitReviewResult>(`/admin/queue/${submissionId}/review`, {
    body,
    method: 'POST',
  })
}

/**
 * Mutation for Hùng to submit a grade for an AWAITING_HUNG submission.
 *
 * On success:
 * - Optimistically removes the graded submission from the cached admin queue,
 *   so anything derived from that cache (e.g. prev/next neighbor navigation)
 *   reflects the new state immediately, regardless of when the invalidated
 *   refetch lands.
 * - Invalidates:
 *   - admin/queue (prefix-matches both the list and the detail keys)
 *   - submissions (student-facing status flipped to COMPLETED)
 */
export function useSubmitReviewMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitReview,
    onSuccess: (_data, variables) => {
      // Drop the just-graded submission from the cached queue before the
      // invalidation refetch replaces it with the server view.
      queryClient.setQueryData<AdminQueueResponse>(['admin', 'queue'], (cached) => {
        if (!cached) return cached
        return {
          ...cached,
          submissions: cached.submissions.filter((s) => s.id !== variables.submissionId),
          total: Math.max(0, cached.total - 1),
        }
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] }) //to be removed in next iteration bc admin does not have submissions
    },
  })
}
