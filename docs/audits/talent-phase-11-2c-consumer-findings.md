# Phase 11-2C — runtime consumers of the removed / renamed Bespoke tags

Method: executable-equivalence probes on the real runtime functions across all 1,187 talents (identical for the droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup), plus a literal scan of every tag-reading script for each removed or renamed string.

**No consumer reads any of the 74 deleted or 9 normalized-source strings through a tag lookup** (no `tags.includes/has/some`, `hasTag`, `candidateHasTag` or tag-set hit). Dependents of the `tree_<id>` family:

- `droid-progression-guards` strips a `tree_` prefix from tags to build droid-only tree keys — proven behaviourally identical without the tags (the same ids come from `system.treeId`).
- `prerequisite-checker.getCanonicalTalentTreeIds` read every tag as tree-identity evidence — **executable**; repaired in the separate Phase 11-2C tree-authority commit (tags no longer carry tree identity; canonical tree membership does).

Tests that asserted a rejected tag: none in this pass (the full suite passed after the data change).
