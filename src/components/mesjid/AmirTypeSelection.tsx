'use client'

import { motion } from 'framer-motion'
import { Star, Shield, Award } from 'lucide-react'
import { useStore, type Role } from '@/lib/store'
import { t } from '@/lib/i18n'

interface AmirTypeSelectionProps {
  onSelected: (roleType: Role) => void
}

export default function AmirTypeSelection({ onSelected }: AmirTypeSelectionProps) {
  const { language, side, setLoginRole } = useStore()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  // For women's side, filter out SUPERIOR_AMIR from Main Amir options
  const isWomen = side === 'WOMEN'
  const mainAmirRoles = isWomen
    ? ['VICE_AMIR', 'SECRETARY'] as Role[]
    : ['SUPERIOR_AMIR', 'VICE_AMIR', 'SECRETARY'] as Role[]

  const handleMainAmir = () => {
    // Store the first main amir role (selection is refined at login)
    setLoginRole(mainAmirRoles[0])
    onSelected(mainAmirRoles[0])
  }

  const handleSubAmir = () => {
    setLoginRole('EDUCATION_AMIR' as Role)
    onSelected('EDUCATION_AMIR' as Role)
  }

  const handleSmallAmir = () => {
    setLoginRole('FINANCE_AMIR' as Role)
    onSelected('FINANCE_AMIR' as Role)
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
            {t(language, 'amirType.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(language, 'amirType.subtitle')}
          </p>
        </motion.div>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Main Amir */}
          <motion.button
            variants={item}
            onClick={handleMainAmir}
            className="glass-card p-5 sm:p-6 flex items-center gap-4 cursor-pointer
              transition-all duration-200 hover:scale-[1.01] hover:border-amber-500/30
              hover:shadow-[0_0_20px_rgba(217,119,6,0.1)] group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
              bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Star className="w-7 h-7 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {t(language, 'amirType.mainAmir')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(language, 'amirType.mainDesc')}
              </p>
            </div>
          </motion.button>

          {/* Sub Amir */}
          <motion.button
            variants={item}
            onClick={handleSubAmir}
            className="glass-card p-5 sm:p-6 flex items-center gap-4 cursor-pointer
              transition-all duration-200 hover:scale-[1.01] hover:border-cyan-500/30
              hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
              bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {t(language, 'amirType.subAmir')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(language, 'amirType.subDesc')}
              </p>
            </div>
          </motion.button>

          {/* Small Amir */}
          <motion.button
            variants={item}
            onClick={handleSmallAmir}
            className="glass-card p-5 sm:p-6 flex items-center gap-4 cursor-pointer
              transition-all duration-200 hover:scale-[1.01] hover:border-violet-500/30
              hover:shadow-[0_0_20px_rgba(139,92,246,0.1)] group text-left"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0
              bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
              <Award className="w-7 h-7 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                {t(language, 'amirType.smallAmir')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(language, 'amirType.smallDesc')}
              </p>
            </div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
