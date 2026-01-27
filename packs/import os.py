# C:\Users\Owner\Documents\GitHub\foundryvtt-swse\tools\fix_bug_001_talent_tree_registry.py
from __future__ import annotations

import argparse
import datetime as _dt
import sys
from pathlib import Path


TARGET_FILENAME = "TalentTreeRegistry.js"


def _detect_newline(text: str) -> str:
    return "\r\n" if "\r\n" in text else "\n"


def _find_candidate_files(repo: Path) -> list[Path]:
    return [p for p in repo.rglob(TARGET_FILENAME) if p.is_file()]


def _backup_path(path: Path) -> Path:
    ts = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    return path.with_suffix(path.suffix + f".bak.{ts}")


def patch_missing_build_closing_brace(file_path: Path) -> bool:
    """
    Inserts a missing closing brace for `static async build()` before `static getTreeNames()`
    in TalentTreeRegistry.js.

    Returns True if patched, False if no change needed.
    """
    original = file_path.read_text(encoding="utf-8")
    nl = _detect_newline(original)
    lines = original.splitlines()

    def find_line_index(predicate) -> int | None:
        for i, line in enumerate(lines):
            if predicate(line):
                return i
        return None

    build_idx = find_line_index(lambda s: "static async build()" in s)
    get_names_idx = find_line_index(lambda s: "static getTreeNames()" in s)

    if build_idx is None or get_names_idx is None:
        raise RuntimeError(
            f"Could not find required markers in {file_path} "
            f"(build_idx={build_idx}, get_names_idx={get_names_idx})."
        )

    if get_names_idx <= build_idx:
        raise RuntimeError(
            f"Unexpected order of markers in {file_path} "
            f"(build at line {build_idx+1}, getTreeNames at line {get_names_idx+1})."
        )

    # Check whether build() is already closed before getTreeNames
    between = lines[build_idx:get_names_idx]
    has_build_close = any(line.strip() == "}" and line.startswith("  ") for line in between)

    # Stronger heuristic: the exact desired seam "  }\n\n  static getTreeNames"
    already_seamed = False
    if get_names_idx - 1 >= 0 and lines[get_names_idx - 1].strip() == "}":
        if lines[get_names_idx - 1].startswith("  "):
            already_seamed = True

    if has_build_close or already_seamed:
        return False

    # Insert the missing method-closing brace right before getTreeNames()
    insertion = "  }"
    lines.insert(get_names_idx, insertion)

    patched = nl.join(lines) + (nl if original.endswith(("\n", "\r\n")) else "")
    bak = _backup_path(file_path)
    bak.write_text(original, encoding="utf-8")
    file_path.write_text(patched, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fix 'Unexpected strict mode reserved word' in TalentTreeRegistry.js by inserting a missing '}' before getTreeNames()."
    )
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path(r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse"),
        help="Path to your local repo root.",
    )
    parser.add_argument(
        "--file",
        type=Path,
        default=None,
        help="Optional explicit path to TalentTreeRegistry.js (overrides search).",
    )
    args = parser.parse_args()

    repo: Path = args.repo
    if not repo.exists():
        print(f"[ERROR] Repo path does not exist: {repo}", file=sys.stderr)
        return 2

    if args.file is not None:
        target = args.file
        if not target.exists():
            print(f"[ERROR] File does not exist: {target}", file=sys.stderr)
            return 2
        candidates = [target]
    else:
        candidates = _find_candidate_files(repo)

    if not candidates:
        print(f"[ERROR] Could not find {TARGET_FILENAME} anywhere under: {repo}", file=sys.stderr)
        return 2

    # Prefer the most likely path if present
    preferred_suffix = str(Path("scripts") / "progression" / "talents" / TARGET_FILENAME).lower()
    candidates_sorted = sorted(
        candidates,
        key=lambda p: (0 if str(p).lower().endswith(preferred_suffix) else 1, len(str(p))),
    )

    target_file = candidates_sorted[0]
    if len(candidates_sorted) > 1:
        print("[WARN] Multiple candidates found. Patching the most likely one:")
        for p in candidates_sorted[:5]:
            print(f"       - {p}")
        print(f"       -> using: {target_file}")

    try:
        changed = patch_missing_build_closing_brace(target_file)
    except Exception as e:
        print(f"[ERROR] Patch failed: {e}", file=sys.stderr)
        return 1

    if changed:
        print(f"[OK] Patched: {target_file}")
        print(f"     Inserted missing '  }}' before 'static getTreeNames()'.")
        print(f"     Backup created next to file with suffix: .bak.YYYYMMDD_HHMMSS")
    else:
        print(f"[OK] No change needed: {target_file} (looks already fixed).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
