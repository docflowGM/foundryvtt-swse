# Phase 3 — Cross-book TX-130T source identity reconciliation

Verified the two independently published TX-130T statblocks in **two original scanned PDFs**, not merely matching an engine name or unverified TXT.

| Source field | Clone Wars Campaign Guide printed p169 | Force Unleashed Campaign Guide printed p203 |
|---|---|---|
| Exact source key | `cw-tx-130t-saber-class-fighter-tank` | `fucg-tx-130t-fighter-tank` |
| Published CL | 7 | 8 |
| Speed (max km/h) | 8 sq (200) | 8 sq (193) |
| Crew | 3 plus optional astromech | 2 |
| Passengers | 2 | 5 |
| Cargo | 750 kg | 100 kg |
| Missile payload | 16 | 8 |
| Published source attack labels | Laser, twin medium laser, missile, later composite beam | Laser and medium concussion missile |
| Unresolved print attack mismatch | Later variant Ranged laser +1 vs detailed +3 | Ranged summary +1 vs detailed +2 |

**Source fingerprints:** Clone Wars SHA256 `3c1f085b17f5c9e7288dcd1e1141279a61fc914ce7acb9229f6f3d1aa02219e6` and Force Unleashed SHA256 `0ef4b47b2bf55091c13c1960e4ea367675cb7d84a776f0b9f6dc8fc27c57840c`. Visually inspected physical pages 170 and 204, respectively.

These are **two publication-specific records**, not accidental duplicates. A future optional family link may group them, but no source fact, hit points, attack bonus, or loadout may be silently copied between books. The original printed contradictions remain visible; no effective attack bonus has been chosen without owner approval. The Phase 2 stages already represent the Force Unleashed print split and the earlier Clone Wars targeted correction explicitly preserves both summary forms, so this checkpoint adds the cross-book source risk ledger and immutable regression tests rather than rewriting source values.

**Open operational gates:** source-specific effective attack adjudication, independently certified hardware mounts/arcs, optional astromech and turret consumer, source-to-runtime normalization, and live Foundry. No production authority changed.
