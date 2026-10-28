# Equipment — WP3-B / G18 / G36 + draw vertical slice — integration checkpoint

Branch stacked on `audit/equipment-ecosystem-e0-e1` (f455522). Not for `main`. Offline evidence only; no live-Foundry, exactly-once or CAS claim.

## What now works (GM-local)

| Step | Path | Status |
|---|---|---|
| Draw / ready from the sheet | `toggle-weapon-readiness` → CHOICE_REQUIRED → hands/grip dialog (`weapon-posture-choice-dialog.js`) → `setWeaponReadied(..., {appendageIds, grip, requestId})` → coordinator | works offline; same request id across the choice |
| Draw + ignite lightsaber | `draw-and-ignite-lightsaber` → same dialog → `drawAndActivateLightsaber(..., choice)` | works offline |
| Stow | `toggle-weapon-readiness` on a held weapon → `stow` intent | works offline |
| Attack / ammo / reload | existing WP5 gates read the coordinator's verified READIED state | unchanged; offline tests pass |
| G18 request identity | `equipment-request-identity.js`: id fixed at intent (before planning), kept across retries of unresolved outcomes, released on settled ones | 5 checks |
| G36 reconciliation | `reconcileEquipmentTransaction` / `InventoryEngine.reconcileWeaponRequest` | 6 checks |
| Diagnostics | `logEquipmentEvent` → `SWSELogger.debug` only when `debugMode` is on (plan, execute, reconcile, route) | off by default |

### G36 decisions the GM may take (fresh evidence decides what is offered)

| Observed | Offered |
|---|---|
| NOT_APPLIED | `close-not-applied` (a recorded spend stays; never refunded) |
| APPLIED, spend present / not required | `finalize` |
| APPLIED, spend absent (required) | `compensate`, `finalize-without-spend` (spend recorded as `waived`; nothing paid) |
| APPLIED spend unknown, PARTIAL, INDETERMINATE | `compensate` (conditional, field-scoped; concurrent values never overwritten) |

Review without a resolution writes nothing. No replay, no `spendAction`, no `undoLast`. Each decision appends a `gm-reconcile` note (who, when, phase before, classification, spend, per-item states, compensation paths, optional GM note); the original entry is kept. A resolved request id is released so the next click starts a new action.

## Implemented but disabled (WP3-B, pending Gate 1)

- `equipment-player-request-route.js`: envelope without identity; checks route enabled → verified sender mechanism → GM → executor lease → sender exists → actor exists → sender owns actor → recomputed intent digest → coordinator with lease fence + executor/epoch in the journal.
- `equipment-request-transport.js`: chat-message adapter (author must equal the creation hook user). `installEquipmentRequestTransport` refuses unless enabled and `chat-message-author-v13` is verified. Nothing in the system calls it.
- `equipment-executor-lease.js`: GM-only, epoch-fenced, write-then-read-back. Advisory, **not** compare-and-swap.
- `VERIFIED_IDENTITY_MECHANISMS` is an empty frozen array; a static test fails if any runtime module imports the route/transport.

Players therefore still cannot draw/stow in a GM-authoritative way; only a GM-local client can.

## Remaining runtime certification

1. Gate 1 (PR #1080 probe) in a live V13 world: is a forged ChatMessage author refused? Only then add `chat-message-author-v13` to the verified list and wire install behind a setting.
2. Live check of the dialog in the V2 sheet (layout, checkbox/radio submission through `SWSEDialogV2`).
3. Live draw → attack → ammo → reload → stow in combat with real `ActionEconomyConsumption` markers.
4. G36: a GM-facing launcher (none yet; callable as `InventoryEngine.reconcileWeaponRequest`).
5. Lease hand-over between two GM clients (expected overlap window; observe the epoch in the journal).

Not touched: EQ-001..EQ-004, Modification V2, migrations, transaction/credit authorities, `main`.
