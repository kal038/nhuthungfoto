import { cn } from '@/lib/utils'

interface ProfileCardProps {
  children: React.ReactNode
  className?: string
}

export function ProfileCard({ children, className }: ProfileCardProps) {
  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto',
        'bg-white rounded-lg shadow-md',
        'p-6 sm:p-8',
        className
      )}
    >
      {children}
    </div>
  )
}
