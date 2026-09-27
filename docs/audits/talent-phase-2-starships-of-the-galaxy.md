# PHASE 2 - Starships of the Galaxy Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 6

## Scope

Source certification covers **23 talent identities** on printed pages **16-18**:

- **13 origin talents** across **3** introduced trees.
- **10 expansion talents** across **4** existing trees.

The PDF page-layout pass found no false standalone talents or other Phase 1D structural correction in this book.

## Machine authority

- `data/audits/talent-phase-2-starships-of-the-galaxy-content.json`
- `data/audits/talent-phase-2-starships-of-the-galaxy-discrepancy-manifest.json`

## Census

| Measure | Count |
|---|---:|
| Origin trees | **3** |
| Origin talents | **13** |
| Expansion targets | **4** |
| Expansion talents | **10** |
| Total certified identities | **23** |
| Correct-tree repo records mapped | **22** |
| Missing correct-tree records | **1** |

Origin trees:

- Outlaw Tech - 4
- Squadron Leader - 4
- Naval Officer - 5

Expansion targets:

- Sense - 1
- Lineage - 1
- Expert Pilot - 5
- Gunner - 3

## Missing identity and collision

**Naval Officer -> Combined Fire** has no correct-tree talent item record.

A same-name **Mercenary -> Combined Fire** record exists. It is a distinct identity and must not be moved or overwritten.

## High-impact content defects

### Fast Repairs

The repository currently says jury-rigging restores hit points. The source instead grants **temporary hit points equal to the Mechanics check result**, with damage applied to them first and the temporary hit points disappearing at the end of the encounter.

The repository also lacks the printed prerequisite: **Trained in Mechanics**.

### Squadron Maneuvers

The current repository mechanic is materially wrong. It says the talent grants a prerequisite of a chosen talent.

The source says the character chooses an **Expert Pilot or Gunner talent already possessed** and, once per encounter as a standard action, **imparts that talent's benefits to all members of the squadron until the end of the encounter**.

Its prerequisite is also incomplete.

### It's a Trap!

The source does not force a hostile vehicle to move. Once per encounter as a reaction, it **grants the pilot of one vehicle within line of sight an immediate move action**, including a vehicle the officer commands.

### Prerequisite omissions

Source-required prerequisites are incomplete in several existing records, including:

- Force Reflexes
- Fast Repairs
- Hot Wire
- Quick Fix
- Crippling Hit
- Squadron Maneuvers
- Squadron Tactics

## General text quality

Most of the 22 mapped records use compressed summary text in `benefit` and/or `description` rather than the full canonical player-readable rule text. Some shorthand is mechanically aligned, but Phase 2 records the full source wording separately so repair work can distinguish harmless compression from actual rules loss.

## Content contract

For later repair:

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
    = Starships of the Galaxy + printed page
```

## Stop gate

- [x] 3 origin trees / 13 origin talents certified.
- [x] 10 expansion talents certified.
- [x] 23 identities page-mapped.
- [x] Full rules text and prerequisites captured.
- [x] Repository comparison completed.
- [x] Combined Fire collision protected.
- [x] High-impact mechanics defects documented.
- [x] No production/runtime changes.

# Verdict

**Starships of the Galaxy Phase 2 content certification is complete.**
