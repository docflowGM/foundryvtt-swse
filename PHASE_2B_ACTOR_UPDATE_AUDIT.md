# Phase 2B: Actor.update() Deep Audit & Categorization

## Bucket 1: ALLOWED GATEKEEPERS (Skip These)

Files that are governance/mutation control layers — direct updates are **allowed** here.

| File | Calls | Justification | Action |
|------|-------|----------------|--------|
| `scripts/governance/actor-engine/actor-engine.js` | N/A | Central mutation authority | ✅ SKIP |
| `scripts/governance/mutation/batch-1-validation.js` | Multi | Mutation enforcement layer | ✅ SKIP |
| `scripts/actors/base/swse-actor-base.js` | Multi | Actor document base class | ✅ SKIP |
| `scripts/actors/vehicle/swse-vehicle-core.js` | Multi | Vehicle document base | ✅ SKIP |

**Rationale:** These ARE the governance layers. They own mutation authority.

---

## Bucket 2: SHEET/APP FORM UPDATES (Audit for Safety)

Files in sheets or applications that update actors from user form input — potentially legitimate but need review.

| File | Calls | Type | Critical Risk | Action |
|------|-------|------|----------------|--------|
| `scripts/apps/character-import-wizard.js` | Multi | App (Import) | Bulk import patterns | 🔍 AUDIT |
| `scripts/apps/levelup/levelup-shared.js` | Multi | App (Level-up) | Level progression mutations | 🔍 AUDIT |
| `scripts/apps/upgrade-app.js` | Multi | App (Item Upgrade) | Item system mutations | 🔍 AUDIT |
| `scripts/apps/follower-creator.js` | Multi | App (Follower) | Follower creation | 🔍 AUDIT |
| `scripts/apps/follower-manager.js` | Multi | App (Follower Mgmt) | Follower modifications | 🔍 AUDIT |
| `scripts/apps/gm-store-dashboard.js` | Multi | App (Store) | Store item assignments | 🔍 AUDIT |

**Rationale:** These are UI apps that apply user-driven mutations. Need to verify they:
- Are atomic (no cascading updates)
- Preserve render state
- Don't cause update loops
- Could be refactored to ActorEngine if complex

**Question for User:** Should these be refactored to route through ActorEngine, or kept as atomic form updates?

---

## Bucket 3: VIOLATIONS (Must Refactor)

Engine layers, hooks, and utilities calling actor.update() directly — **these MUST route through ActorEngine**.

| File | Calls | Layer | Issue | Proposed Fix |
|------|-------|-------|-------|--------------|
| `scripts/engine/combat/starship/enhanced-pilot.js` | Multi | Engine | Pilot state mutations | Route → ActorEngine |
| `scripts/engine/combat/starship/enhanced-commander.js` | Multi | Engine | Commander state mutations | Route → ActorEngine |
| `scripts/engine/combat/starship/enhanced-engineer.js` | Multi | Engine | Engineer state mutations | Route → ActorEngine |
| `scripts/engine/combat/starship/enhanced-shields.js` | Multi | Engine | Shield state mutations | Route → ActorEngine |
| `scripts/engine/combat/starship/vehicle-turn-controller.js` | Multi | Engine | Turn control mutations | Route → ActorEngine |
| `scripts/engine/combat/starship/subsystem-engine.js` | Multi | Engine | Subsystem mutations | Route → ActorEngine |
| `scripts/engine/combat/threshold-engine.js` | Multi | Engine | Damage/threshold mutations | Route → ActorEngine |
| `scripts/armor/armor-upgrade-system.js` | Multi | System | Armor state mutations | Route → ActorEngine |
| `scripts/engine/inventory/ammo-system.js` | Multi | System | Ammo state mutations | Route → ActorEngine |
| `scripts/engine/store/store-engine.js` | Multi | Engine | Store state mutations | Route → ActorEngine |
| `scripts/combat/active-effects-manager.js` | Multi | System | Effect mutations | Route → ActorEngine |
| `scripts/houserules/houserule-healing.js` | Multi | House Rule | Healing mutations | Route → ActorEngine |
| `scripts/infrastructure/hooks/follower-hooks.js` | Multi | Hooks | Follower lifecycle | Route → ActorEngine |
| `scripts/infrastructure/hooks/force-power-hooks.js` | Multi | Hooks | Force power mutations | Route → ActorEngine |
| `scripts/governance/integrity/missing-prereqs-tracker.js` | Multi | Governance | Prerequisite tracking | Route → ActorEngine |
| `scripts/sentinel/layers/utility-layer.js` | Multi | Sentinel | Utility mutations | Route → ActorEngine |

**Critical Issues:**
- Starship system (6 files) — **highest priority**, directly affects combat/vehicle mechanics
- Hooks (2 files) — **high priority**, lifecycle mutations can cause race conditions
- Store/inventory/armor (3 files) — **medium priority**, item system integrity

---

## Risk Assessment: Tight Scope Warning

**⚠️ CRITICAL:**  The starship system files (enhanced-pilot, enhanced-commander, enhanced-engineer, enhanced-shields, vehicle-turn-controller, subsystem-engine) have **direct actor mutations that could cause:**
- Update loops if not properly routed through ActorEngine
- Hydration issues if mutations bypass governance
- Combat resolution race conditions

**Recommendation:**
1. Refactor starship violations first (highest risk/impact)
2. Refactor hooks second (lifecycle safety)
3. Audit Bucket 2 (sheets/apps) — may not need refactoring if properly isolated

---

## Phase 2B Execution Plan

### Step 1: Refactor Starship System (6 files)
- Route all pilot/commander/engineer/shields mutations through ActorEngine
- Verify no update loops
- Test combat scenarios

### Step 2: Refactor Hooks (2 files)
- Convert follower-hooks and force-power-hooks mutations to ActorEngine
- Verify lifecycle doesn't cascade

### Step 3: Refactor Remaining Violations (8 files)
- Process item systems, house rules, utilities
- Batch refactor similar patterns

### Step 4: Audit Bucket 2 (Sheets/Apps)
- Determine if form updates can stay atomic or need ActorEngine routing
- User decision required

---

## User Input Needed

**Question:** For Bucket 2 (sheet/app updates), should I:

A) Leave them as atomic form updates (they're user-initiated, safe to batch apply)
B) Refactor all to route through ActorEngine (more governance-strict)
C) Hybrid approach (only complex ones like levelup go through ActorEngine)

**Recommendation:** A — Sheets are UI layers, their updates are atomic and user-driven. No cascade risk.

---

## Ready for Phase 2B Fixes?

Proceed with:
1. ✅ Bucket 1 — Skip (ALLOWED)
2. ✅ Bucket 2 — Recommend SKIP (safe as-is)
3. 🔧 Bucket 3 — REFACTOR (14 files, violations)

**Type YES to confirm and I'll refactor Bucket 3 violations.**
