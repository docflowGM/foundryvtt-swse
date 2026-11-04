# Class Phase 6G-0 — Saboteur Quick Sabotage

**Date:** 2026-11-04  
**Base:** merged `main` at `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6g0-saboteur-quick-sabotage`  
**Status:** code and focused tests pushed. Exact-head CI and live Foundry v13 action integration are separate gates.

## Printed source

*The Force Unleashed Campaign Guide*, Saboteur — **Quick Sabotage**:
- Beginning at Saboteur level 4, the character may attempt a Mechanics check to disable a device using improvised tools when no Security Kit is available.
- At Saboteur level 4, a **simple** device may be disabled using **one swift action**.
- At Saboteur level 6, a **tricky** device may be disabled using **one swift action**.
- At Saboteur level 8, a **complex** device may be disabled using **two swift actions**.

These are the *Saboteur class levels*, not overall heroic levels. The complexity and toolkit rules do not apply to Handle Explosives, Jury-Rig or Repair. The underlying Mechanics check, DC and failed-check consequences remain those of Disable Device.

## Implementation

- `scripts/engine/skills/class-saboteur-quick-sabotage.js`: pure class-item eligibility, device-complexity validator, action plan and explicit tool availability. It never treats an Item merely named Saboteur as a class, and refuses unknown device complexity rather than silently treating it as simple.
- `scripts/skills/skill-uses.js` — `MechanicsUses.disableDevice()`: requests the plan before the check, reports the action requirement and tools in chat and the result receipt, permits improvised tools only when the feature applies, and refuses explicit no-Security-Kit cases where the actor lacks Quick Sabotage. Existing call sites without verified tool availability remain operational for compatibility but display `Security Kit (GM verify)` rather than falsely claiming the item exists.
- `tests/class-phase-6g0-saboteur-quick-sabotage.test.mjs`: all class-level/complexity breakpoints, exact two-swift-action requirement, improvised tool policy, spoofed class items, invalid device complexity and check/receipt wiring.

## Explicit certification limits

1. **The current `MechanicsUses.disableDevice` path only reports action cost.** It does not call the canonical ActionEconomyConsumption owner. Receipts say `committed:false`, and chat says `GM-managed`. Do not represent the swift/full-round cost as automatically deducted until the live extra-skill-use dispatcher threads action expenditure into the skill-use API.
2. The caller can supply `context.hasSecurityKit` when the GM or a trusted inventory check has established tool availability. When omitted, the result clearly marks availability unverified; this change does not create an independent toolkit identity authority.
3. `MechanicsUses` currently has no repository consumer outside `scripts/skills/skill-uses.js`, so the class modifier is wired into that implementation, **not certified as reachable through the Foundry character sheet**. The separate extra-skill-use registry and dispatch must be reviewed before claiming player-facing activation.
4. The feature is *not* a level-up or bonus-feat record change. The existing class unlock record remains authoritative. Other unmerged class-feature PRs are unaffected.
5. CI, independent review and Foundry v13 action-economy integration remain required before merging.

## Follow-on

If the skill-use dispatcher can be brought under canonical ActionEconomyConsumption without adding an alternate action authority, finish charging the declared action cost atomically and show the correct actor/skill-use button. Until then, the runtime output is informative with GM-managed expenditure, not complete end-to-end automation.
