# Action Economy Indicator: Sheet Integration Guide

## Overview

The Action Economy Indicator provides real-time visual feedback on turn state within the combat panel of the character sheet. It shows:
- Which actions are available (🟢 green)
- Which actions have been used (🔴 red)
- Which actions were degraded (🟠 orange)

---

## Components

### 1. ActionEngine Methods
**File**: `scripts/engine/combat/action/action-engine.js`

```javascript
// Get visual state for UI rendering
ActionEngine.getVisualState(turnState)
  → { full, standard, move, swift }
  → Returns: "available" | "used" | "degraded"

// Get breakdown text for tooltip
ActionEngine.getTooltipBreakdown(turnState)
  → ["Standard action used.", "Move action degraded...", "2 Swift remaining"]
```

### 2. Handlebars Template
**File**: `templates/actors/character/v2/partials/action-economy-indicator.hbs`

Displays the action hierarchy with color-coded visual states.

**Variables Required**:
```handlebars
actionState {
  full: "available|used|degraded",
  standard: "available|used|degraded",
  move: "available|used|degraded",
  swift: "available|used|degraded"
}

actionBreakdown: ["line 1", "line 2", ...]
swiftMax: 1  // usually 1, can be more for some classes
```

### 3. CSS Styling
**File**: `styles/actor-sheets/action-economy-indicator.css`

- 🟢 Green: `action-state-available`
- 🔴 Red: `action-state-used`
- 🟠 Orange: `action-state-degraded`

---

## Sheet Integration

### Step 1: Include in Combat Panel

In your character sheet template (`character/v2/tabs/combat-panel.hbs` or similar):

```handlebars
<div class="combat-panel">
  {{!-- Existing combat content --}}

  {{!-- NEW: Action Economy Indicator --}}
  {{> "systems/foundryvtt-swse/templates/actors/character/v2/partials/action-economy-indicator.hbs"
      actionState=getActionState
      actionBreakdown=getActionBreakdown
      swiftMax=this.system.combatActions.maxSwiftPerTurn
  }}

  {{!-- Rest of combat panel --}}
</div>
```

### Step 2: Sheet Context Data

In your sheet class (`SWSEV2CharacterSheet` or similar):

```javascript
// In getData() method:

getData() {
  const context = super.getData();

  // Add action economy state to context
  if (game.combat?.turns?.find(t => t.actorId === this.actor.id)) {
    const turnState = this.actor.system.combatTurnState
      || ActionEngine.startTurn(this.actor);

    context.getActionState = ActionEngine.getVisualState(turnState);
    context.getActionBreakdown = ActionEngine.getTooltipBreakdown(turnState);
  } else {
    // Not in combat
    const freshState = ActionEngine.startTurn(this.actor);
    context.getActionState = ActionEngine.getVisualState(freshState);
    context.getActionBreakdown = ActionEngine.getTooltipBreakdown(freshState);
  }

  return context;
}
```

### Step 3: Link CSS

In your sheet's CSS file or main sheet template:

```handlebars
{{!-- In character sheet template head --}}
<link rel="stylesheet" href="/systems/foundryvtt-swse/styles/actor-sheets/action-economy-indicator.css">
```

Or import in your main sheet CSS:

```css
@import url("/systems/foundryvtt-swse/styles/actor-sheets/action-economy-indicator.css");
```

---

## Real-Time Updates

### On Action Consumption

After `ActionEngine.consumeAction()` succeeds:

```javascript
// Update actor's turn state
await this.actor.update({
  'system.combatTurnState': result.updatedTurnState
});

// Sheet will auto-rerender when system data updates
// (via existing Foundry update hooks)
```

### On Turn/Round Change

```javascript
// In actor sheet class, listen for combat changes:

Hooks.on('updateCombat', (combat, data) => {
  // Round changed - reset action states
  if (data.round && data.round !== combat.round) {
    const freshState = ActionEngine.startTurn(this.actor);
    this.actor.update({
      'system.combatTurnState': freshState
    });
  }

  // Turn changed to this actor
  if (data.turn && combat.turns[data.turn]?.actorId === this.actor.id) {
    this.render();  // Rerender sheet to show new turn
  }
});
```

### On Combat Start

```javascript
// Initialize turn states when combat starts
Hooks.on('createCombat', (combat) => {
  for (const combatant of combat.turns) {
    const actor = combatant.actor;
    if (actor) {
      const freshState = ActionEngine.startTurn(actor);
      actor.update({
        'system.combatTurnState': freshState
      });
    }
  }
});
```

---

## Visual State Reference

### Full Round
- **Available** 🟢: Both standard and move available (not used)
- **Used** 🔴: Both consumed (full round was used)

### Standard Action
- **Available** 🟢: Standard action available
- **Used** 🔴: Standard action consumed
- **Degraded** 🟠: Converted to move (if move unavailable)

### Move Action
- **Available** 🟢: Move action available
- **Used** 🔴: Move action consumed
- **Degraded** 🟠: Converted to swift (if move unavailable)

### Swift Actions
- **Available** 🟢: Swift actions remain
- **Used** 🔴: All swift actions consumed
- **Degraded** 🟠: (Never degraded, terminal action type)

