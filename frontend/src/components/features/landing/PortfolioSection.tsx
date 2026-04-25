import { motion, motionValue, useTransform, type MotionValue } from 'framer-motion'
import { usePortfolioPhotos } from '@/hooks/queries/usePortfolioPhotos'
import { PortfolioCarousel } from './PortfolioCarousel'

interface PortfolioSectionProps {
  scrollProgress?: MotionValue<number>
}

/** Static fallback so useTransform hooks can always run. */
const STATIC_ZERO = motionValue(0)

export function PortfolioSection({ scrollProgress }: PortfolioSectionProps) {
  const { data: photos = [], isLoading, isError } = usePortfolioPhotos()

  const progress = scrollProgress ?? STATIC_ZERO
  const isScrollLinked = !!scrollProgress

  // Heading fades in during scroll 60%–85%
  const headingOpacity = useTransform(progress, [0.6, 0.85], [0, 1])
  const headingY = useTransform(progress, [0.6, 0.85], [20, 0])

  return (
    <section id="portfolio" className={isScrollLinked ? 'bg-gallery-dark pt-12 pb-24' : 'py-24'}>
      {/* Section header */}
      <motion.div
        className="mb-8 flex items-end justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        style={isScrollLinked ? { opacity: headingOpacity, y: headingY } : undefined}
      >
        <a
          href="/portfolio"
          className={`text-sm font-medium hover:underline ${
            isScrollLinked ? 'text-white/70 hover:text-white' : 'text-cta'
          }`}
        ></a>
      </motion.div>

      <PortfolioCarousel
        photos={photos}
        isLoading={isLoading}
        isError={isError}
        scrollProgress={scrollProgress}
      />
    </section>
  )
}
