# Phase 1 Audit: Tooltip System Refactor

## Executive Summary

The SWSE tooltip infrastructure exists but is **partially wired**. The discovery system (micro-tooltips) works globally via hook-based binding. The breakdown systems (defense/weapon) exist but are **completely unwired from the V2 character sheet**. The V2 sheet relies on native `title=` attributes instead of the unified registry.

**Status:** Reuse-first salvage job. No rewrites needed. Reconnection + intentional hardpoint adoption.

---

## 1. Existing Tooltip Systems

### 1.1 TooltipRegistry (Global Micro-Tooltips)
**File:** `scripts/ui/discovery/tooltip-registry.js`

- **Status:** ✅ **ACTIVE**
- **Mechanism:** Data-driven via `data-swse-tooltip="KeyName"` attribute
- **Lifecycle:** Initialized globally in `index.js`, hooks all 'renderApplication' events
- **Lookup:** TOOLTIP_DEFS keys → localized i18n keys (SWSE.Discovery.Tooltip.*)
- **Behavior:** Hover/focus → show, leave/blur → hide
- **Positioning:** Auto-flip above/below, horizontal clamping
- **Styling:** `styles/components/discovery.css` (holo cyan, proper z-index)
- **Defined Keys:** 37+ hardpoints (HitPoints, DamageThreshold, Defenses, Skills, Equipment, etc.)

### 1.2 DefenseTooltip (Defense Breakdowns)
**File:** `scripts/ui/defense-tooltip.js`

- **Status:** ❌ **UNWIRED**
- **What it does:** Shows defense value breakdown with base calc, modifiers, special effects
- **Intended use:** Click or hover on defense total → shows calculation detail in pinned card
- **Initialization:** Static method `DefenseTooltip.initTooltips(actor, container)`
- **Target attribute:** `data-defense-breakdown="reflex|fort|will"`
- **Lifecycle:** None. Never called from V2 sheet.
- **Positioning:** Relative to trigger element (bottom-left, adjusts for viewport)

### 1.3 WeaponTooltip (Weapon Breakdowns)
**File:** `scripts/ui/weapon-tooltip.js`

- **Status:** ⚠️ **PARTIALLY WIRED**
- **What it does:** Shows weapon attack/damage breakdown with components, modifiers, properties
- **Current home:** `scripts/ui/combat-panel-manager.js` calls `WeaponTooltip.initTooltips()`
- **Target attributes:** `data-attack-breakdown` and `data-damage-breakdown`
- **Issue:** CombatPanelManager itself is not integrated into the V2 character sheet
- **Lifecycle:** Standalone, no lifecycle safety

### 1.4 CombatPanelManager (Attack Card Integration)
**File:** `scripts/ui/combat-panel-manager.js`

- **Status:** ⚠️ **ORPHANED**
- **Imports:** WeaponTooltip
- **Static method:** `CombatPanelManager.initCombatPanel(actor, container)`
- **Problem:** Not called from V2 character sheet render flow
- **Scope:** Only targets `.swse-attack-card` elements (which may not be the active template)

---

## 2. Discovery System Initialization

**File:** `scripts/ui/discovery/index.js`

```js
export function initializeDiscoverySystem()  // Called in 'init' hook
export function onDiscoveryReady()            // Called in 'ready' hook
```

**Called from:** `index.js` (lines 160, 298, 529)

**What it does:**
- Hooks: 'renderApplication', 'renderActorSheet', 'renderItemSheet'
- On each render: `TooltipRegistry.bind(root)` scans for `[data-swse-tooltip]` and attaches listeners
- Idempotent via `_swseTooltipBound` marker on elements

**Why it works:**
- Hook-based, not lifecycle-dependent
- Safe on re-renders (marker prevents duplicate listeners)

---

## 3. V2 Character Sheet: Current State

**Main template:** `templates/actors/character/v2/character-sheet.hbs`
**Partials:** `templates/actors/character/v2/partials/*.hbs`

### 3.1 What's Using `title=` Attributes (Browser Tooltips)

Found 30+ instances across character sheet templates:
- `persistent-header.hbs`: Defense buttons, HP, class indicators
- `hp-condition-panel.hbs`: HP values, condition track
- `defenses-panel.hbs`: Defense values (Reflex, Fortitude, Will, Flat-Footed)
- `abilities-panel.hbs`: Ability scores and modifiers
- `xp-panel.hbs`: XP, level progression
- `resources-panel.hbs`: Force Points, Destiny Points
- And more...

**Problem:** Browser tooltips (title=) are:
- Not styleable (gray boxes)
- Not integrated with the holo visual language
- Don't follow SWSE design system
- Not discoverable via the registry

### 3.2 What's NOT Using Any Tooltip
- Weapon/attack breakdowns (data-attack-breakdown attributes do not exist in V2 templates)
- Defense breakdowns (data-defense-breakdown attributes do not exist)
- Many stat values that would benefit from explanation

### 3.3 CSS-Only Tooltip Pattern (Conflict)

**File:** `styles/sheets/skill-actions.css` (lines 23-39)

```css
.skill-total[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  ...
}
```

This CSS pattern:
- Uses a different attribute name (`data-tooltip`, not `data-swse-tooltip`)
- Uses CSS-only rendering (not DOM tooltips)
- Cannot integrate with the unified registry
- Duplicates tooltip functionality

