'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed')
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10)
      // Re-show after 3 days
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) {
        return
      }
      setDismissed(false)
      localStorage.removeItem('pwa-install-dismissed')
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show after a short delay so it doesn't interrupt onboarding
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Also detect iOS - no beforeinstallprompt event
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = !window.matchMedia('(display-mode: standalone)').matches && isIOS && !('beforeinstallprompt' in window)

    if (isSafari) {
      setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowPrompt(true)
        }
      }, 4000)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
        setDeferredPrompt(null)
      }
    } else {
      // iOS fallback - show instructions
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('beforeinstallprompt' in window)

  if (!showPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[60]"
      >
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">Install ASMYA App</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isIOS
                  ? 'Tap the Share button, then "Add to Home Screen" for the best experience.'
                  : 'Add ASMYA to your home screen for quick access and offline support.'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {isIOS ? (
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-center"
              >
                Got it
              </button>
            ) : (
              <>
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-center"
                >
                  Not now
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}