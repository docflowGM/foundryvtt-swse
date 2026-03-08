# Action Economy Architecture

Complete action economy system for SWSE Foundry VTT.

## Overview

A **five-layer, zero-contamination** system for managing SWSE turn action economy:

```
UI Layer (Buttons, Sheets, Panels)
    ↓
ActionEconomyBindings (Event Handlers)
    ↓
ActionPolicyController (Enforcement)
    ↓
ActionEconomyPersistence (Storage)
    ↓
ActionEngine (Math)
```

Each layer has a single responsibility. No layer mutates outside its scope.

---

## Layer 1: ActionEngine (Pure Math)

**File:** `scripts/engine/combat/action/action-engine-v2.js`

**Responsibility:** Calculate turn action economy deterministically.

**API:**
```javascript
// Initialize fresh turn
ActionEngine.startTurn()
// → { remaining: {standard, move, swift}, degraded: {...}, fullRoundUsed }

// Preview without changing state (for UI hover)
ActionEngine.previewConsume(turnState, cost)
// → { allowed, turnState, violations, consumed }

// Consume and return new state
ActionEngine.consume(turnState, cost)
// → { allowed, turnState, violations, consumed }

// Map state to visual colors
ActionEngine.getVisualState(turnState)
// → { standard: "available"|"degraded"|"used", ... }

// Get human-readable breakdown
ActionEngine.getTooltipBreakdown(turnState)
// → ["Standard action available", ...]
```

**Cost Format:**
```javascript
{ standard: 1 }             // 1 standard action
{ move: 1 }                 // 1 move action
{ swift: 1, swift: 2 }      // 2 swift actions
{ fullRound: true }         // Full-round attack
{ standard: 1, swift: 1 }   // Composite actions
```

**Degradation Hierarchy:**
```
Standard: Standard → Move → Swift
Move:     Move → Swift
Swift:    Terminal (no degradation)
```

**State Model:**
```javascript
{
  remaining: {
    standard: 1,  // Unused pool
    move: 1,
    swift: 1
  },
  degraded: {
    standard: 0,  // Obtained via degradation
    move: 0,
    swift: 0
  },
  fullRoundUsed: false
}
```

---

## Layer 2: ActionPolicyController (Enforcement)

**File:** `scripts/engine/combat/action/action-policy-controller.js`

**Responsibility:** Decide what to do with engine results based on GM policy.

**Three Modes:**
- `STRICT`: Block illegal actions, grey buttons
- `LOOSE`: Allow but warn GM (recommended)
- `NONE`: Track only, no enforcement

**API:**
```javascript
ActionPolicyController.handle({
  actor,           // Actor performing action
  result,          // From ActionEngine.consume()
  actionName,      // Display name ("attack", etc.)
  gmOverride       // Shift+Click for GM bypass
})
// → { permitted, uiState: { disable, tooltip } }
```

**Returns:**
```javascript
{
  permitted: true,  // Should UI proceed?
  uiState: {
    disable: false,           // Should button be greyed?
    tooltip: null             // What message to show?
  }
}
```

**Sentinel Integration:**
- All violations reported to Sentinel
- Includes combatId for context
- Rate-limited (GM only)
- Severity: "WARN" | "ERROR" | "GM_OVERRIDE"

---

## Layer 3: ActionEconomyPersistence (Storage)

**File:** `scripts/engine/combat/action/action-economy-persistence.js`

**Responsibility:** Store and retrieve turn state durably.

**Storage Location:**
```javascript
actor.flags.swse.actionEconomy = {
  combatId: "combat-abc123",
  turnState: {...},
  timestamp: 1234567890
}
```

