# PHASE 2 - Core Rulebook Talent Text / Provenance Certification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`

## Scope

This book pass certifies the individual talent content published by the **Star Wars Saga Edition Core Rulebook**.

For each canonical Core talent, Phase 2 records:

- sourcebook + printed page;
- canonical tree-scoped identity;
- canonical full benefit/rules text;
- canonical prerequisite text;
- player-facing summary candidate;
- current repository record mapping;
- current benefit/description/prerequisite comparison status.

The TXT/DJVU export was used for bulk extraction and indexing. The rendered Core PDF scan was used as final authority whenever two-column OCR, headings, tree boundaries, or wording were unsafe.

No production talent-pack records are modified by this audit pass.

---

# 1. Canonical Core count

Phase 1D had recorded 197 Core origin talent identities.

Page-level Phase 2 verification found one omission:

`Sith -> Improved Dark Healing`

The Core Rulebook prints **Improved Dark Healing** in the Sith talent tree on printed page 224.

The canonical Core total is therefore:

**198 talents**

The registry has been corrected transparently rather than preserving the Phase 1D omission.

---

# 2. Source-certification results

| Result | Count |
|---|---:|
| Canonical Core talents | **198** |
| PDF/manual source verification | **91** |
| Clean TXT extraction + PDF page mapping | **107** |
| Empty canonical benefit text | **0** |
| Empty source/page provenance | **0** |
| Duplicate canonical identities | **0** |
| Empty summary candidates | **0** |
| Summary candidates over 220 chars | **0** |
| Summary candidates containing runtime/Foundry jargon | **0** |

Machine authority for this book:

`data/audits/talent-phase-2-core-certification.json`

---

# 3. Current repository comparison

Of the 198 source-certified Core identities:

| Repository mapping | Count |
|---|---:|
| Safe tree-scoped existing record | **173** |
| Existing single-name record currently in wrong tree | **14** |
| Canonical identity missing from repo | **8** |
| Distinct same-name canonical identity missing | **3** |
| **Total** | **198** |

Current text comparison:

| Text state | Count |
|---|---:|
| Canonical after normalization | **43** |
| Source-equivalent with minor normalization differences | **22** |
| Benefit requires canonical text repair | **122** |
| No safe repository content record | **11** |

Current prerequisite comparison:

- correct/normalized: **159**
- prerequisite repair required: **28**
- missing with the identity: **11**

Current summary field:

- **198 / 198 Core talents currently lack `system.summary`**

The high text-error count should not be read as “122 entirely wrong mechanics.” It includes several defect classes:

- shortened/paraphrased source text;
- later-book clauses merged into the Core record;
- cross-book concatenation;
- Wikia/homebrew contamination;
- source text attached to a wrong tree identity;
- incomplete benefit clauses;
- genuine incorrect mechanics.

Phase 2 records the canonical target without silently modifying runtime metadata.

---

# 4. Eleven Core identities without a safe in-place repository target

## Missing repository identities

- Brawler -> Unbalance Opponent
- Jensaarai Defender -> Attune Armor
- Jensaarai Defender -> Force Cloak Mastery
- Jensaarai Defender -> Linked Defense
- Dathomiri Witch -> Command Beast
- Dathomiri Witch -> Flight
- Weapon Master -> Multiattack Proficiency (heavy weapons)
- Duelist -> Multiattack Proficiency (lightsabers)

## Distinct same-name identities missing

These names exist elsewhere in the repository, but that existing record is not a safe identity match:

- Bounty Hunter -> Notorious
- Commando -> Draw Fire
- Sense -> Visions

These must not be repaired by overwriting the same-name record in another canonical tree.

---

# 5. Fourteen current wrong-tree single-name mappings

Phase 2 confirms existing talent records whose mechanical identity can be traced to Core but whose current tree placement is wrong:

