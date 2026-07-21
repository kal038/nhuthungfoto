import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { AccountLayout } from '@/components/features/profile'
import { CreditHistoryList } from '@/components/features/credits/CreditHistoryList'

export const Route = createFileRoute('/credits')({
  component: CreditsContainer,
})

function CreditsContainer() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user])

  const { data: profile } = useUserProfile()
  const { data: balance, isLoading: balanceLoading } = useCreditBalance()

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

  return (
    <AccountLayout username={profile?.username} creditBalance={balance}>
      <div className="fade-in space-y-8">
        {/* Balance summary */}
        <section className="rounded-xl bg-zinc-50 p-6 ring-1 ring-zinc-100">
          <p className="text-sm text-muted-foreground">Số dư hiện tại</p>
          <p className="mt-1 font-heading text-4xl font-semibold tabular-nums text-zinc-900">
            {balanceLoading ? '…' : (balance ?? 0)}
            <span className="ml-2 text-base font-normal text-muted-foreground">credit</span>
          </p>
        </section>

        {/* Transaction ledger */}
        <section>
          <h2 className="font-heading text-lg font-semibold text-zinc-900 mb-4">
            Lịch sử giao dịch
          </h2>
          <CreditHistoryList />
        </section>
      </div>
    </AccountLayout>
  )
}

