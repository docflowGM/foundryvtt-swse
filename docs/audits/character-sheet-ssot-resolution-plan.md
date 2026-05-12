# Character Sheet SSOT Resolution Plan — Phase 0 Audit

**Audit Date**: 2026-05-12  
**Status**: Phase 0 Complete — Canonical Map Built  
**Scope**: Character sheet templates and canonical data sources only

---

## Executive Summary

The character sheet codebase (v2-concept and legacy v2 partials) uses raw actor system fields alongside view-model/derived fields. This causes:
- **Property read drift**: Templates read `system.forceSensitive` instead of prepared `forceSensitive`
- **Identity field conflicts**: Class/species written to scalar `system.class`/`system.race` instead of canonical identity paths
- **No form schema coverage**: Some inputs (e.g., `system.notes`, `system.forcePointDie`) lack form coercion support
- **Scattered fallbacks**: Multiple templates duplicate the same `oldPath ?? newPath` pattern

The canonical authority order (from highest to lowest) is:
1. Actor data model schema (persistent structure)
2. Actor engine + DerivedCalculator (computation)
3. Sheet context builders + view-model preparation
4. Partials (consumers only)

---

## Phase 0: Canonical Data Map

### Core Ability Scores

| Property | Canonical Path | Writable | Derived/Read-Only | Source |
|---|---|---|---|---|
| Ability Base Score | `system.abilities.<ability>.base` | ✓ (edit input) | — | `character-data-model.js:14-56` |
| Ability Racial Bonus | `system.abilities.<ability>.racial` | ✓ (species helper) | — | `character-data-model.js:14-56` |
| Ability Enhancement | `system.attributes.<ability>.enhancement` | ✓ (ability items) | — | `character-data-model.js:119-120` |
| Ability Temp Bonus | `system.abilities.<ability>.temp` OR `system.attributes.<ability>.temp` | ✓ (spell effects) | — | Both defined in schema |
| Ability Total (Derived) | `system.derived.attributes.<ability>.total` | — | ✓ (DerivedCalculator) | `actor-data-model.js:137-186` |
| Ability Modifier (Derived) | `system.derived.attributes.<ability>.mod` | — | ✓ (DerivedCalculator) | `actor-data-model.js:137-186` |

**⚠️ CONFLICT DETECTED**: 
- `SchemaAdapters.js:12` header comment says canonical is `system.attributes[ABILITY].base`
- `actor-data-model.js:14-56` defines persistent as `system.abilities[ABILITY]` with `.base`, `.racial`, `.misc`, `.total`, `.mod`
- `character-data-model.js:119` also defines `system.attributes` with same structure
- **Resolution pending**: These are two parallel paths. Current active code uses `system.abilities`; `system.attributes` may be future target or legacy adapter language.
- **Current Status for Phase 1**: Keep templates at `system.abilities.*` unchanged. Add TODO to resolve globally.

---

### Identity & Display

| Property | Canonical Path | Writable | Canonical Source | Notes |
|---|---|---|---|---|
| Character Name | `actor.name` | — | Foundry actor | Actor-level property |
| Class Name (Single) | `system.class?.name` OR `system.className` (legacy) | — | Multiclass stored in progression | `character-actor.js:135` uses fallback chain |
| Class Display (Full) | `system.derived.identity.classDisplay` | — | `buildClassDisplay()` in character-actor.js:110-125 | Read-only, built from `progression.classLevels` |
| Multiclass Levels | `system.progression.classLevels` | ✓ (progression engine) | Progression system | Array of `{class, level}` objects |
| Species/Race Name | `system.species?.name` OR `system.species` (string) | — | Species helper writes to `system.species` | `character-actor.js:141` prefers `system.species` |
| Gender | `system.gender` OR `flags.swse.character.gender` | ✓ (both paths) | Both supported, flags preferred for UI | `character-actor.js:142` reads system, v2 sheet uses flags |
| Background Name | `system.background?.name` OR `system.background` (string) | — | Background helper writes to `system.background` | `character-actor.js:143` uses canonical path |
| Background Category Fields | `system.event`, `system.profession`, `system.planetOfOrigin` | ✓ (category inputs) | Background helper writes these | `character-data-model.js:207-209` defines all three |
| Age | `flags.swse.character.age` | ✓ | Flags preferred for metadata | Not in system, custom metadata only |
| Height | `flags.swse.character.height` | ✓ | Flags preferred | Not in system |
| Weight | `flags.swse.character.weight` | ✓ | Flags preferred | Not in system |
| Size | `system.size` | — | Actor data model | `actor-data-model.js:120` |

