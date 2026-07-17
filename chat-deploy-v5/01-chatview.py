#!/usr/bin/env python3
"""v5 Fix 1: ChatView - reply fallback, file overflow, delete for all types, lazy load, file open"""
import os, re

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/ChatView.tsx')

with open(FILE, 'r') as f:
    c = f.read()

fixes = 0

# ── 1a: Add replyToId to FullMessage interface ──
old = 'interface FullMessage extends MessageInfo {\n  replyTo?'
if old in c:
    c = c.replace(old, 'interface FullMessage extends MessageInfo {\n  replyToId?: string | null\n  replyTo?')
    print('  OK Added replyToId to FullMessage'); fixes += 1
else:
    print('  SKIP replyToId (not found)')

# ── 1b: Add getReplyData helper before getReplyPreview ──
old = "  const getReplyPreview = (msg: FullMessage): string => {\n    if (!msg) return ''\n    if (msg.type === 'IMAGE') return 'Photo'"
if old in c:
    new = """  // Look up reply data: prefer API replyTo, fallback to local messages
  const getReplyData = (msg: FullMessage): { id: string; content: string; type: string; sender: { id: string; displayName: string } } | null => {
    if (msg.replyTo) return msg.replyTo
    if (msg.replyToId) {
      const found = chatMessages.find((m: FullMessage) => m.id === msg.replyToId)
      if (found) return { id: found.id, content: found.content, type: found.type, sender: { id: found.sender.id, displayName: found.sender.displayName } }
    }
    return null
  }

  const getReplyPreview = (msg: { type: string; content: string }): string => {
    if (!msg) return ''
    if (msg.type === 'IMAGE') return '\U0001f4f7 Photo'"""
    c = c.replace(old, new)
    print('  OK Added getReplyData helper'); fixes += 1
else:
    print('  SKIP getReplyData (pattern not found)')

# ── 1c: Fix reply preview JSX to use getReplyData ──
old = """{msg.replyTo && (
                            <div className={`text-[11px] px-2.5 py-1.5 mb-1.5 rounded-lg border-l-2 ${
                              isOwn ? 'bg-white/10 border-white/40' : 'bg-[#419fd9]/10 border-[#419fd9]/40'
                            }`}>
                              <span className="font-semibold">{msg.replyTo.sender.displayName}</span>
                              <p className="truncate opacity-70 mt-0.5">{getReplyPreview(msg.replyTo as unknown as FullMessage)}</p>
                            </div>
                          )}"""
if old in c:
    new = """{(() => { const rd = getReplyData(msg); if (!rd) return null; return (
                            <div className={`text-[11px] px-2.5 py-1.5 mb-1.5 rounded-lg border-l-2 overflow-hidden ${
                              isOwn ? 'bg-white/10 border-white/40' : 'bg-[#419fd9]/10 border-[#419fd9]/40'
                            }`}>
                              <span className="font-semibold truncate block max-w-full">{rd.sender.displayName}</span>
                              <p className="truncate opacity-70 mt-0.5">{getReplyPreview(rd)}</p>
                            </div>
                          ) })()}"""
    c = c.replace(old, new)
    print('  OK Fixed reply preview with getReplyData fallback'); fixes += 1
else:
    print('  SKIP reply JSX (pattern not found)')

# ── 1d: Add overflow-hidden to message bubble ──
old = "className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed\n"
if old in c:
    c = c.replace(old, "className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed overflow-hidden\n")
    print('  OK Added overflow-hidden to bubble'); fixes += 1
else:
    print('  SKIP bubble overflow (pattern not found)')

# ── 1e: Fix file row overflow for mobile ──
old = """{isFile && msg.mediaUrl && (
                            <div className="flex items-center gap-2 mb-1 p-1">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{msg.content}</p></div>"""
if old in c:
    new = """{isFile && msg.mediaUrl && (
                            <div className="flex items-center gap-2 mb-1 p-1 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 overflow-hidden"><p className="text-xs font-medium truncate max-w-full" style={{wordBreak:'break-all'}}>{msg.content}</p></div>"""
    c = c.replace(old, new)
    print('  OK Fixed file name overflow'); fixes += 1
else:
    print('  SKIP file overflow (pattern not found)')

# ── 1f: Change handleDownload to open in new tab (like TG) ──
old = """  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
  }"""
if old in c:
    new = """  const handleDownload = (url: string, _filename?: string) => {
    window.open(url, '_blank')
  }"""
    c = c.replace(old, new)
    print('  OK Changed file download to open in new tab'); fixes += 1
else:
    print('  SKIP handleDownload (pattern not found)')

