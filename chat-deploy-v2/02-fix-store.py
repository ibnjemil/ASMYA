#!/usr/bin/env python3
"""Fix 2: store.ts - add unreadCounts, incrementUnread, clearUnread"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'src/lib/store.ts')

with open(FILE, 'r') as f:
    content = f.read()

# Add unreadCounts to AppState interface - after messages: MessageInfo[]
if 'unreadCounts' not in content:
    content = content.replace(
        '  messages: MessageInfo[]\n  plans:',
        '  messages: MessageInfo[]\n  unreadCounts: Record<string, number>\n  plans:'
    )

# Add unread actions to interface - after addMessage
if 'incrementUnread' not in content:
    content = content.replace(
        '  addMessage: (message: MessageInfo) => void\n  setPlans:',
        '  addMessage: (message: MessageInfo) => void\n  incrementUnread: (chatId: string) => void\n  clearUnread: (chatId: string) => void\n  setPlans:'
    )

# Add to defaultState
if 'unreadCounts' not in content.split('export const useStore')[0]:
    pass  # Already in interface, will handle below

# Add to defaultState object
content = content.replace(
    "  messages: [],\n  plans: [],",
    "  messages: [],\n  unreadCounts: {},\n  plans: [],"
)

# Add action implementations after addMessage
if 'incrementUnread: (chatId)' not in content:
    content = content.replace(
        '''  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),''',
        '''  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  incrementUnread: (chatId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [chatId]: (state.unreadCounts[chatId] || 0) + 1,
      },
    })),

  clearUnread: (chatId) =>
    set((state) => {
      const next = { ...state.unreadCounts }
      delete next[chatId]
      return { unreadCounts: next }
    }),'''
    )

with open(FILE, 'w') as f:
    f.write(content)

print(f"✅ Updated {FILE} with unreadCounts, incrementUnread, clearUnread")