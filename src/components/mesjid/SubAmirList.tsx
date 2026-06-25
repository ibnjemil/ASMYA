'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ChevronRight } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useStore, SUB_AMIR_ROLES, SMALL_AMIR_ROLES, type UserInfo, type Role } from '@/lib/store'
import { t } from '@/lib/i18n'

interface SubAmirListProps {
  onContinue: () => void
}

const ROLE_LABELS: Record<Role, string> = {
  SUPERIOR_AMIR: 'Superior Amir',
  VICE_AMIR: 'Vice Amir',
  SECRETARY: 'Secretary',
  EDUCATION_AMIR: 'Education Amir',
  COMMUNITY_AMIR: 'Community Amir',
  ADMIN_AMIR: 'Admin Amir',
  FINANCE_AMIR: 'Finance Amir',
  PROGRAM_AMIR: 'Program Amir',
  SOCIAL_MEDIA_AMIR: 'Social Media Amir',
  FOLLOWER: 'Follower',
}

export default function SubAmirList({ onContinue }: SubAmirListProps) {
  const { language, side, setLoginSubAmirId } = useStore()
  const [amirs, setAmirs] = useState<UserInfo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAmirs = useCallback(async () => {
    if (!side) return
    setIsLoading(true)
    setError(null)

    try {
      const allRoles = [...SUB_AMIR_ROLES, ...SMALL_AMIR_ROLES]
      const promises = allRoles.map(async (role) => {
        const res = await fetch(`/api/users?side=${side}&role=${role}`)
        if (!res.ok) return []
        return (await res.json()) as UserInfo[]
      })

      const results = await Promise.all(promises)
      const flat = results.flat()
      setAmirs(flat)
    } catch {
      setError('Failed to load leaders')
    } finally {
      setIsLoading(false)
    }
  }, [side])

  useEffect(() => {
    fetchAmirs()
  }, [fetchAmirs])

  const handleContinue = () => {
    if (selectedId) {
      setLoginSubAmirId(selectedId)
      onContinue()
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Title */}
        <motion.div variants={item} className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            {t(language, 'subAmirList.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(language, 'subAmirList.subtitle')}
          </p>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <motion.div variants={item} className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </motion.div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <motion.div variants={item} className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* List */}
        {!isLoading && !error && amirs.length === 0 && (
          <motion.div variants={item} className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {t(language, 'subAmirList.selectSubAmir')}
            </p>
          </motion.div>
        )}

        {!isLoading && amirs.length > 0 && (
          <motion.div
            variants={container}
            className="flex flex-col gap-3 max-h-72 overflow-y-auto mb-6 pr-1"
          >
            {amirs.map((amir) => (
              <motion.button
                key={amir.id}
                variants={item}
                onClick={() => setSelectedId(amir.id)}
                className={`glass-card p-4 flex items-center gap-3 cursor-pointer transition-all duration-200
                  hover:scale-[1.01] group text-left w-full
                  ${selectedId === amir.id
                    ? 'border-amber-500/50 shadow-[0_0_16px_rgba(217,119,6,0.15)]'
                    : 'hover:border-white/10'
                  }`}
              >
                <Avatar className="w-11 h-11 shrink-0">
                  {amir.avatarUrl ? (
                    <AvatarImage src={amir.avatarUrl} alt={amir.displayName} />
                  ) : null}
                  <AvatarFallback className="bg-amber-500/10 text-amber-400 text-sm font-semibold">
                    {amir.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {amir.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[amir.role] || amir.role}
                  </p>
                </div>
                {selectedId === amir.id && (
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Continue Button */}
        <motion.button
          variants={item}
          onClick={handleContinue}
          disabled={!selectedId}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
        >
          {t(language, 'roleChoice.title')}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  )
}
