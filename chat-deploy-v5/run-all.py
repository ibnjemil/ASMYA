#!/usr/bin/env python3
"""v5 run-all: Apply all fixes"""
import subprocess, sys, os

os.chdir('/workspaces/ASMYA')

scripts = [
    ('01-chatview.py', 'ChatView: reply + file + delete + lazy load'),
    ('02-messages-api.py', 'Messages API: pagination'),
    ('03-chatdashboard.py', 'ChatDashboard: h-full + limit=30'),
    ('04-dashboard-mobile.py', 'Dashboard: mobile sticky fix'),
    ('05-store.py', 'Store: replyToId type'),
]

print('=' * 60)
print('  ASMYA Chat v5 - Comprehensive fix')
print('=' * 60 + '\n')

all_ok = True
for name, desc in scripts:
    for prefix in ['chat-deploy-v5/', 'scripts/chat-deploy-v5/']:
        path = os.path.join('/workspaces/ASMYA', prefix, name)
        if os.path.exists(path):
            break
    else:
        print(f'  MISSING {name}')
        all_ok = False
        continue
    print(f'>>> {name} ({desc})')
    result = subprocess.run([sys.executable, path], capture_output=True, text=True)
    if result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            print(f'  {line}')
    else:
        print(f'  FAILED: {result.stderr.strip()}')
        all_ok = False
    print()

if all_ok:
    print('  All fixes applied!')
    print('  Run: git add -A && git commit -m "fix: v5 chat fixes" && git push')
else:
    print('  Some fixes failed - check output above')
    sys.exit(1)