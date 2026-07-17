#!/usr/bin/env python3
"""Fix 1: Dashboard.tsx - make chat view fill viewport properly (sticky header/input fix)"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/Dashboard.tsx')

with open(FILE, 'r') as f:
    content = f.read()

# The problem: <main className="flex-1 overflow-y-auto pb-24"> causes the whole page to scroll
# including the chat header and input area on mobile.
# Fix: When currentView is 'chat', use overflow-hidden and let ChatDashboard handle its own scroll.
# For other views, keep overflow-y-auto.

old_main = '<main className="flex-1 overflow-y-auto pb-24">'
new_main = '<main className={`flex-1 pb-24 ${currentView === \'chat\' ? \'overflow-hidden\' : \'overflow-y-auto\'}`}>'

content = content.replace(old_main, new_main)

with open(FILE, 'w') as f:
    f.write(content)

print("OK Fixed Dashboard.tsx: chat view now uses overflow-hidden (sticky header/input)")