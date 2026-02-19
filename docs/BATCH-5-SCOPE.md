# BATCH 5: Hooks, Talents, Utilities Scope

**Status:** Planning Complete | Ready for Routing

---

## Overview

**Scope:** 12 files | 48 mutations | Hooks, talents, and utility systems

**Characteristics:**
- Hooks: Event-driven, reactive mutations
- Talents: Special ability mechanics with side effects
- Utilities: Helper functions, effect managers, power systems

**Complexity:** Moderate (smaller than BATCH 4, more event-driven)

---

## Mutation Inventory

### Hooks (4 files, 4 mutations)

| File | Mutations | Type | Criticality |
|------|-----------|------|-------------|
| actor-hooks.js | 3 | updateActor | MEDIUM |
| talent-effects-hooks.js | 1 | createEmbeddedDocuments | MEDIUM |
| **Subtotal** | **4** | | |

### Talents (3 files, 31 mutations)

| File | Mutations | Type | Criticality |
|------|-----------|------|-------------|
| DarkSidePowers.js | 21 | updateActor (mostly) | HIGH |
| dark-side-devotee-mechanics.js | 5 | updateActor | HIGH |
| dark-side-talent-mechanics.js | 1 | updateActor | MEDIUM |
| light-side-talent-mechanics.js | 4 | updateActor | MEDIUM |
| **Subtotal** | **31** | | |

### Utilities (5 files, 13 mutations)

| File | Mutations | Type | Criticality |
|------|-----------|------|-------------|
| actor-utils.js | 3 | updateActor | MEDIUM |
| hardening.js | 3 | updateActor | MEDIUM |
| starship-maneuver-manager.js | 4 | updateActor | LOW |
| destiny-effects.js | 1 | createEmbeddedDocuments | LOW |
| droid-appendage-utils.js | 1 | createEmbeddedDocuments | LOW |
| force-power-manager.js | 1 | updateActor | LOW |
| **Subtotal** | **13** | | |

---

## Detailed Breakdown

### BATCH 5.1: Hooks (4 mutations)

#### actor-hooks.js (3 mutations)
**Purpose:** Actor lifecycle events (create, update, delete)

Lines with mutations:
```javascript
// Line ~130: await actor.update({...})
// Line ~285: await actor.update({...})
// Line ~455: await actor.update({...})
```

**Pattern:** React to actor changes, apply automatic rules/buffs/penalties

**Risk:** Low (simple updates, no multi-step)

**Import Path:** `../actors/engine/actor-engine.js`

#### talent-effects-hooks.js (1 mutation)
**Purpose:** Talent effect application on item add

Line:
```javascript
// Line ~58: await actor.createEmbeddedDocuments('ActiveEffect', effectsData)
```

**Pattern:** When talent item added, create associated effects

**Risk:** Low (single operation)

---

### BATCH 5.2: Talents (31 mutations)

#### DarkSidePowers.js (21 mutations - LARGEST)
**Purpose:** Dark side power mechanics (HP drain, corruption, etc.)

Mutation density: High. Multiple powers have cascading effects.

**Sample lines:**
```javascript
// Line 238: await actor.update({ 'system.hp.value': newHp })
// Line 304: await actor.update({...})
// Line 370: await actor.update({...})
// ... (18 more in this file)
```

**Patterns:**
- Individual HP adjustments
- Status/buff application
- Dark side score updates

**Risk:** HIGH
- Most mutations in BATCH 5
- Effects compound across multiple powers
- May trigger hook re-entrance

**Import Path:** `../../actors/engine/actor-engine.js`

#### dark-side-devotee-mechanics.js (5 mutations)
**Purpose:** Devotee talent progression

Lines:
```javascript
// Line 51: await actor.update({...})
// Line 134: await actor.update({...})
// Line 208: await actor.update({...})
// (2 more)
```

**Pattern:** Apply buffs/penalties based on devotion

