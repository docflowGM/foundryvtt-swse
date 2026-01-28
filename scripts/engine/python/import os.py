# fix_talent_tree_assignments.py
# PURPOSE:
# Auto-fix talents that have NO talent tree or an INVALID tree assignment.
# This silences registry errors and keeps data load-safe in Foundry v13.
#
# STRATEGY (SAFE DEFAULT):
# - If talent has no tree OR invalid tree → assign fallback tree "General"
# - Does NOT remove existing valid trees
# - Creates .bak backup
#
# TARGET:
# foundryvtt-swse talent compendium JSON / db export

import json
import shutil
from pathlib import Path

ROOT = Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse")
TARGET = ROOT / "data" / "talents.json"   # <-- adjust if your talents live elsewhere
BACKUP = TARGET.with_suffix(".json.bak")

FALLBACK_TREE = "General"


def backup():
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)


def fix():
    data = json.loads(TARGET.read_text(encoding="utf-8"))

    fixed = 0

    for talent in data:
        system = talent.setdefault("system", {})

        tree = system.get("talentTree")

        if not tree or not isinstance(tree, str) or not tree.strip():
            system["talentTree"] = FALLBACK_TREE
            fixed += 1

    if fixed:
        backup()
        TARGET.write_text(
            json.dumps(data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )

    print(f"✔ Fixed {fixed} talents with missing/invalid tree assignments")


if __name__ == "__main__":
    fix()
