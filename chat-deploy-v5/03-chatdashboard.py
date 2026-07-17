#!/usr/bin/env python3
"""v5 Fix 3: ChatDashboard - h-full instead of calc, limit=30 initial fetch"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/ChatDashboard.tsx')

with open(FILE, 'r') as f:
    c = f.read()

# Fix 1: Change calc height to h-full
old = 'className="flex h-[calc(100dvh-3.5rem-4rem)]"'
if old in c:
    c = c.replace(old, 'className="flex h-full"')
    print('  OK ChatDashboard: changed calc to h-full')
else:
    print('  SKIP ChatDashboard height (pattern not found)')

# Fix 2: Add limit=30 to initial fetch
old = 'fetch(`/api/messages?chatId=${chat.id}`)'
if old in c:
    c = c.replace(old, 'fetch(`/api/messages?chatId=${chat.id}&limit=30`)')
    print('  OK ChatDashboard: initial fetch now uses limit=30')
else:
    print('  SKIP ChatDashboard fetch limit (pattern not found)')

with open(FILE, 'w') as f:
    f.write(c)