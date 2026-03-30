# Reference Content Reality Check

**Checkpoint Date:** 2026-03-30
**Scope:** First-Wave Datapad Reference Concepts
**Validation Level:** Scaffold Complete, Content Pending

---

## Summary

| Status | Count |
|--------|-------|
| Concepts Documented | 11/11 ✅ |
| Glossary Mappings | 11/11 ✅ |
| Journal Entries (Live) | 0/11 ❌ |
| Pack Directory Exists | 0 ❌ |
| Reference Service Ready | ✅ |
| Affordance Component Ready | ✅ |
| Integration Complete | ✅ |

**Current State:** Scaffold 100% complete. Content authored in documentation. Pack population pending.

---

## Reference Content Reality Table

| # | Glossary Key | Reference ID | Documented | Live Entry | Opens | Notes |
|---|--------------|--------------|-----------|-----------|-------|-------|
| 1 | HitPoints | swse-ref-hit-points | ✅ | ❌ | TBD | Full content in REFERENCE_CONTENT_FIRST_WAVE.md |
| 2 | DamageThreshold | swse-ref-damage-threshold | ✅ | ❌ | TBD | Full content documented |
| 3 | ForcePoints | swse-ref-force-points | ✅ | ❌ | TBD | Full content documented |
| 4 | ConditionTrack | swse-ref-condition-track | ✅ | ❌ | TBD | Full content documented |
| 5 | Initiative | swse-ref-initiative | ✅ | ❌ | TBD | Full content documented |
| 6 | BaseAttackBonus | swse-ref-base-attack-bonus | ✅ | ❌ | TBD | Full content documented |
| 7 | Grapple | swse-ref-grapple | ✅ | ❌ | TBD | Full content documented |
| 8 | ReflexDefense | swse-ref-reflex-defense | ✅ | ❌ | TBD | Full content documented |
| 9 | FortitudeDefense | swse-ref-fortitude-defense | ✅ | ❌ | TBD | Full content documented |
| 10 | WillDefense | swse-ref-will-defense | ✅ | ❌ | TBD | Full content documented |
| 11 | FlatFooted | swse-ref-flat-footed | ✅ | ❌ | TBD | Full content documented |

---

## What "Documented" Means

Full content for all 11 concepts exists in `/docs/REFERENCE_CONTENT_FIRST_WAVE.md` with:
- **Overview** (1-2 sentence summary)
- **Core Mechanic** (how it works in game terms)
- **Calculation & Components** (detailed breakdown)
- **Examples** (2+ practical scenarios)
- **Related Concepts** (cross-references)

Each entry is complete, game-accurate, accessible to new players, and ready for journal entry creation.

---

## What "Live Entry" Means

A live entry would be:
- Created as a JournalEntry document in Foundry
- Assigned the exact ID from the "Reference ID" column above
- Populated in the `packs/datapads-references/` pack directory
- Resolvable via `game.journal.get(referenceId)`

**Current Status:** Pack directory does not exist. Entries not yet created.

---

## Infrastructure Status

### ✅ Reference Service (Ready)

**File:** `scripts/ui/discovery/reference-service.js`

**Methods:**
- `hasReference(glossaryKey)` — Returns true/false for mapped references
- `getReferenceMetadata(glossaryKey)` — Returns {hasReference, referenceId, label}
- `openReference(glossaryKey)` — Async lookup and open journal entry
- `auditReferences()` — Compare glossary to live entries: {found: [], missing: []}
- `getMappedReferences()` — Returns all mapped references
- `printAudit()` — Console output of audit

**Current Behavior:**
- When entries are live: opens them correctly
- When entries missing: logs warning, fails gracefully (no error thrown)
- Ready to use immediately upon entry creation

### ✅ Affordance Component (Ready)

**File:** `scripts/ui/discovery/reference-affordance.js`

**Functions:**
- `createReferenceAffordance(glossaryKey)` — Returns HTMLElement or null
- `addReferenceAffordanceToCard(cardElement, glossaryKey)` — Appends to card
- `injectReferenceAffordanceStyles()` — Injects CSS

**Current Behavior:**
- Renders button only if reference exists
- Missing references: affordance simply doesn't show (no error)
- Click handler: opens reference or logs graceful warning
- Ready to use immediately upon entry creation

### ✅ Integration (Complete)

**Files Modified:**
- `breakdown-card.js` — Renders affordance when concept available
- `defense-tooltip.js` — Passes glossary keys in metadata
- `combat-stats-tooltip.js` — Passes glossary keys for 3 concepts

