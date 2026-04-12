# SWSE Actor Data Contract v1

**Status:** Authoritative — Do not expand beyond this contract without explicit approval  
**Last Updated:** 2026-04-12  
**Owner:** Architecture Team

---

## Preamble: Architectural Principles

This document defines the canonical actor data contract across progression, mutation, derivation, and sheet layers. It establishes a single source of truth for data ownership and access patterns.

### Authority Model

- **ActorEngine** is the sole mutation authority. All writes to `actor.system.*` go through `ActorEngine.updateActor()` or `ActorEngine.applyMutationPlan()`.
- **ProgressionFinalizer** expresses mutation intent (what should be set), not mechanism (how to write). Intent flows through ActorEngine for normalization and application.
- **DerivedCalculator** is the sole authority for `system.derived.*` values. No other code writes to derived paths.
- **Template.json** owns initial default actor structure. Every canonical stored path must have a sensible default.
- **V2 Character Sheet** is a consumer only. It reads canonical paths, never invents truth or mutations.

### Data Flow

1. **Selection → Intent**: Progression UI selections flow to ProgressionFinalizer
2. **Intent → Plan**: ProgressionFinalizer._compileMutationPlan() creates mutation intent
3. **Plan → Normalized**: ActorEngine.applyMutationPlan() normalizes intent to canonical paths
4. **Stored → Computed**: DerivedCalculator computes from canonical stored paths to canonical derived paths
5. **Canonical → Display**: V2 Sheet reads canonical stored and derived paths for rendering

### Critical Rules

1. **Sheet fallback code is defensive rescue logic only.** It must never become the source of truth. If sheet needs a fallback (e.g., `field ?? default`), it means upstream failed to initialize. This must be fixed upstream, not hidden in fallback logic.

2. **One canonical stored path per domain.** Multiple storage paths for the same semantic value create confusion and maintenance burden. Legacy paths are marked as such and deprecated.

3. **Derived is computed, not stored.** DerivedCalculator computes values from stored base inputs. No base code writes to `system.derived.*` except DerivedCalculator.

4. **Progression does not compute mechanics.** Progression finalizer sets selections and identity. Mechanics (HP, BAB, defenses, skill totals) are computed by DerivedCalculator, not planned by progression.

5. **ActorEngine normalizes schema mismatches.** If progression writes to a legacy path, ActorEngine maps it to the canonical path during apply. Future code must not expand legacy paths.

---

## Domain Contract Table

