# Phase 2B: Actor.update() Deep Audit & Categorization

## Bucket 1: ALLOWED GATEKEEPERS (Skip These)

Files that are governance/mutation control layers — direct updates are **allowed** here.

| File | Justification | Action |
|------|----------------|--------|
| `scripts/governance/actor-engine/actor-engine.js` | Central mutation authority | ✅ SKIP |
| `scripts/governance/mutation/batch-1-validation.js` | Mutation enforcement layer | ✅ SKIP |
| `scripts/actors/base/swse-actor-base.js` | Actor document base class | ✅ SKIP |
| `scripts/actors/vehicle/swse-vehicle-core.js` | Vehicle document base | ✅ SKIP |

---

## Bucket 2: SHEET/APP FORM UPDATES (Safe, Skip)

Atomic user-driven form commits — **safe as-is** (no cascade risk).

| File | Type | Action |
|------|------|--------|
| `scripts/apps/character-import-wizard.js` | Bulk import | ✅ SKIP |
| `scripts/apps/levelup/levelup-shared.js` | Level progression | ✅ SKIP |
| `scripts/apps/upgrade-app.js` | Item upgrade | ✅ SKIP |
| `scripts/apps/follower-creator.js` | Follower creation | ✅ SKIP |
| `scripts/apps/follower-manager.js` | Follower mgmt | ✅ SKIP |
| `scripts/apps/gm-store-dashboard.js` | Store operations | ✅ SKIP |

---

## Bucket 3: VIOLATIONS — DETAILED AUDIT TABLE

Engine/hook/system files calling actor.update() directly — **MUST route through ActorEngine**.

### EXECUTION ORDER (Strict Sequencing for Hydration Safety)

#### PHASE 1: HOOKS FIRST (2 files) — HIGHEST PRIORITY

| File | Callsites | Object Updated | Update Keys | Bucket | Hydration Risk | Proposed Fix |
|------|-----------|-----------------|-------------|--------|---|---|
| `scripts/infrastructure/hooks/follower-hooks.js` | onCreateActor, onUpdateActor | follower actor | system.*, items | 3-HIGH | ⚠️ HYDRATION-CRITICAL: Hook-driven updates can cascade during render | Route through ActorEngine.applyFollowerMutation() with duplicate guard |
| `scripts/infrastructure/hooks/force-power-hooks.js` | onCreateItem, onUpdateItem | actor (via item hook) | system.force.* | 3-HIGH | ⚠️ HYDRATION-CRITICAL: Can trigger during _onRender if item updates before sheet binds | Route through ActorEngine, add "already_processing" check in hook |

**Why First:** Hook-triggered updates are the #1 cause of:
- Double-renders (same actor updated twice)
- Partial re-hydration mid-render
- Form position resets
- Race conditions between sheet render and data mutation

---

#### PHASE 2: EFFECTS MANAGER (1 file) — HIGH PRIORITY

| File | Callsites | Object Updated | Update Keys | Bucket | Hydration Risk | Proposed Fix |
|------|-----------|-----------------|-------------|--------|---|---|
| `scripts/combat/active-effects-manager.js` | applyEffect(), removeEffect(), updateConditions() | actor | system.effects.*, system.derived.* | 3-HIGH | ⚠️ HYDRATION-CRITICAL: Often updates actor while effect is mid-resolution | Batch effect mutations, single atomic ActorEngine call |

**Why Second:** Effect managers can cause silent repeated updates during combat resolution.

---

#### PHASE 3: STARSHIP SYSTEM (6 files) — HIGH VOLUME, PATTERNED

| File | Callsites | Object Updated | Update Keys | Bucket | Hydration Risk | Proposed Fix |
|------|-----------|-----------------|-------------|--------|---|---|
| `scripts/engine/combat/starship/enhanced-pilot.js` | setManeuver(), resolveTrick(), resolvePursuit() | vehicle actor | system.maneuver.*, system.flags.* | 3-MEDIUM | Pilot state updates OK, but ensure atomic per maneuver | Route through ActorEngine.setVehicleManeuver() |
| `scripts/engine/combat/starship/enhanced-commander.js` | setOrder(), resolveBattleAnalysis() | vehicle actor | system.commander.*, system.flags.* | 3-MEDIUM | Commander orders should be atomic per turn | Route through ActorEngine.setCommanderOrder() |
| `scripts/engine/combat/starship/enhanced-engineer.js` | allocatePower(), repairSubsystem() | vehicle actor | system.power.*, system.subsystems.* | 3-MEDIUM | Power allocation must be atomic (no partial updates) | Route through ActorEngine.allocateVehiclePower() |
| `scripts/engine/combat/starship/enhanced-shields.js` | allocateShields(), routePower() | vehicle actor | system.shields.*, system.power.* | 3-MEDIUM | Shield routing affects defense calculations | Route through ActorEngine.allocateShields() |
| `scripts/engine/combat/starship/subsystem-engine.js` | applyDamage(), repairSubsystem() | vehicle actor | system.subsystems.*.tier, system.subsystems.*.status | 3-MEDIUM | Subsystem damage should be deterministic | Route through ActorEngine.applySubsystemDamage() |
| `scripts/engine/combat/starship/vehicle-turn-controller.js` | performTurn(), applyPenalties() | vehicle actor | system.conditions.*, system.flags.* | 3-MEDIUM | Turn penalties affect round resolution | Route through ActorEngine.applyVehicleTurnPenalties() |

---