**Identity View-Model**: `buildIdentityViewModel()` in `character-sheet/context.js:94-117` returns:
- `className`, `classDisplay`, `species`, `background`, `homeworld`, `profession`, `gender`, `age`, `height`, `weight`, `level`, `size`

**Current Issues**:
1. **Line 23, character-record-header.hbs**: `name="system.class"` writes to scalar string field, but schema owns class in `progression.classLevels`
2. **Line 31, character-record-header.hbs**: `name="system.race"` should be `system.species` (canonical path per helper)
3. **Line 85, character-record-header.hbs**: `name="system.event"` with label "Background" is ambiguous — should be `system.background` or relabel to "Event"

---

### Health & Damage

| Property | Canonical Path | Writable | Derived | Source |
|---|---|---|---|---|
| Current HP | `system.hp.value` | ✓ | — | `character-data-model.js:140` |
| Max HP | `system.hp.max` | — | ✓ (ActorEngine.recomputeHP) | Computed only, never user-editable |
| Temp HP | `system.hp.temp` | ✓ | — | `character-data-model.js:140-143` |
| HP Bonus (Base) | `system.hp.bonus` | ✓ | — | `character-data-model.js:143` |
| Damage Reduction | `system.damageReduction` | ✓ | — | Separate field from damage threshold |
| Damage Threshold | `system.derived.damageThreshold` | — | ✓ (DerivedCalculator) | Never write to this; use formula settings |
| Condition Track Current | `system.conditionTrack.current` | ✓ | — | `character-data-model.js:149` (0-5 range) |
| Condition Track Persistent | `system.conditionTrack.persistent` | ✓ | — | `character-data-model.js:150` boolean flag |

**Condition Penalty Mapping**:
- Current 0 → No penalty
- Current 1 → -1
- Current 2 → -2
- Current 3 → -5
- Current 4 → -10
- Current 5 → Helpless (non-combatant)

**Health View-Model**: `buildHpViewModel()` returns:
- `current`, `max`, `temp`, `percent`, `label`, `filledSegments`

---

### Combat Stats & Attacks

| Property | Canonical Path | Writable | Derived | Source |
|---|---|---|---|---|
| Base Attack Bonus | `system.derived.bab` | — | ✓ (DerivedCalculator) | `schema-adapters.js:15`, `character-actor.js:157` has fallback |
| Initiative Total | `system.derived.initiative.total` | — | ✓ | `schema-adapters.js:17`, NOT `skills.initiative` |
| Speed (Flat) | `system.speed` | ✓ (species helper) | — | `character-data-model.js:123`, flat number not object |
| Effective Speed | Computed from `system.speed` + modifiers | — | ✓ | May apply mount override or penalties |
| Attacks List | `system.derived.attacks.list` | — | ✓ (mirrors owned weapon items) | Authoritative read-only list |

**Current Issues**:
- PanelContextBuilder.js:976-978 treats `system.baseAttackBonus` as authoritative editable BAB, but SchemaAdapters canonical is `system.derived.bab` (derived, read-only)
- **Phase 1 decision needed**: Is BAB user-editable (needs explicit field) or always computed? Currently ambiguous.

---

### Resources & Points

| Property | Canonical Path | Writable | Source |
|---|---|---|---|
| Force Points Current | `system.forcePoints.value` | ✓ | `character-data-model.js:184-187` |
| Force Points Max | `system.forcePoints.max` | — | `character-data-model.js:184-187` (computed) |
| Destiny Points Current | `system.destinyPoints.value` | ✓ | `character-data-model.js:190-193` |
| Destiny Points Max | `system.destinyPoints.max` | — | `character-data-model.js:190-193` (computed) |
| Force Sensitivity Flag | `system.forceSensitive` (computed boolean) | — | — | Derived from class/talent items |
| Force Point Die | `system.forcePointDie` | ✓ (string) | — | **ISSUE**: Not in FORM_FIELD_SCHEMA, no coercion |
| Credits | `system.credits` OR `system.droidSystems.credits.*` for droids | ✓ | Character data model or droid budget |
| Inventory | Item-backed (weapons, armor, gear) | ✓ | Owned items collection |

**Current Issues**:
1. **Line 55, resources-panel.hbs**: `system.forcePointDie` lacks schema entry
2. **Line 85, resources-panel.hbs**: Uses raw `actor.system.credits` read instead of view-model `resourcesPanel.resources.credits`

