# SWSE Combat Phase 0 Final Index

Audit-only index. No runtime files were changed.

## Completed Phase 0 audit sequence

- 0A: Rules source baseline and glaring-gap ledger.
- 0B: Combat action routing and inventory.
- 0C: Attack roll fidelity and meets-beats audit.
- 0D: Damage call path and ranged melee penalty addendum.
- 0E: Autofire, Burst Fire, Stun, ammo, reload, and weapon mode audit.
- 0F: Grapple and Ion damage audit.
- 0G: Damage types, hazards, and special damage semantics.
- 0H: Combat state audit.
- 0I: Call-path trace audit.
- 0J: Healing, repair, Bonus HP, Treat Injury, Mechanics repair, and positive-damage accounting.
- 0K: Feat/talent context crosswalk.
- 0L: Automation boundary and implementation readiness.

## Phase 0 conclusion

The current combat architecture has useful pieces, but the pieces are not connected by a strong enough contract. Many rules are partially present as data, metadata, or helper code. The recurring failure mode is not total absence. It is context loss.

Common examples:

- A feat/talent exists, but the runtime never passes the context it needs.
- An attack roll knows the mode, but the damage button forgets it.
- A combat state is visible, but does not spend action economy or expire correctly.
- A special damage type is present as a label, but not as a rule packet.
- A manual GM-adjudicated action looks like it should be automated.

## Next implementation recommendation

Proceed to Phase 1 implementation only after accepting these boundaries:

1. Core combat remains tabletop-first, not map-first.
2. GM-adjudicated details stay GM-adjudicated.
3. The sheet automates math, resources, action economy, state, and context.
4. Routing/context preservation comes before individual feature polish.

Recommended next patch phase:

Phase 1 - Combat Action Routing Contract and Action Economy Hardening.

