# SWSE SSOT Completion Checklist

This checklist defines what "done" looks like for the Single Source of Truth refactor. Do not close the refactor issue until this is green.

---

## ✅ Data Model (Actors & Items)

- [ ] All playable entities are Actors (character, droid, vehicle, npc)
- [ ] No Items masquerading as Actors
- [ ] No legacy cloning paths (Item → Actor promotion)
- [ ] All Actors created via explicit APIs only
- [ ] Actor creation always sets complete system object:
  - [ ] `system.bab` (number)
  - [ ] `system.baseAttack` (number)
  - [ ] `system.initiative` (number)
  - [ ] `system.size` (lowercase enum: fine/diminutive/tiny/small/medium/large/huge/gargantuan)
  - [ ] `system.defenses` (reflex, fort, will with ability + misc)
- [ ] World repair script run once → zero errors
- [ ] `game.actors.contents.every(a => a instanceof Actor)` returns true

---

## ✅ Talent Tree System (biggest win condition)

### Tree Integrity
- [ ] No talents with empty `system.talentTree`
- [ ] No talents in "Unassigned" unless intentional
- [ ] Every talent ID matches its tree exactly once
- [ ] No duplicate talent tree names (case-sensitive)

### Name Normalization
- [ ] Canonical tree name map exists and is documented
- [ ] "Master of Teräs Käsi" ↔ "Master of Teras Kasi" unified to one name
- [ ] "Droid" variants (1st/2nd/3rd/4th/5th degree) have consistent naming
- [ ] "Soldier Combat" → "Soldier" (or chosen canonical name)
- [ ] Map applied at TalentTreeDB build time

### TalentTreeRegistry Build
- [ ] **No fallback registry invoked** (this is the gate)
- [ ] `console.log` shows zero warnings about missing trees
- [ ] Zero "[TalentTreeNormalizer] Could not find talent tree" messages
- [ ] Zero "[TALENT-TREE-REGISTRY] Talent X references unregistered tree" warnings
- [ ] TalentTreeRegistry.build() completes without fallback
- [ ] 189 talent trees loaded (or your correct number)

### Prerequisite Graph
- [ ] All talent prerequisites resolve to valid talents
- [ ] No circular dependencies
- [ ] Prerequisite UI renders in correct order
- [ ] No "undefined prerequisite" errors in console

---

## ✅ Compendiums

### Document Type Sanity
- [ ] Item compendiums contain only Items
- [ ] Actor compendiums contain only Actors
- [ ] No mixed document types in any pack
- [ ] Inspection: `pack.getDocuments()` returns homogeneous types

### Force Compendiums
- [ ] Force Techniques populated (or explicitly skipped)
- [ ] Force Secrets populated (or explicitly skipped)
- [ ] Force Powers populated (or explicitly skipped)
- [ ] Lightsaber Form Powers populated (or explicitly skipped)
- [ ] Population script runs cleanly (no "You may only push instances of..." errors)
- [ ] Population idempotent: second run skips existing docs

### Compendium Usage
- [ ] TalentTreeDB pulls talents from correct pack
- [ ] FeatureIndex builds without errors
- [ ] Zero "Failed to build" errors in init log

---

## ✅ Character Generation / Level-Up

### APIs & Entry Points
- [ ] One canonical chargen entry point
- [ ] One canonical level-up entry point
- [ ] Explicit context passed: `{ mode: 'new' | 'levelup' }`
- [ ] No ambiguity about current state

### Mentor System
- [ ] Mentor is **derived from actor state only**
  - Actor class → assigned mentor
  - No cached mentor ID
  - No selection persistence across sessions
- [ ] Mentor dialogue content derives from actor context
- [ ] No "mentor desync" in logs
- [ ] Mentor selection UI only shows valid mentors for current class

### UI State Management
- [ ] Chargen step changes preserve window position
- [ ] No full Application re-render on mentor selection
- [ ] Step navigation is deterministic (forward/back)
- [ ] No "this sheet is half-rendered" visual artifacts

---

## ✅ UI Stability

### Layout & Positioning
- [ ] No `100vw` or `100vh` (breaks with scrollbars)
- [ ] No `position: fixed` inside application windows
- [ ] No global `*` selectors
- [ ] Window always stays in viewport bounds

### Character Sheet
- [ ] Renders completely on open
- [ ] Tab switching doesn't flicker or re-render unrelated content
- [ ] Drag-and-drop doesn't explode with sortRelative errors
- [ ] Vehicle sheet renders without warnings
- [ ] Droid sheet renders without warnings

### CSS Isolation
- [ ] No style pollution between sheets
- [ ] No hardcoded colors that break themes
- [ ] Dark mode / high-contrast works

---

## ✅ Logging (Signal-to-Noise)

### Startup Log Quality
- [ ] Zero 🔴 red errors during initialization
- [ ] Warnings are intentional and documented
- [ ] Migration scripts are idempotent and silent on second run
- [ ] No "already registered" helper spam (register defensively)

### Runtime Logging
- [ ] No error spam in the browser console
- [ ] Errors are actionable (not cryptic)
- [ ] No silent failures (fail loudly or succeed cleanly)

---

## 🚦 The Gate Rule

**If any of these are still true, SSOT is NOT complete:**

- [ ] ❌ TalentTreeRegistry still uses fallback
- [ ] ❌ Any migration runs with errors (non-idempotent)
- [ ] ❌ Chargen mentor selection is cached instead of derived
- [ ] ❌ Actor creation paths inconsistent
- [ ] ❌ Talent trees have spelling drift
- [ ] ❌ Compendiums have mixed document types

---

## Verification Commands (paste into Foundry console)

```javascript
// 1. Validate all actors are real Actors
game.actors.contents.every(a => a instanceof Actor)  // should be true

// 2. Check for talents in Unassigned
const unassigned = game.swse?.talents?.trees?.find(t => t.name === "Unassigned");
unassigned?.talents?.length  // should be 0 (or small intentional set)

// 3. Validate compendium document types
for (const pack of game.packs) {
  const docs = pack.index.contents;
  const types = new Set(docs.map(d => d.type));
  if (types.size > 1) console.warn(`Mixed types in ${pack.collection}:`, types);
}

// 4. Check for fallback TalentTreeRegistry
game.swse?.talents?.usesFallback  // should be false or undefined

// 5. Verify tree count
Object.keys(game.swse?.talents?.trees || {}).length  // should be 189 (or your number)

// 6. Test mentor derivation
const actor = game.actors.getName("TestCharacter");
console.log(actor.system.class);  // mentor derived from this
```

---

## Sign-Off

When all boxes are checked:

1. **Set a git tag**: `git tag -a v1.0-ssot-complete -m "SSOT refactor complete"`
2. **Update manifest**: version bump to next major
3. **Delete legacy code** (see: LEGACY_DELETION_PLAN.md)
4. **Run test suite** (if you have one)
5. **Close refactor issue**

From that point forward:

- No fallback logic
- Fail loudly on data inconsistencies
- Clear error messages
- Predictable behavior
