import { useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-dots'
import { BookingLauncher, BookingList } from '@/components/features/booking'

export const Route = createFileRoute('/booking')({
  component: BookingRoute,
})

function BookingRoute() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/login' })
    }
  }, [loading, navigate, user])

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className="text-lg font-semibold tracking-wide text-zinc-900 font-heading transition-colors duration-200 group-hover:text-zinc-600">
              nhuthungfoto
            </span>
          </Link>
        </div>
      </header>

      <main className="fade-in mx-auto max-w-2xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <BookingLauncher />

        <section>
          <h2 className="mb-4 font-heading text-lg font-semibold text-zinc-900">
            Buổi học của tôi
          </h2>
          <BookingList />
        </section>
      </main>
    </div>
  )
}
