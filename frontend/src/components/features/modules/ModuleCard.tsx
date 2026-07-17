import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Module } from '@/types/modules'

interface ModuleCardProps {
  module: Module
  isCurrent?: boolean
}

export function ModuleCard({ module, isCurrent }: ModuleCardProps) {
  return (
    <Link
      to="/modules/$slug"
      params={{ slug: module.slug }}
      className="block focus:outline-none focus-visible:outline-none"
    >
      <Card
        className={
          'transition-all duration-normal hover:shadow-md hover:-translate-y-0.5 ' +
          (isCurrent ? 'ring-2 ring-cta' : '')
        }
      >
        {module.coverPhotoUrl ? (
          <img
            src={module.coverPhotoUrl}
            alt={module.title}
            loading="lazy"
            decoding="async"
            className="aspect-video w-full object-cover"
          />
        ) : (
          <div className="aspect-video w-full bg-gradient-to-br from-zinc-100 to-zinc-200" />
        )}
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="font-heading text-zinc-900">{module.title}</CardTitle>
            {isCurrent && (
              <Badge className="bg-cta text-white">Đang học</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {module.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {module.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
