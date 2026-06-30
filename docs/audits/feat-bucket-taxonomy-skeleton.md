# Feat Bucket Taxonomy Skeleton Audit

## Scope

This audit validates the expanded feat bucket taxonomy skeleton only. It is not a feat migration audit.

## What it checks

- taxonomy JSON exists and parses
- taxonomy status is `skeleton_only`
- mutation guardrail is present
- required top-level buckets exist
- bucket IDs are unique
- subbucket IDs are unique inside each bucket
- every bucket and subbucket has a label
- Force bucket includes the keyword-classification guardrail
- migration template exists and has zero assignments

## What it does not check yet

- every feat has a bucket
- every feat has a subbucket
- catalog/pack metadata parity for new fields
- feat picker UI rendering
- implementation backlog migration

Those checks belong to the future migration phase after the taxonomy skeleton is accepted.

## Command

```bash
node scripts/dev/audit-feat-bucket-taxonomy-skeleton.mjs --strict
```

## Phase rule

Phase 7C.5 must not modify existing feat metadata. If a zip for this phase includes `data/feat-catalog.json`, `packs/feat-catalog.db`, or `packs/feats.db`, reject it and rebuild as skeleton-only.
