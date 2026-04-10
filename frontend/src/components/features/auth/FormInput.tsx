import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface FormInputProps {
  id: string
  label: string
  type: string
  value: string
  placeholder?: string
  error?: string
  autoFocus?: boolean
  onChange: (value: string) => void
}

export function FormInput({
  id,
  label,
  type,
  value,
  placeholder,
  error,
  autoFocus,
  onChange,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-primary">
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className={`
            h-11 rounded-lg border-zinc-200 bg-white
            font-body text-base text-primary
            placeholder:text-muted-foreground
            focus-visible:ring-2 focus-visible:ring-cta focus-visible:border-cta
            transition-all duration-200
            ${isPassword ? 'pr-11' : ''}
            ${error ? 'border-destructive ring-1 ring-destructive/20' : ''}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />

        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-transparent"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </Button>
        )}
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="flex items-center gap-1.5 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
