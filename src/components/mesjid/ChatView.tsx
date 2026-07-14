'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Pencil,
  Trash2,
  X,
  Check,
  Users,
  Download,
  Paperclip,
  FileText,
  Image as ImageIconLucide,
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
  if (isToday(d)) return lang === 'am' ? 'ዛሬ' : lang === 'ar' ? 'اليوم' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? 'ትናንት' : lang === 'ar' ? 'أمس' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

function getFileType(file: File): 'IMAGE' | 'FILE' {
  if (file.type.startsWith('image/')) return 'IMAGE'
  return 'FILE'
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
  const [downloadToast, setDownloadToast] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const isDM = chat.type === 'DM'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)

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

  // Auto-hide download toast
  useEffect(() => {
    if (downloadToast) {
      const t = setTimeout(() => setDownloadToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [downloadToast])

  const clearPendingFile = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [pendingPreview])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPendingPreview(URL.createObjectURL(file))
    } else {
      setPendingPreview(null)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !pendingFile) || !user || sending) return
    setSending(true)
    try {
      let mediaUrl: string | null = null
      let msgType = 'TEXT'

      if (pendingFile) {
        msgType = getFileType(pendingFile)
        const form = new FormData()
        form.append('file', pendingFile)
        const uploadRes = await fetch('/api/upload-avatar', {
          method: 'POST',
          body: form,
        })
        if (uploadRes.ok) {
          const data = await uploadRes.json()
          mediaUrl = data.url
        } else {
          setSending(false)
          return
        }
      }

      const content = text || (pendingFile ? `[${msgType === 'IMAGE' ? 'Image' : 'File'}]` : text)
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          senderId: user.id,
          type: msgType,
          content,
          mediaUrl,
        }),
      })
      if (res.ok) {
        const msg: MessageInfo = await res.json()
        addMessage(msg)
        socketRef.current?.emit('message:new', msg)
        setInput('')
        clearPendingFile()
        scrollToBottom()
      }
    } finally {
      setSending(false)
    }
  }

  const handleDownloadAll = async () => {
    const mediaMessages = chatMessages.filter((m) => m.mediaUrl)
    if (mediaMessages.length === 0) return
    let count = 0
    for (const msg of mediaMessages) {
      if (msg.mediaUrl) {
        try {
          const res = await fetch(msg.mediaUrl)
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          const ext = msg.type === 'IMAGE' ? '.jpg' : '.file'
          a.href = url
          a.download = `asmya_${msg.id.slice(0, 8)}${ext}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          count++
        } catch {
          // skip failed
        }
      }
    }
    setDownloadToast(`Downloaded ${count} file${count !== 1 ? 's' : ''}`)
  }

  const handleEdit = (msg: MessageInfo) => {
    setEditingId(msg.id)
    setEditText(msg.content)
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
    const res = await fetch(`/api/messages?messageId=${msgId}`, { method: 'DELETE' })
    if (res.ok) {
      setMessages(messages.filter((m) => m.id !== msgId))
    }
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
            <span>{chat.members.length}</span>
          </div>
        </div>
        <button
          onClick={handleDownloadAll}
          className="btn-icon-glass p-2"
          title="Download all media"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Download toast */}
      <AnimatePresence>
        {downloadToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs px-4 py-2 rounded-full shadow-lg"
          >
            {downloadToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages')}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
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
                    {/* Sender name for group chats */}
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
                          className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                            ${isOwn
                              ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md'
                              : 'glass-card rounded-tl-md'
                            }`}
                        >
                          {msg.type === 'IMAGE' && msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt=""
                              className="rounded-lg max-w-full max-h-64 object-cover mb-1"
                            />
                          )}
                          {msg.type === 'FILE' && msg.mediaUrl && (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mb-1 text-amber-300 hover:text-amber-200 underline"
                            >
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{msg.content}</span>
                            </a>
                          )}
                          <span>{msg.type === 'FILE' ? '' : msg.content}</span>
                        </div>
                      )}

                      {/* Hover actions for own messages */}
                      {!isEditing && isOwn && hoveredId === msg.id && (
                        <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 flex items-center gap-0.5 ml-1 mr-1`}>
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
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
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

      {/* Pending file preview bar */}
      <AnimatePresence>
        {pendingFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="px-3 py-2 glass-header border-t border-border/50 flex items-center gap-2">
              {pendingPreview ? (
                <img
                  src={pendingPreview}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg glass-card flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs text-muted-foreground truncate flex-1">{pendingFile.name}</span>
              <button
                onClick={clearPendingFile}
                className="btn-icon-glass p-1.5 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          disabled={(!input.trim() && !pendingFile) || sending}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t(language, 'chat.send')}</sspan>
        </button>
      </div>
   </div>
  )
}