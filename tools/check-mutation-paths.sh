#!/usr/bin/env bash

set -euo pipefail

# Grep-based guardrails for mutation authority.
# Intended for CI and quick local regression checks.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EXCLUDE_DIRS=(
  "migrations"
  "scripts/apps/maintenance"
  "tools"
)

# Scope: v2 spine + active refactor surface.
# Legacy v1-era scripts may still contain direct mutations; those are intentionally not scanned.
SCOPE_DIRS=(
  "scripts/actors/engine"
  "scripts/actors/v2"
  "scripts/items"
  "scripts/chat"
  "scripts/apps/upgrade-app.js"
)

SCOPE_DIRS_NO_CHAT=(
  "scripts/actors/engine"
  "scripts/actors/v2"
  "scripts/items"
  "scripts/apps/upgrade-app.js"
)

build_excludes() {
  local args=()
  for d in "${EXCLUDE_DIRS[@]}"; do
    args+=("--exclude-dir=$d")
  done
  printf '%s\n' "${args[@]}"
}

mapfile -t EXCLUDES < <(build_excludes)

fail=0

check() {
  local pattern="$1"
  local label="$2"
  local scope_name="${3:-SCOPE_DIRS}"
  # shellcheck disable=SC2034
  local -n scope_ref="$scope_name"
  echo "\n[check] $label"
  : > /tmp/mutation_check.out
  local hit=0
  for path in "${scope_ref[@]}"; do
    if [[ -d "$path" ]]; then
      if grep -R -n "${EXCLUDES[@]}" -E "$pattern" "$path" >>/tmp/mutation_check.out 2>/dev/null; then
        hit=1
      fi
    elif [[ -f "$path" ]]; then
      if grep -n -E "$pattern" "$path" >>/tmp/mutation_check.out 2>/dev/null; then
        hit=1
      fi
    fi
  done

  if [[ "$hit" -ne 0 ]]; then
    cat /tmp/mutation_check.out
    fail=1
  else
    echo "OK"
  fi
}

check "(^|[^A-Za-z0-9_])((this\\.actor)|(actor))\\.update\\(" "actor.update(...) calls in scope"
check "updateEmbeddedDocuments\\(\\\"Item\\\"" "Actor.updateEmbeddedDocuments(\"Item\", ...)"
check "\\.items\\.update" "actor.items.update(...)"
check "ChatMessage\\.create" "ChatMessage.create(...)" SCOPE_DIRS_NO_CHAT
check "roll\\.toMessage\\(" "roll.toMessage(...)" SCOPE_DIRS_NO_CHAT
check "CHAT_MESSAGE_TYPES" "CONST.CHAT_MESSAGE_TYPES usage"

if [[ "$fail" -ne 0 ]]; then
  echo "\nFAILED: Mutation path regressions detected. See docs/ARCHITECTURE_MUTATION_RULES.md"
  exit 1
fi

echo "\nPASSED: No mutation-path regressions detected."
