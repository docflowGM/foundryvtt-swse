# Execution Pipeline

Authoritative reference for how gameplay execution happens in SWSE v2.

> Legacy v1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

## The pipeline

```
UI (v2 sheet) -> Actor API -> ActorEngine -> Existing engine(s) -> SWSEChat
```

- UI: emits intent only.
- Actor API: resolves intent; rules authority.
- ActorEngine: applies mutations atomically.
- Existing engine(s): do rolls/effects using proven mechanics.
- SWSEChat: posts messages (Foundry v13+ compliant).

## Sheet rules

Sheets/templates may:
- read raw inputs (`actor.system.*`) and derived (`actor.system.derived.*`)
- call actor intent APIs

Sheets/templates may NOT:
- compute totals or rules
- call `actor.update(...)`
- call `item.update(...)` for owned items
- call `actor.updateEmbeddedDocuments('Item', ...)`
- call `ChatMessage.create(...)`

## Actor API surface

Preferred execution entrypoints:
- `actor.useAction(actionId, options)`
- `actor.useItem(item, options)`
- `actor.applyDamage(amount, options)` / `actor.applyHealing(amount, options)`
- `actor.equipItem(item, options)` / `actor.unequipItem(item)`
- `actor.activateItem(item, options)` / `actor.deactivateItem(item, options)`

If you need new behavior, add/extend an actor API (not a sheet handler).

## Resource feedback (ammo / charges / points)

- UI renders resource ticks from **derived** only.
- Spending resources is an engine concern and must update via ActorEngine:
  - `ActorEngine.updateOwnedItems(actor, updates)`
  - or `actor.updateOwnedItem(item, changes)`

Never call `item.update(...)` directly on owned items.

## Examples

### Use action (Actions panel)

1) Sheet button click -> `actor.useAction(actionId)`
2) Actor resolves `actor.system.derived.actions.map[actionId]`
3) Actor routes by `execute.kind` (item, weapon, power, etc.)
4) Existing engine performs roll/effects
5) Output posted via `SWSEChat`

### Attack (weapon)

Same as above, but `execute.kind` points at an owned weapon item.

