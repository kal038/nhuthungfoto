import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export const Route = createFileRoute('/modules')({
  component: ModulesLayout,
})

function ModulesLayout() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user, navigate])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex gap-1">
          <span className="loading-dot" />
          <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
          <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <Outlet />
}