#### PHASE 4: REMAINING SYSTEMS (5 files) — MEDIUM PRIORITY

| File | Callsites | Object Updated | Update Keys | Bucket | Hydration Risk | Proposed Fix |
|------|-----------|-----------------|-------------|--------|---|---|
| `scripts/engine/combat/threshold-engine.js` | applyMassiveDamage(), preventDeath() | actor/vehicle | system.hp.*, system.conditionTrack.* | 3-MEDIUM | Massive damage calcs OK, but ensure HP updates atomic | Route through ActorEngine.applyMassiveDamage() |
| `scripts/engine/inventory/ammo-system.js` | consumeAmmo(), restockAmmo() | actor | system.inventory.ammo.* | 3-LOW | Ammo updates can batch, low hydration risk | Route through ActorEngine.consumeAmmo() |
| `scripts/armor/armor-upgrade-system.js` | applyUpgrade(), removeUpgrade() | actor | system.inventory.armor.* | 3-LOW | Armor upgrades are discrete, safe to batch | Route through ActorEngine.applyArmorUpgrade() |
| `scripts/engine/store/store-engine.js` | assignToActor(), removeFromActor() | actor | system.inventory.* | 3-LOW | Store operations are user-initiated, atomic | Route through ActorEngine.assignStoreItem() |
| `scripts/houserules/houserule-healing.js` | applyHealing(), applyLongTermCare() | actor | system.hp.*, system.wounds.* | 3-LOW | Healing is discrete per character, safe atomic | Route through ActorEngine.applyHealing() |

---

### SUMMARY: HYDRATION-CRITICAL CALLSITES

Files with updates during render-critical phases (⚠️ HIGHEST PRIORITY):
- **follower-hooks.js** — onCreateActor, onUpdateActor (runs during actor setup/render)
- **force-power-hooks.js** — item hooks can fire before sheet is bound
- **active-effects-manager.js** — effect resolution can update actor mid-_onRender

These must be fixed first to eliminate "sheet feels haunted" symptoms.

---

## Loop Detection Guard (Non-Negotiable)

### Implementation in ActorEngine

Add a dev-only update-loop detector to catch cascading mutations:

```javascript
// In ActorEngine.updateActor() / ActorEngine.apply()
static #updateStack = new Map(); // actor.id → { count, timestamp, sources }

static _detectUpdateLoop(actor, source) {
  const key = actor.id;
  const now = performance.now();

  if (!this.#updateStack.has(key)) {
    this.#updateStack.set(key, { count: 0, timestamp: now, sources: [] });
  }

  const state = this.#updateStack.get(key);

  // Reset if > 50ms has passed (new mutation cycle)
  if (now - state.timestamp > 50) {
    state.count = 0;
    state.sources = [];
    state.timestamp = now;
  }

  state.count++;
  state.sources.push(source);

  // WARN if same actor updated >5 times in 50ms
  if (state.count > 5) {
    SentinelEngine.report('actor-update-loop',
      SentinelEngine.SEVERITY.WARN,
      `Possible update loop detected: ${actor.name} updated ${state.count}x in 50ms`,
      {
        actorId: actor.id,
        actorName: actor.name,
        count: state.count,
        sources: state.sources,
        stack: new Error().stack
      }
    );
  }
}
```

This catches the exact class of "sheet feels haunted" bugs where mutations cascade invisibly.

---

## Phase 2B Execution Plan (STRICT SEQUENCING)

### Step 1: Hooks First (2 files, highest risk)
1. follower-hooks.js
2. force-power-hooks.js
✅ Commit: "fix: Route hook mutations through ActorEngine"

### Step 2: Effects Manager + Starship (7 files, medium risk)
1. active-effects-manager.js
2. enhanced-pilot.js
3. enhanced-commander.js
4. enhanced-engineer.js
5. enhanced-shields.js
6. subsystem-engine.js
7. vehicle-turn-controller.js
✅ Commit: "fix: Route effects & starship mutations through ActorEngine"

### Step 3: Remaining Systems (5 files, low risk)
1. threshold-engine.js (already done for chat, add update routing)
2. ammo-system.js
3. armor-upgrade-system.js
4. store-engine.js
5. houserule-healing.js
✅ Commit: "fix: Route system mutations through ActorEngine"

### After Each Commit
```javascript
// Boot system and run diagnostic:
await game.SWSE.debug.runAppV2AuditQuick()

// Test basic actor edit: edit character name/bio
// Verify: no double-renders, sheet position stable, no Sentinel warnings
```

---

## Technical Rules (Non-Negotiable)

1. **Single Atomic Call Per User Action**
   - Multiple mutations → batch into one ActorEngine call
   - Never split a logical operation into multiple updates

2. **Never Update Inside Update Hook**
   - If a hook triggers on actor.update(), check "already processing"
   - Add guard: `if (this._isProcessing) return;` at hook entry

3. **Preserve Payload Semantics**
   - Don't restructure data paths
   - Don't "simplify" unless required
   - Keep update logic identical, only routing changes

4. **Report All Violations via Sentinel**
   - Use SentinelEngine.report() for loop detection
   - Never use console.log() for governance violations
   - Include full stack in report for debugging

---

## Proceed with Phase 2B?

✅ Audit complete, detailed tables created, loop detector designed
✅ Execution order: Hooks → Effects/Starship → Systems (3 commits max)
✅ All rules defined, Sentinel integration ready

**Type "Proceed with Phase 2B hooks" to start.
