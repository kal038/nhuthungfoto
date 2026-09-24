import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  label: string
  className?: string
}

/** Copy-to-clipboard button with a Copy → Check swap for 2s. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không sao chép được. Vui lòng sao chép mã thủ công.')
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label={copied ? 'Đã sao chép' : label}
      title={copied ? 'Đã sao chép' : label}
      className={cn('min-h-11 min-w-11 text-zinc-500 hover:text-zinc-900', className)}
    >
      {copied ? <Check className="text-green-600" /> : <Copy />}
    </Button>
  )
}
