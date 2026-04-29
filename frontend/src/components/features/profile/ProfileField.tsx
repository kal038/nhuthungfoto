import { AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface ProfileFieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

export function ProfileField({ label, error, children }: ProfileFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-900 font-body">
        {label}
      </Label>
      {children}
      {error && (
        <p
          className="flex items-center gap-1.5 text-sm text-red-600"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
