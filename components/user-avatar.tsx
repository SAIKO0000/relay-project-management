"use client"

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePrivateStorageUrl } from '@/lib/hooks/usePrivateStorageUrl'

interface UserAvatarProps {
  avatarUrl?: string | null
  userName: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function UserAvatar({ avatarUrl, userName, size = 'md', className = '' }: UserAvatarProps) {
  const resolvedAvatarUrl = usePrivateStorageUrl('avatars', avatarUrl)
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'h-6 w-6 text-xs'
      case 'sm':
        return 'h-8 w-8 text-xs'
      case 'md':
        return 'h-10 w-10 text-sm'
      case 'lg':
        return 'h-12 w-12 text-base'
      case 'xl':
        return 'h-16 w-16 text-lg'
      default:
        return 'h-10 w-10 text-sm'
    }
  }

  return (
    <Avatar className={`${getSizeClasses()} ${className}`}>
      <AvatarImage 
        src={resolvedAvatarUrl}
        alt={userName}
        className="object-cover"
      />
      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold">
        {getInitials(userName)}
      </AvatarFallback>
    </Avatar>
  )
}
