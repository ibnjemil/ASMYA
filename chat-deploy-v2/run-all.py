#!/usr/bin/env python3
"""
ASMYA Chat System v2 - Master Deploy Script
Run all fix scripts in order.
Usage: python3 run-all.py
"""
import subprocess
import sys
import os

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

scripts = [
    '01-fix-chats-api.py',
    '02-fix-store.py',
    '03-upload-chat-media.py',
    '04-chatview.py',
    '05-chatdashboard.py',
    '06-chatlist.py',
    '07-dashboard-fix.py',
    '08-files-api.py',
]

print("=" * 60)
print("  ASMYA Chat System v2 - Deploying all fixes")
print("=" * 60)

failed = []
for script in scripts:
    path = os.path.join(SCRIPTS_DIR, script)
    print(f"\n>>> Running {script}...")
    try:
        result = subprocess.run(
            [sys.executable, path],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            print(f"  FAILED: {result.stderr}")
            failed.append(script)
        else:
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    print(f"  {line}")
    except Exception as e:
        print(f"  ERROR: {e}")
        failed.append(script)

print("\n" + "=" * 60)
if failed:
    print(f"  FAILED scripts: {', '.join(failed)}")
    print("  Fix errors above, then re-run.")
else:
    print("  All scripts completed successfully!")
    print("")
    print("  Next steps:")
    print("    cd /workspaces/ASMYA")
    print("    git add -A")
    print("    git commit -m 'feat: TG-clone chat v2 - voice/video/file/reply/lightbox/unread'")
    print("    git push")
print("=" * 60)