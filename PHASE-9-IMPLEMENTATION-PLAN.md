# Phase 9 Implementation Plan: Core Analysis Coverage & Tier-Aware Help

**Status:** PLANNING
**Branch:** `claude/refactor-tooltip-layer-V82vD`

---

## Overview

Phase 9 completes the V2 character sheet as the reference implementation by:
1. Adding breakdown cards for all core derived stats (BAB, Grapple, Initiative, DT)
2. Turning the glossary tier model into real player-facing help behavior
3. Implementing lightweight help persistence
4. Refining interactions and affordances

---

## Part 1: Provider Audit & Implementation Plan

### Current State (Existing Providers)
✅ DefenseTooltip
- Reflex, Fortitude, Will, Flat-Footed
- getBreakdownStructure() implemented
- FlatFooted support added in Phase 8

✅ WeaponTooltip
- getAttackBreakdownContent()
- getDamageBreakdownContent()
- Needs normalization to card structure

❌ Missing Providers (Phase 9)
- BAB (Base Attack Bonus)
- Grapple
- Initiative
- Damage Threshold

❌ Conditional (Phase 9)
- Hit Points (only if meaningful composition exists)
- Speed (only if derived and non-obvious)
- Force Points / Destiny Points (only if meaningful state)

### Implementation Plan for Missing Providers

#### 1. BaseAttackBonus Provider
**Location:** New method in DefenseTooltip or new class CombatStatsTooltip

**Composition:**
- Base: level ÷ 2 (rounded down)
- Class bonus
- Misc/modifiers
- Total

**Breakdown Useful?** YES - composition is real and not obvious

**Implementation:**
```javascript
static getAttackBonusBreakdown(actor) {
  const level = actor.system.level || 1;
  const halfLevel = Math.floor(level / 2);
  const classBonus = actor.system.baseAttackBonus?.classBonus || 0;
  const miscMod = actor.system.baseAttackBonus?.miscMod || 0;
  const modifiers = this._getModifiersForBAB(actor);

  const rows = [
    { label: 'Base', value: halfLevel, semantic: 'neutral' },
    { label: 'Class', value: classBonus, semantic: 'positive' || 'neutral' },
    { label: 'Misc', value: miscMod, semantic: ... },
    ...modifiers
  ];

  const total = halfLevel + classBonus + miscMod + (modifiers sum);

  return {
    title: 'Base Attack Bonus',
    definition: 'Your bonus to melee and ranged attacks.',
    rows,
    total
  };
}
```

#### 2. Grapple Provider
**Location:** Same class as BAB (CombatStatsTooltip or DefenseTooltip)

**Composition:**
- Base Attack Bonus
- Strength modifier
- Size modifier (if applicable)
- Misc modifiers
- Total

**Breakdown Useful?** YES - players often forget BAB is part of grapple

**Implementation:**
```javascript
static getGrappleBreakdown(actor) {
  const bab = actor.system.bab?.total || actor.system.baseAttackBonus || 0;
  const strMod = actor.system.attributes?.str?.mod || 0;
  const sizeModifier = 0; // or calculated from actor size
  const miscMod = actor.system.grapple?.miscMod || 0;

  const rows = [
    { label: 'BAB', value: bab, semantic: 'neutral' },
    { label: 'Strength', value: strMod, semantic: strMod > 0 ? 'positive' : ... },
    { label: 'Size', value: sizeModifier, semantic: 'neutral' },
    { label: 'Misc', value: miscMod, semantic: ... }
  ];

  const total = bab + strMod + sizeModifier + miscMod;

  return {
    title: 'Grapple',
    definition: 'Your bonus to unarmed melee attacks and grappling.',
    rows,
    total
  };
}
```

#### 3. Initiative Provider
**Location:** CombatStatsTooltip

**Composition:**
- Dexterity modifier
- Misc/training bonuses
- Condition penalties (if any)
- Modifiers
- Total

**Breakdown Useful?** YES - helps players understand initiative calculation

