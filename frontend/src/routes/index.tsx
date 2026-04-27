import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/components/features/landing/Navbar'
import { HeroCarouselTransition } from '@/components/features/landing/HeroCarouselTransition'
import { Footer } from '@/components/features/landing/Footer'

export const Route = createFileRoute('/')(
  {
  component: LandingPage,
})

function LandingPage() {
  // Enable scroll-snap on the page-level scroll container (html)
  // so hero → carousel morph snaps cleanly between zones
  useEffect(() => {
    const html = document.documentElement
    html.style.scrollSnapType = 'y mandatory'
    return () => {
      html.style.scrollSnapType = ''
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroCarouselTransition />
      <Footer />
    </div>
  )
}