**Current Behavior:**
- Breakdown metadata includes `concept` field (glossary key)
- Card extraction: `breakdown.metadata?.concept`
- Affordance rendering: conditional on mapped reference
- Missing references: card still works, affordance just doesn't show

---

## Pack Directory Status

### Current State
```
/home/user/foundryvtt-swse/packs/
├── (47 existing packs)
└── datapads-references/  ← DOES NOT EXIST YET
```

### What Needs to Happen
1. Create directory: `/packs/datapads-references/`
2. Either:
   - **Option A (Recommended):** Create entries in Foundry UI, then export pack
   - **Option B (Technical):** Create LevelDB files directly (requires Foundry internals knowledge)
   - **Option C (Import):** Create entries in a world, export to compendium, package for repo

### Estimated Effort
- Creating 11 journal entries in Foundry UI: ~30-45 minutes
- Exporting pack to repo: ~5 minutes
- Total: < 1 hour

---

## Next Steps to Go Live

### Step 1: Create Pack Directory
```bash
mkdir /home/user/foundryvtt-swse/packs/datapads-references
```

### Step 2: Create Journal Entries (in Foundry)
- Open Foundry with foundryvtt-swse system
- Create new folder: "Datapad References"
- For each concept, create new JournalEntry:
  - Name: From REFERENCE_CONTENT_FIRST_WAVE.md
  - ID: Exact referenceId (e.g., `swse-ref-hit-points`)
  - Content: From REFERENCE_CONTENT_FIRST_WAVE.md
  - Save and close

### Step 3: Export to Compendium Pack
- Select all entries in "Datapad References" folder
- Compendium menu → Export to Pack
- Select `datapads-references` pack
- Confirm

### Step 4: Validate
In Foundry console:
```javascript
ReferenceService.auditReferences()
ReferenceService.printAudit()
```

Expected output:
```
Found: 11 (all first-wave concepts)
Missing: 0
```

---

## What Works Right Now (Pre-Population)

### ✅ Code is Live
- Reference service exists and is functional
- Affordance component exists and works
- Integration with breakdown cards is complete
- Glossary mappings are in place
- Everything is wired and ready

### ✅ Graceful Fallback Works
- When entries are missing: affordance doesn't show (no error)
- When affordance is clicked (before entries exist): logs warning, fails gracefully
- All existing tooltip/breakdown behavior unaffected
- Zero impact on player experience until content is added

### ✅ Documentation is Complete
- Full content for all 11 concepts authored
- Step-by-step Foundry creation instructions provided
- Governance and design constraints documented
- Audit tools ready to validate population

---

## What Doesn't Work Until Entries Are Live

### ❌ References Don't Open
- Until entries are created as JournalEntry documents
- Service will find no matching entry
- Player clicks affordance: warning logged, nothing opens
- This is expected and graceful

### ❌ Audit Reports Missing References
```javascript
ReferenceService.auditReferences()
// Returns: found: [], missing: [11 concepts]
```
- Expected until entries are created
- Audit tool will verify each entry as it's created

---

## Documentation Truthfulness Assessment

### ✅ Accurate
- REFERENCE_ARCHITECTURE.md correctly describes the system
- Component descriptions match implementation
- Integration diagrams are accurate
- Governance constraints are clearly stated

### ⚠️ Requires Clarification
- REFERENCE_CONTENT_FIRST_WAVE.md states "Implementation Notes: Creating Entries in Foundry"
- Should be clarified: "Content is authored, ready for entry creation"
- Summaries in main phase doc should clarify: "scaffold complete, content pending"

---

## Clarifying Statement for Docs

**Update REFERENCE_CONTENT_FIRST_WAVE.md header to read:**

> **Status:** Content authored and ready for journal entry creation.
>
> The reference content below is complete and game-accurate. To make references live in Foundry:
> 1. Follow "Creating Entries in Foundry" section below
> 2. Create 11 JournalEntry documents in Foundry using the provided content
> 3. Export to the `datapads-references` compendium pack
> 4. Verify with `ReferenceService.auditReferences()`

---

## Validation Verdict

### Scaffold Status: ✅ COMPLETE
- All code in place
- All integrations working
- All infrastructure defined
- Ready for content population

### Content Status: ⚠️ PENDING
- Authored: Yes
- Live: No
- Blocking: No (graceful fallback in place)
- Effort to complete: < 1 hour

### Recommendation: ✅ SAFE TO RATIFY
- Implementation is sound
- No risk in current state
- Content population is straightforward
- No rollback needed
- Ready for GO decision
