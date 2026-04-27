import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, motionValue, useTransform, type MotionValue } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { PortfolioPhoto } from '@/types/portfolio'
import type { CarouselApi } from '@/components/ui/carousel'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'

/** How many slides around current to eagerly preload */
const PRELOAD_RANGE = 2

/** Static fallback so useTransform hooks can always run. */
const STATIC_ZERO = motionValue(0)

interface PortfolioCarouselProps {
  photos: PortfolioPhoto[]
  isLoading: boolean
  isError: boolean
  scrollProgress?: MotionValue<number>
}

function SkeletonSlide() {
  return <div className="h-[82vh] aspect-[4/5] max-w-[92vw] mx-auto animate-pulse rounded-2xl bg-muted" />
}

function ErrorState() {
  return <p className="py-12 text-center text-muted text-lg">Không thể tải ảnh</p>
}

/**
 * Preload images for adjacent slides so transitions feel instant.
 * Uses in-memory Image() objects — no DOM nodes needed.
 */
function useAdjacentPreload(photos: PortfolioPhoto[], currentIndex: number) {
  useEffect(() => {
    if (photos.length === 0) return

    const indices = new Set<number>()
    for (let offset = -PRELOAD_RANGE; offset <= PRELOAD_RANGE; offset++) {
      // Wrap for loop mode
      const idx = (((currentIndex + offset) % photos.length) + photos.length) % photos.length
      indices.add(idx)
    }

    indices.forEach((idx) => {
      const img = new Image()
      img.src = photos[idx].url
    })
  }, [photos, currentIndex])
}

export function PortfolioCarousel({
  photos,
  isLoading,
  isError,
  scrollProgress,
}: PortfolioCarouselProps) {
  const [current, setCurrent] = useState(0) // 1-based for display
  const sectionRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<CarouselApi>(undefined)

  const progress = scrollProgress ?? STATIC_ZERO
  const isScrollLinked = !!scrollProgress

  // 0-based index for preloading logic
  const currentSlideIndex = current > 0 ? current - 1 : 0

  // Preload adjacent slide images in background
  useAdjacentPreload(photos, currentSlideIndex)

  // Scroll-driven animations for the carousel
  const carouselOpacity = useTransform(progress, [0.6, 1], [0, 1])
  const carouselY = useTransform(progress, [0.6, 1], [40, 0])
  const controlsOpacity = useTransform(progress, [0.7, 1], [0, 1])

  // Store API ref and wire up select listener with proper cleanup
  const handleSetApi = useCallback((api: CarouselApi) => {
    if (!api) return
    apiRef.current = api
    setCurrent(api.selectedScrollSnap() + 1)

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1)
    }
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [])

  // Direct API calls — bypass shadcn state layer entirely
  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // prevent Embla drag detection
    apiRef.current?.scrollPrev()
  }, [])

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    apiRef.current?.scrollNext()
  }, [])

  if (isError) return <ErrorState />
  if (isLoading) {
    return (
      <Carousel opts={{ align: 'center', loop: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CarouselItem key={i} className="pl-4 basis-full">
              <SkeletonSlide />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    )
  }

  if (photos.length === 0) return null

  return (
    <motion.div
      ref={sectionRef}
      // Use scroll-driven animation when linked, else fall back to whileInView
      {...(isScrollLinked
        ? { style: { opacity: carouselOpacity, y: carouselY } }
        : {
            initial: { opacity: 0, y: 30 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.15 },
            transition: { duration: 0.6, ease: 'easeOut' },
          })}
      className="relative"
    >
      <Carousel setApi={handleSetApi} opts={{ align: 'center', loop: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {photos.map((photo, index) => (
            <CarouselItem key={photo.key} className="pl-4 basis-full">
              <div className="group relative h-[82vh] aspect-[4/5] max-w-[92vw] mx-auto overflow-hidden rounded-2xl bg-muted">
                <img
                  src={photo.url}
                  alt={`Ảnh ${extractCategory(photo.key)}`}
                  // Eager-load first few slides; lazy-load the rest
                  loading={index < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  // Hint browser to size the image for the viewport
                  fetchPriority={index === 0 ? 'high' : undefined}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                {/* Hero-style gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/50" />
                {/* Category label — centered like hero content */}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation arrows — outside Carousel to avoid Embla pointer interference */}
      <motion.button
        type="button"
        aria-label="Previous slide"
        onClick={scrollPrev}
        style={isScrollLinked ? { opacity: controlsOpacity } : undefined}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 active:scale-95 touch-manipulation sm:left-4 lg:left-8"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </motion.button>
      <motion.button
        type="button"
        aria-label="Next slide"
        onClick={scrollNext}
        style={isScrollLinked ? { opacity: controlsOpacity } : undefined}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-black/50 active:scale-95 touch-manipulation sm:right-4 lg:right-8"
      >
        <ChevronRightIcon className="h-5 w-5" />
      </motion.button>
    </motion.div>
  )
}

function extractCategory(key: string): string {
  const parts = key.replace('portfolio/', '').split('/')
  if (parts.length > 1) {
    const folder = parts[0]
    return folder.charAt(0).toUpperCase() + folder.slice(1)
  }
  return ''
}
