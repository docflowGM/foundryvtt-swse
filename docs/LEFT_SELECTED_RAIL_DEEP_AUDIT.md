# Left Selected Rail Deep Audit — Defect Report

**Date:** 2026-03-28
**Scope:** Left selected rail implementation, projection integration, refresh wiring
**Auditor Finding:** 7 concrete defects found, 5 critical, 2 medium
**Status:** Ready for repair

---

## Executive Summary

The left selected rail implementation is structurally sound but has **critical projection integration bugs** that prevent it from rendering attributes, languages, credits, and subtype-specific sections (beast, droid, nonheroic) correctly. These are NOT design issues but concrete data-flow defects where the projection contract doesn't match template/context consumption.

**All issues are repairable with minimal, surgical fixes to projection and context builders.**

---

## Defects Found

### CRITICAL DEFECT #1: ProjectionEngine Async/Await Bug

**Severity:** CRITICAL - Silently breaks subtype-specific projections

**Location:** `projection-engine.js:36-78`, specifically line 65-68

**Problem:**
```javascript
// projection-engine.js (line 36)
static buildProjection(progressionSession, actor) {  // NOT async
  try {
    // ...
    const adapter = progressionSession.subtypeAdapter;
    let finalProjection = projection;
    if (adapter) {
      finalProjection = await adapter.contributeProjection(projection, progressionSession, actor);
      // ↑ await used but buildProjection is not async!
    }
```

**Impact:**
- Async/await without async function is a syntax error (unless this file uses a transpiler)
- Even if transpiled, the promise won't be awaited; adapter contributions (beast, droid, nonheroic data) **won't be included**
- Result: `projection.beast`, `projection.droid`, `projection.nonheroic` will be `undefined/null`
- Left rail won't show Beast Profile, Droid Build, or Profession sections for those paths

**Evidence:**
- SelectedRailContext._buildBeastSection expects `projection.beast` (line 428)
- SelectedRailContext._buildDroidSection expects `projection.droid` (line 401)
- SelectedRailContext._buildNonheroicSection expects `projection.nonheroic` (line 452)
- ProjectionEngine only has `_projectDroid`, no `_projectBeast` or `_projectNonheroic` (lines 36-54)
- Subtype-specific data must come from adapter, which is never properly awaited

**Fix Required:**
- Mark ProjectionEngine.buildProjection as `async`
- Ensure caller (SelectedRailContext.buildSnapshot) is also async or uses `.then()` chaining
- Test with beast/droid/nonheroic paths to verify adapter contributions appear

**Repair Difficulty:** Medium (requires making buildSnapshot async, which affects render flow)

---

### CRITICAL DEFECT #2: Attributes Structure Mismatch

**Severity:** CRITICAL - Breaks attribute rendering

**Location:**
- Projection: `projection-engine.js:103-117` (_projectAttributes)
- Context: `selected-rail-context.js:232-268` (_buildAttributesSection)
- Template: `selected-rail.hbs:76-88` (compact grid rendering)

**Problem:**

ProjectionEngine returns:
```javascript
// projection-engine.js line 103-117
static _projectAttributes(draftSelections) {
  return {
    str: attrSelection.values.str || 10,    // ← scalar value
    dex: attrSelection.values.dex || 10,    // ← scalar value
    // ...
  };
}
```

But SelectedRailContext expects:
```javascript
// selected-rail-context.js line 250-254
if (attrs[key]?.score !== undefined) {
  items.push({
    label: abilityLabels[key],
    value: attrs[key].score,           // ← expects .score property
    modifier: attrs[key].modifier,     // ← expects .modifier property
```

**Impact:**
- `attrs[key].score` will be `undefined` for all attributes
- Condition `attrs[key]?.score !== undefined` will always fail
- Items array will be empty
- Attributes section won't render

**Evidence:**
```javascript
// Real test: If attrs = { str: 14, dex: 12 }
// Then attrs.str = 14 (scalar)
// And attrs.str.score = undefined ✗
// And attrs.str.modifier = undefined ✗
```

**Root Cause:**
- Projection needs to compute modifiers (from ability score rules: (score - 10) / 2, rounded down)
- Projection should wrap attributes in object format: `{ str: { score: 14, modifier: 2 }, ... }`
- SelectedRailContext assumes normalized format with both score and modifier

