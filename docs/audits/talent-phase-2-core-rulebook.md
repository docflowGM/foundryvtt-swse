# PHASE 2 — Saga Edition Core Rulebook Talent Content Certification

**Status:** COMPLETE  
**Date:** 2026-09-26  
**Branch:** `audit/talent-phase-1-tree-census`  
**Book order:** 1

## Scope

This pass certifies the **Saga Edition Core Rulebook** talent corpus at the individual-talent content level.

It covers:

- canonical talent identity;
- canonical talent tree;
- printed source page;
- canonical rules description;
- canonical prerequisites;
- comparison to the current repository record;
- a separate short player-facing summary.

The short summary is derived presentation text and is **not** RAW.

No production talent-pack edits are made in this pass.

---

# Source method

Primary authority:

- `Star Wars Saga Edition.pdf`

Fast search/transcription layer:

- `Core Rulebook_djvu.txt`

The Core PDF is an image scan. TXT/DJVU was used for bulk discovery and transcription, while rendered PDF pages were used to verify page boundaries, identity, two-column ambiguities, and suspicious OCR.

Verified scan mapping:

```text
PDF page = printed source page + 1
```

Repository content was never treated as source authority.

---

# Content contract

Each Core record in:

`data/audits/talent-phase-2-core-rulebook-content.json`

contains:

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

Identity remains:

```text
sourcebook + canonical tree + talent name
```

not display name alone.

## Canonical description

`canonicalDescription` is the source-backed Core rule for that exact identity.

Later-book additions, vehicle extensions, homebrew text, and same-name talents from other trees are not folded into Core RAW.

## Quick summary

`quickSummary` is deliberately shorter player-facing text.

Every quick summary is marked:

`DERIVED_PLAYER_FACING_NOT_RAW`

This allows the eventual UI to show both:

- **Full Rules / RAW**
- **Quick Summary**

without confusing paraphrase with source text.

---

# Final Core census

The completed Core pass certifies:

| Measure | Count |
|---|---:|
| Canonical Core talent identities | **198** |
| Canonical Core tree identities | **40** |
| Correct/source-aligned repo identities | **173** |
| Wrong-tree repository identities | **17** |
| Missing repository talent records | **7** |
| Missing distinct same-name identity | **1** |
| Description defects | **30** |
| Prerequisite defects | **9** |
| Core records carrying later-source/application extensions | **14** |
| Noncanonical active-form rewrites | **12** |

Every one of the 198 source identities now has:

- a printed page;
- a nonempty canonical description;
- a quick summary;
- a tree identity;
- a final Phase 2 disposition.

There are **0 unresolved identity reviews**.

---

# Phase 1D correction discovered during Phase 2

The Core source check found that Phase 1D omitted one printed Core Sith talent:

## Improved Dark Healing — Core p.224

The talent already exists in the repository Sith tree.

The error was in the canonical registry, not the production talent pack.

Phase 2 restored it to:

```text
Saga Edition Core Rulebook | Sith | Improved Dark Healing
```

and recomputed the global structural manifest.

Updated structural totals:

| Measure | Before | After |
|---|---:|---:|
| Aggregate canonical membership claims | 1,190 | **1,191** |
| Extra repo membership claims | 75 | **74** |

The canonical membership-gap count remains 281 because the talent was already present in the correct repository tree.

---

# Missing Core repository content

Seven printed Core talent identities have no repository talent record:

1. Brawler — **Unbalance Opponent**
2. Jensaarai Defender — **Attune Armor**
3. Jensaarai Defender — **Force Cloak Mastery**
4. Jensaarai Defender — **Linked Defense**
5. Dathomiri Witch — **Command Beast**
6. Dathomiri Witch — **Flight**
7. Weapon Master — **Multiattack Proficiency (heavy weapons)**

There is also one distinct same-name identity missing:

## Bounty Hunter — Notorious

Core publishes separate `Notorious` talents in:

- Bounty Hunter
- Infamy

The repository does not currently contain a distinct Bounty Hunter identity.

The unsuffixed repo `Notorious` is attached to Infamy and is heavily contaminated with unrelated later-source material.

This is an identity defect, not a simple rename.

---

# Source-confirmed wrong-tree examples

Core Phase 2 reconfirms structural defects such as:

- Skilled Advisor → Jedi Consular
- Demand Surrender → Influence
- Born Leader → Leadership
- Acute Senses → Awareness
- Jury-Rigger → Fringer
- Long Stride → Fringer
- Gun Club → Brawler
- Melee Smash → Brawler
- Stunning Strike → Brawler
- Draw Fire → Commando
- Harm's Way → Commando
- Devastating Attack → Weapon Specialist
- Penetrating Attack → Weapon Specialist
- Equilibrium → Control
- Visions → Sense
- Charm Beast → Dathomiri Witch
- Multiattack Proficiency (lightsabers) → Duelist

These remain production-repair work, not source-audit changes.

---

# Major Core description defects

## Resilience

Core:

- spend a Force Point;
- swift action;
- move +2 steps up the condition track.

Repository currently describes a full-round action and omits the Force Point cost.

## Fool's Luck

Core grants **luck bonuses**.

The repository uses **competence bonuses**, changing stacking behavior.

## Educated

Core:

> make any Knowledge check untrained.

The repository description is empty and its benefit field contains concatenated unrelated material.

## Telekinetic Power / Telekinetic Savant

Both Core identities currently contain later-book material instead of their Core rules.

## Equilibrium

Core is a swift-action Force Point condition-removal talent.

The repository record is in the wrong tree and contains unrelated Unknown Regions material.

## Power of the Dark Side

The repository record contains a large concatenation of multiple later talents plus homebrew material instead of the Core identity.

## Force Perception / Force Pilot

Both are heavily concatenated.

`Force Pilot` also has a noncanonical `Technometry` prerequisite.

## Visions

The current repo record is a different Draethos/Keetael mechanic.

Core `Visions` is a Sense-tree farseeing talent.

## Adept Spellcaster

Core is the Dathomiri Witch full-round-action Force-power reroll talent.

The repository record instead begins with the `Flight` mechanic and then includes Dathomir homebrew material.

## Force Cloak

The current Jensaarai `Force Cloak` record contains material belonging to later talents in the same tree rather than a clean base Force Cloak identity.

## Juke

Core Juke improves the vehicle Reflex dodge bonus while fighting defensively.

The repository currently describes an additional Vehicular Combat negation instead.

---

# Lightsaber Forms: source-confirmed systemic rewrite

All twelve Core Lightsaber Form talents currently contain an added activation model:

```text
While [Form] is your active Lightsaber Form...
Only one Lightsaber Form can be active at a time.
```

That restriction is **not present in the Core talent rules**.

Affected identities:

- Ataru
- Djem So
- Jar'Kai
- Juyo
- Makashi
- Niman
- Shien
- Shii-Cho
- Sokan
- Soresu
- Trakata
- Vaapad

These are classified:

`NONCANONICAL_ACTIVE_FORM_RESTRICTION`

This is important for later runtime repair: the current implementation must not use this invented exclusivity rule as its rules authority.

---

# Prerequisite defects

Nine Core identities retain source-significant prerequisite differences after OCR/page-reference normalization.

Examples include:

- Force Pilot — repo incorrectly requires Technometry
- Adept Spellcaster — repo incorrectly requires Ichor Creation
- Force Recovery — repo incorrectly adds Second Wind as a prerequisite
- Spacehound — repo has an erroneous self-prerequisite
- Vehicular Evasion — repo prerequisite field is corrupted
- Inspire Fear III — repo omits Inspire Fear II
- Greater Devastating Attack — repo omits printed Weapon Focus prerequisite
- Greater Penetrating Attack — repo omits printed Weapon Focus prerequisite
- Greater Weapon Specialization — repo omits printed Weapon Focus prerequisite

Formatting-only differences such as capitalization, page references, or phrases like “trained in the Initiative skill” were not counted as defects.

---

# Later-source extension candidates

Fourteen Core identities contain text that substantially preserves the Core rule but appends vehicle, starship, or other application language not printed with the Core talent.

These are classified separately as:

`CORE_TEXT_WITH_LATER_EXTENSION`

They are **not** automatically errors to delete.

Later sourcebook passes will determine whether each added clause is:

- a legitimate later published expansion/application;
- explanatory implementation text;
- or contamination.

This prevents the Core pass from destroying legitimate later rules before their sourcebook is audited.

---

# Machine-readable authority

Core content authority:

`data/audits/talent-phase-2-core-rulebook-content.json`

Structural authority remains:

`data/audits/talent-canonical-tree-registry.json`

Structural repair queue:

`data/audits/talent-phase-1d-structural-correction-manifest.json`

The Core Phase 2 manifest is the authority for Core talent rules text and quick summaries; it does not replace the tree registry's structural role.

---

# Stop gate

- [x] All Core talent trees source-mapped.
- [x] All 198 Core talent identities page-mapped.
- [x] Every Core identity has canonical rules text.
- [x] Every Core identity has canonical prerequisites recorded.
- [x] Every Core identity has a player-facing quick summary.
- [x] Quick summaries explicitly marked non-RAW.
- [x] Wrong-tree identities identified.
- [x] Missing repo identities identified.
- [x] Same-name Notorious collision handled by tree identity.
- [x] Source contamination identified.
- [x] Lightsaber Form exclusivity rewrite identified.
- [x] Prerequisite differences normalized and source-significant errors retained.
- [x] Improved Dark Healing restored to Phase 1D registry.
- [x] Structural correction manifest recomputed.
- [x] No production talent-pack edits made.
- [x] No unresolved identity reviews remain.

# Verdict

**Saga Edition Core Rulebook Phase 2 content certification is complete.**

The next book is the **Clone Wars Campaign Guide**, using the same content contract and the same branch.