- Jedi Consular -> Skilled Advisor
- Influence -> Demand Surrender
- Leadership -> Born Leader
- Awareness -> Acute Senses
- Fringer -> Jury-Rigger
- Fringer -> Long Stride
- Brawler -> Gun Club
- Brawler -> Melee Smash
- Brawler -> Stunning Strike
- Commando -> Harm's Way
- Weapon Specialist -> Devastating Attack
- Weapon Specialist -> Penetrating Attack
- Control -> Equilibrium
- Dathomiri Witch -> Charm Beast

This list is certification evidence only. Tree mutation remains a production-repair operation.

---

# 6. Important source-text defects confirmed

The detailed machine file contains the complete per-talent comparison. High-value examples include:

## Core-only clauses polluted by later material

Current repository records for several Core talents contain text from later books or unrelated identities, including:

- Power of the Dark Side
- Force Perception
- Force Pilot
- Equilibrium
- Telekinetic Power
- Telekinetic Savant
- Educated

## Homebrew contamination

The current Dathomiri Witch / Adept Spellcaster record contains noncanonical homebrew material in addition to published rules text.

## Core talent expanded incorrectly with later vehicle clauses

Core source verification shows that the Core versions of talents such as these do not include later-added vehicle/starship clauses currently present in the repository text:

- Acute Senses
- Improved Stealth
- Hidden Movement
- Evasion

The sourcebook that later publishes an expansion or variant must own that later wording; it should not be silently folded into the Core canonical benefit.

## Resilience

The current repository presentation materially changes the activation.

Core source:
- spend a Force Point;
- **swift action**;
- move +2 steps on the condition track.

The current repository benefit had represented this differently.

## Force Talisman vs Greater Force Talisman

These are not duplicate descriptions.

Core establishes:

- Force Talisman -> +1 Force bonus to one chosen defense while carrying the talisman.
- Greater Force Talisman -> extends the talisman's bonus to all three defenses.

The current pack uses the same/near-identical text for both and requires repair.

## Deflect

The current record contains a clause about spending a Force Point to protect an adjacent character that is not part of the Core Deflect text verified on printed page 41.

The Core canonical text is retained separately from any later rule publication.

---

# 7. Same-name protection remains mandatory

The Core pass itself contains distinct or collision-prone names.

Notably:

`Bounty Hunter -> Notorious`

and:

`Infamy -> Notorious`

are two separate Core talent identities with different rules text.

Name-based overwrite or dedupe would corrupt one of them.

The Phase 2 identity key remains:

`sourcebook + canonical tree + talent name`

---

# 8. Summary layer

Every Core certification record includes a player-facing summary candidate.

The summary:

- is not source authority;
- is kept separate from canonical benefit text;
- is capped at a compact UI-friendly length;
- contains no Foundry/runtime implementation terminology.

Production adoption of summaries belongs to the later content-repair/UI pass.

---

# 9. Phase 2 structural correction to Phase 1D

Phase 2 found one legitimate source correction to the completed structural registry:

`Saga Edition Core Rulebook | Sith | Improved Dark Healing`

The registry now includes it in:

- `originTalentNames`
- Core `TREE_ORIGIN_MEMBERSHIP`
- aggregate Sith canonical membership

This is recorded under `phase2Corrections`; it does not silently rewrite the historical Phase 1D closeout numbers.

---

# 10. Acceptance gate

- [x] Every Core talent has a tree-scoped canonical identity.
- [x] Every Core talent has a sourcebook and printed page.
- [x] Every Core talent has non-empty canonical rules text.
- [x] Every Core talent has canonical prerequisite text or an explicit empty prerequisite.
- [x] Every Core talent has a summary candidate.
- [x] Unsafe TXT/OCR cases were manually PDF-verified.
- [x] Same-name collisions were not merged.
- [x] Current repository record mappings were classified.
- [x] Missing identities were not assigned to a nearest same-name record.
- [x] Improved Dark Healing registry omission was corrected.
- [x] No runtime / abilityMeta mechanics were opportunistically changed.
- [x] No production talent records were modified.

# Verdict

**Core Rulebook Phase 2 source certification is complete.**

The Core book now has a deterministic source-backed content target for the later repository-repair pass.

The next book can be audited independently and committed on the same branch.
