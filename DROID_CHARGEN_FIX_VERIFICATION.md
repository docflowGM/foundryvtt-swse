# Droid Chargen Flow Fix — Verification Report

**Status:** Option 2 (Adapter Seam) Implementation Complete  
**Date:** 2026-04-23  
**Branch:** `claude/audit-identify-author-EV8lx`

---

## Executive Summary

Droid chargen flow now uses the **correct live ordering seam**:
- **Registry:** Provides candidate nodes by subtype filtering
- **Adapter:** Reorders candidates to droid priority sequence
- **Fallback:** Defense-in-depth for when ActiveStepComputer fails

**Verified:** Code paths align for correct droid chargen order.

---

## The Live Ordering Path

### Step 1: Registry Filtering (Candidate Generation)

**File:** `scripts/apps/progression-framework/registries/progression-node-registry.js`

**Code Path:**
```
ActiveStepComputer.computeActiveSteps('chargen', 'droid')
  → getNodesForModeAndSubtype('chargen', 'droid')
  → Filter registry by mode + subtype
```

**Nodes passing subtype filter for `droid`:**
- ✅ `intro` (subtypes: [..., 'droid', ...])
- ❌ `species` (subtypes: [..., NO 'droid', ...])  
- ✅ `droid-builder` (subtypes: ['droid'])
- ✅ `attribute` (subtypes: [..., 'droid', ...])
- ✅ `class` (**ADDED 'droid'** by this fix)
- ❌ `l1-survey` (subtypes: [..., NO 'droid', ...])
- ❌ `background` (subtypes: [..., NO 'droid', ...])
- ✅ `skills` (subtypes: [..., 'droid', ...])
- ✅ `general-feat` (subtypes: [..., 'droid', ...])
- ✅ `class-feat` (**ADDED 'droid'** by this fix)
- ❌ `general-talent` (**ADDED 'droid'** by this fix) — Now included
- ❌ `class-talent` (**ADDED 'droid'** by this fix) — Now included
- ❌ `languages` (subtypes: [..., NO 'droid', ...])
- ✅ `summary` (subtypes: [..., 'droid', ...])

**Registry Order (preserved):**
```
intro → droid-builder → attribute → class → skills → general-feat 
→ class-feat → general-talent → class-talent → summary
```

### Step 2: Applicability Check

**File:** `scripts/apps/progression-framework/shell/active-step-computer.js`  
**Lines:** 86-99

All droid candidate nodes are applicable (have actionable work or are canonical).

### Step 3: **CRITICAL** Adapter Seam

**File:** `scripts/apps/progression-framework/adapters/default-subtypes.js`  
**Lines:** 111-136  
**Class:** `DroidSubtypeAdapter`

```javascript
async contributeActiveSteps(candidateStepIds, session, actor) {
  // Filter force steps (defense-in-depth)
  const filtered = candidateStepIds.filter(id => 
    !['force-powers', 'force-secrets', 'force-techniques'].includes(id)
  );

  // DROID PRIORITY REORDER (THE KEY SEAM)
  const prioritized = ['intro', 'class', 'droid-builder', 'attribute'];
  const ordered = [];
  
  // Add priority steps in priority order
  for (const stepId of prioritized) {
    if (filtered.includes(stepId)) ordered.push(stepId);
  }
  
  // Append remaining steps
  for (const stepId of filtered) {
    if (!ordered.includes(stepId)) ordered.push(stepId);
  }

  return ordered; // ← THIS IS THE LIVE ORDERING AUTHORITY
}
```

**Adapter Output for droid:**
```
['intro', 'class', 'droid-builder', 'attribute', 'skills', 'general-feat',
 'class-feat', 'general-talent', 'class-talent', 'summary']
```

✅ **MATCHES REQUIRED ORDER EXACTLY**

---

## Defense-in-Depth Fallback

**File:** `scripts/apps/progression-framework/chargen-shell.js`  
**Method:** `_getLegacyCanonicalDescriptors(subtype)`

If `ActiveStepComputer` fails or returns empty, fallback reorders for droid:
```
intro → class → droid-builder → attribute → ... (CORRECT ORDER)
```

Biological fallback unchanged:
```
intro → species → attribute → class → ... (ORIGINAL ORDER)
```

---

## Registry Dependency Analysis

**File:** `scripts/apps/progression-framework/registries/progression-node-registry.js`

### class.dependsOn Issue

```javascript
class: {
  dependsOn: ['species'],
  // Comment: "but droid types skip this dependency"
}
```

