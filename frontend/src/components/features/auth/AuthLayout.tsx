import { motion, useReducedMotion } from 'framer-motion'
import { Camera } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface AuthLayoutProps {
  children: React.ReactNode
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const },
}

function HeroPhoto({ instant }: { instant: boolean }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const transition = { duration: instant ? 0 : 0.6, ease: 'easeInOut' as const }

  return (
    <>
      <motion.img
        src="/images/hero-bg.jpg"
        alt="Tác phẩm nhiếp ảnh của Nhựt Hùng"
        className="absolute inset-0 w-full h-full object-cover"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1 }}
        transition={transition}
      />
      <motion.img
        src="/images/hero-bg-night.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={transition}
      />
    </>
  )
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — photography hero (hidden on mobile, shown as compact header) */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center overflow-hidden">
        {/* Background image */}
        <HeroPhoto instant={!!prefersReducedMotion} />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

        {/* Branding content */}
        <motion.div
          className="relative z-10 text-center text-white px-8 max-w-lg"
          {...fadeInUp}
        >
          <h1 className="font-heading text-4xl xl:text-5xl font-bold mb-4 leading-tight">
            nhuthungfoto
          </h1>
          <p className="text-lg text-white/80 font-body leading-relaxed">
            Học nhiếp ảnh cùng Nhựt Hùng
          </p>
          <p className="text-sm text-white/60 font-body mt-2">
            Nhiếp ảnh gia • Giảng viên • 30+ năm kinh nghiệm
          </p>
        </motion.div>
      </div>

      {/* Mobile header strip */}
      <div className="lg:hidden relative h-48 flex items-center justify-center overflow-hidden">
        <HeroPhoto instant={!!prefersReducedMotion} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
        <div className="relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Camera className="h-5 w-5 text-white/80" />
            <span className="font-heading text-xl font-bold">nhuthungfoto</span>
          </div>
          <p className="text-xs text-white/60 font-body">
            Nhiếp ảnh gia • Giảng viên • 30+ năm kinh nghiệm
          </p>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-background">
        <ThemeToggle className="absolute right-4 top-4" />
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
