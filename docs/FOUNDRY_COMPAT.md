# Foundry Compatibility Notes (v13 → v16)

This system is built for **Foundry v13+** and is designed to stay stable through v16.

## ApplicationV2

All primary surfaces use ApplicationV2 (Foundry v13). FormApplication/V1 surfaces are considered deprecated.

- Actor sheets: `scripts/sheets/v2/*`
- Item sheets: `scripts/items/swse-item-sheet.js` (ItemSheetV2)
- Upgrade app: `scripts/apps/upgrade-app-v2.js` (ApplicationV2)

## Chat messages

Foundry requires **explicit message creation**.

- ✅ `roll.toMessage(data, { create: true })`
- ❌ `roll.toMessage(data)` (deprecated)

Centralized helper:

- `scripts/chat/swse-chat.js`

## Compendiums

Locked compendiums cannot be mutated at runtime. System initialization must not delete or rewrite locked pack content.

## Sheet retirement policy

Legacy (v1) actor sheets were retired in Phase 3.3.

- v2 sheets are the only registered actor sheets.
- Legacy sheet classes remain as **stubs** for compatibility only.
