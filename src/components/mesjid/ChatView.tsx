'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, ImageIcon, Pencil, Trash2, X, Check, Users,
  Video, Mic, MicOff, Paperclip, Download, Play, Pause, Volume2,
  Reply, MoreVertical, Copy, FileText, XCircle,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import io, { Socket } from 'socket.io-client'
import { useStore, ChatInfo, MessageInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

interface ChatViewProps {
  chat: ChatInfo
  onBack?: () => void
}

interface FullMessage extends MessageInfo {
  replyToId?: string | null
  replyTo?: { id: string; content: string; type: string; sender: { id: string; displayName: string } } | null
}

function getDateSeparator(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return lang === 'am' ? '\u1237\u12c8\u1208' : lang === 'ar' ? '\u0627\u0644\u064a\u0648\u0645' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? '\u1275\u1293\u12a8\u1275' : lang === 'ar' ? '\u0623\u0645\u0633' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'h:mm a')
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<FullMessage | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: FullMessage } | null>(null)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [voiceProgress, setVoiceProgress] = useState(0)
  const [voiceDuration, setVoiceDuration] = useState(0)
  const [sendingFiles, setSendingFiles] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ msgId: string } | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [initialScroll, setInitialScroll] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isDM = chat.type === 'DM' || chat.type === 'DIRECT'
  const chatMessages = (messages.filter((m) => m.chatId === chat.id)) as FullMessage[]

  const getReplyData = (msg: FullMessage) => {
    if (msg.replyTo) return msg.replyTo
    if (msg.replyToId) {
      const found = chatMessages.find((m) => m.id === msg.replyToId)
      if (found) return { id: found.id, content: found.content, type: found.type, sender: { id: found.sender.id, displayName: found.sender.displayName } }
    }
    return null
  }

  const getReplyPreview = (reply: { type: string; content: string }): string => {
    if (!reply) return ''
    if (reply.type === 'IMAGE') return 'Photo'
    if (reply.type === 'VIDEO') return 'Video'
    if (reply.type === 'VOICE') return 'Voice message'
    if (reply.type === 'FILE') return reply.content || 'File'
    return reply.content.length > 60 ? reply.content.slice(0, 60) + '...' : reply.content
  }

  useEffect(() => {
    const handler = () => { setContextMenu(null); setMenuOpen(false) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket', 'polling'] })
    socketRef.current = socket
    socket.on('message:new', (msg: FullMessage) => {
      if (msg.chatId === chat.id) addMessage(msg)
    })
    return () => { socket.disconnect(); socketRef.current = null }
  }, [chat.id, addMessage])

  const scrollToBottom = useCallback((instant?: boolean) => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' }), 50)
  }, [])

  useEffect(() => {
    if (chatMessages.length > 0 && !initialScroll) {
      scrollToBottom(true)
      setInitialScroll(true)
    } else if (initialScroll) {
      scrollToBottom()
    }
  }, [chatMessages.length, scrollToBottom, initialScroll])

  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  const loadMoreMessages = async () => {
    if (!chatMessages.length || loadingMore || !hasMore) return
    setLoadingMore(true)
    const oldest = chatMessages[0].createdAt
    const prevH = scrollRef.current?.scrollHeight || 0
    try {
      const res = await fetch(`/api/messages?chatId=${chat.id}&limit=30&before=${oldest}`)
      if (res.ok) {
        const older: FullMessage[] = await res.json()
        if (older.length < 30) setHasMore(false)
        const ids = new Set(chatMessages.map((m) => m.id))
        const unique = older.filter((m) => !ids.has(m.id))
        if (unique.length > 0) {
          setMessages([...unique, ...chatMessages])
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevH
          })
        }
      }
    } catch { /* silent */ }
    finally { setLoadingMore(false) }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80 && hasMore && !loadingMore) loadMoreMessages()
  }

  const uploadMedia = async (file: File): Promise<string | null> => {
    const key = file.name
    setSendingFiles((p) => [...p, key])
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload-chat-media', { method: 'POST', body: form })
      if (!res.ok) return null
      const data = await res.json()
      return data.url
    } catch { return null }
    finally { setSendingFiles((p) => p.filter((f) => f !== key)) }
  }

  const sendMediaMessage = async (type: string, file: File, caption: string = '') => {
    if (!user || sending) return
    setSending(true)
    setUploadProgress(file.name)
    try {
      const url = await uploadMedia(file)
      if (!url) return
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type, content: caption || `[${type.charAt(0) + type.slice(1).toLowerCase()}]`, mediaUrl: url, replyToId: replyTo?.id || null }),
      })
      if (res.ok) {
        const msg = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        scrollToBottom()
        setReplyTo(null)
      }
    } finally { setSending(false); setUploadProgress(null) }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: 'TEXT', content: text, replyToId: replyTo?.id || null }),
      })
      if (res.ok) {
        const msg = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        setInput('')
        scrollToBottom()
        setReplyTo(null)
      }
    } finally { setSending(false) }
  }
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { sendMediaMessage('IMAGE', file); e.target.value = '' }
  }
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { sendMediaMessage('VIDEO', file); e.target.value = '' }
  }
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { sendMediaMessage('FILE', file, file.name); e.target.value = '' }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => {
        setVoiceBlob(new Blob(audioChunksRef.current, { type: recorder.mimeType }))
        stream.getTracks().forEach((tr) => tr.stop())
      }
      recorder.start(100)
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000)
    } catch { /* mic not available */ }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      audioChunksRef.current = []
      setRecording(false); setRecordingTime(0); setVoiceBlob(null)
      if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    }
  }

  const sendVoice = async () => {
    if (!voiceBlob || !user || sending) return
    setSending(true)
    try {
      const file = new File([voiceBlob], `voice-${Date.now()}.webm`, { type: voiceBlob.type })
      const url = await uploadMedia(file)
      if (!url) return
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: 'VOICE', content: formatDuration(recordingTime), mediaUrl: url }),
      })
      if (res.ok) {
        const msg = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        scrollToBottom()
      }
    } finally { setSending(false); setVoiceBlob(null); setRecordingTime(0) }
  }

  const playVoice = (msg: FullMessage) => {
    if (playingVoice === msg.id) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      return
    }
    const audio = new Audio(msg.mediaUrl!)
    audioRef.current = audio
    setPlayingVoice(msg.id)
    setVoiceProgress(0)
    audio.addEventListener('loadedmetadata', () => setVoiceDuration(audio.duration))
    audio.addEventListener('timeupdate', () => setVoiceProgress(audio.currentTime))
    audio.addEventListener('ended', () => { setPlayingVoice(null); setVoiceProgress(0) })
    audio.play().catch(() => setPlayingVoice(null))
  }

  const handleEdit = (msg: FullMessage) => {
    if (msg.type !== 'TEXT') return
    setEditingId(msg.id); setEditText(msg.content); setContextMenu(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return
    const res = await fetch('/api/messages', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: editingId, content: editText.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMessages(messages.map((m) => (m.id === editingId ? { ...m, content: updated.content } : m)))
    }
    setEditingId(null); setEditText('')
  }

  const handleDelete = (msgId: string, forEveryone: boolean) => {
    setDeleteDialog(null); setContextMenu(null)
    fetch(`/api/messages?messageId=${msgId}&forEveryone=${forEveryone}`, { method: 'DELETE' })
      .then((r) => {
        if (r.ok) {
          if (forEveryone) setMessages(messages.filter((m) => m.id !== msgId))
          else setMessages(messages.map((m) => m.id === msgId ? { ...m, content: '[Message deleted]', mediaUrl: null } : m))
        }
      }).catch(() => {})
  }

  const handleCopy = (msg: FullMessage) => { navigator.clipboard.writeText(msg.content); setContextMenu(null) }
  const handleReply = (msg: FullMessage) => { setReplyTo(msg); setContextMenu(null); inputRef.current?.focus() }
  const handleDownload = (url: string) => { window.open(url, '_blank') }
  const onContextMenu = (e: React.MouseEvent, msg: FullMessage) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msg }) }
  const chatName = isDM ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name : chat.name
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const groups: { date: string; messages: FullMessage[] }[] = []
  let lastDate = ''
  for (const msg of chatMessages) {
    const sep = getDateSeparator(msg.createdAt, language)
    if (sep !== lastDate) { groups.push({ date: sep, messages: [msg] }); lastDate = sep }
    else groups[groups.length - 1].messages.push(msg)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-white/10 bg-[#17212b] z-10">
        {onBack && (
          <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/10 transition-colors md:hidden flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <UserAvatar user={isDM ? (chat.members.find((m) => m.id !== user?.id) || chat.members[0]) : { displayName: chat.name, avatarUrl: null } as any} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-white truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Users className="w-3 h-3" /><span>{chat.members.length}</span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setContextMenu(null) }} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-[#2b5278] rounded-xl shadow-xl py-1 min-w-[160px] z-50">
              <button onClick={() => { fileRef.current?.click(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10">
                <ImageIcon className="w-4 h-4" /> Photo
              </button>
              <button onClick={() => { videoRef.current?.click(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10">
                <Video className="w-4 h-4" /> Video
              </button>
              <button onClick={() => { docRef.current?.click(); setMenuOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10">
                <Paperclip className="w-4 h-4" /> File
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2 bg-[#2b5278]/50 border-b border-white/5 flex items-center gap-2">
              <Reply className="w-3.5 h-3.5 text-[#419fd9] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-[#419fd9]">{replyTo.sender?.displayName}</span>
                <p className="text-[11px] text-gray-400 truncate">{getReplyPreview(replyTo)}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 rounded-full hover:bg-white/10 flex-shrink-0">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-1 min-h-0" onScroll={handleScroll}>
        <div ref={topRef} />
        {loadingMore && (
          <div className="flex items-center justify-center py-3">
            <div className="w-4 h-4 border-2 border-[#419fd9] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400 ml-2">Loading...</span>
          </div>
        )}
        {groups.length === 0 && !loadingMore && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-gray-500 font-medium px-2">{group.date}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            {group.messages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              const isEditing = editingId === msg.id
              const rd = getReplyData(msg)
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
                  className={`flex gap-2 mb-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => setHoveredId(msg.id)} onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={(e) => onContextMenu(e, msg)}>
                  <UserAvatar user={msg.sender} size="sm" />
                  <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isDM && !isOwn && <span className="text-[11px] text-gray-400 ml-1 mb-0.5">{msg.sender.displayName}</span>}
                    <div className="relative group">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input ref={editRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                            className="bg-[#2b5278] px-3 py-2 text-sm text-white rounded-xl w-56 outline-none border border-[#419fd9]/50" />
                          <button onClick={handleSaveEdit} className="p-2 rounded-full hover:bg-white/10"><Check className="w-3.5 h-3.5 text-green-400" /></button>
                          <button onClick={() => { setEditingId(null); setEditText('') }} className="p-2 rounded-full hover:bg-white/10"><X className="w-3.5 h-3.5 text-red-400" /></button>
                        </div>
                      ) : (
                        <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed overflow-hidden ${isOwn ? 'bg-[#2b5278] text-white rounded-tr-sm' : 'bg-[#182533] text-gray-100 rounded-tl-sm'}`}>
                          {rd && (
                            <div className={`text-[11px] px-2 py-1.5 mb-1.5 rounded-lg border-l-2 overflow-hidden ${isOwn ? 'bg-white/10 border-white/40' : 'bg-[#419fd9]/10 border-[#419fd9]/40'}`}>
                              <span className="font-semibold truncate block max-w-full text-[#419fd9]">{rd.sender.displayName}</span>
                              <p className="truncate opacity-70 mt-0.5">{getReplyPreview(rd)}</p>
                            </div>
                          )}
                          {msg.type === 'IMAGE' && msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full max-h-64 object-cover mb-1 cursor-pointer" onClick={() => setLightboxImg(msg.mediaUrl!)} />
                          )}
                          {msg.type === 'VIDEO' && msg.mediaUrl && (
                            <video src={msg.mediaUrl} controls className="rounded-lg max-w-full max-h-64 mb-1" playsInline />
                          )}
                          {msg.type === 'VOICE' && msg.mediaUrl && (
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <button onClick={() => playVoice(msg)} className="w-8 h-8 rounded-full bg-[#419fd9] flex items-center justify-center flex-shrink-0">
                                {playingVoice === msg.id ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                              </button>
                              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                                <div className="h-full bg-[#419fd9] rounded-full transition-all" style={{ width: voiceDuration > 0 ? `${(voiceProgress / voiceDuration) * 100}%` : '0%' }} />
                              </div>
                              <span className="text-[11px] text-gray-400 flex-shrink-0">{playingVoice === msg.id ? formatDuration(voiceProgress) : msg.content}</span>
                            </div>
                          )}
                          {msg.type === 'FILE' && msg.mediaUrl && (
                            <div className="flex items-center gap-2 mb-1 p-1 overflow-hidden rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => handleDownload(msg.mediaUrl!)}>
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-[#419fd9]" /></div>
                              <div className="flex-1 min-w-0 overflow-hidden"><p className="text-xs font-medium text-white truncate max-w-full" style={{ wordBreak: 'break-all' }}>{msg.content}</p></div>
                              <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </div>
                          )}
                          {msg.type === 'TEXT' && <span>{msg.content}</span>}
                        </div>
                      )}
                      {!isEditing && hoveredId === msg.id && (
                        <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 ml-1 mr-1`}>
                          <button onClick={() => handleReply(msg)} className="p-1.5 rounded-full bg-[#17212b] border border-white/10 hover:bg-white/10"><Reply className="w-3 h-3" /></button>
                          {isOwn && msg.type === 'TEXT' && <button onClick={() => handleEdit(msg)} className="p-1.5 rounded-full bg-[#17212b] border border-white/10 hover:bg-white/10"><Pencil className="w-3 h-3" /></button>}
                          <button onClick={() => setDeleteDialog({ msgId: msg.id })} className="p-1.5 rounded-full bg-[#17212b] border border-white/10 hover:bg-white/10"><Trash2 className="w-3 h-3 text-red-400" /></button>
                          <button onClick={() => handleCopy(msg)} className="p-1.5 rounded-full bg-[#17212b] border border-white/10 hover:bg-white/10"><Copy className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 ml-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {recording && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-shrink-0 overflow-hidden">
            <div className="px-3 py-3 bg-[#17212b] border-t border-white/10 flex items-center gap-3">
              <button onClick={cancelRecording} className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30"><XCircle className="w-5 h-5 text-red-400" /></button>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-white font-mono">{formatDuration(recordingTime)}</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: '60%' }} /></div>
              </div>
              <button onClick={stopRecording} className="p-2.5 rounded-full bg-[#419fd9] hover:bg-[#419fd9]/80"><Check className="w-5 h-5 text-white" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!recording && (
        <div className="flex-shrink-0 px-2 py-2 bg-[#17212b] border-t border-white/10 flex items-center gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          <input ref={docRef} type="file" className="hidden" onChange={handleFileUpload} />
          <button onClick={() => voiceBlob ? sendVoice() : startRecording()} className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${voiceBlob ? 'bg-[#419fd9] text-white' : 'hover:bg-white/10 text-gray-400'}`}>
            {voiceBlob ? <Send className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={t(language, 'chat.typeMessage') || 'Type a message...'}
            className="flex-1 px-3 py-2 text-sm text-white bg-[#242f3d] rounded-xl outline-none border border-transparent focus:border-[#419fd9]/50 placeholder-gray-500 min-w-0"
            disabled={sending} />
          <button onClick={handleSend} disabled={!input.trim() || sending} className="p-2.5 rounded-full bg-[#419fd9] text-white flex-shrink-0 disabled:opacity-40 hover:bg-[#419fd9]/80 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {uploadProgress && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-shrink-0 overflow-hidden">
            <div className="px-4 py-2 bg-[#17212b] border-t border-white/10 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#419fd9] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Sending {uploadProgress}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div className="absolute bg-[#2b5278] rounded-xl shadow-2xl py-1 min-w-[180px] z-50"
            style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => handleReply(contextMenu.msg)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10"><Reply className="w-4 h-4" /> Reply</button>
            {contextMenu.msg.type === 'TEXT' && contextMenu.msg.senderId === user?.id && (
              <button onClick={() => handleEdit(contextMenu.msg)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10"><Pencil className="w-4 h-4" /> Edit</button>
            )}
            <button onClick={() => handleCopy(contextMenu.msg)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10"><Copy className="w-4 h-4" /> Copy</button>
            <button onClick={() => { setDeleteDialog({ msgId: contextMenu.msg.id }); setContextMenu(null) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-white/10"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {deleteDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteDialog(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-[#2b5278] rounded-2xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-base mb-4">Delete Message</h3>
              <div className="space-y-2">
                <button onClick={() => handleDelete(deleteDialog.msgId, true)} className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left px-4">Delete for everyone</button>
                <button onClick={() => handleDelete(deleteDialog.msgId, false)} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors text-left px-4">Delete for me</button>
                <button onClick={() => setDeleteDialog(null)} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-white/5 transition-colors text-center">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 z-10"><X className="w-5 h-5 text-white" /></button>
            <img src={lightboxImg} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
