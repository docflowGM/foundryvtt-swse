"""
Run this script from the foundryvtt-swse repo directory to remove the git lock
and commit all pending changes.

Usage: python git_commit.py
"""
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
LOCK = os.path.join(REPO, ".git", "index.lock")

# Remove lock file if present
if os.path.exists(LOCK):
    try:
        os.remove(LOCK)
        print(f"Removed {LOCK}")
    except Exception as e:
        print(f"Could not remove lock: {e}")
        sys.exit(1)
else:
    print("No lock file found.")

# Stage all changes
print("Running git add -A ...")
result = subprocess.run(["git", "add", "-A"], cwd=REPO)
if result.returncode != 0:
    print("git add failed.")
    sys.exit(result.returncode)

# Commit
msg = "Apply combat tab redesign phases 1-3, NPC skill fixes, and bug fixes"
print(f"Running git commit ...")
result = subprocess.run(["git", "commit", "-m", msg], cwd=REPO)
if result.returncode != 0:
    print("git commit failed.")
    sys.exit(result.returncode)

print("\nDone! Run 'git push' when ready.")
