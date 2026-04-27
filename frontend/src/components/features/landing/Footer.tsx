import { Mail, Instagram, Facebook } from 'lucide-react'

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://instagram.com/nhuthungfoto', icon: Instagram },
  { label: 'Facebook', href: 'https://www.facebook.com/hung.lam.5036', icon: Facebook },
  { label: 'Email', href: 'mailto:testlab.vnav@gmail.com', icon: Mail },
]

export function Footer() {
  return (
    <footer id="contact" className="relative bg-gallery-dark snap-start">
      {/* Gradient bridge from content above */}
      <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-gallery-dark pointer-events-none" />

      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        {/* Brand */}
        <a 
          href="#navbar"
          className="inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
        >
          <img
            src="/images/signature.png"
            alt="nhuthungfoto"
            className="inline-block h-16 mb-6 opacity-80 hover:opacity-100 transition-opacity"
          />
        </a>

        {/* Social links */}
        <div className="group flex items-center justify-center gap-8 mb-12">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex items-center gap-2 text-white/60 transition-opacity duration-300 hover:text-white hover:!opacity-100 group-hover:opacity-40"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 mb-8" />

        {/* Copyright */}
        <p className="text-white/30 text-xs">© 2026 nhuthungfoto. All rights reserved.</p>
      </div>
    </footer>
  )
}
