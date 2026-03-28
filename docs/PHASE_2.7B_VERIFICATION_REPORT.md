# Phase 2.7B — Beast Architecture Verification Report

## Executive Summary

Phase 2.7 handoff overstates completion. While the adapter foundation is solid and rules enforcement exists in the chargen step filtering layer, the implementation has **three critical architectural weaknesses** that prevent honest sign-off as complete:

1. **Beast is now a top-level subtype but still walks the generic chargen skeleton**
2. **Level-1 feat steps are suppressed (filtered), not omitted from owed-step computation**
3. **HP formula is asserted but not canonically implemented**

These are not fatal, but they are architectural honesty issues that need clarity and fixes.

---

## Issue 1: Beast as Top-Level Subtype (Architecture Boundary Unclear)

### Current State

ChargenShell._getProgressionSubtype() returns 'beast' as a true peer subtype:

```javascript
// Phase 2.7: Detect Beast profile (takes precedence over nonheroic)
const isBeastProfile = actor.flags?.swse?.beastData ||
                      progressionSession?.beastContext?.isBeast ||
                      progressionSession?.nonheroicContext?.isBeast === true;
if (isBeastProfile) {
  return 'beast';  // ← TOP-LEVEL SUBTYPE
}
```

**Result:** Beast is registered in ProgressionSubtypeAdapterRegistry and resolved as a true participant, not a nonheroic variant.

### Problem

**The handoff text is contradictory:**
- Says: "Beast is nonheroic-family"
- Code shows: 'beast' returned as top-level subtype, peer to 'droid', 'nonheroic', 'actor'

**What should it be?**
- **Option A:** Beast is a true top-level subtype (current code state)
  - Clear, pragmatic, works
  - Increases subtype surface area in spine
  - Honest: Beast is distinct enough to deserve its own entry

- **Option B:** Beast is a nonheroic variant routed to BeastAdapter
  - Return 'nonheroic' and let NonheroicSubtypeAdapter detect Beast profile
  - Adapter then delegates to BeastAdapter as a nested variant
  - Keeps subtype surface area smaller
  - Requires NonheroicSubtypeAdapter to know about Beast delegation

### Recommendation

**Accept Option A as the honest architecture:** Beast is a true top-level subtype.

**But then fix the handoff language:**
- Remove "nonheroic-family" framing
- Say: "Beast is a distinct INDEPENDENT subtype on parallel architecture to nonheroic"
- Clarify that it reuses nonheroic-like constraint patterns (talent suppression, ability cadence) but is not nested under nonheroic

---

## Issue 2: Level-1 Feat Steps Suppressed, Not Omitted

### Current State

ActiveStepComputer pipeline:
1. Get candidate nodes for mode+subtype
2. Evaluate activation for each
3. Filter through BeastAdapter.contributeActiveSteps()
4. BeastAdapter filters out talent steps, but **does NOT filter feat steps**

```javascript
// From beast-subtype-adapter.js
const suppressedStepIds = [
  'general-talent',
  'class-talent',
  'talent-tree-browser',
  'talent-graph',
  'force-power',
  'force-secret',
  'force-technique',
  // Note: Do NOT suppress feat steps
];
```

### Problem

**What this means:**
- ActiveStepComputer computes feat steps as "active" for Beast chargen
- BeastAdapter.contributeActiveSteps() does NOT filter them
- Feat steps appear in the step list
- Something downstream (BeastStartingFeatsStep?) suppresses them awkwardly

**This is architecturally weak** because:
- Feat steps shouldn't be computed as "owed" for Beast level 1 in the first place
- The ActiveStepComputer should not include them
- Filtering them downstream is a governance failure
- A generic beast chargen still looks like normal chargen to upstream code

### Root Cause

ActiveStepComputer uses a registry of candidate nodes per mode+subtype. If Beast chargen uses the same candidate nodes as heroic chargen, feat steps will be included.

The proper fix:
- Either Beast should have its own candidate node set in the registry (without feat steps at level 1)
- Or NonheroicStartingFeatsStep (or a Beast variant) should be the only "feats at L1" step, and it should be suppressed for Beast
- Or the owed-step computation should understand Beast and exclude feat steps

### Recommendation

**Audit and clarify:** Does the progression node registry have separate candidate nodes for Beast vs actor?

If yes: Include those node definitions in the handoff.

If no: Plan Phase 2.7C to fix this so Beast doesn't walk the generic chargen skeleton.

