#!/usr/bin/env python3
"""Fix 1: chats/route.ts - _lastMessage -> lastMessage + add lastMessage to response properly"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/app/api/chats/route.ts')

with open(FILE, 'r') as f:
    content = f.read()

# Fix _lastMessage -> lastMessage
content = content.replace('_lastMessage', 'lastMessage')

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Fixed {FILE}")