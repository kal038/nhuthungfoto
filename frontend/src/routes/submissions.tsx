import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { AccountLayout } from '@/components/features/profile'
import { SubmissionsPage } from '@/components/features/submissions/SubmissionsPage'
import { LoadingScreen } from '@/components/ui/loading-dots'

export const Route = createFileRoute('/submissions')({
  component: SubmissionsRouteContainer,
})

function SubmissionsRouteContainer() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user])

  const { data: profile } = useUserProfile()
  const { data: balance } = useCreditBalance()

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return (
    <AccountLayout username={profile?.username} creditBalance={balance}>
      <SubmissionsPage />
    </AccountLayout>
  )
}