**Resources View-Model** (PanelContextBuilder.buildResourcesPanel):
- `combatMetrics: { bab, initiative, speed }`
- `resources: { forcePoints, destinyPoints }` — **currently lacks `credits`**

---

### Skills

| Property | Canonical Path | Writable | Source |
|---|---|---|---|
| Skill Trained | `system.skills.<skill>.trained` | ✓ | `character-data-model.js:31-43` |
| Skill Focused | `system.skills.<skill>.focused` | ✓ | `character-data-model.js:31-43` |
| Skill Misc Mod | `system.skills.<skill>.miscMod` | ✓ | `character-data-model.js:31-43` |
| Skill Selected Ability | `system.skills.<skill>.selectedAbility` | ✓ | `character-data-model.js:31-43` |
| Skill Total (Derived) | `system.derived.skills.<skill>.total` | — | DerivedCalculator |
| Custom Skill | `system.customSkills[]` | ✓ (array item) | `character-data-model.js:125-136` |

**Custom Skill Schema**:
```
{
  id: string,
  label: string,
  ability: string,
  trained: boolean,
  focused: boolean,
  miscMod: number,
  notes: string (optional)
}
```

**Current Issues**:
1. Custom skill fields are defined in schema but not in FORM_FIELD_SCHEMA, no form coercion support
2. Legacy v2 skills panel reads `system.customSkills` raw instead of normalized panel field

---

### Biography & Notes

| Property | Canonical Path | Writable | Source |
|---|---|---|---|
| Biography/Notes (Primary) | `system.biography` | ✓ | `character-data-model.js:204` |
| Notes (Legacy Name) | `system.notes` (if present) | ✓ | Legacy templates may use this |
| Background Categories | `system.event`, `system.profession`, `system.planetOfOrigin` | ✓ | Background fields |

**Current Issues**:
1. **concept notes-panel.hbs:9,11**: Uses `system.notes` both for input and raw read, but this field is not in FORM_FIELD_SCHEMA
2. **concept summary-tab.hbs:86,88**: Same issue with `system.notes`
3. **legacy v2 notes-panel.hbs:8**: Uses raw `system.notes` with no view-model fallback

**Biography View-Model** (PanelContextBuilder.buildBiographyPanel):
- Already maps `system.notes` to `biographyPanel.biography` (lines 321-322)
- But concept partials read raw `system.notes` instead of using this mapping

---

### Force Sensitivity & Special Abilities

| Property | Canonical Path | Derived | Source |
|---|---|---|---|
| Force Sensitive (Derived) | `system.derived.forceSensitive` (boolean) | ✓ | Computed from character abilities/talents |
| Racial Abilities | `system.derived.racialAbilities[]` | ✓ | Mirrored from species/droid traits |
| Dark Side Score | Computed by DSPEngine | ✓ | `character-actor.js:159` |

**Current Issues**:
1. **character-sheet.hbs:74 and sheet-surface.hbs:39**: Uses raw `actor.system.forceSensitive` instead of prepared `forceSensitive` view-model
2. No direct definition visible in schema; appears to be derived/computed on demand

**Character Sheet Context Exposure**:
- `character-sheet.js:2218-2220` and `2911-2913` expose top-level `forceSensitive` on sheet context
- Concept templates should use `{{#if forceSensitive}}` directly

---

### Form Field Schema Coverage

**FORM_FIELD_SCHEMA in character-sheet.js:159-240** currently includes:
```
✓ system.hp.value, system.hp.max, system.hp.temp, system.hp.bonus
✓ system.conditionTrack.current
✓ system.damageReduction
✓ system.baseAttackBonus (legacy BAB, but conflicted)
✓ system.secondWind.*
✓ system.abilities.*
✓ system.defenses.*
✓ system.skills.<skill>.miscMod
✓ system.level
✓ system.xp.total
✓ system.credits
✓ system.speed
✓ system.destinyPoints.*
✓ system.forcePoints.*

✗ system.forcePointDie (NOT INCLUDED)
✗ system.notes (NOT INCLUDED)
✗ system.species (NOT INCLUDED)
✗ system.background (NOT INCLUDED if separate from identity)
✗ system.customSkills[] pattern (NOT INCLUDED)
```

**Issues**:
- Missing schema entries cause form fields to receive string/number coercion drift
- No pattern matching for custom skills array elements

---

## Phase 1: Safe Patch Scope

The following issues are **safe to patch in Phase 1** (no dependencies on unresolved contracts):

