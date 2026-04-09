import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/features/auth/AuthLayout'
import { SignUpForm } from '@/components/features/auth/SignUpForm'

export const Route = createFileRoute('/signup')({
  component: SignUpContainer,
})

function SignUpContainer() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    // Validation
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên')
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
    const { error: signUpError } = await signUp(email, password)
    setIsLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // Navigate to home on success
    navigate({ to: '/' })
  }

  const handleNavigateToLogin = () => {
    navigate({ to: '/login' })
  }

  return (
    <AuthLayout>
      <SignUpForm
        fullName={fullName}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        error={error}
        isLoading={isLoading}
        onFullNameChange={setFullName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
        onNavigateToLogin={handleNavigateToLogin}
      />
    </AuthLayout>
  )
}
