# UI Button Binding Pattern: ActionEngine Integration

## Overview

The `ActionEconomyBindings` helper class provides reusable patterns for integrating ActionEngine into character sheet UI buttons. It handles:
- Preview on hover (shows if action is available)
- Execution check on click (prevents blocked actions)
- Policy enforcement (STRICT/LOOSE/NONE modes)
- Visual feedback (greying, tooltips, badges)
- GM override (Shift+Click in STRICT mode)

---

## Quick Start

### Minimal Setup

```javascript
// In character sheet class

import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";

activateListeners(html) {
  super.activateListeners(html);

  // Setup all attack buttons
  ActionEconomyBindings.setupAttackButtons(html, this.actor);
}
```

That's it. Buttons will now:
- Show preview on hover
- Check action economy on click
- Block if action unavailable (STRICT)
- Warn if action violates economy (LOOSE)
- Allow override with Shift+Click

---

## Detailed Usage

### 1. Individual Button Binding

For single attack button:

```javascript
const attackButton = html.querySelector('[data-action="attack"]');
const actor = this.actor;
const weapon = actor.items.get(weaponId);

// Cost: 1 standard action
const actionCost = { standard: 1, move: 0, swift: 0 };

// Preview on hover
ActionEconomyBindings.setupPreview(
  attackButton,
  actor,
  actionCost,
  `attack-${weapon.name}`
);

// Execution on click
ActionEconomyBindings.setupExecution(
  attackButton,
  actor,
  actionCost,
  async () => {
    const { SWSERoll } = await import("/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js");
    return await SWSERoll.rollAttack(actor, weapon);
  },
  { actionType: 'attack', allowOverride: true }
);
```

### 2. Multiple Buttons (Batch)

For all attack buttons in a weapon list:

```javascript
ActionEconomyBindings.setupAttackButtons(html, this.actor);
```

Automatically binds all `[data-action="attack"]` buttons using their `data-weapon-id` attribute.

### 3. Custom Action Types

For non-attack actions:

```javascript
// Move action (costs 1 move, 0 standard)
const moveButton = html.querySelector('[data-action="move"]');
const moveCost = { standard: 0, move: 1, swift: 0 };

ActionEconomyBindings.setupPreview(moveButton, actor, moveCost, 'move');
ActionEconomyBindings.setupExecution(
  moveButton,
  actor,
  moveCost,
  async () => {
    // Custom move action logic
    return await this.actor.update({ 'system.position.moved': true });
  },
  { actionType: 'move' }
);
```

---

## Visual Feedback

### Button States

CSS classes automatically applied:
- `.action-available` — Button enabled, cursor normal
- `.action-blocked` — Button disabled with ⊘ overlay
- `.action-unavailable` — Greyed out

### Status Badge

Show action economy state as visual indicator:

```handlebars
{{actionEconomyBadge actor}}
```

Or in JavaScript:

```javascript
const badge = ActionEconomyBindings.createStatusBadge(this.actor);
html.querySelector('.action-status').innerHTML = badge;
```

Badge shows:
- 🟢 Standard action available
- 🔴 Standard action used
- 🟠 Standard action degraded
- (same for move and swift)

### Availability Indicator

Get indicator for custom UI:

```javascript
const indicator = ActionEconomyBindings.getAvailabilityIndicator(
  actor,
  { standard: 1, move: 0, swift: 0 }
);

// indicator = {
//   className: 'action-available' | 'action-unavailable',
//   disabled: boolean,
//   title: string
// }

button.className += ` ${indicator.className}`;
button.disabled = indicator.disabled;
button.title = indicator.title;
```

---

## Integration Example: Character Sheet

### Template (HBS)

```handlebars
<div class="weapon-attack">
  <span class="weapon-name">{{weapon.name}}</span>
  <button
    class="swse-attack-button"
    data-action="attack"
    data-weapon-id="{{weapon.id}}"
    title="Roll attack">
    <i class="fas fa-dice-d20"></i>
    Attack
  </button>
  {{ActionEconomyBindings.createStatusBadge @root.actor}}
</div>
```

### Sheet Class

```javascript
import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";

export class SWSEV2CharacterSheet extends BaseSWSEAppV2 {
  activateListeners(html) {
    super.activateListeners(html);

    // Setup action economy bindings
    ActionEconomyBindings.setupAttackButtons(html, this.actor);

    // Optional: Listen for combat changes to update UI
    Hooks.on('updateCombat', () => {
      this.render();
    });
  }
}
```

### Styling

Link the CSS in your sheet template:

```handlebars
<link rel="stylesheet" href="/systems/foundryvtt-swse/styles/ui/action-economy-buttons.css">
```

---

## Advanced: Custom Execution Callbacks

### With Dialog

```javascript
ActionEconomyBindings.setupExecution(
  button,
  actor,
  { standard: 1, move: 0, swift: 0 },
  async () => {
    // Show dialog before rolling
    const result = await showRollModifiersDialog({
      title: "Attack Roll",
      actor: this.actor
    });

    if (!result) return null;  // Cancelled

    // Then execute roll
    return await SWSERoll.rollAttack(this.actor, weapon);
  }
);
```

### With Conditional Logic

