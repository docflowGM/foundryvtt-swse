# Phase 5C — Developer Workflow for Feats and Weapons

Exactly one operational canonical source exists per domain:

| Domain | Edit this | Never edit by hand |
|---|---|---|
| Feats (353) | `data/canonical/feats.json` | `packs/feats.db`, `packs/feats.db.sha256`, `data/feat-catalog.json`, `data/feat-effects.json`, `data/feat-choice-options.json`, `data/feat-metadata.json`, `data/feat-combat-actions.json`, `data/feat-validity-registry.json`, `data/feat-buckets-and-subbuckets.json` |
| Weapons (203) | `data/canonical/weapons.json` | `packs/weapons.db`, `packs/weapons-*.db`, `data/weapons/canonical-weapon-registry.json`, `data/store/weapon-store-descriptions.json`, `data/audits/phase-5c-weapon-projection-report.json` |
| Talents (1,187) | `data/canonical/talents.json` (unchanged by 5C) | `packs/talents.db` |

Dependency direction: **audits → canonical corpus → deterministic generators → (Foundry packs, runtime registries, compatibility outputs)**. Nothing flows backwards, and no runtime module reads `data/audits/**` or `data/fixes/**`.

## Changing a feat or weapon

1. Edit the record in the canonical corpus. Each record has an *audit-derived* part (identity, provenance, semantic tags, canonical stats) and a canonical-owned `production` / `companions` part. Audit-derived parts are verified against the certified audits by `--check`; change them by updating the certified audit chain, then `node tools/build-canonical-feats.mjs` / `node tools/build-canonical-weapons.mjs` (refresh) — not by hand.
2. Regenerate: 
   ```
   node tools/build-feat-production.mjs
   node tools/build-weapon-production.mjs
   node tools/build-weapon-runtime-registry.mjs
   ```
3. Gate: `node tools/verify-canonical-production.mjs` (feats 353/353, weapons 203/203, byte-exact generated outputs, identity stamps, semantic parity, alias maps, classification, no audit imports, no dangling retired ids) and `node tests/phase-5c-canonical-production-negative.test.mjs`.
4. Every feat/weapon data file must be classified in `data/audits/phase-5c-authority-classification.json` (rules in `tools/lib/canonical-authority-classification.mjs`, rebuild with `node tools/build-phase-5c-authority-classification.mjs`). A new unclassified file fails the gate.

## One-time operations (already executed; kept for audit/reproducibility)

`--consolidate` on both canonical builders captured the pre-cutover production data once (pre-cutover state frozen in `data/audits/phase-5c-precutover-census.json` and `data/audits/frozen/pre-cutover-weapons.db`). `tools/migrate-phase-5c-weapon-references.mjs` and `tools/migrate-phase-5c-feat-references.mjs` migrated references in actor packs and class/template data; `--check` on each fails if a retired id reappears outside the alias maps, audits and docs.

## Alias maps (migration only)

`data/migrations/feat-canonical-aliases.json` (39 retired feat ids → canonical feat, plus explicit choice for the six Weapon Proficiency derivatives) and `data/migrations/weapon-canonical-aliases.json` (52 renamed, 35 retired). They define nothing.
