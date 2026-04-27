import { type MotionValue } from 'framer-motion'
import { usePortfolioPhotos } from '@/hooks/queries/usePortfolioPhotos'
import { PortfolioCarousel } from './PortfolioCarousel'

interface PortfolioSectionProps {
  scrollProgress?: MotionValue<number>
}

export function PortfolioSection({ scrollProgress }: PortfolioSectionProps) {
  const { data: photos = [], isLoading, isError } = usePortfolioPhotos()
  const isScrollLinked = !!scrollProgress

  return (
    <section
      id="portfolio"
      className={`relative flex items-center justify-center ${
        isScrollLinked ? 'h-screen bg-gallery-dark' : 'py-24'
      }`}
    >
      {/* Gradient bridge — fades from transparent to gallery-dark, blending with hero */}
      {isScrollLinked && (
        <div className="absolute -top-32 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-gallery-dark pointer-events-none" />
      )}
      <div className="w-full">
        <PortfolioCarousel
          photos={photos}
          isLoading={isLoading}
          isError={isError}
          scrollProgress={scrollProgress}
        />
      </div>
    </section>
  )
}
