'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CState { open: boolean; title: string; message: string; variant: 'danger' | 'warning'; action: (() => void) | null }

export function useConfirm() {
  const [s, setS] = useState<CState>({ open: false, title: '', message: '', variant: 'danger', action: null })
  const confirm = useCallback((message: string, action: () => void, variant: 'danger' | 'warning' = 'danger') => {
    setS({ open: true, title: variant === 'danger' ? 'Delete?' : 'Confirm', message, variant, action })
  }, [])
  const close = useCallback(() => setS(p => ({ ...p, open: false, action: null })), [])
  const doIt = useCallback(() => { s.action?.(); close() }, [s.action, close])

  const dialog = s.open ? (
    <motion.div key='confirm-overlay' initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className='fixed inset-0 z-[100] flex items-center justify-center p-4' onClick={close}>
      <div className='absolute inset-0 bg-black/60 backdrop-blur-sm' />
      <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.85,opacity:0}}
        transition={{type:'spring',duration:0.25,damping:25,stiffness:300}}
        className='relative glass-card p-5 max-w-xs w-full rounded-2xl border shadow-2xl'
        style={{borderColor:s.variant==='danger'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)'}}
        onClick={e=>e.stopPropagation()}>
        <div className='flex flex-col items-center text-center gap-3'>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.variant==='danger'?'bg-red-500/15':'bg-amber-500/15'}`}>
            <AlertTriangle className={`w-6 h-6 ${s.variant==='danger'?'text-red-400':'text-amber-400'}`} />
          </div>
          <h3 className='font-semibold text-sm text-foreground'>{s.title}</h3>
          <p className='text-xs text-muted-foreground leading-relaxed'>{s.message}</p>
          <div className='flex gap-2 w-full mt-1'>
            <button onClick={close} className='flex-1 px-4 py-2 text-xs rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors'>Cancel</button>
            <button onClick={doIt} className={`flex-1 px-4 py-2 text-xs rounded-xl text-white font-medium transition-colors ${s.variant==='danger'?'bg-red-500 hover:bg-red-600':'bg-amber-500 hover:bg-amber-600'}`}>{s.variant==='danger'?'Delete':'Confirm'}</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  ) : null

  return { confirm, dialog }
}

export default function ConfirmDialog() { return null }