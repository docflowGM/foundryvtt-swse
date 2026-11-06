# Vehicle Phase 2C CP6: Immediate Canonical Stock Gate, Custom Modification Boundary

## Authority decisions

User **DENIED** the proposed staged rollout. Therefore current vehicle-domain `rollAttack` runs the provenance preflight *before* any ammo, action economy, temporal cost or attack die roll. An unmapped original-stock attack refuses immediately. User clarification: this strict published rules audit concerns **out-of-the-box canon vehicles**, not noncanonical installed weapons that can arise from future vehicle modifications.

Approved D01/D02/D03 continue to apply: 318 published claim identities, source-silent arcs never become forward/turret, and internally contradictory printed attack values are not silently adjudicated.

## What the gate actually does

- `scripts/combat/rolls/attacks.js` identifies the **existing** attack domain. Character attacks with personally wielded vehicle-class weapons retain their legitimate character path. An Item owned by a vehicle cannot masquerade as a personally wielded weapon without valid vehicle context.
- When attack domain is vehicle, the gate proves which weapon is installed from the *vehicle's own persisted weapon list / Item collection*, never a user-supplied `sourceEntryKey`, `gm` flag or roll-option evidence.
- A `sourceModificationId` on a `system.weapons[index]` row is **not sufficient by itself** to exempt a weapon. Its ID and name must match an applicable installed weapon modification in **both** `system.modificationData.modifications` and `system.shipyard.installedModifications`, with a weapon category. For Items, the owned Item must be the same instance and its mounted mod ID must match.
- A matching customized weapon proceeds through the existing actor, operator, damage and equipment paths; it is **not** asserted as a published/certified stock attack or as a validation of its modification's mechanical legality.
- On the same modified vehicle, unmodified stock rows still require strict published source-group lookup.
- The immutable trusted Foundry-weapon-group mapping contains **zero** entries in CP6 because the 318 printed source reviews do not yet establish the installed Item/row-to-book-group relationship. This is deliberate: all unmapped stock attacks are refused, including currently used legacy vehicles. No false all-ships-green certification or permissive fallback is introduced.

## Risks and testing boundaries

Current shipyard code writes provenance in `system.weapons[].sourceModificationId`, but the ordinary vehicle importer previously discarded it. CP6 preserves this marker when importing; it does **not** synthesize one from ship name or appearance.

The future trusted stock registry must be compiled from authoritative print audit records, signed source keys, selected configurations, and Foundry pack identity. Actor system metadata can assist lookup, but it cannot by itself be sufficient canonical evidence.

GM arc adjudication is allowed only on a trusted source-bound group and uses the established receipt-before-exception adapter. It cannot grant strict certification. For a printed attack-bonus contradiction, CP6 deliberately blocks use of the printed numeric alternatives in gunnery math until the crew's BAB + vehicle INT composition can be reconciled; choosing a flat total would violate the attack formula.

**Testing status:** CP3 + CP4 policy and new CP6 provenance tests run as 42 isolated Node tests. Full integrated repository and Foundry V13 session tests are not claimed. Source snapshots are not mutated; no compendium change or canonical stock attack group hydration is authorized by this checkpoint.

## Cross-project dependency registered after CP6

The future vehicle/droid customization architecture will preserve immutable printed stock definitions independently from individual actor installation histories, effective configuration and transient combat state. 'Pure' and 'modified' describe instance configuration, not two independent editable canonical compendia. CP6's per-weapon stock-versus-shipyard classification remains an interim provenance boundary, **not** source-audited installation legality or an authorization to build the modification system. See [the future-modification dependency contract](swse-phase2c-future-vehicle-droid-modification-dependencies.md). Immediate strict stock enforcement and the zero trusted stock runtime bindings remain unchanged.