# ── 1g: Fix delete dialog - show Delete for everyone (hover button) ──
old = 'setDeleteDialog({ msgId: msg.id, forOwn: false })\n                              className="btn-icon-glass p-1.5" title="Delete"><Trash2'
if old in c:
    c = c.replace(old, 'setDeleteDialog({ msgId: msg.id, forOwn: true })\n                              className="btn-icon-glass p-1.5" title="Delete"><Trash2')
    print('  OK Fixed hover delete to show for-everyone'); fixes += 1
else:
    print('  SKIP hover delete (pattern not found)')

# ── 1h: Fix delete dialog - show Delete for everyone (context menu) ──
old = 'setDeleteDialog({ msgId: contextMenu.msg.id, forOwn: false })\n                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/10 text-destructive"'
if old in c:
    c = c.replace(old, 'setDeleteDialog({ msgId: contextMenu.msg.id, forOwn: true })\n                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/10 text-destructive"')
    print('  OK Fixed context delete to show for-everyone'); fixes += 1
else:
    print('  SKIP context delete (pattern not found)')

# ── 1i: Remove forOwn gate - always show Delete for everyone ──
old = """{deleteDialog.forOwn && (
                  <button
                    onClick={() => handleDelete(deleteDialog.msgId, true)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-left px-4">
                    Delete for everyone
                  </button>
                )}"""
if old in c:
    new = """<button
                  onClick={() => handleDelete(deleteDialog.msgId, true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left px-4">
                  Delete for everyone
                </button>"""
    c = c.replace(old, new)
    print('  OK Delete for everyone now always shows'); fixes += 1
else:
    print('  SKIP delete dialog gate (pattern not found)')

# ── 1j: Add lazy loading states after deleteDialog state ──
old = "const [deleteDialog, setDeleteDialog] = useState<{ msgId: string; forOwn: boolean } | null>(null)"
if old in c:
    c = c.replace(old, old + "\n  const [loadingMore, setLoadingMore] = useState(false)\n  const [hasMore, setHasMore] = useState(true)")
    print('  OK Added lazy loading states'); fixes += 1
else:
    print('  SKIP lazy loading states (pattern not found)')

# ── 1k: Add loadMoreMessages + handleScroll after handleDownload ──
# Find the closing of handleDownload function
old = "  const onContextMenu = (e: React.MouseEvent, msg: FullMessage) => {"
if old in c and 'loadMoreMessages' not in c:
    new = """  // Lazy load: fetch older messages on scroll to top
  const loadMoreMessages = async () => {
    if (!chatMessages.length || loadingMore || !hasMore) return
    setLoadingMore(true)
    const oldest = chatMessages[0].createdAt
    try {
      const res = await fetch(\\`/api/messages?chatId=\\${chat.id}&limit=30&before=\\${oldest}\\`)
      if (res.ok) {
        const older = await res.json()
        if (older.length < 30) setHasMore(false)
        const existingIds = new Set(chatMessages.map((m: FullMessage) => m.id))
        const unique = older.filter((m: FullMessage) => !existingIds.has(m.id))
        setMessages([...unique, ...chatMessages])
      }
    } catch { /* silent */ }
    finally { setLoadingMore(false) }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop < 80 && hasMore && !loadingMore) {
      loadMoreMessages()
    }
  }

  """ + old
    c = c.replace(old, new)
    print('  OK Added loadMoreMessages + handleScroll'); fixes += 1
else:
    print('  SKIP loadMore (pattern not found or already added)')

# ── 1l: Add onScroll to messages container ──
old = 'className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 min-h-0"'
if old in c:
    c = c.replace(old, old + '\n            onScroll={handleScroll}')
    print('  OK Added onScroll to messages container'); fixes += 1
else:
    print('  SKIP onScroll (pattern not found)')

# ── 1m: Add loading indicator at top of messages ──
old = """{groups.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}"""
if old in c:
    new = """{loadingMore && (
          <div className="flex items-center justify-center py-3">
            <div className="w-4 h-4 border-2 border-[#419fd9] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground ml-2">Loading...</span>
          </div>
        )}
        {groups.length === 0 && !loadingMore && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t(language, 'chat.noMessages') || 'No messages yet'}
          </div>
        )}"""
    c = c.replace(old, new)
    print('  OK Added loading indicator at top'); fixes += 1
else:
    print('  SKIP loading indicator (pattern not found)')

# ── 1n: Add pb-16 to input area for bottom nav ──
old = 'className="flex-shrink-0 glass-header px-3 py-3 flex items-center gap-2 safe-area-bottom"'
if old in c:
    c = c.replace(old, 'className="flex-shrink-0 glass-header px-3 py-3 pb-20 flex items-center gap-2 safe-area-bottom"')
    print('  OK Added bottom padding for fixed nav'); fixes += 1
else:
    print('  SKIP input padding (pattern not found)')

# ── Write ──
with open(FILE, 'w') as f:
    f.write(c)

print(f'\n  Applied {fixes}/14 ChatView fixes')