### 1. Force Sensitivity Flag — SAFE ✓
**File**: `templates/actors/character/v2-concept/character-sheet.hbs:74` and `sheet-surface.hbs:39`
- **Current**: `{{#if actor.system.forceSensitive}}`
- **Fix**: `{{#if forceSensitive}}`
- **Reason**: Sheet already exposes `forceSensitive` as top-level view model (character-sheet.js:2911-2913)
- **No Side Effects**: Pure read, no data mutation

### 2. Species/Race Path — SAFE ✓
**File**: `templates/actors/character/v2-concept/partials/panels/character-record-header.hbs:31`
- **Current**: `name="system.race"` with display `{{biographyPanel.identity.species}}`
- **Fix**: `name="system.species"` (canonical per apply-canonical-species-to-actor.js:159-164)
- **Reason**: Helper writes to `system.species`, not `system.race`; `system.race` is backward-compat only
- **Side Effect**: Updates species write path to canonical name

### 3. Credits View-Model Read — SAFE ✓
**File**: `templates/actors/character/v2-concept/partials/panels/resources-panel.hbs:85`
- **Current**: `value="{{actor.system.credits}}"` (raw read)
- **Fix**: `value="{{resourcesPanel.resources.credits}}"` (or equivalent)
- **Reason**: Sheet context builder already has opportunity to prepare this in resourcesPanel
- **Dependency**: Requires adding `credits` to resourcesPanel.resources in PanelContextBuilder.js:1002-1008

### 4. Notes Field Coverage — SAFER ✓
**Files**: `resources-panel.hbs:9,11` and `summary-tab.hbs:86,88`
- **Current**: Raw `system.notes` reads and form input `name="system.notes"`
- **Fix**: 
  - For display: Use `{{biographyPanel.biography}}` or dedicated `notesPanel.notes`
  - For input: Keep `name="system.notes"` but add to FORM_FIELD_SCHEMA
- **Reason**: Biography panel already maps notes (character-sheet/context.js:321-322)
- **Dependency**: Add `system.notes: 'string'` to FORM_FIELD_SCHEMA

### 5. Force Point Die Schema — SAFE ✓
**File**: `templates/actors/character/v2-concept/partials/panels/resources-panel.hbs:55`
- **Current**: `name="system.forcePointDie"` (no schema support)
- **Fix**: Add `system.forcePointDie: 'string'` to FORM_FIELD_SCHEMA
- **Reason**: Field is already defined in character-data-model.js; just missing form coercion
- **No Template Change Needed**: Input binding is correct, just needs schema entry

---

## Phase 1: BLOCKED Items (Unresolved Contracts)

The following issues **require contract resolution before patching**:

### 1. Class Scalar Write — BLOCKED ✗
**File**: `character-record-header.hbs:23`
- **Current**: `name="system.class"` writes to scalar string field
- **Issue**: Actor model owns class in `system.progression.classLevels` (array); scalar `system.class` is legacy alias
- **Status**: `character-actor.js:135` uses fallback chain but does not write to scalar `system.class`
- **Decision Needed**: Should UI input write to:
  - Option A: Keep `system.class` scalar (legacy compatibility, but drifts from progression)
  - Option B: Read-only display from `derived.identity.classDisplay` + selector-driven update via `cmd-select-class` handler
  - Option C: Dedicated override field like `system.classOverride` that takes priority in display
- **Recommendation**: Option B — remove scalar write, make field read-only with selector button

### 2. Background/Event Ambiguity — BLOCKED ✗
**File**: `character-record-header.hbs:84-85`
- **Current**: Label "Background" but `name="system.event"` and value `{{biographyPanel.identity.background}}`
- **Issue**: Mismatch between UI label (Background) and data path (event category field)
- **Schema**: Background helper writes `system.background` (overall) + category fields (`system.event`, `system.profession`, `system.planetOfOrigin`)
- **Decision Needed**: Should input edit:
  - Option A: `system.background` for overall background name
  - Option B: `system.event` for the event-specific category only
- **Recommendation**: Option A — change to `name="system.background"` to match label

### 3. Ability Score Paths: `abilities` vs `attributes` — BLOCKED ✗
**Files**: All ability input fields (abilities-panel.hbs, abilities-tab.hbs)
- **Current**: `name="system.abilities.<ability>.*"`
- **Conflict**: 
  - `SchemaAdapters.js:12` header says canonical is `system.attributes[ABILITY].base`
  - But `actor-data-model.js:14-56` defines persistent as `system.abilities[ABILITY]`
  - And `character-data-model.js:119` also defines `system.attributes` (parallel structure)
