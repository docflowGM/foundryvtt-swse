# SWSE Datapad Reference System Architecture

**Phase 11: Optional Deeper Learning Layer**

This document describes the Datapad Reference system, a lightweight optional layer on top of the tooltip platform that provides deeper contextual learning for core game concepts.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Design Principles](#design-principles)
3. [System Components](#system-components)
4. [Integration Points](#integration-points)
5. [Reference Content Model](#reference-content-model)
6. [Glossary to Journal Mapping](#glossary-to-journal-mapping)
7. [Developer Guide](#developer-guide)
8. [First Wave Concepts](#first-wave-concepts)

---

## Architecture Overview

The Reference system is a **three-layer optional extension** to the tooltip platform:

```
Layer 1: Tooltip (Hover)     → "What is this?"
            ↓
Layer 2: Breakdown (Click)   → "How is it calculated?"
            ↓
Layer 3: Reference (Optional)→ "Tell me more" (opens journal)
```

### Design Mandate

**DO NOT create a second knowledge system parallel to tooltips.**

- Tooltips explain WHAT something is (definition)
- Breakdowns show WHERE numbers come from (math)
- References teach WHY and deeper context (encyclopedia)
- Each layer is optional and can stand alone

### Key Principles

1. **Graceful Fallback:** Missing references don't break the system. Affordance simply doesn't appear.
2. **Optional Mapping:** References are opt-in per glossary concept. No second taxonomy.
3. **Semantic Keying:** Reuse existing glossary keys (HitPoints, ReflexDefense, etc.).
4. **Limited Scope:** First wave only 10-15 core concepts. No wiki-style sprawl.
5. **Immutable References:** No recursive linking, no auto-generation, no expansion without explicit approval.

---

## System Components

### 1. Reference Service (`scripts/ui/discovery/reference-service.js`)

Core service for reference resolution and opening.

**Key Methods:**

- `hasReference(glossaryKey)` — Check if glossary entry has mapped reference
- `getReferenceMetadata(glossaryKey)` — Get {hasReference, referenceId, label}
- `openReference(glossaryKey)` — Async lookup and open journal entry
- `getMappedReferences()` — Audit: return all mapped references
- `auditReferences()` — Compare glossary mappings to actual journal entries
- `printAudit()` — Console output of reference audit

**Error Handling:**

- Gracefully logs warnings if reference missing
- Never throws; fail-safe degradation
- Logs to console for developer awareness

### 2. Reference Affordance Component (`scripts/ui/discovery/reference-affordance.js`)

UI component that appears on breakdown cards when reference is available.

**Key Functions:**

- `createReferenceAffordance(glossaryKey)` — Create button element or null
- `addReferenceAffordanceToCard(cardElement, glossaryKey)` — Append to card
- `injectReferenceAffordanceStyles()` — Inject CSS for button styling

**Styling:**

- Subtle cyan border (rgba(0, 200, 255, 0.4))
- Book-open icon + "Reference" label
- Hover state with enhanced glow effect
- Accessibility: focus states, reduced motion support

### 3. Breakdown Card Integration (`scripts/ui/discovery/breakdown-card.js`)

Modified to support reference affordances.

**Changes:**

- Imports reference affordance functions
- Calls `injectReferenceAffordanceStyles()` once per card render
- Extracts `glossaryKey` from `breakdown.metadata?.concept`
- Calls `addReferenceAffordanceToCard()` if concept provided

**Metadata Flow:**

Breakdown providers must include glossary key in metadata:

```javascript
return {
  title: "Reflex Defense",
  definition: "How hard you are to hit through agility.",
  rows: [...],
  total: 16,
  metadata: {
    concept: 'ReflexDefense'  // Enables affordance
  }
};
```

### 4. Breakdown Providers Integration

All breakdown providers updated to pass glossary keys in metadata:

- **DefenseTooltip** (`scripts/ui/defense-tooltip.js`)
  - Reflex → 'ReflexDefense'
  - Fortitude → 'FortitudeDefense'
  - Will → 'WillDefense'
  - Flat-Footed → 'FlatFooted'

- **CombatStatsTooltip** (`scripts/ui/combat-stats-tooltip.js`)
  - Base Attack Bonus → 'BaseAttackBonus'
  - Grapple → 'Grapple'
  - Initiative → 'Initiative'

---

## Integration Points

### 1. Tooltip Glossary Mapping

**File:** `scripts/ui/discovery/tooltip-glossary.js`

Each glossary entry that has a reference includes:

```javascript
{
  label: "Hit Points",
  short: "Your character's health pool.",
  long: "Hit Points (HP) represent how much damage your character can sustain...",
  tier: 1,
  category: "attributes",
  hasReference: true,           // ← NEW
  referenceId: 'swse-ref-hit-points'  // ← NEW
}
```

**Naming Convention for referenceId:**

- Format: `swse-ref-<concept-slug>`
- Example: `swse-ref-reflex-defense`, `swse-ref-base-attack-bonus`
- Must match journal entry ID exactly

### 2. Journal Entry Pack

**System.json Entry:**

```json
{
  "name": "datapads-references",
  "label": "Datapad References",
  "type": "JournalEntry",
  "system": "foundryvtt-swse",
  "path": "packs/datapads-references"
}
```

**First-Wave Entry IDs (swse-ref-*):**

See [First Wave Concepts](#first-wave-concepts) below.

### 3. Breakdown Card to Reference Flow

```
User clicks breakdown card link
                ↓
BreakdownCard.open(breakdown)
                ↓
_renderCardContent(card, breakdown)
                ↓
injectReferenceAffordanceStyles()
addReferenceAffordanceToCard(card, breakdown.metadata.concept)
                ↓
ReferenceService.hasReference(glossaryKey) → Check glossary entry
                ↓
createReferenceAffordance(glossaryKey) → Create button if reference exists
                ↓
Button click handler:
  await ReferenceService.openReference(glossaryKey)
                ↓
ReferenceService.getReferenceMetadata(glossaryKey) → Get referenceId
                ↓
game.journal.get(referenceId) → Lookup journal entry
                ↓
journalEntry.sheet.render(true) → Open in native Foundry sheet
```

---

## Reference Content Model

### Journal Entry Structure

Each Datapad Reference is a JournalEntry with standardized structure:

**Metadata (Foundry Fields):**

- `name` — Concept label (e.g., "Hit Points Explained")
- `_id` — Reference ID (e.g., `swse-ref-hit-points`)
- `type` — "JournalEntry"
- `pages` — Array of journal pages with content

**Content Structure (Recommended):**

Each reference page should follow this structure:

```
## Overview
[1-2 sentence summary of the concept]

## Core Mechanic
[How the concept works in game terms]

## Calculation & Components
[Detailed breakdown of how it's calculated]
- Component 1
- Component 2
- Special cases

## Examples
[1-2 practical examples of the concept in action]

## Related Concepts
[Links to other learning resources if applicable]
```

### Editorial Guidelines

1. **Self-Contained:** Each reference explains its concept fully. No recursive links.
2. **Tier 1 Language:** Use terminology accessible to new players.
3. **Practical Focus:** Show HOW to use the concept, not just theory.
4. **Length:** 300-800 words per concept (brief but complete).
5. **Neutrality:** No house rules, no speculation. Rules-as-written only.

---

## Glossary to Journal Mapping

### Current Mapped Concepts (First Wave)

| Glossary Key | Reference ID | Status |
|---|---|---|
| HitPoints | swse-ref-hit-points | Draft |
| DamageThreshold | swse-ref-damage-threshold | Draft |
| ForcePoints | swse-ref-force-points | Draft |
| ConditionTrack | swse-ref-condition-track | Draft |
| Initiative | swse-ref-initiative | Draft |
| BaseAttackBonus | swse-ref-base-attack-bonus | Draft |
| Grapple | swse-ref-grapple | Draft |
| ReflexDefense | swse-ref-reflex-defense | Draft |
| FortitudeDefense | swse-ref-fortitude-defense | Draft |
| WillDefense | swse-ref-will-defense | Draft |
| FlatFooted | swse-ref-flat-footed | Draft |

### Adding New References

To add a new reference to Phase 11 first wave:

1. **Update Glossary** (`scripts/ui/discovery/tooltip-glossary.js`)

```javascript
NewConcept: {
  label: "New Concept",
  // ... existing fields ...
  hasReference: true,
  referenceId: 'swse-ref-new-concept'
}
```

2. **Create Journal Entry** (in pack or compendium browser)

- ID: `swse-ref-new-concept`
- Type: JournalEntry
- Content: Following editorial guidelines above

3. **Test via Audit**

```javascript
ReferenceService.auditReferences()
ReferenceService.printAudit()
```

Verify new entry appears in "Found" array.

### Future Phases (Phase 12+)

Phase 11 is intentionally limited to these 10-15 core concepts. Expansion to additional references requires:

1. Architect review of scope expansion
2. Proof that existing references are complete and accurate
3. Explicit approval before implementation
4. No recursive linking or wiki sprawl

---

## Developer Guide

### Testing References

**In Console:**

```javascript
// Check reference existence
ReferenceService.auditReferences()

// Open a specific reference
await ReferenceService.openReference('HitPoints')

// Get reference metadata
ReferenceService.getReferenceMetadata('ReflexDefense')

// List all mapped references
ReferenceService.getMappedReferences()
```

### Adding References to New Breakdown Providers

When creating a new breakdown provider (e.g., for Skills, Talents, etc.):

1. Update glossary entries with `hasReference: true` and `referenceId`
2. Include glossary key in breakdown metadata:

```javascript
static getBreakdown(actor, concept) {
  // ... calculation logic ...

  return {
    title: "Concept Title",
    definition: "Short definition",
    rows: [...],
    total: value,
    metadata: {
      concept: 'GlossaryKey'  // ← Add this
    }
  };
}
```

3. Breakdown cards automatically render affordance if reference exists

### Audit Utilities

**hardpoint-audit.js Extension:**

Future: Extend `hardpoint-audit.js` to report reference mapping status as part of system health check.

Expected output:

```
Reference Mapping Audit
  Total mapped entries: 11
  Valid references: 11
  Missing references: 0
  ✅ All references valid
```

---

## First Wave Concepts

### Core Concept Rationale

The first wave (11 concepts) covers the **most frequently asked game mechanics:**

1. **Hit Points** — Foundational resource
2. **Damage Threshold** — Core defensive mechanic
3. **Force Points** — Key resource for Force users
4. **Condition Track** — Fundamental status system
5. **Initiative** — Combat essentials
6. **Base Attack Bonus** — Combat essentials
7. **Grapple** — Special combat case
8. **Reflex/Fortitude/Will Defense** — Core defenses (3 concepts)
9. **Flat-Footed** — Common state modifier

These map directly to breakdown cards that players interact with during character creation and combat.

### Roadmap for Phase 12+

Future phases may add references for:

- Skills (individual skill explanations)
- Talents (talent tree mechanics)
- Force Powers (Force-specific mechanics)
- Advanced combat (Cover, positioning, etc.)
- Vehicle systems
- Companion rules

**Explicit constraint:** No expansion without architect approval and evidence that Phase 11 is stable and complete.

---

## No Breaking Changes

References are **fully backward compatible:**

- If reference doesn't exist, affordance doesn't show
- No changes to tooltip behavior
- No changes to breakdown logic
- No changes to character sheet
- Existing systems work identically whether references exist or not

---

## Appendix: CSS Classes

Reference affordance uses these classes:

- `.reference-affordance` — Container wrapper
- `.reference-affordance-btn` — Button element
- `.reference-affordance-label` — Text label
- `.breakdown-card-footer` — Card footer (created if needed)

All styles are namespaced and isolated. No global style changes.
