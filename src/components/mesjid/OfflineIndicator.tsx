'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

export default function OfflineIndicator() {
  const { isOffline, language } = useStore()

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-50 bg-red-500/90 text-white text-center text-sm
            py-1.5 px-4 flex items-center justify-center gap-2 overflow-hidden"
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>{t(language, 'offline.message') || 'You are offline'}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
