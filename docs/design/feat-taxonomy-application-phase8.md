# Phase 8: Global Feat Taxonomy Application

This phase applies the expanded feat bucket/subbucket taxonomy to every feat in the catalog without implementing new feat mechanics.

## Goals

- Give every feat one primary `bucket` and one primary `subbucket`.
- Preserve existing `featType` values for backward compatibility.
- Add a richer `system.taxonomy` block for future feat-picker UI and implementation backlog work.
- Enforce that active subbuckets contain at least two feats; one-off categories are merged into broader sibling subbuckets.
- Prevent Force keyword mistakes. A feat with “Force” in its name is not a Force feat unless its mechanics, prerequisites, or source context make it one.

## Metadata shape

Each feat now has metadata similar to:

```json
{
  "bucket": "Combat",
  "subbucket": "Area & Explosives",
  "secondaryBuckets": ["Tech & Equipment"],
  "taxonomyConfidence": "high",
  "taxonomyReviewed": true,
  "taxonomy": {
    "bucket": "Combat",
    "subbucket": "Area & Explosives",
    "secondaryBuckets": ["Tech & Equipment"],
    "tags": ["grenade", "forced_movement"],
    "confidence": "high",
    "reviewed": true,
    "sourceReviewReason": ""
  }
}
```

## Source-review queue

Feats that were not safe to classify for automation from catalog text alone are still assigned a proposed bucket/subbucket for UI browsing, but they are marked:

```json
{
  "taxonomyConfidence": "source_review_required",
  "taxonomyReviewed": false
}
```

The complete queue is stored in:

```text
data/feat-taxonomy/feat-taxonomy-source-review-list.json
```

That file includes the feat name, catalog description, proposed bucket/subbucket, sourcebook, and reason.

## Runtime impact

This phase is metadata-only. It does not add feat automation, new actor math, or new roll hooks.
