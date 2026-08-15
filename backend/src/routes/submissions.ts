import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '@/schema/upload'
import { gradeSubmissionSchema, CREDIT_COST } from '@/schema/credit'
import { generatePresignedUploadUrl, getPublicUrl } from '@/services/r2'
import { spendAndStartGrading } from '@/services/credit'
import { AppError, BadRequestError, ZodParseError } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase'
import { trackEvent } from '@/lib/metrics'

// --- Response types (mirror these on the frontend) ---

/** POST /v1/submissions response */
export interface CreateSubmissionResponse {
  uploadUrl: string
  objectKey: string
  expiresIn: number
  submissionId: string
}

/** Single item in GET /v1/submissions/me list */
export interface SubmissionItem {
  id: string
  moduleId: number | null
  status: string
  reviewType: string | null
  createdAt: string
  originalPhotoUrl: string | null
  processedPhotoUrl: string | null
}

/** GET /v1/submissions/me response */
export interface SubmissionListResponse {
  submissions: SubmissionItem[]
}

/** POST /v1/submissions/:id/grade response */
export interface GradeSubmissionResponse {
  submissionId: string
  status: string
  reviewType: string
  creditsSpent: number
  newBalance: number
}

/** GET /v1/submissions/:id/review response */
export interface SubmissionReviewResponse {
  submissionId: string
  overallScore: number | null
  categoryScores: unknown
  comments: string | null
  reviewedAt: string
}

const submissionsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

submissionsRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const result = presignRequestSchema.safeParse(body)
  if (!result.success) {
    throw new ZodParseError()
  }
  const { fileName, contentType, fileSizeBytes, moduleId } = result.data
  const userId = c.get('user').id //grab userId from context of request
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const submissionId = crypto.randomUUID()
  const objectKey = `${userId}/${submissionId}/${safeFileName}`

  const supabase = createServiceClient(c.env)

  // Validate module exists before inserting
  if (moduleId) {
    const { data: mod } = await supabase.from('modules').select('id').eq('id', moduleId).single()
    if (!mod) throw new BadRequestError('Module not found')
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      id: submissionId,
      user_id: userId,
      original_photo_key: objectKey,
      module_id: moduleId ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    throw new AppError(`Failed to create db record: ${error.message}`, 500)
  }

  const presignedUrlResult: PresignedUrlResult = await generatePresignedUploadUrl(
    c.env,
    objectKey,
    contentType,
    fileSizeBytes,
  ).catch((err) => {
    console.error('Presign error:', err)
    throw new AppError('Failed to generate presigned URL', 502)
  })

  trackEvent(c, 'submissions.create', {
    blobs: [moduleId != null ? String(moduleId) : 'no-module'],
    doubles: [fileSizeBytes],
  })
  const response: CreateSubmissionResponse = {
    ...presignedUrlResult,
    submissionId: data.id,
    objectKey: data.original_photo_key,
  }
  return c.json(response, 200)
})

submissionsRouter.get('/me', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch submissions:', error)
    throw new AppError('Failed to fetch submissions', 500)
  }

  const submissions: SubmissionItem[] = (data || []).map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    status: row.status!,
    reviewType: row.review_type,
    createdAt: row.created_at!,
    originalPhotoUrl: row.original_photo_key
      ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, row.original_photo_key)
      : null,
    processedPhotoUrl: row.processed_photo_key
      ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, row.processed_photo_key)
      : null,
  }))

  const response: SubmissionListResponse = { submissions }
  return c.json(response, 200)
})

// POST /v1/submissions/:id/grade — spend credits and start grading atomic
submissionsRouter.post('/:id/grade', async (c) => {
  const submissionId = c.req.param('id') //from request path
  const userId = c.get('user').id //from worker context, enriched by auth middleware
  const supabase = createServiceClient(c.env)

  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const result = gradeSubmissionSchema.safeParse(body) //from request body
  if (!result.success) {
    throw new ZodParseError()
  }

  const { reviewType } = result.data
  const cost = CREDIT_COST[reviewType]

  const newBalance = await spendAndStartGrading(
    supabase,
    userId,
    submissionId,
    cost,
    reviewType,
    `grade_${submissionId}`,
  )

  trackEvent(c, 'submissions.grade', {
    blobs: [reviewType],
    doubles: [cost, newBalance],
  })
  const response: GradeSubmissionResponse = {
    submissionId,
    status: reviewType === 'HUNG' ? 'AWAITING_HUNG' : 'GRADING',
    reviewType,
    creditsSpent: cost,
    newBalance,
  }
  return c.json(response, 200)
})

// GET /v1/submissions/:id/review — student-facing: fetch review for own completed submission
submissionsRouter.get('/:id/review', async (c) => {
  const submissionId = c.req.param('id')
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  // Verify ownership
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('id', submissionId)
    .eq('user_id', userId)
    .single()

  if (subError || !submission) {
    throw new AppError('Submission not found', 404)
  }

  if (submission.status !== 'COMPLETED') {
    throw new AppError('Review not available yet', 404)
  }

  const { data: review, error: revError } = await supabase
    .from('reviews')
    .select('id, overall_score, category_scores, hung_comments, created_at')
    .eq('submission_id', submissionId)
    .single()

  if (revError || !review) {
    throw new AppError('Review not found', 404)
  }

  const response: SubmissionReviewResponse = {
    submissionId,
    overallScore: review.overall_score,
    categoryScores: review.category_scores,
    comments: review.hung_comments,
    reviewedAt: review.created_at!,
  }
  return c.json(response, 200)
})

export { submissionsRouter }
