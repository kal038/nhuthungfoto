import { supabase } from './supabase'

const API_VERSION = import.meta.env.VITE_API_VER || 'v1'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export async function apiFetch<T>(
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
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
    throw new Error(`HTTP Error! Status: ${response.status}`)
  }
  if (response.status == 204) {
    return {} as T
  }
  const data = await response.json()
  return data as T
}
