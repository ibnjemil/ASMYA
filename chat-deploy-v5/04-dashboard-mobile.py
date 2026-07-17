#!/usr/bin/env python3
"""v5 Fix 4: Dashboard.tsx - proper mobile layout for chat view"""
import os, re

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/components/mesjid/Dashboard.tsx')

with open(FILE, 'r') as f:
    c = f.read()

# Fix 1: Main element - use overflow-hidden + remove pb-24 when chat is active
# Use regex since the exact class string might vary
old_main_pattern = r'<main className="flex-1 overflow-y-auto pb-24">'
if re.search(old_main_pattern, c):
    c = re.sub(
        old_main_pattern,
        '<main className={`flex-1 ${currentView === \'chat\' ? \'overflow-hidden pb-0\' : \'overflow-y-auto pb-24\'}`}>',
        c
    )
    print('  OK Dashboard: main element now uses overflow-hidden for chat, removed pb-24')
else:
    # Check if v3 already patched it
    if 'overflow-hidden' in c and 'currentView' in c and 'chat' in c:
        # Update the v3 patch to also remove pb-24
        old = "${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}"
        if old in c:
            c = c.replace(old, "${currentView === 'chat' ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-24'}")
            print('  OK Dashboard: updated existing patch to remove pb-24 for chat')
        else:
            print('  SKIP Dashboard: chat overflow already handled')
    else:
        print('  SKIP Dashboard: pattern not found')

# Fix 2: Motion div - add overflow-hidden to prevent content overflow
old_motion = 'className="h-full"'
# Be specific to avoid replacing other h-full usages
if 'className="h-full"' in c:
    # Only replace the one inside AnimatePresence (near renderView)
    old = '<motion.div\n            key={currentView}\n            initial={{ opacity: 0, y: 6 }}\n            animate={{ opacity: 1, y: 0 }}\n            exit={{ opacity: 0, y: -6 }}\n            transition={{ duration: 0.2 }}\n            className="h-full"'
    if old in c:
        c = c.replace(old, old.replace('className="h-full"', 'className="h-full overflow-hidden"'))
        print('  OK Dashboard: added overflow-hidden to motion div')
    else:
        print('  SKIP Dashboard motion div (pattern not found)')
else:
    print('  SKIP Dashboard motion div (h-full not found)')

with open(FILE, 'w') as f:
    f.write(c)