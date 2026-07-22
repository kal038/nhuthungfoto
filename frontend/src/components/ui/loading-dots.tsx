import { cn } from '@/lib/utils'

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      <span className="loading-dot" />
      <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
      <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <LoadingDots />
    </div>
  )
}
