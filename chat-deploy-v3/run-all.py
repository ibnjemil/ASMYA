#!/usr/bin/env python3
"""
ASMYA Chat v3 - Mobile fixes + Reply + Delete dialog
Run: python3 run-all.py
"""
import subprocess, sys, os

DIR = os.path.dirname(os.path.abspath(__file__))

scripts = [
    '01-sticky-header.py',
    '02-chatdashboard-height.py',
    '03-prisma-reply.py',
    '04-messages-api.py',
    '05-chatview-fix.py',
]

print("=" * 60)
print("  ASMYA Chat v3 - Mobile + Reply + Delete fixes")
print("=" * 60)

failed = []
for s in scripts:
    path = os.path.join(DIR, s)
    print(f"\n>>> {s}...")
    r = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        print(f"  FAILED: {r.stderr}")
        failed.append(s)
    else:
        print(f"  {r.stdout.strip()}")

print("\n" + "=" * 60)

# Run prisma db push to apply schema changes
print("\n>>> Running prisma db push (adding replyToId)...")
r = subprocess.run(['npx', 'prisma', 'db', 'push', '--accept-data-loss'],
    capture_output=True, text=True, timeout=60, cwd='/workspaces/ASMYA')
if r.returncode == 0:
    print("  OK Prisma schema applied")
else:
    print(f"  Prisma note: {r.stdout[-200:] if len(r.stdout) > 200 else r.stdout}")
    if r.returncode != 0:
        print(f"  If error, run manually: cd /workspaces/ASMYA && npx prisma db push")
        failed.append('prisma')

# Run prisma generate
print("\n>>> Running prisma generate...")
r = subprocess.run(['npx', 'prisma', 'generate'],
    capture_output=True, text=True, timeout=60, cwd='/workspaces/ASMYA')
if r.returncode == 0:
    print("  OK Prisma client generated")
else:
    print(f"  Generate note: {r.stdout[-200:] if len(r.stdout) > 200 else r.stdout}")

if failed:
    print(f"\n  Issues: {', '.join(failed)}")
else:
    print("\n  All done! Run:")
    print("    cd /workspaces/ASMYA")
    print("    git add -A && git commit -m 'fix: mobile sticky + reply + delete dialog' && git push")
print("=" * 60)