import { supabase } from './supabase'
import { ApiError } from './errors'

const API_VERSION = import.meta.env.VITE_API_VER || 'v1'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export async function apiFetch<T>(
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const newHeader = new Headers()
  if (session) {
    newHeader.set('Authorization', `Bearer ${session.access_token}`)
  }

  const uri = `${API_BASE_URL}/${API_VERSION}/${path.replace(/^\/+|\/+$/g, '')}`

  const options: RequestInit = { headers: newHeader, method }
  if (body !== undefined) {
    newHeader.set('Content-Type', 'application/json')
    options.body = JSON.stringify(body)
  }

  const response = await fetch(uri, options)

  if (!response.ok) {
    let message: string
    const contentType = response.headers.get('content-type') || ''
    try {
      const body = contentType.includes('application/json')
        ? await response.json()
        : await response.text()
      message =
        body?.error || body?.message || (typeof body === 'string' ? body : null) || `HTTP Error! Status: ${response.status}`
    } catch {
      message = `HTTP Error! Status: ${response.status}`
    }
    throw new ApiError(response.status, message)
  }
  if (response.status == 204) {
    return {} as T
  }
  const data = await response.json()
  return data as T
}
