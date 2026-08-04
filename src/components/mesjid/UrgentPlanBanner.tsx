'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useStore } from '@/lib/store'

function getTimeLeft(dueDate: string): string {
  const diff = new Date(dueDate).getTime() - Date.now()
  if (diff <= 0) return 'Overdue!'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const p: string[] = []
  if (d > 0) p.push(d + 'd')
  p.push(h + 'hr'); p.push(m + 'min'); p.push(s + 'sec')
  return p.join(' ')
}

export default function UrgentPlanBanner() {
  const { plans } = useStore()
  const [dismissed, setDismissed] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  const urgentPlan = plans
    .filter(p => p.status !== 'COMPLETED' && p.dueDate && new Date(p.dueDate).getTime() > Date.now() && (p.urgency === 'CRITICAL' || p.urgency === 'HIGH' || p.isUrgent))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]

  useEffect(() => {
    if (!urgentPlan || dismissed) return
    const tick = () => setTimeLeft(getTimeLeft(urgentPlan.dueDate))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [urgentPlan?.id, dismissed])

  if (!urgentPlan || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-red-600/95 to-red-500/90 text-white text-sm py-2 px-3 flex items-center justify-between z-[60] overflow-hidden"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
          <span className="font-semibold truncate">{urgentPlan.title}</span>
          <span className="text-white/80 font-mono text-xs shrink-0">{timeLeft}</span>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0 ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
