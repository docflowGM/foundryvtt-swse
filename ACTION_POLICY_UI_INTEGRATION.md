# Action Policy & UI Integration Pattern

## Three-Layer Architecture

```
┌─────────────────────────────────────┐
│      UI BINDING LAYER               │
│  (Buttons, Tooltips, Greying)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ACTION POLICY CONTROLLER            │
│  (Enforcement Mode: STRICT|LOOSE)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ACTION ENGINE                       │
│  (Pure Calculation)                 │
└─────────────────────────────────────┘
```

## Component Responsibilities

### ActionEngine (Pure Calculation)
- Returns `{ allowed, violations, consumed }`
- Never mutates state
- Never calls UI
- Never imports Sentinel
- Deterministic

### ActionPolicyController (Enforcement Logic)
- Reads ActionEngine result
- Applies policy mode (STRICT/LOOSE/NONE)
- Decides whether to permit/block
- Returns `{ permitted, uiState, shouldNotify }`
- Calls Sentinel only for notifications

### UI Binding Layer (Presentation)
- Queries ActionEngine on hover (preview)
- Queries ActionPolicyController on click (execute)
- Updates button state based on policy
- Shows tooltips with violation reasons
- Implements GM override (Shift+Click in STRICT mode)

---

## Implementation Pattern

### Step 1: Create Preview on Hover

```javascript
// In enhanced-rolls.js or sheet click handler

const attackButton = document.querySelector('[data-action="attack"]');

attackButton.addEventListener('mouseenter', async (e) => {
  // Preview: Can we take this action?
  const actor = game.actors.get(actorId);
  const turnState = actor.system.combatTurnState || ActionEngine.startTurn(actor);

  // Query without consuming
  const enginePreview = ActionEngine.canConsume(
    turnState,
    { standard: 1, move: 0, swift: 0 }
  );

  // Apply policy
  const policyDecision = ActionPolicyController.handle(
    { allowed: enginePreview.allowed, violations: [] },
    { actor, actionType: 'attack' }
  );

  // Update UI
  const { uiState } = policyDecision;
  if (uiState.disabled && policyDecision.mode === 'strict') {
    attackButton.classList.add('disabled', 'greyed-out');
    attackButton.title = uiState.tooltip;
  } else {
    attackButton.classList.remove('disabled', 'greyed-out');
  }
});
```

### Step 2: Execute with Policy Check

```javascript
// On click: Execute attack

attackButton.addEventListener('click', async (e) => {
  const actor = game.actors.get(actorId);
  const weapon = actor.items.get(weaponId);

  // Check current turn state
  const turnState = actor.system.combatTurnState || ActionEngine.startTurn(actor);

  // Attempt to consume (this DOES consume if allowed)
  const engineResult = ActionEngine.consumeAction(turnState, {
    actionType: 'standard',
    cost: { standard: 1, move: 0, swift: 0 }
  });

  // Apply policy
  const policy = ActionPolicyController.handle(engineResult, {
    actor,
    actionType: 'attack'
  });

  // STRICT mode: Block if not permitted
  if (!policy.permitted) {
    if (policy.mode === 'strict') {
      ui.notifications.warn(policy.uiState.tooltip);
      return;  // Don't proceed
    }
  }

  // LOOSE mode: Notify GM but allow
  if (policy.shouldNotify && policy.mode === 'loose') {
    ui.notifications.warn(`${actor.name}: ${policy.uiState.tooltip}`);
  }

  // Proceed with roll
  const result = await SWSERoll.rollAttack(actor, weapon);

  // After successful roll: Update actor's turn state
  if (result && engineResult.updatedTurnState) {
    await actor.update({
      'system.combatTurnState': engineResult.updatedTurnState
    });
  }
});
```

### Step 3: GM Override in STRICT Mode

```javascript
// Shift+Click to force action (STRICT mode only)

if (e.shiftKey && ActionPolicyController.getMode() === 'strict') {
  const confirmOverride = await new Promise(resolve => {
    const dialog = new SWSEDialogV2({
      title: "Override Action Economy",
      content: ActionPolicyController.getOverrideMessage(
        engineResult.violations || []
      ),
      buttons: {
        confirm: {
          label: "Override",
          callback: () => resolve(true)
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(false)
        }
      }
    });
    dialog.render(true);
  });

  if (!confirmOverride) return;

  // Allow override and proceed
}
```

---

## Configuration: GM Settings

Add to system settings during initialization:

```javascript
// In scripts/core/settings.js

game.settings.register("foundryvtt-swse", "actionEconomyMode", {
  name: "Action Economy Enforcement",
  hint: "How strictly to enforce action economy rules",
  scope: "world",
  config: true,
  type: String,
  choices: {
    "strict": "Strict (Block Illegal Actions)",
    "loose": "Loose (Warn GM Only) — Recommended",
    "none": "None (Track Only)"
  },
  default: "loose",
  onChange: (value) => {
    ActionPolicyController.setMode(value);
  }
});
```

