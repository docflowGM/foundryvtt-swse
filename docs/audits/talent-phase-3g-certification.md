# Phase 3G — Structured Talent-Prerequisite Identity Convergence: Certification

**PHASE 3G COMPLETE on branch `audit/talent-phase-3g-prerequisite-identity` — certification pending PR review and merged-`main` re-verification.**
Base: merged `main` @ `a3a94c958c8bd2f5d5c4060deb7b95612b2292de` (Phase 3F).

## 1. Result

Every structured talent-to-talent prerequisite now names its target by the canonical compendium UUID (`Compendium.foundryvtt-swse.talents.Item.<_id>`), the runtime resolves it by identity on compendium records, embedded actor copies and pending progression selections, and owner source rulings corrected 13 structured/text discrepancies found by the migration.

Migrated leaf shape: `{ type: "talent", uuid, name }` — `uuid` authoritative, `name` a label and tree-guarded fallback for unlinked legacy copies, old `id` removed (the checker still honours `id` leaves on homebrew/unmigrated data).

## 2. Units

| Unit | Result | Artifacts |
|---|---|---|
| 3G-0/1 audit + census | structured leaves, id forms and runtime identity gaps measured (frozen pre-3G-2 baseline) | `docs/audits/talent-phase-3g-identity-contract.md`, census + experiments records |
| 3G-2 runtime identity | one helper; finalizer stamps `flags.core.sourceId` on new embedded talents; talent step threads identity into the pending selection; checker/normalizer/snapshot/evaluator consume the helper | `scripts/data/talent-source-identity.js`, `feat-talent-plan-builder.js`, `talent-step.js`, `prerequisite-checker.js`, `prerequisite-normalizer.js`, `actor-prerequisite-snapshot.js`, `prerequisite-evaluator.js`, `tests/talent-phase-3g-runtime-identity.test.mjs` |
| 3G-3 manifest + dry-run | manifest → dry-run (23 gates) → apply → exact verify | `tools/apply-talent-phase-3g.mjs`, `data/audits/talent-phase-3g-{migration-manifest,dry-run-report,source-corrections}.json`, `docs/audits/talent-phase-3g-dry-run.md` |

## 3. The production change (exact; `packs/talents.db` only, 300 lines, 945 field-level mutations)

* **311 source-valid structured talent leaves** → `{type, uuid, name}` (183 distinct targets; 300 by unique `flags.swse.id`, 5 existing Phase 3D production ids, 1 ambiguous resolved by owner ruling, 5 retargeted by source ruling).
* **4 false structured prerequisites removed** (printed talent has no prerequisite; container dropped, repository standard shape): Assassin|Ruthless (Dirty Fighting), Expert Pilot|Keep It Together (Jury-Rigger), Knight's Armor|Armor Mastery (Armored Defense), Outlaw|Seize the Moment (Distress to Discord).
* **5 leaves retargeted** to the printed prerequisite: Ricochet Shot / Dumb Luck / Unlikely Shot / Uncanny Luck Fool's Luck → Lucky Shot (`5fbf1a3504865fba`), Stay in the Fight (Legacy) Recruit Enemy → Stalwart Subordinates (`d9ffff2586cd259b`).
* **4 printed prerequisite lines restored** via the layered correction file `data/audits/talent-phase-3g-source-corrections.json` (reconciler `TEXT_DRIFT` accepts it; the immutable Phase 2 artifact is not edited): Swift Power "Power of the Dark Side", Starship Raider "Spacehound", Sow Confusion "Hesitate", Force Haze "Clear Mind".
* **Owner ruling:** Outlaw|Find an Opening requires Outlaw|Seize the Moment (`e19c06b6dfc7a703`), not the Provocateur talent of the same name.
* Nine legacy production talents carry 32-hex `_id`s; the helper treats them as real compendium ids.
* Untouched: benefit/description/summary/source/page/tree/membership of every talent, tree and class packs, registries, homebrew packs, actor-pack snapshots (their legacy `id` leaves still resolve through the legacy `flags.swse.id` path), `data/canonical/talents.json`.

## 4. Enforcement

State `POST_3G_STATE` in `tools/check-talent-phase-3c-ci.mjs`: 3G `--verify --exact`; 3F/3E-5/3E-4 verifiers in later-state mode; registry freshness, membership and homebrew audits; frozen censuses; the Phase 3E completeness gates (reconciler now includes the 3G correction layer). Runtime proof (real `PrerequisiteChecker`): all 311 leaves satisfied by embedded source-linked copies (v13 and legacy link form) and pending selections via UUID with no name fallback; every wrong same-name identity rejected, linked and unlinked.

## 5. Deliberately not done / follow-ups

* Text prerequisites are not rewritten; the text-first checker path is unchanged.
* Actor-pack snapshots are not refreshed; feat identity is not redesigned; legacy `id` parsing is not removed.
* Existing actors' already-embedded talents stay unlinked until re-embedded; they resolve through the tree-guarded name fallback (reported as fallback).
