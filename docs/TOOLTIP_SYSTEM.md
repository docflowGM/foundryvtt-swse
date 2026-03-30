# SWSE Tooltip System Developer Guide

## Overview

The SWSE tooltip system is a unified, reusable framework for providing contextual help across the V2 character sheet and other interfaces. It consists of:

1. **TooltipRegistry** - Micro-tooltip definitions and binding engine
2. **DefenseTooltip** - Breakdown provider for defense values
3. **WeaponTooltip** - Breakdown provider for weapon values
4. **V2 Character Sheet Integration** - Help mode toggle + tooltip binding

---

## Quick Start

### Adding a Tooltip to a Template

1. Add the `data-swse-tooltip` attribute to your HTML element:
```hbs
<div class="my-stat" data-swse-tooltip="HitPoints">
  {{actor.system.hp.value}}
</div>
```

2. Define the tooltip text in `lang/en.json`:
```json
{
  "SWSE": {
    "Discovery": {
      "Tooltip": {
        "HitPoints": {
          "Title": "Hit Points",
          "Body": "Hit Points measure how long you can stay in the fight..."
        }
      }
    }
  }
}
```

3. The tooltip will automatically appear on hover (or with help mode active).

### Registering a Custom Tooltip

```javascript
import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";

TooltipRegistry.register("MyCustomThing", "SWSE.Discovery.Tooltip.MyCustomThing");
```

---

## Architecture

### TooltipRegistry (Primary System)

**File:** `scripts/ui/discovery/tooltip-registry.js`

Core responsibilities:
- Maintains the registry of all tooltip definitions
- Scans DOM for `[data-swse-tooltip]` elements
- Manages hover/focus listeners
- Implements hover delay timing
- Positions tooltips relative to trigger elements

Key methods:
```javascript
// Bind tooltips to a root element (safe to call multiple times)
TooltipRegistry.bind(root)

// Register a custom tooltip definition
TooltipRegistry.register(id, i18nPrefix)

// Register a breakdown provider (for complex math tooltips)
TooltipRegistry.registerBreakdownProvider(key, providerFn)

// Manage help mode
TooltipRegistry.setHelpMode(active)
TooltipRegistry.isHelpMode()
```

### Hover Delay System

Tooltips respect a `--tooltip-delay` CSS variable:

```css
/* Default: 250ms for curated hardpoints */
[data-swse-tooltip] {
  --tooltip-delay: 250ms;
}

/* Override: 1000ms for icon-only controls */
.roll-btn, .mini-btn, .favorite-btn {
  --tooltip-delay: 1000ms;
}
```

When the user hovers:
1. Timer starts (reads `--tooltip-delay` from element)
2. If user leaves before timer → tooltip never appears
3. If user stays → tooltip appears after delay

### Help Mode Integration

**File:** `scripts/sheets/v2/character-sheet.js`

The V2 character sheet includes:
- A `(?)` help toggle button in the sheet-actions bar
- Per-sheet instance help state (`this._helpModeActive`)
- Toggle handler that updates TooltipRegistry help mode

When help mode is ON:
- Curated hardpoints get subtle visual affordance (inset glow)
- Sheet root gets `.help-mode-active` class for CSS styling
- Tooltip delays remain unchanged (configured per-element)

When help mode is OFF:
- Hardpoints have no visual affordance
- Only icon-only controls (1000ms delay) show tooltips

### Breakdown Providers

**Files:** `scripts/ui/defense-tooltip.js`, `scripts/ui/weapon-tooltip.js`

Breakdown providers register themselves with the registry:

```javascript
TooltipRegistry.registerBreakdownProvider('ReflexDefense', (actor) => {
  return {
    title: 'Reflex Defense Breakdown',
    body: '10 + ½ level + dex mod + class bonus + misc...'
  };
});
```

Consumers can retrieve providers:

```javascript
const provider = TooltipRegistry.getBreakdownProvider('ReflexDefense');
if (provider) {
  const content = provider(actor);
  // Use content.title and content.body
}
```

---

## Hardpoint Policy

### What Should Get a Tooltip?

**Always:**
- Core rules values (HP, DT, defenses, abilities, skills)
- Icon-only controls (roll buttons, favorites, gear buttons)
- Anything a new player might not understand

