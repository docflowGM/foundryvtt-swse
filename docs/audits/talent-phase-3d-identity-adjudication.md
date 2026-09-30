# Phase 3D-2 — Identity Adjudication

Manifest: `data/audits/talent-phase-3d-dispositions.json` · Checker: `tools/check-talent-phase-3d-dispositions.mjs` ·
Tests: `tests/talent-phase-3d-review-extras.test.mjs` · Census: `talent-phase-3d-production-extras-census.md`.
**No production data has been modified.** Nothing here touches any of the 1,180 Phase 3C canonical records
(`PHASE_3C_CANONICAL_RECORD_TOUCHED`: none).

## Progress

| Bucket | Records | Status |
|---|---|---|
| Review extras (Notorious, Teräs Käsi Basics) | 2 | **Adjudicated** (this checkpoint) |
| SOURCE_VERIFIED_SPECIAL_TREE | 10 | pending |
| Missing trees (Embrace Dark Side, Force Meld) | 2 | pending |
| Same-name / sourcebook-hit candidates | — | pending |
| Actor-referenced | — | pending |
| No credible publication evidence | — | pending |

The other 90 sit in the manifest as `REVIEW_REQUIRED` with `adjudicationStatus: PENDING_3D2` — a placeholder, not a decision.

## 1. `a7d8c4da96eacad4` — Notorious (Infamy) → `REMOVE_CONTAMINATION`

**Answers to the Phase 3D questions**

1. *Is Infamy an older/wrong name for canonical Notorious?* No.
2. *Is it a distinct talent?* No.
3. *Is one production record simply a duplicate?* Not of Notorious — see below.
4. *Does it carry runtime metadata that must be migrated?* No.

**What it actually is.** Its benefit is the concatenation of three *other* published talents, with import-scraper residue
(`Reference Book: … Scum and Villainy`, `Prerequisites: ,`):

| Text segment | Real talent | Source | Canonical production ID |
|---|---|---|---|
| "When your Minions invoke your name, others take note…" | Shared Notoriety | Core TXT line 19846 (p. 210) | `9491f34aad83dfb1` |
| "When you make a successful Persuasion check, you can immediately make a second…" | Master Manipulator | Unknown Regions TXT lines 2914–2921 | `32fb42ce3ee46e6d` |
| "You can call in a small favor from someone who owes you…" | Small Favor | Unknown Regions TXT line 2923 | `81e423a476c377fa` |

It has no source/page, empty prerequisites, and `class`/`category` = Bounty Hunter while sitting in the Crime Lord Infamy tree.
The real Notorious entries are clean in the TXT and already canonical:

| Canonical identity | Text | Production ID |
|---|---|---|
| Core \| Infamy \| Notorious (p. 210, "Your reputation as a crime lord…", TXT 19944) | reroll Persuasion to intimidate, keep the better | `09744041cdcc9e22` |
| Core \| Bounty Hunter \| Notorious (p. 209, "Your skill as a bounty hunter…", TXT 19654) | same mechanic | `c67cbd59abd1cc53` (created in Phase 3C) |

**Why not `MERGE_DUPLICATE`.** The record carries no Notorious text; merging would launder three other talents' text into Notorious, and
there is no single survivor because two canonical Notorious identities exist. PDF not required: the TXT segmentation is unambiguous.

**Metadata.** Nothing valid is lost. `abilityMeta` is generic T26 scaffolding and its only card carries the corrupted text; `09744041`
already has the correct `notorious-infamy` card. *Optional follow-up (not part of this disposition):* give `c67cbd59` the same reference
card — that would touch a Phase 3C-created record and must then be flagged `PHASE_3C_CANONICAL_RECORD_TOUCHED`.

**References that must be resolved before deletion (all enumerated in the manifest)**

