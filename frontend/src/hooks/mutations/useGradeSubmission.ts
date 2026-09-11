import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'

export interface GradeSubmissionInput {
  submissionId: string
  reviewType: 'AI' | 'HUNG'
}

export interface GradeSubmissionResult {
  submissionId: string
  status: string
  reviewType: string
  creditsSpent: number
  newBalance: number
}

async function gradeSubmission({
  submissionId,
  reviewType,
}: GradeSubmissionInput): Promise<GradeSubmissionResult> {
  return apiFetch<GradeSubmissionResult>(
    `/submissions/${submissionId}/grade`,
    { body: { reviewType }, method: 'POST' },
  )
}

/**
 * Mutation to spend credits and start grading a submission.
 *
 * On success, invalidates:
 * - credits/balance (balance changed)
 * - credits/history (new transaction)
 * - submissions (status changed to GRADING)
 */
export function useGradeSubmissionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: gradeSubmission,
    onSuccess: (data) => {
      // Update balance cache immediately
      queryClient.setQueryData(queryKeys.credits.balance(), data.newBalance)

      // Invalidate history and submissions for refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.histories() })
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all })
    },
  })
}