**Sometimes:**
- Derived stats (BAB, grapple) when space allows
- Skill modifiers when help mode is ON

**Never:**
- Obvious labels like "Notes" or "Name"
- Repeated items (don't tooltip every row)
- Plain text buttons with clear labels
- Every input field or field label

### The Spam Check

Before adding a hardpoint, ask:
1. "Would a new player wonder what this means?" → Add it
2. "Is this just repeating info from elsewhere?" → Maybe skip
3. "Will this make the UI feel cluttered?" → Reconsider
4. "Is this already explained in help mode?" → Skip

---

## Styling & CSS

### Tooltip Visual Design

Tooltips use the holo/datapad visual language:
- Cyan/blue tint (rgba(0, 200, 255, ...))
- Subtle glow, not loud
- Matches existing SVG-framed chrome

Key CSS classes:
- `.swse-discovery-tooltip` - Main tooltip element
- `.swse-discovery-tooltip__title` - Title text
- `.swse-discovery-tooltip__body` - Body text
- `.swse-discovery-tooltip--below` - Positioning indicator

### Help Mode Styling

```css
/* Button active state */
.help-mode-toggle.active {
  background: rgba(0, 200, 255, 0.2);
  border-color: rgba(0, 200, 255, 0.6);
  color: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 200, 255, 0.3);
}

/* Hardpoint affordance */
.help-mode-active [data-swse-tooltip]:hover {
  box-shadow: inset 0 0 6px rgba(0, 200, 255, 0.15);
}
```

### Custom Delays

Override the default delay by setting the CSS variable:

```css
.my-custom-control {
  --tooltip-delay: 500ms;
}
```

---

## Adding Tooltips to New Elements

### 1. Template: Add the attribute

```hbs
<div class="my-element" data-swse-tooltip="MyThing">
  Content here
</div>
```

### 2. Lang: Define the text

In `lang/en.json`, add under `SWSE.Discovery.Tooltip`:

```json
"MyThing": {
  "Title": "Brief Title",
  "Body": "Longer explanation of what this does. Use calm, player-facing language."
}
```

### 3. (Optional) CSS: Set the delay

```css
.my-element {
  --tooltip-delay: 500ms; /* if you want a custom delay */
}
```

### 4. The tooltip binds automatically

When the V2 sheet renders, `TooltipRegistry.bind(root)` scans for all `[data-swse-tooltip]` elements and attaches listeners. No extra code needed.

---

## Keyboard Accessibility

### Focus Handling

All elements with `data-swse-tooltip` are made focusable (auto-added `tabindex="0"`).

- Focus: Shows tooltip
- Blur: Hides tooltip
- Same delay as hover

### Reduced Motion

Tooltips respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .swse-discovery-tooltip {
    animation: none;
    opacity: 1;
  }
}
```

---

## Common Patterns

### Icon-Only Button with Tooltip

```hbs
<button type="button" class="roll-btn" data-swse-tooltip="Initiative" title="Roll initiative">
  <i class="fa-solid fa-dice-d20"></i>
</button>
```

The button automatically gets 1000ms delay via CSS variable.

### Stat Row with Tooltip

```hbs
<div class="stat-row" data-swse-tooltip="Strength">
  <label>STR</label>
  <div class="value">{{system.abilities.str.total}}</div>
</div>
```

The row gets 250ms delay (default help-mode delay).

### Conditional Tooltip

```hbs
<div class="defense" data-swse-tooltip="{{#if type='fort'}}FortitudeDefense{{else if type='ref'}}ReflexDefense{{/if}}">
  {{value}}
