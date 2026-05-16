# ActorEffectsAggregator Implementation Plan

**Status**: Phase 0 (audit) complete. Ready for Phase 1 (foundation patch).

**Key Principle**: Preserve the current `CurrentConditionResolver` UI contract. Evolve, don't replace.

---

## Phase 0: Audit ✅ Complete

**Seam identified**: `CurrentConditionResolver.build(actor)` → `healthPanel.currentConditions.cards`

**Live path confirmed**:
```
CurrentConditionResolver.build(actor)
  ↓
PanelContextBuilder.buildHealthPanel()
  ↓
currentConditions object
  ↓
current-conditions-panel.hbs renders
```

**Current collection order**:
1. Condition track
2. Rage notes
3. Foundry actor.effects
4. actor.system.activeEffects
5. item abilityMeta.conditionNotes
6. item rule notes
7. resource actions

**Return shape (do not change)**:
```js
{
  cards: [],
  notes: [],
  hasCards: boolean,
  hasWarnings: boolean,
  activeEffectCount: number
}
```

**Key findings**:
- Poison data already rich in `actor.flags.swse.activePoisons`, `actor.system.activePoisons`, weapon coatings
- Force metadata currently in `flags["foundryvtt-swse"].forcePowerEffect` (canonical namespace)
- Action UI only supports one hardcoded pattern (`apply-temp-defense`); avoid multi-action buttons until Phase 6
- ModifierEngine is math authority; aggregator reads breakdowns for display only
- NPC/Vehicle support deferred; Phase 1 targets Character v2 and Droid v2

---

## Phase 1: Foundation Shell (Patch Drop 1)
**Goal**: Rename the architectural center without changing behavior.

### What to add:
- `scripts/engine/effects/actor-effects-aggregator.js` — move current resolver logic here
- `scripts/engine/effects/effect-card-factory.js` — card normalization helper

### What to change:
- `scripts/engine/effects/current-condition-resolver.js` becomes a wrapper:
```js
import { ActorEffectsAggregator } from "./actor-effects-aggregator.js";

export class CurrentConditionResolver {
  static build(actor, options = {}) {
    return ActorEffectsAggregator.collect(actor, options);
  }
}
```

### What NOT to do:
- Do not alter templates
- Do not add poison/weapon/immunity cards
- Do not add action buttons
- Do not change the return shape
- Do not move rules logic into the aggregator

### Go/No-Go Checks:
**Static**:
- [ ] `PanelContextBuilder` still imports `CurrentConditionResolver`
- [ ] Return shape unchanged: `{ cards, notes, hasCards, hasWarnings, activeEffectCount }`
- [ ] No console errors
- [ ] No template modifications

**Runtime**:
- [ ] Condition track card appears
- [ ] Rage card appears
- [ ] Normal ActiveEffect card appears
- [ ] Temporary defense button works
- [ ] Character v2 sheet loads without errors
- [ ] Droid v2 sheet loads without errors

**Decision**: ✅ **Go for Phase 1** — This is the safety phase. If anything breaks, the bug is isolated to the wrapper.

---

## Phase 2: Adapter Extraction (Patch Drop 2)
**Goal**: Make the code easier to extend without adding new behavior yet.

### Create adapters for existing behavior:
```
adapters/
  condition-track-adapter.js
  rage-effect-adapter.js
  active-effect-adapter.js
  system-active-effect-adapter.js
  item-note-adapter.js
  resource-action-adapter.js
```

### Aggregator becomes:
```js
const adapters = [
  ConditionTrackAdapter,
  RageEffectAdapter,
  ActiveEffectAdapter,
  SystemActiveEffectAdapter,
  ItemNoteAdapter,
  ResourceActionAdapter
];

const cards = adapters.flatMap(adapter => adapter.collect(actor, context));
return { cards, notes: cards, hasCards: cards.length > 0, ... };
```