---

## Initialization: System Ready Hook

```javascript
// In index.js ready hook, after ActionEngine initialization

import { ActionPolicyController } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-policy.js";

// Set initial enforcement mode from GM setting
const mode = game.settings.get("foundryvtt-swse", "actionEconomyMode");
ActionPolicyController.setMode(mode);

SWSELogger.info(`Action economy mode: ${mode}`);
```

---

## Combat Turn Management

### Start of Turn

```javascript
// When combat round starts, clear action economy

Hooks.on('updateCombat', (combat, data) => {
  if (data.round !== combat.round) {
    // New round started - reset turn states
    for (const combatant of combat.turns) {
      const actor = combatant.actor;
      if (actor) {
        const freshTurnState = ActionEngine.startTurn(actor);
        actor.update({ 'system.combatTurnState': freshTurnState });
      }
    }
  }
});
```

### End of Turn

```javascript
// When turn ends, save final state and optionally notify player

Hooks.on('updateCombat', (combat, data) => {
  if (data.turn !== combat.turn) {
    // Turn changed
    const previousTurnActor = combat.turns[data.turn]?.actor;
    if (previousTurnActor) {
      const remaining = ActionEngine.summarizeState(
        previousTurnActor.system.combatTurnState
      );
      console.log(`${previousTurnActor.name} ended turn with: ${remaining.summary}`);
    }
  }
});
```

---

## UI Component Examples

### Attack Button (CSS)

```css
.swse-attack-button {
  cursor: pointer;
  padding: 8px 12px;
  background: #3498db;
  color: white;
  border: 1px solid #2980b9;
  border-radius: 4px;
  transition: all 0.2s;
}

.swse-attack-button:hover:not(.disabled) {
  background: #2980b9;
}

.swse-attack-button.disabled.greyed-out {
  background: #95a5a6;
  color: #7f8c8d;
  cursor: not-allowed;
  opacity: 0.6;
  border-color: #7f8c8d;
}

.swse-attack-button.disabled.greyed-out:hover {
  background: #95a5a6;
}
```

### Tooltip (JavaScript)

```javascript
// Hover tooltip with violation details

const button = document.querySelector('[data-action="attack"]');

button.addEventListener('mouseenter', () => {
  const tooltip = document.createElement('div');
  tooltip.className = 'action-tooltip';
  tooltip.textContent = button.title;
  document.body.appendChild(tooltip);

  const rect = button.getBoundingClientRect();
  tooltip.style.position = 'fixed';
  tooltip.style.top = rect.bottom + 5 + 'px';
  tooltip.style.left = rect.left + 'px';
  tooltip.style.zIndex = 10000;
});

button.addEventListener('mouseleave', () => {
  document.querySelector('.action-tooltip')?.remove();
});
```

---

## Mode Behavior Matrix

| Mode | Illegal Action | UI Result | GM Notification | Action Executes |
|------|---|---|---|---|
| **STRICT** | Blocked | Greyed, disabled | — | ❌ No |
| **LOOSE** | Allowed* | Normal | ⚠️ Warn | ✅ Yes |
| **NONE** | Tracked | Normal | — | ✅ Yes |

\* *With option for GM override via Shift+Click*

---

## Testing Policy Modes

```javascript
// Test STRICT mode blocking

ActionPolicyController.setMode('strict');
const result = ActionEngine.consumeAction(turnState, { standard: 1 });
const policy = ActionPolicyController.handle(result);

console.assert(!policy.permitted);  // Blocked
console.assert(policy.notificationLevel === 'warn');
```

```javascript
// Test LOOSE mode allowing

ActionPolicyController.setMode('loose');
const result = ActionEngine.consumeAction(turnState, { standard: 1 });
const policy = ActionPolicyController.handle(result);

console.assert(policy.permitted);  // Allowed
console.assert(policy.shouldNotify);  // But warns
```

```javascript
// Test NONE mode tracking

ActionPolicyController.setMode('none');
const result = ActionEngine.consumeAction(turnState, { standard: 1 });
const policy = ActionPolicyController.handle(result);

console.assert(policy.permitted);  // Allowed
console.assert(!policy.shouldNotify);  // Silent
console.assert(policy.violations.length > 0);  // But tracked
```

---

## Summary

**Three-layer separation maintains:**
- ✅ Pure calculation (ActionEngine)
- ✅ Flexible enforcement (ActionPolicyController)
- ✅ Clean UI binding (no logic in UI)
- ✅ GM control (mode selection + override)
- ✅ Player transparency (clear violations shown)

**No coupling between:**
- Engine and policy
- Engine and UI
- Engine and Sentinel
- Policy and Sentinel
