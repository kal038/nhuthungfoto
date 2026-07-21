import { Coins } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { cn } from '@/lib/utils'

interface CreditBalanceBadgeProps {
  className?: string
}

/**
 * Live credit balance pill. Links to the /credits ledger page.
 * Style per usage site via className (dark navbar vs light sidebar).
 */
export function CreditBalanceBadge({ className }: CreditBalanceBadgeProps) {
  const { data: balance, isLoading } = useCreditBalance()

  return (
    <Link
      to="/credits"
      aria-label="Xem số dư credit"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200',
        className,
      )}
    >
      <Coins className="h-3.5 w-3.5" />
      {isLoading ? (
        <span className="h-3.5 w-6 animate-pulse rounded bg-current opacity-30" />
      ) : (
        <span className="tabular-nums">{balance ?? 0}</span>
      )}
    </Link>
  )
}
