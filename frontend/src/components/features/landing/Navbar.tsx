import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet'

const NAV_LINKS = [
  { label: 'Trang chủ', href: '#' },
  { label: 'Tác phẩm', href: '#portfolio' },
  { label: 'Khóa học', href: '#courses' },
  { label: 'Đặt lịch', href: '#booking' },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`
        fixed top-4 left-4 right-4 z-50
        flex items-center justify-between
        px-6 py-3
        rounded-xl
        transition-all duration-300
        ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg border border-zinc-200/50'
            : 'bg-white/10 backdrop-blur-sm border border-white/20'
        }
      `}
    >
      {/* Logo / Brand */}
      <a
        href="#"
        className={`
          font-heading text-lg font-semibold transition-colors duration-300 cursor-pointer
          ${isScrolled ? 'text-zinc-900' : 'text-white'}
        `}
      >
        nhuthungfoto
      </a>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-6 text-sm">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={`
              transition-colors duration-200 cursor-pointer
              ${
                isScrolled
                  ? 'text-zinc-600 hover:text-zinc-900'
                  : 'text-white/80 hover:text-white'
              }
            `}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Desktop CTA */}
      <button className="hidden md:block bg-cta text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer">
        Bắt Đầu Học
      </button>

      {/* Mobile Hamburger */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={`
                p-2 rounded-lg cursor-pointer transition-colors duration-200
                ${isScrolled ? 'text-zinc-900 hover:bg-zinc-100' : 'text-white hover:bg-white/10'}
              `}
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-white p-6">
            <div className="flex items-center justify-between mb-8">
              <SheetTitle className="font-heading text-lg font-semibold text-zinc-900">
                nhuthungfoto
              </SheetTitle>
              <SheetClose asChild>
                <button
                  className="p-1 rounded-lg hover:bg-zinc-100 cursor-pointer"
                  aria-label="Đóng menu"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </SheetClose>
            </div>
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <SheetClose asChild key={link.label}>
                  <a
                    href={link.href}
                    className="text-zinc-700 hover:text-zinc-900 text-base font-medium transition-colors duration-200 cursor-pointer py-2"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
              <hr className="border-zinc-200 my-2" />
              <SheetClose asChild>
                <button className="bg-cta text-white w-full py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer">
                  Bắt Đầu Học
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
