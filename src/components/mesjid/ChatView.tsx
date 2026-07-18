'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Send, ImageIcon, Paperclip, Pencil, Trash2, X, Check,
  Users, Download, FileText, Mic, MicOff, Camera, Reply,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { useStore, ChatInfo, MessageInfo } from '@/lib/store'
import { t } from '@/lib/i18n'
import UserAvatar from './UserAvatar'

interface ChatViewProps {
  chat: ChatInfo
  onBack?: () => void
}

function getDateSeparator(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return lang === 'am' ? '\u12a8\u122b\u120b' : lang === 'ar' ? '\u0627\u0644\u064a\u0648\u0645' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? '\u1275\u1290\u12cb\u1235\u1275' : lang === 'ar' ? '\u0623\u0645\u0633' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

const LIMIT = 40

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageInfo | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgCountRef = useRef<number>(0)

  const isDM = chat.type === 'DIRECT' || chat.type === 'DM'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)

  useEffect(() => {
    let cancelled = false
    const fetchMsgs = async () => {
      try {
        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)
        if (r.ok && !cancelled) {
          const d = await r.json()
          setMessages(d)
          lastMsgCountRef.current = d.length
        }
      } catch {}
    }
    fetchMsgs()
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)
        if (r.ok && !cancelled) {
          const d = await r.json()
          if (d.length !== lastMsgCountRef.current) {
            setMessages(d)
            lastMsgCountRef.current = d.length
          }
        }
      } catch {}
    }, 4000)
    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, [chat.id, setMessages])

  const scrollToBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])
  useEffect(() => { scrollToBottom() }, [chatMessages.length, scrollToBottom])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !user || sending) return
    setSending(true)
    try {
      let finalContent = text
      if (replyTo) {
        finalContent = '\u200b[' + replyTo.sender.displayName + ']: ' + replyTo.content.substring(0, 80) + '\n' + text
      }
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: 'TEXT', content: finalContent }),
      })
      if (res.ok) {
        const msg = await res.json()
        addMessage(msg)
        setInput('')
        setReplyTo(null)
        scrollToBottom()
        const r2 = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)
        if (r2.ok) { const d = await r2.json(); setMessages(d); lastMsgCountRef.current = d.length }
      }
    } finally { setSending(false) }
  }

  const uploadAndSend = async (file: File, type: string) => {
    if (!user) return
    setSending(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const up = await fetch('/api/chat-upload', { method: 'POST', body: form })
      if (!up.ok) return
      const rj = await up.json()
      const url = rj.url || rj.imageUrl
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type, content: file.name, mediaUrl: url }),
      })
      if (res.ok) { const msg = await res.json(); addMessage(msg); scrollToBottom() }
    } finally { setSending(false) }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { uploadAndSend(file, 'IMAGE'); e.target.value = '' }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { uploadAndSend(file, 'FILE'); e.target.value = '' }
  }

  const handleVoiceRecord = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (!user || blob.size === 0) return
        setSending(true)
        try {
          const form = new FormData()
          form.append('file', blob, 'voice.webm')
          const up = await fetch('/api/chat-upload', { method: 'POST', body: form })
          if (!up.ok) return
          const rj = await up.json()
          const url = rj.url || rj.imageUrl
          const res = await fetch('/api/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: 'VOICE', content: '[Voice]', mediaUrl: url }),
          })
          if (res.ok) { const msg = await res.json(); addMessage(msg); scrollToBottom() }
        } finally { setSending(false) }
      }
      recorder.start()
      setIsRecording(true)
    } catch {}
  }

  const handleDownload = (msg: MessageInfo) => {
    if (!msg.mediaUrl) return
    const a = document.createElement('a')
    a.href = msg.mediaUrl; a.download = msg.content || 'download'
    a.target = '_blank'; a.rel = 'noopener noreferrer'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleReply = (msg: MessageInfo) => {
    setReplyTo(msg)
    setEditingId(null)
  }

  const handleEdit = (msg: MessageInfo) => { setEditingId(msg.id); setEditText(msg.content); setReplyTo(null) }

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

  const handleDelete = async (msgId: string) => {
    const res = await fetch('/api/messages?messageId=' + msgId, { method: 'DELETE' })
    if (res.ok) {
      const updated = await res.json()
      setMessages(messages.map((m) => m.id === msgId ? { ...m, content: '', type: 'DELETED', mediaUrl: null } : m))
    }
  }

  const chatName = isDM ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name : chat.name

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // Check if message content starts with a reply quote
  const isReplyMsg = (content: string) => content.startsWith('\u200b[')

  const getReplyParts = (content: string) => {
    if (!isReplyMsg(content)) return null
    const idx = content.indexOf('\n')
    if (idx === -1) return null
    return { quote: content.substring(0, idx), text: content.substring(idx + 1) }
  }

  const groups: { date: string; messages: MessageInfo[] }[] = []
  let lastDate = ''
  for (const msg of chatMessages) {
    const sep = getDateSeparator(msg.createdAt, language)
    if (sep !== lastDate) { groups.push({ date: sep, messages: [msg] }); lastDate = sep }
    else { groups[groups.length - 1].messages.push(msg) }
  }

  const showSend = input.trim() || sending

  return (
    <div className="flex flex-col h-full">
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}
        {groups.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground font-medium px-2">{group.date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {group.messages.map((msg) => {
              const isOwn = msg.senderId === user?.id
              const isEditing = editingId === msg.id
              const replyParts = msg.type === 'TEXT' ? getReplyParts(msg.content) : null
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={'flex gap-2 mb-2 ' + (isOwn ? 'flex-row-reverse' : '')}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <UserAvatar user={msg.sender} size="sm" />
                  <div className={'max-w-[75%] flex flex-col ' + (isOwn ? 'items-end' : 'items-start')}>
                    {!isDM && !isOwn && (
                      <span className="text-[11px] text-muted-foreground ml-1 mb-0.5">{msg.sender.displayName}</span>
                    )}
                    <div className="relative group">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input ref={editRef} value={editText} onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText('') } }}
                            className="glass-input px-3 py-2 text-sm w-56" />
                          <button onClick={handleSaveEdit} className="btn-icon-glass p-2"><Check className="w-3.5 h-3.5 text-green-400" /></button>
                          <button onClick={() => { setEditingId(null); setEditText('') }} className="btn-icon-glass p-2"><X className="w-3.5 h-3.5 text-destructive" /></button>
                        </div>
                      ) : (
                        <div
                          className={'px-3.5 py-2 rounded-2xl text-sm leading-relaxed cursor-pointer ' + (isOwn ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md' : 'glass-card rounded-tl-md')}
                          onContextMenu={(e) => { e.preventDefault(); handleReply(msg) }}
                        >
                          {msg.type === 'DELETED' ? (
                            <span className="italic opacity-50 text-xs">Message deleted</span>
                          ) : (
                            <>
                          {replyParts && (
                            <div className={'border-l-2 pl-2 mb-1 py-0.5 text-[11px] opacity-70 ' + (isOwn ? 'border-white/50' : 'border-amber-400/50')}>
                              <span className="font-semibold">{replyParts.quote}</span>
                            </div>
                          )}
                          {msg.type === 'IMAGE' && msg.mediaUrl && (
                            <img src={msg.mediaUrl} alt={msg.content} className="rounded-lg max-w-full max-h-64 object-cover mb-1 cursor-pointer" onClick={() => handleDownload(msg)} />
                          )}
                          {msg.type === 'FILE' && msg.mediaUrl && (
                            <button onClick={() => handleDownload(msg)} className="flex items-center gap-2 text-amber-300 hover:text-amber-200 mb-1">
                              <FileText className="w-4 h-4" />
                              <span className="underline text-xs truncate max-w-[200px]">{msg.content}</span>
                              <Download className="w-3 h-3 flex-shrink-0" />
                            </button>
                          )}
                          {msg.type === 'VOICE' && msg.mediaUrl && (
                            <audio controls className="max-w-[240px] h-8 mb-1" preload="none"><source src={msg.mediaUrl} type="audio/webm" /></audio>
                          )}
                          {msg.type === 'TEXT' && <span>{replyParts ? replyParts.text : msg.content}</span>}
                          {msg.type !== 'TEXT' && msg.type !== 'FILE' && <span>{msg.content}</span>}
                          </>
                          )}
                        </div>
                      )}
                      {!isEditing && hoveredId === msg.id && (
                        <div className={'absolute ' + (isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full') + ' top-1/2 -translate-y-1/2 flex items-center gap-0.5 ml-1 mr-1'}>
                          <button onClick={() => handleReply(msg)} className="btn-icon-glass p-1.5" title="Reply"><Reply className="w-3 h-3" /></button>
                          {isOwn && <button onClick={() => handleEdit(msg)} className="btn-icon-glass p-1.5"><Pencil className="w-3 h-3" /></button>}
                          {isOwn && <button onClick={() => handleDelete(msg.id)} className="btn-icon-glass p-1.5"><Trash2 className="w-3 h-3 text-destructive" /></button>}
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
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 glass-header border-t border-amber-500/30">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 truncate">Replying to {replyTo.sender.displayName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{replyTo.content.substring(0, 60)}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="btn-icon-glass p-1.5"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Input area */}
      <div className="glass-header px-3 py-3 flex items-center gap-2 flex-shrink-0 safe-area-bottom">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
        <button onClick={() => fileRef.current?.click()} className="btn-icon-glass p-2.5 flex-shrink-0" title="Attach file">
          <Paperclip className="w-5 h-5" />
        </button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
          placeholder={t(language, 'chat.typeMessage') || 'Type a message...'}
          className="glass-input flex-1 px-4 py-2.5 text-sm" disabled={sending} />
        {showSend ? (
          <button onClick={handleSend} disabled={sending} className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => imageRef.current?.click()} className="btn-icon-glass p-2.5" title="Gallery">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button onClick={() => cameraRef.current?.click()} className="btn-icon-glass p-2.5" title="Camera">
              <Camera className="w-5 h-5" />
            </button>
            <button onClick={handleVoiceRecord} className={'p-2.5 rounded-full transition-colors ' + (isRecording ? 'bg-red-500/30 text-red-400' : 'btn-icon-glass')} title={isRecording ? 'Stop' : 'Voice'}>
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
