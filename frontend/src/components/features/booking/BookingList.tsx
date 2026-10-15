import { CalendarClock, Video } from 'lucide-react'
import { useBookings } from '@/hooks/queries/useBookings'
import { useNow } from '@/hooks/useNow'
import { Badge } from '@/components/ui/badge'
import { LoadingDots } from '@/components/ui/loading-dots'
import { bookingStatusMeta } from './bookingStatusMeta'
import type { Booking } from '@/types/booking'

type BookingBucket = 'upcoming' | 'past' | 'cancelled'

function bucketOf(booking: Booking, now: number): BookingBucket {
  if (booking.status === 'CANCELLED') return 'cancelled'
  return new Date(booking.startTime).getTime() >= now ? 'upcoming' : 'past'
}

function formatSession(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * "Buổi học của tôi" — the student's mirrored Cal.com bookings (upcoming, past,
 * cancelled). No in-app reschedule/cancel: Cal.com's emails own those links.
 */
export function BookingList() {
  const { data, isLoading } = useBookings()
  const now = useNow()

  if (isLoading) {
    return <LoadingDots className="py-6" />
  }

  const bookings = data ?? []

  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
        <CalendarClock className="mx-auto h-6 w-6 text-zinc-400" />
        <p className="mt-3 text-sm text-muted-foreground">Bạn chưa có buổi học nào.</p>
      </div>
    )
  }

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
  const upcoming = sorted.filter((b) => bucketOf(b, now) === 'upcoming')
  const past = sorted.filter((b) => bucketOf(b, now) !== 'upcoming').reverse()

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && <BookingGroup title="Sắp tới" bookings={upcoming} now={now} />}
      {past.length > 0 && <BookingGroup title="Đã qua" bookings={past} now={now} />}
    </div>
  )
}

function BookingGroup({
  title,
  bookings,
  now,
}: {
  title: string
  bookings: Booking[]
  now: number
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-500">{title}</h3>
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
        {bookings.map((booking) => (
          <BookingRow key={booking.uid} booking={booking} now={now} />
        ))}
      </ul>
    </div>
  )
}

function BookingRow({ booking, now }: { booking: Booking; now: number }) {
  const bucket = bucketOf(booking, now)
  const meta = bookingStatusMeta[booking.status]
  const showMeetLink = bucket === 'upcoming' && booking.meetUrl !== null

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className={bucket === 'past' ? 'text-sm text-zinc-400' : 'text-sm font-medium text-zinc-900'}>
          {formatSession(booking.startTime)}
        </p>
        <p className="text-xs text-muted-foreground">45 phút · Google Meet</p>
      </div>

      {showMeetLink ? (
        <a
          href={booking.meetUrl as string}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cta hover:underline"
        >
          <Video className="h-4 w-4" />
          Tham gia Google Meet
        </a>
      ) : null}

      <Badge variant={bucket === 'past' ? 'outline' : meta.variant}>{meta.label}</Badge>
    </li>
  )
}
