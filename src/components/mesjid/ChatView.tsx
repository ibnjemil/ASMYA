'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  Send,
  ImageIcon,
  Pencil,
  Trash2,
  X,
  Check,
  Users,
  Reply,
,
  Paperclip,
  FileText} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import io, { Socket } from 'socket.io-client'
import { useStore, ChatInfo, MessageInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'
import { useToast } from '@/hooks/use-toast'
import { useToast } from '@/hooks/use-toast'

interface ChatViewProps {
  chat: ChatInfo
  onBack?: () => void
}

function getDateSeparator(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return lang === 'am' ? 'ዛሬ' : lang === 'ar' ? 'اليوم' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? 'ትናንት' : lang === 'ar' ? 'أمس' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<MessageInfo | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const { toast } = useToast()
  const isDM = chat.type === 'DM'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)

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

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages.length, scrollToBottom])

  useEffect(() => {
    if (editingId) editRef.current?.focus()
  }, [editingId])

  // Close lightbox on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImg(null)
    }
    if (lightboxImg) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxImg])

  const handleDownload = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `asmya-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
    } catch {}
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !pendingFile) || !user || sending) return
    setSending(true)
    try {
      const body: Record<string, unknown> = {
        chatId: chat.id,
        senderId: user.id,
        type: mediaUrl ? (pendingFile?.type?.startsWith('image/') ? 'IMAGE' : 'FILE') : 'TEXT',
          content: text || (pendingFile?.name || '[File]'),
          mediaUrl,
      }
      if (replyingTo) {
        body.content = text
        body.replyToId = replyingTo.id
      }
      let mediaUrl: string | undefined
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const uploadRes = await fetch('/api/upload-avatar', { method: 'POST', body: form })
        if (uploadRes.ok) { const { url } = await uploadRes.json(); mediaUrl = url }
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        setInput('')
        clearPendingFile()
        setReplyingTo(null)
        scrollToBottom()
      }
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (file.type.startsWith('image/')) {
      setPendingPreview(URL.createObjectURL(file))
    } else {
      setPendingPreview(null)
    }
  }

  const clearPendingFile = () => {
    setPendingFile(null)
    setPendingPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleEdit = (msg: MessageInfo) => {
    setEditingId(msg.id)
    setEditText(msg.content)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return
    let mediaUrl: string | undefined
      if (pendingFile) {
        const form = new FormData()
        form.append('file', pendingFile)
        const uploadRes = await fetch('/api/upload-avatar', { method: 'POST', body: form })
        if (uploadRes.ok) { const { url } = await uploadRes.json(); mediaUrl = url }
      }
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
    const res = await fetch(`/api/messages?messageId=${msgId}`, { method: 'DELETE' })
    if (res.ok) {
      setMessages(messages.filter((m) => m.id !== msgId))
    }
  }

  const handleReply = (msg: MessageInfo) => {
    setReplyingTo(msg)
    inputRef.current?.focus()
  }

  const handleDownloadAll = async () => {
    const mediaMsgs = chatMessages.filter(m => m.mediaUrl)
    if (mediaMsgs.length === 0) { toast({title:'No media to download'}); return }
    let count = 0
    for (const msg of mediaMsgs) {
      try {
        const res = await fetch(msg.mediaUrl)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = msg.id + '.jpg'
        a.click()
        URL.revokeObjectURL(a.href)
        count++
      } catch {}
    }
    toast({title: count + ' file' + (count>1?'s':'') + ' downloaded'})
  }

  const chatName = isDM
    ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name
    : chat.name

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="btn-icon-glass p-2 md:hidden">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <button onClick={handleDownloadAll} className="btn-icon-glass p-2 flex-shrink-0" title="Download media">
            <Download className="w-4 h-4" />
          </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{chat.members.length}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages')}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium px-2">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {group.messages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              const isEditing = editingId === msg.id

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <UserAvatar user={msg.sender} size="sm" />

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
                          <button
                            onClick={() => { setEditingId(null); setEditText('') }}
                            className="btn-icon-glass p-2"
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isOwn
                              ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md'
                              : 'glass-card rounded-tl-md'
                            }`}
                        >
                          {msg.type === 'IMAGE' && msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt=""
                              className="rounded-lg max-w-full max-h-64 object-cover mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setLightboxImg(msg.mediaUrl!)}
                            />
                          )}
                          <span>{msg.content}</span>
                        </div>
                      )}

                      {/* Hover actions */}
                      {!isEditing && hoveredId === msg.id && (
                        <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 ml-1 mr-1`}>
                          <button
                            onClick={() => handleReply(msg)}
                            className="btn-icon-glass p-1.5"
                            title="Reply"
                          >
                            <Reply className="w-3 h-3" />
                          </button>
                          {isOwn && (
                            <>
                              <button
                                onClick={() => handleEdit(msg)}
                                className="btn-icon-glass p-1.5"
                                title={t(language, 'chat.edit')}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(msg.id)}
                                className="btn-icon-glass p-1.5"
                                title={t(language, 'chat.delete')}
                              >
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-muted-foreground mt-0.5 ml-1">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-t border-border overflow-hidden"
          >
            <div className="w-1 h-8 rounded-full bg-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">
                Replying to {replyingTo.sender.displayName}
              </p>
              <p className="text-xs truncate text-foreground/70">
                {replyingTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0 border-t border-border">
          {pendingPreview ? (
            <img src={pendingPreview} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <FileText className="w-8 h-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground truncate flex-1">{pendingFile.name}</span>
          <button onClick={clearPendingFile} className="btn-icon-glass p-1">
            <X className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="glass-header px-3 py-3 flex items-center gap-2 flex-shrink-0 safe-area-bottom">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-icon-glass p-2.5 flex-shrink-0"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t(language, 'chat.typeMessage')}
          className="glass-input flex-1 px-4 py-2.5 text-sm"
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t(language, 'chat.send')}</span>
        </button>
      </div>

      {/* Fullscreen Image Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            onClick={() => setLightboxImg(null)}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="w-10" />
              <div className="text-white/60 text-xs">Image Preview</div>
              <button
                onClick={() => setLightboxImg(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
              <img
                src={lightboxImg}
                alt=""
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Bottom actions */}
            <div className="flex items-center justify-center gap-4 px-4 py-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleDownload(lightboxImg)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
