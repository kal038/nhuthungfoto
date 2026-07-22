import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui/loading-dots'

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
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return <Outlet />
}
