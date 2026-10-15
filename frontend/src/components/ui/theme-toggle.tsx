import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface ThemeToggleProps {
  className?: string
  /** `overlay` for transparent/dark headers, `surface` for light page headers. */
  variant?: 'overlay' | 'surface'
}

const VARIANT_CLASSES = {
  overlay: 'text-white hover:bg-white/10',
  surface: 'text-muted-foreground hover:bg-muted hover:text-foreground',
} as const

export function ThemeToggle({ className, variant = 'surface' }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      aria-pressed={isDark}
      className={cn(
        'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 cursor-pointer',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={isDark ? 'moon' : 'sun'}
          initial={prefersReducedMotion ? false : { opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
