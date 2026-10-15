import { Clock, User, Video } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { Button } from '@/components/ui/button'

const CALCOM_BASE_URL = import.meta.env.VITE_CALCOM_BOOKING_URL as string | undefined

/** Hung's hosted Cal.com page with the student's name/email/userId prefilled. */
function buildBookingUrl(
  name: string | undefined,
  email: string | undefined,
  userId: string | undefined,
): string | null {
  if (!CALCOM_BASE_URL) return null

  const url = new URL(CALCOM_BASE_URL)
  if (name) url.searchParams.set('name', name)
  if (email) url.searchParams.set('email', email)
  if (userId) url.searchParams.set('metadata[userId]', userId)
  return url.toString()
}

const SUMMARY = [
  { Icon: Clock, text: '45 phút' },
  { Icon: Video, text: 'Google Meet' },
  { Icon: User, text: '1-1 với Nhựt Hùng' },
]

/**
 * Booking launcher — session summary, instructor card, and the CTA into Cal.com.
 * Cal.com owns scheduling, the Meet link, and the confirmation emails.
 */
export function BookingLauncher() {
  const { user } = useAuth()
  const { data: profile } = useUserProfile()

  const name = profile?.username ?? user?.user_metadata?.name ?? undefined
  const email = user?.email ?? undefined
  const bookingUrl = buildBookingUrl(name, email, user?.id)

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Đặt lịch 1-1 với Nhựt Hùng
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn khung giờ phù hợp và nhận email xác nhận cùng link Google Meet từ Cal.com.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-muted/60 p-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {SUMMARY.map(({ Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Huỷ hoặc đổi lịch trước 24 giờ.</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border p-4">
        <Avatar />
        <div>
          <p className="font-heading text-base font-semibold text-foreground">Nhựt Hùng</p>
          <p className="text-sm text-muted-foreground">25+ năm kinh nghiệm nhiếp ảnh</p>
        </div>
      </div>

      {bookingUrl ? (
        <>
          <Button asChild size="lg" className="w-full bg-cta text-white hover:bg-cta/90 sm:w-auto">
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
              Tiếp tục đặt lịch
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">Bạn sẽ nhận email xác nhận từ Cal.com.</p>
        </>
      ) : (
        <p className="text-sm text-destructive">
          Chưa cấu hình lịch đặt — thiếu VITE_CALCOM_BOOKING_URL.
        </p>
      )}
    </section>
  )
}

function Avatar() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-heading text-lg font-semibold text-muted-foreground">
      H
    </div>
  )
}
