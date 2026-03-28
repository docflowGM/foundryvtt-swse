# Left Selected Rail — Quick Reference Matrix

**Status:** Empty for 93% of progression | Only Species shows content

---

## Quick Overview

| Aspect | Status | Notes |
|--------|--------|-------|
| **Total Steps** | 14 | intro → summary (chargen) |
| **Steps with Content** | 1 | Species only |
| **Steps with Empty Placeholder** | 13 | 93% dead space |
| **Data Source Type** | Mixed | Actor data + local state, no projection |
| **Path-Aware?** | No | Identical across all paths |
| **Projection-Backed?** | No | ProjectionEngine exists but unused |
| **Ready for Detail Rail Integration?** | ❌ NO | Needs structural cleanup first |

---

## Content by Step

| Step | Visible? | Content | Source | Notes |
|------|----------|---------|--------|-------|
| intro | ✅ | Placeholder | N/A | Icon only; no data |
| **species** | ✅ | **Identity + Build** | **Mixed** | **Only step with actual content** |
| attribute | ❌ | Placeholder | N/A | Could show attribute assignments |
| class | ❌ | Placeholder | N/A | Could show class choice |
| l1-survey | ❌ | Placeholder | N/A | Informational step; no selection |
| background | ❌ | Placeholder | N/A | Could show background choice |
| skills | ❌ | Placeholder | N/A | Could show trained skills |
| general-feat | ❌ | Placeholder | N/A | Could show selected feats |
| class-feat | ❌ | Placeholder | N/A | Could show selected feats |
| general-talent | ❌ | Placeholder | N/A | Could show talent tree state |
| class-talent | ❌ | Placeholder | N/A | Could show talent tree state |
| languages | ❌ | Placeholder | N/A | Could show language choices |
| force-powers | ❌ | Placeholder | N/A | Conditional; could show selections |
| summary | ❌ | Placeholder | N/A | Final review step; shows full review in work-surface instead |

---

## Species Step Content Detail

### What Renders in `species-summary.hbs`

```
┌─────────────────────────────────────┐
│  [Portrait]   Name of Character    │  ← Identity Block
├─────────────────────────────────────┤
│ Species    │  [current or —]        │  ← Build Summary
│ Class      │  [current or —]        │
│ Talents    │  [count or —]          │
│ Credits    │  [value or —]          │
│ Languages  │  [tag tag tag or —]    │
└─────────────────────────────────────┘
```

### Field-by-Field Source Mapping

| Field | Currently Visible | Source | Real-Time? | Issues |
|-------|---|---|---|---|
| Portrait | Yes | `actor.img` | No | Immutable; from actor |
| Name | Yes | `actor.name` | No | Immutable; from actor |
| Species | Yes | `_committedSpeciesName` OR actor system | Partial | Only field tracking committed state |
| Class | Yes | `actor.system.classes[0]` | No | Always reads actor, not current choice |
| Talents | Yes | Count of `actor.items` (type='talent') | No | Only counts committed items |
| Credits | Yes | `actor.system.credits` | No | Always reads actor data |
| Languages | Yes | `actor.system.languages` array | No | Always reads actor data |

---

## Data Sources Classification

### By Step

| Step | Render Method | Template | Class |
|------|---|---|---|
| species | `renderSummaryPanel()` | species-summary.hbs | **SpeciesStep** |
| [all others] | (not overridden) | (none) | Step base class returns `null` |

### By Field Type

| Type | Fields | Used In | Notes |
|------|--------|---------|-------|
| Actor Document | Portrait, Name | Identity Block | Immutable; never changes during progression |
| Actor System | Class, Credits, Languages, Talents | Build Summary | Reads directly from actor; inconsistent with selections |
| Committed/Draft State | Species | Build Summary | Uses local `_committedSpeciesName`; better approach |

---

## Update & Refresh Behavior

### When Left Rail Updates

| Event | Updates? | Mechanism |
|-------|----------|-----------|
| User clicks item (focus) | ❌ No | Detail panel updates; left rail static |
| User confirms selection | ❌ No* | Left rail doesn't refresh until next step navigation |
| Step navigation forward | ✅ Yes | Full `_prepareContext()` re-render; if new step has renderSummaryPanel(), it renders |
| Step navigation backward | ✅ Yes | Same as above |
| Mentor interaction | ❌ No | Detail panel updates; left rail static |
| Full shell re-render (manual) | ✅ Yes | If forced, left rail updates |

