'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { io, Socket } from 'socket.io-client'

/* ===== Types ===== */
interface Msg {
  id: string
  chatId: string
  senderId: string
  sender?: { id: string; name: string; avatar?: string }
  type: 'TEXT' | 'IMAGE' | 'FILE'
  content: string
  mediaUrl?: string
  fileName?: string
  fileSize?: number
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
  isDeleted?: boolean
  seenBy?: string[]
}

interface ChatViewProps {
  onBack?: () => void
  isMobile?: boolean
}

/* ===== Helpers ===== */
function msgTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateSep(d: string): string {
  const dt = new Date(d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yest = new Date(today.getTime() - 86400000)
  if (dt >= today) return 'Today'
  if (dt >= yest) return 'Yesterday'
  return dt.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
}

function sameDay(a: string, b: string) {
  const d1 = new Date(a), d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}

function fmtSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

/* ===== Sub-components ===== */

function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4 select-none">
      <span className="bg-black/20 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
        {dateSep(date)}
      </span>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-[3px] px-1">
      {[0, 150, 300].map(d => (
        <span
          key={d}
          className="w-[6px] h-[6px] bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${d}ms`, animationDuration: '0.6s' }}
        />
      ))}
    </div>
  )
}

function ReadCheck({ seenBy, senderId, uid }: { seenBy?: string[]; senderId: string; uid?: string }) {
  if (senderId !== uid) return null
  if (!seenBy || seenBy.length === 0) {
    return <svg className="w-4 h-3.5 ml-1 text-gray-400" viewBox="0 0 16 11" fill="none"><path d="M1 5.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  }
  const read = seenBy.length > 1 || (seenBy.length === 1 && seenBy[0] !== senderId)
  return (
    <svg className={`w-4 h-3.5 ml-1 ${read ? 'text-blue-400' : 'text-gray-400'}`} viewBox="0 0 16 11" fill="none">
      <path d="M1 5.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 5.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Bubble({
  msg, isOwn, isFirst, isLast, hovered, onHover, onLeave,
  onEdit, onDelete, onImgClick, sending
}: {
  msg: Msg; isOwn: boolean; isFirst: boolean; isLast: boolean
  hovered: boolean; onHover: () => void; onLeave: () => void
  onEdit?: (m: Msg) => void; onDelete?: (m: Msg) => void
  onImgClick?: (u: string) => void; sending?: boolean
}) {
  const { user } = useStore()

  const radius = isOwn
    ? `${isFirst ? 'rounded-tr-xl' : 'rounded-tr-sm'} ${isLast ? 'rounded-br-xl' : 'rounded-br-sm'} rounded-tl-xl rounded-bl-xl`
    : `${isFirst ? 'rounded-tl-xl' : 'rounded-tl-sm'} ${isLast ? 'rounded-bl-xl' : 'rounded-bl-sm'} rounded-tr-xl rounded-br-xl`

  const bubbleBg = isOwn ? 'bg-[#EEFFDE]' : 'bg-white'

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirst ? 'mt-[3px]' : 'mt-[2px]'}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Avatar column */}
      {!isOwn && (
        <div className="w-8 flex-shrink-0 mr-[5px]">
          {isLast && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shadow-sm">
              {msg.sender?.avatar ? (
                <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (msg.sender?.name || '?').charAt(0).toUpperCase()
              )}
            </div>
          )}
        </div>
      )}

      <div className={`relative max-w-[70%] min-w-[80px] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {isFirst && !isOwn && (
          <span className="text-[13px] font-semibold text-blue-400 mb-[2px] ml-1 select-none">
            {msg.sender?.name || 'Unknown'}
          </span>
        )}

        <div className={`relative group ${sending ? 'opacity-70' : ''}`}>
          {/* IMAGE */}
          {msg.type === 'IMAGE' && (
            <div className={`${radius} overflow-hidden shadow-sm`}>
              <div className={bubbleBg}>
                {sending ? (
                  <div className="w-64 h-48 bg-gray-200 rounded-xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                  </div>
                ) : msg.mediaUrl ? (
                  <img
                    src={msg.mediaUrl}
                    alt={msg.content || 'Image'}
                    className="max-w-[300px] max-h-[400px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onImgClick?.(msg.mediaUrl!)}
                    loading="lazy"
                  />
                ) : null}
                {msg.content && !msg.isDeleted && (
                  <div className="px-2.5 py-1.5">
                    <p className="text-sm text-gray-800 break-words">{msg.content}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FILE */}
          {msg.type === 'FILE' && (
            <div className={`${radius} ${bubbleBg} px-3 py-2.5 shadow-sm min-w-[220px]`}>
              {sending ? (
                <div className="flex items-center gap-2 py-2">
                  <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span className="text-sm text-gray-500">Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{msg.fileName || 'File'}</p>
                    {msg.fileSize && <p className="text-xs text-gray-500 mt-0.5">{fmtSize(msg.fileSize)}</p>}
                  </div>
                  {msg.mediaUrl && (
                    <a href={msg.mediaUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                    </a>
                  )}
                </div>
              )}
              {msg.content && !msg.isDeleted && (
                <p className="text-sm text-gray-800 mt-1.5 break-words">{msg.content}</p>
              )}
            </div>
          )}

          {/* TEXT */}
          {msg.type === 'TEXT' && (
            <div className={`${radius} ${bubbleBg} px-[10px] py-[6px] shadow-sm`}>
              {msg.isDeleted ? (
                <p className="text-sm italic text-gray-400">This message was deleted</p>
              ) : (
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
              )}
            </div>
          )}

          {/* Time + read check */}
          <div className={`flex items-center gap-0 mt-[2px] ${isOwn ? 'pr-1' : 'pl-1'}`}>
            {msg.isEdited && !msg.isDeleted && <span className="text-[10px] text-gray-400 mr-1 select-none">edited</span>}
            <span className="text-[11px] text-gray-400 select-none">{msgTime(msg.createdAt)}</span>
            <ReadCheck seenBy={msg.seenBy} senderId={msg.senderId} uid={user?.id} />
          </div>

          {/* Hover actions */}
          {hovered && !msg.isDeleted && !sending && isOwn && (
            <div className="absolute top-0 -left-[36px] flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {msg.type === 'TEXT' && onEdit && (
                <button onClick={e => { e.stopPropagation(); onEdit(msg) }}
                  className="w-7 h-7 rounded-full bg-white shadow-md hover:bg-gray-50 flex items-center justify-center transition" title="Edit">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
              )}
              {onDelete && (
                <button onClick={e => { e.stopPropagation(); onDelete(msg) }}
                  className="w-7 h-7 rounded-full bg-white shadow-md hover:bg-red-50 flex items-center justify-center transition" title="Delete">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ===== Main Component ===== */
export default function ChatView({ onBack, isMobile }: ChatViewProps) {
  const { user, activeChat, chats, addMessage } = useStore()
  const chat = (chats as any[])?.find((c: any) => c.id === activeChat)

  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())
  const [hasMore, setHasMore] = useState(false)
  const [earliest, setEarliest] = useState<string | null>(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [typers, setTypers] = useState<Set<string>>(new Set())
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const atBottom = useRef(true)
  const loadingMore = useRef(false)

  /* Fetch initial messages */
  useEffect(() => {
    if (!activeChat) return
    setMessages([]); setHasMore(false); setEarliest(null); setLoading(true); setEditingMsg(null)

    const fetchMsgs = async () => {
      try {
        const res = await fetch(`/api/messages?chatId=${activeChat}&limit=50&before=${new Date().toISOString()}`)
        const data = await res.json()
        const msgs: Msg[] = (data.messages || []).sort((a: Msg, b: Msg) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setMessages(msgs)
        setHasMore(!!data.hasMore)
        if (msgs.length > 0) setEarliest(msgs[0].createdAt)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchMsgs()
  }, [activeChat])

  /* Socket */
  useEffect(() => {
    if (!activeChat || !user) return
    const socket = io({ path: '/api/socket' })
    socketRef.current = socket

    socket.on('connect', () => socket.emit('joinChat', activeChat))

    socket.on('message', (msg: Msg) => {
      if (msg.chatId === activeChat) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
        try { (addMessage as any)?.(msg) } catch {}
      }
    })

    socket.on('typing', ({ userId, chatId }: { userId: string; chatId: string }) => {
      if (chatId !== activeChat) return
      setTypers(p => { const n = new Set(p); n.add(userId); return n })
      setTimeout(() => setTypers(p => { const n = new Set(p); n.delete(userId); return n }), 3000)
    })

    socket.on('messageUpdated', (msg: Msg) => {
      if (msg.chatId === activeChat) {
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
      }
    })

    socket.on('messageDeleted', ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      if (chatId === activeChat) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isDeleted: true, content: '' } : m))
      }
    })

    return () => {
      socket.emit('leaveChat', activeChat)
      socket.disconnect()
      socketRef.current = null
    }
  }, [activeChat, user])

  /* Auto-scroll */
  useEffect(() => {
    if (atBottom.current) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages.length])

  /* Scroll handler */
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (el.scrollTop < 80 && hasMore && !loadingMore.current) {
      loadMore()
    }
  }, [hasMore, earliest])

  /* Load more */
  const loadMore = useCallback(async () => {
    if (!hasMore || !earliest || !activeChat || loadingMore.current) return
    loadingMore.current = true
    try {
      const prevH = scrollRef.current?.scrollHeight || 0
      const res = await fetch(`/api/messages?chatId=${activeChat}&limit=50&before=${earliest}`)
      const data = await res.json()
      const older: Msg[] = (data.messages || []).sort((a: Msg, b: Msg) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      if (older.length > 0) {
        setMessages(prev => [...older, ...prev])
        setEarliest(older[0].createdAt)
        setHasMore(!!data.hasMore)
        requestAnimationFrame(() => {
          const newH = scrollRef.current?.scrollHeight || 0
          if (scrollRef.current) scrollRef.current.scrollTop = newH - prevH
        })
      } else { setHasMore(false) }
    } catch (e) { console.error(e) }
    finally { loadingMore.current = false }
  }, [activeChat, earliest, hasMore])

  /* Send message */
  const sendMsg = useCallback(async () => {
    const t = text.trim()
    if (!t && !pendingFile) return
    setSending(true)

    try {
      if (editingMsg) {
        await fetch(`/api/messages/${editingMsg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: t })
        })
        setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: t, isEdited: true } : m))
        setEditingMsg(null); setText(''); setSending(false); return
      }

      /* Handle file upload */
      if (pendingFile) {
        const isImg = pendingFile.type.startsWith('image/')
        const tempId = `temp-${Date.now()}`
        const optimistic: Msg = {
          id: tempId, chatId: activeChat!, senderId: user?.id || '',
          sender: { id: user?.id || '', name: user?.name || '' },
          type: isImg ? 'IMAGE' : 'FILE',
          content: t || (isImg ? '' : pendingFile.name),
          fileName: pendingFile.name, fileSize: pendingFile.size,
          createdAt: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimistic])
        setSendingIds(p => new Set(p).add(tempId))
        const file = pendingFile
        setPendingFile(null); setPendingPreview(null); setText(''); setAttachOpen(false)
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

        try {
          const fd = new FormData()
          fd.append('file', file)
          const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
          const upData = await upRes.json()
          const msgBody: any = {
            chatId: activeChat, senderId: user?.id,
            type: isImg ? 'IMAGE' : 'FILE',
            content: t || (isImg ? '' : file.name),
            mediaUrl: upData.url, fileName: file.name, fileSize: file.size
          }
          const res = await fetch('/api/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msgBody)
          })
          const real = await res.json()
          setMessages(prev => prev.map(m => m.id === tempId ? real : m))
          try { (addMessage as any)?.(real) } catch {}
        } catch {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: 'Failed to send' } : m))
        } finally {
          setSendingIds(p => { const n = new Set(p); n.delete(tempId); return n })
        }
        setSending(false); return
      }

      /* Text only */
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChat, senderId: user?.id, type: 'TEXT', content: t })
      })
      const msg = await res.json()
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      try { (addMessage as any)?.(msg) } catch {}
      setText('')
    } catch (e) { console.error(e) }
    finally { setSending(false); setAttachOpen(false) }
  }, [text, pendingFile, activeChat, user, editingMsg, addMessage])

  /* File handlers */
  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.type.startsWith('image/')) {
      setPendingFile(f)
      const r = new FileReader(); r.onload = ev => setPendingPreview(ev.target?.result as string); r.readAsDataURL(f)
    } else { setPendingFile(f); setPendingPreview(null) }
    setAttachOpen(false); inputRef.current?.focus()
  }, [])

  const onImgSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setPendingFile(f)
    const r = new FileReader(); r.onload = ev => setPendingPreview(ev.target?.result as string); r.readAsDataURL(f)
    setAttachOpen(false)
  }, [])

  const clearPending = useCallback(() => {
    setPendingFile(null); setPendingPreview(null)
    if (fileRef.current) fileRef.current.value = ''
    if (imgRef.current) imgRef.current.value = ''
  }, [])

  const doEdit = useCallback((m: Msg) => {
    if (m.type !== 'TEXT') return
    setEditingMsg(m); setText(m.content); inputRef.current?.focus()
  }, [])

  const doDelete = useCallback(async (m: Msg) => {
    if (!confirm('Delete this message?')) return
    try {
      await fetch(`/api/messages/${m.id}`, { method: 'DELETE' })
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, isDeleted: true, content: '' } : x))
    } catch (e) { console.error(e) }
  }, [])

  const cancelEdit = useCallback(() => { setEditingMsg(null); setText('') }, [])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
    if (e.key === 'Escape' && editingMsg) cancelEdit()
  }, [sendMsg, editingMsg, cancelEdit])

  const typingLabel = (() => {
    if (typers.size === 0) return null
    const names = (chat?.participants as any[])?.filter((p: any) => typers.has(p.id) && p.id !== user?.id).map((p: any) => p.name?.split(' ')[0]).filter(Boolean)
    if (!names || names.length === 0) return null
    return names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`
  })()

  if (!activeChat || !chat) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center px-2 py-1.5 bg-white border-b border-gray-200 shadow-sm z-10 flex-shrink-0">
        {isMobile && (
          <button onClick={onBack} className="p-2 -ml-1 mr-1 rounded-full hover:bg-gray-100 transition active:bg-gray-200">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div className="flex items-center flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
            {chat.avatar ? <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" /> : (chat.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 min-w-0">
            <h3 className="font-semibold text-gray-900 text-[15px] truncate leading-tight">{chat.name}</h3>
            {typingLabel ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <TypingDots />
                <span className="text-xs text-blue-500 font-medium">{typingLabel}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">
                {(chat.participants as any[])?.length ? `${(chat.participants as any[]).length} members` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
        style={{
          backgroundColor: '#e8dfd5',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23b8a898' fill-opacity='0.06'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button onClick={loadMore} disabled={loadingMore.current}
              className="bg-white/80 text-blue-600 text-xs font-medium px-4 py-1.5 rounded-full hover:bg-white transition shadow-sm disabled:opacity-50">
              {loadingMore.current ? 'Loading...' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && loading && (
          <div className="flex items-center justify-center h-full">
            <svg className="w-7 h-7 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === user?.id
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const isFirst = !prev || prev.senderId !== msg.senderId || !sameDay(prev.createdAt, msg.createdAt) || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 300000)
          const isLast = !next || next.senderId !== msg.senderId || !sameDay(msg.createdAt, next.createdAt) || (new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() > 300000)
          const showDate = !prev || !sameDay(prev.createdAt, msg.createdAt)

          return (
            <React.Fragment key={msg.id}>
              {showDate && <DateSep date={msg.createdAt} />}
              <Bubble
                msg={msg} isOwn={isOwn} isFirst={isFirst} isLast={isLast}
                hovered={hoveredId === msg.id}
                onHover={() => setHoveredId(msg.id)}
                onLeave={() => setHoveredId(null)}
                onEdit={doEdit} onDelete={doDelete}
                onImgClick={u => setImgPreview(u)}
                sending={sendingIds.has(msg.id)}
              />
            </React.Fragment>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Pending file preview */}
      <AnimatePresence>
        {pendingFile && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-white border-t border-gray-200 overflow-hidden flex-shrink-0">
            <div className="flex items-center gap-3 px-4 py-2">
              {pendingPreview ? (
                <div className="relative">
                  <img src={pendingPreview} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  <button onClick={clearPending} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none">x</button>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pendingFile.name}</p>
                <p className="text-xs text-gray-500">{fmtSize(pendingFile.size)}</p>
              </div>
              <button onClick={clearPending} className="p-1.5 rounded-full hover:bg-gray-100 transition">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit bar */}
      <AnimatePresence>
        {editingMsg && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-t border-amber-200 overflow-hidden flex-shrink-0">
            <div className="flex items-center gap-2 px-4 py-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              <span className="text-xs text-amber-700 truncate flex-1">Edit: {editingMsg.content.slice(0, 60)}{editingMsg.content.length > 60 ? '...' : ''}</span>
              <button onClick={cancelEdit} className="p-1 rounded hover:bg-amber-100 transition">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="bg-white border-t border-gray-200 px-2 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setAttachOpen(!attachOpen)} className="p-2 rounded-full hover:bg-gray-100 transition">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
            </button>
            <AnimatePresence>
              {attachOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 w-52 z-20"
                >
                  <button onClick={() => imgRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition text-left">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">Photo or Video</span>
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 transition text-left">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">Document</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message"
            className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-gray-400"
          />

          {text.trim() || pendingFile ? (
            <button onClick={sendMsg} disabled={sending}
              className="p-2.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          ) : (
            <button className="p-2.5 rounded-full hover:bg-gray-100 transition">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" className="hidden" onChange={onFileSelect} />
      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={onImgSelect} />

      {/* Image preview modal */}
      <AnimatePresence>
        {imgPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={() => setImgPreview(null)}>
            <button onClick={() => setImgPreview(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <motion.img initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
              src={imgPreview} alt="" className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
            <a href={imgPreview} download onClick={e => e.stopPropagation()}
              className="absolute bottom-6 right-6 bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-full transition flex items-center gap-2 backdrop-blur-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              <span className="text-sm font-medium">Download</span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {attachOpen && <div className="fixed inset-0 z-10" onClick={() => setAttachOpen(false)} />}
    </div>
  )
}