import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from '@tanstack/react-router'

const NAV_LINKS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Tác phẩm', href: '/portfolio' },
  { label: 'Khóa học', href: '/courses' },
  { label: 'Đặt lịch', href: '/booking' },
]

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const links = user ? NAV_LINKS : [...NAV_LINKS, { label: 'Đăng Nhập', href: '/login' }]

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsScrolled(scrollY > 80)
      // Fade out navbar when scrolling past the hero/carousel area (~120vh)
      setIsVisible(scrollY < window.innerHeight * 1.2)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <nav
      className={`
        fixed top-4 left-4 right-4 z-50
        flex items-center justify-between
        px-6 py-3
        rounded-xl
        transition-all duration-500
        ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-lg border border-zinc-200/50'
            : 'bg-white/10 backdrop-blur-sm border border-white/20'
        }
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}
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
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={`
              transition-colors duration-200 cursor-pointer
              ${isScrolled ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/80 hover:text-white'}
            `}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Desktop Auth Section */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full hover:opacity-80 transition-opacity cursor-pointer outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                  <AvatarFallback className="bg-cta text-white text-sm font-medium">
                    {user.user_metadata?.full_name?.[0]?.toUpperCase() ||
                      user.user_metadata?.name?.[0]?.toUpperCase() ||
                      user.email?.[0].toUpperCase() ||
                      'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={8}>
              <DropdownMenuItem className="text-sm cursor-pointer">Hồ sơ</DropdownMenuItem>
              <DropdownMenuItem className="text-sm cursor-pointer">
                Khóa học của tôi
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 text-sm cursor-pointer"
              >
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => navigate({ to: '/signup' })}
            className="bg-cta text-white px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer"
          >
            Bắt Đầu Học
          </button>
        )}
      </div>

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
              {links.map((link) => (
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
              {user ? (
                <SheetClose asChild>
                  <button
                    onClick={handleSignOut}
                    className="bg-zinc-100 text-zinc-900 w-full py-3 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors duration-200 cursor-pointer"
                  >
                    Đăng Xuất
                  </button>
                </SheetClose>
              ) : (
                <SheetClose asChild>
                  <button
                    onClick={() => navigate({ to: '/signup' })}
                    className="bg-cta text-white w-full py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer"
                  >
                    Bắt Đầu Học
                  </button>
                </SheetClose>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
