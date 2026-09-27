# Talent Canonicalization Phase 3B — Saga Edition Core Rulebook

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Book:** Saga Edition Core Rulebook  
**Certified identities:** 198  
**Production mutation:** NONE

## Purpose

This is the first book-scoped Phase 3B production reconciliation. It converts the certified Core Rulebook authority into an exact production repair manifest that Claude can execute later without re-auditing rules text or deciding identity semantics.

The machine-readable authority is:

- `data/audits/talent-phase-3b-core-rulebook-manifest.json`

The deterministic builder/checker is:

- `tools/build-talent-phase-3b-core-manifest.mjs`

## Core reconciliation result

| Disposition | Count |
|---|---:|
| `UPDATE_CONTENT` | 111 |
| `UPDATE_METADATA` | 31 |
| `REMOVE_CONTAMINATION` | 31 |
| `CORRECT_TREE` | 17 |
| `CREATE` | 7 |
| `IDENTITY_SPLIT` | 1 |
| `KEEP` | 0 |
| **Total** | **198** |

Every Core canonical identity now has one explicit production disposition.

## Identity reconciliation

The Core set resolves as:

- 173 existing production records already attached to the correct canonical tree.
- 17 existing production records attached to the wrong tree.
- 7 canonical identities with no same-name production record.
- 1 canonical identity requiring a distinct same-name document rather than reuse.

The seven certified `CREATE` identities are:

- `Saga Edition Core Rulebook|Brawler|Unbalance Opponent`
- `Saga Edition Core Rulebook|Jensaarai Defender|Attune Armor`
- `Saga Edition Core Rulebook|Jensaarai Defender|Force Cloak Mastery`
- `Saga Edition Core Rulebook|Jensaarai Defender|Linked Defense`
- `Saga Edition Core Rulebook|Dathomiri Witch|Command Beast`
- `Saga Edition Core Rulebook|Dathomiri Witch|Flight`
- `Saga Edition Core Rulebook|Weapon Master|Multiattack Proficiency (heavy weapons)`

These are CREATE only because Phase 3B proved there is no same-name production document and the canonical target tree is uniquely resolved. The old Phase 2 `MISSING_CONTENT` flag by itself is not the reason.

## Same-name identity split

`Saga Edition Core Rulebook|Bounty Hunter|Notorious` is `IDENTITY_SPLIT`.

Production already contains a talent named `Notorious`, but it belongs to the `Infamy` tree. Claude must preserve that existing record and create a separate Bounty Hunter `Notorious` using the manifest's deterministic `createRecordId`.

## Wrong-tree repair set

The 17 `CORRECT_TREE` records retain their current production IDs. The manifest carries the exact source tree claim(s), target tree ID/name, and required tree-pack mutation.

The set is: Skilled Advisor, Demand Surrender, Born Leader, Acute Senses, Jury-Rigger, Long Stride, Gun Club, Melee Smash, Stunning Strike, Draw Fire, Harm's Way, Devastating Attack, Penetrating Attack, Equilibrium, Visions, Charm Beast, and Multiattack Proficiency (lightsabers).

## Canonical field contract for Claude

For every Core identity, the manifest gives exact target values for:

- `system.benefit`
- `system.description`
- `system.summary`
- `system.prerequisites`
- `system.source`
- `system.page`

The current production schema stores full text directly in `system.description` as a string, so this book manifest targets that real schema rather than inventing `system.description.value`.

Existing records must retain their `_id`.

Runtime/automation metadata is not canonical rules text and must be preserved unless a later certified implementation task explicitly changes it. In particular, do not erase `system.abilityMeta`, `system.prerequisitesStructured`, `system.tags`, `system.executionModel`, `system.subType`, Active Effects, or flags.

## Tree mutation contract

For `CORRECT_TREE`:

1. preserve the talent document ID;
2. remove that ID/name from the currently claiming talent tree;
3. add that same ID/name to the manifest target tree;
4. set `system.treeId` to the target tree ID;
5. rewrite canonical fields as specified.

For `CREATE` and `IDENTITY_SPLIT`:

1. use the exact deterministic `createRecordId` in the manifest;
2. create only the minimal canonical record template supplied there;
3. do not invent automation metadata;
4. add the new ID/name to the target talent tree.

## Claude execution rule

Claude should **apply the manifest, not reinterpret it**.

Before any Phase 3C Core mutation:

```bash
node tools/build-talent-canonical-authority.mjs --check
node tools/build-talent-phase-3b-core-manifest.mjs --check
```

If either check fails, stop. The committed execution packet no longer matches its authorities/current production inventory.

After the eventual Core production repair, the required minimum validation is:

```bash
node tools/audit-talent-tree-membership.mjs
```

plus a Phase 3C verifier that compares the resulting Core production records against this manifest.

## Safety boundaries

- Never match by talent name alone.
- Never overwrite a same-name talent in another canonical tree.
- Never infer a CREATE from Phase 2 missing-content evidence.
- Do not delete homebrew/noncanonical material during the Core canonical repair.
- Do not replace runtime metadata with book text.
- Do not mutate production during Phase 3B.

## Book completion gate

The Saga Edition Core Rulebook Phase 3B reconciliation is complete and is ready to be used as the first Claude execution packet for Phase 3C.
