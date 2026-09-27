# Talent Canonicalization Phase 3A - Canonical Production Authority

**Status:** COMPLETE  
**Date:** 2026-09-27  
**Branch:** `audit/talent-phase-3a-canonical-authority`  
**Starting HEAD:** `642cf85ee492248e9e82303894474ecc3083fe08`

## Purpose

Phase 3A establishes one durable machine-readable authority for the canonical SWSE talent corpus without mutating production talent records.

The Phase 1D structural registry and all 14 Phase 2 content-certification datasets remain the upstream evidence. Phase 3A merges them into:

- `data/canonical/talents.json`

The deterministic builder is:

- `tools/build-talent-canonical-authority.mjs`

## Production authority finding

The current repository does **not** have one healthy authored-source -> generated-pack talent pipeline.

### Effective shipped/runtime authority: `packs/talents.db`

The production/V2 path is pack-backed:

- `system.json` registers the `talents` Item compendium at `packs/talents`.
- `scripts/registries/talent-registry.js` resolves `foundryvtt-swse.talents` from `game.packs`, calls `pack.getDocuments()`, normalizes those documents, and describes itself as the V2 talent inventory SSOT.
- `scripts/data/talent-normalizer.js` explicitly normalizes raw `talents.db` compendium records.
- Current progression consumers initialize and query `TalentRegistry`.
- Multiple maintenance/enrichment tools historically write directly to `packs/talents.db`.

Therefore, until Phase 3C establishes a safer deterministic production writer, **`packs/talents.db` is the effective current production inventory authority**.

### `data/talents.json`: stale/missing legacy path

`tools/scripts/rebuild_classes_db.py` still declares:

`data/talents.json -> packs/talents.db`

but `data/talents.json` is absent on this branch.

That rebuild script also assigns a fresh random UUID to every rebuilt document, which is incompatible with the Phase 3 requirement to preserve stable production IDs wherever safe.

`scripts/core/world-data-loader.js` still contains a manual loader for `data/talents.json`, but automatic world loading is explicitly disabled. With the source file absent, this is a stale legacy path rather than a current production authority.

### Staging mirrors are not the production authority

Current branch inspection:

| Layer | Records | Current role |
|---|---:|---|
| `data/fixes/talents.fixed.json` | 862 | staging/repair mirror |
| `data/generated/talents.fixed.json` | 862 | generated staging mirror |
| `packs/talents.db` | shipped compendium | effective runtime inventory |

The two 862-record mirrors contain the same ID set but differ in 59 record bodies. Neither contains any `system.choiceMeta` records, while prior audit evidence documents pack-only metadata in this area. Repository search found documentation references to these staging files, but no current V2 runtime reader that makes either one the talent inventory SSOT.

They are therefore **not safe Phase 3 production authorities**.

## Canonical Phase 3A authority

`data/canonical/talents.json` is intentionally separate from the current production pack.

It is the **canonical repair/build authority** for Phase 3B onward; it is not yet a Foundry runtime source.

Each record is keyed by:

`canonicalTreeKey + "|" + talent name`

Talent name alone is never used as identity.

Each merged record preserves canonical tree identity, aggregate class access, full rules text, printed prerequisites, quick summary, primary source/page, every publication claim, content-capture provenance, and repository mapping/disposition evidence for Phase 3B.

## Reconciliation result

| Gate | Result |
|---|---:|
| Phase 2 sourcebooks | 14 |
| Certified publication claims | 1,182 |
| Phase 1D aggregate memberships | 1,180 |
| Phase 3A canonical identities | **1,180** |
| Registry-only identities | 0 |
| Content-only identities | 0 |
| Same-name / different-tree identity groups | **19** |
| Multi-publication merged identities | **1** |

The full 1,182 -> 1,180 reconciliation is one canonical identity:

- `Saga Edition Core Rulebook|Alter|Illusion`

It has three certified publication claims:

- Force Unleashed Campaign Guide, page 87
- Knights of the Old Republic Campaign Guide, page 52
- Jedi Academy Training Manual, page 14

The builder uses the structural registry's `talentPublications[]` ordering to select the primary publication and preserves all three certified publication records in `publications[]`.

## Same-name protection

The generated authority contains 19 display-name collision groups across different canonical trees. These remain separate because the merge key includes `canonicalTreeKey`.

## Deterministic validation

Run:

```bash
node tools/build-talent-canonical-authority.mjs --check
```

The builder fails closed unless all acceptance counts, registry/content set equality, publication membership, same-name protection, the known three-publication Illusion merge, and required canonical content fields remain valid. In `--check` mode it also requires byte-for-byte equality with the committed `data/canonical/talents.json`.

## Phase 3A acceptance gates

- [x] Actual production talent authority/build path identified.
- [x] 1,180 merged canonical identities represented exactly once.
- [x] No global-name-only merge logic.
- [x] Same-name identities remain separate by canonical tree.
- [x] All 1,182 publication claims reconcile into the merged graph.
- [x] Canonical text, prerequisites, source/page, and derived summaries survive the merge.
- [x] Publication provenance is preserved.
- [x] No production talent mutation occurred.

## Files intentionally not changed

Phase 3A does **not** modify:

- `packs/talents.db`
- `data/fixes/talents.fixed.json`
- `data/generated/talents.fixed.json`
- talent tree production records
- runtime talent records

## Next phase

Phase 3B should compare `data/canonical/talents.json` against the effective production inventory in `packs/talents.db` and emit the exact deterministic repair manifest before any production mutation.
