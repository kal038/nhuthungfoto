import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import type { CategoryScores } from '@/lib/grading'

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
 * On success, invalidates:
 * - admin/queue (prefix-matches both the list and the detail keys)
 * - submissions (student-facing status flipped to COMPLETED)
 */
export function useSubmitReviewMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
  })
}
