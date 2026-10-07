# Phase 5C — Post-Cutover Handoff

**Branch:** `claude/dazzling-meitner-czyh1x` · **Start:** certified 5B-R head `8b3e9f1` (CI run 466 success) · **Final head / CI:** recorded in the Phase 5C final report (this document is committed after the last code change; the SHA of its own commit cannot be self-referenced).

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

## Open items for the planner

1. **"Two-Weapon Fighting"** — Phase 4H-A3 ruled it "the exact canonical ability name" for the Sith Lanvarok interaction, but Phase 1B certified the feat record of that name as noncanonical (removed). The link is kept via `ABILITY_NAMES_PENDING_PLANNER_RULING` in `tools/lib/item-weapons-phase-4h.mjs`; a ruling on the correct ability name is needed.
2. **Same-name feats** — Staggering Attack now has two certified distinct identities; `FeatRegistry._byName` is name-keyed, so name lookups resolve to one of them until 5G moves lookups to canonical id.
3. **Name-based Weapon Proficiency consumers** (prerequisite checker, follower/minion creators, class lists) keep working through label→canonical+choice compatibility (`scripts/engine/feats/legacy-weapon-proficiency-alias.js`); embedded actor items keep their display name, point at the canonical feat and carry `flags.swse.choices.weaponProficiency`. Retire in 5G.
4. Four orphan automation definitions in the old `data/feat-effects.json` (Hew, Improved Knock Prone, Improved Stun, Reckless Charge) referenced non-existent feats and were dropped.
5. Data classes `OTHER_DOMAIN_DATA` and `REFERENCE_BEARING_DOMAIN_DATA` were added to the planner's seven classes (reported deviation).
6. Exotic weapon option list in `data/feat-choice-options.json` still names "Blast Cannon", which is not a canonical weapon name (hand-curated list carried verbatim in the feat corpus).
7. Earlier-reported: `PROFICIENCY_ROUTE` as a fifth typed mode value; 20 identities with condition-only alternate routes; plain Bayonet host double-weapon not ruled.

## Next phase: 5D

Wire runtime consumers to the canonical corpus and registry (damage, range, ammo, proficiency, store, sheet) and retire legacy projections per `PROJECTION_TABLE`. **Do not build another authority**: edit the canonical corpora and regenerate.
