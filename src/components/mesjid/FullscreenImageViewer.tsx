'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'

export default function FullscreenImageViewer({ src, open, onClose }: { src: string | null; open: boolean; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastTouch = useRef({ x: 0, y: 0 })
  const lastPinchDist = useRef(0)
  const lastPinchCenter = useRef({ x: 0, y: 0 })
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [])

  useEffect(() => { if (!open) reset() }, [open, reset])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.min(Math.max(s * delta, 0.5), 5))
  }

  const getDistance = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

  const getCenter = (a: React.Touch, b: React.Touch) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  })

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      isPanning.current = false
      lastPinchDist.current = getDistance(e.touches[0], e.touches[1])
      lastPinchCenter.current = getCenter(e.touches[0], e.touches[1])
    } else if (e.touches.length === 1) {
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current)
        doubleTapTimer.current = null
        setScale(s => {
          if (s > 1) { setPos({ x: 0, y: 0 }); return 1 }
          return 2.5
        })
        return
      }
      doubleTapTimer.current = setTimeout(() => { doubleTapTimer.current = null }, 300)
      if (scale > 1) {
        isPanning.current = true
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getDistance(e.touches[0], e.touches[1])
      const center = getCenter(e.touches[0], e.touches[1])
      const ratio = dist / lastPinchDist.current
      setScale(s => Math.min(Math.max(s * ratio, 0.5), 5))
      const dx = center.x - lastPinchCenter.current.x
      const dy = center.y - lastPinchCenter.current.y
      setPos(p => ({ x: p.x + dx, y: p.y + dy }))
      lastPinchDist.current = dist
      lastPinchCenter.current = center
    } else if (e.touches.length === 1 && isPanning.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - lastTouch.current.x
      const dy = e.touches[0].clientY - lastTouch.current.y
      setPos(p => ({ x: p.x + dx, y: p.y + dy }))
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPanning.current = false
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      isPanning.current = true
      lastTouch.current = { x: e.clientX, y: e.clientY }
      e.preventDefault()
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return
    const dx = e.clientX - lastTouch.current.x
    const dy = e.clientY - lastTouch.current.y
    setPos(p => ({ x: p.x + dx, y: p.y + dy }))
    lastTouch.current = { x: e.clientX, y: e.clientY }
  }
  const handleMouseUp = () => { isPanning.current = false }

  const handleDownload = () => {
    if (!src) return
    const a = document.createElement('a')
    a.href = src
    a.download = 'image'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!open || !src) return null

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-3 bg-black/50 flex-shrink-0">
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
          <button onClick={handleDownload} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-xs ml-1">{Math.round(scale * 100)}%</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center touch-none"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => {
          if (scale <= 1 && !isPanning.current) {
            setScale(2.5)
          }
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
            transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>
    </div>
  )
}
