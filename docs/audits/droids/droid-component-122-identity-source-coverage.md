# SWSE Droid Components — 122-identity source evidence ledger

**Date:** 2026-11-02. **Audit branch:** `audit/droid-publication-census-2026-10-29`. **Baseline authority:** Phase 0-3H, `data/audits/item-canonicalization-rolling-authority.json`. **Machine evidence:** `data/audits/droids/component-122-identity-source-coverage.json`.

## First-pass source-fact coverage of the frozen Core + SGD census

| Frozen disposition | Identities | Mapped to source-fact packet |
|---|---:|---:|
| KEEP | 92 | 92 |
| EDIT | 7 | 7 |
| ADD | 23 | 23 |
| **Total** | **122** | **122** |

The 122/122 result means **at least one source-fact record** is associated with each *original* canonical identity, not that all prices, physical installation conditions, usages, action economy, damage rules, exceptions, and app integrations are certified. The 92 KEEP coverage path is maintained in `data/audits/droids/component-keep-source-facts-coverage-008.json`. Missing ADD source packet mapping comes from `data/audits/droids/component-source-fact-review-rollup.json`. All 7 EDIT families map to `data/audits/droids/component-edit-families-source-facts-c2-001.json`.

### Why the distinction matters

- **Price authority:** Seven of nine shared Garage cost factors contradict Core printed cost factors; overlay-only components can default to zero; Remote Receiver is a -500-credit *construction discount*, not cash-back purchase.
- **Source ambiguities:** Several variant prices disagree between source tables and prose (such as Rocket Arm and Climbing Claws). These remain explicitly blocked from exact-price certification.
- **Host authority:** Droid Oil Bath, droid stations, Droid Socket, portable jammers, separate controllers, and certain handheld/appendage-mounted tools must not be sold as generic chassis systems just because catalog-listed.
- **Mechanics authority:** Shield SR depletion/restoration, inherited armor penalties, persistent condition damage, selected weapon/appendage host, reactive effects, skill-scope gates, and limited-use systems are not proven by text presence alone.
- **Identity authority:** Translator Unit and Laminanium Plating represent typed published variants; old aliases need backward-compatible actor migration. Miniaturized Self-Destruct cannot be removed while live damage consumers depend on it.

### Current formal certification levels

**Identity and source-fact review:** 122/122 for the *two-book historical baseline*. **Full source-mechanical certification: 0. Production catalog migration: 0. Garage/chargen/follower/Store application parity: 0. Foundry runtime certification: 0.** All 5 repository-only candidates remain unresolved and unremoved. Other SWSE sourcebooks have not been exhaustively inventoried for new general purchasable droid components.

This file does not change or supersede the frozen Phase 0-3H identity authority. It is a **source-review coverage view**, not a new independent production catalog or permission to change `scripts/data/droid-part-schema.js`.

## Next actual audit work

Start **source-mechanical certification by completeness fields**, not by number of rows. Recommended first tranche: 7-of-9 cost factor mismatch, 4 overlay-only zero-price patterns, explicit non-body category gates, size/variant exact pricing, and high-impact action mechanics. For each, identify the source, legal host and action resources, record implementation test expectations, and leave runtime unmodified pending explicit approval. Separately extend census beyond Core + SGD using published sources; do not assume 122 covers all books.

## Validation

Machine file includes **one row per canonical Phase 0-3H identity**, each with exact review packet path and baseline category. Reproducible validator:

```sh
node tools/audits/droids/verify_component_122_source_coverage.mjs
```

Structural consistency was checked while authoring. This is **not** a test of application correctness, pricing, license eligibility, or Foundry V13 operation.
