#!/usr/bin/env python3
"""v5 Fix 5: Store - add replyToId to MessageInfo type"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/lib/store.ts')

with open(FILE, 'r') as f:
    c = f.read()

# Add replyToId to MessageInfo interface if not present
if 'replyToId' not in c:
    # Find the MessageInfo interface and add replyToId
    old = 'mediaUrl?: string | null\n  createdAt'
    if old in c:
        c = c.replace(old, 'mediaUrl?: string | null\n  replyToId?: string | null\n  createdAt')
        print('  OK Store: added replyToId to MessageInfo')
    else:
        print('  SKIP Store: MessageInfo pattern not found')
else:
    print('  SKIP Store: replyToId already exists')

with open(FILE, 'w') as f:
    f.write(c)