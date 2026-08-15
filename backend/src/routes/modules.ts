import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import { getPublicUrl } from '@/services/r2'

// --- Response types (mirror these on the frontend) ---

/** Single module in the list returned by GET /v1/modules */
export interface ModuleListItem {
  id: number
  title: string
  slug: string
  description: string | null
  estimatedMinutes: number | null
  coverPhotoUrl: string | null
}

/** GET /v1/modules response */
export interface ModuleListResponse {
  modules: ModuleListItem[]
  currentModule: number
}

/** GET /v1/modules/:slug response */
export interface ModuleDetailResponse {
  id: number
  title: string
  slug: string
  description: string | null
  contentMarkdown: string | null
  level: string | null
  track: string | null
  isFree: boolean
  isPublished: boolean
  coverPhotoUrl: string | null
  examplePhotoUrls: string[]
  assignmentPrompt: string | null
  estimatedMinutes: number | null
  createdAt: string
  updatedAt: string
}

const modulesRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

modulesRouter.get('/', async (c) => {
  const supabase = createServiceClient(c.env)
  const userId = c.get('user').id

  const [{ data: modules, error: modulesError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase
        .from('modules')
        .select('id, title, slug, description, cover_photo_key, estimated_minutes')
        .eq('is_published', true)
        .order('id', { ascending: true }),
      supabase.from('profiles').select('current_module').eq('id', userId).single(),
    ])

  if (modulesError) throw new AppError(modulesError.message, 500)
  if (profileError) throw new AppError(profileError.message, 500)

  const baseUrl = c.env.R2_PORTFOLIO_PUBLIC_URL

  const mappedModules: ModuleListItem[] = (modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    slug: module.slug,
    description: module.description,
    estimatedMinutes: module.estimated_minutes,
    coverPhotoUrl: module.cover_photo_key ? getPublicUrl(baseUrl, module.cover_photo_key) : null,
  }))

  const response: ModuleListResponse = {
    modules: mappedModules,
    currentModule: profile?.current_module ?? 1,
  }
  return c.json(response, 200)
})

modulesRouter.get('/:slug', async (c) => {
  const supabase = createServiceClient(c.env)
  const slug = c.req.param('slug')

  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error) throw new AppError(error.message, 500)
  if (!data) throw new AppError('Course not found', 404)

  const baseUrl = c.env.R2_PORTFOLIO_PUBLIC_URL

  const rawExampleKeys = (data.example_photo_keys ?? []) as string[]
  const examplePhotoUrls = rawExampleKeys.map((key) => getPublicUrl(baseUrl, key))

  const module: ModuleDetailResponse = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    contentMarkdown: data.content_markdown,
    level: data.level,
    track: data.track,
    isFree: data.is_free!,
    isPublished: data.is_published!,
    coverPhotoUrl: data.cover_photo_key ? getPublicUrl(baseUrl, data.cover_photo_key) : null,
    examplePhotoUrls,
    assignmentPrompt: data.assignment_prompt,
    estimatedMinutes: data.estimated_minutes,
    createdAt: data.created_at!,
    updatedAt: data.updated_at!,
  }

  const response = module
  return c.json(response, 200)
})

export { modulesRouter }