```javascript
ActionEconomyBindings.setupExecution(
  button,
  actor,
  actionCost,
  async () => {
    // Check if actor can actually perform action
    if (!this.actor.system.canAttack) {
      ui.notifications.error("Actor cannot attack (stunned, unconscious, etc.)");
      return null;
    }

    // Execute action
    return await performAction();
  }
);
```

### With State Persistence

```javascript
ActionEconomyBindings.setupExecution(
  button,
  actor,
  actionCost,
  async () => {
    const result = await rollAttack();

    if (result) {
      // Save action to turn history
      await this.actor.update({
        'system.turnHistory': [
          ...(this.actor.system.turnHistory || []),
          {
            action: 'attack',
            timestamp: Date.now(),
            result: result.total
          }
        ]
      });
    }

    return result;
  }
);
```

---

## Policy Mode Examples

### STRICT Mode (Organized Play)

```javascript
ActionPolicyController.setMode('strict');

// Clicking blocked button shows error
// Button is greyed out with ⊘ overlay
// Shift+Click shows override dialog
// GM can choose to allow anyway
```

### LOOSE Mode (Recommended Default)

```javascript
ActionPolicyController.setMode('loose');

// Clicking works even if action economy violated
// GM gets warning notification
// Button shows tooltip explaining violation
// No UI blocking
```

### NONE Mode (Pure Tabletop)

```javascript
ActionPolicyController.setMode('none');

// All actions execute normally
// No warnings or blocking
// Action economy still tracked (for UI display)
// No enforcement
```

---

## Troubleshooting

### Button Not Responding

```javascript
// Check if button element exists
const button = html.querySelector('[data-action="attack"]');
console.log("Button found:", button);

// Check if actor has combatTurnState
console.log("Turn state:", actor.system.combatTurnState);
```

### Binding Not Applied

```javascript
// Ensure setup called AFTER buttons rendered
activateListeners(html) {
  super.activateListeners(html);

  // This should happen AFTER super call
  ActionEconomyBindings.setupAttackButtons(html, this.actor);
}
```

### Override Not Working

```javascript
// Ensure allowOverride: true in options
ActionEconomyBindings.setupExecution(
  button,
  actor,
  cost,
  callback,
  { allowOverride: true }  // THIS must be true
);
```

---

## Complete Sheet Integration Example

```javascript
// SWSEV2CharacterSheet.js

import { ActionEconomyBindings } from "/systems/foundryvtt-swse/scripts/ui/combat/action-economy-bindings.js";
import { ActionEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-engine.js";

export class SWSEV2CharacterSheet extends BaseSWSEAppV2 {
  getData(options = {}) {
    const context = super.getData(options);

    // Add action economy state to context
    const turnState = this.actor.system.combatTurnState
      || ActionEngine.startTurn(this.actor);

    context.actionState = ActionEngine.getVisualState(turnState);
    context.actionBreakdown = ActionEngine.getTooltipBreakdown(turnState);

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Bind all attack buttons
    ActionEconomyBindings.setupAttackButtons(html, this.actor);

    // Update UI when combat changes
    Hooks.on('updateCombat', (combat, data) => {
      if (game.combat?.id === combat.id) {
        this.render();
      }
    });

    // Update on turn state changes
    this.actor.addEventListener('update', () => {
      if (this._updatePending) return;
      this._updatePending = true;

      setTimeout(() => {
        this.render();
        this._updatePending = false;
      }, 100);
    });
  }

  // Optional: Reset turn state on new round
  _onCombatRound(combat, data) {
    if (data.round && data.round !== combat.round) {
      const freshState = ActionEngine.startTurn(this.actor);
      this.actor.update({
        'system.combatTurnState': freshState
      });
    }
  }
}
```

---

## API Reference

### ActionEconomyBindings.setupPreview()
```javascript
setupPreview(
  button: HTMLElement,
  actor: Actor,
  actionCost: { standard, move, swift },
  actionType: string = 'action'
)
```
Hover preview showing if action is available under current policy.

### ActionEconomyBindings.setupExecution()
```javascript
setupExecution(
  button: HTMLElement,
  actor: Actor,
  actionCost: Object,
  executeCallback: Function,
  options: {
    actionType: string,
    allowOverride: boolean
  }
)
```
Click execution with policy enforcement and turn state update.

### ActionEconomyBindings.setupAttackButtons()
```javascript
setupAttackButtons(
  root: HTMLElement,
  actor: Actor,
  getRollCallback: Function? = default
)
```
Batch setup for all attack buttons with `[data-action="attack"]`.

### ActionEconomyBindings.getAvailabilityIndicator()
```javascript
getAvailabilityIndicator(
  actor: Actor,
  actionCost: Object
): { className, disabled, title }
```
Get UI indicator state for custom styling.

### ActionEconomyBindings.createStatusBadge()
```javascript
createStatusBadge(actor: Actor): string
```
Generate HTML badge showing 🟢🔴🟠 action state.

---

## Summary

**ActionEconomyBindings provides:**
- ✅ Zero-config button binding (one line of code)
- ✅ Automatic policy enforcement
- ✅ Hover preview feedback
- ✅ Visual state indicators
- ✅ GM override support
- ✅ Batch setup for efficiency
- ✅ Customizable for any action type
- ✅ Full CSS isolation

**Ready to integrate:** Copy-paste one line into your character sheet and all attack buttons automatically work with action economy.
