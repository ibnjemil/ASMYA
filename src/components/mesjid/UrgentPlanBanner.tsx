'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/lib/store'

function getTimeLeft(dueDate) {
  var diff = new Date(dueDate).getTime() - Date.now()
  if (diff <= 0) return 'OVERDUE'
  var d = Math.floor(diff / 86400000)
  var h = Math.floor((diff % 86400000) / 3600000)
  var m = Math.floor((diff % 3600000) / 60000)
  var s = Math.floor((diff % 60000) / 1000)
  var p = []
  if (d > 0) p.push(d + 'd')
  p.push(h + 'h'); p.push(m + 'm'); p.push(s + 's')
  return p.join(' ')
}

export default function UrgentPlanBanner() {
  var store = useStore()
  var plans = store.plans
  var timeLeftState = useState('')
  var timeLeft = timeLeftState[0]
  var setTimeLeft = timeLeftState[1]
  var urgentPlan = plans
    .filter(function(p) { return p.status !== 'COMPLETED' && p.dueDate && new Date(p.dueDate).getTime() > Date.now() && (p.urgency === 'CRITICAL' || p.urgency === 'HIGH' || p.isUrgent) })
    .sort(function(a, b) { return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime() })[0]
  useEffect(function() {
    if (!urgentPlan) return
    var tick = function() { setTimeLeft(getTimeLeft(urgentPlan.dueDate)) }
    tick(); var id = setInterval(tick, 1000); return function() { clearInterval(id) }
  }, [urgentPlan ? urgentPlan.id : ''])
  if (!urgentPlan) return null
  return (
    <div className="relative z-[100]">
      <div className="absolute inset-0 bg-red-500/30 animate-ping" style={{animationDuration:'2s'}} />
      <div className="absolute inset-0 bg-red-600/20 animate-pulse" />
      <motion.div
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white py-6 px-6 shadow-2xl shadow-red-500/50 border-b-4 border-yellow-400"
      >
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping" style={{animationDuration:'1.5s'}} />
            <div className="relative bg-yellow-400/20 p-3 rounded-full">
              <AlertTriangle className="w-10 h-10 text-yellow-300 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-yellow-400 text-red-900 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-widest">Urgent</span>
              <span className="text-white/60 text-xs">Plan Deadline</span>
            </div>
            <p className="font-bold text-xl truncate leading-tight">{urgentPlan.title}</p>
            <p className="text-red-100/80 text-base mt-1">
              Due in: <span className="font-mono font-black text-yellow-300 text-lg">{timeLeft}</span>
            </p>
          </div>
          <div className="shrink-0 hidden sm:block">
            <div className="bg-white/15 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/20 text-center">
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Time Left</p>
              <p className="font-mono font-black text-2xl text-yellow-300">{timeLeft}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
