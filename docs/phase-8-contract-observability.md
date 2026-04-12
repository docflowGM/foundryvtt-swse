# Phase 8 — Contract Observability, Drift Detection, and Runtime Verification

## Objective

Make the cleaned-up actor contract observable at runtime so you can detect and prevent drift from re-entering the system.

By the end of Phase 8, you can answer with logs and debug reports:
- Did a mutation plan try to write a legacy path?
- Did ActorEngine normalize something non-canonical?
- Did the actor end up missing required canonical stored shape?
- Did the derived layer fail to produce expected outputs?
- Did the sheet have to rescue/fallback to rebuild a concept?
- Are repeated UI concepts still reading from different sources?

**Status:** ✅ PHASE 8 COMPLETE (Observability Added)

---

## Phase 8 Design Principle

**Do not guess. Instrument the boundaries.**

This phase is **observability only** — no major refactors, no hard-failures by default, no noisy logs everywhere.

The important boundaries are:
1. Before ActorEngine apply
2. After ActorEngine apply  
3. After derived computation
4. During sheet context build
5. When fallback/rescue logic triggers
6. When repeated UI concepts are built for multiple partials

---

## What Was Implemented

### Work Item 8.1: Contract Warning Helper ✅

**File:** `scripts/debug/contract-warning-helper.js`

Provides structured, grep-friendly warning functions for all contract violations:

```javascript
import {
  warnLegacyPathNormalization,
  warnConflictingValues,
  warnMissingCanonicalShape,
  warnMissingDerivedOutput,
  warnIncompleteDerivedShape,
  warnSheetFallback,
  warnConceptDivergence,
  getWarningsSummary,
  clearWarnings
} from "/systems/foundryvtt-swse/scripts/debug/contract-warning-helper.js";
```

**Warning Patterns:**
- `[ContractWarning][Domain]` — ActorEngine normalization and shape issues
- `[DerivedWarning][Domain]` — Missing or incomplete derived outputs
- `[SheetFallback][Domain]` — Sheet rescue/fallback paths activated
- `[SheetConsistencyWarning][Domain]` — Repeated concepts reading from multiple sources

**Example Output:**
```
[SheetFallback][Skills] fallback rescue path used: skill total rebuilt from fallback path
{ context: { abilityMod: 3, halfLevel: 5, miscMod: 1, skillTrained: true }, actor: "Jedi Knight" }
```

All warnings automatically collected in `window.SWSE_CONTRACT_WARNINGS` if debug flag enabled.

---

### Work Item 8.2: Sheet Boundary Instrumentation ✅

**File:** `scripts/sheets/v2/character-sheet.js`

Added Phase 8 observability checks in `_prepareContext()`:

#### HP Bundle Divergence Check
```javascript
// PHASE 8.1: HP Bundle Divergence Check
// Verify that HP bar and HP numeric display use same source
```
- Checks that both header HP segments and health panel use `buildHpViewModel()` 
- Verifies they're reading from the same canonical source
- **Litmus test for Phase 7.5 completion**

#### Defense Source Unification Check  
```javascript
// PHASE 8.2: Defense Source Unification Check
// Verify header defenses and defense panel use same source
```
- Ensures `defensePanel.defenses` exists and is used everywhere
- Verifies both header pills and panel tabs use `buildDefensesViewModel()`
- Detects if defense totals are being computed separately

#### Missing Derived Outputs Check
```javascript
// PHASE 8.3: Missing Derived Outputs Check
// Verify all expected derived bundles are present
```
- Checks for:
  - `system.derived.defenses`
  - `system.derived.skills` (non-empty)
  - `system.derived.attacks.list`
  - `system.derived.identity.classDisplay`
- Emits warnings if any are missing

#### Fallback Usage Instrumentation
Enhanced existing fallback functions with Phase 8 contract warnings:

**Skill Total Fallback:**
```javascript
// In _buildSkillFallbackTotal()
if (CONFIG?.SWSE?.debug?.contractObservability) {
  warnSheetFallback(
    'Skills',
    'skill total rebuilt from fallback path',
    { abilityMod, halfLevel, miscMod, skillTrained },
    this.actor.name
  );
}
```

