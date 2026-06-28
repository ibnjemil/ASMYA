'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'

interface WelcomeSplashProps {
  onComplete: () => void
}

export default function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const [started, setStarted] = useState(false)

  const handleStart = () => {
    setStarted(true)
    setTimeout(() => onComplete(), 400)
  }

  return (
    <div className="w-screen h-screen fixed inset-0 mesh-bg islamic-pattern flex items-center justify-center overflow-hidden">
      {/* Decorative glow circles */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div
        className="relative flex flex-col items-center gap-5 px-6 max-w-md w-full"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Bismillah - Arabic */}
        <motion.p
          className="text-3xl sm:text-4xl font-bold text-amber-400/90 leading-relaxed"
          style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif" }}
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          السلام عليكم ورحمة الله وبركاتهِ
        </motion.p>

        {/* Decorative divider */}
        <motion.div
          className="flex items-center gap-3 w-full max-w-[200px]"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/50" />
          <Sparkles className="w-4 h-4 text-amber-500/60" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/50" />
        </motion.div>

        {/* Logo */}
        <motion.div
          className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl shadow-amber-500/20 ring-2 ring-amber-500/20"
          initial={{ opacity: 0, y: -20, rotateY: -15 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Image
            src="/asmya-logo.png"
            alt="ASMYA"
            fill
            className="object-cover"
            priority
          />
        </motion.div>

        {/* App Name */}
        <motion.h1
          className="text-5xl sm:text-6xl font-bold gradient-text tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          ASMYA
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-sm sm:text-base text-muted-foreground text-center max-w-xs"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
        >
          Abubeker Siddiq Masjid Youth Association
        </motion.p>

        {/* START Button */}
        <motion.button
          onClick={handleStart}
          disabled={started}
          className="mt-4 btn-primary group flex items-center gap-2.5 px-10 py-3.5 rounded-2xl text-lg font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {started ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Start
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </motion.button>

        {/* Footer note */}
        <motion.p
          className="text-[11px] text-muted-foreground/50 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          In the name of Allah, the Most Gracious, the Most Merciful
        </motion.p>
      </motion.div>
    </div>
  )
}