**API:**
```javascript
// Get turn state (or fresh if mismatch)
ActionEconomyPersistence.getTurnState(actor, combatId)
// → { remaining, degraded, fullRoundUsed }

// Save new state
await ActionEconomyPersistence.setTurnState(actor, combatId, turnState)

// Reset to fresh turn
await ActionEconomyPersistence.resetTurnState(actor, combatId)

// Clear all flags for a combat (on delete)
await ActionEconomyPersistence.clearCombatTurnStates(combat)

// Update after action consumption
await ActionEconomyPersistence.commitConsumption(actor, combatId, consumeResult)
```

**Lifecycle:**

| Event | Action |
|-------|--------|
| combatant.turn | Reset to fresh state |
| combat.delete | Clear all flags |
| Action execution | Call commitConsumption() |
| Sheet rerender | Data persists in flags |

---

## Layer 4: ActionEconomyBindings (UI Integration)

**File:** `scripts/ui/combat/action-economy-bindings.js`

**Responsibility:** Wire ActionEngine to buttons and UI components.

**API:**
```javascript
// Setup hover preview
ActionEconomyBindings.setupPreview(button, actor, cost, actionName)

// Setup click enforcement
ActionEconomyBindings.setupExecution(
  button, actor, cost, callback, { actionName }
)

// Batch setup all attack buttons
ActionEconomyBindings.setupAttackButtons(root, actor)

// Get visual state for buttons
ActionEconomyBindings.getAvailabilityIndicator(actor, cost)
// → { className, disabled, title }

// Generate HTML badge
ActionEconomyBindings.createStatusBadge(actor)
// → HTML string with 3 colored badges
```

**Event Flow:**

**On Hover:**
1. Get turn state from persistence
2. Preview consume (non-destructive)
3. Check policy
4. Update button visual state

**On Click:**
1. Get turn state
2. Consume (calculates degradation)
3. Check policy (including gmOverride from Shift)
4. If permitted, execute callback
5. Call commitConsumption() to persist

---

## Layer 5: UI Components (Presentation)

**Files:**
- `styles/ui/combat-action-economy.css` - Styles
- `templates/ui/combat/action-economy-display.hbs` - Small badge
- `templates/ui/combat/combat-action-economy-panel.hbs` - Full panel
- `scripts/ui/combat/action-economy-integration.js` - Integration guide

**Colors:**
- 🟢 Green (`#4caf50`): Available
- 🟠 Orange (`#ff9800`): Degraded
- 🔴 Red (`#666`): Used

**Templates:**

**Small Badge:**
```hbs
{{> combat/action-economy-display actionState=state breakdown=breakdown}}
```

**Full Panel:**
```hbs
{{> combat/combat-action-economy-panel
  actor=actor
  actionState=state
  breakdown=breakdown
  enforcementMode=mode
}}
```

---

## Integration Examples

### Character Sheet

```javascript
import { ActionEconomyIntegration } from ".../action-economy-integration.js";

export class SWSECharacterSheet extends BaseSWSEAppV2 {
  async _prepareContext(options) {
    const context = super._prepareContext(options);
    context.actionEconomy = ActionEconomyIntegration.getContextData(this.actor);
    return context;
  }

  async _onRender(context, options) {
    super._onRender(context, options);
    ActionEconomyIntegration.setupWeaponAttacks(this.element, this.actor);
  }
}
```

**Template:**
```hbs
<section class="combat-economy">
  {{> combat/action-economy-display
    actionState=actionEconomy.state
    breakdown=actionEconomy.breakdown
  }}
</section>
```

### Combat Tracker

```javascript
export class SWSECombatTracker extends CombatTracker {
  async _prepareData() {
    const data = super._prepareData();

    if (game.combat?.current?.actor) {
      const integration = ActionEconomyIntegration.getContextData(
        game.combat.current.actor
      );
      data.actionEconomy = integration;
    }

    return data;
  }
}
```

### Custom Action Button

```javascript
const button = html.find('[data-action="special"]')[0];
ActionEconomyIntegration.setupActionButton(
  button,
  actor,
  { standard: 1, swift: 1 },  // cost
  'special-ability',           // name
  async () => {
    // Execute ability
    return true;
  }
);
```

