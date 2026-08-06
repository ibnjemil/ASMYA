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
  var plans = (store.plans || [])
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
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <div className="bg-red-600/20 animate-ping absolute inset-0" style={{animationDuration:'2s'}} />
      <motion.div
        initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative bg-gradient-to-r from-red-800 via-red-600 to-red-800 text-white py-2.5 px-4 flex items-center gap-3 shadow-lg shadow-red-500/30 border-b-2 border-yellow-400"
      >
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping" style={{animationDuration:'1.5s'}} />
          <div className="relative bg-yellow-400/20 p-1.5 rounded-full">
            <AlertTriangle className="w-5 h-5 text-yellow-300 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Urgent</span>
            <p className="font-bold text-sm truncate">{urgentPlan.title}</p>
          </div>
          <p className="text-red-100/80 text-xs">
            Due: <span className="font-mono font-bold text-yellow-300">{timeLeft}</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
