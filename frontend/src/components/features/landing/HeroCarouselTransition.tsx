import { useRef } from 'react'
import { useScroll, useReducedMotion } from 'framer-motion'
import { HeroSection } from './HeroSection'
import { PortfolioSection } from './PortfolioSection'

/**
 * Wrapper that coordinates the scroll-triggered morph transition
 * between HeroSection and PortfolioSection.
 *
 * Creates a tall scroll container so the hero sticks while the user
 * scrolls through a "runway" that drives the morph animation.
 */
export function HeroCarouselTransition() {
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Track from when container top hits viewport top
    // to when container bottom hits viewport bottom
    offset: ['start start', 'end end'],
  })

  // When reduced motion is preferred, render sections normally without scroll effects
  if (prefersReducedMotion) {
    return (
      <>
        <HeroSection />
        <PortfolioSection />
      </>
    )
  }

  return (
    <div ref={containerRef} className="relative" style={{ height: '200vh' }}>
      {/* Hero sticks at top while user scrolls through the runway */}
      <div className="sticky top-0 h-screen snap-start">
        <HeroSection scrollProgress={scrollYProgress} />
      </div>

      {/* Portfolio section positioned at the end of the scroll runway */}
      <div className="relative z-10 snap-start overflow-visible">
        <PortfolioSection scrollProgress={scrollYProgress} />
      </div>
    </div>
  )
}
