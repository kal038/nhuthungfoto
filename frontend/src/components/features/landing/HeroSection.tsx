import { useEffect } from 'react'
import { motion, motionValue, useTransform, useReducedMotion, type MotionValue } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface HeroSectionProps {
  scrollProgress?: MotionValue<number>
}

/** Static fallback so useTransform hooks can always run (rules of hooks). */
const STATIC_ZERO = motionValue(0)

const HERO_PHOTOS = {
  light: '/images/hero-bg.jpg',
  dark: '/images/hero-bg-night.jpg',
} as const

export function HeroSection({ scrollProgress }: HeroSectionProps) {
  const progress = scrollProgress ?? STATIC_ZERO
  const isScrollLinked = !!scrollProgress
  const { resolvedTheme } = useTheme()
  const prefersReducedMotion = useReducedMotion()
  const isDark = resolvedTheme === 'dark'

  // Derive scroll-linked opacity values
  // scrollProgress: 0 = top of container, 1 = bottom
  const scrollIndicatorOpacity = useTransform(progress, [0, 0.2], [1, 0])
  const contentOpacity = useTransform(progress, [0, 0.4], [1, 0])
  const overlayOpacity = useTransform(progress, [0.3, 0.6], [0.3, 0.8])

  // Warm the browser cache so the day/night swap never stalls on a fetch.
  useEffect(() => {
    for (const src of Object.values(HERO_PHOTOS)) {
      const image = new Image()
      image.src = src
    }
  }, [])

  return (
    <section
      id="hero"
      className="relative h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Day/night photograph layers — crossfade when the theme flips */}
      <motion.img
        src={HERO_PHOTOS.light}
        alt="Nhựt Hùng photography showcase"
        className="absolute inset-0 w-full h-full object-cover"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeInOut' }}
      />
      <motion.img
        src={HERO_PHOTOS.dark}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: 'easeInOut' }}
      />

      {/* Dark Gradient Overlay — intensifies on scroll */}
      {isScrollLinked ? (
        <motion.div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      ) : (
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/50" />
      )}

      {/* Content — fades out on scroll */}
      <motion.div
        className="relative z-10 text-center text-white px-4 max-w-2xl"
        style={isScrollLinked ? { opacity: contentOpacity } : undefined}
      >
        {/* Signature Logo */}
        <motion.img
          src="/images/signature.png"
          alt="nhuthungfoto"
          className="mx-auto max-w-[320px] md:max-w-[400px] mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Subtext */}
        <motion.p
          className="text-base md:text-lg text-white/80 mb-8 tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        >
          Nhiếp ảnh gia • Giảng viên
        </motion.p>

        {/* CTA Button */}
      </motion.div>

      {/* Scroll Indicator — fades out first on scroll */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        style={isScrollLinked ? { opacity: scrollIndicatorOpacity } : undefined}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ChevronDown className="h-6 w-6 text-white/60" />
        </motion.div>
      </motion.div>
    </section>
  )
}
