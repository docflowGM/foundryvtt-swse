# Encounter-Limited Reroll Implementation: Infrastructure Analysis

**Date:** 2026-05-11  
**Status:** Existing infrastructure FOUND and ACTIVE — Ready to wire in reroll enforcement

---

## Executive Summary

**The encounter-tracking infrastructure ALREADY EXISTS.** It is:
- ✅ **Active:** Combat hooks registered in `init-hooks.js` → `combat-hooks.js`
- ✅ **Pattern-proven:** Species traits use identical pattern for per-encounter resets
- ✅ **Flag-based:** Uses actor flags scoped to `'foundryvtt-swse'`
- ✅ **Combat-aware:** Automatically resets on `deleteCombat` hook

**What's missing:** The generic helper that reroll resolvers can call to enforce `oncePer: "encounter"`.

**Scope:** Add ONE tiny generic helper module + wire it into 2 resolver files (attack + skill).

---

## Existing Infrastructure Map

### 1. Combat Lifecycle Hooks (ACTIVE ✅)

**File:** `scripts/infrastructure/hooks/combat-hooks.js`

**Registered hooks:**
- `createCombat` → initialization
- `combatRound` → round tracking
- `combatTurn` → turn tracking + condition recovery
- `deleteCombat` → cleanup + species trait reset

**Invocation path:**
```
index.js (init hook)
  → registerInitHooks()
  → registerCombatHooks()
  → HooksRegistry.register('deleteCombat', handleCombatEnd, ...)
```

**Key handler (line 163-182):**
```javascript
async function handleCombatEnd(combat, options, userId) {
  // For each combatant:
  for (const combatant of combat.combatants) {
    const actor = combatant.actor;
    await SpeciesRerollHandler.resetEncounterTraits(actor);  // <-- pattern example
  }
}
```

---

### 2. Per-Encounter Flag Pattern (PROVEN ✅)

**File:** `scripts/species/species-reroll-handler.js`

**Reset implementation:**
```javascript
static async resetEncounterTraits(actor) {
  await actor.unsetFlag('foundryvtt-swse', 'usedSpeciesTraits');
}
```

**Pattern:**
- Flag scope: `'foundryvtt-swse'`
- Flag key per feature: `usedSpeciesTraits`, `damageThresholdExceededThisEncounter`, etc.
- Unset when combat ends
- Check before use: `actor.getFlag(...) !== currentCombatId`

**Example from `damage-resolution-engine.js` (line ~250):**
```javascript
const activeCombatId = game.combat?.started ? game.combat.id : null;
const firstExceededFlag = actor.getFlag?.('foundryvtt-swse', 'damageThresholdExceededThisEncounter');

if (activeCombatId && firstExceededFlag !== activeCombatId) {
  // Feature available this encounter
  // Mark as used
  await actor.setFlag?.('foundryvtt-swse', 'damageThresholdExceededThisEncounter', activeCombatId);
}
```

---

### 3. Feat-Driven Metadata (READY ✅)

**File:** `packs/feats.db`

**Current metadata structure:**
```json
{
  "system": {
    "abilityMeta": {
      "attackRerolls": [{
        "oncePer": "encounter",
        "description": "Lucky Shot: reroll ranged attack rolls once per encounter..."
      }],
      "skillRerolls": [{
        "oncePer": "encounter",
        "description": "Reactive Awareness: reroll Perception checks once per encounter..."
      }]
    }
  }
}
```

**Current consumers (read-only, no enforcement):**
- `MetaResourceFeatResolver.getAttackRerollRules()` → reads `attackRerolls` array
- `SkillFeatResolver.getSkillRerollOptions()` → reads `skillRerolls` array

Both pass `oncePer` to chat UI but don't enforce it.

---

## What Needs to be Built

**One tiny generic module:** `scripts/engine/feats/encounter-use-tracker.js`

**Responsibility:**
- Check if a feature (feat/talent/item) can be used this encounter
- Mark it as used
- Auto-reset on combat end
- Handle no-active-combat gracefully

**Interface:**
```javascript
class EncounterUseTracker {
  // Check + mark in one call (atomic)
  static async canUseThisEncounter(actor, featureKey, metadata)
  
  // Reset all feature uses for actor when combat ends
  static async resetAllUses(actor)
  
  // Metadata-driven: uses featureKey + oncePer field
}
```

**Usage pattern (in resolvers):**
```javascript
// Before allowing reroll:
const canUse = await EncounterUseTracker.canUseThisEncounter(
  actor,
  `reroll-${rule.id}`,
  { oncePer: rule.oncePer }
);

if (!canUse) {
  // Disable button or return error
}
```

---

## Implementation Steps

### Step 1: Create Generic Tracker Module

**File:** `scripts/engine/feats/encounter-use-tracker.js` (NEW)

