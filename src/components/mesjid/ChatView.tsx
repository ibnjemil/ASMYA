'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Image as ImageIcon, Pencil, Trash2, X, Check, CheckCheck,
  Users, Paperclip, Mic, MicOff, Download, Play, Pause,
  Reply, Forward, Copy, FileText, Video, Loader2, MessageSquare,
} from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import io, { Socket } from 'socket.io-client'
import { useStore, ChatInfo, MessageInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChatViewProps {
  chat: ChatInfo
  onBack?: () => void
}

interface ContextMenuState {
  x: number
  y: number
  messageId: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getDateSeparator(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return lang === 'am' ? 'ዛሬ' : lang === 'ar' ? 'اليوم' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? 'ትናንት' : lang === 'ar' ? 'أمس' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

function formatMsgTime(dateStr: string): string {
  try { return format(new Date(dateStr), 'HH:mm') } catch { return '' }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getFileNameFromUrl(url: string): string {
  try {
    if (url.startsWith('data:')) return 'attachment'
    const parts = url.split('/')
    return parts[parts.length - 1] || 'attachment'
  } catch { return 'attachment' }
}

// ─── Sender Color Map ─────────────────────────────────────────────────────

const SENDER_COLORS = [
  'text-red-400', 'text-green-400', 'text-blue-400', 'text-yellow-400',
  'text-purple-400', 'text-pink-400', 'text-cyan-400', 'text-orange-400',
]

function getSenderColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return SENDER_COLORS[Math.abs(h) % SENDER_COLORS.length]
}

// ─── Image Lightbox ───────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10">
        <X className="w-6 h-6" />
      </button>
      <img
        src={src}
        alt=""
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <a
        href={src}
        download
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
      >
        <Download className="w-5 h-5" />
      </a>
    </motion.div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────

function MessageContextMenu({
  state,
  onClose,
  onReply,
  onForward,
  onCopy,
  onEdit,
  onDelete,
  isOwn,
}: {
  state: ContextMenuState
  onClose: () => void
  onReply: () => void
  onForward: () => void
  onCopy: () => void
  onEdit?: () => void
  onDelete: () => void
  isOwn: boolean
}) {
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    window.addEventListener('contextmenu', handler)
    return () => {
      window.removeEventListener('click', handler)
      window.removeEventListener('contextmenu', handler)
    }
  }, [onClose])

  const items = [
    { icon: Reply, label: 'Reply', action: onReply },
    { icon: Forward, label: 'Forward', action: onForward },
    { icon: Copy, label: 'Copy', action: onCopy },
  ]

  if (isOwn) {
    items.push({ icon: Pencil, label: 'Edit', action: onEdit! })
    items.push({ icon: Trash2, label: 'Delete', action: onDelete, danger: true })
  }

  return (
    <div
      className="fixed z-[90] glass-card py-1 min-w-[160px] shadow-xl"
      style={{ left: state.x, top: state.y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose() }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
            ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'hover:bg-white/10'}`}
        >
          <item.icon className="w-4 h-4 flex-shrink-0" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Attachment Menu ──────────────────────────────────────────────────────

function AttachmentMenu({
  onClose,
  onImage,
  onVideo,
  onFile,
}: {
  onClose: () => void
  onImage: () => void
  onVideo: () => void
  onFile: () => void
}) {
  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="absolute bottom-full left-2 mb-2 glass-card py-1 min-w-[180px] shadow-xl z-50"
    >
      <button onClick={() => { onImage(); onClose() }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
        <ImageIcon className="w-4 h-4 text-blue-400" />
        <span>Photo / Video</span>
      </button>
      <button onClick={() => { onFile(); onClose() }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
        <FileText className="w-4 h-4 text-purple-400" />
        <span>File</span>
      </button>
      <button onClick={() => { onVideo(); onClose() }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors">
        <Video className="w-4 h-4 text-green-400" />
        <span>Video</span>
      </button>
    </motion.div>
  )
}

// ─── Voice Player ─────────────────────────────────────────────────────────

function VoicePlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded = () => setDuration(audio.duration)
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
    }
    const onEnded = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  // Generate pseudo-waveform bars
  const barCount = 32
  const bars = useRef(Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8)).current

  return (
    <div className="flex items-center gap-2.5 min-w-[220px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 hover:bg-white/20 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-0.5 h-6">
          {bars.map((h, i) => {
            const filled = (i / barCount) * 100 < progress
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${filled ? 'bg-white/80' : 'bg-white/20'}`}
                style={{ height: `${Math.max(h * 100, 20)}%` }}
              />
            )
          })}
        </div>
        <span className="text-[10px] opacity-60">
          {playing ? formatDuration(currentTime) : formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}

