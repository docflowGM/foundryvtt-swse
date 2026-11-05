#!/usr/bin/env bash
# Runs every TI-0 reproduction against the right tree(s) and prints a single report. Usage: MAIN_ROOT=<main worktree> EQUIP_ROOT=<PR #1056 worktree> bash run-all.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
MAIN_ROOT="${MAIN_ROOT:?set MAIN_ROOT to a worktree of main}"; EQUIP_ROOT="${EQUIP_ROOT:?set EQUIP_ROOT to a worktree of the PR #1056 head}"
echo "TI-0 reproduction report"; echo "main  : $(git -C "$MAIN_ROOT" rev-parse HEAD)"; echo "equip : $(git -C "$EQUIP_ROOT" rev-parse HEAD)"
run() { SWSE_ROOT="$1" node "$HERE/$2" 2>/dev/null | grep -v '^$'; }
for s in repro-tx01-upgrade-order repro-tx03-action-rollback repro-tx04-force-point-refund repro-tx07-actorengine-plan repro-tx08-store-snapshot repro-tx11-follower-contract; do run "$MAIN_ROOT" "$s.mjs"; done
for s in repro-tx03-action-rollback repro-tx05-tx06-equipment-coordinator repro-c3-force-point-transaction-vs-real-engine; do run "$EQUIP_ROOT" "$s.mjs"; done