- `packs/talent_trees.db` — Infamy `c1be604242cb328f` (`talentIds` and one of the two `Notorious` name entries).
- `data/{generated,fixes}/talent-trees.registry.json` — regenerate with `tools/build-talent-tree-registry.mjs`, never by hand.
- `data/{generated,fixes}/talents.fixed.json` — remove the entry (producer to be confirmed in 3D-3).
- **32 embedded actor items** (`flags.core.sourceId = Compendium.foundryvtt-swse.talents.a7d8c4da96eacad4`): heroic 13, nonheroic 3, npc 16 (16 distinct actors,
  mirrored in `npc`). Deterministic repoint by the actor's class string: **20 → `09744041cdcc9e22`** (Crime Lord/Lord: Rodian Black Sun Vigo, Rav, Booster Terrik, Liash Keane,
  Dool Pundar, Hondo Ohnaka, Prince Xizor, Hutt Crime Lord, Black Sun Vigo, Tyber Zann) and **12 → `c67cbd59abd1cc53`** (Hunter: Calo Nord, Jango Fett, Dob and Del Moomo,
  Solvek, Sisla, Boba Fett). Both targets are mechanically identical, so the repoint is rules-neutral. These actor items are also stale snapshots of the corrupted text;
  3D-4 must refresh their benefit/description as well, not only `sourceId`.
- Tests: `tests/talent-phase-3c-migration-flow.test.mjs`, `tests/talent-tree-membership-review-extras.test.mjs`; the membership audit's review-extra exemption becomes obsolete.
- Historical audit/doc references (`data/audits/*`, `docs/audits/*`, `docs/talent-martial-underworld-prestige-cleanup-phase-t12.json`) need no action.

**Expected final:** record removed; Infamy keeps `09744041` as its sole Notorious (12 members); class access unchanged.

## 2. `222327492c484b4a` — Teräs Käsi Basics (Master of Teräs Käsi) → `MERGE_DUPLICATE` into `67bddb17ae2770f3`

**Proof.** Same name (accented), same tree `ba726f623e42f849`, same prerequisite (Martial Arts I), same benefit (identical except capital "Unarmed"), identical
`abilityMeta.rules`. The certified canonical identity is *Threats of the Galaxy | Master of Teräs Käsi | Teräs Käsi Basics* (p. 53). Phase 3B kept `67bddb17` because it carries
`flags.swse.id = swse.talent.teras_kasi_basics`, source, page and summary; the duplicate has none of them. The tree's canonical roster has exactly one Basics.

**Field diff (duplicate vs survivor):** capitalisation of "Unarmed"; empty `class`/`category`; extra auto-derived tags (`action_economy`, `controller`, `damage_reduction`, `defender`,
`sustained_damage`); missing `source`/`page`/`summary`/`swse.id`; different migration timestamp. **Metadata to migrate: none** — the extra tags are not rules data
(and `damage_reduction` is misleading for this talent), so they are deliberately not transferred.

**Progression relationship** is unaffected: Basics is a prerequisite (by name) of Ignore Damage Reduction, Teräs Käsi Mastery, Unarmed Counterstrike and Unarmed Parry.

**Evidence limit.** Threats of the Galaxy TXT does not contain the tree text (Galaxy at War TXT corroborates the tree name). The canonical p. 53 entry rests on the already-certified
Phase 3B authority; this disposition does not re-open it and creates no new publication claim.

**References to resolve:** `packs/talent_trees.db` (`talentIds`; the tree keeps 5 members); registries (regenerate); **2 embedded actor items** on *Mynock Man* (heroic + npc) →
`67bddb17ae2770f3` (plus refresh of their stale snapshot text); `tools/fix-compendium-issues.js:44` (legacy one-shot map keyed by the duplicate ID with a non-existent tree ID
`f96cb0f2a46b4dd1` — retire the entry); `tests/talent-tree-membership-review-extras.test.mjs`; exemption in the membership audit. Historical audit/doc references need no action.

## Validation

`node tools/check-talent-phase-3d-dispositions.mjs` — PASS (92 records, 2 adjudicated); `node tests/talent-phase-3d-review-extras.test.mjs` — 9/9.
The checker fails on missing/duplicate/unknown records, a nonexistent survivor or replacement, an unlisted or stale live actor reference on a deletion, and a KEEP record that no longer exists.
