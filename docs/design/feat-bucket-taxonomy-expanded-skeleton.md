# Phase 7C.5: Expanded Feat Bucket Taxonomy Skeleton

## Purpose

This phase defines the new feat bucket design without changing existing feat metadata. The goal is to give the feat picker and future implementation backlog a stronger taxonomy before any mass reassignment happens.

## Non-goals

This phase intentionally does not change:

- `data/feat-catalog.json`
- `packs/feat-catalog.db`
- existing feat `type`, `featType`, tags, source, prerequisites, effects, or implementation metadata
- any runtime feat logic
- any feat picker UI behavior

## Design model

The future model is three-layered:

```text
bucket      = primary UI grouping
subbucket   = primary granular grouping within that bucket
tags        = cross-cutting search/mechanics hints
```

A feat should eventually have exactly one primary bucket and one primary subbucket. It may also have secondary buckets for discoverability.

Example future shape:

```json
{
  "bucket": "cybernetics_implants",
  "subbucket": "implant_penalties",
  "secondaryBuckets": ["tech_equipment", "recovery_survival"],
  "taxonomyConfidence": "high",
  "taxonomyReviewed": true
}
```

## Top-level buckets

The skeleton defines these top-level buckets:

- Combat
- Weapon & Armor
- Force
- Skills
- Tech & Equipment
- Droid
- Cybernetics & Implants
- Starship & Vehicle
- Recovery & Survival
- Social & Intrigue
- Species & Origin
- Leadership & Allies
- Character
- GM / Metadata

This is intentionally more specific than the older broad grouping. With hundreds of feats, specificity helps browsing, filtering, and implementation planning.

## Classification guardrails

The important rule is that taxonomy is not keyword-based.

A feat should not be classified as a Force feat simply because the title contains the word Force, forceful, or forced. The assignment should be based on prerequisites, benefit text, runtime mechanics, and source context.

If a feat is 50/50, future migration should mark it as source-review required instead of guessing.

## Future migration rules

The next phase should:

1. read this taxonomy file,
2. map obvious feats using source-aware manifests and implementation buckets,
3. assign one primary bucket and subbucket,
4. add secondary buckets only for discoverability,
5. mark ambiguous feats with `taxonomyConfidence: "source_review_required"`,
6. require `sourceReviewReason` for ambiguous assignments,
7. preserve existing feat rules data.

## Files added in this phase

```text
data/feat-taxonomy/expanded-feat-bucket-taxonomy.json
data/feat-taxonomy/feat-bucket-taxonomy-migration-template.json
scripts/dev/audit-feat-bucket-taxonomy-skeleton.mjs
docs/design/feat-bucket-taxonomy-expanded-skeleton.md
docs/audits/feat-bucket-taxonomy-skeleton.md
```
