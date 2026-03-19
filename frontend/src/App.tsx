import { Navbar } from '@/components/features/landing/Navbar'
import { HeroSection } from '@/components/features/landing/HeroSection'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      {/* Placeholder scroll target for CTA */}
      <section id="portfolio" className="py-24 px-8 max-w-6xl mx-auto text-center">
        <h2 className="font-heading text-3xl font-semibold mb-4 text-primary">
          Tác Phẩm
        </h2>
        <p className="text-secondary text-lg max-w-2xl mx-auto">
          Portfolio content coming soon.
        </p>
      </section>
    </div>
  )
}

export default App
