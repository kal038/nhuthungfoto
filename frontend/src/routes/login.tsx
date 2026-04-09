import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/features/auth/AuthLayout'
import { LoginForm } from '@/components/features/auth/LoginForm'

export const Route = createFileRoute('/login')({
  component: LoginContainer,
})

function LoginContainer() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    // Basic validation
    if (!email.trim()) {
      setError('Vui lòng nhập email')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    setIsLoading(true)
    const { error: signInError } = await signIn(email, password)
    setIsLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    // Navigate to home on success
    navigate({ to: '/' })
  }

  const handleNavigateToSignUp = () => {
    navigate({ to: '/signup' })
  }

  return (
    <AuthLayout>
      <LoginForm
        email={email}
        password={password}
        error={error}
        isLoading={isLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        onNavigateToSignUp={handleNavigateToSignUp}
      />
    </AuthLayout>
  )
}