- **Status**: Schema has BOTH paths; code currently uses `system.abilities`
- **Decision Needed**: What is the true persistent SSOT?
  - Option A: `system.abilities.*` is canonical persistent (current active path)
  - Option B: `system.attributes.*` is canonical persistent (future target, requires migration)
  - Option C: Keep both for compatibility, prefer one in code (current state)
- **Impact**: Changing this affects ActorEngine, data models, migrations, form schema, and all ability partials
- **Recommendation**: Leave unchanged for Phase 1. Mark as TODO. Resolve in dedicated Phase 4 migration planning.

### 4. BAB Contract Ambiguity — BLOCKED ✗
**Files**: `character-sheet.js:110` and `resources-panel.hbs:34`
- **Current State**: 
  - `SchemaAdapters.js:15` says canonical is `system.derived.bab` (read-only)
  - But `PanelContextBuilder.js:976-978` treats `system.baseAttackBonus` as authoritative editable BAB
  - And `character-sheet.js:110` displays from derived `bab` with fallback to legacy paths
- **Issue**: No clear BAB write target; conflicts between editable and derived
- **Decision Needed**: Is BAB user-editable or always computed?
  - Option A: BAB is always derived, read-only (matches schema-adapters); remove editable field
  - Option B: BAB has explicit editable override field (e.g., `system.babOverride`) with computed fallback
  - Option C: Keep legacy `system.baseAttackBonus` as override if it exists, compute final in engine
- **Recommendation**: Option A recommended. Tighten to read-only `derived.bab` in Phase 1. Create issue for BAB override design if needed.

---

## Phase 2: Context Builder Updates

These changes should be made in support files, not partials:

### 1. Add `credits` to Resources Panel
**File**: `scripts/sheets/v2/context/PanelContextBuilder.js:1002-1008`
```javascript
// Before
resourcesPanel.resources = {
  forcePoints: { value: fpVal, max: fpMax },
  destinyPoints: { value: dpVal, max: dpMax }
};

// After
resourcesPanel.resources = {
  forcePoints: { value: fpVal, max: fpMax },
  destinyPoints: { value: dpVal, max: dpMax },
  credits: Number(this.system.credits) || 0
};
```

### 2. Update Identity View-Model
**File**: `scripts/sheets/v2/character-sheet/context.js:104`
- Change line 104 from:
  ```javascript
  species: identity.species ?? system.race ?? system.species?.name ?? system.species ?? '—',
  ```
- To prefer `system.species` first:
  ```javascript
  species: identity.species ?? system.species?.name ?? system.species ?? system.race ?? '—',
  ```

### 3. Extend FORM_FIELD_SCHEMA
**File**: `scripts/sheets/v2/character-sheet.js:159-240`
Add entries for:
```javascript
system.forcePointDie: 'string',
system.notes: 'string',
system.species: 'string',
system.background: 'string',
// Custom skills pattern (if schema/form engine supports patterns)
'system.customSkills[].label': 'string',
'system.customSkills[].ability': 'string',
'system.customSkills[].trained': 'boolean',
'system.customSkills[].focused': 'boolean',
'system.customSkills[].miscMod': 'number',
'system.customSkills[].notes': 'string'
```

---

## Legacy v2 Findings (Lower Priority)

The legacy `templates/actors/character/v2/` partials contain the same issues as concept, plus inventory card normalization drift. These should be patched only if they are still registered and in use:

- **character-record-header.hbs**: Same class/race/event issues as concept
- **resources-panel.hbs**: Same BAB ambiguity and credits issues
- **identity-strip.hbs**: Reads raw `system.speciesCustomName` instead of view-model
- **inventory-panel.hbs**: Reads raw `actor.system.credits` instead of view-model
- **notes-panel.hbs**: Same `system.notes` schema/view-model issues
- **skills-panel.hbs**: Same custom skills view-model issues
- **abilities-panel.hbs**: Same ability paths issue
- **inventory-weapon-card.hbs**: Mixes raw item system with old aliases (`meleeOrRanged`, `damageDice`, `damageDiceType`, `damageBonus`, `criticalMultiplier`)
- **inventory-armor-card.hbs**: Mixes raw item system with aliases (`isPowered` vs `isPoweredArmor`, `maxDexBonus` vs `maxDex`)
- **languages-panel.hbs**: Smart quotes in form field names can break binding
- **force-powers-known-panel.hbs** and related: Raw item system reads instead of normalized panel fields

