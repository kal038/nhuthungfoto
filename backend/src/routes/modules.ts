import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { AppError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'

const modulesRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

modulesRouter.get('/', async (c) => {
  //start a service instance of supabase
  const supabase = createServiceClient(c.env)

  //query for all modules getting {data, err back}
  const { data, error } = await supabase.from('modules').select('id, title, slug, description')

  if (error) throw new AppError(error.message, 500)

  return c.json(data ?? [])
})

modulesRouter.get('/:slug', async (c) => {
  const supabase = createServiceClient(c.env)
  const slug = c.req.param('slug')
  //query a specific course from its slug
  const { data, error } = await supabase.from('modules').select('*').eq('slug', slug)

  if (error) throw new AppError(error.message, 500)

  if (!data || data.length === 0) throw new AppError('Course not found', 404)

  return c.json(data)
})

export { modulesRouter }
