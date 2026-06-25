'use client'

interface UserObject {
  id?: string
  displayName: string
  avatarUrl: string | null
  role?: string
  side?: string
}

interface UserAvatarProps {
  user?: UserObject
  avatarUrl?: string | null
  displayName?: string
  role?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const roleGradients: Record<string, string> = {
  SUPERIOR_AMIR: 'from-amber-500 to-yellow-400',
  VICE_AMIR: 'from-emerald-500 to-green-400',
  SECRETARY: 'from-blue-500 to-cyan-400',
  EDUCATION_AMIR: 'from-purple-500 to-violet-400',
  COMMUNITY_AMIR: 'from-rose-500 to-pink-400',
  ADMIN_AMIR: 'from-cyan-500 to-teal-400',
  FINANCE_AMIR: 'from-green-500 to-emerald-400',
  PROGRAM_AMIR: 'from-orange-500 to-amber-400',
  SOCIAL_MEDIA_AMIR: 'from-pink-500 to-rose-400',
}

const followerColors = [
  'from-stone-500 to-stone-400',
  'from-zinc-500 to-zinc-400',
  'from-neutral-500 to-neutral-400',
  'from-slate-500 to-slate-400',
  'from-stone-600 to-stone-500',
  'from-zinc-600 to-zinc-500',
  'from-slate-600 to-slate-500',
  'from-neutral-600 to-neutral-500',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  return name.charAt(0).toUpperCase()
}

function getHashColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return followerColors[Math.abs(hash) % followerColors.length]
}

export default function UserAvatar({
  user,
  avatarUrl: avatarUrlProp,
  displayName: displayNameProp,
  role: roleProp,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const avatarUrl = user?.avatarUrl ?? avatarUrlProp ?? null
  const displayName = user?.displayName ?? displayNameProp ?? 'U'
  const role = user?.role ?? roleProp
  const sizeClasses = sizeMap[size] || sizeMap.md
  const initials = getInitials(displayName)

  if (avatarUrl) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 bg-neutral-800 ${sizeClasses} ${className}`}
      >
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  const gradient = role && roleGradients[role]
    ? roleGradients[role]
    : user?.id
      ? getHashColor(user.id)
      : 'from-stone-500 to-stone-400'

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} text-white font-bold ${sizeClasses} ${className}`}
    >
      {initials}
    </div>
  )
}