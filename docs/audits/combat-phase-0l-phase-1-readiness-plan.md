# SWSE Combat Phase 0L - Phase 1 Readiness Plan

Audit-only phase. No runtime files were changed.

## Recommended next implementation phase

Start with Phase 1: Combat Action Routing Contract and Action Economy Hardening.

This should be the first implementation phase because nearly every later issue depends on actions being classified and routed correctly.

## Phase 1 goals

1. Preserve action database intent through the UI mapper.
2. Stop manual/reference actions from acting like broken executable buttons.
3. Route each executable action to the correct handler.
4. Make action economy spending explicit and RAW-safe.
5. Preserve fields needed by later phases, without implementing all later mechanics yet.

## Do not implement in Phase 1

Do not implement these yet:

- Full damage packet model.
- Full grapple rewrite.
- Autofire area damage resolution.
- Burst Fire damage dice.
- Stun/Ion full damage semantics.
- Aid Another pending bonus application.
- Gear consumption.
- Fire/Acid recurring hazards.

Phase 1 should create the road, not drive every vehicle down it.

## Phase 1 work items

### 1. Add or preserve routing fields

Combat action records should be able to carry:

- resolutionMode
- actionCost
- spendAction
- executable
- manualResolution
- gmManaged
- contextTags
- requiredContext
- ruleData
- automationBoundary
- uiHint

If source data already has comparable fields, reuse them. Do not invent a second competing vocabulary unless necessary.

### 2. Update CombatActionsMapper

The mapper should not drop future-critical fields.

It should preserve at least:

- id
- name
- description
- category
- cost
- actionType
- resolutionMode
- executable
- manualResolution
- gmManaged
- spendAction
- ruleData
- requiredContext
- tags

If data is missing routing fields, the mapper can infer a safe default:

- attacks -> attack
- full attack -> fullAttack
- aid another -> aidAnother
- aim/fight defensively/full defense/recover/second wind -> combatState
- force power activation -> reference or forcePowerGateway
- descriptive-only cards -> reference

### 3. Add a routing dispatch table

The sheet should dispatch by resolutionMode:

- attack: open attack configurator or roll attack
- fullAttack: open full attack gateway placeholder or existing executor
- aidAnother: open Aid Another dialog
- skillCheck: roll configured skill
- combatState: call state/action handler
- healRepair: create rule card or handler stub
- manual: create GM-managed chat card
- reference: create rule/reference chat card

### 4. Action economy correction

Audit 0H found possible RAW seams in substitution direction and Full-Round cost. Phase 1 should confirm and fix:

- Standard can be converted downward into Move or Swift.
- Move can be converted downward into Swift.
- Swift cannot become Move or Standard.
- Move cannot become Standard.
- Full-Round consumes Standard, Move, and Swift.
- Full-Round should not leave Swift available.
- Reaction limits should remain separate from turn actions.

### 5. Manual/reference action UX

Manual/reference actions should display as:

- GM adjudicated
- Reference
- Requires target/context
- Not automated yet

They should not show as failed buttons.

### 6. Phase 1 validation fixtures

Run smoke tests for these action cards:

- Attack
- Full Attack
- Aid Another
- Aim
- Fight Defensively
- Full Defense
- Recover
- Second Wind
- Autofire
- Burst Fire
- Disarm
- Grapple
- First Aid
- Activate Force Power
- Ready

Expected Phase 1 result: each card routes honestly, even if some only create a manual/reference chat card.

## Phase 1 deliverable shape

Expected changed files will likely include:

- combat action mapper
- combat tab action handlers
- action economy engine
- possibly combat action data/metadata files
- small CSS/UI changes for status badges
- docs noting routing contract

## Success criteria

Phase 1 is successful when:

- no action card silently loses routing fields
- no manual action pretends to be a complete automated action
- full-round action spending is RAW-safe
- action substitution direction is RAW-safe
- the attack path can receive action context in Phase 2
- future phases can add mechanics without changing every button again
