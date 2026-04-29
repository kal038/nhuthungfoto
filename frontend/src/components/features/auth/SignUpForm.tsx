import { Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FormInput } from './FormInput'
import { PasswordStrengthBar } from './PasswordStrengthBar'

export interface SignUpFormProps {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  error: string | null
  isLoading: boolean
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: () => void
  onNavigateToLogin: () => void
}

export function SignUpForm({
  fullName,
  email,
  password,
  confirmPassword,
  error,
  isLoading,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: SignUpFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold text-primary">Tạo Tài Khoản</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormInput
          id="signup-fullname"
          label="Họ và tên"
          type="text"
          value={fullName}
          placeholder="Nguyễn Văn A"
          autoFocus
          onChange={onFullNameChange}
        />

        <FormInput
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={onEmailChange}
        />

        <div className="space-y-2">
          <FormInput
            id="signup-password"
            label="Mật khẩu"
            type="password"
            value={password}
            placeholder="Tối thiểu 8 ký tự"
            onChange={onPasswordChange}
          />
          <PasswordStrengthBar password={password} />
        </div>

        <FormInput
          id="signup-confirm-password"
          label="Xác nhận mật khẩu"
          type="password"
          value={confirmPassword}
          placeholder="Nhập lại mật khẩu"
          onChange={onConfirmPasswordChange}
        />

        {/* Global error */}
        {error && (
          <div
            className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 bg-cta text-white font-semibold rounded-lg text-base
                     hover:-translate-y-px hover:shadow-glow
                     transition-all duration-200 cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tạo tài khoản...
            </>
          ) : (
            'Tạo Tài Khoản'
          )}
        </Button>
      </form>

      {/* Separator */}
      <div className="relative">
        <Separator className="bg-zinc-200" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground font-body">
          hoặc
        </span>
      </div>

      {/* Footer navigation */}
      <p className="text-center text-sm text-muted-foreground font-body">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="text-cta hover:text-cta/80 font-semibold transition-colors duration-200"
        >
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}
