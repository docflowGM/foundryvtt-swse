# Class Phase 6F-10 — Saboteur Quick Sabotage

> **Integration note (2026-11-04):** This was the standalone Quick Sabotage checkpoint for PR #1104. The overlapping Master Saboteur consumer has now been reconciled on successor draft PR #1105 (Phase 6F-11). The historical merge conflict described below is resolved **in that successor branch only**; do not merge #1104 or #1101 separately.

**Source:** *The Force Unleashed Campaign Guide*, Saboteur prestige class, Quick Sabotage.  
**Branch:** `feat/class-phase-6f10-quick-sabotage`  
**Base:** merged `main` at `62169f621e15409268ca8f91efd846a3a2c118d9`.  
**Status:** code and tests pushed, exact-head CI/Foundry v13 live validation outstanding.

## Printed rules

Quick Sabotage allows disabling a device with improvised tools when a Security Kit is unavailable. Its speed improves by Saboteur **class** level:

| Saboteur class level | Simple | Tricky | Complex |
|---|---|---|---|
| 1–3 | Full-round | Full-round | Full-round |
| 4–5 | 1 swift | Full-round | Full-round |
| 6–7 | 1 swift | 1 swift | Full-round |
| 8–10 | 1 swift | 1 swift | 2 swift |

It is **not** a bonus to Mechanics, a reduction in Disable Device DC, or an allowance to speed up Handle Explosives, Jury-Rig or Repair.

## Runtime owner and decisions

- `scripts/engine/progression/utils/saboteur-quick-sabotage.js`: pure class ownership and complexity plan. Acquiring Quick Sabotage at class level 4 also permits the improvised-tools substitution. An unknown device complexity fails before an action is spent or a die rolled.
- `scripts/skills/skill-uses.js`: existing `MechanicsUses.disableDevice()` uses the plan for action label, tool requirements and action costs. The first four arguments are unchanged; an optional fifth argument `{hasSecurityKit:false}` explicitly signals missing kit. If kit is missing, only an eligible Saboteur may substitute improvised tools; possession is **not inferred** from a world Actor's inventory.
- Fast Disable Device checks reserve one or two `ActionEconomyConsumption.spend('swift')` costs **before** the Mechanics roll. Refused costs prevent the roll. If a second swift spend fails or the roll/chat later throws, previously committed swift actions are rolled back in reverse order; failure to verify refund raises a GM-review error. Out of combat, the canonical out-of-combat no-op is permitted.
- Ordinary full-round device checks retain existing behavior; this feature does not silently reimplement an otherwise missing universal full-round skill-use action spender.
- `tests/class-phase-6f10-quick-sabotage.test.mjs`: class levels, impostor class Items, complexity thresholds, strict no-kit proof, one/two swift spends, failure injections, out-of-combat behavior and absence of changes to other Mechanics applications.

## Certification boundaries

- Current Disable Device consumer assumes a Security Kit unless the **caller explicitly** passes `hasSecurityKit:false`; no global inventory scan is implemented here.
- There is no separate swift-speed selector: an eligible Saboteur takes the faster printed option by default. The GM can still adjudicate choosing a slower method outside this service.
- **Important stack conflict:** PR #1101 (Master Saboteur) separately modifies the same `MechanicsUses.disableDevice` body and remains draft. Do **not** merge this PR before reconciling both features and re-running tests on the combined branch. Both class features must coexist without two independent reroll/cost paths.
- No production class/talent/feat/equipment records were changed; no live Foundry v13 skill action/economy testing has been performed.
