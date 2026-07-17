#!/usr/bin/env python3
"""Fix 3: Prisma schema - add replyToId to Message model"""
import os

BASE = '/workspaces/ASMYA'
FILE = os.path.join(BASE, 'prisma/schema.prisma')

with open(FILE, 'r') as f:
    content = f.read()

# Add replyToId field to Message model
old_msg = '''model Message {
  id        String   @id
  chatId    String
  senderId  String
  type      String
  content   String
  mediaUrl  String?
  createdAt DateTime @default(now())
  User      User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  Chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
}'''

new_msg = '''model Message {
  id        String   @id
  chatId    String
  senderId  String
  type      String
  content   String
  mediaUrl  String?
  replyToId String?
  createdAt DateTime @default(now())
  User      User     @relation(fields: [senderId], references: [id], onDelete: Cascade)
  Chat      Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  ReplyTo   Message? @relation("MessageReply", fields: [replyToId], references: [id], onDelete: Cascade)
  Replies   Message[] @relation("MessageReply")
}'''

content = content.replace(old_msg, new_msg)

with open(FILE, 'w') as f:
    f.write(content)

print("OK Added replyToId + self-relation to Message in prisma/schema.prisma")