### Go/No-Go Checks:
- [ ] Same panel output as Phase 1
- [ ] Each adapter returns normalized card shape
- [ ] No new features visible
- [ ] All 6 adapters are <200 lines each
- [ ] Sorting/filtering/dedupe logic lives in aggregator, not adapters

**Decision**: ✅ **Go for Phase 2** — The code is now modular, ready for real extensions.

---

## Phase 3: Poison Visibility (Patch Drop 3)
**Goal**: First player-facing win. Show poison state clearly, no action buttons yet.

### Create:
- `adapters/poison-effect-adapter.js`

### Read from:
- `actor.flags.swse.activePoisons`
- `actor.system.activePoisons`
- `actor.flags.swse.conditionTrack.poisonSources`
- PoisonRegistry definitions

### Card should show:
- Poison name
- Delivery method
- Attack vs defense
- Damage or CT effect
- Recurrence timing
- Treatment DC
- Whether exposure is ongoing
- Sith Poison failure count if present

**Example output**:
```
Dioxis
Danger · Poison
Recurs at start of turn until treated.
Attack: +10 vs Fortitude
Damage: 4d6 and persistent -1 CT
Treatment: Treat Injury DC 23 with medical kit
```

### Go/No-Go Checks:
- [ ] Poisoned actor gets visible poison card
- [ ] Unpoisoned actor does not
- [ ] Bad/missing poison data fails softly with fallback
- [ ] Existing ActiveEffects still appear
- [ ] No panel mutation from display

**Decision**: ✅ **Go for Phase 3** — First visible improvement. Poisoned actors now transparent.

---

## Phase 4: Weapon & Recurring Visibility (Patch Drop 4)
**Goal**: Show "armed" and "pending" effects before they become actor conditions.

### Create:
- `adapters/weapon-state-adapter.js`
- `adapters/recurring-damage-adapter.js`

### Weapon cards show:
- Coated with [poison]
- Vile Weapon intrinsic poison
- Jagged Weapon pending damage
- Stun/ion mode if active
- Temporary buffs

### Recurring damage cards show:
- Read `actor.flags.swse.pendingRecurringDamage`
- Generic enough for bleed, fire, acid, radiation later

### Go/No-Go Checks:
- [ ] Coated weapon shows state card
- [ ] Jagged/pending damage shows queued card
- [ ] Normal equipped weapons don't flood panel
- [ ] Recurring damage is visible but still resolved by owning engine

**Decision**: ✅ **Go for Phase 4** — Second visible improvement. Tactical readiness clearer.

---

## Phase 5: Immunity/Resistance Visibility (Patch Drop 5)
**Goal**: Show protections that matter tactically.

### Create:
- `adapters/immunity-resistance-adapter.js`

### Read:
- `actor.system.immunities`
- `actor.flags.swse.speciesImmunities`
- Equipment-granted immunities
- ActiveEffect-granted resistance
- Poison-specific immunity state

### Show (important only):
- Poison Immunity
- Force Immunity
- Droid immunities
- Vacuum/radiation/atmospheric immunity
- Breath mask protection
- Energy resistance
- Shield rating
- Damage reduction

### Go/No-Go Checks:
- [ ] Droid/poison/Force immunities are visible
- [ ] Protection cards are positive severity
- [ ] Passive clutter is avoided
- [ ] Resistance from ActiveEffects displays if metadata exists

**Decision**: ✅ **Go for Phase 5** — Third visible improvement. Defenses transparent.

---

## Phase 6: Effect Metadata Standard (Patch Drop 6)
**Goal**: Stop future cards from being vague. Standardize how engines write effect state.

### Create:
- `scripts/engine/effects/effect-state-flags.js` — helper for reading/writing metadata

### Standard metadata:
```js
flags.swse.effectState = {
  family: "poison",              // poison, force, rage, species, hazard
  type: "debuff",                // debuff, buff, hazard, resource, note
  severity: "danger",            // danger, warning, info, success
  sourceType: "poison",
  sourceName: "Dioxis",
  summary: "Recurring poison hazard.",
  removable: true,
  removableBy: "Treat Injury DC 23"
}
```

