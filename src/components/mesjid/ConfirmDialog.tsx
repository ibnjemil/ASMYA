'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[85vw] max-w-sm glass-card p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className={'p-2 rounded-full shrink-0 ' + (variant === 'danger' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-400')}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onCancel} className="px-4 py-2 text-xs rounded-xl text-muted-foreground hover:bg-muted transition-colors">{cancelLabel}</button>
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={'px-4 py-2 text-xs rounded-xl font-medium text-white transition-colors ' + (variant === 'danger' ? 'bg-destructive hover:bg-destructive/90' : 'bg-amber-500 hover:bg-amber-500/90')}
              >{confirmLabel}</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' as 'danger' | 'warning' })
  const confirm = useCallback((title: string, message: string, onConfirm: () => void, variant: 'danger' | 'warning' = 'danger') => {
    setState({ open: true, title, message, onConfirm, variant })
  }, [])
  const Dialog = useCallback(() => (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      onConfirm={state.onConfirm}
      onCancel={() => setState(s => ({ ...s, open: false }))}
      variant={state.variant}
    />
  ), [state])
  return { confirm, Dialog }
}
