'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

export default function FullscreenImageViewer({ src, open, onClose }: { src: string | null; open: boolean; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const reset = useCallback(() => { setScale(1); setTranslate({ x: 0, y: 0 }) }, [])

  useEffect(() => { if (!open) reset() }, [open, reset])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(Math.max(0.5, s - e.deltaY * 0.002), 5))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (scale > 1) { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture(e.pointerId) }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    setTranslate(t => ({
      x: t.x + (e.clientX - lastPos.current.x),
      y: t.y + (e.clientY - lastPos.current.y),
    }))
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = () => { isDragging.current = false }

  return (
    <AnimatePresence>
      {open && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/95 flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between p-3 bg-black/50">
            <div className="flex items-center gap-2">
              <button onClick={() => setScale(s => Math.min(s + 0.5, 5))} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomIn className="w-5 h-5" />
              </button>
              <button onClick={() => setScale(s => Math.max(s - 0.5, 0.5))} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={reset} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <RotateCw className="w-5 h-5" />
              </button>
              <span className="text-white/60 text-xs ml-1">{Math.round(scale * 100)}%</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center"
            onWheel={handleWheel}
          >
            <motion.img
              src={src}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain select-none"
              style={{ transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`, cursor: scale > 1 ? 'grab' : 'default' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => { if (scale <= 1) { setScale(2.5); e.stopPropagation() } }}
              animate={{ scale, x: translate.x, y: translate.y }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag={scale > 1 ? false : false}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