**Implementation:**
```javascript
static getInitiativeBreakdown(actor) {
  const dexMod = actor.system.attributes?.dex?.mod || 0;
  const miscMod = actor.system.initiative?.miscMod || 0;
  const condition = actor.system.conditionTrack?.current || 0;
  const conditionPenalty = condition > 0 ? -condition : 0; // Simplified
  const modifiers = this._getModifiersForInitiative(actor);

  const rows = [
    { label: 'Dexterity', value: dexMod, semantic: dexMod > 0 ? 'positive' : ... },
    { label: 'Misc', value: miscMod, semantic: ... },
    { label: 'Condition', value: conditionPenalty, semantic: 'negative' }
  ];

  const total = dexMod + miscMod + conditionPenalty + (modifiers sum);

  return {
    title: 'Initiative',
    definition: 'How quickly you act in combat.',
    rows,
    total
  };
}
```

#### 4. Damage Threshold Provider
**Location:** DefenseTooltip (defense-adjacent)

**Composition:**
- Base armor value
- Material/enhancement bonus
- Condition penalties (if applicable)
- Modifiers
- Total

**Breakdown Useful?** MAYBE - depends on current system
- If DT is just "equipped armor", breakdown is trivial
- If DT is derived from multiple sources, breakdown is useful
- **Decision:** Audit current DT calculation. If trivial, leave definition-only.

**Implementation:** (if needed)
```javascript
static getDamageThresholdBreakdown(actor) {
  const armorDT = actor.system.damageThreshold?.armorBonus || 0;
  const miscMod = actor.system.damageThreshold?.miscMod || 0;

  const rows = [
    { label: 'Armor', value: armorDT, semantic: 'neutral' },
    { label: 'Misc', value: miscMod, semantic: ... }
  ];

  const total = armorDT + miscMod;

  return {
    title: 'Damage Threshold',
    definition: 'Damage reduction from armor and equipment.',
    rows,
    total
  };
}
```

---

## Part 2: Tier-Aware Help System Design

### Current State
- Binary on/off help mode
- All tier1 hardpoints get affordances in help mode
- No tier2/tier3 visibility

### Proposed Tier-Aware Model

**Four Help Levels:**
```
OFF       = No help affordances; icon-only tooltips still available
CORE      = Tier1 concepts discoverable (current "help ON" behavior)
STANDARD  = Tier1 + Tier2 concepts discoverable
ADVANCED  = Tier1 + Tier2 + Tier3 concepts discoverable (everything)
```

**Behavior:**
- OFF: minimal noise, tooltips only on hover for icons
- CORE: shows help affordances on tier1 (core player concepts)
- STANDARD: adds tier2 affordances (situational, secondary stats)
- ADVANCED: shows everything including tier3 (advanced mechanics)

**Implementation Approach:**
1. Replace `this._helpModeActive` with `this._helpLevel = 'OFF'|'CORE'|'STANDARD'|'ADVANCED'`
2. Update affordance CSS to use data attribute: `data-help-tier="tier1|tier2|tier3"`
3. Only show affordance if `actor's help level >= concept's tier level`
4. Keep toggle UI calm (cycling button or simple selector)

### Tier Assignment (from Phase 7 glossary)

**Tier 1 (Always shown):**
- Abilities (6)
- Skills (18)
- Defenses (4)
- HP, DT, FP, DP, Condition, Initiative, BAB, Grapple

**Tier 2 (Standard + Advanced):**
- Equipment stats (weapon attack, weapon damage, armor penalty)
- Action Palette
- Subsystem controls

**Tier 3 (Advanced only):**
- Feats, talents
- Force powers
- Advanced mechanics
- (Not yet on V2 sheet)

---

## Part 3: Provider Output Normalization

### Current Issue
- DefenseTooltip returns `getBreakdownStructure()` with normalized rows
- WeaponTooltip returns `getAttackBreakdownContent()` with plain-text body
- Need to consolidate all providers to same structure

### Normalized Row Shape

