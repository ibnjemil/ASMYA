"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Send, Mic, Paperclip, X, Check, Users, Download, Play, Square, Trash2, Reply, Copy } from "lucide-react"
import UserAvatar from "./UserAvatar"

function getDateSep(ds: string, lang: string): string {
  const d = new Date(ds), now = new Date(), day = 86400000
  const diff = now.getTime() - d.getTime()
  if (diff < day && d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) return lang === "so" ? "Maanta" : "Today"
  const y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.getDate() === y.getDate() && d.getMonth() === y.getMonth()) return lang === "so" ? "Shalay" : "Yesterday"
  return d.toLocaleDateString(lang === "so" ? "so-SO" : "en-US", { month: "long", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined })
}
function fmtTime(ds: string): string { return new Date(ds).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
function fmtDur(s: number): string { return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0") }

interface Msg { id: string; chatId: string; senderId: string; type: string; content: string; mediaUrl: string | null; createdAt: string; sender: { id: string; displayName: string; avatarUrl: string | null } }
interface Props { chat: any; user: any; language: string; onBack?: () => void; t?: (l: string, k: string) => string }

const LIMIT = 30

export default function ChatView({ chat, user, language, onBack, t: tFn }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; msg: Msg } | null>(null)
  const [delDlg, setDelDlg] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [uploadProg, setUploadProg] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isDM = !chat.isGroup
  const chatName = isDM ? (chat.members||[]).find((m: any) => m.id !== user?.id)?.displayName ?? chat.name : chat.name
  const tr = (k: string) => tFn?.(language, k) || k

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [msgs.length])

  useEffect(() => {
    setMsgs([]); setHasMore(true)
    ;(async () => {
      try {
        const r = await fetch("/api/messages?chatId=" + chat.id + "&limit=" + LIMIT)
        if (r.ok) { const d: Msg[] = await r.json(); setMsgs(d); setHasMore(d.length === LIMIT) }
      } catch(e) { console.error(e) }
    })()
  }, [chat.id])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !msgs[0]) return
    setLoadingMore(true)
    try {
      const r = await fetch("/api/messages?chatId=" + chat.id + "&limit=" + LIMIT + "&before=" + msgs[0].createdAt)
      if (r.ok) {
        const d: Msg[] = await r.json()
        const ids = new Set(msgs.map(m => m.id))
        const u = d.filter(m => !ids.has(m.id))
        setMsgs([...u, ...msgs])
        setHasMore(d.length === LIMIT)
      }
    } catch(e) { console.error(e) } finally { setLoadingMore(false) }
  }, [loadingMore, hasMore, chat.id, msgs])

  const handleSend = async () => {
    const txt = input.trim()
    if (!txt && !voiceBlob) return
    setSending(true)
    try {
      if (voiceBlob) {
        setUploadProg("voice...")
        const fd = new FormData(); fd.append("file", voiceBlob, "voice.webm")
        const ur = await fetch("/api/upload-chat-media", { method: "POST", body: fd })
        if (ur.ok) {
          const { url } = await ur.json()
          const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: "VOICE", content: "Voice message", mediaUrl: url }) })
          if (r.ok) { const m: Msg = await r.json(); setMsgs(p => [...p, m]) }
        }
        setVoiceBlob(null)
      }
      if (txt) {
        const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: "TEXT", content: txt }) })
        if (r.ok) { const m: Msg = await r.json(); setMsgs(p => [...p, m]) }
      }
      setInput(""); setReplyTo(null)
    } catch(e) { console.error(e) } finally { setSending(false); setUploadProg(null) }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    for (const file of Array.from(e.target.files)) {
      setUploadProg(file.name)
      try {
        const fd = new FormData(); fd.append("file", file)
        const ur = await fetch("/api/upload-chat-media", { method: "POST", body: fd })
        if (ur.ok) {
          const { url } = await ur.json()
          const tp = file.type.startsWith("image/") ? "IMAGE" : file.type.startsWith("video/") ? "VIDEO" : file.type.startsWith("audio/") ? "VOICE" : "FILE"
          const r = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId: chat.id, senderId: user.id, type: tp, content: file.name, mediaUrl: url }) })
          if (r.ok) { const m: Msg = await r.json(); setMsgs(p => [...p, m]) }
        }
      } catch(e) { console.error(e) }
    }
    setUploadProg(null); e.target.value = ""
  }

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream); chunksRef.current = []
      rec.ondataavailable = (e) => chunksRef.current.push(e.data)
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); if (chunksRef.current.length) setVoiceBlob(new Blob(chunksRef.current, { type: "audio/webm" })) }
      rec.start(); recRef.current = rec; setRecording(true); setRecTime(0)
      timerRef.current = setInterval(() => setRecTime(d => d + 1), 1000)
    } catch(e) { console.error(e) }
  }
  const stopRec = () => { recRef.current?.stop(); setRecording(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  const handleDel = async (msgId: string, forEveryone: boolean) => {
    if (forEveryone) {
      try {
        await fetch("/api/messages?messageId=" + msgId + "&forEveryone=true", { method: "DELETE" })
        setMsgs(p => p.filter(m => m.id !== msgId))
      } catch(e) { console.error(e) }
    } else {
      setMsgs(p => p.filter(m => m.id !== msgId))
    }
    setDelDlg(null); setCtxMenu(null)
  }

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const groups: { date: string; msgs: Msg[] }[] = []
  let ld = ""
  for (const m of msgs) { const s = getDateSep(m.createdAt, language); if (s !== ld) { groups.push({ date: s, msgs: [m] }); ld = s } else groups[groups.length-1].msgs.push(m) }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0e1621]">
      <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-2 border-b border-white/10 bg-[#17212b] z-20">
        {onBack && <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5 text-white" /></button>}
        <UserAvatar user={isDM ? ((chat.members||[]).find((m:any)=>m.id!==user?.id)||(chat.members||[])[0]) : { displayName: chat.name, avatarUrl: null }} size="sm" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-white truncate">{chatName}</h2>
          <div className="flex items-center gap-1 text-[11px] text-gray-400"><Users className="w-3 h-3" /><span>{(chat.members||[]).length}</span></div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2" onScroll={(e)=>{ if((e.target as HTMLDivElement).scrollTop<100) loadMore() }}>
        {loadingMore && <div className="text-center text-gray-500 text-xs py-2">Loading...</div>}
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="flex justify-center my-3"><span className="text-[11px] text-gray-400 bg-[#17212b]/80 px-3 py-1 rounded-full">{g.date}</span></div>
            {g.msgs.map((msg) => {
              const mine = msg.senderId === user?.id
              return (
                <motion.div key={msg.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className={"flex mb-0.5 " + (mine?"justify-end":"justify-start")}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, msg }) }}>
                  <div className={"relative max-w-[80%] rounded-lg px-2.5 py-1.5 group " + (mine ? "bg-[#2b5278] text-white rounded-br-sm" : "bg-[#182533] text-white rounded-bl-sm")}>
                    {msg.type === "TEXT" && <p className="text-[13px] whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>}
                    {msg.type === "IMAGE" && msg.mediaUrl && (
                      <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setLightbox(msg.mediaUrl!) }}>
                        <img src={msg.mediaUrl} alt="" className="max-w-full max-h-80 rounded" loading="lazy" />
                      </div>
                    )}
                    {msg.type === "VIDEO" && msg.mediaUrl && <video src={msg.mediaUrl} controls className="max-w-full max-h-80 rounded" />}
                    {msg.type === "VOICE" && msg.mediaUrl && (
                      <div className="flex items-center gap-2 min-w-[150px] py-1">
                        <button onClick={() => { const a = new Audio(msg.mediaUrl!); a.play() }} className="p-1 hover:bg-white/10 rounded-full"><Play className="w-4 h-4 text-white" /></button>
                        <div className="flex-1 h-0.5 bg-white/20 rounded overflow-hidden"><div className="h-full bg-[#419fd9] rounded w-1/3" /></div>
                      </div>
                    )}
                    {msg.type === "FILE" && msg.mediaUrl && (
                      <button className="flex items-center gap-2 py-1" onClick={(e) => { e.stopPropagation(); window.open(msg.mediaUrl!, "_blank") }}>
                        <Download className="w-4 h-4 text-[#419fd9]" />
                        <span className="text-[13px] text-[#419fd9] underline break-all">{msg.content}</span>
                      </button>
                    )}
                    <div className={"text-[10px] mt-0.5 text-right " + (mine ? "text-blue-200/50" : "text-gray-500")}>{fmtTime(msg.createdAt)}</div>
                    {mine && <button className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setDelDlg(msg.id) }}><Trash2 className="w-3 h-3 text-white" /></button>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <AnimatePresence>
        {recording && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 bg-[#17212b] border-t border-white/10 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-white font-mono">{fmtDur(recTime)}</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full animate-pulse" style={{width:"60%"}} /></div>
              <button onClick={stopRec} className="p-2.5 rounded-full bg-[#419fd9] hover:bg-[#419fd9]/80"><Check className="w-5 h-5 text-white" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!recording && (
        <div className="flex-shrink-0 px-2 py-2 bg-[#17212b] border-t border-white/10 flex items-center gap-1.5 relative">
          <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-full flex-shrink-0 hover:bg-white/10 text-gray-400 transition-colors"><Paperclip className="w-5 h-5" /></button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
            placeholder={tr("chat.typeMessage") || "Type a message..."}
            className="flex-1 px-3 py-2 text-sm text-white bg-[#242f3d] rounded-xl outline-none border border-transparent focus:border-[#419fd9]/50 placeholder-gray-500 min-w-0"
            disabled={sending} />
          {input.trim() || voiceBlob ? (
            <button onClick={handleSend} disabled={sending} className="p-2.5 rounded-full flex-shrink-0 bg-[#419fd9] text-white hover:bg-[#3b8bc4] transition-colors disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={startRec} className="p-2.5 rounded-full flex-shrink-0 hover:bg-white/10 text-gray-400 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          )}
          {replyTo && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-[#0e1621] border-l-2 border-[#419fd9] rounded px-3 py-1.5 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[#419fd9] text-xs font-medium">{replyTo.sender?.displayName||"Unknown"}</span>
                <p className="text-gray-400 text-xs truncate">{replyTo.type==="TEXT"?replyTo.content:replyTo.type}</p>
              </div>
              <button onClick={()=>setReplyTo(null)} className="p-0.5 hover:bg-white/10 rounded"><X className="w-3.5 h-3.5 text-gray-400" /></button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {uploadProg && (
          <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="flex-shrink-0 overflow-hidden">
            <div className="px-4 py-2 bg-[#17212b] border-t border-white/10 flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#419fd9] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Sending {uploadProg}...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {ctxMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setCtxMenu(null)}>
          <div className="absolute bg-[#2b5278] rounded-xl shadow-2xl py-1 min-w-[180px] z-50"
            style={{ top: Math.min(ctxMenu.y, typeof window!=="undefined"?window.innerHeight-250:600), left: Math.min(ctxMenu.x, typeof window!=="undefined"?window.innerWidth-200:400) }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setReplyTo(ctxMenu.msg); setCtxMenu(null) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10"><Reply className="w-4 h-4" /> Reply</button>
            {ctxMenu.msg.type === "TEXT" && <button onClick={() => { navigator.clipboard.writeText(ctxMenu.msg.content); setCtxMenu(null) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-white hover:bg-white/10"><Copy className="w-4 h-4" /> Copy</button>}
            <button onClick={() => { setDelDlg(ctxMenu.msg.id); setCtxMenu(null) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-white/10"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {delDlg && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDelDlg(null)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-[#2b5278] rounded-2xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-white font-semibold text-base mb-4">Delete Message</h3>
              <div className="space-y-2">
                <button onClick={() => handleDel(delDlg, true)} className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left px-4">Delete for everyone</button>
                <button onClick={() => handleDel(delDlg, false)} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors text-left px-4">Delete for me</button>
                <button onClick={() => setDelDlg(null)} className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-white/5 transition-colors text-center">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 z-10" onClick={() => setLightbox(null)}><X className="w-5 h-5 text-white" /></button>
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