*Species step is exception — `_committedSpeciesName` is set on commit, so next render will show new species.

---

## Projection Engine Status

| Component | Current Use | In Left Rail? | Issue |
|-----------|---|---|---|
| ProjectionEngine | Built in summary-step.js | ❌ NO | Left rail predates projection backing |
| ProjectionEngine | Used in mutation-coordinator.js | ❌ NO | Left rail not involved in mutations |
| ProjectionEngine | Defined for Phase 3 | ❌ NO | Left rail doesn't leverage it |
| draftSelections | Available in progressionSession | ❌ NO | Left rail reads actor, not draft state |

---

## Path Differences

### By Progression Mode

| Mode | Left Rail Content | Differences | Issues |
|------|---|---|---|
| Chargen (heroic) | Placeholder for all but species | None | Standard empty state |
| Level-Up | Placeholder for all steps | None | No class or species selection in level-up |
| Beast | Placeholder for all but species | None | Same rendering; no beast-specific snapshot |
| Nonheroic | Placeholder for all but species | None | Same rendering; no nonheroic-specific snapshot |
| Follower | Placeholder for all but species | None | No override in FollowerShell |
| Droid | Placeholder for all but species | None | No override in DroidBuilderShell |

**Result:** No path-awareness; all render identically.

---

## Risks & Blockers

### For Detail Rail Integration

| Risk | Severity | Impact |
|------|----------|--------|
| Left rail 93% empty | HIGH | Detail rail (right) will be rich; left will be bare → UX asymmetry |
| Mixed data sources | MEDIUM | Can't bind detail rail to "current build state" reliably |
| No projection backing | MEDIUM | summary-step uses ProjectionEngine; species-step doesn't → divergence risk |
| No step-specific snapshots | MEDIUM | Detail rail shows item details; left doesn't show what's selected → context loss |

---

## What Exists vs What's Wired

| Component | Exists? | Wired? | Functional? |
|-----------|---------|--------|-------------|
| `renderSummaryPanel()` base method | ✅ Yes | ✅ Called by shell | ✅ Works (returns null by default) |
| `SpeciesStep.renderSummaryPanel()` | ✅ Yes | ✅ Implemented | ✅ Works for species only |
| `species-summary.hbs` template | ✅ Yes | ✅ Rendered | ✅ Works for species only |
| Other step summary implementations | ❌ No | — | — |
| Projection backing | ✅ Yes | ❌ No | ✅ Exists but unused by left rail |
| draftSelections access | ✅ Yes | ❌ No | ✅ Available but not consulted |
| Step-specific refresh | ❌ No | — | — |

---

## For Detail Rail Integration: Honest Verdict

**Can we bind detail rail data to left rail selections?** ❌ **NO, not yet.**

**Why?**
1. Left rail is mostly empty — only species step has content
2. Left rail data sources are inconsistent — mixed actor/draft state
3. Left rail not projection-backed — no authoritative state source
4. Left rail not step-aware — all paths render identically
5. Left rail not selection-aware — doesn't show what user chose except species

**Must-Do Before Detail Rail Binding:**
1. Implement `renderSummaryPanel()` for other major steps
2. Unify data sources (use ProjectionEngine or draftSelections consistently)
3. Ensure left rail reflects "current selections" not "actor data"
4. Add step-specific snapshot views
5. Wire refresh to selection/focus changes

---

## Code Pointers

**Shell Region Definition:**
- `/templates/apps/progression-framework/progression-shell.hbs:88-103`

**Render Call:**
- `/scripts/apps/progression-framework/shell/progression-shell.js:805`

**Only Implementation:**
- `/scripts/apps/progression-framework/steps/species-step.js:~line 200` (renderSummaryPanel method)

**Base Class:**
- `/scripts/apps/progression-framework/steps/step-plugin-base.js:204` (returns null)

**Template:**
- `/templates/apps/progression-framework/summary-panel/species-summary.hbs`

**ProjectionEngine (unused by left rail):**
- `/scripts/apps/progression-framework/shell/projection-engine.js`

---

**See LEFT_SELECTED_RAIL_AUDIT.md for full analysis.**