**Required:**
```javascript
{
  label: string,      // "Dexterity", "Armor Bonus", etc.
  value: number,      // The numeric contribution
  semantic: string    // "positive" | "neutral" | "negative"
}
```

**Optional:**
```javascript
{
  detail?: string,    // Additional context (e.g., "from Keen weapon")
  source?: string,    // Semantic source key for tracking
  modifier?: boolean  // True if from modifiers, false if from base calc
}
```

### Normalized Breakdown Structure

**Required (all providers):**
```javascript
{
  title: string,                     // "Reflex Defense"
  definition: string,                // One-sentence explanation
  rows: Array<{label, value, semantic, ...}>,
  total: number,
  metadata?: {concept, actor, sourceElement}
}
```

### Consolidation Plan

1. **DefenseTooltip:** Already normalized ✅
2. **WeaponTooltip:** Add `getAttackBreakdownStructure()` and `getDamageBreakdownStructure()` methods
3. **CombatStatsTooltip** (new): BAB, Grapple, Initiative
4. Verify all providers return same shape
5. No ad hoc text rendering in providers

---

## Part 4: Help Persistence Implementation

### Lightweight Persistence Strategy

**Option A: Sheet Instance State (Safest)**
- Store `this._helpLevel` on sheet instance
- Resets on close (clean slate)
- Pros: no side effects, no persistence issues
- Cons: doesn't persist across reopenings

**Option B: Actor Flags (Recommended if compatible)**
- Store in `actor.flags.swse.helpLevel`
- Persists with character
- Pros: per-character preference is sensible
- Cons: requires flag validation, adds data to actor

**Option C: User Client Setting (Global)**
- `game.settings.get('foundryvtt-swse', 'defaultHelpLevel')`
- Persists globally for all sheets
- Pros: simpler, works for all characters
- Cons: less granular (not per-character)

**Recommendation:** Option B (actor flags) is most sensible
- Players naturally have different characters with different help needs
- Respects existing project patterns for character-level customization
- Still lightweight (single flag value)

**Implementation:**
```javascript
// On sheet init
this._helpLevel = this.document.flags?.['foundryvtt-swse']?.helpLevel || 'OFF';

// On help level change
this._helpLevel = newLevel;
await this.document.setFlag('foundryvtt-swse', 'helpLevel', newLevel);

// On render
// Update TooltipRegistry and affordance visibility based on this._helpLevel
```

---

## Part 5: Template Integration Strategy

### Current V2 Sheet Hardpoints
- Defenses (already wired with data-breakdown)
- Abilities
- Skills

### New Hardpoints to Wire (Phase 9)
- Base Attack Bonus (resources-panel.hbs)
- Grapple (resources-panel.hbs)
- Initiative (resources-panel.hbs)
- Damage Threshold (resources-panel.hbs or HP panel)
- Weapon attack/damage (if displayed on sheet)

### Wiring Pattern
```hbs
<div class="resource-stat"
     data-breakdown="BaseAttackBonus"
     data-help-tier="tier1"
     title="Base Attack Bonus — click for breakdown">
  {{bab}}
</div>
```

### Affordance Styling
```css
/* Only show in appropriate help levels */
[data-help-tier="tier1"] {
  /* Show if helpLevel is CORE, STANDARD, or ADVANCED */
}

[data-help-tier="tier2"] {
  /* Show if helpLevel is STANDARD or ADVANCED */
}

[data-help-tier="tier3"] {
  /* Show only if helpLevel is ADVANCED */
}

/* Subtle affordance: inset glow, no loud change */
.help-mode-active [data-breakdown][data-help-tier] {
  box-shadow: inset 0 0 6px rgba(0, 200, 255, 0.15);
}
```

---

## Part 6: Click/Hover Refinement

### Current Behavior (Phase 8)
- Hover: shows micro-tooltip after 250ms
- Click: opens pinned breakdown card

### Refinements (Phase 9)