---

## 4. Verification Checklist

✅ **TooltipRegistry is initialized globally**
- Confirmed in index.js, lines 160, 298, 529

❌ **DefenseTooltip is wired into V2 character sheet**
- Not imported anywhere in V2 sheet flow
- No data-defense-breakdown attributes in V2 templates

❌ **WeaponTooltip is wired into V2 character sheet**
- Only imported by CombatPanelManager
- CombatPanelManager not called from V2 sheet
- No data-attack-breakdown or data-damage-breakdown in V2 templates

❌ **V2 character partials use data-swse-tooltip**
- V2 partials use native title= instead
- Missing hardpoint attributes entirely

⚠️ **CSS tooltip patterns conflict with unified system**
- skill-actions.css uses [data-tooltip] with CSS-only rendering

---

## 5. Architecture Seam Analysis

### The Break Points

1. **V2 Character Sheet Render Lifecycle**
   - Does NOT import or call DefenseTooltip
   - Does NOT import or call WeaponTooltip
   - Does NOT call CombatPanelManager
   - Does NOT add data-swse-tooltip attributes to templates

2. **Breakdown Systems**
   - DefenseTooltip and WeaponTooltip have their own lifecycle management
   - Expect to be called explicitly, with (actor, container) args
   - Not wired into any active render flow

3. **Unified vs. Standalone**
   - TooltipRegistry: global hook-based, works everywhere
   - DefenseTooltip/WeaponTooltip: standalone, expect manual initialization
   - These two paradigms need to converge

---

## 6. Recommended Integration Strategy

### Phase 2 (Behavior Extension)

Extend TooltipRegistry to optionally support:
- Breakdown providers (for complex math tooltips)
- Help mode awareness
- Hover delay policy (micro vs. pinned)

Keep DefenseTooltip and WeaponTooltip but refactor their initialization:
- Remove standalone event listeners
- Register them as providers in TooltipRegistry
- Let the unified system handle lifecycle

### Phase 3 (V2 Sheet Wiring)

Add a single **tooltip integration point** in the V2 character sheet lifecycle:
- After render, call a centralized tooltip binder
- Bind micro-tooltips via TooltipRegistry (already works)
- Initialize breakdown handlers for Defense and Weapon hardpoints
- Use AbortController to clean up on subsequent renders

### Phase 4 (Hardpoint Adoption)

Replace native `title=` at intentional hardpoints:
- Hit Points
- Damage Threshold
- Defenses (Reflex, Fortitude, Will, Flat-Footed)
- Force Points
- Destiny Points
- Base Attack Bonus
- Grapple
- Initiative
- Ability scores / modifiers
- Skill trained badge
- Weapon hardpoints (attack, damage)

Do NOT tooltip everything. Use curated, intentional hardpoints only.

### Phase 5 (CSS Cleanup)

Remove or refactor `styles/sheets/skill-actions.css` tooltip pattern:
- Replace `[data-tooltip]` usage with `data-swse-tooltip`
- Let TooltipRegistry handle binding instead of CSS ::after

---

## 7. Files That Need Changes

### New / Modified

- `scripts/ui/discovery/tooltip-registry.js` (extend for breakdowns)
- `scripts/ui/defense-tooltip.js` (refactor for registry integration)
- `scripts/ui/weapon-tooltip.js` (refactor for registry integration)
- `scripts/sheets/v2/character-sheet.js` (add tooltip integration point)
- `templates/actors/character/v2/character-sheet.hbs` (add data-swse-tooltip, remove some title=)
- `templates/actors/character/v2/partials/*.hbs` (add data-swse-tooltip at hardpoints)
- `styles/sheets/skill-actions.css` (remove CSS tooltip pattern)

### Existing / Reused

- `styles/components/discovery.css` (keep as-is, add breakdown styles if needed)
- `lang/en.json` (already has all tooltip defs, add breakdowns if new)
- `index.js` (no changes needed, already calls discovery system)

---

## 8. Summary

**The situation:** Three systems exist. One (TooltipRegistry) is wired. Two (DefenseTooltip, WeaponTooltip) are orphaned. V2 sheet uses browser tooltips instead of any of them.

**The fix:** Unify all three under a single lifecycle point in the V2 sheet. Extend TooltipRegistry to optionally host breakdown providers. Wire both breakdown systems through the same render hook. Replace ad hoc `title=` usage at hardpoints.

**Impact:** Tooltips work again, feel consistent, and integrate with the holo language.

---

## Hardpoints to Implement

### Always Include
- Hit Points
- Damage Threshold
- Condition Track
- Force Points
- Destiny Points
- Reflex / Fortitude / Will / Flat-Footed
- Base Attack Bonus
- Grapple
- Initiative
- Speed (if movement logic is complex)

### Help Mode (Secondary)
- Ability score / modifier
- Trained badge / focus badge
- Armor penalty / dex cap

### Pinned Breakdowns (Click-to-Open)
- Defense total breakdown
- Attack bonus breakdown
- Damage breakdown

### Icon-Only Controls
- Roll icons
- Favorite/star icons
- Config/gear icons
- Collapse/expand icons
- Condition buttons

### Do NOT Tooltip
- Plain text action buttons
- Field labels
- Every number input
- Obvious labels like "Notes"
- Repeated row elements