**Note**: Read both namespaces during transition:
```js
flags["foundryvtt-swse"].effectState  // canonical for new effects
flags.swse.effectState                // legacy fallback
flags["foundryvtt-swse"].forcePowerEffect  // existing Force metadata
```

### Update these engines gradually:
- ForcePowerEffectsEngine
- PoisonEngine
- RageEngine
- SpeciesActivatedAbilityEngine
- CombatEngine / weapon effect creators

### Go/No-Go Checks:
- [ ] Old effects still display correctly
- [ ] New effects display with better labels
- [ ] Force powers no longer look generic
- [ ] No engine knows about sheet template
- [ ] Aggregator reads metadata first, falls back to parsing

**Decision**: ✅ **Go for Phase 6** — Foundation for better UX without breaking old effects.

---

## Phase 7: Panel Actions (Patch Drop 7)
**Goal**: Add buttons after display cards are stable and trustworthy.

### Safe action set (Phase 7 only):
- `remove-active-effect`
- `treat-poison`
- `clear-poison-exposure`
- `neutralize-poison-gm`
- `remove-recurring-damage-gm`
- `clear-weapon-coating`
- `open-source-item`

### Important rule:
**The aggregator never mutates actors directly.**
- Treat Poison calls `PoisonEngine`
- Clear exposure calls `PoisonEngine`
- Remove ActiveEffect deletes the Foundry ActiveEffect
- GM actions are hidden from players

### Extend template later:
Current template supports `condition.action`. Later expand to `condition.actions = []`.

### Go/No-Go Checks:
- [ ] Treat Poison calls engine, not aggregator logic
- [ ] Remove effect deletes actual Foundry ActiveEffect
- [ ] GM-only actions hidden for players
- [ ] Panel refreshes after action success
- [ ] No partial rules logic in UI

**Decision**: ✅ **Go for Phase 7** — Actions only after data reliability proven.

---

## Phase 8: Feats/Talents/Resources (Patch Drop 8)
**Goal**: Show useful tactical feat/talent state without duplicating character sheet.

### Create:
- `adapters/feat-talent-effect-adapter.js`
- `adapters/resource-use-adapter.js`

### Show by default:
- Active modes
- Temporary resource options
- Reaction windows
- Once-per-encounter states
- GM-enforced notes
- `displayAsCondition` rules
- `conditionNotes`
- Poison/stun/Force modifiers relevant to current effect

### Do NOT show by default:
- Every proficiency
- Every static +1 bonus
- Every passive feat
- Every always-on species trait
- Every talent description

### Example:
```
Vicious Poison
Info · Talent
Applies +2 to active poison attack rolls.
Currently relevant: Dioxis
```

### Go/No-Go Checks:
- [ ] Malkite talents appear when poison active
- [ ] Natural Healing in poison treatment context
- [ ] Passive feats don't flood default view
- [ ] Resource actions remain clickable
- [ ] "Show Passive Sources" toggle groundwork in place

**Decision**: ✅ **Go for Phase 8** — Feats/talents only with tactical context.

---

## Phase 9: Force/Species Polish (Patch Drop 9)
**Goal**: Use metadata standard to make active Force and species states readable.

### Create/expand:
- `adapters/force-power-effect-adapter.js`
- `adapters/species-effect-adapter.js`
- `adapters/stun-effect-adapter.js` (foundation, not full automation)

### Force should show:
- Power name
- Roll total
- DC tier achieved
- Duration
- Sustained/expended state
- Target affected

### Species should show:
- Shapeshift active
- Energy Surge active/aftereffect
- Rage active
- Force Blind / Force Immunity warnings
- Primitive/suppressed proficiency notes
- Important natural weapon riders

### Stun foundation (display only, defer automation):
- Dazed/Stunned/Helpless/Immobilized state
- Weapon set to stun
- Ion/stun mode armed
- **Defer**: stun damage halving, CT reduction, talent mods