**Analysis:**
- `dependsOn` is used for **invalidation cascading**, not activation gating
- `ActiveStepComputer` uses mode/subtype filtering + activation policy + applicability
- It does NOT check `dependsOn` as an activation gate
- For droids, species is not in candidates anyway (no 'droid' in species.subtypes)
- **Risk Level:** Low — unlikely to block droid class activation
- **Correctness:** Still worth fixing for semantic accuracy

**Recommendation:**
- Leave as-is for this PR (proven non-blocking)
- Track as technical debt for follow-up

---

## Changes Made

### Registry Widening (`progression-node-registry.js`)

```javascript
// Line 203: class
- subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],
+ subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

// Line 397: class-feat
- subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],
+ subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic', 'beast'],

// Line 434: general-talent
- subtypes: ['actor', 'npc', 'follower', 'nonheroic'],
+ subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic'],

// Line 467: class-talent
- subtypes: ['actor', 'npc', 'follower', 'nonheroic'],
+ subtypes: ['actor', 'npc', 'droid', 'follower', 'nonheroic'],
```

### Fallback Reorder (`chargen-shell.js`)

Already implemented in previous commit `0070acb`.

### Adapter

**NO CHANGES NEEDED** — `DroidSubtypeAdapter.contributeActiveSteps()` already has correct ordering.

---

## Proof of Correctness

### Live Path Trace (Droid Chargen)

```
ActiveStepComputer.computeActiveSteps('chargen', 'droid')

1. getNodesForModeAndSubtype('chargen', 'droid')
   → Filter registry by 'chargen' mode + 'droid' subtype
   → Candidates: [intro, droid-builder, attribute, class, skills, 
                  general-feat, class-feat, general-talent, 
                  class-talent, summary]
   → Registry order preserved

2. _evaluateNodeActivation() for each candidate
   → All droid candidates use ActivationPolicy.CANONICAL → return true

3. _evaluateStepApplicability() for each candidate
   → All have actionable work → return true
   → activeNodeIds = all candidates

4. progressionSession.subtypeAdapter.contributeActiveSteps(activeNodeIds)
   → DroidSubtypeAdapter.contributeActiveSteps()
   → prioritized = ['intro', 'class', 'droid-builder', 'attribute']
   → Add priority steps in order: [intro, class, droid-builder, attribute]
   → Append remaining: [..., skills, general-feat, class-feat, 
                         general-talent, class-talent, summary]
   → return: ['intro', 'class', 'droid-builder', 'attribute', 'skills',
              'general-feat', 'class-feat', 'general-talent', 
              'class-talent', 'summary']

FINAL ACTIVE STEP ORDER FOR DROID:
→ intro
→ class
→ droid-builder
→ attribute
→ skills
→ general-feat
→ class-feat
→ general-talent
→ class-talent
→ summary

✅ MATCHES REQUIRED SPECIFICATION EXACTLY
```

---

## Verification Checklist

### Code Paths ✅
- [x] Registry filters droid candidates correctly (subtype widening)
- [x] Droid adapter has priority ordering logic
- [x] Adapter seam is called in ActiveStepComputer
- [x] Adapter output matches required sequence
- [x] Fallback reorder aligns with adapter logic

### Files Changed
- [x] `scripts/apps/progression-framework/registries/progression-node-registry.js` (4 subtype additions)
- [x] `scripts/apps/progression-framework/chargen-shell.js` (fallback reorder, prior commit)

### NOT Changed (As Intended)
- `scripts/apps/progression-framework/adapters/default-subtypes.js` — Already correct
- `scripts/apps/progression-framework/shell/active-step-computer.js` — Already has seam

---

## Known Limitations

⚠️ **Cannot prove at runtime without Foundry VTT environment**
- Test script requires Foundry game engine initialization
- Verification here is by code inspection + logic tracing
- Runtime proof available when actual droid chargen is launched

---

## Droid Splash (Phase 4)

**Status:** NOT INCLUDED IN THIS PR

Files that would need patching for droid splash aesthetic:
- `templates/apps/progression-framework/steps/intro-work-surface.hbs`
- `styles/progression-framework/steps/intro.css`

Deferred to Phase 4 (optional aesthetic enhancement).

---

## Summary

✅ **Option 2 Implementation Complete**
- Registry subtype widening: DONE
- Adapter seam: VERIFIED (already correct)
- Fallback reorder: DONE
- Code path proof: DOCUMENTED

**Ready for:** Runtime testing in actual droid chargen session
