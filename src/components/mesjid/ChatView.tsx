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

interface ChatViewProps { chat: ChatInfo; onBack?: () => void }

interface PendingAttachment { type: string; dataUrl: string; name: string }

function getDateSeparator(dateStr: string, lang: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return lang === 'am' ? '\u12a8\u122b\u120b' : lang === 'ar' ? '\u0627\u0644\u064a\u0648\u0645' : 'Today'
  if (isYesterday(d)) return lang === 'am' ? '\u1275\u1290\u12cb\u1235\u1275' : lang === 'ar' ? '\u0623\u0645\u0633' : 'Yesterday'
  return format(d, 'MMM d, yyyy')
}

const LIMIT = 40

function stripQuotePrefix(content: string): string {
  if (content.startsWith('\u200b[')) {
    const idx = content.indexOf('\n')
    if (idx !== -1) return content.substring(idx + 1)
  }
  return content
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const { user, language, messages, addMessage, setMessages } = useStore()
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [replyTo, setReplyTo] = useState<MessageInfo | null>(null)
  const [pending, setPending] = useState<PendingAttachment | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgCountRef = useRef<number>(0)
  const lastMsgDateRef = useRef<string>('')

  const isDM = chat.type === 'DIRECT' || chat.type === 'DM'
  const chatMessages = messages.filter((m) => m.chatId === chat.id)
  const hasContent = input.trim() || pending || replyTo

  // Fetch + poll
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT)
        if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }
      } catch {}
    }
    load()
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/messages?chatId=' + chat.id + '&limit=' + LIMIT + '&after=' + lastMsgDateRef.current)
        if (r.ok && !cancelled) { const d = await r.json(); setMessages(d); lastMsgCountRef.current = d.length; if (d.length > 0) lastMsgDateRef.current = d[d.length - 1].createdAt }
      } catch {}
    }, 4000)
    return () => { cancelled = true; if (pollRef.current) clearInterval(pollRef.current) }
  }, [chat.id, setMessages])

  const scrollToBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [])
  useEffect(() => { scrollToBottom() }, [chatMessages.length, scrollToBottom])
  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  // Compress image via canvas
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 1024, maxH = 1024
        let w = img.width, h = img.height
        if (w > maxW) { h = h * maxW / w; w = maxW }
        if (h > maxH) { w = w * maxH / h; h = maxH }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject('no canvas'); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = () => reject('load failed')
      img.src = URL.createObjectURL(file)
    })
  }

  // Read file as base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject('read failed')
      reader.readAsDataURL(file)
    })
  }

  // Handle file selection - PIN, don't send
  const handleFileSelect = async (file: File, type: string) => {
    try {
      let dataUrl: string
      if (type === 'IMAGE') {
        dataUrl = await compressImage(file)
      } else {
        dataUrl = await fileToBase64(file)
      }
      setPending({ type, dataUrl, name: file.name })
      scrollToBottom()
    } catch (e) { console.error('File select error:', e) }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { handleFileSelect(file, 'IMAGE'); e.target.value = '' }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { handleFileSelect(file, 'FILE'); e.target.value = '' }
  }

  // Voice recording
  const handleVoiceToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size === 0) return
        const reader = new FileReader()
        reader.onload = () => {
          setPending({ type: 'VOICE', dataUrl: reader.result as string, name: 'Voice message' })
          scrollToBottom()
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setIsRecording(true)
    } catch (e) { console.error('Mic error:', e) }
  }

  // SEND - handles text, reply, and pending attachment
  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !pending) || !user || sending) return
    setSending(true)
    try {
      let msgType = 'TEXT'
      let msgContent = text
      let mediaUrl: string | null = null

      // Build reply prefix
      if (replyTo) {
        var quoteText = stripQuotePrefix(replyTo.content).substring(0, 80)
        msgContent = '\u200b[' + replyTo.sender.displayName + ']: ' + quoteText + '\n' + (text || '')
      }

      // Attach pending file
      if (pending) {
        msgType = pending.type
        mediaUrl = pending.dataUrl
        if (!text && !replyTo) msgContent = pending.name
        setPending(null)
      }

      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: msgType, content: msgContent, mediaUrl }),
      })
      if (res.ok) {
        const msg = await res.json()
        addMessage(msg)
        setInput('')
        setReplyTo(null)
        scrollToBottom()
      }
    } finally { setSending(false) }
  }

  const handleDownload = (msg: MessageInfo) => {
    if (!msg.mediaUrl) return
    const a = document.createElement('a')
    a.href = msg.mediaUrl; a.download = msg.content || 'download'
    a.target = '_blank'; a.rel = 'noopener noreferrer'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleReply = (msg: MessageInfo) => { setReplyTo(msg); setEditingId(null) }
  const handleEdit = (msg: MessageInfo) => { setEditingId(msg.id); setEditText(stripQuotePrefix(msg.content)); setReplyTo(null) }

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
      setMessages(messages.map((m) => m.id === msgId ? { ...m, content: '', type: 'DELETED', mediaUrl: null } : m))
    }
  }

  const chatName = isDM ? chat.members.find((m) => m.id !== user?.id)?.displayName ?? chat.name : chat.name

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const getReplyParts = (content: string) => {
    if (!content.startsWith('\u200b[')) return null
    const idx = content.indexOf('\n')
    if (idx === -1) return null
    return { quote: content.substring(0, idx), text: content.substring(idx + 1) }
  }

  // Group by date
  const groups: { date: string; messages: MessageInfo[] }[] = []
  let lastDate = ''
  for (const msg of chatMessages) {
    const sep = getDateSeparator(msg.createdAt, language)
    if (sep !== lastDate) { groups.push({ date: sep, messages: [msg] }); lastDate = sep }
    else { groups[groups.length - 1].messages.push(msg) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-header px-4 py-3 flex items-center gap-3 flex-shrink-0">
        {onBack && (
          <button onClick={onBack} className="btn-icon-glass p-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /><span>{chat.members.length}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
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
              const isDel = msg.type === 'DELETED'
              const replyParts = msg.type === 'TEXT' ? getReplyParts(msg.content) : null
              const displayContent = replyParts ? replyParts.text : msg.content
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={'flex gap-2 mb-2 ' + (isOwn ? 'flex-row-reverse' : '')}
                  onMouseEnter={() => setHoveredId(msg.id)} onMouseLeave={() => setHoveredId(null)}>
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
                        <div className={'px-3.5 py-2 rounded-2xl text-sm leading-relaxed ' + (isOwn ? 'bg-gradient-to-br from-amber-600/90 to-amber-700/90 text-white rounded-tr-md' : 'glass-card rounded-tl-md')}
                          onContextMenu={(e) => { e.preventDefault(); if (!isDel) handleReply(msg) }}>
                          {isDel ? (
                            <span className="italic opacity-50 text-xs">Message deleted</span>
                          ) : (<>
                            {replyParts && (
                              <div className={'border-l-2 pl-2 mb-1 py-0.5 text-[11px] opacity-70 ' + (isOwn ? 'border-white/50' : 'border-amber-400/50')}>
                                <span className="font-semibold">{replyParts.quote}</span>
                              </div>
                            )}
                            {msg.type === 'IMAGE' && msg.mediaUrl && (
                              <img src={msg.mediaUrl} alt="" className="rounded-lg max-w-full max-h-64 object-cover mb-1 cursor-pointer" onClick={() => handleDownload(msg)} />
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
                            {msg.type === 'TEXT' && displayContent && <span>{displayContent}</span>}
                          </>)}
                        </div>
                      )}
                      {!isEditing && !isDel && hoveredId === msg.id && (
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
        <div className="flex items-center gap-2 px-3 py-2 glass-header border-t border-amber-500/30 flex-shrink-0">
          <Reply className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 truncate">{replyTo.sender.displayName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{stripQuotePrefix(replyTo.content).substring(0, 60)}</div>
          </div>
          <button onClick={() => setReplyTo(null)} className="btn-icon-glass p-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Pending attachment preview (PIN) */}
      {pending && (
        <div className="flex items-center gap-2 px-3 py-2 glass-header border-t border-amber-500/30 flex-shrink-0">
          {pending.type === 'IMAGE' && (
            <img src={pending.dataUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
          )}
          {pending.type === 'FILE' && <FileText className="w-5 h-5 text-amber-400 flex-shrink-0" />}
          {pending.type === 'VOICE' && <Mic className="w-5 h-5 text-amber-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-amber-400 truncate">{pending.type === 'VOICE' ? 'Voice message' : pending.name}</div>
            <div className="text-[10px] text-muted-foreground">Ready to send - add caption below</div>
          </div>
          <button onClick={() => setPending(null)} className="btn-icon-glass p-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Input area */}
      <div className="glass-header px-3 py-3 flex items-center gap-2 flex-shrink-0 safe-area-bottom">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
        <button onClick={() => fileRef.current?.click()} className="btn-icon-glass p-2.5 flex-shrink-0" title="File"><Paperclip className="w-5 h-5" /></button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
          placeholder={replyTo ? 'Reply...' : pending ? 'Add a caption...' : (t(language, 'chat.typeMessage') || 'Type a message...')}
          className="glass-input flex-1 px-4 py-2.5 text-sm" disabled={sending} />
        {hasContent ? (
          <button onClick={handleSend} disabled={sending} className="btn-primary px-4 py-2.5 flex items-center gap-2 text-sm flex-shrink-0">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => imageRef.current?.click()} className="btn-icon-glass p-2.5" title="Gallery"><ImageIcon className="w-5 h-5" /></button>
            <button onClick={() => cameraRef.current?.click()} className="btn-icon-glass p-2.5" title="Camera"><Camera className="w-5 h-5" /></button>
            <button onClick={handleVoiceToggle} className={'p-2.5 rounded-full transition-colors ' + (isRecording ? 'bg-red-500/30 text-red-400' : 'btn-icon-glass')} title={isRecording ? 'Stop' : 'Voice'}>
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
