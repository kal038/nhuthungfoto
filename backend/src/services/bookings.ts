import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { AppError } from '@/lib/errors'
import { safeSecretCompare } from '@/lib/utils'
import {
  getBookerEmail,
  getMeetUrl,
  getMetadataUserId,
  type CalcomBookingPayload,
  type CalcomWebhook,
} from '@/schema/calcom'

type Client = SupabaseClient<Database>
type BookingStatus = Database['public']['Enums']['booking_status']

export interface UserBooking {
  uid: string
  startTime: string
  status: BookingStatus
  meetUrl: string | null
}

export type SyncBookingResult = { synced: true } | { synced: false; reason: 'user_not_found' }

/** HMAC-SHA256 hex digest via Web Crypto (no node:crypto, works on Workers). */
async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Constant-time check of Cal.com's `X-Cal-Signature-256`: an HMAC-SHA256 hex
 * digest of the raw request body keyed by the webhook secret.
 */
export async function isValidCalcomSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!secret) return false

  const expected = await hmacSha256Hex(secret, rawBody)
  return safeSecretCompare(signature, expected)
}

/** Matches a Cal.com attendee email to a profile id (emails are stored lowercase). */
async function findUserIdByEmail(supabase: Client, email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    console.error('Failed to look up profile by email:', error)
    throw new AppError('Failed to look up profile', 500)
  }

  return data?.id ?? null
}

/** Verifies a fallback `metadata.userId` exists in `public.profiles`. */
async function findUserIdById(supabase: Client, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to look up profile by id:', error)
    throw new AppError('Failed to look up profile', 500)
  }

  return data?.id ?? null
}

/** Resolves booker to a student profile: email match first, `metadata.userId` fallback. */
async function resolveBookingUserId(
  supabase: Client,
  payload: CalcomBookingPayload,
): Promise<string | null> {
  const email = getBookerEmail(payload).trim().toLowerCase()
  const byEmail = await findUserIdByEmail(supabase, email)
  if (byEmail) return byEmail

  const metadataUserId = getMetadataUserId(payload)
  if (metadataUserId) {
    const byId = await findUserIdById(supabase, metadataUserId)
    if (byId) return byId
  }

  console.warn('Cal.com booking skipped: no profile matched', {
    uid: payload.uid,
    email,
    metadataUserId,
  })
  return null
}

/** Row shape shared by create/reschedule upserts; omits a null meet link so it never clobbers. */
function toBookingRow(payload: CalcomBookingPayload, userId: string) {
  const meetUrl = getMeetUrl(payload)

  return {
    calcom_booking_uid: payload.uid,
    user_id: userId,
    start_time: payload.startTime,
    status: payload.status ?? 'ACCEPTED',
    ...(meetUrl ? { meet_url: meetUrl } : {}),
  }
}

/**
 * Mirrors one Cal.com booking event into `public.bookings`, idempotent on
 * `calcom_booking_uid`. Unknown booker emails are skipped so the webhook can
 * still be acknowledged (no infinite retries).
 */
export async function syncCalcomBooking(
  supabase: Client,
  event: CalcomWebhook,
): Promise<SyncBookingResult> {
  const userId = await resolveBookingUserId(supabase, event.payload)
  if (!userId) return { synced: false, reason: 'user_not_found' }

  // Cancel: upsert so an out-of-order cancel still records the terminal state.
  if (event.triggerEvent === 'BOOKING_CANCELLED') {
    const row = { ...toBookingRow(event.payload, userId), status: 'CANCELLED' as const }
    const { error } = await supabase
      .from('bookings')
      .upsert(row, { onConflict: 'calcom_booking_uid' })
    if (error) {
      console.error('Failed to sync cancelled booking:', error)
      throw new AppError('Failed to sync booking', 500)
    }
    return { synced: true }
  }

  // Reschedule: Cal.com mints a new uid, so move the existing row forward (one row per booking).
  if (event.triggerEvent === 'BOOKING_RESCHEDULED' && event.payload.rescheduleUid) {
    const { error } = await supabase
      .from('bookings')
      .update(toBookingRow(event.payload, userId))
      .eq('calcom_booking_uid', event.payload.rescheduleUid)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to reschedule booking:', error)
      throw new AppError('Failed to sync booking', 500)
    }
  }

  // Create, or reschedule fallback when the original row was never synced.
  const { error } = await supabase
    .from('bookings')
    .upsert(toBookingRow(event.payload, userId), { onConflict: 'calcom_booking_uid' })

  if (error) {
    console.error('Failed to sync booking:', error)
    throw new AppError('Failed to sync booking', 500)
  }

  return { synced: true }
}

/** Bookings for one student, newest start time first (uses idx_bookings_user_start_time). */
export async function listUserBookings(supabase: Client, userId: string): Promise<UserBooking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('calcom_booking_uid, start_time, status, meet_url')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })

  if (error) {
    console.error('Failed to load bookings:', error)
    throw new AppError('Failed to load bookings', 500)
  }

  return (data ?? []).map((row) => ({
    uid: row.calcom_booking_uid,
    startTime: row.start_time,
    status: row.status,
    meetUrl: row.meet_url,
  }))
}
