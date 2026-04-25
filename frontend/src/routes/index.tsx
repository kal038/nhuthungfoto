import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/components/features/landing/Navbar'
import { HeroCarouselTransition } from '@/components/features/landing/HeroCarouselTransition'

export const Route = createFileRoute('/')(
  {
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroCarouselTransition />
    </div>
  )
}
