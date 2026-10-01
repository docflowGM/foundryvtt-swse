# Phase 11-2C — runtime consumers of the removed / renamed Bespoke tags

Method: executable-equivalence probes on the real runtime functions across all 1,187 talents (identical for the droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup), plus a literal scan of every tag-reading script for each removed or renamed string.

**No consumer reads any of the 74 deleted or 9 normalized-source strings through a tag lookup** (no `tags.includes/has/some`, `hasTag`, `candidateHasTag` or tag-set hit). Dependents of the `tree_<id>` family:

- `droid-progression-guards` strips a `tree_` prefix from tags to build droid-only tree keys — proven behaviourally identical without the tags (the same ids come from `system.treeId`).
- `prerequisite-checker.getCanonicalTalentTreeIds` read every tag as tree-identity evidence — **executable**; repaired in the separate Phase 11-2C tree-authority commit (tags no longer carry tree identity; canonical tree membership does).

Tests that asserted a rejected tag: none in this pass (the full suite passed after the data change).

## Tree-authority repair (separate commit)

`prerequisite-checker.getCanonicalTalentTreeIds` no longer reads `system.tags`; it resolves tree identity from the structured fields plus the certified membership authority (`TalentTreeDB.getTreeIdsForTalentId`, built from the tree packs' `talentIds` by canonical `_id`, never by name). The snapshot path (`actor-prerequisite-snapshot.getTalentTreeKeys`) consumes the same method. Audit: `data/audits/talent-phase-11-2c-tree-credit-repair.json` (old checker + Phase 11-2A pack vs repaired checker + current pack):

- **298** polluting tag credits stay gone; **0** false tag/membership credits remain.
- **79** old tag credits mirrored certified membership — all were the talent's *own* primary tree spelled differently (since Phase 3F `system.treeId` is the persistent tree `_id`, which a name-spelled prerequisite token does not match). All 79 are restored through membership; all 1,187 primary tree identities resolve.
- **0** talents are certified members of a tree other than their primary (same-name tree groups aside): no genuine multi-tree relationship exists in the current packs, so none could be lost or restored. (The "45 legitimate credits" counted in the 11-2B report were primary-tree credits of this kind.)
- Same-name trees (two "Squad Leader" trees) resolve by tree `_id`; membership never crosses same-name talents.

**Owner decision (not changed):** 59 credits come from the structured `system.category` field (a class-style label such as "Force Adept", "Gunslinger", "Bounty Hunter") crediting talents to a same-named tree they do not belong to. That is a field, not a tag, and was already true before any tag cleanup; removing `category` from the tree-identity candidates would complete the ruling that only certified identity/membership grants credit.

Other remaining tag readers of tree-ish words (not prerequisite credit): `force-adept-talent-actions.announceMysticMastery` (regex over category/tree/tags) and `sith-talent-actions` (lightsaber-form lookup haystack) — probes show no behaviour change from these cleanups.