---

## Recommended Phase 1 Patch Order

1. **Highest Value First** (data integrity issues):
   - Force sensitivity flag (safe, pure read)
   - Species path (safe, canonical source exists)
   - Credits view-model (safe, context builder support exists)
   - Notes field schema (safe, low risk)

2. **Support Code** (enable template fixes):
   - Add `credits` to resourcesPanel
   - Update identity view-model species preference
   - Extend FORM_FIELD_SCHEMA

3. **Blocked Until Resolution**:
   - Class scalar write → Decision on read-only vs override
   - Background/event ambiguity → Decision on field ownership
   - Ability paths → Decision on `abilities` vs `attributes` canonical
   - BAB contract → Decision on editable vs always-derived

---

## Grep Targets for Phase 3 Validation

After patching, grep for these patterns to verify cleanup:

```bash
# 1. Verify forceSensitive reads use view-model
grep -r "actor\.system\.forceSensitive" templates/actors/character/v2-concept/

# 2. Verify species path is canonical
grep -r "system\.race" templates/actors/character/v2-concept/

# 3. Verify credits reads use view-model
grep -r "actor\.system\.credits" templates/actors/character/v2-concept/

# 4. Verify system.notes reads use view-model
grep -r "system\.notes" templates/actors/character/v2-concept/

# 5. Verify no raw system reads in concept partials (spot check)
grep -r "actor\.system\.\w" templates/actors/character/v2-concept/ | grep -v "forceSensitive\|credits\|biography"
```

---

## Notes for Phase 4: Full Migration Planning

After Phase 1 patch, Phase 4 should address:

1. **Ability Score Unification**: Reconcile `system.abilities.*` vs `system.attributes.*`
   - Audit all uses: actor-engine, data-models, form-schema, migrations, progressions
   - Choose canonical: `system.attributes.*` (matches SchemaAdapters header) or keep `system.abilities.*` (current active)?
   - Plan migration: backward-compat window, old-path readers, new-path writers
   - Update all consumers together

2. **Class Identity Contract**: Remove scalar `system.class` writes
   - Finalize whether class identity is read-only display or overrideable
   - If read-only: implement selector-based class change via `cmd-select-class` handler
   - If overrideable: design explicit override field and precedence

3. **Background/Event Disambiguation**: Clarify category field ownership
   - Decide whether record-header edits overall background or just event category
   - Update label/path consistency across all partials
   - Ensure background helper updates match UI expectations

4. **BAB Design**: Clarify whether BAB is editable or derived
   - Remove legacy `system.baseAttackBonus` scalar write if BAB is always computed
   - Or design explicit `system.babOverride` if manual editing is needed

5. **Form Schema Completeness**: Add missing entries
   - Ensure all form inputs have schema support for proper coercion
   - Support custom skills array patterns in form schema

---

## Summary: Issues by Severity

### CRITICAL (Data Integrity Risk)
- Class scalar write (`system.class`) — drifts from progression source of truth
- Background/event mismatch — label/path inconsistency could confuse users

### HIGH (Sheet/View Contract Violations)
- Force sensitivity raw read — breaks view-model contract
- Credits raw read — breaks view-model contract
- BAB editable/derived ambiguity — conflicting contracts

### MEDIUM (Schema Coverage Gaps)
- `system.notes` not in FORM_FIELD_SCHEMA — form coercion drift
- `system.forcePointDie` not in FORM_FIELD_SCHEMA — form coercion drift
- Custom skills pattern not in FORM_FIELD_SCHEMA — array item coercion unsupported

### LOW (Legacy Drift, Non-Active Templates)
- Legacy v2 partials — lower priority if not in active use
- Inventory card aliases — should normalize or retire

---

## Next Steps

**Proceed to Phase 1 when ready to patch:**
1. Replace `actor.system.forceSensitive` with `forceSensitive` (2 files)
2. Change `system.race` to `system.species` (1 file)
3. Update identity view-model species preference (1 file)
4. Add `credits` to resourcesPanel (1 file)
5. Add missing entries to FORM_FIELD_SCHEMA (1 file)
6. (Optional) Replace raw `system.notes` reads with view-model (2 files)

**Create follow-up issues for Phase 2-4:**
- Issue: Resolve ability score canonical paths (`abilities` vs `attributes`)
- Issue: Design class identity contract (read-only vs override)
- Issue: Clarify background/event field ownership
- Issue: Clarify BAB contract (editable vs derived)
