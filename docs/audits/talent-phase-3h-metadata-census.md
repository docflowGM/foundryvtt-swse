# Phase 3H-1 — talent metadata census (read-only)

**1187 / 1,187** canonical talents (1187 with certified canonical identity); 50 homebrew reported separately and excluded.

## Tags today

- shape: {"array<string>":937,"array<empty>":248,"undefined":2} — `system.tags` is always an array of strings when present.
- 430 unique tags, 9444 instances; 250 talents untagged (2 have no `tags` field at all).
- Phase 11 vocabulary: 57 tags; 32 legacy tags are already vocabulary members; 25 vocabulary tags are not used by any talent today.

## Legacy tag dispositions (unique tags / tag instances)

| Disposition | Unique tags | Instances |
|---|---:|---:|
| KEEP_CANONICAL | 32 | 2091 |
| LEGACY_ARCHETYPE_SCORING | 28 | 2374 |
| MAP_ALIAS | 9 | 76 |
| NON_SEMANTIC_RUNTIME_METADATA | 131 | 1270 |
| REMOVE_OBSOLETE | 61 | 1613 |
| UNSUPPORTED | 169 | 2020 |

## Other machine-readable metadata

- `abilityMeta`: 937 talents (own `abilityMeta.tags` on 6); ActiveEffects on 0; `grantsActions` on 18; `choiceMeta` on 20; structured prerequisites on 327.
- Executable metadata is inventoried here, **not** changed by Phase 3H.

Per-talent rows (identity, tree, source/page, text fingerprints, tags + dispositions, flags, abilityMeta, effects) are in `data/audits/talent-phase-3h-metadata-census.json`.
