#!/usr/bin/env python3
"""ASMYA v6 - Fix all chat bugs: delete dialog, mobile layout, pagination, file open, reply fallback, overflow"""
import os, sys

BASE = '/workspaces/ASMYA'
fixes = 0

# ═══════════════════════════════════════════════════════════
# 1. ChatView.tsx - FULL REPLACEMENT
# ═══════════════════════════════════════════════════════════
CHATVIEW = os.path.join(BASE, 'src/components/mesjid/ChatView.tsx')
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ChatView.tsx'), 'r') as f:
    cv_content = f.read()
with open(CHATVIEW, 'w') as f:
    f.write(cv_content)
print(f'  OK ChatView.tsx written ({len(cv_content)} bytes)')
fixes += 1

# ═══════════════════════════════════════════════════════════
# 2. Messages API - FULL REPLACEMENT with pagination
# ═══════════════════════════════════════════════════════════
MSG_API = os.path.join(BASE, 'src/app/api/messages/route.ts')
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'messages-route.ts'), 'r') as f:
    msg_content = f.read()
with open(MSG_API, 'w') as f:
    f.write(msg_content)
print(f'  OK Messages API written ({len(msg_content)} bytes)')
fixes += 1

# ═══════════════════════════════════════════════════════════
# 3. ChatDashboard.tsx - FULL REPLACEMENT with limit=30
# ═══════════════════════════════════════════════════════════
CD_FILE = os.path.join(BASE, 'src/components/mesjid/ChatDashboard.tsx')
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ChatDashboard.tsx'), 'r') as f:
    cd_content = f.read()
with open(CD_FILE, 'w') as f:
    f.write(cd_content)
print(f'  OK ChatDashboard.tsx written ({len(cd_content)} bytes)')
fixes += 1

# ═══════════════════════════════════════════════════════════
# 4. Dashboard.tsx - PATCH main + motion div for chat
# ═══════════════════════════════════════════════════════════
DASH_FILE = os.path.join(BASE, 'src/components/mesjid/Dashboard.tsx')
with open(DASH_FILE, 'r') as f:
    dc = f.read()

# Fix main element: chat gets overflow-hidden, no pb-24; others keep pb-24
old_main = '<main className="flex-1 overflow-y-auto pb-24">'
if old_main in dc:
    dc = dc.replace(old_main, '<main className={`flex-1 ${currentView === \'chat\' ? \'overflow-hidden\' : \'overflow-y-auto pb-24\'}`}>')
    print('  OK Dashboard: main element chat-aware overflow')
    fixes += 1
else:
    # Check if already patched
    if 'currentView === \'chat\'' in dc and 'overflow-hidden' in dc:
        # Ensure the pattern has pb-24 for non-chat
        old = "${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}"
        new = "${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto pb-24'}"
        if old in dc:
            dc = dc.replace(old, new)
            print('  OK Dashboard: updated existing patch with pb-24')
            fixes += 1
        else:
            print('  SKIP Dashboard main: already patched')
    else:
        print('  SKIP Dashboard main: pattern not found')

# Fix motion div: add overflow-hidden for chat
old_motion = '''<motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="h-full"'''
if old_motion in dc:
    dc = dc.replace(old_motion, '''<motion.div
            key={currentView}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`h-full ${currentView === 'chat' ? 'overflow-hidden' : ''}`}`)
    print('  OK Dashboard: motion div chat-aware overflow')
    fixes += 1
else:
    print('  SKIP Dashboard motion div: already patched or pattern not found')

# Fix socket: when receiving new message in current chat, only append not refetch all
old_socket = '''socket.on('message:new', (data: { chatId: string }) => {
      const chat = useStore.getState().currentChat
      if (data.chatId === chat?.id) {
        fetch(`/api/messages?chatId=${data.chatId}`)
          .then((r) => r.json())
          .then((msgs) => useStore.getState().setMessages(msgs))
          .catch(() => {})
      }'''
if old_socket in dc:
    dc = dc.replace(old_socket, '''socket.on('message:new', (data: { chatId: string }) => {
      const chat = useStore.getState().currentChat
      if (data.chatId === chat?.id) {
        // Just refresh chat list, don't refetch all messages
      }''')
    print('  OK Dashboard: socket no longer refetches all messages on new')
    fixes += 1

with open(DASH_FILE, 'w') as f:
    f.write(dc)

# ═══════════════════════════════════════════════════════════
# 5. Store - add replyToId to MessageInfo
# ═══════════════════════════════════════════════════════════
STORE_FILE = os.path.join(BASE, 'src/lib/store.ts')
with open(STORE_FILE, 'r') as f:
    sc = f.read()
if 'replyToId' not in sc:
    old = 'mediaUrl?: string | null\n  createdAt'
    if old in sc:
        sc = sc.replace(old, 'mediaUrl?: string | null\n  replyToId?: string | null\n  createdAt')
        with open(STORE_FILE, 'w') as f:
            f.write(sc)
        print('  OK Store: added replyToId to MessageInfo')
        fixes += 1
    else:
        print('  SKIP Store: pattern not found')
else:
    print('  SKIP Store: replyToId already exists')

print(f'\n  Total: {fixes} fixes applied')
if fixes >= 4:
    print('  Run: cd /workspaces/ASMYA && git add -A && git commit -m "fix: v6 chat - all bugs" && git push')
else:
    print('  WARNING: Some fixes may not have applied. Check output above.')
    sys.exit(1)