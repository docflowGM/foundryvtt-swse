# V2 Character Sheet — Visual Semantics Restoration

**Date:** 2026-03-15
**Status:** COMPLETE ✅

---

## Overview

Restored the expressive visual layer that was lost during V1→V2 migration. The sheet now emits **semantic state classes** on numbers, bars, and cards, enabling vibrant color-coded and animated UI components.

**Before:** Styled shell with black text (looks flat)
**After:** Expressive inner components with color coding, glows, and state animations (looks alive)

---

## PHASE 1: Enhanced Context Data

### Files Modified
- `/scripts/sheets/v2/character-sheet.js`

### Changes

#### Abilities Context
Added `modClass` to each ability:
```javascript
const mod = ability.mod ?? 0;
modClass: mod > 0 ? 'mod--positive' : mod < 0 ? 'mod--negative' : 'mod--zero'
```

Example output:
- `mod: 3, modClass: 'mod--positive'` → Green
- `mod: -1, modClass: 'mod--negative'` → Red
- `mod: 0, modClass: 'mod--zero'` → Yellow

#### Defenses Context
Added state classes for breakdown components:
```javascript
abilityModClass: abilityMod > 0 ? 'mod--positive' : ...
miscModClass: miscMod > 0 ? 'mod--positive' : ...
```

#### HP Context
Added visual state class based on health percentage:
```javascript
hp.stateClass =
  hp.value <= 0 ? 'state--dead' :
  hp.percent <= 25 ? 'state--critical' :
  hp.percent <= 50 ? 'state--damaged' :
  hp.percent < 100 ? 'state--wounded' :
  'state--healthy'
```

#### XP Context
Created `xpData` object with progress state:
```javascript
xpData = {
  level, total, nextLevelAt, xpToNext,
  stateClass: xpPercent >= 100 ? 'state--ready-levelup' :
              xpPercent >= 75 ? 'state--nearly-ready' :
              'state--in-progress'
}
```

---

## PHASE 2: Semantic Markup

### Files Modified
- `/templates/actors/character/v2/partials/abilities-panel.hbs`
- `/templates/actors/character/v2/partials/defenses-panel.hbs`
- `/templates/actors/character/v2/partials/hp-condition-panel.hbs`
- `/templates/actors/character/v2/partials/xp-panel.hbs`

### Changes

#### Abilities Panel
```html
<!-- BEFORE -->
<div class="ability-mod">{{numberFormat ability.mod decimals=0 sign=true}}</div>

<!-- AFTER -->
<div class="ability-mod {{ability.modClass}}">
  <span class="mod-value">{{numberFormat ability.mod decimals=0 sign=true}}</span>
</div>
```

#### Defenses Panel
```html
<!-- Added state classes to ability mod and misc pill inputs -->
<div class="math-pill derived {{def.abilityModClass}}">
  <label>Ability</label>
  <div class="pill-value">
    <span class="mod-value">{{def.abilityMod}}</span>
  </div>
</div>

<div class="math-pill editable {{def.miscModClass}}">
  <label>Misc</label>
  <input class="misc-input {{def.miscModClass}}" ...>
</div>
```

#### HP Panel
```html
<!-- BEFORE -->
<section class="hp-condition-panel v3-panel holo-panel">
  <div class="hp-bar-wrapper">
    <div class="hp-bar">
      <div class="fill" style="width: {{hp.percent}}%;"></div>
    </div>
    <div class="hp-text">{{hp.value}} / {{hp.max}}</div>
  </div>
</section>

<!-- AFTER -->
<section class="hp-condition-panel v3-panel holo-panel {{hp.stateClass}}">
  <header class="section-bar">
    <h3 class="section-header">Health</h3>
    <span class="hp-state-label {{hp.stateClass}}">
      {{#if (eq hp.stateClass "state--dead")}}Dead{{else if ...}}
    </span>
  </header>
  <div class="hp-bar-wrapper {{hp.stateClass}}">
    <div class="hp-bar {{hp.stateClass}}">
      <div class="hp-bar__fill {{hp.stateClass}}" style="width: {{hp.percent}}%;"></div>
      <span class="hp-bar__label">{{hp.value}} / {{hp.max}}</span>
    </div>
    {{#if bonusHp.value}}
      <div class="bonus-hp-info">+{{bonusHp.value}} bonus</div>
    {{/if}}
  </div>
</section>
```

