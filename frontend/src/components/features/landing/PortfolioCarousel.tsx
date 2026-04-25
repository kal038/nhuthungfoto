import type { PortfolioPhoto } from '@/types/portfolio'
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

function SkeletonCard() {
  return (
    <div className="aspect-[3/2] w-full animate-pulse rounded-xl bg-muted" />
  )
}

function ErrorState() {
  return (
    <p className="py-12 text-center text-muted text-lg">
      Không thể tải ảnh
    </p>
  )
}

export function PortfolioCarousel({ photos, isLoading, isError }: PortfolioCarouselProps) {
  if (isError) return <ErrorState />
  if (isLoading) {
    return (
      <Carousel opts={{ align: 'start' }} className="w-full">
        <CarouselContent className="-ml-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CarouselItem
              key={i}
              className="pl-4 basis-[85%] sm:basis-[50%] lg:basis-[33%]"
            >
              <SkeletonCard />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    )
  }

  if (photos.length === 0) return null

  return (
    <Carousel opts={{ align: 'start' }} className="w-full">
      <CarouselContent className="-ml-4">
        {photos.map((photo) => (
          <CarouselItem
            key={photo.key}
            className="pl-4 basis-[85%] sm:basis-[50%] lg:basis-[33%]"
          >
            <div className="group relative aspect-[3/2] overflow-hidden rounded-xl bg-muted">
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity duration-[var(--duration-normal)] group-hover:opacity-100">
                <span className="text-sm font-medium text-white">
                  {extractCategory(photo.key)}
                </span>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden lg:flex" />
      <CarouselNext className="hidden lg:flex" />
    </Carousel>
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