### Go/No-Go Checks:
- [ ] Force Shield reads like "Force Shield: SR X"
- [ ] Energy Resistance shows DR
- [ ] Shapeshift shows duration
- [ ] Rage remains visible
- [ ] Permanent species text stays out unless tactical
- [ ] Stun states are clear but not incomplete

**Decision**: ✅ **Go for Phase 9** — Polish Phase. Force/species/stun now readable.

---

## Phase 10: Refresh API (Patch Drop 10)
**Goal**: Avoid stale sheet state. Engines notify aggregator when state changes.

### Expose public API:
```js
game.swse.Effects.collect(actor)
game.swse.Effects.notifyChanged(actor)
```

### Engines call `notifyChanged()` after:
- Poison applied
- Poison treated
- Poison recurrence resolved
- Weapon coated
- Weapon coating consumed
- ActiveEffect added/removed
- Condition track changed
- Recurring damage queued/cleared

### Implementation:
```js
export class Effects {
  static collect(actor) {
    return ActorEffectsAggregator.collect(actor);
  }

  static notifyChanged(actor) {
    // Emit hook or trigger panel refresh
    Hooks.callAll("swse:effectsChanged", actor);
  }
}
```

### Go/No-Go Checks:
- [ ] Treating poison updates panel
- [ ] Removing ActiveEffect updates panel
- [ ] Coating weapon updates panel
- [ ] CT movement updates panel
- [ ] Manual refresh not required
- [ ] Hooks are async-safe

**Decision**: ✅ **Go for Phase 10** — Final patch. Refresh is automatic and reliable.

---

## What NOT to Do (Risk Mitigation)

### ❌ Do not:
- Start with a big UI redesign
- Add feat/talent passive cards before poison/weapon state works
- Make the aggregator calculate poison, stun, damage, Force outcomes
- Parse every ActiveEffect change key as rules truth if an engine can write metadata
- Show every passive source by default
- Add stun automation in Phase 9 (foundation only)
- Support NPC/Vehicle sheets in Phase 1

### ✅ Do instead:
- Build small patches that produce visible wins early
- Keep the current health panel contract intact
- Make adapters read-only display adapters
- Leave rule calculations to engines
- Write metadata from engines when possible
- Gate passive sources behind an opt-in toggle
- Treat Phase 9 stun as "show state, not enforce rules"
- Defer NPC/Vehicle to a separate scope

---

## Summary: Patch-by-Patch Timeline

| Patch | Focus | Visible? | Risk |
|-------|-------|----------|------|
| 1 | Foundation shell | No | Low |
| 2 | Adapter extraction | No | Low |
| 3 | Poison visibility | **Yes** | Low |
| 4 | Weapon/recurring/immunity | **Yes** | Low |
| 5 | Metadata standard | Incremental | Medium |
| 6 | Panel actions | **Yes** | Medium |
| 7 | Feats/talents/resources | **Yes** | Medium |
| 8 | Force/species/stun polish | **Yes** | Low |
| 9 | Refresh API | No (internal) | Low |

**Total estimated effort**: Phases 1–2 are small setup. Phases 3–4 are quick wins. Phase 5–7 are meat. Phase 8–9 are polish.

---

## Next Step: Phase 1 (Foundation Patch)

**What to do**:
1. Create `scripts/engine/effects/actor-effects-aggregator.js` with current resolver logic
2. Create `scripts/engine/effects/effect-card-factory.js` for card normalization
3. Update `current-condition-resolver.js` to call `ActorEffectsAggregator.collect()`
4. Run all go/no-go checks
5. Commit with message: `feat: create ActorEffectsAggregator foundation (Phase 1)`

**Acceptance**: Character and Droid v2 sheets load, no new console errors, all current cards appear unchanged.

---

**Plan status**: Ready to execute. Proceeding with Phase 1 upon confirmation.
