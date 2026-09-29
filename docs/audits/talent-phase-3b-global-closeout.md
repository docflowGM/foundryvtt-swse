# Talent Canonicalization Phase 3B — Global Closeout

**Status:** COMPLETE / CERTIFIED  
**Date:** 2026-09-29  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Production mutation:** NONE  
**Next phase:** Phase 3C production repair

## Closeout result

Phase 3B is globally reconciled across all 14 sourcebooks.

| Measure | Certified result |
|---|---:|
| Sourcebooks | 14 |
| Publication claims | 1,182 |
| Canonical identities | 1,180 |
| Reference-only publication claims | 2 |
| Existing canonical production records | 932 |
| Generated talent records | 248 |
| Production talent records before Phase 3C | 1,024 |
| Projected production talent records after Phase 3C | 1,272 |
| Review-only production extras | 2 |
| Production-only records deferred to Phase 3D | 90 |
| Talent-tree creates | 7 |
| Talent-tree consolidations | 1 |
| Class-access mutations | 5 |

Every one of the 1,180 canonical identities appears exactly once across the 14 certified Phase 3B manifests, and every manifest owner matches the Phase 3A primary-publication authority.

## Global disposition totals

| Disposition | Count |
|---|---:|
| `UPDATE_CONTENT` | 727 |
| `UPDATE_METADATA` | 144 |
| `CREATE` | 236 |
| `REMOVE_CONTAMINATION` | 38 |
| `CORRECT_TREE` | 23 |
| `IDENTITY_SPLIT` | 12 |
| **Total** | **1,180** |

The 248 generated talent IDs are the 236 `CREATE` records plus the 12 `IDENTITY_SPLIT` records.

Global verification found:

- no duplicate canonical identity ownership;
- no production record assigned to more than one canonical identity;
- no duplicate generated talent IDs;
- no generated talent ID collision with the existing production pack;
- no duplicate generated tree IDs;
- no generated tree ID collision with the existing tree pack.

## Cross-book blocker found and corrected

The global inverse check found one invalid pre-closeout assignment:

- production record `bab9a1ce285f98b9` — **Charm Beast** in the Beastwarden tree — had been assigned to both:
  - Saga Edition Core Rulebook — Dathomiri Witch — Charm Beast; and
  - Jedi Academy Training Manual — Beastwarden — Charm Beast.

These are two canonical identities in two different canonical trees.

The Core manifest has been corrected from `CORRECT_TREE` to `IDENTITY_SPLIT`.

Final authority:

- JATM Beastwarden — Charm Beast preserves `bab9a1ce285f98b9`.
- Core Dathomiri Witch — Charm Beast creates `c919d7682bd9df40`.

This is now enforced by the global closeout checker.

## Production inverse classification

The current production talent pack contains 1,024 documents.

They now classify exhaustively as:

| Production category | Count |
|---|---:|
| Existing records consumed by canonical graph | 932 |
| Explicit review-only duplicate candidates | 2 |
| Production-only records deferred to Phase 3D | 90 |
| **Total production records** | **1,024** |

The 90 deferred records are **not Phase 3C deletion targets**. They include homebrew/noncanonical records, typo/alias records, class-feature-like records, and other repository-only content that is not represented as a canonical talent identity.

Registry context for the 90 deferred records:

| Registry status | Count |
|---|---:|
| `REPO_TREE_PRESENT` | 39 |
| `REPO_ONLY_NONCANONICAL_HOMEBREW` | 38 |
| `SOURCE_VERIFIED_SPECIAL_TREE` | 10 |
| Unregistered/noncanonical tree | 2 |
| `REPO_ONLY_SPECIAL_OR_UNRESOLVED` | 1 |

The complete 90-record inventory is stored in:

`data/audits/talent-phase-3b-global-closeout.json`

Every record is classified `DEFER_PHASE_3D_PRODUCTION_ONLY`.

## Review-only extras

Two duplicate canonical-alias candidates remain untouched until Phase 3D:

- Core Infamy — Notorious — `a7d8c4da96eacad4`
- Threats of the Galaxy Master of Teräs Käsi — Teräs Käsi Basics — `222327492c484b4a`

These are not Phase 3C deletion instructions.

## Reference-only publications

Two publication claims do not emit their own production mutation:

- Knights of the Old Republic Campaign Guide — Alter — Illusion
- Jedi Academy Training Manual — Alter — Illusion

Both resolve to the merged Alter — Illusion identity whose primary production owner is Force Unleashed Campaign Guide.

## Tree corrections reviewed

All 23 `CORRECT_TREE` operations were reviewed together.

### Core Rulebook — 16