**Risk:** MEDIUM

---

#### dark-side-talent-mechanics.js (1 mutation)
**Purpose:** General dark talent effects

**Risk:** LOW

---

#### light-side-talent-mechanics.js (4 mutations)
**Purpose:** Light side talent mechanics

**Risk:** MEDIUM

---

### BATCH 5.3: Utilities (13 mutations)

#### actor-utils.js (3 mutations)
**Purpose:** Actor helper functions

**Patterns:** Apply modifiers, adjust scores, apply conditions

**Risk:** MEDIUM

---

#### hardening.js (3 mutations)
**Purpose:** NPC snapshot/rollback (used for integrity checks)

**Critical Note:** This is rollback infrastructure. Mutations here should carefully preserve atomicity.

**Risk:** MEDIUM-HIGH (affects governance integrity)

---

#### starship-maneuver-manager.js (4 mutations)
**Purpose:** Vehicle/starship action effects

**Risk:** LOW (independent systems)

---

#### destiny-effects.js (1 mutation)
**Purpose:** Destiny point effects (player power)

**Risk:** LOW

---

#### droid-appendage-utils.js (1 mutation)
**Purpose:** Droid modification mechanics

**Risk:** LOW

---

#### force-power-manager.js (1 mutation)
**Purpose:** Force power effects

**Risk:** LOW

---

## Routing Strategy

### Phase 1: Low-Risk Files (Easy Wins)
1. destiny-effects.js (1 mutation)
2. droid-appendage-utils.js (1 mutation)
3. force-power-manager.js (1 mutation)
4. starship-maneuver-manager.js (4 mutations)
5. talent-effects-hooks.js (1 mutation)

**Total:** 8 mutations | Estimated effort: 30 min

### Phase 2: Medium-Risk Files
1. actor-utils.js (3 mutations)
2. actor-hooks.js (3 mutations)
3. dark-side-talent-mechanics.js (1 mutation)
4. light-side-talent-mechanics.js (4 mutations)
5. dark-side-devotee-mechanics.js (5 mutations)

**Total:** 16 mutations | Estimated effort: 45 min

### Phase 3: High-Risk File
1. DarkSidePowers.js (21 mutations)

**Total:** 21 mutations | Estimated effort: 60 min

### Phase 4: Critical Infrastructure
1. hardening.js (3 mutations)

**Total:** 3 mutations | Estimated effort: 30 min
**Note:** Requires careful review for atomicity preservation

---

## Dependency Analysis

### Mutation Chains
- **DarkSidePowers.js → actor-hooks.js**: Powers trigger hooks, which trigger updates
  - Risk: Potential nested mutations or hook re-entrance
  - Mitigation: Ensure ActorEngine.updateActor() handles this correctly

- **talent-effects-hooks.js → effects creation**: When talents added, effects created
  - Risk: Low (createEmbeddedDocuments is single operation)

### Import Paths (Will Need Updating)

**Hooks & Talents:**
```javascript
// From scripts/hooks/actor-hooks.js:
import { ActorEngine } from '../actors/engine/actor-engine.js';

// From scripts/talents/DarkSidePowers.js:
import { ActorEngine } from '../../actors/engine/actor-engine.js';
```

**Utilities:**
```javascript
// From scripts/utils/actor-utils.js:
import { ActorEngine } from '../actors/engine/actor-engine.js';
```

---

## Known Issues to Watch

### 1. Hook Re-entrance
When DarkSidePowers.js calls `await actor.update()`, it triggers `actor-hooks.js`, which calls `await actor.update()` again.

**Current state:** Likely unblocked (no nested mutation prevention)

**After routing:** Will still be allowed (each call separate transaction) unless we add `blockNestedMutations: true`

**Decision pending:** BATCH 4 validation will show if this is problematic

### 2. Dark Side Score Mutations
DarkSidePowers.js updates `system.darkSideScore` frequently. These may trigger cascading effects.

