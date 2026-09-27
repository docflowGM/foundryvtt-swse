# PHASE 2 - Core Rulebook Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Scope

This is the first book-level Phase 2 content pass.

The Core Rulebook was processed tree-by-tree. For every Core-origin talent this pass certifies:

- canonical tree-scoped identity;
- printed Core page;
- full published mechanical rules text;
- printed prerequisite text;
- Special/repeated-selection clauses;
- a separate concise player-facing summary.

The quick summary is presentation-only. It is never mechanical authority.

TXT/DJVU text was used as the bulk extraction/index layer. The scanned Core PDF was rendered and visually checked for page attribution, tree boundaries, and OCR-sensitive clauses.

No production talent-pack records are changed in this pass.

---

# Certified population

- Core talent trees: **40**
- Core-origin talent identities: **198**
- Correct-tree repo records present: **174**
- Canonical identities absent from the correct repo tree: **24**

The detailed canonical content is published in:

`data/audits/talent-phase-2-core-content-certification.json`

The deterministic current-repo comparison is:

`data/audits/talent-phase-2-core-discrepancy-manifest.json`

---

# Repo content census

## Benefit

- BENEFIT_DIFFERENT: **105**
- MISSING_CORRECT_TREE_RECORD: **24**
- BENEFIT_EXACT: **49**
- BENEFIT_TRUNCATED_OR_SUMMARY: **17**
- BENEFIT_HAS_EXTRA_TEXT: **3**

## Description

- DESCRIPTION_DIFFERENT: **110**
- MISSING_CORRECT_TREE_RECORD: **24**
- DESCRIPTION_EXACT: **41**
- DESCRIPTION_HAS_EXTRA_TEXT: **14**
- DESCRIPTION_TRUNCATED_OR_SUMMARY: **9**

## Prerequisites

- PREREQUISITES_EXACT: **163**
- MISSING_CORRECT_TREE_RECORD: **24**
- PREREQUISITES_EQUIVALENT_FORMATTING: **2**
- PREREQUISITES_CANONICAL_MISMATCH: **9**

## Presentation/source metadata

- Current Core records with populated `system.summary`: **0**
- Existing linked Core records missing both explicit sourcebook and page fields: **169**

This confirms the planned content contract is filling real data gaps rather than duplicating existing fields.

---

# Phase 1D correction found by Phase 2

The detailed Core source pass found one structural omission in the closed Phase 1D registry:

**Sith -> Improved Dark Healing (Core p. 224)**

It is a printed Core Sith talent and already has a repository talent record:

`b03db168b3f23da0`

The canonical Sith origin membership is corrected to:

1. Dark Healing
2. Dark Scourge
3. Dark Side Adept
4. Dark Side Master
5. Force Deception
6. Improved Dark Healing
7. Wicked Strike

The Phase 1D structural correction manifest is refreshed from the corrected registry rather than leaving the machine authority stale.

---

# Canonical identities absent from the correct repo tree

- Jedi Consular -> Skilled Advisor
- Influence -> Demand Surrender
- Leadership -> Born Leader
- Awareness -> Acute Senses
- Fringer -> Jury-Rigger
- Fringer -> Long Stride
- Brawler -> Gun Club
- Brawler -> Melee Smash
- Brawler -> Stunning Strike
- Brawler -> Unbalance Opponent
- Commando -> Draw Fire
- Commando -> Harm's Way
- Weapon Specialist -> Devastating Attack
- Weapon Specialist -> Penetrating Attack
- Control -> Equilibrium
- Sense -> Visions
- Jensaarai Defender -> Attune Armor
- Jensaarai Defender -> Force Cloak Mastery
- Jensaarai Defender -> Linked Defense
- Dathomiri Witch -> Charm Beast
- Dathomiri Witch -> Command Beast
- Dathomiri Witch -> Flight
- Bounty Hunter -> Notorious
- Duelist -> Multiattack Proficiency (lightsabers)

These are **correct-tree gaps**, not automatically missing talent documents. Several are known wrong-tree records elsewhere in the repository.

---

# Source-confirmed prerequisite mismatches

- Control -> Force Recovery
- Dark Side -> Power of the Dark Side
- Dark Side -> Dark Presence
- Sense -> Force Pilot
- Dathomiri Witch -> Adept Spellcaster
- Weapon Master -> Greater Devastating Attack
- Weapon Master -> Greater Penetrating Attack
- Weapon Master -> Greater Weapon Specialization
- Duelist -> Greater Weapon Specialization (Lightsabers)

Two additional raw prerequisite-string differences are formatting/normalization equivalents rather than rules errors:

- Lightsaber Combat -> Weapon Specialization (Lightsabers)
- Weapon Master -> Greater Weapon Focus

---

# Severe contamination examples

The following existing records are examples where the repository benefit is more than three times the length of the certified Core benefit (or otherwise exceeds 500 characters at that ratio), indicating concatenated/later/homebrew material rather than simple wording drift:

- Lineage -> Educated: repo benefit 2059 chars vs canonical 82
- Dark Side -> Power of the Dark Side: repo benefit 5202 chars vs canonical 230
- Sense -> Force Pilot: repo benefit 3138 chars vs canonical 335
- Sense -> Force Perception: repo benefit 2908 chars vs canonical 409
- Infamy -> Notorious: repo benefit 1166 chars vs canonical 241
- Dathomiri Witch -> Adept Spellcaster: repo benefit 1134 chars vs canonical 285
- Alter -> Telekinetic Savant: repo benefit 724 chars vs canonical 192
- Alter -> Telekinetic Power: repo benefit 951 chars vs canonical 308

Previously observed examples include `Educated`, `Power of the Dark Side`, `Force Pilot`, and `Adept Spellcaster`.

---

# Important identity safeguards confirmed

- The Bounty Hunter `Notorious` and Infamy `Notorious` are separate tree-scoped Core identities.
- `Multiattack Proficiency (heavy weapons)` is the printed Core name; the repo's `Multiattack Proficiency (heavy)` is a naming variant.
- Same-name or similar-name talents are not merged by display name.
- Later-book additions are not copied into Core canonical text.
- Vehicle/homebrew/later-source clarifications embedded in current repo text are not silently promoted to Core RAW.

---

# Field contract established by this pass

For the later repair phase:

```text
system.benefit
    = canonical published rules text

system.description.value
    = canonical full player-readable rules text

system.summary
    = concise derived quick summary

system.prerequisites
    = canonical printed prerequisite text

source/page
    = sourcebook + printed page provenance
```

`summary` is never a mechanical input.

---

# Stop gate

- [x] 40 Core trees processed tree-by-tree.
- [x] 198 Core-origin identities source-certified.
- [x] Printed page assigned to every Core identity.
- [x] Canonical benefit text captured.
- [x] Canonical prerequisite text captured.
- [x] Special/repeated-selection clauses separated where applicable.
- [x] Quick summary generated for every identity.
- [x] Every identity matched through canonical tree identity, not name alone.
- [x] Current repo content compared.
- [x] Improved Dark Healing structural omission corrected.
- [x] Phase 1D structural manifest refreshed.
- [x] No production talent records modified.

# Verdict

**Core Rulebook Phase 2 certification is complete.**

Core now has a source-certified content dataset suitable for the later talent data repair and Talent UI normalization work. The next book can proceed independently using the same contract.