---

## Governance Rules

### ActionEngine
- ❌ Never mutate input state
- ❌ Never call actor.update()
- ❌ Never reference Foundry
- ✅ Pure mathematical calculation
- ✅ Deterministic (same input = same output)

### ActionPolicyController
- ❌ Never mutate actor/world
- ❌ Never call actor.update()
- ❌ Never render UI directly
- ✅ Read ActionEngine results
- ✅ Return decisions (permitted, uiState)

### ActionEconomyPersistence
- ✅ Call actor.setFlag() / getFlag()
- ✅ Call ActionEconomyPersistence hooks
- ❌ No game logic
- ❌ No mutations outside flags

### ActionEconomyBindings
- ✅ Wire events to methods
- ✅ Update DOM classes
- ✅ Call ActionEconomyPersistence.commitConsumption()
- ❌ No game logic in handlers
- ❌ No actor.update() calls

### UI (Templates/Styles)
- ✅ Display data from context
- ✅ Use prepared context data
- ❌ No game logic
- ❌ No mutations

---

## Settings

**World Setting:** `game.settings.get('swse', 'actionEconomyMode')`

**File:** `scripts/engine/combat/action/action-economy-settings.js`

**Options:**
- `strict` - Block illegal actions
- `loose` - Warn GM (default, recommended)
- `none` - Track only

**Changeable at runtime:** Yes

---

## Testing Edge Cases (Verified)

✅ Standard degradation chain (Standard → Move → Swift)
✅ Full-round blocks after degradation
✅ Multi-swift consumption (swift: 2+)
✅ Degradation tracking (no double-counts)
✅ GM override (Shift+Click in STRICT)
✅ Client sync (via actor flags)
✅ State reset on combatant.turn
✅ State cleanup on combat.delete

---

## Error Handling

**Silent Failures (Log Only):**
- getTurnState() on missing combatId → Returns fresh state
- setTurnState() on missing actor → Returns silently

**Warnings (Console + Sentinel):**
- Policy violations in LOOSE mode
- GM override in STRICT mode

**Blocks (UI Only):**
- STRICT mode prevents action execution
- No data mutations on error

---

## Performance

**Complexity:**
- ActionEngine.consume() - O(1) with bounded loops
- Persistence.getTurnState() - O(1) flag access
- Policy.handle() - O(1)
- Bindings.setupExecution() - One-time DOM attach

**Caching:**
- Turn state cached in actor flags (automatic sync)
- No re-calculation unless consumed

**Network:**
- Flag updates sync automatically across clients
- Minimal network traffic (single flag update per action)

---

## Future Extensions

Without breaking architecture:
- ✅ Add bonus actions (swift: -1)
- ✅ Add ability-specific costs
- ✅ Add rest mechanics
- ✅ Add fatigue/damage effects on economy
- ✅ Add homebrew action types
- ✅ Add logging/audit trail
- ✅ Add undo/redo (flag snapshots)

---

## Troubleshooting

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| State resets on rerender | Stored in memory | Already fixed (uses flags) |
| Clients diverge | No sync mechanism | Already fixed (actor flags auto-sync) |
| Degradation double-counts | Degrade logic error | Already fixed |
| Full-round with degradation allowed | Check logic | Already verified |
| GM can't override in STRICT | No gmOverride param | Already implemented (Shift+Click) |
| Violations bleed across combats | Bad aggregateKey | Already fixed (includes combatId) |

---

## Related Systems

- **SkillEnforcementEngine** - DC/difficulty validation
- **WeaponsEngine** - Damage calculation
- **CombatRulesRegistry** - Rule definitions
- **SentinelEngine** - Monitoring & compliance
- **CombatEngine** (future) - Orchestration

---

## References

- `CLAUDE.md` - System governance
- `SWSE V2 Architecture` - Core design patterns
- Foundry V13 API - Hooks, flags, actors
