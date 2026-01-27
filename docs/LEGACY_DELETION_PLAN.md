# SWSE Legacy Code Deletion Plan

**Status:** Do not execute until SSOT_COMPLETION_CHECKLIST is 100% green.

This plan identifies code that was necessary during the refactor but becomes **technical debt** once SSOT is stable. These deletions make the system:

- Smaller and faster
- Easier to reason about
- More likely to fail loudly (not hide errors)
- Simpler to onboard contributors

---

## Phase 1: Delete Migration Scripts (One-Time Data Transforms)

These have **already run** on your world. They can be deleted after one final successful startup with no errors.

| File | Version | Purpose | Delete After? |
|------|---------|---------|-----------------|
| `scripts/migration/array-to-items.js` | Pre-v10 | Convert old array-based talents to Items | SSOT stable |
| `scripts/migration/actor-validation-migration.js` | v1.1.130 | Fix size/integer fields | SSOT stable |
| `scripts/migration/fix-actor-size.js` | v1.1.110 | Normalize size capitalization | SSOT stable |
| `scripts/migration/fix-defense-schema.js` | v1.1.125 | Convert old defense numbers to objects | SSOT stable |
| `scripts/migration/fix-item-weight.js` | v1.1.138 | Validate/fix NaN weights | SSOT stable |
| `scripts/migration/organize-compendiums.js` | v1.1.142 | Reorganize items into subcategory packs | One-time only |

**How to verify safe deletion:**

Before deleting each, confirm:
1. No migrations with that MIGRATION_VERSION are still registered in `index.js`
2. World has no broken actors/items after repair script
3. Startup log shows clean run (no that-migration-specific errors)

**Deletion process:**

```bash
# 1. Remove from index.js registration
# 2. Delete file
# 3. Test startup
# 4. Commit with message: "chore: Remove one-time migration script"
```

---

## Phase 2: Delete Fuzzy Name Matching (Fallback Logic)

Once talent tree names are normalized (see SSOT checklist), these can be deleted.

### File: `scripts/data/talent-tree-normalizer.js`

**Function to delete:** `findTalentTreeByName()` (lines 143-162)

**Why:** This function tries to "guess" correct tree names by normalizing spacing, encoding, accents. After SSOT is stable, we should have **exact ID lookups only**.

**Replacement:**

```javascript
// Before (fuzzy):
const tree = await TalentTreeDB.byName("Master of Teräs Käsi");

// After (exact, fail loudly):
const tree = TalentTreeDB.getById("master-of-teras-kasi");
if (!tree) throw new Error(`Unknown talent tree: ${id}`);
```

**Related cleanup:**

- File: `scripts/data/talent-tree-db.js` lines 110-114
  - Replace `return findTalentTreeByName(name, this.trees);` with strict ID lookup
  - Fail loudly if ID not found

**Verification before deletion:**

```javascript
// In console, confirm no warnings:
game.swse.talents.trees.every(t => {
  const talents = t.talents || [];
  return talents.every(tal => tal.system.talentTree === t._id);
});
// Should be true
```

---

## Phase 3: Delete Item-to-Actor Conversion Logic

Once all NPCs, Droids, Vehicles are native Actors (not Items), delete:

### File: `scripts/migrations/migrate-npc-items-to-actors.js`

**Function:** `convertItemToActor()` (lines 23-126)

**Why:** This was a migration bridge. After SSOT, only Actor creation APIs exist. Items never become Actors.

**Verification before deletion:**

```javascript
// Confirm no Items with type "droid", "vehicle", "npc"
game.items.contents.filter(i => ["droid", "vehicle", "npc"].includes(i.type)).length === 0
// Should be 0
```

---

## Phase 4: Delete Guessing / Pattern-Matching Code

These functions guess missing data based on class names. Once all actors are properly created, delete:

### File: `scripts/migration/item-validation-migration.js`

**Functions to delete:**
- `getDefaultSaveProgression()` (lines 54-99) — guesses save progressions from class name
- `convertBabProgression()` (lines 41-48) — converts BAB strings based on pattern

**Why:** These were guardrails for incomplete actor data. After SSOT:
- Actors always have complete progression data
- Class → progression is **assigned at creation**, not guessed

**Replacement (for future reference):**

```javascript
// Before (guessing):
const progression = getDefaultSaveProgression(actor.system.class);

// After (always exists):
const progression = actor.system.progressionData.saves;
if (!progression) throw new Error("Actor missing progression data");
```

**Related:** Delete the entire `item-validation-migration.js` once confirmed.

---

## Phase 5: Delete UI Recovery Fallbacks

### File: `scripts/actors/character/swse-character-sheet.js`

**Code to delete:**
- Scroll position caching (`_saveScrollPositions()` / `_restoreScrollPositions()`, lines 88-110)
- Fallback cache behavior (lines 82-86)