- Jedi Consular — Skilled Advisor
- Influence — Demand Surrender
- Leadership — Born Leader
- Awareness — Acute Senses
- Fringer — Jury-Rigger
- Fringer — Long Stride
- Brawler — Gun Club
- Brawler — Melee Smash
- Brawler — Stunning Strike
- Commando — Draw Fire
- Commando — Harm's Way
- Weapon Specialist — Devastating Attack
- Weapon Specialist — Penetrating Attack
- Control — Equilibrium
- Sense — Visions
- Duelist — Multiattack Proficiency (lightsabers)

### Knights of the Old Republic — 2

- Jedi Sentinel — Sentinel Strike
- Jedi Sentinel — Sentinel's Gambit

### Legacy Era — 1

- Misfortune — Seducer

### Scum and Villainy — 3

- GenoHaradan — Deadly Repercussions
- GenoHaradan — Improved Manipulating Strike
- GenoHaradan — Pulling the Strings

### Starships of the Galaxy — 1

- Outlaw Tech — Quick Fix

## Identity splits reviewed

All 12 `IDENTITY_SPLIT` operations were reviewed together:

- Core — Bounty Hunter — Notorious
- Core — Dathomiri Witch — Charm Beast
- Galaxy at War — Leadership — Commanding Presence
- Galaxy at War — Camouflage — Slip By
- Galaxy at War — Advance Patrol — Mobile Combatant
- Galaxy of Intrigue — Master of Intrigue — Blend In
- Galaxy of Intrigue — Master of Intrigue — Get into Position
- Knights of the Old Republic — Sith — Sith Alchemy
- Rebellion Era — Rebel Recruiter — Stay in the Fight
- Scum and Villainy — Piracy — Keep Them Reeling
- Unknown Regions — Commando — Out of Harm's Way
- Unknown Regions — Military Tactics — Lead by Example

Each split creates a new deterministic ID rather than overwriting the same-name record in another tree.

## Contamination operations reviewed

All 38 `REMOVE_CONTAMINATION` operations are represented in the machine closeout:

- Core Rulebook — 31
- Clone Wars Campaign Guide — 3
- Rebellion Era Campaign Guide — 3
- Legacy Era Campaign Guide — 1

The exact identities, production IDs, and Phase 2 flags are listed under `specialOperations.REMOVE_CONTAMINATION` in the global closeout JSON.

## Tree creation and consolidation

Seven canonical trees must be created before their talents:

### Galaxy at War

- Squad Leader — `3b30dd12884bb2e4`
- Martial Arts Forms — `8633ecbf7151fbb6`
- Unarmed Mastery — `10738666e7ddcd1f`

### Galaxy of Intrigue

- Skill Challenge — `7ab8bd7bce901f85`
- Espionage — `0c4ddea3c78ffc3d`

### Jedi Academy Training Manual

- Shapers of Kro Var — `ab3311a860d8d359`
- Zeison Sha Warrior — `aec386e85f66e93e`

The five class-access mutations are limited to the Galaxy at War and Galaxy of Intrigue trees. The two Jedi Academy trees are Force-tradition gated and receive no invented class access.

One tree consolidation is certified:

- Scum and Villainy — GenoHaradan
  - survivor: `da7b731a3e434a7a`
  - obsolete split fragment: `db1b30c2163d0650`

The obsolete tree contains exactly the three canonical talents being moved to the survivor. No production-only or deferred talent would be orphaned by deleting that obsolete split fragment.

## Phase 3C start gate

Phase 3C may begin only after this preflight passes:

```bash
node tools/build-talent-canonical-authority.mjs --check
node tools/build-talent-phase-3b-core-manifest.mjs --check
node tools/build-talent-phase-3b-clone-wars-manifest.mjs --check
node tools/build-talent-phase-3b-rebellion-era-manifest.mjs --check
node tools/build-talent-phase-3b-galaxy-at-war-manifest.mjs --check
node tools/build-talent-phase-3b-galaxy-of-intrigue-manifest.mjs --check
node tools/build-talent-phase-3b-starships-manifest.mjs --check
node tools/build-talent-phase-3b-threats-manifest.mjs --check
node tools/build-talent-phase-3b-scum-and-villainy-manifest.mjs --check
node tools/build-talent-phase-3b-unknown-regions-manifest.mjs --check
node tools/build-talent-phase-3b-legacy-era-manifest.mjs --check
node tools/build-talent-phase-3b-kotor-manifest.mjs --check
node tools/build-talent-phase-3b-force-unleashed-manifest.mjs --check
node tools/build-talent-phase-3b-jedi-academy-manifest.mjs --check
node tools/build-talent-phase-3b-scavengers-manifest.mjs --check
node tools/check-talent-phase-3b-global-closeout.mjs
```

Phase 3C must apply only the certified manifest mutations. The two review extras and all 90 `DEFER_PHASE_3D_PRODUCTION_ONLY` records remain untouched until Phase 3D.
