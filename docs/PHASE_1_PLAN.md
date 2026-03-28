# PHASE 1: Stability Foundation — Implementation Plan

## Objectives
1. Ensure finalization is atomic (no partial mutations)
2. Add dry-run mode for validation without commitment
3. Implement session persistence + recovery
4. Never trust stored indices — always recompute

## Implementation Strategy

### 1. Transaction-Safe Finalization
**File**: `progression-finalizer.js`

Changes:
- Separate compilation from application
- Validate entire plan before ANY mutations
- If validation fails at ANY point → abort without mutation
- Only proceed to ActorEngine if validation passes completely

New flow:
```
validate() → passes
compile() → plan
validate(plan) → passes
apply() → success
```

Not:
```
compile() → plan
apply() → fail (too late to rollback)
```

### 2. Dry-Run Mode
**File**: `progression-finalizer.js`

New method: `dryRun(sessionState, actor, options)`
- Compile plan
- Validate plan
- Return plan + validation result
- Do NOT apply
- Use for:
  - Summary preview
  - Testing
  - Debugging

### 3. Session Persistence
**File**: `progression-session.js` + new file `session-storage.js`

Features:
- Auto-save session state to localStorage/disk
- Restore session on reload
- Recompute active steps (never trust indices)
- Recompute step statuses
- Repair current step (use helpers from Phase 1)
- Track last checkpoint

### 4. Recovery
**File**: `progression-shell.js`

Features:
- On init: Check for saved session
- Offer restore option
- Rebuild entire progression state from saved selections
- Repair any invalid state

## Files to Create/Modify

- `progression-finalizer.js` — atomic finalization + dry-run
- `progression-session.js` — persistence hooks
- `session-storage.js` — new, persistence layer
- `progression-shell.js` — recovery on init
- `chargen-shell.js` — recovery offer on open
- `levelup-shell.js` — recovery offer on open

## Validation Checklist
- [ ] Finalization never partially applies
- [ ] Dry-run produces identical plan to real finalization
- [ ] Session auto-saves after each commit
- [ ] Reload restores session exactly
- [ ] Current step repaired correctly
- [ ] Active steps recomputed (not from indices)
- [ ] Status matrix rebuilt
- [ ] No old indices cause navigation errors