```javascript
export class EncounterUseTracker {
  static FLAG_SCOPE = 'foundryvtt-swse';
  static FLAG_KEY = 'featureUsesThisEncounter';

  /**
   * Check if feature can be used this encounter
   * Returns: { allowed: boolean, reason?: string }
   */
  static async canUseThisEncounter(actor, featureKey, metadata = {}) {
    if (!actor || !featureKey) return { allowed: false, reason: 'Invalid actor or feature key' };

    const oncePer = metadata.oncePer || 'encounter';
    if (oncePer === 'atWill') return { allowed: true }; // No limit

    // Get current combat ID (or null if no active combat)
    const activeCombatId = game.combat?.started ? game.combat.id : null;
    
    // Get usage flag
    const usageFlag = actor.getFlag(this.FLAG_SCOPE, this.FLAG_KEY) || {};
    
    // Check if already used this encounter
    const lastUsedInCombat = usageFlag[featureKey];
    if (lastUsedInCombat === activeCombatId) {
      return { allowed: false, reason: `Already used once per ${oncePer}` };
    }

    // Mark as used
    usageFlag[featureKey] = activeCombatId;
    await actor.setFlag(this.FLAG_SCOPE, this.FLAG_KEY, usageFlag);

    return { allowed: true };
  }

  /**
   * Reset all feature uses when combat ends
   * Called from handleCombatEnd()
   */
  static async resetAllUses(actor) {
    if (!actor) return;
    await actor.unsetFlag(this.FLAG_SCOPE, this.FLAG_KEY);
  }
}
```

---

### Step 2: Wire into Combat Cleanup

**File:** `scripts/infrastructure/hooks/combat-hooks.js` (EDIT)

**In `handleCombatEnd()` (line 173, after species reset):**
```javascript
// Also reset reroll uses
await EncounterUseTracker.resetAllUses(actor);
```

**Import at top:**
```javascript
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
```

---

### Step 3: Update Attack Reroll Handler

**File:** `scripts/engine/feats/meta-resource-feat-resolver.js` (EDIT)

**In `buildAttackRerollChatOptions()` (line 258):**

Before building chat options, filter out already-used rerolls:

```javascript
static buildAttackRerollChatOptions(actor, weapon, roll, context = {}) {
  const rules = this.getAttackRerollRules(actor);
  if (!rules.length || !roll) return [];

  // Filter rules: exclude ones already used this encounter
  const availableRules = rules.filter(rule => {
    if (!rule.rule?.oncePer) return true; // No limit, always available
    
    // Sync check: is it used?
    const activeCombatId = game.combat?.started ? game.combat.id : null;
    const usageFlag = actor?.getFlag?.('foundryvtt-swse', 'featureUsesThisEncounter') || {};
    const lastUsedId = usageFlag[`reroll-attack-${rule.id}`];
    
    if (lastUsedId === activeCombatId) return false; // Already used this encounter
    return true; // Available
  });

  // ... rest of existing code
  return availableRules.map(rule => ({
    ...rule,
    // ... existing properties
  }));
}
```

**In `resolveAttackRerollButton()` (line 288), before allowing spend:**

```javascript
static async resolveAttackRerollButton(button, { message = null } = {}) {
  // ... existing validation ...

  // NEW: Check encounter use
  const sourceName = button.dataset.sourceName || 'Attack Reroll';
  const ruleId = button.dataset.ruleId; // Need to add this to button data
  const rule = button.dataset.rule ? JSON.parse(button.dataset.rule) : {};
  
  if (rule.oncePer === 'encounter') {
    const allowed = await EncounterUseTracker.canUseThisEncounter(
      actor,
      `reroll-attack-${ruleId}`,
      { oncePer: rule.oncePer }
    );
    if (!allowed.allowed) {
      ui?.notifications?.warn?.(`${sourceName} has already been used this encounter.`);
      return null;
    }
  }

  // ... rest of existing code ...
}
```

---

### Step 4: Update Skill Reroll Handler

**File:** `scripts/engine/skills/skill-feat-resolver.js` (EDIT)

**Same pattern as Step 3:**

**In `buildRerollChatOptions()` (line 300):**
```javascript
// Filter by available uses
const availableOptions = options.filter(option => {
  if (!option.oncePer) return true;
  
  const activeCombatId = game.combat?.started ? game.combat.id : null;
  const usageFlag = actor?.getFlag?.('foundryvtt-swse', 'featureUsesThisEncounter') || {};
  const lastUsedId = usageFlag[`reroll-skill-${option.id}`];
  
  return lastUsedId !== activeCombatId;
});
```

**In `resolveChatRerollButton()` (line 313):**
```javascript
// Check encounter use before executing
const skillKey = button.dataset.skillKey || '';
const ruleId = button.dataset.ruleId;
const oncePer = button.dataset.oncePer;

if (oncePer === 'encounter') {
  const allowed = await EncounterUseTracker.canUseThisEncounter(
    actor,
    `reroll-skill-${ruleId}`,
    { oncePer }
  );
  if (!allowed.allowed) {
    ui?.notifications?.warn?.(`${sourceName} has already been used this encounter.`);
    return null;
  }
}
```

---

