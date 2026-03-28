# Left Selected Rail Audit — Current State

**Date:** 2026-03-28
**Audit Scope:** What is actually rendered in the left summary panel during progression
**Status:** AUDIT ONLY — No implementation changes yet

---

## Executive Summary

The left "selected" rail (summary panel) is **almost entirely empty** across progression. Only the **Species step** (first step in chargen) renders any content. All other 10+ steps show a blank placeholder. The species-step summary is wired to pull from mixed data sources (committed selections + actor data), lacks authoritative projection backing, and provides no progression state visibility during 90% of the UI flow.

**Verdict:** The left rail is **minimally wired, mostly decorative, inconsistent across paths, and not ready for detail rail integration without structural cleanup first.**

---

## Rendered Content Audit

### Current State: What Is Actually Visible?

#### Species Step (ONLY STEP WITH CONTENT)

**Left rail renders:** `species-summary.hbs` template

**Sections rendered:**
1. **Identity Block** (always visible)
   - Portrait image (from actor.img)
   - Name (from actor.name)

2. **Build Summary** (5 rows)
   - Species row: Shows current species (or "—" placeholder)
   - Class row: Shows current class (or "—" placeholder)
   - Talents row: Shows count of talent items (or "—" placeholder)
   - Credits row: Shows credits value (or "—" placeholder)
   - Languages row: Shows language tags (or "—" placeholder)

#### All Other Steps (11+ steps)

**Left rail renders:** Empty placeholder (`prog-summary-placeholder` div)
- Shows only step icon
- No content
- Read-only state indicated

**Steps with empty left rail:**
- intro
- attribute
- class
- l1-survey
- background
- skills
- general-feat
- class-feat
- general-talent
- class-talent
- languages
- force-power (if conditional)
- force-technique (if conditional)
- force-secret (if conditional)
- starship-maneuver (if conditional)
- summary (final review)
- droid-builder (if droid path)

---

## Data Source Mapping — Species Step Only

### Where Each Field Comes From

| Section | Field | Current Source | Notes |
|---------|-------|-----------------|-------|
| Identity | Portrait | `actor.img` | Actor document image field |
| Identity | Name | `actor.name` | Actor document name field |
| Build | Species | `this._committedSpeciesName` OR `actor.system.details.species` OR `actor.system.species.value` | Commits to local step state, falls back to actor data; NO projection |
| Build | Class | `actor.system.classes[0].name` OR `actor.system.class` | Direct actor system access; always uses actor data, not committed selection |
| Build | Talents | Count of `actor.items` where `type === 'talent'` | Counts actor items; reflects committed items only |
| Build | Credits | `actor.system.credits.value` OR `actor.system.credits` | Direct actor system access; always uses actor data |
| Build | Languages | `actor.system.languages.value` array + `actor.system.languages.custom` | Direct actor system access; always uses actor data |

### Data Source Classification

**Committed/Draft-Aware:**
- Species (uses `_committedSpeciesName` if available)

**Always-From-Actor:**
- Class
- Credits
- Languages
- Talents (counts actor items)

**Always-Immutable:**
- Portrait (actor.img)
- Name (actor.name)

---

## Update Lifecycle

### When Summary Panel Updates

**Species Step:**
- Initial render: When step is entered, calls `renderSummaryPanel(context)`
- On selection change: When user clicks item (focus), detail panel updates; summary panel does NOT auto-refresh on focus alone
- On commit: When user clicks "Confirm" button, `_committedSpeciesName` updates locally, next render includes new species
- After step exit: Summary panel is not rendered; placeholder shown on all subsequent steps

**All Other Steps:**
- Never updates: Placeholder only
- No data fetched
- No refresh logic

### Refresh Mechanism

```javascript
// In species-step.js
renderSummaryPanel(context) {
  return {
    template: 'species-summary.hbs',
    data: {
      currentSpecies: this._committedSpeciesName ?? actor.system.details.species ?? null,
      // ... other fields
    }
  };
}
```

Called from `ProgressionShell._prepareContext()` once per render cycle. No reactive updates; depends on full shell re-render (triggered by navigation, item focus changes, or manual render calls).

---

## Path/Subtype Differences

### Chargen vs Level-Up vs Beast vs Follower vs Nonheroic

