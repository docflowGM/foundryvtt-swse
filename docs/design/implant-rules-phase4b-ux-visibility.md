# Implant Rules Phase 4B: UX and Visibility

Phase 4A made the implant drawbacks real rules:

- active implant without Implant Training: -2 Will Defense
- active implant without Implant Training: +1 extra Condition Track step when worsened
- Implant Training suppresses both drawbacks

Phase 4B makes that state visible and GM-editable without adding a Cybernetic Surgery workflow.

## Scope

This phase adds presentation and tagging support only:

- Item editor controls for explicit implant tagging.
- Installed/active controls so an implant can become rules-active.
- An active-by-ownership escape hatch for implants that should count while owned.
- Inventory badges for implant and active implant items.
- Defense panel summary and Will Defense breakdown line.
- Audit coverage for the UX wiring.

## Deliberate boundary

Generic cybernetic prostheses are not automatically treated as implants. The GM must explicitly tag an item as an implant, or use a category/tag/template that the central `ImplantRules` helper recognizes as implant-specific.

Cybernetic Surgery remains a GM/player procedure reference. It does not install items, spend credits, alter Treat Injury DCs, or auto-toggle implant rules in this phase.

## Item sheet fields

The item editor now exposes:

- `system.implantRules.countAsImplant`
- `system.installed`
- `system.active`
- `system.implantRules.activeByOwnership`
- `system.implantRules.notes`

An item counts as rules-active when `ImplantRules.isActiveImplantItem(item)` returns true. The current active states include equipped, installed, integrated, active, or active-by-ownership.

## Actor sheet visibility

The inventory row shows implant badges:

- `IMP` for an item tagged as an implant but not currently rules-active.
- `IMP!` for a rules-active implant.

The Defense panel shows a summary when the actor has an active implant. The Will Defense expanded breakdown includes an Implant Penalty line when the penalty applies.

## Why this shape

This keeps rules math centralized in `scripts/engine/implants/ImplantRules.js` while giving the GM enough UI to mark edge cases correctly. It avoids broad text-matching against all cybernetics and keeps the larger surgery/procedure workflow out of passive sheet math.
