'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/lib/store'

function getTimeLeft(dueDate: string): string {
  const diff = new Date(dueDate).getTime() - Date.now()
  if (diff <= 0) return 'OVERDUE'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const p: string[] = []
  if (d > 0) p.push(d + 'd')
  p.push(h + 'h'); p.push(m + 'm'); p.push(s + 's')
  return p.join(' ')
}

export default function UrgentPlanBanner() {
  const { plans } = useStore()
  const [timeLeft, setTimeLeft] = useState('')
  const urgentPlan = plans
    .filter(p => p.status !== 'COMPLETED' && p.dueDate && new Date(p.dueDate).getTime() > Date.now() && (p.urgency === 'CRITICAL' || p.urgency === 'HIGH' || p.isUrgent))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
  useEffect(() => {
    if (!urgentPlan) return
    const tick = () => setTimeLeft(getTimeLeft(urgentPlan.dueDate))
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [urgentPlan?.id])
  if (!urgentPlan) return null
  return (
    <div className="relative z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-red-500/20 animate-ping" style={{animationDuration:'2s'}} />
      <motion.div
        initial={{ y: -80 }} animate={{ y: 0 }}
        className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white py-3.5 px-4 flex items-center justify-between shadow-lg shadow-red-500/30"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{urgentPlan.title}</p>
            <p className="text-white/70 text-xs">Due in: <span className="font-mono font-bold text-yellow-300">{timeLeft}</span></p>
          </div>
        </div>
        <div className="shrink-0 ml-3 px-3 py-1.5 rounded-full bg-white/20 border border-white/30">
          <span className="text-xs font-bold uppercase tracking-wider">Urgent</span>
        </div>
      </motion.div>
    </div>
  )
}