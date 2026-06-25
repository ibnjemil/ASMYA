'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import AIAssistant from './AIAssistant'

export default function AIOrb() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-50 w-14 h-14 rounded-full
          bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30
          flex items-center justify-center text-white cursor-pointer
          hover:shadow-xl hover:shadow-amber-500/40 transition-shadow duration-200"
        aria-label="Open AI Assistant"
        animate={{
          scale: isOpen ? 0.9 : [1, 1.05, 1],
        }}
        transition={{
          scale: {
            duration: 2,
            repeat: isOpen ? 0 : Infinity,
            ease: 'easeInOut',
          },
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* AI Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <AIAssistant onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
