interface PasswordStrengthBarProps {
  password: string
}

function getStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: '' }

  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: 'Yếu' }
  if (score <= 2) return { level: 2, label: 'Trung bình' }
  return { level: 3, label: 'Mạnh' }
}

const STRENGTH_COLORS: Record<number, string> = {
  0: 'bg-zinc-200',
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-emerald-500',
}

const STRENGTH_TEXT_COLORS: Record<number, string> = {
  0: 'text-muted',
  1: 'text-red-600',
  2: 'text-amber-600',
  3: 'text-emerald-600',
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { level, label } = getStrength(password)

  if (password.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={`
              h-1 flex-1 rounded-full transition-colors duration-300
              ${segment <= level ? STRENGTH_COLORS[level] : 'bg-zinc-200'}
            `}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${STRENGTH_TEXT_COLORS[level]}`}>
        {label}
      </p>
    </div>
  )
}