**Need to verify:** Do these mutations trigger additional mutations via hooks?

### 3. Hardening Atomicity
hardening.js is used by NPC levelup for snapshots. Mutations here MUST preserve atomicity or snapshots fail.

**Must test carefully after routing.**

---

## Routing Pattern (Same as BATCH 4)

For each file:
1. Add import: `import { ActorEngine } from '[path]/actor-engine.js';`
2. Replace: `await actor.update()` → `await ActorEngine.updateActor(actor, ...)`
3. Replace: `await actor.createEmbeddedDocuments()` → `await ActorEngine.createEmbeddedDocuments(actor, ...)`
4. Same for `this.actor` variants

---

## Post-Routing Validation

After all 48 mutations routed:

1. **Hooks Still Work:** Talent add → effects created ✓
2. **Powers Still Apply:** Dark side power → HP drain + score update ✓
3. **Utilities Still Valid:** Helper functions route mutations properly ✓
4. **Hardening Still Safe:** Snapshots/rollback still preserve atomicity ✓
5. **No Nested Blocks:** Intentional hook re-entrance still allowed ✓

---

## Parallel Execution

### While BATCH 4 Testing Runs:
- [x] Identify BATCH 5 scope (12 files, 48 mutations)
- [x] Create dependency map
- [x] Flag high-risk files (DarkSidePowers, hardening)
- [x] Plan routing phases
- [ ] Analyze BATCH 4 test results
- [ ] Adjust BATCH 5 strategy if needed based on BATCH 4 findings
- [ ] Execute routing (phases 1-4)
- [ ] Test DarkSidePowers mutations carefully

---

## Timeline

| Phase | Files | Mutations | Est. Time |
|-------|-------|-----------|-----------|
| 1 (Low-Risk) | 5 | 8 | 30 min |
| 2 (Medium-Risk) | 5 | 16 | 45 min |
| 3 (High-Risk) | 1 | 21 | 60 min |
| 4 (Critical) | 1 | 3 | 30 min |
| **Total** | **12** | **48** | **165 min** |

**Note:** Can execute phases in parallel for speed. DarkSidePowers.js is independent of others.

---

## Questions for BATCH 4 Results

Once BATCH 4 validation completes, use results to refine BATCH 5 strategy:

1. **Are hooks frequently nested?**
   - If yes: May need to adjust how talent-effects-hooks operates

2. **Do multiple mutations in one flow break semantics?**
   - If yes: May need to batch DarkSidePowers mutations

3. **Is StoreTransactionEngine pattern working?**
   - If yes: Apply similar pattern to talent power application?

4. **Are there unexpected recalc spikes?**
   - If yes: Review DarkSidePowers for cascading effects

---

## Success Criteria

### ✅ BATCH 5 Complete When
- [x] Scope identified (12 files, 48 mutations)
- [ ] All 48 mutations routed through ActorEngine
- [ ] No unrouted mutations remain
- [ ] Zero mutations outside ActorEngine in these files
- [ ] All imports added
- [ ] BATCH 5 validation tests run
- [ ] Post-routing behaviors verified
- [ ] DarkSidePowers carefully tested
- [ ] Hook re-entrance still works as designed

---

## Appendix: Full File List

**Hooks (4 files):**
- actor-hooks.js
- talent-effects-hooks.js

**Talents (4 files):**
- DarkSidePowers.js
- dark-side-devotee-mechanics.js
- dark-side-talent-mechanics.js
- light-side-talent-mechanics.js

**Utilities (5 files):**
- actor-utils.js
- destiny-effects.js
- droid-appendage-utils.js
- force-power-manager.js
- hardening.js
- starship-maneuver-manager.js

---

**Status:** Ready for execution
**Depends on:** BATCH 4 validation results (optional dependency)
**Next:** Begin Phase 1 routing once BATCH 4 tests complete

