# Talent Canonicalization Phase 3B — Knights of the Old Republic Campaign Guide

**Status:** COMPLETE  
**Date:** 2026-09-29  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Certified publication claims:** 115  
**Owned canonical identities:** 114  
**Reference-only publication claims:** 1  
**Canonical trees:** 33  
**Production mutation:** NONE

## Result

| Disposition | Count |
|---|---:|
| `UPDATE_CONTENT` | 99 |
| `CORRECT_TREE` | 2 |
| `CREATE` | 12 |
| `IDENTITY_SPLIT` | 1 |
| **Owned total** | **114** |

KOTOR also contains one publication claim for Alter `Illusion`. Phase 3A assigns that canonical identity to **The Force Unleashed Campaign Guide**, so the KOTOR claim is reference-only and emits no KOTOR mutation.

## Protected identity split

KOTOR publishes `Sith Alchemy` in the Core-origin **Sith** talent tree. Production already contains a different `Sith Alchemy` talent under the separate **Sith Alchemy** tree.

- Create canonical Sith-tree `Sith Alchemy` as `eeecb3737aabf789`.
- Target tree: Sith `d1037bc7a08ea80b`.
- Preserve existing Sith Alchemy-tree record `eb4f3e8660bc476589d0323d4cc00845`.
- Do not repurpose or overwrite the existing same-name identity.

## Tree corrections

Two existing records are currently claimed by Jedi Shadow but canonically belong to Jedi Sentinel:

- Sentinel Strike — preserve `cf2d518039afd828`; move from Jedi Shadow `eab0d8bbee7e0f4f` to Jedi Sentinel `36f18f3e974feb33`.
- Sentinel's Gambit — preserve `df40e8294bd43fe7`; move from Jedi Shadow `eab0d8bbee7e0f4f` to Jedi Sentinel `36f18f3e974feb33`.

Phase 3C must update both talent `system.treeId` and talent-tree membership.

## Genuine creates

The remaining twelve missing identities have no reusable same-name production identity in their canonical tree:

- Gladiatorial Combat — Multiattack Proficiency (exotic weapons) — `66c8f9d94547b5e6`
- Melee Duelist — Multiattack Proficiency (advanced melee weapons) — `35375c6c9505e6f5`
- Jal Shey — Action Exchange — `837af2972223104f`
- Jal Shey — Imbue Item — `5e972b61a1f9ecce`
- Jal Shey — Knowledge of the Force — `04eca2813630e8d4`
- Keetael — Conceal Force Use — `deb5ce7af3c824ff`
- Keetael — Force Direction — `d65ad7fb7a374762`
- Keetael — Force Momentum — `4cb2cf521a4d2175`
- Keetael — Past Visions — `462df9a631ee50f4`
- Luka Sene — Improved Force Sight — `38f57c9f9cd0b727`
- Luka Sene — Luka Sene Master — `b0427980c49cd650`
- Luka Sene — Quickseeing — `537afb4984d1ca61`

## Display-name normalization

Two reused documents require canonical case normalization while preserving their IDs:

- Jedi Battlemaster `Mobile Attack (Lightsabers)` → `Mobile Attack (lightsabers)` — `eb701499ba157c6a`
- Jedi Watchman `Improved Quick Draw (Lightsabers)` → `Improved Quick Draw (lightsabers)` — `acb9d2dddeea7efd`

## Production verification

Phase 3B resolution was run against:

- `data/canonical/talents.json`
- `packs/talents.db`
- `packs/talent_trees.db`
- `data/audits/talent-canonical-tree-registry.json`
- certified KOTOR Phase 2 content/discrepancy manifests

No production talent or tree record was mutated during Phase 3B.

## Phase 3C authority

Use:

`data/audits/talent-phase-3b-knights-of-the-old-republic-campaign-guide-manifest.json`

Builder/check wrapper:

`node tools/build-talent-phase-3b-kotor-manifest.mjs --check`

The manifest is the execution contract. Do not match by talent name alone or convert the reference-only Illusion publication into a KOTOR mutation.
