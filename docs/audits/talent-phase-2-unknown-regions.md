# PHASE 2 - The Unknown Regions Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 9

## Scope

The corrected source population is **57 talent identities**:

- **27 origin talents** across **6** introduced trees.
- **30 expansion talents** across **16** pre-existing trees.

No production talent records are changed.

## Machine authority

- `data/audits/talent-phase-2-unknown-regions-content.json`
- `data/audits/talent-phase-2-unknown-regions-discrepancy-manifest.json`

## Phase 1D structural corrections

The page hierarchy exposed four false standalone memberships.

### Exile / Band Together

**Band Together** is one talent with three once-per-encounter actions:

- Directed Attack
- Strength in Numbers
- Temporary Allies

Phase 1D had incorrectly promoted Strength in Numbers and Temporary Allies into standalone Exile talents.

Correct Exile tree:

- Arrogant Bluster
- Band Together
- Galactic Guidance
- Rant
- Self-Reliant

### Warrior / Champion

**Champion** is one talent with three once-per-encounter actions:

- Champion's Pride
- Disarming Hit
- Masterful Strike

Phase 1D had incorrectly promoted Disarming Hit and Masterful Strike into standalone Warrior talents.

Correct Warrior tree:

- Champion
- Quick Study
- Simple Opportunity
- Warrior's Awareness
- Warrior's Determination

## Structural totals after correction

- expansion publication claims: **272** (unchanged)
- aggregate canonical memberships: **1,180**
- canonical correct-tree membership gaps: **270**

## Census

| Measure | Count |
|---|---:|
| Origin trees | **6** |
| Origin talents | **27** |
| Expansion targets | **16** |
| Expansion talents | **30** |
| Total certified identities | **57** |
| Correct-tree repo item records mapped | **1** |
| Missing correct-tree item records | **56** |

The only correct-tree repository item currently mapped is:

- Jedi Sentinel -> **Sense Primal Force**

This is a much larger item-record content gap than the tree graph alone suggests.

## Identity hazards

Same-name or unassigned repository records exist for several missing identities, including:

- Commando -> Out of Harm's Way vs an existing Protection record
- Military Tactics -> Lead by Example vs an existing Ideologue record
- Force Adept -> Instrument of the Force and Long Call records with no correct tree assignment

These must not be resolved through name-only matching.

## Multi-action preservation

The source dataset keeps action blocks inside their parent talents:

- Band Together
- Deep Space Raider
- Piercing Hit
- Battle Mount
- Champion

None of their named actions are emitted as standalone talent identities.

## Content contract

For later production repair:

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical full player-readable rules text

system.summary
    = concise derived player-facing summary

system.prerequisites
    = canonical printed prerequisites

source/page
    = Unknown Regions + printed page
```

## Stop gate

- [x] 6 origin trees / 27 origin talents certified.
- [x] 30 expansion talents certified.
- [x] 57 source identities page-mapped.
- [x] Four false nested-action identities removed.
- [x] Full normalized source text captured.
- [x] Canonical prerequisites captured.
- [x] Repository item comparison completed.
- [x] Same-name/unassigned identity hazards protected.
- [x] Phase 1C Unknown Regions adjudication marked with superseding correction.
- [x] No production/runtime changes.

# Verdict

**The Unknown Regions Phase 2 content certification is complete.**