---

## Breakdown Text Examples

### Fresh Turn
```
• No actions used this turn.
```

### Standard Used
```
• Standard action used.
• Move action: 1 available.
• Swift actions: 1 remaining.
```

### Move Degraded to Swift
```
• Standard action used.
• Move action used or degraded.
• Swift actions: 2/2 used (degraded to pay for move).
```

### All Actions Consumed
```
• Standard action used.
• Move action used or degraded.
• Swift actions: 1/1 used (all consumed).
```

---

## CSS Customization

### Custom Colors

Override in your own CSS:

```css
.swse-action-economy-indicator .action-state-available {
  background: rgba(YOUR_GREEN, 0.3);
  color: YOUR_GREEN;
  border-color: rgba(YOUR_GREEN, 0.5);
}

.swse-action-economy-indicator .action-state-used {
  background: rgba(YOUR_RED, 0.3);
  color: YOUR_RED;
  border-color: rgba(YOUR_RED, 0.5);
}

.swse-action-economy-indicator .action-state-degraded {
  background: rgba(YOUR_ORANGE, 0.3);
  color: YOUR_ORANGE;
  border-color: rgba(YOUR_ORANGE, 0.5);
}
```

### Sizing

```css
/* Make indicator larger */
.swse-action-economy-indicator {
  font-size: 14px;  /* Increase from default */
  padding: 16px;    /* Increase spacing */
}

.action-node {
  padding: 10px 12px;  /* Larger action nodes */
}
```

### Layout

The indicator is a vertical stack by default. To make it horizontal:

```css
.action-hierarchy {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
}

.hierarchy-arrow {
  margin: 0 4px;
  display: inline;
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Indicator shows on character sheet
- [ ] Fresh turn shows all green (available)
- [ ] After standard attack, standard turns red
- [ ] Move still shows green
- [ ] Move degradation turns orange
- [ ] Swift state updates correctly
- [ ] Tooltip breakdown is accurate
- [ ] Colors appear correctly
- [ ] Responsive on mobile
- [ ] Updates when turn changes

### Unit Test Example

```javascript
// Test visual state mapping
const freshState = ActionEngine.startTurn(testActor);
const visual = ActionEngine.getVisualState(freshState);

console.assert(visual.full === 'available');
console.assert(visual.standard === 'available');
console.assert(visual.move === 'available');
console.assert(visual.swift === 'available');

// Test after consumption
const result = ActionEngine.consumeAction(freshState, { actionType: 'standard' });
const visual2 = ActionEngine.getVisualState(result.updatedTurnState);

console.assert(visual2.standard === 'used');
console.assert(visual2.move === 'available');  // Move still available
```

---

## Accessibility Notes

- Color is not the only indicator (includes text labels)
- Text "available/used/degraded" supplements color
- Tooltip provides detailed breakdown
- Keyboard navigation supported via standard sheet tabs
- Screen readers can access breakdown text

---

## Performance Considerations

- Indicator updates only on action changes or turn changes
- No polling or repeated calculations
- Visual state computed once per sheet render
- CSS uses simple class names (no gradients/animations)
- Responsive design minimal (single breakpoint)

---

## Future Enhancements (Optional)

1. **Animation**: Flash when action is consumed
2. **Drag & Drop Preview**: Show degradation before clicking
3. **Tooltip on Hover**: Expand breakdown on mouseover
4. **Comparison View**: Show "if I do action X" preview
5. **History Panel**: Show previous turns' action usage
6. **Quick Action Buttons**: Directly consume actions from panel
7. **Accessibility Voice**: "Standard action consumed" announcements

---

## Complete Example: Character Sheet Integration

```javascript
// In SWSEV2CharacterSheet.js

export class SWSEV2CharacterSheet extends BaseSWSEAppV2 {
  getData(options = {}) {
    const context = super.getData(options);

    // Add action economy indicators
    const inCombat = game.combat?.turns?.some(t => t.actorId === this.actor.id);
    if (inCombat) {
      const turnState = this.actor.system.combatTurnState
        || ActionEngine.startTurn(this.actor);
      context.getActionState = ActionEngine.getVisualState(turnState);
      context.getActionBreakdown = ActionEngine.getTooltipBreakdown(turnState);
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Listen for combat changes
    Hooks.on('updateCombat', (combat, data) => {
      if (combat.id === game.combat?.id) {
        // Re-render to update action economy
        this.render();
      }
    });
  }
}
```

Then in your template:

```handlebars
<div class="combat-panel">
  {{> "systems/foundryvtt-swse/templates/actors/character/v2/partials/action-economy-indicator.hbs"
      actionState=getActionState
      actionBreakdown=getActionBreakdown
      swiftMax=1
  }}
</div>
```

---

## Summary

The Action Economy Indicator provides:
- ✅ Visual feedback on action state
- ✅ No hard enforcement (optional policy)
- ✅ Clear degradation indication (orange)
- ✅ Breakdown text for details
- ✅ Automatic updates
- ✅ Mobile-responsive design
- ✅ Full CSS isolation
- ✅ Zero performance impact

Perfect complement to ActionPolicyController for transparent, player-friendly action economy management.