#### XP Panel
```html
<!-- Added state class to section and progress bar -->
<section class="swse-xp-panel v3-panel holo-panel {{xpData.stateClass}}">
  ...
  <div class="xp-progress-bar {{xpData.stateClass}}">
    <div class="xp-progress-fill {{xpData.stateClass}}" style="width: {{xpPercent}}%;"></div>
    <span class="xp-progress-label">{{xpPercent}}%</span>
  </div>
</section>
```

---

## PHASE 3: Vibrant Semantic CSS

### File Modified
- `/styles/sheets/v2-sheet.css` (added ~400 lines at end)

### Color Coding

#### Positive Numbers (Green)
- Color: `#00ff88`
- Background: `rgba(0, 255, 136, 0.08)`
- Border: `rgba(0, 255, 136, 0.3)`
- Glow: `text-shadow: 0 0 8px rgba(0, 255, 136, 0.5)`

#### Negative Numbers (Red)
- Color: `#ff3b3b`
- Background: `rgba(255, 59, 59, 0.08)`
- Border: `rgba(255, 59, 59, 0.3)`
- Glow: `text-shadow: 0 0 8px rgba(255, 59, 59, 0.5)`

#### Zero Values (Yellow)
- Color: `#ffd700`
- Background: `rgba(255, 215, 0, 0.08)`
- Border: `rgba(255, 215, 0, 0.3)`
- Glow: `text-shadow: 0 0 6px rgba(255, 215, 0, 0.4)`

### HP Bar States

#### Healthy (HP: 75-100%)
- Fill color: Green gradient
- Border: Cyan with subtle glow
- Animation: None (steady)
- Glow: `0 0 16px rgba(0, 255, 136, 0.6)`

#### Wounded (HP: 50-75%)
- Fill color: Yellow gradient
- Border: Cyan with subtle glow
- Animation: None
- Glow: `0 0 12px rgba(255, 200, 0, 0.5)`

#### Damaged (HP: 25-50%)
- Fill color: Orange gradient
- Border: Cyan with subtle glow
- Animation: None
- Glow: `0 0 14px rgba(255, 100, 0, 0.6)`

#### Critical (HP: 0-25%)
- Fill color: Red gradient
- Border: Red with strong glow
- Animation: **Pulsing** (pulse-critical @ 1s loop)
- Glow: `0 0 16px rgba(255, 59, 59, 0.7)` + inset
- **User immediately knows character is in danger**

#### Dead (HP ≤ 0)
- Fill color: Gray (flat, lifeless)
- Border: Gray, muted
- Animation: None
- Glow: None

### XP Bar States

#### In Progress (0-74% XP)
- Fill color: Cyan gradient
- Glow: Soft blue `0 0 10px rgba(100, 200, 255, 0.4)`

#### Nearly Ready (75-99% XP)
- Fill color: Yellow gradient
- Glow: Warm yellow `0 0 12px rgba(255, 200, 0, 0.5)`

#### Ready for Level Up (100%+ XP)
- Fill color: Green gradient
- Border: Green with enhanced glow
- Animation: **Pulsing** (pulse-ready @ 1.2s loop)
- Background pattern: Diagonal stripe animation
- **Clear visual excitement that player can level up**

### Animations

#### `pulse-critical` (HP Critical)
```css
0%, 100%: Full glow, full opacity
50%: Slightly reduced glow, 70% opacity
Duration: 1s infinite
Effect: Draws attention urgently to danger state
```

#### `pulse-ready` (XP Level Up Ready)
```css
0%, 100%: Standard glow
50%: Enhanced glow
Duration: 1.2s infinite
Effect: Celebratory pulse, inviting level-up action
```

### Defense & Ability Cards

- **Math result values**: Cyan backgrounds with subtle styling
- **Defense totals**: Cyan display with help cursor
- **Ability totals**: Bright cyan, high contrast

---

## Visual Hierarchy

Now the sheet communicates state **through color, not just text:**

| Component | State | Color | Glow | Animation |
|-----------|-------|-------|------|-----------|
| HP Bar | Healthy | 🟢 Green | Soft | None |
| HP Bar | Wounded | 🟡 Yellow | Warm | None |
| HP Bar | Damaged | 🟠 Orange | Hot | None |
| HP Bar | Critical | 🔴 Red | Intense | Pulse ⚠️ |
| HP Bar | Dead | ⚫ Gray | None | None |
| XP Bar | In Progress | 🔵 Cyan | Soft | None |
| XP Bar | Nearly Ready | 🟡 Yellow | Warm | None |
| XP Bar | Ready | 🟢 Green | Intense | Pulse ✨ |
| Modifier | Positive | 🟢 Green | Soft | Text glow |
| Modifier | Negative | 🔴 Red | Soft | Text glow |
| Modifier | Zero | 🟡 Yellow | Soft | Text glow |

