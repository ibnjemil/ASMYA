'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Sparkles, Menu, MessageSquare } from 'lucide-react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

const ONBOARDING_KEY = 'asmya-onboarded'

const STEPS = [
  {
    key: 'welcome' as const,
    titleKey: 'app.asmya',
    description: 'Welcome to ASMYA, your all-in-one organization management system built for the Muslim community.',
    icon: Sparkles,
  },
  {
    key: 'navigation' as const,
    titleKey: 'dashboard.sidebar',
    description: 'Navigate through chats, announcements, plans, reports, and more using the sidebar menu.',
    icon: Menu,
  },
  {
    key: 'chat' as const,
    titleKey: 'dashboard.chat',
    description: 'Stay connected with your community through real-time messaging and group chats.',
    icon: MessageSquare,
  },
]

export default function OnboardingTutorial() {
  const { language } = useStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === null
    } catch {
      return false
    }
  })

  // ── Handle completion ──────────────────────────────────────────────────
  const handleComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true')
    } catch {
      // ignore
    }
    setIsVisible(false)
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }

  const step = STEPS[currentStep]
  const StepIcon = step.icon

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4
          bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleComplete()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          className="glass-card p-6 max-w-sm w-full text-center space-y-5"
        >
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center">
            <StepIcon className="w-7 h-7 text-amber-400" />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-foreground">
              {t(language, step.titleKey)}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep ? 'bg-amber-400' : 'bg-white/15'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleComplete}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
            >
              {currentStep < STEPS.length - 1 ? 'Next' : 'Get Started'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
