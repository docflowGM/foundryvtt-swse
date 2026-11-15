# Force Class Phase 6V — Temptation next-turn identity correction

**Parent:** Phase 6U draft PR #1134 at `52548a38d85d5fd67ed953bf57063fe221cb1ccc`.
**Status:** Source-scoped, offline-regression-ready code; no Foundry V13 live proof.

## Confirmed bug

The original Sith Lord Temptation recipient decision compared `combat.turn >= entry.createdTurn` in the following round. A Foundry `combat.turn` is an index in a **mutable initiative order**, not the source's identity. If a GM moves the Sith Lord later in the next round, a legitimate earlier recipient's FP/DP spend is incorrectly rejected. Conversely, moving the source earlier can leave a late spend accepted despite the source turn having already started if the cleanup hook was delayed.

## Scoped correction

- Extract pure `isTemptationWindowOpen(entry, combat)`, used by `planTemptationSpend`.
- In creation round, remain active as long as the encounter is the same and the record is active.
- In the following round, use stable `sourceCombatantId` and the actual current `combat.turns` order. The window closes **at** the source turn rather than at its obsolete original turn position.
- When order or current turn cannot be verified, fail closed; do not invent a penalty. The GM's `combatTurn` cleanup continues to expire the persisted record.
- After next round, for another encounter, missing source Combatant or inconsistent current order, reject.
- No new engine, resource store, actor schema, or class-grant path.

## Tests

New pure regression cases simulate a Sith Lord who moves from initiative slot 3 in the activation round to slot 5 in the next round, confirming the target can still legally spend before that source turn. Test at-source and after-source rejection; malformed/missing ordering and encounter mismatch fail closed.

## Still open

1. Multi-client and disconnected/unloaded actor receipt delivery; `Hooks.callAll` is client-local, not a transport.
2. Inventory and convert **reachable** Force Point deduction consumers which bypass ActorEngine typed receipt generation. Prioritize reaction-engine transactional correctness; do not blindly rewrite legacy files.
3. Full Foundry V13 acceptance across live combat, recalculated initiative, scene reload, character ownership and rollback.
4. CI at exact final PR head; the Wave 6U CI green is ancestor evidence only.

Keep PR draft/unmerged until independent source review, exact-head CI and live Foundry testing.
