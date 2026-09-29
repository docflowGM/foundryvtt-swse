# Talent Canonicalization Phase 3C-1 Certification

## Status

**PHASE 3C-1 CERTIFICATION CANDIDATE — awaiting PR #984 CI**

Branch:

`audit/talent-phase-3c-certification-fixes`

Base:

`main@b2614460b8c127522041c88f1c479131b2d556b8`

This checkpoint does **not** mutate production talent, talent-tree, class, or generated runtime-registry data.

## Certified pre-write authority

Phase 3C continues to consume the globally certified Phase 3B manifests as the migration authority:

- 14 sourcebooks
- 1,180 canonical identities
- 932 existing production talent IDs
- 248 certified creates
- 7 talent-tree creates
- 1 GenoHaradan consolidation
- 5 class-access mutations
- 90 Phase 3D-deferred production records
- 2 review-only duplicate aliases

The committed pre-write report is:

`data/audits/talent-phase-3c-dry-run-report.json`

It records the projected 1,024 -> 1,272 talent transition and fingerprints all 92 protected production records.

## Independent-review blocker resolutions

### B1 — post-write verification

Resolved by adding `tools/apply-talent-phase-3c.mjs --verify`.

The post-state verifier:

- reads committed Phase 3B manifests directly;
- does not call the Phase 3B builders;
- expects the repaired 1,272-record production state;
- verifies certified mutation fields, IDs, tree membership, tree creates, consolidation, and class-access mutations;
- verifies the 92 protected records against fingerprints frozen in the Phase 3C-1 report;
- verifies the Core/JATM Charm Beast split.

The Phase 3B builder/check path remains a pre-write authority only.

### B2 — review-only duplicate aliases

Resolved by an exact, ID-keyed exception in `tools/audit-talent-tree-membership.mjs`.

The exception is derived from `talent-phase-3b-global-closeout.json` and applies only when:

- the closeout classification is `REVIEW_EXTRA_DUPLICATE_CANONICAL_ALIAS`;
- the duplicate occurs in the certified tree/name pair;
- exactly two same-name records are present;
- one is the certified protected review-extra ID.

The two protected records remain deferred to Phase 3D:

- `a7d8c4da96eacad4` — Notorious
- `222327492c484b4a` — Teräs Käsi Basics

Claude's independent invariant checker was tightened from one expected B2 failure to zero failures.

### B3 — runtime registry parity

Phase 3C owns the downstream runtime-registry rebuild.

`tools/build-talent-runtime-registries.mjs` now provides one deterministic builder for:

- `data/generated/talent-trees.registry.json`
- `data/fixes/talent-trees.registry.json`
- `data/generated/class-talent-tree-bindings.json`

The talent-tree registry is derived from production tree talent IDs and the production talent pack. Existing stable registry IDs are preserved when the display name is unchanged.

Projected-state regression coverage requires:

- 196 runtime tree entries;
- 37 class-binding entries;
- all seven certified new trees present;
- obsolete GenoHardan split absent;
- canonical GenoHaradan present;
- Charm Beast represented in both Beastwarden and Dathomiri Witch;
- all five certified class-access mutations represented.

The actual registry files remain unchanged during 3C-1. They must be written atomically with the production packs during 3C-2 and checked afterward.

### B4 — dry-run report gate

Resolved.

The report is committed and CI now runs:

`node tools/apply-talent-phase-3c.mjs --check`

The CI diagnostic builders also use `--check` and can no longer overwrite manifests in a runner or copied local workflow.

## Additional hardening completed

Before Phase 3C-2 the primary applicator now also:

- rejects unknown dispositions;
- enforces disposition/ID-kind consistency;
- refuses mutation fields outside the canonical/structural allow-list;
- refuses to replace a non-object path parent while setting a nested field;
- restricts GenoHaradan survivor patches to certified structural fields;
- restricts class-access mutations to the four certified class tree arrays;
- performs ID-safe old-tree name cleanup when moving talents.

## Phase 3C-2 gate

Production application must not begin until PR #984 passes the repository validation workflow.

Once this checkpoint is merged, Phase 3C-2 should:

1. add the explicit production-write path;
2. require the certified pre-state before writing;
3. write `packs/talents.db`, `packs/talent_trees.db`, and `packs/classes.db`;
4. rebuild both talent-tree runtime registries and class bindings in the same migration;
5. run `tools/apply-talent-phase-3c.mjs --verify` against the written state;
6. run the runtime-registry builder in `--check` mode;
7. run the talent/tree membership audit;
8. run the independent Phase 3C invariant suite;
9. prove a second application produces no semantic diff.

No Phase 3D cleanup of the 90 deferred records or two review-only extras belongs in Phase 3C-2.
