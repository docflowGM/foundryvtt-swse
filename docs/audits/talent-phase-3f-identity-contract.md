# Phase 3F-0 — Talent-tree identity contract

Baseline: merged `main` @ `dfbddb9cfeadfafd0e965f9732d47875457e097e` (Phase 3E). Merged-main gates recorded on that SHA: `check-talent-phase-3c-ci.mjs` → `POST_3E5_STATE`, 10/10 pass; `apply-talent-phase-3e5.mjs --verify --exact` → 88 checks pass; `apply-talent-phase-3e4.mjs --verify` → 29 pass; `reconcile-talent-publication-corpus.mjs --check` → 1,189 claims ↔ 1,187 identities ↔ 1,187 records, 0 blocking; `run-rolling-tests.mjs` → 278 passed, 0 failed (5 documented exclusions).

This contract was derived from the running code (`TalentTreeDB`, `ClassesDB`, `normalizeTalent`, `talent-tree-membership-authority`) and is asserted by `tests/talent-phase-3f-tree-identity.test.mjs` against the real modules and packs, before and after the normalization projection.

## The identifiers

| Identifier | Where it lives | Source | Meaning | Stable across a display-name change? |
|---|---|---|---|---|
| **Tree `_id` / `sourceId`** | `packs/talent_trees.db` `_id`; `TalentTreeDB.sourceId` | the compendium | **The persistent identity of a tree.** Distinct trees that share a display name (Squad Leader ×2) are told apart only by it. | **Yes** |
| **Runtime id** (`tree.id`) | `TalentTreeDB.trees` / `byId()` | `normalizeTalentTreeId(name)` (lower-case, strip apostrophes, `\W+`→`_`); a later same-name tree gets `<id>_<sourceId>` | An **in-memory** key. A function of the display name, therefore *not* persistent. | **No** — changes when the name's letters/punctuation change (not on a case-only change) |
| **Stable key** | `TalentTreeDB.byKey()` | `system.key` or `toStableKey(name)` (`-<sourceId>` for a same-name tree) | Name-derived lookup key | No (name-derived) |
| **Talent `system.treeId`** | `packs/talents.db` | persisted on each talent | **Contract: the tree's `_id`.** | Yes |
| **Class `talentTreeSourceIds`** | `packs/classes.db` | persisted | Persistent list of tree `_id`s a class may use. `ClassesDB` prefers it. | Yes |
| **Class `talentTreeIds`** | `ClassesDB` (runtime), also persisted in the pack | derived: `bySourceId(sourceId).id` | Runtime ids, recomputed on every build; the persisted copy is a convenience, not authority | No |
| **Registry `id`** | `data/generated|fixes/talent-trees.registry.json` | derived from the tree pack by `tools/build-talent-tree-registry.mjs` | slug label + `sourceId`; entries are matched to trees by `sourceId` **first**, name second | `sourceId` yes; slug no |
| **Display name** | tree `name` | the pack | A label. **Never identity.** | n/a |

## Rules adopted (and evidence they already hold in the runtime)

1. **Persistent cross-document references use the tree `_id`.** Evidence: `ClassesDB` resolves `talentTreeSourceIds` via `bySourceId()`; `defense-calculator` / `armor-benefit-simulator` compare a talent's `system.treeId` to a literal tree `_id` (`17cec542331cb4e4`, `ea01d740c91888b3`); `talent-tree-membership-authority.dropForeignTreeClaims` treats a talent that claims a *different* tree by pack `_id` as a non-member and explicitly leaves "legacy slug treeIds to the existing name logic"; `TalentTreeDB._applyMembershipRegistryHints` matches registry entries by `sourceId` first.
2. **The runtime may keep normalized ids internally**, but the conversion `_id → runtime id` is explicit and centralized in `TalentTreeDB.bySourceId()`. Nothing else may assume `system.treeId` *is* a runtime id.
3. **Display names are labels.** Two trees may share one (`sameNameTrees` audit); identity is the `_id`.
4. **No second registry / identity system** is introduced: `TalentTreeDB`, `ClassesDB` and the existing generated registry are reused.

## The gap this phase found and closes (3F-2)

`normalizeTalent()` accepted an explicit `system.treeId` only when it matched a **runtime id** key of `treeMap.trees`. A persistent `_id` therefore resolved only through the inverse membership index; with the index missing the talent, `treeId` came back `null`. The runtime contract test demonstrates it on the unhardened code (`actual: null, expected: 'light_side'`). Hardening: an explicit value is converted through `TalentTreeDB.bySourceId()` and the **runtime** id is returned; a runtime id is still accepted; an unknown value never invents authority. The index remains the primary path.

## What changes when the 12 display names are normalized (proved, not assumed)

* **Six are case-only** (Bothan SpyNet, Master of Intrigue, Agent of Ossus, Disciple of Twilight, Ember of Vahl, Warden of the Sky): `normalizeTalentTreeId` lower-cases, so the **runtime id, stable key and every slug are unchanged**.
* **Six change the runtime id**: `1stdegree_droid`→`first_degree_droid`, `2nddegree_…`→`second_degree_…`, `3rddegree_…`→`third_degree_…`, `4thdegree_…`→`fourth_degree_…`, `5thdegree_…`→`fifth_degree_…`, `aingtii_monk`→`aing_tii_monk`. Because identity is the `_id`: no class, talent or membership reference changes (classes store `talentTreeSourceIds`; no class pack field stores one of the six old runtime ids; no runtime collision results). The derived registry entries are rebuilt from the pack.
* **Consumers** (full classified list in `talent-phase-3f-tree-identity-census.md`): every name-keyed consumer that mentions these trees **already uses the canonical spelling** (`First-Degree Droid`, `Aing-Tii Monk`, `Bothan SpyNet`, `Master of Intrigue`, …) — the pack names are the outliers, so the rename aligns them. One consumer *improves*: `tree-authority.js` maps the rule key `aing-tii-monk`, which today's name `Aingtii Monk` (→ `aingtii-monk`) never matched. `droid-progression-guards.js` already lists both the old and the printed spellings plus the pack `_id`s.
* **`system.treeId` readers** (36 files, all classified): 3 prefer the `_id`, 1 (`talent-normalizer`) is hardened, the rest treat it as one of several candidate tokens. All 71 stale talents also carry `system.talent_tree` equal to their tree name, so text-haystack consumers (e.g. `sith-talent-actions` matching `lightsaber form`) keep matching after the slug is replaced by the `_id`.

## Out of scope for 3F

Talent content, membership, canonical identities (`treeOrigin|tree|name` keeps `canonicalTreeKey`, which already carries the normalized name), class eligibility, the legacy `tree` label inside `data/canonical/talents.json` (certified, immutable), embedded actor snapshots, homebrew packs, structured-prerequisite identity (V2).
