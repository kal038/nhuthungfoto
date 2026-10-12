-- Migration: Cal.com lesson bookings
--
-- Booking sync table for Hung's hosted Cal.com page. Cal.com owns availability,
-- slot selection, Google Meet, confirmations, and the cancel/reschedule policy
-- (including the 24-hour cutoff); the backend only mirrors bookings locally from
-- Cal.com webhooks so students can see their sessions in the app.
--
-- One row per Cal.com booking. `calcom_booking_uid` is the natural key, so
-- webhook retries upsert instead of duplicating. Duration is fixed (45 min),
-- so there is no end_time column.

-- ============================================
-- 1. ENUM
-- ============================================
CREATE TYPE public.booking_status AS ENUM (
  'ACCEPTED',
  'PENDING',
  'CANCELLED'
);

-- ============================================
-- 2. TABLE
-- ============================================
CREATE TABLE public.bookings (
  -- Cal.com booking UID (natural primary key; upsert target for webhooks).
  calcom_booking_uid text PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time         timestamptz NOT NULL,
  status             public.booking_status NOT NULL DEFAULT 'ACCEPTED',
  -- Google Meet link from the Cal.com booking location (null until populated).
  meet_url           text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX idx_bookings_user_start_time
  ON public.bookings (user_id, start_time DESC);

-- ============================================
-- 5. ACCESS CONTROL — service_role only
-- ============================================
REVOKE ALL ON TABLE public.bookings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.bookings TO service_role;
