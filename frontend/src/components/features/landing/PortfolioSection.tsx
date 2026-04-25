import { usePortfolioPhotos } from '@/hooks/queries/usePortfolioPhotos'
import { PortfolioCarousel } from './PortfolioCarousel'

export function PortfolioSection() {
  const { data: photos = [], isLoading, isError } = usePortfolioPhotos()

  return (
    <section id="portfolio" className="py-24">
      <div className="mb-8 flex items-end justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl font-semibold text-primary">
          Tác Phẩm
        </h2>
        <a
          href="/portfolio"
          className="text-sm font-medium text-cta hover:underline"
        >
          Xem Tất Cả →
        </a>
      </div>
      <PortfolioCarousel
        photos={photos}
        isLoading={isLoading}
        isError={isError}
      />
    </section>
  )
}
