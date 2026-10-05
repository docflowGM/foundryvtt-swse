# Archetype Phase 12B — Semantic Curation Closeout

**Status:** COMPLETE — 297 / 297 archetypes curated
**Runtime target:** `data/archetypes.json`
**Frozen ontology:** `data/audits/talent-feat-phase3-final-ontology.json` (190 tags)
**Final commit:** `bf09889f84abdd82197474bacf790433359cfde1` on `claude/hopeful-feynman-1wc16b`

## What Phase 12B did

Every record in the class-independent archetype SSOT (introduced in Phase 12A) now carries
owner-certified semantic tags. Only four fields per record were ever written:

- `metadata.tags.primary`
- `metadata.tags.supporting`
- `metadata.tags.all` (sorted union of primary and supporting)
- `metadata.tagProvenance` (`phase12b.curated.primary` / `phase12b.curated.supporting`)

No mechanics, exactRefs, routes, classes, abilities, skills, talents, feats, Force data,
species, backgrounds, narrative data, scoring, BuildIntent, SuggestionScorer, Mentor, UI
ranking, or ontology were changed.

## Authority and tooling

- **Authority (owner-owned, rolling):** `data/audits/archetype-phase-12b-semantic-curation.json`
  (machine) and `docs/audits/archetype-phase-12b-semantic-curation.md` (human). The files in the
  repo are the final cumulative authority (`certifiedCount: 297`, `currentExecution: 12B-FINAL-01`).
- **Overlay:** `node tools/apply-archetype-phase-12b-semantic-curation.mjs` applies the authority
  to the dataset; `--check` must report `zero diff`. It fails closed on unknown ids, non-ontology
  tags, a `certifiedCount` mismatch, or an unrecognised authority shape.
- **Reconstruction order:** `tools/build-archetype-phase-12a-runtime-ssot.mjs`, then the 12B overlay.
- **Provenance mapping:** the authority's nested `tagProvenance.phase12b.curated.*` is stored as the
  existing flat keys `"phase12b.curated.primary"` / `"phase12b.curated.supporting"`; the authority's
  `authority: OWNER_CERTIFIED` string is not written to the dataset.

## Execution history

| Tranche | Records | Commit |
|---|---|---|
| Scout 01 | 20 | `e1def6aad` |
| Scout 02 (+ overlay tool) | 20 | `25395ae96` |
| Scout 03 | 20 | `cb973c9a1` |
| Scout 04 | 20 | `1a2cc8e65` |
| Scout close / Scoundrel begin | 20 | `db1582c8e` |
| Scoundrel | 20 | `90b78ee61` |
| QA patch 12B-QA-110-01 | 7 revisions | `d7e893808` |
| Scoundrel close / Noble begin | 20 | `e8a2c7b73` |
| Noble 08 | 20 | `723220ed9` |
| Noble 09 | 20 | `b65bb4091` |
| Noble 10 | 20 | `91aa158f7` |
| Noble 11 (Noble-first complete) | 20 | `8390b5352` |
| Soldier 01 | 40 | `b48cae56f` |
| Final closeout (Soldier-first and Jedi-first) | 47 | `bf09889f8` |

Buckets: Scout-first 73, Scoundrel-first 39, Noble-first 98, Soldier-first 53, Jedi-first 34.

Eight revision rulings (REV-001 through REV-008) are carried in the authority's `revisionLog`
and already reflected in the data.

## Final verification

- Overlay `--check`: zero diff; all 297 records match the authority exactly.
- Ontology membership: 0 unknown tags. Primary/supporting collisions: 0. Broken `all` unions: 0.
- Every record has phase12b provenance.
- Archetype suites (4 files) plus the Jedi class-skills test: 40 / 40 pass.
- `tools/validate-data.js`, `tools/validate-partials.mjs`, and `system.json` parse: pass.
- Full suite: 398 tests, 393 pass, 5 fail. The 5 failures are Force-power suites
  (`force-power-final-integration`, `phase3-force-power-corrections`,
  `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`,
  `phase6-force-direct-damage`) that also fail on untouched `origin/main`; they are unrelated.

## Test changes made during Phase 12B

- The 12A audit-artifact fingerprint test was renamed to a historical-baseline check (owner ruling M-001);
  `data/audits/archetype-phase-12a-runtime-ssot.json` is never rewritten.
- Overlay tests assert generic invariants (not fixed record counts) so later tranches do not break them.
- The 12A "typed ability priorities are not duplicated into tags" check now rejects only legacy
  `ability_<str|dex|con|int|wis|cha>` tags. `ability_enhancement` is a valid frozen-ontology tag used by
  `matukai_adept`.

## Not done / out of scope

- Shadow scoring remains deferred; no scoring, BuildIntent, SuggestionScorer, Mentor, or UI ranking
  consumes the Phase 12B tags yet.
- Phases 12C–12F need new owner authority.
- A stray remote branch `refactor/archetype-phase-12a-runtime-ssot` (identical to the 12A commit, no PR)
  still exists; deletion awaits your decision.
