# Combat Phase 2C — Ammo Resource Transactions

## Goal

Turn the workflow/resource metadata preserved in Phase 1F and the damage packet bridge from Phase 2A/2B into an actual ammunition transaction path, without creating a second ammunition authority.

## Implemented

- Restored the missing combat workflow registry/shim files imported by the v2 character sheet:
  - `combat-action-normalizer.js`
  - `combat-context-builder.js`
  - `combat-workflow-registry.js`
  - `combat-workflow-result.js`
- Kept the registry as a thin router only; it delegates to existing sheet, roll, action economy, and combat engines.
- Extended `AmmoSystem` as the single ammunition authority with:
  - `isTrackingEnabled()` using the `trackBlasterCharges` house rule
  - workflow ammo-cost resolution
  - preflight checks before action economy is spent
  - mutating spend for attack workflows
  - rollback support for failed attack workflows
- Normal attack workflows now spend ammo when tracking is enabled:
  - basic ranged/ammo-pool weapon: 1 shot
  - Burst Fire: 5 shots
  - Autofire: 10 shots
  - explicit workflow `resources.ammoCost` / `ruleData.ammoCost` wins
- Character-sheet combat action attack path now preflights ammo before spending action economy.
- Full Attack now preflights aggregate ammo before spending action economy and rolls back earlier ammo spends if the sequence fails partway through.
- Reload combat action now routes through a dedicated workflow handler and `AmmoSystem.reloadWeapon()`.
- Deprecated/enhanced autofire path no longer blocks/consumes ammunition when `trackBlasterCharges` is disabled.
- `CombatOptionResolver` now exposes selected attack-option ammunition costs, so selected Burst Fire can wake up ammo spending outside static combat-action metadata.

## Intentional boundaries

This phase does not implement:

- ammunition inventory item consumption / power-pack stack depletion
- reload source selection
- Autofire multi-target adjudication UI
- stun/lethal selector UI
- fire/acid recurring hazard packets
- mixed packet damage typing

## Validation

Ran `node --check` on changed JavaScript files.

Foundry runtime confirmation is still needed for the full UI loop because action economy, item mutation, and chat posting depend on Foundry documents and world settings.
