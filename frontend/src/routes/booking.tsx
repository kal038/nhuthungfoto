import { useEffect } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-dots'
import { BookingLauncher, BookingList } from '@/components/features/booking'
import { ThemeToggle } from '@/components/ui/theme-toggle'

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <span className="text-lg font-semibold tracking-wide text-foreground font-heading transition-colors duration-200 group-hover:text-muted-foreground">
              nhuthungfoto
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="fade-in mx-auto max-w-2xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        <BookingLauncher />

        <section>
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            Buổi học của tôi
          </h2>
          <BookingList />
        </section>
      </main>
    </div>
  )
}
