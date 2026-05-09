import { cn } from '@/lib/utils'

const sidebarLinks = [
  { label: 'Hồ sơ', href: '/profile', active: true },
]

interface AccountLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AccountLayout({ children, className }: AccountLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <aside className="w-full shrink-0 md:w-48">
            <h2 className="text-lg font-semibold text-zinc-900 font-heading mb-4">
              Cài đặt tài khoản
            </h2>
            <nav className="flex flex-row gap-4 md:flex-col md:gap-1">
              {sidebarLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.active ? undefined : link.href}
                  className={cn(
                    'text-sm transition-colors duration-150',
                    link.active
                      ? 'font-medium text-zinc-900'
                      : 'text-zinc-500 underline underline-offset-2 decoration-zinc-300 hover:text-zinc-900 hover:decoration-zinc-500'
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className={cn('min-w-0 flex-1', className)}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}