// ─── Reply Bar ────────────────────────────────────────────────────────────

function ReplyBar({ message, onClose }: { message: MessageInfo; onClose: () => void }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-white/5"
    >
      <div className="w-0.5 h-8 bg-blue-400 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-blue-400 truncate">{message.sender.displayName}</p>
        <p className="text-[11px] text-white/50 truncate">{message.content.slice(0, 60)}</p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ─── Forward Modal ────────────────────────────────────────────────────────

function ForwardModal({
  chats,
  onForward,
  onClose,
}: {
  chats: ChatInfo[]
  onForward: (chatId: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[60vh] overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-sm">Forward to...</h3>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          {(chats || []).map((c) => (
            <button
              key={c.id}
              onClick={() => { onForward(c.id); onClose() }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// =============================================================================
// Main ChatView Component
// =============================================================================

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages, chats } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [contextMsg, setContextMsg] = useState<MessageInfo | null>(null)

  // Reply
  const [replyingTo, setReplyingTo] = useState<MessageInfo | null>(null)

  // Forward
  const [forwardingMsg, setForwardingMsg] = useState<MessageInfo | null>(null)

  // Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pagination
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Long press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const genericFileRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const isDM = chat.type === 'DM'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)

  // ── Socket connection ──────────────────────────────────────────────────
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('message:new', (msg: MessageInfo) => {
      if (msg.chatId === chat.id) addMessage(msg)
    })
    return () => { socket.disconnect(); socketRef.current = null }
  }, [chat.id, addMessage])

  // ── Auto-scroll ───────────────────────────────────────────────────────
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    if (isNearBottom()) scrollToBottom()
  }, [chatMessages.length, scrollToBottom, isNearBottom])

  // ── Focus edit input ──────────────────────────────────────────────────
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  // ── Pagination (scroll up) ────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el || loadingMore) return
    if (el.scrollTop < 80 && hasMore && chatMessages.length > 0) {
      const oldestMsg = chatMessages[0]
      loadMoreMessages(oldestMsg.createdAt)
    }
  }, [hasMore, loadingMore, chatMessages])

  const loadMoreMessages = async (before: string) => {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}&limit=50&before=${encodeURIComponent(before)}`)
      if (res.ok) {
        const data = await res.json()
        const olderMsgs = Array.isArray(data.messages) ? data.messages : []
        if (olderMsgs.length > 0) {
          setMessages([...olderMsgs, ...chatMessages])
          setHasMore(data.hasMore === true || olderMsgs.length >= 50)
        } else {
          setHasMore(false)
        }
      }
    } catch { /* silent */ }
    setLoadingMore(false)
  }

  // Check for more messages on initial load
  useEffect(() => {
    if (chatMessages.length >= 50) setHasMore(true)
  }, [chatMessages.length])

  // ── Send text message ─────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    try {
      let content = text
      // Add reply prefix if replying
      if (replyingTo) {
        content = `> @${replyingTo.sender.displayName}: "${replyingTo.content.slice(0, 50)}"\n${text}`
        setReplyingTo(null)
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: 'TEXT', content }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        setInput('')
        scrollToBottom()
      }
    } catch { /* silent */ }
    setSending(false)
  }

  // ── Upload & send media ───────────────────────────────────────────────
  const handleMediaUpload = async (file: File, type: 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE') => {
    if (!file || !user) return
    const maxSize = type === 'VIDEO' ? 15 * 1024 * 1024 : type === 'VOICE' ? 10 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert(`File too large. Maximum ${formatFileSize(maxSize)}.`)
      return
    }
    setUploadingMedia(true)
    try {
      const dataUrl = await fileToBase64(file)
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user.id,
          type,
          content: type === 'IMAGE' ? '[Image]' : type === 'VIDEO' ? '[Video]' : type === 'VOICE' ? '[Voice]' : file.name,
          mediaUrl: dataUrl,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        scrollToBottom()
      }
    } catch { /* silent */ }
    setUploadingMedia(false)
  }

  // ── Voice Recording ───────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recordingChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(recordingChunksRef.current, { type: mimeType })
        const file = new File([blob], `voice-${Date.now()}.${mimeType.includes('ogg') ? 'ogg' : 'webm'}`, { type: mimeType })
        await handleMediaUpload(file, 'VOICE')
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((p) => p + 1)
      }, 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  // ── Message Actions ───────────────────────────────────────────────────
  const handleEdit = (msg: MessageInfo) => {
    setEditingId(msg.id)
    setEditText(msg.content)
    inputRef.current?.focus()
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: editingId, content: editText.trim() }),
      })
      if (res.ok) {
        setMessages(messages.map((m) => (m.id === editingId ? { ...m, content: editText.trim() } : m)))
      }
    } catch { /* silent */ }
    setEditingId(null)
    setEditText('')
  }

  const handleDelete = async (msgId: string) => {
    try {
      const res = await fetch(`/api/messages?messageId=${msgId}`, { method: 'DELETE' })
      if (res.ok) setMessages(messages.filter((m) => m.id !== msgId))
    } catch { /* silent */ }
  }

  const handleCopy = (msg: MessageInfo) => {
    navigator.clipboard.writeText(msg.content).catch(() => {})
  }

  const handleForward = async (targetChatId: string) => {
    if (!forwardingMsg || !user) return
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          senderId: user.id,
          type: forwardingMsg.type,
          content: `↗ Forwarded from ${forwardingMsg.sender.displayName}\n${forwardingMsg.content}`,
          mediaUrl: forwardingMsg.mediaUrl,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        socketRef.current?.emit('message:new', msg)
      }
    } catch { /* silent */ }
    setForwardingMsg(null)
  }

  // ── Context menu handlers ─────────────────────────────────────────────
  const openContextMenu = (e: React.MouseEvent | React.TouchEvent, msg: MessageInfo) => {
    e.preventDefault()
    const isTouch = 'touches' in e
    let x: number, y: number
    if (isTouch) {
      const touch = (e as React.TouchEvent).touches[0]
      x = touch.clientX
      y = touch.clientY
    } else {
      x = (e as React.MouseEvent).clientX
      y = (e as React.MouseEvent).clientY
    }
    // Clamp to viewport
    x = Math.min(x, window.innerWidth - 180)
    y = Math.min(y, window.innerHeight - 200)
    setContextMsg(msg)
    setContextMenu({ x, y, messageId: msg.id })
  }

  const handleLongPressStart = (msg: MessageInfo) => {
    longPressTimer.current = setTimeout(() => {
      const fakeEvent = { clientX: window.innerWidth / 2, clientY: 200, preventDefault: () => {} } as React.MouseEvent
      openContextMenu(fakeEvent, msg)
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // ── Keyboard ──────────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { setEditingId(null); setEditText(''); setReplyingTo(null) }
  }

  // ── Chat name ─────────────────────────────────────────────────────────
  const chatName = isDM
    ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name
    : chat.name

  // ── Group messages by date ────────────────────────────────────────────
  const groups: { date: string; messages: MessageInfo[] }[] = []
  let lastDate = ''
  for (const msg of chatMessages) {
    const sep = getDateSeparator(msg.createdAt, language)
    if (sep !== lastDate) {
      groups.push({ date: sep, messages: [msg] })
      lastDate = sep
    } else {
      groups[groups.length - 1].messages.push(msg)
    }
  }

  // ── Render message bubble content ─────────────────────────────────────
  const renderBubbleContent = (msg: MessageInfo) => {
    if (msg.type === 'IMAGE' && msg.mediaUrl) {
      return (
        <div className="relative group/img">
          <img
            src={msg.mediaUrl}
            alt=""
            className="rounded-lg max-w-full max-h-72 object-cover cursor-pointer"
            loading="lazy"
            onClick={() => setLightboxImg(msg.mediaUrl!)}
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <a
              href={msg.mediaUrl}
              download
              onClick={(e) => e.stopPropagation()}
              className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )
    }
    if (msg.type === 'VIDEO' && msg.mediaUrl) {
      return (
        <div className="relative">
          <video
            src={msg.mediaUrl}
            controls
            className="rounded-lg max-w-full max-h-72"
            preload="metadata"
            playsInline
          />
          <a
            href={msg.mediaUrl}
            download
            className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      )
    }
    if (msg.type === 'VOICE' && msg.mediaUrl) {
      return <VoicePlayer url={msg.mediaUrl} />
    }
    if (msg.type === 'FILE' && msg.mediaUrl) {
      const fileName = getFileNameFromUrl(msg.mediaUrl)
      return (
        <a
          href={msg.mediaUrl}
          download={fileName}
          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors min-w-[200px]"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{msg.content}</p>
            <p className="text-[11px] opacity-50">File</p>
          </div>
          <Download className="w-4 h-4 opacity-50 flex-shrink-0" />
        </a>
      )
    }
    // TEXT or fallback
    return <span className="whitespace-pre-wrap break-words">{msg.content}</span>
  }

  // ── Render single message ─────────────────────────────────────────────
  const renderMessage = (msg: MessageInfo) => {
    const isOwn = msg.senderId === user?.id
    const isEditing = editingId === msg.id

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={`flex gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}
        onMouseEnter={() => setHoveredId(msg.id)}
        onMouseLeave={() => setHoveredId(null)}
        onContextMenu={(e) => openContextMenu(e, msg)}
        onTouchStart={() => handleLongPressStart(msg)}
        onTouchEnd={handleLongPressEnd}
        onTouchCancel={handleLongPressEnd}
      >
        <UserAvatar user={msg.sender} size="sm" />

        <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name for group chats */}
          {!isDM && !isOwn && (
            <span className={`text-[11px] font-semibold ml-1 mb-0.5 ${getSenderColor(msg.senderId)}`}>
              {msg.sender.displayName}
            </span>
          )}

          <div className="relative">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                    if (e.key === 'Escape') { setEditingId(null); setEditText('') }
                  }}
                  className="glass-input px-3 py-2 text-sm w-56"
                />
                <button onClick={handleSaveEdit} className="btn-icon-glass p-2">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button onClick={() => { setEditingId(null); setEditText('') }} className="btn-icon-glass p-2">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ) : (
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed relative
                  ${isOwn
                    ? 'bg-[#2b5278] text-white rounded-tr-md'
                    : 'bg-[#182533] text-white rounded-tl-md'
                  }
                  light:is-own:bg-[#effdde] light:is-own:text-gray-900 light:!is-own:bg-white light:!is-own:text-gray-900 light:!is-own:border light:!is-own:border-gray-200
                `}
              >
                {/* Forwarded label */}
                {msg.content.startsWith('\u21E7') && (
                  <p className="text-[11px] text-blue-400/80 mb-1 italic">{msg.content.split('\n')[0]}</p>
                )}
                {/* Reply quote */}
                {msg.content.startsWith('>') && !msg.content.startsWith('\u21E7') && (
                  <div className="border-l-2 border-blue-400/60 pl-2 mb-1.5">
                    <p className="text-[11px] text-blue-400/80">{msg.content.split('\n')[0]}</p>
                  </div>
                )}
                {renderBubbleContent(msg)}
                {/* Timestamp + read receipt */}
                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-end'}`}>
                  <span className="text-[10px] opacity-50">{formatMsgTime(msg.createdAt)}</span>
                  {isOwn && (
                    <CheckCheck className="w-3.5 h-3.5 opacity-60" />
                  )}
                </div>
              </div>
            )}

            {/* Hover actions */}
            {!isEditing && hoveredId === msg.id && (
              <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 mx-1`}>
                <button onClick={() => { setReplyingTo(msg) }} className="btn-icon-glass p-1.5" title="Reply">
                  <Reply className="w-3 h-3" />
                </button>
                {isOwn && (
                  <>
                    <button onClick={() => handleEdit(msg)} className="btn-icon-glass p-1.5" title="Edit">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDelete(msg.id)} className="btn-icon-glass p-1.5" title="Delete">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#17212b] light:bg-gray-100">
      {/* Header */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="btn-icon-glass p-2 md:hidden">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <UserAvatar
          user={isDM ? chat.members.find((m) => m.id !== user?.id) : undefined}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {chat.type === 'DM' ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                online
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {chat.members.length} members
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        )}

        <div ref={topRef} />

        {groups.length === 0 && !loadingMore && (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-white/40 font-medium px-2 bg-[#17212b] light:bg-gray-100 rounded-lg">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            {group.messages.map(renderMessage)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply Bar */}
      <AnimatePresence>
        {replyingTo && (
          <ReplyBar message={replyingTo} onClose={() => setReplyingTo(null)} />
        )}
      </AnimatePresence>

      {/* Voice Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 border-t border-red-500/30 bg-red-500/10"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-400 font-medium">Recording</span>
            <span className="text-sm text-red-400/70">{formatDuration(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={stopRecording} className="btn-icon-glass p-2 hover:!border-red-500/30">
              <MicOff className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      {!isRecording && (
        <div className="glass-header px-3 py-3 flex items-center gap-2 flex-shrink-0 safe-area-bottom relative">
          {/* Hidden file inputs */}
          <input ref={imageFileRef} type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const t = f.type.startsWith('video') ? 'VIDEO' : 'IMAGE'; handleMediaUpload(f, t) } if (imageFileRef.current) imageFileRef.current.value = '' }} />
          <input ref={videoFileRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'VIDEO'); if (videoFileRef.current) videoFileRef.current.value = '' }} />
          <input ref={genericFileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f, 'FILE'); if (genericFileRef.current) genericFileRef.current.value = '' }} />

          {/* Attachment button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="btn-icon-glass p-2.5 flex-shrink-0"
              disabled={sending || uploadingMedia}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showAttachMenu && (
                <AttachmentMenu
                  onClose={() => setShowAttachMenu(false)}
                  onImage={() => imageFileRef.current?.click()}
                  onVideo={() => videoFileRef.current?.click()}
                  onFile={() => genericFileRef.current?.click()}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(language, 'chat.typeMessage') || 'Type a message...'}
            className="glass-input flex-1 px-4 py-2.5 text-sm"
            disabled={sending || uploadingMedia}
          />

          {/* Voice / Send button */}
          {input.trim() ? (
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={uploadingMedia}
              className="btn-icon-glass p-2.5 flex-shrink-0 hover:!border-red-500/30"
            >
              {uploadingMedia ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && contextMsg && (
        <MessageContextMenu
          state={contextMenu}
          onClose={() => { setContextMenu(null); setContextMsg(null) }}
          onReply={() => { setReplyingTo(contextMsg!); setContextMenu(null) }}
          onForward={() => { setForwardingMsg(contextMsg!); setContextMenu(null) }}
          onCopy={() => { handleCopy(contextMsg!); setContextMenu(null) }}
          onEdit={() => { handleEdit(contextMsg!); setContextMenu(null) }}
          onDelete={() => { handleDelete(contextMenu.messageId); setContextMenu(null) }}
          isOwn={contextMsg.senderId === user?.id}
        />
      )}

      {/* Forward Modal */}
      <AnimatePresence>
        {forwardingMsg && (
          <ForwardModal
            chats={chats.filter((c) => c.id !== chat.id)}
            onForward={handleForward}
            onClose={() => setForwardingMsg(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}