**Why:** Scroll caching was a workaround for re-renders. Once the sheet is stable:
- Avoid full app re-renders
- Use Vue/Svelte reactivity instead of DOM caching
- Let Foundry manage positions

**Related fallbacks to audit:**

- `scripts/core/error-handler.js`: `safeExecute()` fallback wrapper
  - Replace with proper error boundaries
  - Fail loudly instead of silently recovering

- `scripts/config/skills.js` (lines 4-66): Hardcoded skill fallback
  - Delete once skills compendium is always available
  - Fail at init if missing

- `scripts/apps/mentor-suggestion-dialogues.js` (lines 2805-2808): Fallback dialogue phase
  - Delete once mentor derivation is deterministic

- `scripts/apps/chargen/chargen-templates.js` (line 30): Minimal fallback templates
  - Delete once all templates preload

---

## Phase 6: Audit Deep Clone Usage (Lower Priority)

These are lower priority but worth reviewing:

### File: `scripts/engine/progression.js`

**Function:** `dryRun()` (lines 901-968)

**Current behavior:** Creates a deep clone of the actor to simulate level-up without modifying the real actor.

**After SSOT:** Consider:
- [ ] Keep as-is (useful for preview UI)
- [ ] Replace with immutable state machine
- [ ] Move to a proper VM/preview system

This is a design question, not a bug. Leave for later decision.

---

## Deletion Checklist (In Order)

Use this checklist to execute Phase 1–5:

### Migration Scripts (Phase 1)
- [ ] Delete `array-to-items.js`
- [ ] Delete `actor-validation-migration.js`
- [ ] Delete `fix-actor-size.js`
- [ ] Delete `fix-defense-schema.js`
- [ ] Delete `fix-item-weight.js`
- [ ] Delete `organize-compendiums.js`
- [ ] Update `index.js` to remove all registrations
- [ ] Test startup → no errors
- [ ] Commit: "chore: Remove one-time migration scripts"

### Fuzzy Matching (Phase 2)
- [ ] Refactor `talent-tree-normalizer.js` → exact ID lookup only
- [ ] Update `talent-tree-db.js` → fail on missing ID
- [ ] Delete `findTalentTreeByName()` function
- [ ] Test: no more "Could not find talent tree" warnings
- [ ] Commit: "refactor: Remove fuzzy talent tree name matching"

### Item-to-Actor Conversion (Phase 3)
- [ ] Delete `migrate-npc-items-to-actors.js`
- [ ] Remove all `convertItemToActor()` calls
- [ ] Test startup → verify no Items with actor types
- [ ] Commit: "chore: Remove legacy Item-to-Actor conversion"

### Guessing Logic (Phase 4)
- [ ] Delete guessing functions from `item-validation-migration.js`
- [ ] Delete entire `item-validation-migration.js` if empty
- [ ] Remove registration from `index.js`
- [ ] Test startup → verify no guessing warnings
- [ ] Commit: "chore: Remove progression guessing logic"

### UI Recovery (Phase 5)
- [ ] Delete scroll caching from `swse-character-sheet.js`
- [ ] Delete fallback wrappers from `error-handler.js`
- [ ] Delete skill fallback from `config/skills.js`
- [ ] Delete dialogue phase fallback from `mentor-suggestion-dialogues.js`
- [ ] Delete template fallback from `chargen-templates.js`
- [ ] Test UI → sheet still renders correctly
- [ ] Commit: "refactor: Remove UI recovery fallbacks"

### Final Audit (Phase 6)
- [ ] Review deep clone usage in `progression.js`
- [ ] Decide: keep, refactor, or redesign
- [ ] Document decision in code comment

---

## Commit Template

For each phase, use:

```
chore: Remove legacy <phase> code (SSOT stabilization)

This deletion is safe because:
- SSOT checklist is 100% green
- Data is no longer in legacy format
- No warnings in startup log
- <specific verification>

Deleted:
- <file 1>
- <file 2>

Verification: <command to verify>
```

---

## Rollback Plan

If deletion causes issues:

1. **Revert commit**: `git revert <commit-hash>`
2. **Investigate**: Why is data still in legacy format?
3. **Don't re-add code** — fix the root cause instead
4. **Update SSOT checklist**: What was missed?

---

## Post-Deletion Benefits

Once all phases complete:

| Metric | Before | After |
|--------|--------|-------|
| System startup time | ~2700ms | ~2000ms (estimated) |
| Ambiguous code paths | Many | None |
| Fallback logic | Yes | No |
| Data validation coverage | Loose | Strict |
| Contributor onboarding | Hard | Easy |
| Error messages | Confusing | Clear |

---

## When NOT to Delete

Do NOT delete:

- ✅ `talent-ssot-refactor.js` — validates critical data structure
- ✅ `fix-talent-effect-validation.js` — v13 compatibility fix
- ✅ `populate-force-compendiums.js` — initial data population (keep, but make idempotent)
- ✅ `update-species-traits-migration.js` — recent trait engine updates

These are still active and necessary.
