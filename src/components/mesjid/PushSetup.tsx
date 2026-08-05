'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export default function PushSetup() {
  const { user } = useStore()
  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    async function sub() {
      try {
        const reg = await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing) {
          await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, endpoint: existing.endpoint, keys: existing.toJSON().keys }) })
          return
        }
        const vpk = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vpk) return
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vpk) })
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, endpoint: sub.endpoint, keys: sub.toJSON().keys }) })
      } catch (e) { console.error('Push sub error:', e) }
    }
    function urlBase64ToUint8Array(b64: string): Uint8Array {
      const padding = '='.repeat((4 - b64.length % 4) % 4)
      const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = window.atob(base64)
      return Uint8Array.from(rawData, (c) => c.charCodeAt(0))
    }
    sub()
  }, [user?.id])
  return null
}