</div>
```

---

## Troubleshooting

### Tooltip doesn't appear

1. Check that `data-swse-tooltip` value exists in `lang/en.json`
2. Verify the element is in the DOM when `TooltipRegistry.bind()` runs
3. Check browser console for errors
4. Ensure the sheet calls `bindV2CharacterSheetTooltips()` in render lifecycle

### Tooltip appears but text is wrong

- Check the i18n key in `lang/en.json`
- Verify the Title and Body are both present
- Use `game.i18n.localize()` in browser console to test

### Tooltip stays open too long

- The delay is configured correct, but the tooltip lingers on blur
- Check that `hideTooltip()` is being called on blur event
- Verify no CSS is overriding pointer-events

### Help mode toggle doesn't work

- Check that the toggle button has `data-action="toggle-help-mode"`
- Verify the handler in `character-sheet.js` is present
- Check browser console for errors on toggle click

---

## API Reference

### TooltipRegistry.bind(root)

Scans root element for `[data-swse-tooltip]` and attaches hover/focus listeners.

**Parameters:**
- `root` (HTMLElement) - Root to scan

**Returns:** None

**Idempotent:** Yes (safe to call multiple times)

### TooltipRegistry.register(id, i18nPrefix)

Register a custom tooltip definition.

**Parameters:**
- `id` (string) - Tooltip key (used in `data-swse-tooltip`)
- `i18nPrefix` (string) - i18n key prefix (system appends `.Title` and `.Body`)

**Returns:** None

### TooltipRegistry.registerBreakdownProvider(key, provider)

Register a breakdown provider function.

**Parameters:**
- `key` (string) - Semantic concept key (e.g., 'ReflexDefense')
- `provider` (Function) - Async function(actor) → {title, body}

**Returns:** None

### TooltipRegistry.setHelpMode(active)

Toggle help mode globally.

**Parameters:**
- `active` (boolean) - True to enable help mode

**Returns:** None

### TooltipRegistry.isHelpMode()

Check if help mode is currently active.

**Returns:** boolean

---

## Examples

### Example 1: Adding a tooltip to a new stat

```hbs
<!-- Template -->
<div class="speed-display" data-swse-tooltip="Speed">
  {{actor.system.speed}} ft.
</div>
```

```json
// lang/en.json
"Speed": {
  "Title": "Speed",
  "Body": "How many feet you can move per round in combat."
}
```

### Example 2: Custom delay for a special control

```hbs
<!-- Template -->
<button class="special-action" data-swse-tooltip="MySpecial" style="--tooltip-delay: 800ms">
  Do Something Special
</button>
```

Or better, in CSS:

```css
.special-action {
  --tooltip-delay: 800ms;
}
```

### Example 3: Conditional tooltip based on character type

```hbs
<div data-swse-tooltip="{{#if forceSensitive}}UseTheForce{{else}}Initiative{{/if}}">
  {{label}}
</div>
```

---

## Future Extensions

### Pinned Breakdowns (Phase 6+)

When implementing pinned breakdown cards:

1. Create a breakdown provider via `registerBreakdownProvider()`
2. Add a click handler that calls the provider
3. Display the result in a persistent card
4. Implement close button / click-away dismiss

Example (pseudo-code):

```javascript
const provider = TooltipRegistry.getBreakdownProvider('ReflexDefense');
const content = await provider(actor);
// Display as pinned card, not fleeting tooltip
```

### Help Mode Persistence (Phase 7+)

Currently help mode is per-sheet instance. In the future, consider:

- Per-character help preference (via actor flags)
- Global user preference (via client settings)
- One-time tutorial flow that activates help mode automatically

---

## Contributing

When adding new tooltips:

1. **Be concise.** Title in 1-3 words, body in 1-2 sentences.
2. **Use player language.** Avoid rulebook prose. Sound like the holopad is informing the player.
3. **Test in help mode.** Does it feel discoverable without being spammy?
4. **Test keyboard nav.** Does focus show the tooltip?
5. **Avoid spam.** If every row glows in help mode, reconsider.

---

## Related Files

- `scripts/ui/discovery/tooltip-registry.js` - Core registry
- `scripts/ui/discovery/index.js` - Initialization and hooks
- `scripts/ui/defense-tooltip.js` - Defense breakdown provider
- `scripts/ui/weapon-tooltip.js` - Weapon breakdown provider
- `scripts/sheets/v2/TooltipIntegration.js` - V2 sheet binding
- `scripts/sheets/v2/character-sheet.js` - Help mode toggle
- `styles/components/discovery.css` - Tooltip styling
- `styles/sheets/v2-sheet.css` - Help mode affordances
- `lang/en.json` - All tooltip definitions

