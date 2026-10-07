# Phase 5C — Post-Cutover Handoff

**Branch:** `claude/dazzling-meitner-czyh1x` · **PR:** docflowGM/foundryvtt-swse#1005 · **Start:** certified 5B-R head `8b3e9f1` · **Final code head:** `7512abd` · **CI on `7512abd`:** see the Phase 5C final report (recorded after the run completes; run 470 was in progress when this document was written) · **Full rolling suite:** 323 passed / 0 failed (5 documented pre-existing exclusions) · **Closeout:** identity closeout per planner rulings (this document is committed after the code head; the docs-only commit is the PR head).

## Counts

| Domain | Canonical | Production | Notes |
|---|---|---|---|
| Feats | 353 | 353 | 351 preserved (ids kept) + 2 created (Recall `c352f81dde5c9dff`, Staggering Attack `c9c4130a55761330`); 33 certified-noncanonical records removed; 6 Weapon Proficiency derivatives migrated to canonical `ecc2471ac96ec2d4` + explicit choice |
| Talents | 1,187 | 1,187 | unchanged by 5C (`data/canonical/talents.json`) |
| Weapons | 203 | 203 | 151 preserved (ids kept) + 52 created (`weapon-<slug>`); 35 repo-only removed (2 MERGE into `weapon-lightsaber` / `weapon-double-bladed-lightsaber`, 33 REMOVE_UNSUPPORTED); 4 non-weapon `weaponUpgrade` records preserved verbatim in `packs/weapons.db` |

## Single sources of truth

* Feats: `data/canonical/feats.json` · Talents: `data/canonical/talents.json` · Weapons: `data/canonical/weapons.json`.

## Generated outputs (never edit)

* Feats: `packs/feats.db`, `packs/feats.db.sha256`, `data/feat-catalog.json` (compat projection), `data/feat-effects.json`, `data/feat-choice-options.json`, `data/feat-metadata.json`, `data/feat-combat-actions.json`, `data/feat-validity-registry.json`, `data/feat-buckets-and-subbuckets.json`, `data/migrations/feat-canonical-aliases.json` — `tools/build-feat-production.mjs`.
* Weapons: `packs/weapons.db` + seven `packs/weapons-*.db` category packs, `data/store/weapon-store-descriptions.json`, `data/migrations/weapon-canonical-aliases.json`, `data/audits/phase-5c-weapon-projection-report.json` — `tools/build-weapon-production.mjs`; `data/weapons/canonical-weapon-registry.json` (runtime index) — `tools/build-weapon-runtime-registry.mjs`.

## State statement

**Weapon production corpus canonical; runtime consumers NOT yet migrated; legacy projections active.** Combat math, damage, range, ammo, store and sheet code still read the legacy `system.*` fields, which are now deterministic compatibility projections (`docs/audits/phase-5c-weapon-compatibility-projection.md`). `scripts/items/weapon-runtime/*` (5B) is unwired. Feat `system.tags` remain the legacy tags consumers read; certified tags are in `system.semanticTags`.

## Frozen / evidence

`data/audits/frozen/pre-cutover-weapons.db` (exact pre-cutover `packs/weapons.db`) keeps the Phase 3–4 weapon certifications verifiable; `data/audits/phase-5c-precutover-census.json` freezes the pre-cutover counts and hashes; `data/audits/phase-5c-authority-classification.json` classifies every feat/weapon data file.

## Gates

`node tools/verify-canonical-production.mjs`, `node tests/phase-5c-canonical-production-negative.test.mjs`, `--check` on the four generators and two reference-migration tools (wired into `.github/workflows/rolling-system-validation.yml`), plus the existing rolling suite and feat/weapon authority verifiers.

## Hashes (sha256)

| File | sha256 |
|---|---|
| `data/canonical/feats.json` | `8c7c79161fd7933efa0e539873e38b79a50cc6d643b13231a72329e2f0e22416` |
| `data/canonical/weapons.json` | `ed680edcf918b2f45839e96efef60d661cd495d698bbd690d33357bcf1aef236` |
| `packs/feats.db` | `9aa31e5ac6ab9459494a4aec756cae7734b5bda29bf5162de78ae3ae4840b2b2` |
| `packs/weapons.db` | `0ab69789ce766e3d152b3f2710178d2d32de6835c249ac71d79627a446b445a0` |
| `data/feat-catalog.json` (compat) | `1fee3e6888207c602230f0fb381aaf46ab8814ac1643f083809e7a834a14bb66` |
| `data/weapons/canonical-weapon-registry.json` | `cf656f7952deea7297a97fc5d81f192219bd6c64ea47fe50f42752b2b4f98b88` |

