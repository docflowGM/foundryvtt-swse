# Feat Inventory Report

Generated: 2026-08-06T23:27:17.989Z
Git commit: 02d2d965259cb323af050217f86e7d1001230738

## Hashes

- data/feat-catalog.json: `ff9d1f1fa1d6036b1ee6a8b970e2b2432f62872b16d1a3a1c40e625cabd41cea`
- packs/feats.db: `7d889fcdc1e8cc0d921341f1e100193a1c3652bf45ea40280308641a4d291af8`
- data/feat-validity-registry.json: `1d7a51014d15d362be395e7e7e04b8c73541d9c306eda17605c07fcfbe489e3e`

## Totals

- Catalog documents: 413
- unclassified: 402
- invalid_not_swse_feat: 10
- class_feature_not_feat: 1

## Removal and restoration history

- **2026-06-10**: feat-pack-sanitization pass reported 414 feat documents (docs/audits/feat-pack-sanitization-report.json).
- **2026-06-30**: 414 -> 401. Both packs/feats.db and data/feat-catalog.json were at 401 documents per docs/audits/feat-source-parity-phase-1-implementation-prompt.md. No reconciliation artifact in the repository recorded which ~13 documents were dropped or why.
- **2026-08-06**: Diffed the orphaned packs/feat-catalog.db (413 docs, unreferenced by system.json) against packs/feats.db (401 docs) and found 12 fully-authored, legitimate core feats present in the orphaned file but absent from the shipped catalog/pack: Indomitable Will, Lucky Shot, Stunning Strike, Noble Fencing Style, Greater Weapon Specialization, Force Focus, Educated, Greater Weapon Focus, Weapon Specialization, Recall, Harm’s Way, Forceful Warrior. Restored all 12 into data/feat-catalog.json and rebuilt packs/feats.db (401 -> 413).
- **2026-08-06**: Open item: 414 -> 413 still leaves exactly one document unaccounted for. No file currently in the repository lists the full 414-document id/name set, so the identity of this last entry could not be recovered. Flagging here instead of guessing.

## Known invalid / non-feat entries still shipped in the compendium

These remain in `data/feat-catalog.json` / `packs/feats.db` as `type: "feat"` documents. They must not be treated as implementation-eligible feats.

- **Spring Attack** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Reckless Charge** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Wounding Strike** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Friendly Fire Avoidance** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Heroic Surge** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Grappling Strike** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Improved Knock Prone** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Knock Prone** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Hew** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Improved Stun** — `invalid_not_swse_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)
- **Delay Damage** — `class_feature_not_feat` (docs/audits/strict-combat-bucket-feat-validity-audit-2026-07-03.json)

## Stale references to invalid entries in generated reports/backlogs

- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Heroic Surge" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Hew" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Improved Knock Prone" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Improved Stun" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Knock Prone" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-backlog.json`: "Spring Attack" (1 occurrence)
- `data/feat-implementation/core-rulebook-feat-implementation-review-list.json`: "Hew" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json`: "Delay Damage" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json`: "Friendly Fire Avoidance" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json`: "Grappling Strike" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json`: "Reckless Charge" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-backlog.json`: "Wounding Strike" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json`: "Delay Damage" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json`: "Friendly Fire Avoidance" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json`: "Grappling Strike" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json`: "Reckless Charge" (1 occurrence)
- `data/feat-implementation/galaxy-at-war-feat-implementation-review-list.json`: "Wounding Strike" (1 occurrence)
- `data/feat-implementation/phase10c-adapter-contracts.json`: "Delay Damage" (1 occurrence)
- `data/feat-implementation/phase10c-adapter-contracts.json`: "Friendly Fire Avoidance" (1 occurrence)
- `data/feat-implementation/phase10c-adapter-contracts.json`: "Wounding Strike" (1 occurrence)
- `data/feat-implementation/phase10e-target-effect-adapter-implementation.json`: "Wounding Strike" (1 occurrence)
- `data/feat-implementation/phase10f-damage-timing-rider-adapter-implementation.json`: "Delay Damage" (1 occurrence)
- `docs/audits/area-explosives-feat-implementation-addendum-2026-07-03.json`: "Friendly Fire Avoidance" (1 occurrence)
- `docs/audits/attack-options-feat-implementation-addendum-2026-07-03.json`: "Improved Stun" (1 occurrence)
- `docs/audits/combat-phase-0a-glaring-gap-ledger.json`: "Improved Stun" (1 occurrence)
- `docs/audits/combat-phase-0f-grapple-ion-seam-ledger.json`: "Grappling Strike" (1 occurrence)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Friendly Fire Avoidance" (2 occurrences)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Grappling Strike" (3 occurrences)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Improved Knock Prone" (1 occurrence)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Improved Stun" (1 occurrence)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Knock Prone" (1 occurrence)
- `docs/audits/combat-phase-0k-affected-feat-talent-inventory.json`: "Reckless Charge" (1 occurrence)
- `docs/audits/combat-phase-0k-context-seam-ledger.json`: "Friendly Fire Avoidance" (2 occurrences)
- `docs/audits/combat-phase-0k-context-seam-ledger.json`: "Grappling Strike" (1 occurrence)
- `docs/audits/combat-phase-0k-context-seam-ledger.json`: "Improved Stun" (1 occurrence)
- `docs/audits/combat-phase-0k-context-seam-ledger.json`: "Reckless Charge" (1 occurrence)
- `docs/audits/damage-threshold-feat-implementation-addendum-2026-07-03.json`: "Delay Damage" (1 occurrence)
- `docs/audits/damage-threshold-feat-implementation-addendum-2026-07-03.json`: "Hew" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Delay Damage" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Friendly Fire Avoidance" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Grappling Strike" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Heroic Surge" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Hew" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Improved Knock Prone" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Improved Stun" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Knock Prone" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Reckless Charge" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Spring Attack" (1 occurrence)
- `docs/audits/feat-implementation-status.json`: "Wounding Strike" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Heroic Surge" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Hew" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Improved Knock Prone" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Improved Stun" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Knock Prone" (1 occurrence)
- `docs/audits/generated/core-rulebook-feat-implementation-readiness-report.json`: "Spring Attack" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Delay Damage" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Friendly Fire Avoidance" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Grappling Strike" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Heroic Surge" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Hew" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Improved Knock Prone" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Improved Stun" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Knock Prone" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Reckless Charge" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Spring Attack" (1 occurrence)
- `docs/audits/generated/feat-taxonomy-application-report.json`: "Wounding Strike" (1 occurrence)
- `docs/audits/grapple-feat-implementation-addendum-2026-07-03.json`: "Grappling Strike" (1 occurrence)
- `docs/audits/melee-close-combat-feat-implementation-addendum-2026-07-03.json`: "Improved Knock Prone" (1 occurrence)
- `docs/audits/melee-close-combat-feat-implementation-addendum-2026-07-03.json`: "Knock Prone" (1 occurrence)
- `docs/audits/mobility-positioning-feat-implementation-addendum-2026-07-03.json`: "Heroic Surge" (1 occurrence)
- `docs/audits/mobility-positioning-feat-implementation-addendum-2026-07-03.json`: "Reckless Charge" (1 occurrence)
- `docs/audits/mobility-positioning-feat-implementation-addendum-2026-07-03.json`: "Spring Attack" (1 occurrence)
- `docs/audits/mobility-positioning-feat-implementation-addendum-2026-07-03.json`: "Wounding Strike" (1 occurrence)