1. **Hover Tier-Awareness**
   - Only show tooltip if concept's tier <= current help level
   - Example: tier2 tooltip doesn't show if help level is OFF

2. **Click Availability**
   - Click opens breakdown only if:
     - Element has [data-breakdown] attribute
     - Concept tier <= help level (or breakdowns always available?)
   - Decision: breakdowns should **always** be available if clicked (tiers control discovery, not access)

3. **Affordance Visibility**
   - Inset glow only appears if help level is suitable for tier
   - Cursor change subtle, not obvious

4. **Dismissal Consistency**
   - Click-away: closes card
   - Escape: closes card
   - Close button: closes card
   - Rerender: closes card
   - Help level change: closes card (clean state)

---

## Part 7: Documentation Structure

### Files to Update
1. `docs/TOOLTIP_ARCHITECTURE.md`
   - Add "Tier-Aware Help System" section
   - Document help levels: OFF/CORE/STANDARD/ADVANCED
   - Document tier assignment
   - Document persistence behavior

2. `TOOLTIP_REGRESSION_CHECKLIST.md`
   - Add help level switching tests
   - Add tier discoverability checks
   - Add persistence tests

3. `PHASE-9-IMPLEMENTATION-COMPLETE.md` (new)
   - Summary of Phase 9 completion
   - Provider implementations
   - Help system details
   - Testing results

---

## Part 8: Testing Checklist (Phase 9)

- [ ] BAB breakdown opens/closes correctly
- [ ] Grapple breakdown opens/closes correctly
- [ ] Initiative breakdown opens/closes correctly
- [ ] DT breakdown (if implemented) works
- [ ] Weapon breakdowns normalized
- [ ] All rows use semantic colors correctly
- [ ] Help level OFF: no affordances
- [ ] Help level CORE: tier1 affordances only
- [ ] Help level STANDARD: tier1 + tier2 affordances
- [ ] Help level ADVANCED: all affordances
- [ ] Help level persists across rerender
- [ ] Help level persists across sheet close/reopen
- [ ] Hover shows tooltip only if tier-appropriate
- [ ] Click opens breakdown (regardless of help level)
- [ ] Click-away closes card
- [ ] Escape closes card
- [ ] Help level change closes open card
- [ ] No duplicate cards or stale state
- [ ] Keyboard navigation works
- [ ] Reduced motion respected
- [ ] No console errors

---

## Timeline & Dependencies

**Critical Path:**
1. Implement missing providers (BAB, Grapple, Initiative, DT) — ~2-3 hours
2. Normalize all provider outputs — ~1-2 hours
3. Implement tier-aware help system — ~2-3 hours
4. Implement persistence — ~1 hour
5. Wire templates — ~1 hour
6. Test and polish — ~2-3 hours
7. Document — ~1-2 hours

**Total Estimated:** ~10-14 hours of focused work

---

## Success Criteria for Phase 9

✅ All core derived stats (BAB, Grapple, Initiative, DT) have meaningful breakdowns
✅ Glossary tier model is now real player-facing behavior
✅ Help system graduated: OFF/CORE/STANDARD/ADVANCED
✅ Help preference persists per-character
✅ Hover and click coexist cleanly
✅ All providers output normalized structure
✅ V2 character sheet is reference implementation
✅ No second system introduced
✅ Calm, curated, holo-integrated feel maintained
✅ Ready for Phase 8+ (other sheets) expansion

---

## Notes & Caveats

**Out of Scope (Phase 10+):**
- Weapon/equipment sheets
- NPC/droid/vehicle sheets
- Feat/talent tooltips
- Force power help
- Advanced tutorial system

**Decisions to Make:**
- Should help level changes close open card? (YES - clean state)
- Should breakdowns always be clickable regardless of help level? (YES - click is intent, tiers control discovery)
- Should weapon breakdowns be on V2 sheet? (DEFER if not currently displayed)
- Default help level for new characters? (CORE - reasonable middle ground)

---

**Next Steps:** Begin implementation starting with provider implementations.
