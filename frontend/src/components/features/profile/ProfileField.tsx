interface ProfileFieldProps {
  label: string
  error?: string
  children: React.ReactNode
  helperText?: string
}

export function ProfileField({ label, error, children, helperText }: ProfileFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-900 font-body">
        {label}
        {helperText && (
          <span className="font-normal text-zinc-400 ml-1">{helperText}</span>
        )}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}