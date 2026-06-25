'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

interface UpdateBannerProps {
  onReload?: () => void
}

export default function UpdateBanner({ onReload }: UpdateBannerProps) {
  const { language } = useStore()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const handler = () => setShowBanner(true)
    navigator.serviceWorker.addEventListener('controllerchange', handler)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handler)
    }
  }, [])

  const handleReload = () => {
    if (onReload) {
      onReload()
    } else {
      window.location.reload()
    }
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500/90 text-white text-center text-sm py-2 px-4
            flex items-center justify-center gap-3 z-[60] overflow-hidden"
        >
          <span>{t(language, 'pwa.updateAvailable')}</span>
          <button
            onClick={handleReload}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30
              px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {t(language, 'pwa.updateNow')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
