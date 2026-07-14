import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import { getPublicUrl } from '@/services/r2'

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

  const mappedModules = (modules ?? []).map((module) => ({
    id: module.id,
    title: module.title,
    slug: module.slug,
    description: module.description,
    estimatedMinutes: module.estimated_minutes,
    coverPhotoUrl: module.cover_photo_key ? getPublicUrl(baseUrl, module.cover_photo_key) : null,
  }))

  return c.json({
    modules: mappedModules,
    currentModule: profile?.current_module ?? 1,
  })
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

  const module = {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    contentMarkdown: data.content_markdown,
    level: data.level,
    track: data.track,
    isFree: data.is_free,
    isPublished: data.is_published,
    coverPhotoUrl: data.cover_photo_key ? getPublicUrl(baseUrl, data.cover_photo_key) : null,
    examplePhotoUrls,
    assignmentPrompt: data.assignment_prompt,
    estimatedMinutes: data.estimated_minutes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return c.json(module)
})

export { modulesRouter }
