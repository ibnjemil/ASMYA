'use client'

import { motion } from 'framer-motion'
import { User, ArrowLeft } from 'lucide-react'
import { useStore, type Side } from '@/lib/store'
import { t } from '@/lib/i18n'

interface SideSelectionProps {
  onNext: (side: Side) => void
  onBack: () => void
}

export default function SideSelection({ onNext, onBack }: SideSelectionProps) {
  const { language } = useStore()

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

  return (
    <div className="fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-6 sm:p-8 w-full max-w-md"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Back button */}
        <motion.button
          variants={item}
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>

        {/* Title */}
        <motion.div variants={item} className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
            {t(language, 'sideSelection.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(language, 'sideSelection.subtitle')}
          </p>
        </motion.div>

        {/* Options */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Men's Side */}
          <motion.button
            variants={item}
            onClick={() => onNext('MEN')}
            className="flex-1 glass-card p-6 flex flex-col items-center gap-3 cursor-pointer
              transition-all duration-200 hover:scale-[1.02] hover:border-blue-500/30
              hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] group"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center
              bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(language, 'sideSelection.men')}
            </h2>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t(language, 'sideSelection.menDesc')}
            </p>
          </motion.button>

          {/* Women's Side */}
          <motion.button
            variants={item}
            onClick={() => onNext('WOMEN')}
            className="flex-1 glass-card p-6 flex flex-col items-center gap-3 cursor-pointer
              transition-all duration-200 hover:scale-[1.02] hover:border-rose-500/30
              hover:shadow-[0_0_20px_rgba(244,63,94,0.1)] group"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center
              bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
              <User className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {t(language, 'sideSelection.women')}
            </h2>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              {t(language, 'sideSelection.womenDesc')}
            </p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}