| Domain | Canonical Stored Path | Canonical Derived Path | Mutation Owner | Init Owner | Sheet Read Path | Fallback OK? | Legacy Paths | Notes |
|--------|---|---|---|---|---|---|---|---|
| name | name (actor doc) | (none) | ActorEngine | ProgressionFinalizer | actor.name | No | (none) | Identity, set once at chargen, editable post-chargen |
| level | system.level | system.derived.identity.level | ActorEngine | ProgressionFinalizer | system.derived.identity.level | No | (none) | Heroic level only; multiclass tracked in progression.classLevels |
| species | system.species | system.derived.identity.species | ActorEngine | ProgressionFinalizer | system.derived.identity.species | No | system.race (legacy) | Both species and race written for compatibility; species is canonical |
| background | system.background | system.derived.identity.background | ActorEngine | ProgressionFinalizer | system.derived.identity.background | No | (none) | Background selection, mirrored for display |
| profession | system.profession | (none) | ActorEngine | ProgressionFinalizer | system.profession | No | (none) | Derived from background.category='occupation' |
| planetOfOrigin | system.planetOfOrigin | (none) | ActorEngine | ProgressionFinalizer | system.planetOfOrigin | No | (none) | Derived from background.category='planet' |
| event | system.event | (none) | ActorEngine | ProgressionFinalizer | system.event | No | (none) | Derived from background.category='event' |
| class identity | system.class | system.derived.identity.className | ActorEngine | ProgressionFinalizer | system.derived.identity.className + progression.classLevels | No | system.className, system.classes | See Class Contract section; progression.classLevels computed separately for multiclass |
| abilities base | system.abilities.{key}.base | system.derived.attributes.{key} | ActorEngine | ProgressionFinalizer | both (stored for edit, derived for display) | No | system.abilities.{key}.value (legacy) | Stored path is .base/.racial/.temp; NOT .value |
| abilities racial | system.abilities.{key}.racial | (part of derived) | Manual/sheet edit | Template | system.abilities.{key}.racial | No | (none) | Racial modifiers from species selection or manual edit |
| abilities temp | system.abilities.{key}.temp | (part of derived) | Manual/sheet edit | Template | system.abilities.{key}.temp | No | (none) | Temporary buffs/debuffs |
| hp.value | system.hp.value | system.derived.hp.value | Manual/sheet edit | Template | system.derived.hp.value | Yes (defensive) | (none) | Current HP, player-editable during play |
| hp.max | system.hp.max | system.derived.hp.max | ActorEngine recomputeHP | Template + DerivedCalculator | system.derived.hp.max | No | (none) | Maximum HP, not set by progression (computed downstream) |
| defenses base | system.defenses.{fort\|ref\|will}.misc | system.derived.defenses.{fortitude\|reflex\|will}.total | Manual/sheet edit | Template | stored for edit, derived for display | No | (none) | Base misc mods stored; totals computed by DerivedCalculator |
| defenses total | (none, computed) | system.derived.defenses.{fortitude\|reflex\|will}.total | DerivedCalculator | DerivedCalculator | system.derived.defenses.*.total | No | (none) | Computed from abilities, class, equipment; never stored |
| skills.trained | system.skills.{key}.trained | (part of derived) | ActorEngine | ProgressionFinalizer | system.skills.{key}.trained + derived.skills.{key} | No | (none) | Trained flag set by progression; read by sheet |
| skills.miscMod | system.skills.{key}.miscMod | (part of derived) | Manual/sheet edit | Template | system.skills.{key}.miscMod | No | (none) | Misc mods editable by sheet; used in derived total |
| skills.focused | system.skills.{key}.focused | (part of derived) | Manual/sheet edit | Template | system.skills.{key}.focused | Yes (defensive) | (none) | Optional flag, defaults to false if missing |
| skills.ability | system.skills.{key}.ability | (part of derived) | Template | Template | system.skills.{key}.ability | No | system.skills.{key}.selectedAbility (legacy) | Governing ability for the skill |
| skills.total | (none, computed) | system.derived.skills.{key}.total | DerivedCalculator | DerivedCalculator | system.derived.skills.{key}.total | No | (none) | Computed from trained, ability mod, misc mod, focus bonus |
| feats | actor.items (type='feat') | system.derived.feats.list | ActorEngine (embedded doc) | ProgressionFinalizer (grants) + manual | system.derived.feats.list | No | (none) | Granted by progression, item-based storage |
| talents | actor.items (type='talent') | system.derived.talents.list | ActorEngine (embedded doc) | ProgressionFinalizer (grants) + manual | system.derived.talents.list | No | (none) | Granted by progression, item-based storage |
| force powers | actor.items (type='forcepower') | system.derived.forcePowers.list | ActorEngine (embedded doc) | ProgressionFinalizer (grants) + manual | system.derived.forcePowers.list | No | (none) | Force-user only, item-based |
| force techniques | actor.items (type='forcetechnique') | system.derived.forceTechniques.list | ActorEngine (embedded doc) | ProgressionFinalizer (grants) + manual | system.derived.forceTechniques.list | No | (none) | Force-user only, item-based |
| force secrets | actor.items (type='forcesecret') | system.derived.forceSecrets.list | ActorEngine (embedded doc) | ProgressionFinalizer (grants) + manual | system.derived.forceSecrets.list | No | (none) | Force-user only, item-based |
| languages | system.languages (array) | (none) | ActorEngine | Template/ProgressionFinalizer | system.languages | Yes (defensive) | (none) | Language ID array; may also be item-tracked |
| xp.total | system.xp.total | system.derived.xp | Manual/sheet edit | Template | both (stored for XP tracking, derived for progress display) | Yes (defaults to 0) | system.experience (legacy) | Not set by progression (progression doesn't grant XP); player earns post-chargen |
| credits | system.credits | (none) | Manual/sheet edit | Template | system.credits | Yes (defensive) | (none) | Currency, form-editable; not progression responsibility |
| destinyPoints.value | system.destinyPoints.value | (part of derived) | Manual/sheet edit | Template | system.destinyPoints.value | No | (none) | Resource pool, template default = 1 |
| destinyPoints.max | system.destinyPoints.max | (part of derived) | Manual/sheet edit | Template | system.destinyPoints.max | No | (none) | Resource cap, template default = 1 |
| forcePoints.value | system.forcePoints.value | (part of derived) | Manual/sheet edit | Template | system.forcePoints.value | No | (none) | Force-user only, template default = 0 |
| forcePoints.max | system.forcePoints.max | (part of derived) | Manual/sheet edit | Template | system.forcePoints.max | No | (none) | Force-user only, template default = 0 |
| condition track | system.conditionTrack.current | (none) | Manual/sheet edit | Template | system.conditionTrack.current | No | (none) | Status condition meter, defaults to 0 |
| speed | system.speed | system.derived.speed (if mirrored) | Manual/sheet edit | Template | system.speed | Yes (defensive, defaults to 6) | (none) | Base movement rate, editable |
| attacks | actor.items (weapons) + computed | system.derived.attacks.list | Manual (items) + DerivedCalculator | Items + FeatActionsMapper | system.derived.attacks.list | No | (none) | Derived from equipped weapons and feats |
| encumbrance | actor.items (weights) | system.derived.encumbrance | Manual (items) | EncumbranceEngine | system.derived.encumbrance | No | (none) | Computed from item weights and STR modifier |

---

## Detailed Domain Notes

### Domain: Abilities

**Current observed paths:**
- `system.abilities.{STR|DEX|CON|INT|WIS|CHA}.value` (written by ProgressionFinalizer line 399 — WRONG PATH)
- `system.abilities.{STR|DEX|CON|INT|WIS|CHA}.base, .racial, .temp` (template.json lines 48-90 defines this structure)
- `system.abilities.{STR|DEX|CON|INT|WIS|CHA}.total, .mod` (computed, stored in template)
- `system.attributes.*` (read by DerivedCalculator line 100, WRONG — should read system.abilities)
- `system.derived.attributes.{STR|DEX|CON|INT|WIS|CHA}.*` (output by DerivedCalculator, CORRECT)

**Proposed canonical paths:**
- **Stored (base)**: `system.abilities.{key}.base` (integer 8-18, ability score)
- **Stored (modifiers)**: `system.abilities.{key}.racial` (integer 0+, species bonus), `.temp` (integer, buff/debuff)
- **Derived**: `system.derived.attributes.{key}` (object with {base, racial, temp, mod, total})

**Reasoning:**
- Template.json defines abilities with `.base, .racial, .temp, .total, .mod` structure (lines 48-90)
- ProgressionFinalizer INCORRECTLY writes `.value` instead of `.base` (line 399)
- DerivedCalculator should read from `system.abilities` (canonical stored), but currently reads `system.attributes` (wrong)
- Form schema (form.js lines 30-47) expects `system.abilities.{key}.base, .racial, .temp`
- Sheet reads from `system.derived.attributes` for display (correct)
- character-actor.js line 124 has fallback chain masking the mismatch

**Contract decision:**
- Canonical stored: `system.abilities.{key}.base/racial/temp` (per template.json)
- Canonical derived: `system.derived.attributes.{key}` (computed by DerivedCalculator)
- Sheet reads: Both (stored for editing ability scores, derived for computed modifiers)
- ProgressionFinalizer MUST write `.base` not `.value` (Phase 3A)
- DerivedCalculator MUST read from `system.abilities` not `system.attributes` (Phase 3A)
- Remove fallback chain in character-actor.js once contract is stable (Phase 7)

**Migration note:**
- Current: ProgressionFinalizer writes `.value` (WRONG), template has `.base` (RIGHT)
- Phase 3A: Change ProgressionFinalizer line 399 to write `.base` instead of `.value`
- Phase 3A: Update DerivedCalculator to read from `system.abilities` (canonical stored path)
- Deprecated path: `system.abilities.{key}.value` — do not use in new code, ActorEngine will normalize
- Deprecated path: `system.attributes.*` — read-only legacy, will be removed in Phase 10

---

### Domain: Class Identity (Multipart Contract)

**Current observed paths:**
- `system.class` (object, written by ProgressionFinalizer line 390)
- `system.className` (string, written by ProgressionFinalizer line 391 — REDUNDANT)
- `system.classes` (array, written by ProgressionFinalizer line 392 — REDUNDANT)
- `system.progression.classLevels` (array of {class, level}, computed by progression engine — CANONICAL FOR MULTICLASS)
- `actor.items` (class items embedded, used for reference)
- `system.derived.identity.className` (string display, mirrored by character-actor.js line 97)

**Proposed canonical paths:**
- **Stored (primary)**: `system.class` (object with {id, name, hd, bab, level, features...})
- **Stored (multiclass)**: `system.progression.classLevels` (array of {class, level} for class tracking)
- **Derived (display)**: `system.derived.identity.className` (string, computed from system.class.name or progression.classLevels)

**Reasoning:**
- `system.class` is the primary class selection object, set by ProgressionFinalizer
- `system.progression.classLevels` is computed by progression engine for multiclass/levelup support
- `system.className` and `system.classes` are scalar copies created for "compatibility" but never read by sheet
- Sheet already reads from `progression.classLevels` for class display (context.js line 132)
- Sheet already reads from `derived.identity.className` for identity display
- Multiple paths = confusion; only two canonical paths needed (base + computed multiclass)

**Contract decision:**
- Canonical stored (chargen): `system.class` (object, set by ProgressionFinalizer)
- Canonical stored (multiclass): `system.progression.classLevels` (array, computed by progression engine)
- Canonical derived (display): `system.derived.identity.className` (string, mirrored from system.class.name)
- Sheet read path: `system.progression.classLevels` for display, `system.class` for properties
- DO NOT write: `system.className` (redundant with system.class.name), `system.classes` (redundant with progression.classLevels)

**Migration note:**
- Current: ProgressionFinalizer writes three paths (class, className, classes)
- Phase 3B: Remove `system.className` and `system.classes` writes from ProgressionFinalizer (lines 391-392)
- Phase 3B: Keep only `system.class` write (line 390)
- Deprecated paths: `system.className`, `system.classes` — will be removed in Phase 10
- Sheet already reads correctly (no changes needed in Phase 3B)

---

### Domain: Skills

**Current observed paths:**
- `system.skills.{key}.trained` (boolean, written by ProgressionFinalizer line 406 — CORRECT)
- `system.skills.{key}.focused` (boolean, read by sheet, not initialized)
- `system.skills.{key}.ability` (string skill key, template field)
- `system.skills.{key}.miscMod` (number, form-editable, not initialized by progression)
- Template.json line 141: `"skills": {}` (no schema defined — PROBLEM)
- `system.derived.skills` (array/object, mirrored and computed by character-actor.js and DerivedCalculator)

**Proposed canonical paths:**
- **Stored (base)**: `system.skills.{key}` (object with {trained, focused, ability, miscMod})
- **Derived (computed)**: `system.derived.skills.{key}` (object with {total, breakdown, ...})

**Reasoning:**
- Progression correctly sets only `.trained` flag (a selection)
- `.focused`, `.ability`, `.miscMod` are optional modifiers and selections that are form-editable, not progression-driven
- Template has no schema for skill object, causing undefined field errors
- Sheet expects to read/write all these fields but they may not exist (falls back to fallback logic)
- DerivedCalculator computes `.total` from these base fields

**Contract decision:**
- Canonical stored: `system.skills.{key}` (object with fixed schema: trained, focused, ability, miscMod)
- Canonical derived: `system.derived.skills.{key}` (contains total and other computed values)
- Progression ownership: Only `.trained` (selection, set at chargen)
- Manual/form ownership: `.focused`, `.ability`, `.miscMod` (form-editable post-chargen)
- Sheet read path: Both stored (for editing) and derived (for totals)
- Template MUST define full skill object schema (Phase 5)

**Migration note:**
- Current: Template has no skills schema; skill properties are implicit
- Phase 5: Define full skills schema in template.json with default values
- Current fallbacks: character-actor.js line 155 reads with soft fallback (`s.focused === true` becomes false if undefined)
- Phase 7: Remove fallback logic once template schema guarantees fields exist

---

### Domain: Defenses

**Current observed paths:**
- `system.defenses.{fort|ref|will}` (object with base, ability, class, armorMastery, misc properties — template lines 16-46)
- `system.defenses.{fort|ref|will}.misc` (number, form-editable override)
- `system.defenses.{fort|ref|will}.total` (number, computed — WRONG LOCATION)
- `system.derived.defenses.{fortitude|reflex|will}` (object, initialized by character-actor.js lines 51-62)
- `system.derived.defenses.{fortitude|reflex|will}.total` (computed by DerivedCalculator)

**Proposed canonical paths:**
- **Stored (base config)**: `system.defenses.{fort|ref|will}` (base value, misc override, ability, class components)
- **Derived (computed)**: `system.derived.defenses.{fortitude|reflex|will}.total` (computed total with all mods)

**Reasoning:**
- `system.defenses` holds baseline configuration and manual overrides
- `system.derived.defenses` holds computed results (totals with modifiers applied)
- Separation is intentional per V2 contract: base config vs computed output
- Sheet edits `.misc` in stored path, reads `.total` from derived path
- DerivedCalculator computes totals from abilities, class, equipment; should not store in base

**Contract decision:**
- Canonical stored: `system.defenses.{fort|ref|will}` (config and misc override only)
- Canonical derived: `system.derived.defenses.{fortitude|reflex|will}.total` (computed total)
- Sheet edit path: `system.defenses.*.miscMod` (override)
- Sheet display path: `system.derived.defenses.*.total` (computed total)
- Progression ownership: None (defaults only)
- Initialization: Template provides base values

**Migration note:**
- Current: Code already mostly correct; paths are already separated
- No breaking changes needed; this is documentation clarity only
- Phase 6: Verify DerivedCalculator correctly computes from canonical stored paths

---

### Domain: XP and Resources

**Current observed paths:**
- `system.experience` (number, template field, value = 0)
- `system.xp.total` (number, read by context.js line 167)
- `system.credits` (number, form schema line 84)
- `system.destinyPoints` (object {value, max}, template lines 108-110)
- `system.forcePoints` (object {value, max}, template lines 103-106)
- `system.conditionTrack` (object {current, persistent}, template lines 98-101)
- `system.speed` (number, template line 102)

**Proposed canonical paths (unified naming):**
- **XP**: `system.xp.total` (canonical, not system.experience)
- **Credits**: `system.credits` (currency, form-editable)
- **Destiny Points**: `system.destinyPoints` (object {value, max}, template default value=1, max=1)
- **Force Points**: `system.forcePoints` (object {value, max}, template default value=0, max=0)
- **Condition Track**: `system.conditionTrack` (object {current}, template default current=0)
- **Speed**: `system.speed` (number, template default 6)

**Reasoning:**
- XP: Progression does not set XP at chargen (players earn it post-chargen via levelups/rewards). Template default 0 is correct.
- Credits: Progression does not set credits (class may grant some, but not finalized in this phase). Manual/form-editable. Template default 0.
- Destiny/Force/Condition: Template resources, not progression-driven. Form-editable. Template provides defaults.
- All should have consistent naming (xp.total, not experience; explicit resource objects)

**Contract decision:**
- Canonical paths: As listed above (unified naming)
- Initialization: Template.json provides all defaults
- Progression ownership: None (resources are not progression input)
- Manual/sheet ownership: Form-editable post-chargen
- Fallback OK: Yes, for all (can gracefully default to 0 if missing)

**Migration note:**
- Current: `system.experience` exists but `system.xp.total` is what sheet reads
- Phase 3D: Unify to `system.xp.total` as canonical path
- Deprecated path: `system.experience` — mark as legacy, Phase 10 may remove if xp.total is stable

---

### Domain: Identity Summary (Header Fields)

**Current observed paths:**
- `name` (actor document property)
- `system.level` (mirrored to derived.identity.level)
- `system.species` (mirrored to derived.identity.species)
- `system.background` (mirrored to derived.identity.background)
- `system.class` (mirrored via className to derived.identity.className)
- `system.gender` (template supports, not set by progression)
- `system.age` (template supports?, not set by progression)

**Proposed canonical display path:**
- **Derived (display)**: `system.derived.identity` (object with {level, className, species, gender, background, ...})

**Reasoning:**
- Identity fields are mirrored from base to derived for display purposes
- character-actor.js mirrorIdentity function (lines 93-138) handles this
- Sheet reads from derived.identity for consistent display
- Base fields (system.level, system.species, etc.) are editable; derived is display-only

**Contract decision:**
- Canonical stored: Individual fields (system.level, system.species, etc.)
- Canonical derived: `system.derived.identity` (mirrored object for display)
- Sheet reads: `system.derived.identity.*` for header display
- Progression sets: name, level, species, background, class (at chargen)
- Manual/sheet sets: gender, age (not progression responsibility)

**Migration note:**
- Current: mirroring is correct, no changes needed
- Phase 6: Verify character-actor.js mirrorIdentity handles all identity fields

---

## Forbidden Patterns

The following patterns are **NOT ALLOWED** going forward. Future code reviews must reject them.

### 1. Sheet Inventing Core Truth

**FORBIDDEN:**
```javascript
const skillTotal = derivedData.skills[key].total 
  ?? (abilityMod + halfLevel + miscMod + trainingBonus) 
  ?? fallbackZero;
```

Sheet fallback code must not reconstruct a value. If derived is missing, sheet displays error or warns, not substitute logic.

**REQUIRED:**
```javascript
const skillTotal = derivedData.skills[key].total;  // Trust derived, or warn
if (skillTotal === undefined) console.warn('Derived skill total missing');
```

### 2. Progression Writing Legacy Compatibility Paths

**FORBIDDEN:**
```javascript
set['system.className'] = className;  // "for compatibility"
set['system.classes'] = [classObject];  // "legacy support"
```

ProgressionFinalizer writes only canonical paths. ActorEngine handles legacy → canonical mapping.

**REQUIRED:**
```javascript
set['system.class'] = classObject;  // Canonical only
// ActorEngine normalizes any deprecated paths to canonical
```

### 3. Derived Reading Non-Canonical Base Paths

**FORBIDDEN:**
```javascript
const abilityBase = actor.system.attributes[key].base  // Wrong source
```

DerivedCalculator reads only canonical stored paths.

**REQUIRED:**
```javascript
const abilityBase = actor.system.abilities[key].base  // Canonical
```

### 4. New Duplicate Paths for Same Domain

**FORBIDDEN:**
```javascript
// If system.class exists, do NOT also create:
set['system.className'] = className;  // Duplicate
set['system.classObject'] = classObject;  // Duplicate
set['system.classes'] = [classObject];  // Duplicate
```

One canonical stored path per domain.

**REQUIRED:**
```javascript
set['system.class'] = classObject;  // One path
// If display variant needed, compute it in derived
set['system.derived.identity.className'] = classObject.name;  // Derived mirror
```

### 5. Fallback Logic Becoming Logic

**FORBIDDEN:**
```javascript
const hasSkillTrained = derivedData.skills[key].trained ?? false;
if (hasSkillTrained) {
  totalBonus += profBonus;  // Fallback is core to calculation
}
```

Fallback cannot be relied upon for correctness.

**REQUIRED:**
```javascript
const hasSkillTrained = derivedData.skills[key].trained;  // Trust canonical
if (hasSkillTrained) {
  totalBonus += profBonus;  // Relies on initialized truth
}
```

### 6. Mutation Outside ActorEngine

**FORBIDDEN:**
```javascript
// In character-actor.js or sheet directly:
actor.system.hp.max = computed_hp;  // Direct mutation
actor.update({...});  // Unvetted update
```

All writes go through ActorEngine.

**REQUIRED:**
```javascript
// Via ActorEngine only:
await ActorEngine.updateActor(actor, {'system.hp.max': computed_hp});
```

### 7. Reading from Multiple Competing Paths

**FORBIDDEN:**
```javascript
const level = system.level ?? system.progression.level ?? 1;
```

Choose ONE canonical path; do not offer alternatives.

**REQUIRED:**
```javascript
const level = system.level;  // One canonical source
```

---

## Open Questions (Requiring Runtime Proof in Phase 9)

These cannot be settled by static code analysis. Phase 9 will provide runtime proof.

### 1. Are progression.classLevels properly computed during chargen finalization?

**Expected behavior:**  
After finalize() completes, `actor.system.progression.classLevels` should equal `[{class: 'jedi', level: 1}]`

**Proof method:**  
Create fresh level 1 character through chargen, inspect actor.system.progression.classLevels immediately after finalize()

**Risk if wrong:**  
multiclass display broken, sheet class display depends on this

---

### 2. Does template.json have sensible defaults for all required fields?

**Expected behavior:**  
Fresh actor (no progression applied) should have: hp.max, hp.value, xp.total, abilities schema, defenses, skills (empty or with defaults), conditionTrack, speed, resources all initialized

**Proof method:**  
Create new actor without any progression, inspect actor.toObject().system

**Risk if wrong:**  
DerivedCalculator will need to initialize missing fields, sheet fallbacks will mask defects

---

### 3. When does DerivedCalculator actually run during chargen?

**Expected behavior:**  
DerivedCalculator.computeAll() runs once during ActorEngine.updateActor → recalcAll() after applyMutationPlan completes. All system.derived.* values persist.

**Proof method:**  
Add logging to DerivedCalculator.computeAll(), create character, verify derived values exist in final actor.system.derived

**Risk if wrong:**  
Derived values may not be persisted, sheet may not have computed data available

---

### 4. Does character-actor.js mirrorSkills gracefully handle undefined properties?

**Expected behavior:**  
If system.skills.{key}.focused or .miscMod or .ability do not exist, mirrorSkills should not error; sheet should display sensible defaults

**Proof method:**  
Create character with minimal skill schema (only .trained), check sheet skill display for errors

**Risk if wrong:**  
Skill display will break if template schema is incomplete

---

### 5. What is the actual shape of system.class object during finalize?

**Expected behavior:**  
system.class should be structured as {id, name, hd, bab, features, level, ...} matching class template

**Proof method:**  
Log actor.system.class during finalize() to see actual structure

**Risk if wrong:**  
character-actor.js mirrors may read wrong path, sheet display may break

---

### 6. Does form.js field schema accurately reflect what is editable post-chargen?

**Expected behavior:**  
Every field in FORM_FIELD_SCHEMA (form.js lines 16-90) should be a field that exists in template and is form-editable

**Proof method:**  
Create fresh character, open sheet form, verify every form field is accessible and has a value

**Risk if wrong:**  
Form validation may fail, fallbacks in sheet may hide missing fields

---

## Migration Notes (for Later Phases)

This section documents deprecated paths and planned removals.

### Deprecated Paths (Will be removed in Phase 10)

| Path | Current Use | Canonical Replacement | Phase | Notes |
|------|------------|----------------------|-------|-------|
| `system.abilities.{key}.value` | ProgressionFinalizer line 399 | `system.abilities.{key}.base` | 3A | Incorrect path in mutation plan |
| `system.attributes.*` | DerivedCalculator line 100 | `system.abilities.*` | 3A | Wrong source for base values |
| `system.className` | ProgressionFinalizer line 391 | `system.class.name` (or derived.identity.className) | 3B | Redundant scalar copy |
| `system.classes` | ProgressionFinalizer line 392 | `system.progression.classLevels` | 3B | Redundant array copy |
| `system.experience` | Template field | `system.xp.total` | 3D | Inconsistent naming |
| `system.skills.{key}.selectedAbility` | (legacy variant) | `system.skills.{key}.ability` | (verify) | Path variant |

### Fallback Chains (Will be simplified in Phase 7)

| Location | Current Fallback | Will Simplify To | Phase | Notes |
|----------|-----------------|-----------------|-------|-------|
| character-actor.js line 124 | `abilities ?? attributes ?? {}` | `abilities ?? {}` (null-safety only) | 7 | Masks ability path mismatch |
| character-actor.js line 155 | `s.focused === true` (implicit false) | Explicit false if undefined | 7 | Relies on template providing field |
| character-sheet.js line 656-660 | Fallback skill total computation | Rely on derived.skills.*.total | 7 | Masks missing derived calc |
| character-sheet.js line 835-843 | Fallback attack list generation | Log warning only | 7 | Masks missing derived calc |
| context.js line 165 | `xp.total ?? 0` | Rely on template default | 7 | Safe fallback, acceptable |

### Schema Fixes (Phase 5)

| Field | Current | Required | Phase | Notes |
|-------|---------|----------|-------|-------|
| template.json abilities | Schema present | Already correct (has .base, .racial, .temp) | — | No change needed |
| template.json skills | Empty `{}` | Full schema with trained, focused, ability, miscMod | 5 | Schema definition needed |
| template.json defenses | Schema present | Already correct | — | No change needed |

---

## Sign-Off

**This contract is authoritative as of 2026-04-12.**

Code changes in Phases 2-10 must comply with this contract. No exceptions without explicit approval from architecture team.

### Contract Enforcement Points

1. **Phase 3**: ProgressionFinalizer must write canonical paths only (Phase 3A, 3B, 3C, 3D)
2. **Phase 4**: ActorEngine must normalize deprecated paths to canonical (ActorEngine.normalizeMutationPlan)
3. **Phase 8**: Contract assertions must validate at compile time, apply time, and render time
4. **Phase 9**: Runtime tests must prove contract holds across all character types

### Review Checklist for Future PRs

- [ ] Does the change read/write canonical stored paths only?
- [ ] Does the change add a new path for an existing domain (FORBIDDEN)?
- [ ] Does the change introduce new fallback logic in sheet code (FORBIDDEN)?
- [ ] Does the change add computation outside DerivedCalculator (FORBIDDEN if in system.derived.*)?
- [ ] Does the change mutate actor outside ActorEngine (FORBIDDEN)?
- [ ] Does the change comply with this contract?

---

**End of Actor Data Contract v1**