---

## Result

The character sheet now has:

✅ **Semantic number colors** — Players instantly understand +3 (good), 0 (neutral), -1 (bad)
✅ **Expressive bars** — HP state is communicated through color and glow, not just numbers
✅ **Animations** — Critical health and level-up readiness pulse to draw attention
✅ **Visual polish** — Backgrounds, borders, and glows make components feel alive
✅ **Consistent theme** — All colors align with SWSE cyan/green/red/yellow palette

---

## Testing Checklist

In Foundry, open a character and verify:

- [ ] **Abilities tab**: Positive ability mods glow green, negative glow red, zero glow yellow
- [ ] **Defenses tab**: Same color coding on ability modifiers and misc fields
- [ ] **HP**: Green bar at full health, yellow when 75%, orange at 50%, red+pulsing at 25%, gray when dead
- [ ] **HP Label**: "Healthy" / "Wounded" / "Damaged" / "Critical" / "Dead" updates with color
- [ ] **XP bar**: Cyan for progress, yellow at 75%, green+pulsing when ready for levelup
- [ ] **Bonus HP**: Shows as green text below main HP bar
- [ ] **Numbers**: All modifiers have text glows (green/red/yellow)
- [ ] **Cards**: Defense and ability cards have subtle colored backgrounds
- [ ] **Animations**: HP pulses red when critical, XP pulses green when level-up ready
- [ ] **No black numbers**: Everything has visual semantic meaning through color

---

## Architecture Summary

This restoration achieves **semantic styling** through:

1. **Data layer** (character-sheet.js)
   - Context computes visual state
   - Passes semantic class names to templates

2. **Markup layer** (partials/*.hbs)
   - Templates emit state classes on values
   - No hardcoded styling, pure markup semantics

3. **Visual layer** (v2-sheet.css)
   - CSS rules define behavior for each state
   - Colors, glows, borders, animations all CSS-driven
   - Changes to visual treatment only require CSS edits

This separation makes future updates easy: Want different colors? Edit CSS. Want different states? Update context + add CSS rules.

---

## Files Modified

1. `/scripts/sheets/v2/character-sheet.js`
   - Lines ~285-296: Added `modClass` to abilities
   - Lines ~306-324: Added state classes to defenses
   - Lines ~335-350: Added `stateClass` to HP
   - Lines ~447-459: Created `xpData` object with state class
   - Line ~575: Added `xpData` to finalContext

2. `/templates/actors/character/v2/partials/abilities-panel.hbs`
   - Lines 30-32, 74-76: Added `{{ability.modClass}}` to mod displays

3. `/templates/actors/character/v2/partials/defenses-panel.hbs`
   - Lines 52-57: Added `{{def.abilityModClass}}` to ability pill
   - Lines 68-75: Added `{{def.miscModClass}}` to misc pill

4. `/templates/actors/character/v2/partials/hp-condition-panel.hbs`
   - Complete rewrite to use `{{hp.stateClass}}`
   - Added state label showing "Healthy", "Wounded", "Damaged", "Critical", or "Dead"
   - Enhanced bar structure with proper class hierarchy

5. `/templates/actors/character/v2/partials/xp-panel.hbs`
   - Line 2: Added `{{xpData.stateClass}}` to section
   - Lines 46-58: Added state classes to progress bar and label

6. `/styles/sheets/v2-sheet.css`
   - Lines 739-900: Added comprehensive semantic CSS
   - Color coding rules
   - HP bar state styling
   - XP bar state styling
   - Animations (pulse-critical, pulse-ready)

---

## Next Steps (Optional)

If you want even more polish:
- Add **Force Point bar** styling (similar to HP/XP pattern)
- Add **Condition track state** styling (maybe color-code conditions by severity)
- Add **Fatigue/Injury visuals** (cards that change color/glow when damaged)
- Add **Talent/Feat card states** (highlight restricted talents if requirements not met)

But for now, the sheet has **the vibrant, living feel you designed it to have.**