**Fix Required:**
- Update ProjectionEngine._projectAttributes to:
  1. Extract raw scores from draftSelections
  2. Compute modifier for each score
  3. Return normalized format: `{ str: { score: 14, modifier: 2 }, ... }`

**Repair Difficulty:** Low (add modifier computation math)

---

### CRITICAL DEFECT #3: Languages Mapping Inconsistency

**Severity:** CRITICAL - Renders "[object Object]" instead of language names

**Location:**
- Projection: `projection-engine.js:181-196` (_projectLanguages)
- Context: `selected-rail-context.js:359-373` (_buildLanguagesSection)

**Problem:**

ProjectionEngine returns:
```javascript
// projection-engine.js line 187-195
return languagesSelection.map(lang => {
  if (typeof lang === 'string') {
    return { id: lang, name: lang };  // ← returns object
  }
  return {
    id: lang.id || lang,
    name: lang.name || lang.id || lang,
  };  // ← returns object
});
```

But SelectedRailContext treats it as string:
```javascript
// selected-rail-context.js line 367-369
items: projection.languages.map(lang => ({
  label: lang,  // ← expects string, but lang is { id, name }
  isCurrent: currentStepId === 'languages',
})),
```

**Impact:**
- `label: lang` becomes `label: "[object Object]"`
- Template renders "[object Object]" for each language
- UI shows nonsense instead of language names

**Evidence:**
```javascript
// Real test: if projection.languages = [{ id: 'basic', name: 'Basic' }]
// Then lang = { id: 'basic', name: 'Basic' }
// And label: lang → label: "[object Object]" ✗
```

**Inconsistency Note:**
- Summary step has same issue but handles it differently:
  ```javascript
  // summary-step.js
  .map(lang => lang.id || lang.name || lang)  // ← correctly extracts name/id
  ```
- This proves context builder is wrong, not the projection

**Fix Required:**
- Change SelectedRailContext._buildLanguagesSection to extract name/id properly:
  ```javascript
  items: projection.languages.map(lang => ({
    label: lang.name || lang.id || lang,  // ← extract name, not stringify object
    isCurrent: currentStepId === 'languages',
  })),
  ```

**Repair Difficulty:** Low (one-line fix)

---

### CRITICAL DEFECT #4: Credits Not Computed in Projection

**Severity:** CRITICAL - Credits section always empty

**Location:**
- Projection: `projection-engine.js:222-228` (_projectDerived)
- Context: `selected-rail-context.js:379-394` (_buildCreditsSection)

**Problem:**

SelectedRailContext looks for:
```javascript
// selected-rail-context.js line 380
if (projection.derived?.credits === undefined || projection.derived.credits === null) {
  return null;
}
```

But ProjectionEngine._projectDerived returns:
```javascript
// projection-engine.js line 222-228
static _projectDerived(draftSelections, session) {
  return {
    warnings: this._computeProjectionWarnings(draftSelections, session),
    grants: {},
    projectStatus: 'complete',
    // ↑ NO credits field!
  };
}
```

**Impact:**
- `projection.derived.credits` is always `undefined`
- `_buildCreditsSection` always returns `null`
- Credits section never renders in chargen paths
- User can't see their available credit pool during equipment step

**Evidence:**
- Chargen paths SHOULD show credits (documented in SNAPSHOT_MODEL.md)
- But `_buildCreditsSection` filters out empty sections (line 185 in selected-rail-context.js)
- Since section is always null, credits are never shown

**Design Question:**
- Where do credits come from? Class/background selection? Hardcoded?
- This is a projection design gap, not just a missed field

**Fix Required:**
- Add credits computation to ProjectionEngine._projectDerived
- Source credits from: draftSelections.class + draftSelections.background (likely)
- Return normalized: `derived: { credits: 1500, warnings: [...], grants: {}, projectStatus: 'complete' }`
- May require access to item definitions to look up credit values

**Repair Difficulty:** Medium (need credit computation logic)

---

### CRITICAL DEFECT #5: Beast Projection Missing

**Severity:** CRITICAL - Beast profile won't render for beast paths

