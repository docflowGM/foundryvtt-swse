# Class Phase 6F-5 — Elite Trooper Damage Reduction

**Date:** 2026-11-02  
**Base:** merged `main` commit `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f5-elite-trooper-dr`  
**Status:** pushed for independent review; exact-head CI and live Foundry v13 certification pending.

## Printed authority

*SWSE Core Rulebook*, Elite Trooper prestige class table (printed p. 217):
- Class level 2: DR 1
- Class level 4: DR 2
- Class level 6: DR 3
- Class level 8: DR 4
- Class level 10: DR 5

Odd class levels retain the previous value. This DR does not stack with another damage reduction value; the highest applicable source wins. Existing lightsaber bypass behavior still applies unless an individual source states otherwise.

## Implementation

- `scripts/engine/combat/class-elite-trooper-dr.js`: pure class-Item-based DR schedule `min(5, floor(Elite Trooper level / 2))`. Does not grant DR based on class-like feats or on overall character level.
- `scripts/engine/combat/resolvers/damage-reduction-resolver.js`: adds a single ordinary DR entry into `getCanonicalDamageReductionEntries(actor)`. The existing highest-only source and DR-bypass mechanisms remain authoritative. `getCurrentDR` also reports the Elite Trooper value, rather than showing a lower value than the actual mitigation.
- `tests/class-phase-6f5-elite-trooper-dr.test.mjs`: checks all levels 0–10, capped behavior, unowned/incorrect class Items and integration with highest-only mitigation.

## Open acceptance gates

1. **CI:** the exact pushed head's rolling tests must pass.
2. **Foundry v13:** damage before/after DR, source selection vs other DR and lightsaber/bypass tags must be exercised live.
3. **Component damage:** confirm mixed damage components continue using one highest applicable DR calculation; no separate per-component subtraction.
4. **Actor provenance:** existing character class Items must persist expected `system.level`; this feature does not alter class progression or migrate legacy actors.

No damage packets, class records, talent trees, weapon SSOT or HP fields were modified.
