# Talent Phase 3A - Canonical Authority Discovery and Merge Checkpoint

**Status:** IN PROGRESS - canonical authority established  
**Date:** 2026-09-27  
**Branch:** `phase3/talent-production-canonicalization`

## 1. Production authority discovery

The current shipped/versioned talent source is **not** `data/fixes/talents.fixed.json`.

The live path is:

```text
data/audits Phase 2 authority
        -> Phase 3 canonical content authority
        -> packs/talents.db   (versioned production pack source)
        -> packs/talents/     (compiled LevelDB runtime artifact when generated)
        -> game.packs.get("foundryvtt-swse.talents")
        -> TalentDB
```

Repository evidence:

- `system.json` declares the Talents Item compendium at `packs/talents`.
- `tools/check-system-manifest.mjs` explicitly documents that `packs/<name>.db` is the line-delimited source versioned by this repository while the sibling LevelDB directory is a generated build artifact.
- `scripts/data/talent-db.js` builds the runtime database from `game.packs.get("foundryvtt-swse.talents")`.
- `scripts/data/talent-normalizer.js` is a read-only runtime normalization layer. It does not generate or repair source data.
- That normalizer also confirms that talent-tree membership is primarily resolved through the talent-tree inverse index rather than by trusting a talent's legacy class/category fields.

Therefore Phase 3 must treat **`packs/talents.db` as the current production serialization**, while the new canonical dataset supplies the source-backed content authority used to repair it.

## 2. The 862-record staging mirrors are not production authority

Current census:

| Layer | Records |
|---|---:|
| `packs/talents.db` | **1,024** |
| `data/fixes/talents.fixed.json` | **862** |
| `data/generated/talents.fixed.json` | **862** |

Pack vs. `data/fixes`:

- **859** shared IDs
- **165** pack-only IDs
- **3** fixes-only IDs
- **852 / 859** shared records differ at the JSON level

Runtime metadata is also materially richer in the pack:

| Metadata | Pack | fixes mirror |
|---|---:|---:|
| `system.choiceMeta` | **20** | **0** |
| `system.abilityMeta` | **1,022** | **131** |
| nonempty `abilityMeta.rules` | **227** | **61** |

The two 862-record mirrors have the same ID set but **59 records differ logically** from one another.

There is also no active repository build/runtime path that consumes either staging mirror as the talent compendium source. Existing exact-path references are audit/documentation references.

**Decision:** Phase 3 will not rebuild production talents from either 862-record mirror. Doing so would discard production records and live runtime metadata.

## 3. New merged canonical authority

3A now introduces:

- `data/canonical/talents.json`
- `tools/build-canonical-talents.mjs`

The builder deterministically merges all 14 Phase 2 sourcebook datasets against the corrected Phase 1D registry.

Required invariants:

```text
14 sourcebooks
1,182 certified publication claims
        ->
1,180 canonical tree-scoped talent identities
```

Identity remains:

```text
canonicalTreeKey + talent name
```

Never global display name.

Each merged record carries canonical full text, derived summary, printed prerequisites, primary source/page, tree/access provenance, and all sourcebook publication provenance.

## 4. The one multi-publication identity

Only one canonical identity is printed in more than one certified sourcebook:

`Saga Edition Core Rulebook|Alter|Illusion`

It appears in:

- KOTOR p. 52
- Force Unleashed p. 87
- Jedi Academy p. 14

KOTOR and Force Unleashed print the earlier form:

- prerequisite: **Mind trick**
- Use the Force result must **exceed** Will Defense

Jedi Academy prints a materially revised form:

- no printed prerequisite
- check **equals or exceeds** Will Defense
- physical interaction reveals the illusion to **all who can see it**

The merged dataset preserves all three official variants.

For now KOTOR is retained as the **provisional** primary publication because it is the earliest certified printing in this corpus, but the record is explicitly:

`MULTI_PUBLICATION_VARIANT_REVIEW_REQUIRED`

and must **not** be auto-written to production until we explicitly choose the precedence rule.

## 5. Additional source cleanup discovered during merge

Visual PDF verification of the duplicate identity found two remaining transcription artifacts:

- KOTOR Illusion: OCR `~10` corrected to the printed **-10** Colossal (frigate) penalty.
- Jedi Academy Illusion: sentence-boundary and line-break OCR artifacts removed.

Jedi Academy's missing `Mind trick` prerequisite is **not** an OCR loss; the printed page genuinely omits it.

## 6. Why pack-side metadata must survive Phase 3C

The canonical dataset is rules/content authority. It is **not** a replacement for runtime metadata already curated in `packs/talents.db`.

Production repair must preserve unrelated fields such as:

- stable `_id`
- `system.choiceMeta`
- `system.abilityMeta`
- runtime rule metadata
- Active Effects
- SWSE flags
- automation metadata

unless a later phase explicitly certifies those fields for replacement.

This means Phase 3C should behave as a tree-scoped content/metadata patch over existing canonical production records, plus controlled creation of missing identities—not as a destructive pack regeneration from the Phase 2 text files.

## 7. Current 3A stop-gate state

- [x] Actual runtime talent consumer identified.
- [x] Versioned production talent source identified.
- [x] Compiled LevelDB vs. committed JSONL relationship identified.
- [x] 862-record mirrors disproved as production authority.
- [x] 1,182 publication claims merged to 1,180 identities.
- [x] Same-name identity rule retained.
- [x] Publication provenance preserved.
- [x] Canonical merged dataset created.
- [x] Deterministic builder created.
- [x] No production talent mutation performed.
- [ ] Multi-publication Illusion precedence policy approved.
- [ ] Final 3A generated-file/check-mode validation committed.
- [ ] Phase 3B production diff generated.

## 8. Next action

Finish 3A validation, then begin Phase 3B by comparing the **1,180-record canonical authority** directly against **`packs/talents.db`**, preserving all unrelated pack-side runtime metadata and producing an explicit repair disposition for every canonical identity and every production-only record.
