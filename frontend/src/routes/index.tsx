import { createFileRoute } from '@tanstack/react-router'
import { Navbar } from '@/components/features/landing/Navbar'
import { HeroSection } from '@/components/features/landing/HeroSection'
import { PortfolioSection } from '@/components/features/landing/PortfolioSection'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <PortfolioSection />
    </div>
  )
}
