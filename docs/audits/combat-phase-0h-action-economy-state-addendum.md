# Combat Phase 0H - Action Economy State Addendum

Audit only. No runtime files were changed.

## Why this addendum exists

Many combat states are only correct if the action economy is correct first. Fight Defensively, Total Defense, Aim, Brace, Recover, Second Wind, Charge, reload, weapon mode switching, and full-round actions all depend on action cost enforcement.

This audit found the action economy layer is the most important prerequisite seam before implementing later combat-state fixes.

## RAW baseline from the supplied action rules

Every turn normally grants:

- 1 Standard Action
- 1 Move Action
- 1 Swift Action

Allowed substitutions:

- A Standard Action can be exchanged for a Move Action.
- A Standard Action can be exchanged for a Swift Action.
- A Move Action can be exchanged for a Swift Action.
- A Move Action cannot be exchanged for a Standard Action.
- A Swift Action cannot be exchanged for a Move or Standard Action.
- A Full-Round Action sacrifices Standard, Move, and Swift for that turn.

Reactions and Free Actions have separate rules and should not be confused with the turn's Standard/Move/Swift pools.

## Current code finding

`ActionEngine` is intended to be pure and deterministic, which is the correct design direction. However, the current implementation appears to have the action substitution direction inverted.

Observed examples in `scripts/engine/combat/action/action-engine-v2.js`:

- For a Standard cost, `payStandard()` can consume Move or Swift if Standard is unavailable.
- For a Move cost, `payMove()` can consume Swift if Move is unavailable.
- Full-Round action consumes Standard + Move and leaves Swift available.

Against the supplied rules, this means the engine can allow low-value actions to pay high-value costs. That is backwards.

## Consequences for combat states

### Fight Defensively

RAW cost is Standard Action. If action economy is inverted, the actor may be able to pay for Fight Defensively with Move or Swift in strict mode. That should only happen if a houserule explicitly allows it.

### Full Defense / Total Defense

This should prevent attacks until next turn and consume the appropriate action cost. If action economy is wrong, the actor may be able to combine Total Defense with actions that should not be available.

### Aim

Aim requires two Swift Actions. If Standard/Move can correctly degrade downward to Swift, then a player can aim using their Swift plus exchanged Standard/Move as allowed. If the engine only permits native Swift, Aim will be too strict; if it allows Swift to pay upward, other actions will be too loose.

### Brace

Brace requires two Swift Actions immediately before an autofire-only attack. This needs exactly the same downward action exchange support as Aim.

### Recover

Recover requires three Swift Actions. It can span same or consecutive rounds. The current progress tracker is promising, but each increment must prove one Swift Action was actually spent under the canonical economy.

### Second Wind

Second Wind normally costs a Swift Action unless modified by feat/talent/rule. The math is strong, but eligibility and spend must use the canonical action economy.

### Charge

The current legacy action bar spends Full-Round for Charge. The supplied skeleton says Charge is a Standard Action. The action economy engine must be corrected before Charge can be safely routed.

### Full Attack

Full Attack and similar actions depend on Full-Round consumption. If Full-Round leaves Swift available incorrectly, the system will allow illegal action combinations.

## Audit recommendation

Before Phase 1 implementation, perform a targeted action-economy correction plan:

1. Correct substitution direction.
2. Correct Full-Round consumption.
3. Add explicit tests for Standard -> Move, Standard -> Swift, Move -> Swift, and disallowed reverse substitutions.
4. Route Second Wind, Recover, Fight Defensively, Full Defense, Aim, Brace, Charge, Reload, and Full Attack through the same action spend path.
5. Keep loose/none action-economy settings as GM/table modes, but strict mode should be RAW-correct.

## Suggested test cases for later implementation

| Starting state | Requested cost | Expected strict result |
|---|---|---|
| S/M/W available | Standard | allowed; spend Standard |
| only Move/Swift left | Standard | blocked |
| S/M/W available | Move | allowed; spend Move by default |
| Standard and Swift left, Move spent | Move | allowed by spending Standard as Move |
| only Swift left | Move | blocked |
| S/M/W available | Swift | allowed; spend Swift by default |
| Standard+Move left, Swift spent | Swift | allowed by spending Move or Standard downward |
| S/M/W available | two Swift | allowed by spending Swift plus Move or Standard downward |
| S/M/W available | three Swift | allowed by spending all three as Swift actions |
| S/M/W available | Full-Round | allowed; spend Standard, Move, Swift |
| Swift already spent | Full-Round | blocked unless a specific rule says otherwise |

