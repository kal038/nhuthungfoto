import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '@/schema/upload'
import { gradeSubmissionSchema, CREDIT_COST } from '@/schema/credit'
import { generatePresignedUploadUrl, getPublicUrl } from '@/services/r2'
import { spendCredits } from '@/services/credit'
import { AppError, BadRequestError, ZodParseError } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase'

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

  return c.json(
    { ...presignedUrlResult, submissionId: data.id, objectKey: data.original_photo_key },
    200,
  )
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

  const submissions = (data || []).map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    status: row.status,
    reviewType: row.review_type,
    createdAt: row.created_at,
    originalPhotoUrl: row.original_photo_key
      ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, row.original_photo_key)
      : null,
    processedPhotoUrl: row.processed_photo_key
      ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, row.processed_photo_key)
      : null,
  }))

  return c.json({ submissions }, 200)
})

// GET /v1/submissions/user/:username
// Any authenticated user can view another user's submissions
submissionsRouter.get('/user/:username', async (c) => {
  const username = c.req.param('username')
  const supabase = createServiceClient(c.env)

  // Find user by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single()

  if (profileError || !profile) {
    throw new AppError('User not found', 404)
  }

  // Fetch their submissions
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch submissions:', error)
    throw new AppError('Failed to fetch submissions', 500)
  }

  const submissions = (data || []).map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    status: row.status,
    reviewType: row.review_type,
    createdAt: row.created_at,
    originalPhotoUrl: row.original_photo_key
      ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, row.original_photo_key)
      : null,
    processedPhotoUrl: row.processed_photo_key
      ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, row.processed_photo_key)
      : null,
  }))

  return c.json({ submissions }, 200)
})

// POST /v1/submissions/:id/grade — spend credits and start grading
submissionsRouter.post('/:id/grade', async (c) => {
  const submissionId = c.req.param('id')
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  // Validate request body
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const result = gradeSubmissionSchema.safeParse(body)
  if (!result.success) {
    throw new ZodParseError()
  }

  const { reviewType } = result.data

  // Fetch submission and verify ownership + status
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, user_id, status, review_type')
    .eq('id', submissionId)
    .single()

  if (fetchError || !submission) {
    throw new AppError('Submission not found', 404)
  }

  if (submission.user_id !== userId) {
    throw new AppError('Submission not found', 404) // Don't leak existence
  }

  if (submission.status !== 'UPLOADED') {
    throw new AppError(
      `Submission cannot be graded in status: ${submission.status}`,
      409,
    )
  }

  // Determine credit cost
  const cost = CREDIT_COST[reviewType]

  // Atomically deduct credits (throws 402 on insufficient balance)
  const newBalance = await spendCredits(
    supabase,
    userId,
    cost,
    {
      submission_id: submissionId,
      review_type: reviewType,
    },
    `grade_${submissionId}`
  )

  // Update submission status and review type
  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      status: 'GRADING',
      review_type: reviewType,
    })
    .eq('id', submissionId)

  if (updateError) {
    // Credits already deducted — log for manual reconciliation
    console.error('CRITICAL: Credits deducted but submission update failed:', {
      submissionId,
      userId,
      cost,
      error: updateError,
    })
    throw new AppError('Failed to update submission status', 500)
  }

  return c.json(
    {
      submissionId,
      status: 'GRADING',
      reviewType,
      creditsSpent: cost,
      newBalance,
    },
    200,
  )
})

export { submissionsRouter }
