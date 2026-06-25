'use client'

import { motion } from 'framer-motion'
import { Crown, Users } from 'lucide-react'
import { useStore, type Role } from '@/lib/store'
import { t } from '@/lib/i18n'

interface RoleChoiceProps {
  onAmir: () => void
  onFollower: () => void
}

export default function RoleChoice({ onAmir, onFollower }: RoleChoiceProps) {
  const { language, setLoginRole } = useStore()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const handleAmir = () => {
    onAmir()
  }

  const handleFollower = () => {
    setLoginRole('FOLLOWER' as Role)
    onFollower()
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
        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            {t(language, 'roleChoice.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(language, 'roleChoice.subtitle')}
          </p>
        </motion.div>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Amir */}
          <motion.button
            variants={item}
            onClick={handleAmir}
            className="glass-card p-6 flex items-center gap-4 cursor-pointer
              transition-all duration-200 hover:scale-[1.01] hover:border-amber-500/30
              hover:shadow-[0_0_20px_rgba(217,119,6,0.1)] group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
              bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Crown className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {t(language, 'roleChoice.amir')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(language, 'roleChoice.amirDesc')}
              </p>
            </div>
          </motion.button>

          {/* Follower */}
          <motion.button
            variants={item}
            onClick={handleFollower}
            className="glass-card p-6 flex items-center gap-4 cursor-pointer
              transition-all duration-200 hover:scale-[1.01] hover:border-emerald-500/30
              hover:shadow-[0_0_20px_rgba(5,150,105,0.1)] group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
              bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Users className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {t(language, 'roleChoice.follower')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(language, 'roleChoice.followerDesc')}
              </p>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