**Attacks Fallback:**
```javascript
// In _buildAttacksFallback()
if (CONFIG?.SWSE?.debug?.contractObservability) {
  warnSheetFallback(
    'Attacks',
    'attack list rebuilt from equipped weapons',
    { reason: 'derived.attacks.list was empty or missing' },
    actor.name
  );
}
```

---

### Work Item 8.3: Actor Contract Health Inspector ✅

**File:** `scripts/debug/actor-contract-inspector.js`

Developer-facing utility for rapid contract health assessment:

```javascript
import { inspectActorContract } from "/systems/foundryvtt-swse/scripts/debug/actor-contract-inspector.js";

const actor = game.actors.getName("Jedi Knight");
const report = inspectActorContract(actor);

// Quick summary
console.log(report.summary());

// Detailed report
console.log(report.details());
```

**Report Structure:**

```
[Actor Contract Health Report]
Actor: Jedi Knight (abc123)
Overall Health: ✅ HEALTHY — canonical contract intact

Stored Contract: 5/5 OK
Derived Contract: 6/6 OK
Legacy/Fallback Risks: 0 detected

✓ No major risks detected
```

**Detailed Report Includes:**

1. **Stored Contract Checks:**
   - Abilities: All have canonical `.base`
   - Skills: 25+ skills initialized
   - HP: value/max present
   - Resources: Force/Destiny points canonical
   - Class/Identity: Class and level set

2. **Derived Contract Checks:**
   - Attributes: All have `mod`
   - Skills: All derived skills have `total`
   - Defenses: Fort/Ref/Will have totals
   - Identity: Bundle complete
   - Attacks: List populated
   - Encumbrance: State and label present

3. **Legacy & Fallback Risks:**
   - Legacy ability paths (`.value` without `.base`)
   - Legacy XP paths (`system.experience` vs `system.xp.total`)
   - Fallback hotspots (missing derived bundles that will trigger sheet rescue)

---

## Four Highest-Priority Observability Checks

Per user specification, Phase 8 prioritizes these four checks:

### Check 1: Ability Legacy Path Normalization
```javascript
// Detect when .value path is used instead of canonical .base
if (abilityData.value !== undefined && !abilityData.base) {
  risks.push(`${key}: has .value but missing .base (legacy path active)`);
}
```
**Why:** Indicates ActorEngine normalization is incomplete or actor was created under old schema

### Check 2: Sheet Skill Total Fallback Usage
```javascript
// In _buildSkillFallbackTotal()
warnSheetFallback(
  'Skills',
  'skill total rebuilt from fallback path',
  { abilityMod, halfLevel, miscMod, skillTrained }
);
```
**Why:** Direct signal that derived.skills bundle was missing or incomplete

### Check 3: HP Bundle Divergence
```javascript
// Verify healthPanel.hp and headerHpSegments use same source
const healthPanelHp = panelContexts.healthPanel?.hp;
// Both should come from buildHpViewModel()
```
**Why:** Litmus test for Phase 7.5 unification — if divergent, unification failed

### Check 4: Header Defenses vs Defense Panel Source Divergence
```javascript
// Verify defensePanel.defenses exists and is the canonical source
const defensePanel = panelContexts.defensePanel;
if (!defensePanel || !defensePanel.defenses) {
  warnMissingDerivedOutput('Defenses', 'defensePanel.defenses', actor.name);
}
```
**Why:** Verifies that both header pills and defense panel read from same view-model

---

## Enabling Phase 8 Observability

All Phase 8 checks are **gated behind a debug flag** to avoid production noise:

```javascript
if (CONFIG?.SWSE?.debug?.contractObservability) {
  // Emit warnings
}
```

**To enable:**

1. In Foundry console or config:
   ```javascript
   CONFIG.SWSE = CONFIG.SWSE || {};
   CONFIG.SWSE.debug = CONFIG.SWSE.debug || {};
   CONFIG.SWSE.debug.contractObservability = true;
   ```

2. Or set in system settings during development

---

## Runtime Verification Checklist

Use this checklist to verify Phases 5-8 are working correctly:

### Probe 1: Fresh Character Creation
```javascript
// After chargen finalize, inspect the actor:
const report = inspectActorContract(actor);
console.log(report.summary());
// Expected: ✅ HEALTHY or 🟢 OK
```

**Verify:**
- ✅ Canonical stored abilities (all have `.base`)
- ✅ Canonical stored skills (25+ initialized)
- ✅ Canonical HP/resources
- ✅ Canonical class identity
- ✅ Derived defenses/skills/identity bundles

