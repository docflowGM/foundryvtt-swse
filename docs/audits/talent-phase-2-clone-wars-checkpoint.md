# PHASE 2 CHECKPOINT — Clone Wars Campaign Guide Talent Content Certification

**Status:** IN PROGRESS / CHECKPOINT  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 2

## Scope frozen

The Phase 1D canonical registry defines the Clone Wars Campaign Guide Phase 2 population as:

| Publication type | Trees | Talent claims |
|---|---:|---:|
| Clone Wars origin trees | **18** | **95** |
| Clone Wars additions to existing trees | **14** | **23** |
| **Total** |  | **118** |

This 118-claim population is the Phase 2 certification target for the book.

---

# 1. Origin trees

The 18 Clone Wars-origin trees currently in scope are:

- Collaborator
- Droid Commander
- Jedi Archivist
- Jedi Healer
- Loyal Protector
- Melee Specialist
- Military Engineer
- Opportunist
- Reconnaissance
- Republic Commando
- Squad Leader
- Surveillance
- Trooper
- Vanguard
- Bando Gora Captain
- Believer Disciple
- Korunnai Adept
- Light Side

Total origin identities: **95**

---

# 2. Expansion targets

Clone Wars publishes 23 talents into 14 pre-existing trees:

## Brawler
- Bayonet Master
- Unrelenting Assault

## Commando
- Keep Them at Bay

## Expert Pilot
- Renowned Pilot

## Force Item
- Focused Force Talisman
- Greater Focused Force Talisman

## Gunslinger
- Blind Shot

## Jedi Consular
- Consular's Vitality
- Improved Consular's Vitality

## Jedi Guardian
- Exposing Strike
- Guardian Strike

## Jedi Sentinel
- Sentinel's Observation
- Unseen Eyes

## Military Tactics
- Exploit Weakness
- Grand Leader
- Uncanny Defense

## Misfortune
- Stymie

## Alter
- Aversion

## Control
- The Will To Resist

## Dark Side
- Consumed by Darkness

## Sense
- Heightened Awareness
- Psychometry
- Shift Sense

Total expansion claims: **23**

---

# 3. Source workflow established

Primary authority:

- `SAGA EDITION - Clone Wars Campaign Guide.pdf`

Bulk search/transcription layer:

- `Clone Wars Campaign Guide_djvu.txt`

Rules:

1. process tree-by-tree;
2. use TXT/DJVU for discovery and bulk text extraction;
3. use rendered PDF pages for page attribution, headings, tree boundaries, and OCR-sensitive wording;
4. identity remains `sourcebook + canonical tree + talent name`;
5. expansion talents remain attached to the tree that owns them, while Clone Wars remains the publication source;
6. repository text is comparison input only, never source authority;
7. quick summaries remain derived player-facing text and never RAW.

---

# 4. PDF/source mapping completed so far

The book's relevant source regions have been located and rendered for:

- heroic/base-class talent material;
- prestige-class talent material;
- Force talent / Force-tradition material;
- Clone Wars expansion sections.

The rendered source pages are being used to validate:

- printed page attribution;
- two-column boundaries;
- prerequisite lines;
- Special clauses;
- tree ownership;
- name/punctuation ambiguity.

The source-page mapping is sufficiently stable to proceed with full tree-by-tree content extraction.

---

# 5. Repository comparison path established

The normal `packs/talents.db` file is approximately 2.7 MB and awkward to inspect record-by-record through the repository API.

A smaller current-record mirror has been identified:

`data/fixes/talents.fixed.json`

This provides the current talent item data in a bulk JSON form and will be used for deterministic Clone Wars comparison.

The Core Phase 2 schema is being reused rather than inventing another contract:

`data/audits/talent-phase-2-core-rulebook-content.json`

Target Clone Wars records will therefore carry the same concepts:

```text
canonicalIdentity
canonicalName
canonicalTreeName
canonicalTreeKey
sourcebook
page
canonicalDescription
canonicalPrerequisites
quickSummary
quickSummaryAuthority
canonicalTextCapture
repoRecordId
repoName
repoTreeName
repoTreeId
repoDescription
repoPrerequisites
dispositions[]
notes
```

---

# 6. Content contract carried forward from Core

For later production repair:

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical full player-readable rules text

system.summary
    = concise derived player-facing summary

system.prerequisites
    = canonical printed prerequisite text

source/page
    = Clone Wars Campaign Guide + printed page
```

`system.summary` is never mechanical authority.

---

# 7. Current stopping point

Completed:

- [x] Clone Wars Phase 2 scope frozen from canonical registry.
- [x] 18 origin trees identified.
- [x] 95 origin talent identities counted.
- [x] 14 expansion targets identified.
- [x] 23 expansion talent identities counted.
- [x] Total 118 source claims established.
- [x] relevant sourcebook talent bands located.
- [x] rendered PDF page verification started/completed for source-band mapping.
- [x] bulk repository comparison source identified.
- [x] Core Phase 2 output schema selected for reuse.

Still in progress:

- [ ] extract canonical rules text for all 118 identities.
- [ ] capture canonical printed prerequisite text.
- [ ] assign printed source page to each identity.
- [ ] extract Special/repeated-selection clauses.
- [ ] generate player-facing quick summaries.
- [ ] compare all 118 identities against current repo records.
- [ ] classify text/prerequisite/tree/identity/source defects.
- [ ] correct any Phase 1D structural omission discovered by source text.
- [ ] publish Clone Wars machine-readable certification data.
- [ ] publish Clone Wars discrepancy manifest.
- [ ] publish final Clone Wars Phase 2 Markdown closeout.
- [ ] validate whole book.
- [ ] push completed book before moving to Rebellion Era.

No production talent-pack records have been modified.
