import { Menu, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from '@tanstack/react-router'

const LEFT_LINKS = [
  { label: 'Tác phẩm', href: '/portfolio' },
  { label: 'Khóa học', href: '/courses' },
  { label: 'Đặt lịch', href: '/booking' },
]

const RIGHT_LINKS = [
  { label: 'Giới thiệu', href: '/about' },
  { label: 'Liên hệ', href: '#contact' },
]

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  // All links for mobile menu
  const allLinks = [
    { label: 'Trang chủ', href: '/' },
    ...LEFT_LINKS,
    ...RIGHT_LINKS,
    ...(!user ? [{ label: 'Đăng Nhập', href: '/login' }] : []),
  ]

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-5">
      {/* Desktop layout: 3 links — logo — 3 links */}
      <div className="hidden md:flex items-center justify-center">
        {/* Left links */}
        <div className="group flex items-center gap-8">
          {LEFT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium tracking-wide text-white/90 transition-opacity duration-300 hover:!opacity-100 group-hover:opacity-30 cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Center logo */}
        <a
          href="/"
          className="mx-12 font-heading text-xl font-semibold text-white tracking-wider cursor-pointer shrink-0"
        >
          nhuthungfoto
        </a>

        {/* Right links + auth */}
        <div className="group flex items-center gap-8">
          {RIGHT_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium tracking-wide text-white/90 transition-opacity duration-300 hover:!opacity-100 group-hover:opacity-30 cursor-pointer"
            >
              {link.label}
            </a>
          ))}

          {/* Auth item — 3rd right slot */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full transition-opacity duration-300 hover:!opacity-100 group-hover:opacity-30 cursor-pointer outline-none">
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
            <a
              href="/login"
              className="text-sm font-medium tracking-wide text-white/90 transition-opacity duration-300 hover:!opacity-100 group-hover:opacity-30 cursor-pointer"
            >
              Đăng Nhập
            </a>
          )}
        </div>
      </div>

      {/* Mobile layout: logo left, hamburger right */}
      <div className="flex md:hidden items-center justify-between">
        <a
          href="/"
          className="font-heading text-lg font-semibold text-white tracking-wider cursor-pointer"
        >
          nhuthungfoto
        </a>

        <Sheet>
          <SheetTrigger asChild>
            <button
              className="p-2 rounded-lg text-white hover:bg-white/10 cursor-pointer transition-colors duration-200"
              aria-label="Mở menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-gallery-dark border-white/10 p-6">
            <div className="flex items-center justify-between mb-8">
              <SheetTitle className="font-heading text-lg font-semibold text-white">
                nhuthungfoto
              </SheetTitle>
              <SheetClose asChild>
                <button
                  className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                  aria-label="Đóng menu"
                >
                  <X className="h-5 w-5 text-white/60" />
                </button>
              </SheetClose>
            </div>
            <div className="flex flex-col gap-4">
              {allLinks.map((link) => (
                <SheetClose asChild key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/80 hover:text-white text-base font-medium transition-colors duration-200 cursor-pointer py-2"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
              <hr className="border-white/10 my-2" />
              {user ? (
                <SheetClose asChild>
                  <button
                    onClick={handleSignOut}
                    className="bg-white/10 text-white w-full py-3 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors duration-200 cursor-pointer"
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