The left rail rendering code is **identical across all progression paths.** No path-specific overrides:

- **ChargenShell, LevelupShell, FollowerShell, DroidBuilderShell** all extend ProgressionShell
- None override `renderSummaryPanel()`
- All use the same species-summary.hbs template
- Only Species step implements `renderSummaryPanel()` in any subclass

**Result:** Left rail content is the same for:
- Heroic chargen
- Level-up
- Beast chargen/levelup
- Nonheroic chargen/levelup
- Follower chargen
- Droid chargen (if applicable)

---

## Placeholder/Dead Regions

### Empty Sections During Non-Species Steps

When user is on any step other than Species:

```handlebars
{{#if summaryPanelHtml}}
  {{{summaryPanelHtml}}}
{{else}}
  <div class="prog-summary-placeholder swse-card-schema swse-card-schema--identity swse-card-schema--placeholder">
    {{#if currentDescriptor}}
      <i class="fas {{currentDescriptor.icon}} prog-summary-placeholder__icon"></i>
    {{/if}}
  </div>
{{/if}}
```

The `prog-summary-placeholder` div is:
- Always rendered
- Only shows an icon
- Semantically suggests "identity" schema (misleading — it's not showing identity data)
- Takes up left rail space with no information value

### Dead Space by Step Count

Of 14 chargen steps (intro through summary):
- 1 step provides content (species): **7%**
- 13 steps show placeholder only: **93%**

---

## Data Contract & Authoritative Backing

### Is There a Canonical Data Contract for the Left Rail?

**NO.** There is no formal data contract. The summary panel is:

1. **Ad hoc per-step**
   - Only species-step implements it
   - Each step would implement its own version if added
   - No unified schema

2. **Not projection-backed**
   - ProjectionEngine exists and is used in summary-step.js
   - NOT used in species-summary.hbs rendering
   - This means left rail doesn't reflect authoritative projected character state

3. **Mixed data sources**
   - Some fields from committed selections (species)
   - Most fields from actor document (immutable)
   - No distinction between "in-progress choices" vs "committed actor state"

4. **Read-only**
   - No validation against draftSelections
   - No consistency checks
   - No projection synchronization

### What SHOULD Back It?

The projection engine produces:
```javascript
{
  identity: { species, class, background },
  attributes: { str, dex, con, int, wis, cha },
  skills: { trained: [...] },
  abilities: { feats: [...], talents: [...], ... },
  languages: [...],
  derived: { hp, speed, ... }
}
```

The left rail currently doesn't use this. It pulls directly from actor data + committed selections in an inconsistent way.

---

## Critical Issues Found

### Issue 1: Left Rail Mostly Decorative
- 93% of steps show empty placeholder
- No progression state visibility during 90% of UI flow
- Users can't see build snapshot while making choices

### Issue 2: Mixed Data Sources
- Class, Credits, Languages always read from actor (won't reflect in-progress choices)
- Species partially uses committed state (better, but still inconsistent)
- No clear boundary between "current selections" and "committed actor data"

### Issue 3: No Projection Backing
- ProjectionEngine.buildProjection() is authoritative for character state
- Left rail doesn't use it
- summary-step.js uses it, but species-step.js doesn't
- Inconsistency risk

### Issue 4: Stale Data Risk
- No refresh mechanism tied to:
  - Item focus changes
  - Selection commits
  - Class/background changes
- Depends on full shell re-render
- Could show stale data after interactions

### Issue 5: Namespace Confusion
- Called "summary-panel" and "selected-rail" interchangeably
- Template directory: `/summary-panel/` (singular)
- Template class: `prog-summary-panel`
- Shell region: `data-region="summary-panel"`
- Not clearly distinguished from detail-rail (right panel)

---

## Differences vs Design Intent

### Intended (from code comments):
- "Left column, compact build snapshot"
- "Shows current state of character build"
- "Read-only and stable"

### Actual:
- Empty/placeholder for 93% of progression
- Mixed actor-data + committed-selections, not coherent "build snapshot"
- Only works during species selection
- Doesn't reflect in-progress choices beyond species

---

## Step-by-Step Breakdown

| Step | Summary Content | Data Source | Dynamic? | Issues |
|------|---|---|---|---|
| intro | Placeholder only | N/A | No | Dead space; no content |
| species | Identity + Build (5 rows) | Mixed: actor + local state | Partial | Only step with content; inconsistent sources |
| attribute | Placeholder only | N/A | No | Dead space; could show attribute choices |
| class | Placeholder only | N/A | No | Dead space; actor has class data |
| l1-survey | Placeholder only | N/A | No | Dead space |
| background | Placeholder only | N/A | No | Dead space; actor has background data |
| skills | Placeholder only | N/A | No | Dead space; actor has skill training data |
| feats (general) | Placeholder only | N/A | No | Dead space; no feat list shown |
| feats (class) | Placeholder only | N/A | No | Dead space; no feat list shown |
| talents (general) | Placeholder only | N/A | No | Dead space; could show selected talents |
| talents (class) | Placeholder only | N/A | No | Dead space; could show selected talents |
| languages | Placeholder only | N/A | No | Dead space; actor has language data |
| force-powers (cond) | Placeholder only | N/A | No | Dead space; could show selected powers |
| summary | Placeholder only | N/A | No | Final review step; could show full build |
| droid (cond) | Placeholder only | N/A | No | Dead space; droid-specific build state |

---

## Risk Assessment

### Risk 1: Detail Rail Integration Blocker
**Severity:** HIGH
- Detail Rail (right panel) is highly polished and uses normalized contract
- Left Rail (summary) is mostly empty
- Integrating detail rail without fixing left rail creates UX asymmetry
- Users see detailed info on right but no build context on left

### Risk 2: Data Consistency
**Severity:** MEDIUM
- Left rail doesn't use ProjectionEngine
- summary-step uses ProjectionEngine
- Risk of divergence between preview (species-summary) and final review (summary-step)

### Risk 3: User Clarity
**Severity:** MEDIUM
- No build snapshot visible during 90% of progression
- Users can't see running total of choices
- Empty left rail might confuse users (is it broken? why is it empty?)

### Risk 4: Stale Data Exposure
**Severity:** LOW
- Class/Credits/Languages pulled from actor directly
- If actor is modified externally (unlikely), left rail won't reflect
- But no mechanism to commit in-progress class/credits/languages choices anyway

---

## Honest Assessment

### Is the Left Rail Ready for Detail Rail Integration?

**NO.** The left rail is:

✅ **Structurally present** — Template exists, region defined, placeholder renders

❌ **Functionally sparse** — Only 1 of 14 steps shows any content

❌ **Inconsistently backed** — Mixed data sources, no projection support

❌ **Incomplete** — Missing build snapshot for 93% of progression steps

❌ **Not step-aware** — All paths render identically (should be context-aware)

### Recommendation Before Detail Rail Integration

Before tying detail rail data to left rail selections, the left rail needs:

1. **Clear data contract** — What should left rail show on EACH step?
2. **Projection backing** — Use ProjectionEngine for authoritative state
3. **Step-specific implementations** — Each step that commits data should show a snapshot
4. **Refresh mechanism** — Auto-update on focus/commit, not just full shell re-render
5. **Namespace clarity** — Distinguish left rail (selected/summary) from detail rail (right)

---

## Files Involved

- **Template:** `/templates/apps/progression-framework/summary-panel/species-summary.hbs`
- **Shell:** `/scripts/apps/progression-framework/shell/progression-shell.js` (renders left rail)
- **Species Step:** `/scripts/apps/progression-framework/steps/species-step.js` (only implementation)
- **Base Class:** `/scripts/apps/progression-framework/steps/step-plugin-base.js` (defines renderSummaryPanel)
- **Main Template:** `/templates/apps/progression-framework/progression-shell.hbs` (region definition)

---

## Success Criteria for Future Work

Once left rail is refactored:

- [ ] All major chargen steps show relevant build snapshot
- [ ] Data sources unified (use ProjectionEngine or draftSelections, not ad hoc actor access)
- [ ] Refresh mechanism tied to selection changes
- [ ] No empty placeholders (always show relevant content or intentional empty state)
- [ ] Consistent across all progression paths
- [ ] Clear namespace (distinguish from detail rail)
- [ ] Ready for detail rail data binding

---

**AUDIT COMPLETE.** See LEFT_SELECTED_RAIL_MATRIX.md for concise summary table.