## Identity closeout rulings (applied)

* **Staggering Attack — identity-safe registry.** Two certified distinct feats: `192923f60db38831` (Galaxy at War p.26) and `c9c4130a55761330` (Scum and Villainy p.24, slug `staggering-attack-scum-and-villainy`). `FeatRegistry` (both `scripts/registries/feat-registry.js` and the progression registry) is `canonicalId → record`; names/slugs are secondary multimaps. Contract: `getById(id)` authoritative; `findByName(name)` returns 0..N; `getUniqueByName(name)` / `getByName(name)` return the record only for exactly one match and throw `AMBIGUOUS_CANONICAL_FEAT_NAME` otherwise (never first/last wins). Call sites classified: id-first (`ActorAbilityBridge`, `feat-effect-registry`, progression content authority), unique-name with fail-closed handling (`feat-engine`, `CompendiumResolver`, `legacy-prereq-registry`, template mapper, importer), name-only UI callers receive the error. Regression test: `tests/feat-registry-canonical-identity.test.mjs`.
* **Sith Lanvarok.** "Two-Weapon Fighting" is a rules concept, not a feat. The explicit ability join is removed (amendment 4H-F1 supersedes 4H-A3; `ABILITY_NAMES_PENDING_PLANNER_RULING` deleted). Structural facts already in the frozen schema carry the behavior: `operation.eligibleAsSecondWeaponForTwoWeaponFighting`, `handsRemainFree`, `wornNotHeld`; `dual_wield` tag kept. Exact ability joins to noncanonical Two-Weapon Fighting = 0; schema-shape changes = 0. Future consumer: full-attack / dual-weapon system and Dual Weapon Mastery.
* **Classification.** The seven authority classes stay. `OTHER_DOMAIN_DATA` (a file owned by another domain that neither defines nor projects feat/weapon authority) and `REFERENCE_BEARING_DOMAIN_DATA` (an operational file owned by another domain containing references to canonical feats/weapons) are approved; neither may hold canonical identity, rules or mechanics, a second description/stat copy, or hide a parallel authority (guardrail + negative tests).
* **Weapon-valued feat choices.** `exoticWeapons` in `data/feat-choice-options.json` is generated from `data/canonical/weapons.json` (32 exotic identities + 16 lightsaber identities = 48 options; each resolves to exactly one identity; `identities` map carries `identityKey` + `productionId`; the choice dialog stores `weaponIdentity`). Stale names removed ("Blast Cannon", "Arg'garok", "Tehk'la Blade", "Verpine Shattergun", legacy lightsaber chassis names); previously omitted Xerrol Nightstinger added. Only Discblade has a category override (melee, preserved). Unresolved = 0, ambiguous = 0. Generic choices remain structural (`weaponGroups`).
* **ATTACK_OPTION 136 → 134.** Proven: both lost records (Saber Throw, Improved Grapple) came solely from certified-noncanonical removed feats; no production definition originates from a removed record.
* **Historical verifiers.** See `docs/audits/phase-5c-historical-verifier-transitions.md`.

## Intentional compatibility layers that remain

1. Legacy `system.*` weapon fields (projection table; retire per consumer in 5D+).
2. Legacy `system.tags` on feats (certified tags in `system.semanticTags`) and `data/feat-catalog.json` projection.
3. Name-based Weapon Proficiency labels → canonical feat + explicit choice (`scripts/engine/feats/legacy-weapon-proficiency-alias.js`; embedded actor items keep their display name, point at the canonical feat, carry `flags.swse.choices.weaponProficiency`).
4. `FeatRegistry.getByName` name lookups (fail closed on ambiguity).
5. Frozen pre-cutover weapon pack evidence (`data/audits/frozen/pre-cutover-weapons.db`).
6. `scripts/items/weapon-runtime/*` remains unwired.

## Other open items

Four orphan automation definitions (Hew, Improved Knock Prone, Improved Stun, Reckless Charge) were dropped; earlier-reported items: `PROFICIENCY_ROUTE` as a fifth typed mode value; 20 identities with condition-only alternate routes; plain Bayonet host double-weapon not ruled.

## Next phase: 5D

**Phase 5D — Canonical Weapon Runtime Consumption**, starting with `WeaponRuntimeResolver` → attack profile → proficiency → live attack path; then damage, range, ammo, store, sheet; retire legacy projections per `PROJECTION_TABLE`. **Do not build another authority**: edit the canonical corpora and regenerate.