## Behavior Spec

### In Active Combat

**Before reroll is used:**
```
Game.combat.started = true
Game.combat.id = "abc123"
actor.flags.foundryvtt-swse.featureUsesThisEncounter = {}

User clicks reroll button
→ canUseThisEncounter() checks:
  ✓ activeCombatId = "abc123"
  ✓ usageFlag["reroll-skill-XYZ"] = undefined
  → ALLOWED = true
  → Marks: usageFlag["reroll-skill-XYZ"] = "abc123"
  → Reroll executes
```

**Second click (same encounter):**
```
User clicks same reroll button again
→ canUseThisEncounter() checks:
  ✓ activeCombatId = "abc123"
  ✗ usageFlag["reroll-skill-XYZ"] = "abc123" (matches!)
  → ALLOWED = false
  → UI shows: "Already used once per encounter"
  → Button disabled or greyed out
```

**Encounter ends:**
```
GM deletes combat
→ handleCombatEnd() fires
→ EncounterUseTracker.resetAllUses(actor)
→ actor.unsetFlag('foundryvtt-swse', 'featureUsesThisEncounter')
```

**New encounter starts:**
```
GM creates new combat with id "xyz789"
→ New reroll button appears in next skill roll
→ canUseThisEncounter() checks:
  ✓ activeCombatId = "xyz789"
  ✓ usageFlag["reroll-skill-XYZ"] = undefined (was reset)
  → ALLOWED = true
  → Reroll available again
```

---

### Outside Active Combat

**No active combat:**
```
activeCombatId = null
usageFlag["reroll-skill-XYZ"] = null (never set)

User clicks reroll
→ canUseThisEncounter() checks:
  ✓ activeCombatId = null
  ✓ usageFlag["reroll-skill-XYZ"] = undefined
  → Not matching (null !== undefined)
  → ALLOWED = true (allowed, but not tracked for next encounter)

Note: Outside combat, the limit cannot be enforced.
GM note in feat: "Enforce once per encounter outside combat by house rules."
```

---

## Files to Change

### New File (1)
- `scripts/engine/feats/encounter-use-tracker.js` — Generic tracker module (~60 lines)

### Modified Files (3)
- `scripts/infrastructure/hooks/combat-hooks.js` — Import tracker, call reset in handleCombatEnd
- `scripts/engine/feats/meta-resource-feat-resolver.js` — Add checks in buildAttackRerollChatOptions + resolveAttackRerollButton
- `scripts/engine/skills/skill-feat-resolver.js` — Add checks in buildRerollChatOptions + resolveChatRerollButton

### Affected Feats (4)
- Lucky Shot — Status: `attack_reroll_phase8_encounter_limit` → `attack_reroll_phase8_implemented`
- Reactive Awareness — Status: `skill_reroll_phase8_encounter_limit` → `skill_reroll_phase8_implemented`
- Reactive Stealth — Status: `skill_reroll_phase8_encounter_limit` → `skill_reroll_phase8_implemented`
- Stealthy — Status: `skill_reroll_with_bonus_phase8_encounter` → `skill_reroll_with_bonus_phase8_implemented`

---

## Non-Hardcoded Guarantee

✅ **No feat names hardcoded.** Implementation uses:
- Feature key (e.g., `reroll-attack-luckyshot`) derived from rule ID
- `oncePer` metadata field from feat pack
- Generic checker function, not feat-specific logic

This means ANY future feat/talent/item with `oncePer: "encounter"` in metadata will automatically be enforced.

---

## Backward Compatibility

- Existing rerolls without `oncePer` field: Treated as `atWill` (no limit) ✅
- Existing reroll code paths unchanged (filter only hides unavailable options) ✅
- No schema changes required ✅

---

## Validation Checklist

- [ ] Create `encounter-use-tracker.js` with generic API
- [ ] Wire reset into `handleCombatEnd()` after species reset
- [ ] Add filtering + checks to `buildAttackRerollChatOptions()`
- [ ] Add check + block to `resolveAttackRerollButton()`
- [ ] Add filtering + checks to `buildRerollChatOptions()`
- [ ] Add check + block to `resolveChatRerollButton()`
- [ ] Verify `oncePer` field exists in all 4 feats' metadata
- [ ] Update feat statuses in packs/feats.db (4 status changes)
- [ ] Run `node --check` on edited JS
- [ ] Test in active combat (2 clicks, second should be blocked)
- [ ] Test after combat deletion (reroll becomes available again)
- [ ] Test outside combat (reroll allowed, not tracked)
- [ ] Confirm no feat names hardcoded (grep for feast names in new code)

---

## Ready to Implement

This is a **low-risk, high-confidence implementation** because:
1. Reuses proven combat hook infrastructure
2. Follows established flag pattern (species traits)
3. Adds enforcement without breaking existing code
4. Metadata-driven, not hardcoded
5. Gracefully handles edge cases (no active combat)

**Estimated effort:** 2-3 hours (write module, wire resolvers, test, update feats.db)
