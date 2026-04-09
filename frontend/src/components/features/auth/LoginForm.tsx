import { Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FormInput } from './FormInput'

export interface LoginFormProps {
  email: string
  password: string
  error: string | null
  isLoading: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onNavigateToSignUp: () => void
}

export function LoginForm({
  email,
  password,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold text-primary">
          Đăng Nhập
        </h1>
        <p className="font-body text-muted text-base">
          Chào mừng bạn quay lại
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormInput
          id="login-email"
          label="Email"
          type="email"
          value={email}
          placeholder="you@example.com"
          autoFocus
          onChange={onEmailChange}
        />

        <div className="space-y-1.5">
          <FormInput
            id="login-password"
            label="Mật khẩu"
            type="password"
            value={password}
            placeholder="••••••••"
            onChange={onPasswordChange}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-cta hover:text-cta/80 font-medium transition-colors duration-200 cursor-pointer"
            >
              Quên mật khẩu?
            </button>
          </div>
        </div>

        {/* Global error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium" role="alert">
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
              Đang đăng nhập...
            </>
          ) : (
            'Đăng Nhập'
          )}
        </Button>
      </form>

      {/* Separator */}
      <div className="relative">
        <Separator className="bg-zinc-200" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted font-body">
          hoặc
        </span>
      </div>

      {/* Footer navigation */}
      <p className="text-center text-sm text-secondary font-body">
        Chưa có tài khoản?{' '}
        <Link
          to="/signup"
          className="text-cta hover:text-cta/80 font-semibold transition-colors duration-200"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