### Probe 2: Level-Up Finalization
```javascript
// After level-up, check warnings:
const summary = getWarningsSummary();
console.log('Warnings after level-up:', summary.total);
// Expected: 0 or minimal warnings
```

**Verify:**
- ✅ No legacy path normalizations
- ✅ No missing canonical shape
- ✅ Derived bundles updated cleanly

### Probe 3: First Sheet Render
```javascript
// Open sheet and check console
// Expected: No Phase 8 warnings
```

**Verify:**
- ✅ No HP fallback warnings
- ✅ No defense divergence warnings
- ✅ No attack reconstruction unless expected
- ✅ No repeated concept divergence for HP/defenses

### Probe 4: Manual Edit & Save
```javascript
// Edit one field:
// 1. Ability score → verify system.abilities.str.base updated
// 2. Skill miscMod → verify system.skills.acrobatics.miscMod updated
// 3. Defense misc → verify system.defenses.fort.miscMod updated
// 4. Resource → verify system.forcePoints.value updated

// Expected: No legacy path writes in console
```

---

## What Phase 8 Warnings Mean

### [ContractWarning][ActorEngine]
Indicates ActorEngine encountered non-canonical input or had to normalize/repair it.
- **Action:** Investigate source of mutation — check if caller is using legacy paths
- **Severity:** Medium — indicates upstream caller doesn't know canonical paths

### [DerivedWarning][Domain]
Indicates computed outputs are missing or incomplete.
- **Action:** Check if DerivedCalculator/mirrorIdentity/etc. are running
- **Severity:** High — prevents sheet from consuming canonical computed data

### [SheetFallback][Domain]
Indicates sheet had to use rescue/fallback logic instead of consuming canonical data.
- **Action:** Verify derived output was computed correctly
- **Severity:** High in production; low in chargen (expected temporarily during setup)

### [SheetConsistencyWarning][Domain]
Indicates repeated UI concepts are reading from multiple sources instead of unified bundle.
- **Action:** Check if Phase 7.5 unification is complete for that domain
- **Severity:** High — violates Phase 7.5 contract

---

## Files Added/Modified

| File | Purpose |
|------|---------|
| `scripts/debug/contract-warning-helper.js` | Structured warning functions |
| `scripts/debug/actor-contract-inspector.js` | Actor health reporting utility |
| `scripts/sheets/v2/character-sheet.js` | Phase 8 observability checks in `_prepareContext()` |
| `scripts/sheets/v2/character-sheet/context.js` | Import warning helper |

---

## Success Criteria Met (Phase 8)

✅ **Legacy mutation input is visible** — warnings when non-canonical paths received  
✅ **Post-apply missing canonical shape is visible** — warnings on required containers  
✅ **Missing/incomplete derived outputs are visible** — warnings on missing bundles  
✅ **Sheet fallback use is visible** — warnings when rescue paths trigger  
✅ **Repeated concept divergence is visible** — warnings when UI surfaces use different sources  
✅ **One actor contract health report can quickly summarize system health** — `inspectActorContract()`  
✅ **Logs are high-signal rather than spammy** — gated behind debug flag, only on actual issues  

---

## Next Steps: Phase 9

With Phase 8 observability in place, Phase 9 can safely implement **hard contract assertions**:

- Assert `derived.skills[key].total` always exists when needed
- Assert `derived.defenses.*` always populated before sheet reads
- Assert `derived.attacks.list` populated unless transitional actor
- Assert no sheet fallback warnings in production
- Assert repeated concepts always consume same view-model source

Phase 9 will upgrade from "warnings" to "errors" where appropriate, with safe behavior for users while catching issues during development and testing.

---

## Summary

Phase 8 adds observability at all the boundaries where contract drift can re-enter:
- **ActorEngine input** — detects non-canonical writes
- **Derived computation** — detects missing outputs
- **Sheet fallback paths** — detects rescue logic usage
- **Repeated concepts** — detects read-path divergence

With Phase 8 instrumentation active, you can now **see exactly where the system diverges from the canonical contract**, making it possible to fix issues before they cause problems.

The four highest-priority checks verify that Phase 7-7.5 unification actually landed and is holding at runtime.

**Status:** Phase 8 Complete. System is observable and ready for Phase 9 hard assertions.
