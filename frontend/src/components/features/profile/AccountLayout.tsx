import { cn } from '@/lib/utils'
import { Link, useRouterState } from '@tanstack/react-router'

interface AccountLayoutProps {
  children: React.ReactNode
  className?: string
  /** Username for the "Ảnh của tôi" sidebar link */
  username?: string | null
  /** Credit balance shown as a badge on the sidebar */
  creditBalance?: number | null
}

export function AccountLayout({ children, className, username, creditBalance }: AccountLayoutProps) {
  const { location } = useRouterState()

  const sidebarLinks = [
    { label: 'Hồ sơ', href: '/profile' },
    { label: 'Credit', href: '/credits', badge: creditBalance },
    ...(username ? [{ label: 'Ảnh của tôi', href: `/gallery/${username}` }] : []),
  ]

  const currentPath = location.pathname

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-zinc-900 transition-colors duration-200 group-hover:text-zinc-600"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
            <span className="text-lg font-semibold tracking-wide text-zinc-900 font-heading transition-colors duration-200 group-hover:text-zinc-600">
              nhuthungfoto
            </span>
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <aside className="w-full shrink-0 md:w-48">
            <h2 className="text-lg font-semibold text-zinc-900 font-heading mb-4">
              Cài đặt tài khoản
            </h2>
            <nav className="flex flex-row gap-4 md:flex-col md:gap-1">
              {sidebarLinks.map((link) => {
                const isActive = currentPath === link.href
                return (
                  <a
                    key={link.href}
                    href={isActive ? undefined : link.href}
                    className={cn(
                      'text-sm transition-colors duration-150',
                      isActive
                        ? 'font-medium text-zinc-900'
                        : 'text-zinc-500 underline underline-offset-2 decoration-zinc-300 hover:text-zinc-900 hover:decoration-zinc-500',
                    )}
                  >
                    {link.label}
                    {'badge' in link && link.badge != null && (
                      <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-zinc-700">
                        {link.badge}
                      </span>
                    )}
                  </a>
                )
              })}
            </nav>
          </aside>
          <main className={cn('min-w-0 flex-1', className)}>{children}</main>
        </div>
      </div>
    </div>
  )
}

