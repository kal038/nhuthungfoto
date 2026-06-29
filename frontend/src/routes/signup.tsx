import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/features/auth/AuthLayout'
import { SignUpForm } from '@/components/features/auth/SignUpForm'
import { apiFetch } from '@/lib/apiFetch'

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/

function isValidUsername(username: string): string | null {
  if (!username || username.length < 4) {
    return 'Tên người dùng phải có ít nhất 4 ký tự'
  }
  if (!USERNAME_REGEX.test(username)) {
    return 'Tên người dùng chỉ được chứa chữ cái, số, gạch ngang và gạch dưới'
  }
  return null
}

export const Route = createFileRoute('/signup')({
  component: SignUpContainer,
})

function SignUpContainer() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setUsernameError(null)

    const usernameValidationError = isValidUsername(username)
    if (usernameValidationError) {
      setUsernameError(usernameValidationError)
      return
    }

    if (!email.trim()) {
      setError('Vui lòng nhập email')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp')
      return
    }

    setIsLoading(true)

    // Pre-check username availability
    try {
      const check = await apiFetch<{ available: boolean; reason?: string }>(
        '/auth/check-username',
        { username: username.toLowerCase() },
        'POST',
      )

      if (!check.available) {
        setUsernameError(
          check.reason === 'taken'
            ? 'Tên người dùng đã được sử dụng'
            : 'Tên người dùng không hợp lệ',
        )
        setIsLoading(false)
        return
      }
    } catch (err) {
      console.error('Failed to check username:', err)
      setError('Không thể kiểm tra tên ngườii dùng. Vui lòng thử lại.')
      setIsLoading(false)
      return
    }

    const { error: signUpError } = await signUp(email, password, username.toLowerCase())
    setIsLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Navigate to user's gallery on success
    navigate({ to: `/gallery/${username.toLowerCase()}` })
  }

  const handleNavigateToLogin = () => {
    navigate({ to: '/login' })
  }

  return (
    <AuthLayout>
      <SignUpForm
        username={username}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        error={error}
        usernameError={usernameError}
        isLoading={isLoading}
        onUsernameChange={setUsername}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        onNavigateToLogin={handleNavigateToLogin}
      />
    </AuthLayout>
  )
}
