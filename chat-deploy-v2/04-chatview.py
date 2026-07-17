#!/usr/bin/env python3
"""Fix 4: Full TG-clone ChatView.tsx - all features"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/ChatView.tsx')

# The full ChatView component
content = r"""'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, ImageIcon, Pencil, Trash2, X, Check, Users,
  Video, Mic, MicOff, Paperclip, Download, Play, Pause, Volume2,
  Reply, MoreVertical, Copy, Forward, ChevronDown,
  FileText, XCircle, CheckCheck, Image as ImageIcon2,
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

function getFileIcon(type: string) {
  if (type.startsWith('video/')) return Video
  if (type.startsWith('audio/')) return Volume2
  return FileText
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages, clearUnread } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageInfo | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: MessageInfo } | null>(null)
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

  const bottomRef = useRef<HTMLDivElement>(null)
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
  const voiceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isDM = chat.type === 'DM' || chat.type === 'DIRECT'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)

  // Clear unread on mount
  useEffect(() => {
    if (chat.id) clearUnread(chat.id)
  }, [chat.id, clearUnread])

  // Close context menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenu) setContextMenu(null)
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [contextMenu, menuOpen])

  // Socket connection
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('message:new', (msg: MessageInfo) => {
      if (msg.chatId === chat.id) {
        addMessage(msg)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [chat.id, addMessage])

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length, scrollToBottom])

  // Focus edit input
  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }, [])

  const uploadMedia = async (file: File): Promise<string | null> => {
    const key = file.name
    setSendingFiles((prev) => [...prev, key])
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload-chat-media', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.url
    } catch {
      return null
    } finally {
      setSendingFiles((prev) => prev.filter((f) => f !== key))
    }
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
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user.id,
          type,
          content: caption || `[${type.charAt(0) + type.slice(1).toLowerCase()}]`,
          mediaUrl: url,
          replyToId: replyTo?.id || null,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        scrollToBottom()
        setReplyTo(null)
      }
    } finally {
      setSending(false)
      setUploadProgress(null)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user.id,
          type: 'TEXT',
          content: text,
          replyToId: replyTo?.id || null,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        setInput('')
        scrollToBottom()
        setReplyTo(null)
      }
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      sendMediaMessage('IMAGE', file)
      e.target.value = ''
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      sendMediaMessage('VIDEO', file)
      e.target.value = ''
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      sendMediaMessage('FILE', file, file.name)
      e.target.value = ''
    }
  }

  // ─── Voice Recording ──────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
        setVoiceBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start(100)
      setRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch {
      // Microphone not available
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      audioChunksRef.current = []
      setRecording(false)
      setRecordingTime(0)
      setVoiceBlob(null)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user.id,
          type: 'VOICE',
          content: formatDuration(recordingTime),
          mediaUrl: url,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        scrollToBottom()
      }
    } finally {
      setSending(false)
      setVoiceBlob(null)
      setRecordingTime(0)
    }
  }

  // ─── Voice Playback ───────────────────────────────────────────
  const playVoice = (msg: MessageInfo) => {
    if (playingVoice === msg.id) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current)
      return
    }

    const audio = new Audio(msg.mediaUrl!)
    audioRef.current = audio
    setPlayingVoice(msg.id)
    setVoiceProgress(0)

    audio.addEventListener('loadedmetadata', () => {
      setVoiceDuration(audio.duration)
    })

    audio.addEventListener('timeupdate', () => {
      setVoiceProgress(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setPlayingVoice(null)
      setVoiceProgress(0)
      if (voiceIntervalRef.current) clearInterval(voiceIntervalRef.current)
    })

    audio.play().catch(() => setPlayingVoice(null))
  }

  const handleVoiceSeek = (msgId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !voiceDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * voiceDuration
    setVoiceProgress(pct * voiceDuration)
  }

  // ─── Edit / Delete / Reply / Copy ─────────────────────────────
  const handleEdit = (msg: MessageInfo) => {
    setEditingId(msg.id)
    setEditText(msg.content)
    setContextMenu(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return
    const res = await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: editingId, content: editText.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMessages(messages.map((m) => (m.id === editingId ? { ...m, content: updated.content } : m)))
    }
    setEditingId(null)
    setEditText('')
  }

  const handleDelete = async (msgId: string) => {
    setContextMenu(null)
    const res = await fetch(`/api/messages?messageId=${msgId}`, { method: 'DELETE' })
    if (res.ok) {
      setMessages(messages.filter((m) => m.id !== msgId))
    }
  }

  const handleCopy = (msg: MessageInfo) => {
    navigator.clipboard.writeText(msg.content)
    setContextMenu(null)
  }

  const handleReply = (msg: MessageInfo) => {
    setReplyTo(msg)
    setContextMenu(null)
    inputRef.current?.focus()
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const onContextMenu = (e: React.MouseEvent, msg: MessageInfo) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, msg })
  }

  const chatName = isDM
    ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name
    : chat.name

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (voiceBlob) {
        sendVoice()
      } else {
        handleSend()
      }
    }
  }

  // Group messages by date
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

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="btn-icon-glass p-2 md:hidden">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{chat.members.length} {language === 'am' ? '\u1235\u1290\u1275\u1270' : 'members'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1" onClick={() => { setContextMenu(null); setMenuOpen(false) }}>
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium px-2 bg-transparent">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {group.messages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              const isEditing = editingId === msg.id
              const isImage = msg.type === 'IMAGE'
              const isVideo = msg.type === 'VIDEO'
              const isVoice = msg.type === 'VOICE'
              const isFile = msg.type === 'FILE'
              const hasMedia = isImage || isVideo || isVoice || isFile

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-2 mb-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onContextMenu={(e) => onContextMenu(e, msg)}
                >
                  {!isOwn && <UserAvatar user={msg.sender} size="sm" />}

                  <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isDM && !isOwn && (
                      <span className="text-[11px] text-muted-foreground ml-1 mb-0.5">
                        {msg.sender.displayName}
                      </span>
                    )}

                    <div className="relative group">
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
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                            ${isOwn
                              ? 'bg-gradient-to-br from-[#2b5278] to-[#1e3a5f] text-white rounded-tr-md'
                              : 'glass-card rounded-tl-md'
                            }`}
                        >
                          {/* Reply preview */}
                          {msg.replyToId && (
                            <div className={`text-[11px] px-2 py-1.5 mb-1.5 rounded-lg border-l-2 ${
                              isOwn ? 'bg-white/10 border-white/40' : 'bg-primary/10 border-primary/40'
                            }`}>
                              <span className="font-medium">{msg.replyToId}</span>
                            </div>
                          )}

                          {/* Image */}
                          {isImage && msg.mediaUrl && (
                            <div className="relative cursor-pointer mb-1" onClick={() => setLightboxImg(msg.mediaUrl!)}>
                              <img
                                src={msg.mediaUrl}
                                alt=""
                                className="rounded-lg max-w-full max-h-72 object-cover"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                                <ImageIcon2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          )}

                          {/* Video */}
                          {isVideo && msg.mediaUrl && (
                            <div className="relative mb-1 rounded-lg overflow-hidden">
                              <video
                                src={msg.mediaUrl}
                                className="max-w-full max-h-72 rounded-lg"
                                preload="metadata"
                                controls
                                playsInline
                              />
                            </div>
                          )}

                          {/* Voice */}
                          {isVoice && msg.mediaUrl && (
                            <div className="flex items-center gap-2 min-w-[200px] mb-1">
                              <button
                                onClick={() => playVoice(msg)}
                                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors"
                              >
                                {playingVoice === msg.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </button>
                              <div
                                className="flex-1 h-1 rounded-full bg-white/20 cursor-pointer relative"
                                onClick={(e) => handleVoiceSeek(msg.id, e)}
                              >
                                <div
                                  className="absolute left-0 top-0 h-full rounded-full bg-[#419fd9] transition-all"
                                  style={{ width: voiceDuration ? `${(voiceProgress / voiceDuration) * 100}%` : '0%' }}
                                />
                              </div>
                              <span className="text-[11px] text-white/70 flex-shrink-0 w-10 text-right">
                                {msg.content}
                              </span>
                            </div>
                          )}

                          {/* File */}
                          {isFile && msg.mediaUrl && (
                            <div className="flex items-center gap-2 mb-1 p-1">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{msg.content}</p>
                              </div>
                              <button
                                onClick={() => handleDownload(msg.mediaUrl!, msg.content)}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center flex-shrink-0"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Text content (hide for media-only messages) */}
                          {(msg.type === 'TEXT' || (hasMedia && msg.content !== `[Image]` && msg.content !== `[Video]` && msg.content !== `[Voice]` && msg.content !== `[File]` && !msg.content.startsWith(`[${msg.type}`))) && (
                            <span>{msg.content}</span>
                          )}
                        </div>
                      )}

                      {/* Hover actions */}
                      {!isEditing && hoveredId === msg.id && (
                        <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 ml-1 mr-1`}>
                          <button onClick={() => handleReply(msg)} className="btn-icon-glass p-1.5" title="Reply">
                            <Reply className="w-3 h-3" />
                          </button>
                          {isOwn && (
                            <>
                              <button onClick={() => handleEdit(msg)} className="btn-icon-glass p-1.5" title="Edit">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDelete(msg.id)} className="btn-icon-glass p-1.5" title="Delete">
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onContextMenu(e, msg) }}
                            className="btn-icon-glass p-1.5"
                            title="More"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp + status */}
                    <div className="flex items-center gap-1 mt-0.5 ml-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOwn && (
                        <CheckCheck className="w-3 h-3 text-[#419fd9]" />
                      )}
                    </div>
                  </div>

                  {isOwn && <div className="w-8" />}
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply Bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border px-4 py-2 flex items-center gap-3 overflow-hidden"
          >
            <div className="w-0.5 h-8 bg-[#419fd9] rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[#419fd9]">{replyTo.sender.displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="btn-icon-glass p-1.5">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadProgress && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-border overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-[#419fd9] border-t-transparent rounded-full animate-spin" />
              <span>Sending {uploadProgress}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Preview */}
      <AnimatePresence>
        {(recording || voiceBlob) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-3 border-t border-border flex items-center gap-3 overflow-hidden"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-[#419fd9]'}`} />
            <span className="text-sm font-mono">{formatDuration(recordingTime)}</span>
            <div className="flex-1 h-0.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: recording ? '100%' : '0%' }} />
            </div>
            {recording ? (
              <>
                <button onClick={stopRecording} className="btn-icon-glass p-2">
                  <MicOff className="w-4 h-4 text-red-400" />
                </button>
                <button onClick={cancelRecording} className="btn-icon-glass p-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                </button>
              </>
            ) : (
              <>
                <button onClick={sendVoice} disabled={sending} className="btn-primary p-2">
                  <Send className="w-4 h-4" />
                </button>
                <button onClick={() => { setVoiceBlob(null); setRecordingTime(0) }} className="btn-icon-glass p-2">
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="glass-header px-3 py-3 flex items-center gap-2 flex-shrink-0 safe-area-bottom">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
        <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" onChange={handleFileUpload} />

        {!recording && !voiceBlob && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn-icon-glass p-2.5 flex-shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 glass-card py-1 min-w-[160px] z-50"
                >
                  <button
                    onClick={() => { fileRef.current?.click(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-green-400" />
                    <span>Image</span>
                  </button>
                  <button
                    onClick={() => { videoRef.current?.click(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                  >
                    <Video className="w-4 h-4 text-blue-400" />
                    <span>Video</span>
                  </button>
                  <button
                    onClick={() => { docRef.current?.click(); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>File</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!recording && !voiceBlob ? (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t(language, 'chat.typeMessage') || 'Type a message...'}
            className="glass-input flex-1 px-4 py-2.5 text-sm"
            disabled={sending}
          />
        ) : (
          <div className="flex-1" />
        )}

        {!recording && !voiceBlob && (
          <button
            onClick={startRecording}
            className="btn-icon-glass p-2.5 flex-shrink-0"
            title="Voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={voiceBlob ? sendVoice : handleSend}
          disabled={(voiceBlob ? false : !input.trim()) || sending}
          className="btn-primary p-2.5 flex items-center justify-center flex-shrink-0 disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImg(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"
              onClick={() => setLightboxImg(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={lightboxImg}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[90] glass-card py-1 min-w-[140px] shadow-xl"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 160),
              top: Math.min(contextMenu.y, window.innerHeight - 200),
            }}
          >
            <button
              onClick={() => handleReply(contextMenu.msg)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => handleCopy(contextMenu.msg)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            {contextMenu.msg.mediaUrl && (
              <button
                onClick={() => {
                  handleDownload(contextMenu.msg.mediaUrl!, contextMenu.msg.content)
                  setContextMenu(null)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
            {contextMenu.msg.senderId === user?.id && (
              <>
                <button
                  onClick={() => handleEdit(contextMenu.msg)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(contextMenu.msg.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 transition-colors text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
"""

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Wrote full TG-clone ChatView to {FILE}")
print(f"   Features: image/video/file/voice send, lightbox, reply, context menu, voice playback, TG dark bubbles, read receipts")