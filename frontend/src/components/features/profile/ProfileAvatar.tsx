import { cn } from '@/lib/utils'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

interface ProfileAvatarProps {
  url: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'size-10',
  md: 'size-16',
  lg: 'size-24',
  xl: 'size-28',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ProfileAvatar({ url, name, size = 'lg' }: ProfileAvatarProps) {
  return (
    <Avatar
      className={cn(sizeClasses[size], 'ring-2 ring-zinc-100')}
    >
      <AvatarImage
        src={url ?? undefined}
        alt={name}
        className="object-cover"
      />
      <AvatarFallback className="bg-zinc-100 text-zinc-600 font-heading text-xl">
        {getInitials(name || 'User')}
      </AvatarFallback>
    </Avatar>
  )
}