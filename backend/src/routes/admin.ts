import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { isAdminMiddleware } from '@/middleware/isAdmin'
import { gradingRequestSchema } from '@/schema/grading'
import { AppError, ZodParseError } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase'
import { getPublicUrl } from '@/services/r2'
import { trackEvent } from '@/lib/metrics'

// --- Response types (mirror these on the frontend) ---

/** Single item in the admin queue list */
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

/** GET /v1/admin/submissions response */
export interface AdminQueueResponse {
  submissions: AdminSubmissionItem[]
  total: number
}

/** GET /v1/admin/submissions/:id response */
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
  nextSubmissionId: string | null
}

/** POST /v1/admin/submissions/:id/review response */
export interface AdminReviewResponse {
  submissionId: string
  status: 'COMPLETED'
}

const adminRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

// All admin routes require admin email
adminRouter.use('*', isAdminMiddleware)

// GET /v1/admin/me — lightweight admin check for frontend
adminRouter.get('/me', (c) => {
  return c.json({ isAdmin: true }, 200)
})

// GET /v1/admin/submissions — queue of AWAITING_HUNG submissions (oldest first)
adminRouter.get('/submissions', async (c) => {
  const supabase = createServiceClient(c.env)

  const { data, error, count } = await supabase
    .from('submissions')
    .select(
      `
      id,
      original_photo_key,
      processed_photo_key,
      created_at,
      review_type,
      user_id,
      module_id,
      profiles!inner ( username, email, skill_level ),
      modules ( title, slug )
    `,
      { count: 'exact' },
    )
    .eq('status', 'AWAITING_HUNG')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch admin submissions queue:', error)
    throw new AppError('Failed to fetch submissions queue', 500)
  }

  const now = Date.now()
  const submissions: AdminSubmissionItem[] = (data ?? []).map((row) => {
    const createdMs = new Date(row.created_at!).getTime()
    const waitingDays = Math.floor((now - createdMs) / (1000 * 60 * 60 * 24))
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const mod = Array.isArray(row.modules) ? row.modules[0] : row.modules

    return {
      id: row.id,
      photoUrl: row.processed_photo_key
        ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, row.processed_photo_key)
        : row.original_photo_key
          ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, row.original_photo_key)
          : null,
      studentName: profile?.username ?? null,
      studentEmail: profile?.email ?? null,
      moduleTitle: mod?.title ?? null,
      moduleSlug: mod?.slug ?? null,
      createdAt: row.created_at!,
      waitingDays,
    }
  })

  const response: AdminQueueResponse = { submissions, total: count ?? 0 }
  return c.json(response, 200)
})

// GET /v1/admin/submissions/:id — single submission detail for grading panel
adminRouter.get('/submissions/:id', async (c) => {
  const submissionId = c.req.param('id')
  const supabase = createServiceClient(c.env)

  // Fetch the submission with joined profile and module
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
      id,
      original_photo_key,
      processed_photo_key,
      created_at,
      review_type,
      status,
      profiles!inner ( username, email, skill_level ),
      modules ( title, slug )
    `,
    )
    .eq('id', submissionId)
    .single()

  if (error || !data) {
    throw new AppError('Submission not found', 404)
  }

  if (data.status !== 'AWAITING_HUNG') {
    throw new AppError('Submission is not awaiting review', 409)
  }

  // Find the next-oldest AWAITING_HUNG submission (for "Tiếp theo →" button)
  const { data: nextData } = await supabase
    .from('submissions')
    .select('id')
    .eq('status', 'AWAITING_HUNG')
    .neq('id', submissionId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const now = Date.now()
  const createdMs = new Date(data.created_at!).getTime()
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  const mod = Array.isArray(data.modules) ? data.modules[0] : data.modules

  const response: AdminSubmissionDetail = {
    id: data.id,
    photoUrl: data.processed_photo_key
      ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, data.processed_photo_key)
      : data.original_photo_key
        ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, data.original_photo_key)
        : null,
    student: {
      username: profile?.username ?? null,
      email: profile?.email ?? null,
      skillLevel: profile?.skill_level ?? null,
    },
    module: {
      title: mod?.title ?? null,
      slug: mod?.slug ?? null,
    },
    createdAt: data.created_at!,
    waitingDays: Math.floor((now - createdMs) / (1000 * 60 * 60 * 24)),
    nextSubmissionId: nextData?.id ?? null,
  }

  return c.json(response, 200)
})

// POST /v1/admin/submissions/:id/review — submit Hùng's grade
adminRouter.post('/submissions/:id/review', async (c) => {
  const submissionId = c.req.param('id')
  const supabase = createServiceClient(c.env)

  const body = await c.req.json().catch(() => {
    throw new ZodParseError('Request body must be valid JSON')
  })

  const result = gradingRequestSchema.safeParse(body)
  if (!result.success) {
    throw new ZodParseError()
  }

  const { overallScore, categoryScores, comment } = result.data

  const { error } = await (supabase.rpc as any)('admin_submit_review', {
    p_submission_id: submissionId,
    p_overall_score: overallScore,
    p_category_scores: categoryScores as unknown as Record<string, unknown>,
    p_hung_comments: comment,
  })

  if (error) {
    console.error('admin_submit_review RPC error:', error)

    switch (error.code) {
      case 'P0002':
        throw new AppError('Submission not found', 404)
      case '55000':
        throw new AppError('Submission is not awaiting review', 409)
      default:
        throw new AppError('Failed to submit review', 500)
    }
  }

  trackEvent(c, 'admin.review.submit', {
    blobs: [submissionId],
    doubles: [overallScore],
  })

  const response: AdminReviewResponse = { submissionId, status: 'COMPLETED' }
  return c.json(response, 200)
})

export { adminRouter }
