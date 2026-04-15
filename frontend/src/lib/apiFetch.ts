import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export async function apiFetch<T>(path: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const newHeader = new Headers()
  if (session) {
    newHeader.set('Authorization', `Bearer ${session.access_token}`)
  }

  const uri = `${API_BASE_URL}/${path.replace(/^\/+|\/+$/g, '')}`
  const response = await fetch(uri, { headers: newHeader })

  if (!response.ok) {
    throw new Error(`HTTP Error! Status: ${response.status}`)
  }
  if (response.status == 204) {
    return {} as T
  }
  const data = await response.json()
  return data as T
}
