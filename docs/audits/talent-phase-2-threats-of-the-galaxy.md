# PHASE 2 - Threats of the Galaxy Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 7

## Scope

Source certification covers **11 talent identities**:

- **10 origin talents** across **2** introduced trees.
- **1 expansion talent** added to the Core Dark Side tree.

Printed source pages:

- Malkite Poisoner - p. 13
- Drain Knowledge - p. 30
- Master of Teräs Käsi - p. 53

The PDF hierarchy pass found **no Phase 1D structural correction**.

## Machine authority

- `data/audits/talent-phase-2-threats-of-the-galaxy-content.json`
- `data/audits/talent-phase-2-threats-of-the-galaxy-discrepancy-manifest.json`

## Important extraction finding

The TXT/DJVU extraction contains the Malkite Poisoner tree and Drain Knowledge, but it drops the **Master of Teräs Käsi talent-tree sidebar**.

The rendered PDF on printed p. 53 clearly publishes the full five-talent tree:

- Ignore Damage Reduction
- Teräs Käsi Basics
- Teräs Käsi Mastery
- Unarmed Counterstrike
- Unarmed Parry

Those five entries were therefore transcribed from the rendered PDF, not reconstructed from NPC statistics or general knowledge.

## Census

| Measure | Count |
|---|---:|
| Origin trees | **2** |
| Origin talents | **10** |
| Expansion targets | **1** |
| Expansion talents | **1** |
| Total certified identities | **11** |
| Correct-tree repo records mapped | **11** |
| Missing correct-tree records | **0** |

## High-impact discrepancies

### Malkite Techniques

The repository keeps the recurring poison attack concept but drops major operating constraints and resolution rules, including:

- once-per-encounter use;
- standard-action toxin application;
- nonenergy slashing/piercing weapon restriction;
- the unconscious result at the end of the condition track;
- the full cure/termination rule.

Disposition: `DESCRIPTION_INCOMPLETE`, `MECHANICS_INCOMPLETE`.

### Undetectable Poison

The source increases the **Treat Injury DC needed to cure** a poison by 5.

The repository broadens this into detecting and/or treating the poison. That is not the printed mechanic.

Disposition: `MECHANICS_ERROR`, `DESCRIPTION_ERROR`.

### Teräs Käsi Mastery

The source says that when a full attack contains only unarmed attacks, the full attack can be made as a **standard action instead of a full-round action**.

The repository wording adds a confusing restriction not present in the source.

Disposition: `MECHANICS_ERROR`.

### Unarmed Parry

The source requires the user to be aware of the attack and not flat-footed, and applies a cumulative -2 penalty to **all attack rolls** for each attack roll made since the beginning of the user's last turn.

The repository omits and/or misstates those clauses.

Disposition: `MECHANICS_ERROR`, `DESCRIPTION_INCOMPLETE`.

### Drain Knowledge

The current record is only a short summary and loses most of the actual procedure:

- standard action;
- Force Point cost;
- Use the Force check vs. Will Defense;
- one-day lockout after failure against the same target;
- one-day duration of gained training/Skill Focus;
- persistent condition and its 8-hour-rest recovery;
- alternate Perception-based mind-sifting mode;
- Dark Side Score increase.

Disposition: `DESCRIPTION_INCOMPLETE`, `MECHANICS_INCOMPLETE`.

## Prerequisite defects

Confirmed prerequisite errors:

- Ignore Damage Reduction - repository omits **Martial Arts I**.
- Unarmed Counterstrike - repository omits **Teräs Käsi Basics, Martial Arts I, Martial Arts II**.

## Naming normalization

The repository spells the Teräs Käsi tree/talents as `Teras Kasi` without diacritics. Identity is unambiguous under normalization; this is recorded as a naming-normalization issue rather than a distinct talent identity.

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
    = Threats of the Galaxy + printed page
```

## Stop gate

- [x] 2 origin trees / 10 origin talents certified.
- [x] 1 expansion talent certified.
- [x] 11/11 identities mapped to correct-tree repo records.
- [x] Printed pages verified.
- [x] PDF-only Teräs Käsi sidebar captured from visual source.
- [x] Canonical prerequisites recorded.
- [x] Content discrepancies classified.
- [x] No structural registry correction required.
- [x] No production/runtime changes.

# Verdict

**Threats of the Galaxy Phase 2 content certification is complete.**
