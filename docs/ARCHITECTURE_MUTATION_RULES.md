# Allowed Mutation Paths

These rules prevent silent desync (derived values out of sync with stored data).

> Legacy v1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

## Invariant

All actor-affecting updates MUST go through ActorEngine or actor APIs that call ActorEngine.

## Allowed

- `ActorEngine.updateActor(actor, data, options)`
- `ActorEngine.updateOwnedItems(actor, updates, options)`
- `actor.updateOwnedItem(item, changes, options)` (must call ActorEngine internally)
- Actor gameplay APIs (`useAction`, `useItem`, `applyDamage`, `equipItem`, ...)

## Forbidden

- `actor.update(...)`
- `item.update(...)` when the item is owned by an actor
- `actor.updateEmbeddedDocuments('Item', ...)`
- `actor.items.update(...)`
- `ChatMessage.create(...)` from sheets
- `roll.toMessage(...)` without `{ create: true }`

## Grep targets (enforcement)

Run these locally:

- `grep -R "\\bactor\\.update\\(" scripts/`
- `grep -R "updateEmbeddedDocuments\\(\"Item\"" scripts/`
- `grep -R "\\bitem\\.update\\(" scripts/`
- `grep -R "ChatMessage\\.create" scripts/`
- `grep -R "\\broll\\.toMessage\\(" scripts/`

CI runs `npm run check:mutations`.

## Exceptions

Only allowed inside clearly-scoped tools:

- `scripts/migration/` (versioned migrations)
- `tools/` (explicit repair utilities)

Even then, prefer ActorEngine unless you have a strong reason.