**Location:**
- Projection: `projection-engine.js:36-54` (no _projectBeast method)
- Context: `selected-rail-context.js:427-445` (_buildBeastSection)
- Async bug above (#1) is root cause

**Problem:**

SelectedRailContext expects:
```javascript
// selected-rail-context.js line 427-436
static _buildBeastSection(projection, currentStepId) {
  if (!projection.beast) return null;

  const items = [];
  if (projection.beast.type) {
    items.push({
      label: 'Type',
      value: projection.beast.type,
    });
  }
```

But ProjectionEngine has no beast projection:
```javascript
// projection-engine.js line 36-54
static buildProjection(progressionSession, actor) {
  const projection = {
    identity: this._projectIdentity(draftSelections),
    attributes: this._projectAttributes(draftSelections),
    skills: this._projectSkills(draftSelections),
    abilities: this._projectAbilities(draftSelections),
    languages: this._projectLanguages(draftSelections),
    droid: this._projectDroid(draftSelections),  // ← droid included
    derived: this._projectDerived(draftSelections, progressionSession),
    // ↑ NO beast projection!
  };

  // Adapter is supposed to add beast, but async/await is broken (Defect #1)
```

**Impact:**
- `projection.beast` is `undefined/null`
- Beast Profile section doesn't render for beast paths
- User can't see their beast type during levelup

**Evidence:**
- SNAPSHOT_MODEL.md says "Beast Profile section (beast paths only)"
- Selected-rail-context.js has _buildBeastSection for this
- But projection has no beast data

**Dependencies:**
- Fixes to Defect #1 (async/await bug) will allow adapter to contribute beast data
- If adapter doesn't exist or is incomplete, may need fallback logic

**Repair Difficulty:** High (depends on fixing #1, may need adapter investigation)

---

### CRITICAL DEFECT #6: Nonheroic Projection Missing

**Severity:** CRITICAL - Profession section won't render for nonheroic paths

**Location:**
- Projection: `projection-engine.js:36-54` (no _projectNonheroic method)
- Context: `selected-rail-context.js:452-470` (_buildNonheroicSection)
- Async bug above (#1) is root cause

**Problem:**

SelectedRailContext expects:
```javascript
// selected-rail-context.js line 452-462
static _buildNonheroicSection(projection, currentStepId) {
  if (!projection.nonheroic) return null;

  const items = [];
  if (projection.nonheroic.profession) {
    items.push({
      label: 'Profession',
      value: projection.nonheroic.profession,
    });
  }
```

But ProjectionEngine has no nonheroic projection:
```javascript
// projection-engine.js line 36-54
static buildProjection(progressionSession, actor) {
  const projection = {
    // ... no nonheroic field
  };
  // Adapter is supposed to add nonheroic, but async/await is broken (Defect #1)
```

**Impact:**
- `projection.nonheroic` is `undefined/null`
- Profession section doesn't render for nonheroic paths
- User can't see their selected profession during nonheroic chargen/levelup

**Evidence:**
- SNAPSHOT_MODEL.md says "Profession section (nonheroic paths only)"
- Selected-rail-context.js has _buildNonheroicSection
- But projection has no nonheroic data

**Dependencies:**
- Fixes to Defect #1 (async/await bug) will allow adapter to contribute nonheroic data

**Repair Difficulty:** High (depends on fixing #1, may need adapter investigation)

---

### MEDIUM DEFECT #7: Subtype Detection May Miss Edge Cases

**Severity:** MEDIUM - Beast/nonheroic detection could fail silently

**Location:** `selected-rail-context.js:106-134` (_detectSubtype)

**Problem:**

Subtype detection has multiple fallback checks:
```javascript
// selected-rail-context.js line 106-134
static _detectSubtype(actor, session) {
  if (session.subtype) return session.subtype;  // Already set

  // Check for droid
  if (actor.flags?.swse?.droidData || session.droidContext?.isDroid) {
    return 'droid';
  }

  // Check for beast
  if (actor.flags?.swse?.beastData || session.beastContext?.isBeast) {
    return 'beast';
  }

  // Check for nonheroic (by class item)
  const hasNonheroicClass = actor.items?.some(
    item => item.type === 'class' && item.system?.isNonheroic === true
  );
  if (hasNonheroicClass) {
    return 'nonheroic';
  }

  // Check for follower
  if (session.followerContext?.isFollower) {
    return 'follower';
  }

  return 'actor'; // Default
}
```

**Potential Issues:**
1. **Order matters:** If both droid AND beast flags exist, droid wins (may be intended)
2. **Stale actor data:** Reading actor.items could show old items if actor wasn't refreshed
3. **No validation:** If detection returns wrong subtype, rail renders wrong sections silently
4. **Session fallback missing:** If session.beastContext is set but actor flags aren't, depends on context availability

**Risk Level:** Medium - unlikely to fail in normal paths, but edge cases during complex transitions could cause wrong rail composition

**Evidence:**
- Nonheroic detection relies on actor.items having a class item with isNonheroic flag
- If class item hasn't been synced to actor yet (during early progression), detection fails
- Beast/droid detection relies on flags OR context; if both are missing, returns 'actor' (wrong)

**Fix Consideration:**
- Not blocking (defaults to 'actor' which is safe)
- Could add logging/warnings for debugging subtype mismatches
- Should be documented as "subtype must be set early or flags must be synced"

**Repair Difficulty:** Low (not critical, but could add validation logging)

---

## Summary of Defects by Category

### Data Contract Mismatches
- Defect #2: Attributes (scalar vs { score, modifier })
- Defect #3: Languages (object vs string)
- Defect #4: Credits (missing field)

### Missing Projections
- Defect #5: Beast (missing method, blocked by Defect #1)
- Defect #6: Nonheroic (missing method, blocked by Defect #1)

### Async/Await Issues
- Defect #1: buildProjection not async (blocks #5, #6)

### Edge Cases / Validation
- Defect #7: Subtype detection edge cases

---

## Test Cases That Would Catch These Defects

**Test: Chargen with attributes visible**
- Navigate to Attributes step
- Expected: See STR 14, DEX 12, etc. with modifiers (+2, -1, etc.)
- Actual (before fix): Empty attributes section or "[object Object]"
- **Catches:** Defect #2

**Test: Languages rendering**
- Navigate to Languages step after species selection
- Expected: See "Basic", "Durese", "Ewokese"
- Actual (before fix): See "[object Object]", "[object Object]", "[object Object]"
- **Catches:** Defect #3

**Test: Chargen equipment/credits**
- Navigate to Equipment/Credits step
- Expected: See "Credits: Available 1500 cr"
- Actual (before fix): Credits section missing/empty
- **Catches:** Defect #4

**Test: Beast chargen**
- Start chargen with beast selection
- Expected: See "Beast Profile: Type Nexu" in left rail
- Actual (before fix): Missing Beast Profile section entirely
- **Catches:** Defect #5 (and Defect #1)

**Test: Nonheroic chargen**
- Start chargen with nonheroic class
- Expected: See "Profession: Moisture Farmer" in left rail
- Actual (before fix): Missing Profession section entirely
- **Catches:** Defect #6 (and Defect #1)

---

## Repair Prioritization

1. **MUST FIX FIRST:**
   - Defect #1 (Async/await) — Blocking #5, #6
   - Defect #2 (Attributes) — Common path (chargen)
   - Defect #3 (Languages) — Common path (chargen)

2. **MUST FIX SECOND:**
   - Defect #4 (Credits) — Chargen only
   - Defect #5 (Beast) — Subtype path
   - Defect #6 (Nonheroic) — Subtype path

3. **OPTIONAL/DOCUMENT:**
   - Defect #7 (Subtype detection) — Document edge case behavior

---

## What Is Working Correctly

✅ **Refresh wiring:** _onCommitItem → _rebuildProjection → render is correct
✅ **Context structure:** buildSnapshot signature and return contract are sound
✅ **Template consumption:** selected-rail.hbs correctly renders context
✅ **Section filtering:** Empty sections are correctly filtered out
✅ **Current-step highlighting:** isCurrent flags propagate correctly
✅ **Path-aware composition:** Section selection logic per path is correct
✅ **Identity section:** Species/class/background from projection renders correctly
✅ **Skills section:** Trained skills array renders correctly
✅ **Feats/Talents sections:** Count and breakdown renders correctly
✅ **Error handling:** Try/catch and fallback snapshots are in place

---

## Conclusion

**The selected rail implementation is architecturally sound but has 5 critical data-flow bugs** that prevent attributes, languages, credits, and subtype-specific sections from rendering. These are not design flaws but **concrete mismatches between projection output and context/template expectations.**

**All defects are repairable with surgical fixes to projection-engine.js and selected-rail-context.js.** No architecture redesign needed.
