import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import type { PortfolioPhoto } from '@/types/portfolio'
import type { CarouselApi } from '@/components/ui/carousel'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

interface PortfolioCarouselProps {
  photos: PortfolioPhoto[]
  isLoading: boolean
  isError: boolean
}

function SkeletonSlide() {
  return <div className="h-[85vh] w-full animate-pulse rounded-2xl bg-muted sm:h-screen" />
}

function ErrorState() {
  return <p className="py-12 text-center text-muted text-lg">Không thể tải ảnh</p>
}

export function PortfolioCarousel({ photos, isLoading, isError }: PortfolioCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  const onSelect = useCallback((api: CarouselApi) => {
    if (!api) return
    setCurrent(api.selectedScrollSnap() + 1)
  }, [])

  const handleSetApi = useCallback(
    (api: CarouselApi) => {
      if (!api) return
      setCount(api.scrollSnapList().length)
      setCurrent(api.selectedScrollSnap() + 1)
      api.on('select', onSelect)
    },
    [onSelect],
  )

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
    <div className="relative">
      <Carousel setApi={handleSetApi} opts={{ align: 'center', loop: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {photos.map((photo, index) => (
            <CarouselItem key={photo.key} className="pl-4 basis-full">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                className="group relative h-[85vh] w-full overflow-hidden rounded-2xl bg-muted sm:h-screen"
              >
                <img
                  src={photo.url}
                  alt={`Ảnh ${extractCategory(photo.key)}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                {/* Hero-style gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/50" />
                {/* Category label — centered like hero content */}
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation arrows */}
        <CarouselPrevious className="left-2 h-12 w-12 rounded-full border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-black/50 sm:left-4 lg:left-8" />
        <CarouselNext className="right-2 h-12 w-12 rounded-full border-white/20 bg-black/30 text-white backdrop-blur-md hover:bg-black/50 sm:right-4 lg:right-8" />
      </Carousel>

      {/* Counter */}
      {count > 0 && (
        <div className="mt-6 flex justify-center">
          <span className="text-sm font-medium tabular-nums text-muted">
            {String(current).padStart(2, '0')} / {String(count).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
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