---

## Issue 3: HP Formula Asserted But Not Canonically Sourced

### Current State

**BeastSubtypeAdapter.contributeMutationPlan() sets:**
```javascript
suppressStartingFeats: true
```

But does NOT set any HP-related metadata. There is no Beast class defined in PROGRESSION_RULES.

**ProgressionEngineV2.#getHitDie() looks up:**
```javascript
const classData = PROGRESSION_RULES.classes?.[classId];
if (classData && classData.hitDie) {
  return classData.hitDie;
}
// Fallback: return 8
```

### Problem

**Missing canonical rule source:**
- Beast class NOT in PROGRESSION_RULES
- HP calculation has no explicit Beast branch
- If Beast class exists as an item but not in PROGRESSION_RULES, fallback returns 8 (which happens to be correct by accident)
- But there is NO PROOF that Beast HP is intentionally 1d8

**This is architecturally dishonest:**
- Handoff claims: "HP formula applies 1d8+CON (not 1d4)"
- But code path is: unregistered class → fallback to 8
- Not a canonical rule source, just luck

### Recommendation

**Choose one approach:**

**Option A: Register Beast class in PROGRESSION_RULES**
```javascript
classes: {
  // ... existing classes ...
  'Beast (Nonheroic)': {
    name: 'Beast (Nonheroic)',
    hitDie: 8,
    skillPoints: 1,  // 1+INT
    baseAttackBonus: 'beast-table',  // Custom BAB table per SWSE
    classSkills: BEAST_CLASS_SKILLS,  // 9 Beast skills
    startingFeats: [],  // No starting feats
    talentTrees: [],  // No talents
    defenses: { fortitude: 0, reflex: 0, will: 0 },  // Beast-specific
  }
}
```

Then ProgressionEngineV2 automatically handles Beast HP correctly.

**Option B: Add explicit Beast branch to ProgressionEngineV2.#getHitDie()**
```javascript
static #getHitDie(actor) {
  // Phase 2.7B: Beast has 1d8 hit die
  if (actor.flags?.swse?.beastData?.isBeast === true) {
    return 8;
  }

  // Normal class lookup
  const classId = actor.system.class?.id || ...;
  // ... rest of method
}
```

**Recommendation:** Option A is cleaner (class is the canonical source) but requires creature registry integration. Option B is pragmatic (works immediately).

---

## Issue 4: Natural Weapons Representation (Minor)

### Current State

BeastTemplate.beastData includes:
```javascript
"naturalWeapons": [
  { "name": "Bite", "damage": "1d6+Str", "type": "piercing" }
]
```

### Problem

**Unclear how natural weapons are represented at finalization:**
- Are they stored in beastData only?
- Are they converted to weapon items?
- How does damage scaling work when Beast BAB improves?
- How is the "+Str" modifier applied?

### Recommendation

Document canonical natural weapon handling:
- One: as metadata in beastData (survives finalization, external systems query it)
- Two: as weapon items (automatic scaling, standard D&D-like behavior)
- Three: both (redundant but safe)

For Phase 2.7B, just clarify which one is current.

---

## Summary of Defects

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| Beast as top-level subtype vs nonheroic-family | HIGH (honesty) | Design choice needed | Clarify in handoff; Option A is better |
| Level-1 feat steps suppressed not omitted | HIGH (architecture) | Investigate registry | Audit candidate nodes; may need Phase 2.7C |
| HP formula not canonically sourced | HIGH (rule proof) | Implement fix | Register Beast class OR add HP branch |
| Natural weapons representation | MEDIUM (design clarity) | Document | Clarify canonical form |

---

## Verification Tests Needed

Add tests proving:
1. Beast chargen does NOT compute feat steps as owed
2. Beast HP uses 1d8 via canonical source (not fallback)
3. Natural weapon handling is explicit and consistent
4. Beast is architecturally honest (either top-level or nested, not both)

---

## Recommendation for Phase 2.7B

**Do not merge Phase 2.7 as "complete" until:**

1. Beast architectural position clarified: top-level subtype or nonheroic variant?
2. Level-1 feat step handling verified: omitted vs suppressed?
3. HP formula canonically sourced: PROGRESSION_RULES or explicit branch?
4. Natural weapons representation documented: metadata, items, or both?

These are not massive rewrites, but they are honesty issues that prevent sign-off.

---

**Next step:** Return to code and fix these four gaps, then resubmit Phase 2.7B verification pass.
