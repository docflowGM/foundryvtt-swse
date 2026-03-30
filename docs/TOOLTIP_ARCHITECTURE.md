# SWSE Tooltip System Architecture

**Phase 7: Durable Content Platform**

This document describes the authoritative architecture of the SWSE tooltip system after Phase 7 refactoring. It covers the canonical glossary, tier model, definition vs. breakdown separation, anti-spam policy, and developer workflows.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Canonical Glossary](#canonical-glossary)
3. [Tier Model](#tier-model)
4. [Definition vs. Breakdown](#definition-vs-breakdown)
5. [Structured Content Schema](#structured-content-schema)
6. [Anti-Spam Policy](#anti-spam-policy)
7. [Developer Workflows](#developer-workflows)
8. [Regression Checklist](#regression-checklist)
9. [Future Expansion](#future-expansion)

---

## Architecture Overview

The SWSE tooltip system is built on **three stable layers**:

### Layer 1: Canonical Glossary
- **File:** `scripts/ui/discovery/tooltip-glossary.js`
- **Purpose:** Single source of truth for all tooltip metadata and content references
- **Content:** Semantic keys, categories, tiers, i18n references, related concepts
- **Responsibility:** Content organization, tier management, expansion roadmap

### Layer 2: Tooltip Registry
- **File:** `scripts/ui/discovery/tooltip-registry.js`
- **Purpose:** Discovery and binding engine
- **Content:** DOM binding logic, hover delay timers, tooltip positioning
- **Responsibility:** UI behavior (when/how to show tooltips), hover state management
- **Data Source:** Builds TOOLTIP_DEFS dynamically from the glossary

### Layer 3: Breakdown Providers
- **Files:** `scripts/ui/defense-tooltip.js`, `scripts/ui/weapon-tooltip.js`
- **Purpose:** Complex math explanation generators
- **Content:** Breakdown algorithms, modifier lookups, component calculations
- **Responsibility:** "Where did this number come from?" (NOT "what is this?")
- **Registration:** Call `TooltipRegistry.registerBreakdownProvider()` at system init

### Integration Point: V2 Character Sheet
- **File:** `scripts/sheets/v2/character-sheet.js`
- **Hardpoints:** 45+ curated `data-swse-tooltip` attributes in templates
- **Binding:** Calls `TooltipRegistry.bind()` during render lifecycle
- **Help Mode:** Per-sheet toggle that activates affordances without changing delays

---

## Canonical Glossary

### Purpose

The canonical glossary (`tooltip-glossary.js`) is the **authoritative home** for all tooltip definitions and metadata. It ensures:

- **No duplication** across files
- **Single point of update** for tooltip changes
- **Consistent structure** for new contributors
- **Localization safety** (no inline HTML or human-copy baked into code)
- **Future expansion** ready (tier model, category browsing, validation)

### Structure

Each glossary entry follows this schema:

```javascript
ExampleKey: {
  key: 'ExampleKey',              // Semantic identifier (used in data-swse-tooltip)
  label: 'Example Label',          // Human-readable name
  category: 'core-mechanics',      // Grouping: core-mechanics, skills, defenses, etc.
  tier: 'tier1',                   // Expansion control: tier1, tier2, tier3
  short: 'Brief one-liner',        // Elevator pitch (used in hover tooltip)
  long: 'Full explanation...',     // Extended definition (rarely used directly)
  hasBreakdown: true|false,        // Whether this has a breakdown provider
  breakdownKey: 'OptionalKey',     // (Optional) semantic key for breakdown lookup
  i18nPrefix: 'SWSE.Discovery...', // i18n key prefix (system appends .Title, .Body)
  related: ['OtherKey1', 'OtherKey2'], // (Optional) related concepts
  tags: ['tag1', 'tag2'],          // (Optional) searchable tags
  notes: 'Internal notes...'       // (Optional) developer notes/metadata
}
```

### Example: Defense

```javascript
ReflexDefense: {
  key: 'ReflexDefense',
  label: 'Reflex Defense',
  category: 'defenses',
  tier: 'tier1',
  short: 'Dodge and quick reactions',
  long: 'Reflex Defense is what enemies roll against to hit you...',
  hasBreakdown: true,
  breakdownKey: 'ReflexDefenseBreakdown',
  i18nPrefix: 'SWSE.Discovery.Tooltip.ReflexDefense',
  related: ['Dexterity', 'BaseAttackBonus'],
  tags: ['defense', 'derived', 'dexterity'],
  notes: 'Primary defense for ranged attacks. Breakdown shows base, modifiers, bonuses.'
}
```

### Content Localization

The glossary itself contains **no human-facing copy**. All user-facing text lives in `lang/en.json`:

```json
{
  "SWSE": {
    "Discovery": {
      "Tooltip": {
        "ReflexDefense": {
          "Title": "Reflex Defense",
          "Body": "Reflex Defense is what enemies must roll against to hit you. Based on 10 + Dexterity modifier + other bonuses. Protects against ranged attacks, grenades, and rapid strikes."
        }
      }
    }
  }
}
```

The registry and glossary only reference the i18n key (`SWSE.Discovery.Tooltip.ReflexDefense`), ensuring:
- **Localization safety:** Easy translation without code changes
- **Single source:** All copy is in one place
- **Version control clarity:** i18n file shows what's been added/changed
- **No duplicated explanations:** No copy in JS, templates, or CSS

### Helpers

The glossary exports utility functions for introspection:

```javascript
// Get a single entry with metadata
import { getGlossaryEntry } from 'tooltip-glossary.js';
const entry = getGlossaryEntry('ReflexDefense');

// Get all entries by tier (for future tier-based behavior)
import { getEntriesByTier } from 'tooltip-glossary.js';
const tier1Entries = getEntriesByTier('tier1');

// Get all entries by category (for related-concept lookup)
import { getEntriesByCategory } from 'tooltip-glossary.js';
const defenseEntries = getEntriesByCategory('defenses');

// Check if a key is valid (useful in development)
import { isValidTooltipKey } from 'tooltip-glossary.js';
if (!isValidTooltipKey('SomeKey')) {
  console.warn('Glossary does not define SomeKey');
}
```

---

## Tier Model

### Purpose

The tier model organizes tooltips by **importance and expansion stage**, preventing spam while supporting future growth.

### Three Tiers

#### Tier 1: Core, Always Valuable
- **Abilities** (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
- **Skills** (all 18)
- **Defenses** (Reflex, Fortitude, Will, Flat-Footed)
- **HP, Damage Threshold, Force Points, Destiny Points**
- **Core combat stats** (Initiative, Base Attack Bonus, Grapple)
- **Condition Track**

**Behavior:**
- Shown in help mode on hover (250ms delay)
- Pinned breakdown cards can be clicked to expand
- Should never be disabled or behind advanced toggle

#### Tier 2: Situational Secondary Stats
- Equipment stats (Weapon Attack, Weapon Damage, Armor Penalty)
- Action Palette controls
- Subsystem labels and UI features
- Non-core derived values

**Behavior:**
- Available but not highlighted by default
- Useful in specific contexts (combat, equipment management)
- May become prominent if related feature is active

#### Tier 3: Advanced/Niche Mechanics
- Feats and Talents (deferred to Phase 8+)
- Force powers (deferred to Force sheet)
- Vehicles, Droids (deferred to other sheets)
- GM-only tools (deferred)
- Chargen-specific guidance (separate chargen app)

**Behavior:**
- Not shown on main character sheet
- Expand to relevant subsystems only
- Advanced players may explicitly seek these

### Using Tiers in Development

#### Current (Phase 7)
Tiers are used for **organization and documentation**:
- Clear categorization of what's current vs. future
- Prevents unintended expansion to unready subsystems
- Helps plan Phase 8+ rollout

#### Future (Phase 8+)
Tiers can support **behavior control**:
- Tier filtering for "basic help" vs. "advanced help" modes
- Automatic UI generation based on tier
- Deprecation/removal workflows (mark as tier3, drop to tier4 as obsolete)
- New player tutorials (start with tier1 only)

---

## Definition vs. Breakdown

### The Separation

**DEFINITIONS** answer:
- "What is this?"
- "Why does it matter?"
- "When would I use this?"

Example definition (from glossary):
```
Reflex Defense: "Reflex Defense is what enemies roll against to hit you.
Based on 10 + Dexterity modifier + other bonuses. Protects against ranged
attacks, grenades, and rapid strikes."
```

**BREAKDOWNS** answer:
- "Where did this number come from?"
- "What are all the components?"
- "How do I improve it?"

Example breakdown (from DefenseTooltip provider):
```
Reflex Defense Breakdown:
  Base Calculation:
    Base: 10
    ½ Level: +5
    Ability (Dex): +3
    Class: +2
    Misc: +0
    Subtotal: 20

  Active Modifiers (2):
    Quick Reflexes Talent: +1
    Shield Bonus: +2

  Final Defense: 23
```

### Why Separate?

1. **Clarity:** One file for "what" (glossary), one for "how" (providers)
2. **Maintainability:** Update definitions once, breakdowns follow automatically
3. **Reusability:** Definitions can be used for tooltips, journal entries, help text
4. **Scope:** Keep definitions concise; let breakdowns be detailed
5. **Scalability:** Easy to add new breakdowns without changing definitions

### Architecture in Code

#### Definitions (In Glossary + Localization)

```javascript
// tooltip-glossary.js
ReflexDefense: {
  key: 'ReflexDefense',
  label: 'Reflex Defense',
  // ... metadata ...
  hasBreakdown: true,  // ← This concept CAN have a breakdown
  i18nPrefix: 'SWSE.Discovery.Tooltip.ReflexDefense',
}
```

```json
// lang/en.json
"ReflexDefense": {
  "Title": "Reflex Defense",
  "Body": "What is Reflex Defense and why it matters..."
}
```

#### Breakdowns (In Providers)

```javascript
// defense-tooltip.js
static registerProviders() {
  // Register semantic breakdown lookup
  TooltipRegistry.registerBreakdownProvider(
    'ReflexDefenseBreakdown',  // semantic key
    (actor) => this.getBreakdownContent(actor, 'reflex')
  );
}

static getBreakdownContent(actor, defenseKey) {
  const data = this.getDefenseBreakdown(actor, defenseKey);
  return {
    title: `${data.label} Defense Breakdown`,
    body: this.generateBreakdownText(data, defenseKey)  // ← Detailed math
  };
}
```

#### Registry Integration

```javascript
// tooltip-registry.js
const entry = TooltipRegistry.getEntry('ReflexDefense');
if (entry.hasBreakdown) {
  const provider = TooltipRegistry.getBreakdownProvider(entry.breakdownKey);
  // Now you can call provider(actor) to get detailed breakdown
}
```

---

## Structured Content Schema

### Purpose

Provide a clear, repeatable schema for **adding new tooltips safely** without guessing or duplicating effort.

### The Schema (Checklist)

When adding a new tooltip concept, follow this process:

#### 1. Add to Glossary

File: `scripts/ui/discovery/tooltip-glossary.js`

```javascript
NewConcept: {
  key: 'NewConcept',                           // Unique identifier
  label: 'New Concept',                        // Display name
  category: 'appropriate-category',            // Group it logically
  tier: 'tier1',                               // Where does it fit?
  short: 'One-liner explanation',              // Hover tooltip text
  long: 'Full explanation if needed',          // (Optional) extended text
  hasBreakdown: false,                         // Does this need math breakdown?
  i18nPrefix: 'SWSE.Discovery.Tooltip.NewConcept',
  related: ['RelatedConcept1', 'RelatedConcept2'],  // (Optional)
  tags: ['tag1', 'tag2'],                      // (Optional) for future filtering
  notes: 'Developer notes...'                  // (Optional) internal guidance
}
```

#### 2. Add Localization

File: `lang/en.json`

```json
"SWSE": {
  "Discovery": {
    "Tooltip": {
      "NewConcept": {
        "Title": "New Concept",
        "Body": "Full explanation of what this is and why it matters. Keep calm, player-facing tone. No mentor voice here."
      }
    }
  }
}
```

#### 3. (Optional) Register Breakdown Provider

If `hasBreakdown: true`, create a provider:

File: `scripts/ui/defense-tooltip.js` or new file:

```javascript
// In registerProviders()
TooltipRegistry.registerBreakdownProvider('NewConceptBreakdown', (actor) => {
  // Calculate and return { title, body }
  return {
    title: 'New Concept Breakdown',
    body: 'Detailed mathematical explanation...'
  };
});
```

#### 4. Add Hardpoint to Template

File: `templates/actors/character/v2/partials/*.hbs`

```hbs
<div class="my-element" data-swse-tooltip="NewConcept">
  {{displayValue}}
</div>
```

#### 5. (Optional) Add CSS for Help Mode Affordance

File: `styles/sheets/v2-sheet.css`

```css
/* Help mode visual affordance (inset glow) */
.swse-sheet.help-mode-active [data-swse-tooltip="NewConcept"]:hover,
.swse-sheet.help-mode-active [data-swse-tooltip="NewConcept"]:focus {
  box-shadow: inset 0 0 6px rgba(0, 200, 255, 0.15);
}

/* Optional: custom hover delay if needed */
[data-swse-tooltip="NewConcept"] {
  --tooltip-delay: 250ms; /* or override if needed */
}
```

#### 6. Validate

Run these checks:

```javascript
// In browser console
import { isValidTooltipKey } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js';

// Verify the glossary entry
if (isValidTooltipKey('NewConcept')) {
  console.log('✓ Glossary entry exists');
} else {
  console.error('✗ Glossary entry missing!');
}

// Check localization
const title = game.i18n.localize('SWSE.Discovery.Tooltip.NewConcept.Title');
const body = game.i18n.localize('SWSE.Discovery.Tooltip.NewConcept.Body');
console.log('Title:', title);
console.log('Body:', body);

// Check if registry recognizes it
const entry = SWSEDiscovery.tooltips.getEntry('NewConcept');
console.log('Entry:', entry);
```

---

## Anti-Spam Policy

### Philosophy

**Calm > Comprehensive**. The goal is discoverable help, not mandatory education. Tooltips should feel like holopad guidance, not spam.

### What Should Get a Tooltip?

#### ✓ ALWAYS Add Tooltips For:
1. **Core rules mechanics** that players must understand to play effectively
   - Abilities, skills, defenses, HP, conditions
   - Initiative, Base Attack Bonus, Grapple
   - Force Points, Destiny Points

2. **Icon-only controls** where the icon itself doesn't explain the action
   - Roll buttons, favorite toggles, gear buttons
   - Quick-actions with no text label

3. **Derived stats** whose source isn't obvious
   - "Why is my Reflex Defense 23?"
   - "How did I get +5 to attack?"

4. **Warnings or special states** that need immediate explanation
   - Flat-footed defense vs. normal
   - Condition track penalties
   - Encumbrance effects

#### ⚠ SOMETIMES Add Tooltips For:
1. **Secondary derived stats** where context is visible nearby
   - Damage Threshold (context: "your armor")
   - Grapple (context: "melee combat")

2. **Subsystem labels** that introduce a new concept
   - "What is the Action Palette?"
   - But NOT "what is this input field?"

3. **Expert-level mechanics** that experts will want but novices can ignore
   - Armor penalties to specific skills
   - Encumbrance rules
   - Advanced condition effects

#### ✗ NEVER Add Tooltips For:
1. **Obvious labels** where text speaks for itself
   - "Name" field → no tooltip needed
   - "Notes" section → no tooltip needed
   - "HP" with a number → maybe tooltip, but not for the label

2. **Repeated items** where tooltip would create noise
   - Don't tooltip every skill row separately if one explanation suffices
   - Don't tooltip every ability if you can explain once in help text
   - Don't tooltip every modifier source if you can explain in header

3. **Plain-text buttons** with clear action text
   - "Delete Item" → label is clear
   - "Add Class Feature" → label is clear
   - "Close" or "Cancel" → obvious

4. **Generic UI patterns** that don't need game-specific help
   - Standard form controls
   - Navigation tabs
   - Standard dialog buttons

5. **Large prose sections** that should be read, not hovered
   - Character biography
   - Campaign notes
   - Journal entries
   - Detailed ability descriptions that need to be read, not skimmed

6. **Fields whose purpose is self-evident from context**
   - Input field next to "Strength" label
   - Dropdown in "Choose Species" wizard
   - Checkbox next to "Proficient with Blasters"

### The Spam Test

Before adding a hardpoint, ask yourself:

1. **New player test:** Would a new player wonder what this means?
   - YES → Consider tooltip
   - NO → Don't add

2. **Context test:** Is the purpose clear from nearby labels/context?
   - YES → Skip tooltip
   - NO → Add tooltip

3. **Density test:** If I enable help mode, would this area feel cluttered?
   - YES → Reconsider or reduce scope
   - NO → Safe to add

4. **Redundancy test:** Is this just repeating info from a tooltip on similar row?
   - YES → Use one shared tooltip or skip
   - NO → Safe to add

5. **Reading level test:** Does this require explanation or just clarity?
   - EXPLANATION → Good tooltip candidate
   - JUST CLARITY → Consider plain label change instead

### Current Hardpoints: Anti-Spam Review

**Tier 1 Character Sheet (45+ hardpoints):**
- ✓ All abilities (6) — Tier 1, frequently rolled, worth explaining
- ✓ All skills (18) — Tier 1, new players often confused, worth guiding
- ✓ All defenses (4) — Tier 1, core mechanic, worth explaining
- ✓ Core resources (4: HP, DT, FP, DP) — Tier 1, essential
- ✓ Core combat stats (3: Initiative, BAB, Grapple) — Tier 1, essential
- ✓ Condition Track — Tier 1, visual indicator of important state

**Overall:** 45 hardpoints on a complex character sheet is appropriate because:
- They cover only Tier 1 concepts that all players should understand
- They're clustered in logical groups (not scattered everywhere)
- Help mode is OFF by default (calm gameplay)
- Help mode ON feels like guided learning, not spam
- Hardpoints are curated, not auto-generated

---

## Developer Workflows

### Adding a New Tooltip (Step-by-Step)

#### Scenario: "I want to add a tooltip for the 'Speed' stat"

1. **Open glossary, add entry:**

   ```javascript
   // scripts/ui/discovery/tooltip-glossary.js
   Speed: {
     key: 'Speed',
     label: 'Speed',
     category: 'core-mechanics',
     tier: 'tier1',
     short: 'How far you can move per round',
     long: 'Speed determines your movement rate in feet per round...',
     hasBreakdown: false,
     i18nPrefix: 'SWSE.Discovery.Tooltip.Speed',
     related: ['Initiative', 'Acrobatics'],
     tags: ['movement', 'core'],
     notes: 'Deferred to Phase 8+ if expanded to vehicles.'
   }
   ```

2. **Add localization:**

   ```json
   // lang/en.json
   "Speed": {
     "Title": "Speed",
     "Body": "Speed is how many feet you can move per round. Use this in combat to determine where you can go. Can be modified by encumbrance, terrain, or conditions."
   }
   ```

3. **Add template attribute:**

   ```hbs
   <!-- templates/actors/character/v2/partials/resources-panel.hbs -->
   <div class="speed-display" data-swse-tooltip="Speed">
     {{actor.system.speed}} ft.
   </div>
   ```

4. **Validate (in browser console):**

   ```javascript
   const entry = SWSEDiscovery.tooltips.getEntry('Speed');
   console.log('Speed entry:', entry);

   const title = game.i18n.localize('SWSE.Discovery.Tooltip.Speed.Title');
   console.log('Speed title:', title);

   // Hover over the speed display to see tooltip
   ```

5. **Test:**
   - Open character sheet
   - Hover over Speed display → tooltip should appear after 250ms
   - Toggle help mode ON → inset glow should appear on hover
   - Toggle help mode OFF → glow disappears
   - Tab to Speed display → tooltip should appear on focus

### Adding a Breakdown Provider

#### Scenario: "I want to show detailed Speed calculation (base speed + bonuses)"

1. **Create provider in new file or existing provider file:**

   ```javascript
   // scripts/ui/speed-tooltip.js
   export class SpeedTooltip {
     static registerProviders() {
       TooltipRegistry.registerBreakdownProvider('SpeedBreakdown', (actor) => {
         return this.getBreakdownContent(actor);
       });
     }

     static getBreakdownContent(actor) {
       const baseSpeed = actor.system.baseSpeed || 30;
       const bonuses = actor.system.derived?.speedBonuses || [];
       const penalties = actor.system.derived?.speedPenalties || [];

       let lines = [];
       lines.push('Speed Calculation:');
       lines.push(`  Base: ${baseSpeed} ft.`);

       let totalBonus = 0;
       if (bonuses.length > 0) {
         lines.push(`  Bonuses:`);
         bonuses.forEach(b => {
           lines.push(`    ${b.name}: +${b.value}`);
           totalBonus += b.value;
         });
       }

       let totalPenalty = 0;
       if (penalties.length > 0) {
         lines.push(`  Penalties:`);
         penalties.forEach(p => {
           lines.push(`    ${p.name}: −${p.value}`);
           totalPenalty += p.value;
         });
       }

       const total = baseSpeed + totalBonus - totalPenalty;
       lines.push(`  Total: ${total} ft.`);

       return {
         title: 'Speed Breakdown',
         body: lines.join('\n')
       };
     }
   }
   ```

2. **Register in discovery system init:**

   ```javascript
   // scripts/ui/discovery/index.js
   import { SpeedTooltip } from "/systems/foundryvtt-swse/scripts/ui/speed-tooltip.js";

   export function initializeDiscoverySystem() {
     // ... existing code ...
     SpeedTooltip.registerProviders();
   }
   ```

3. **Update glossary to mark breakdown available:**

   ```javascript
   // tooltip-glossary.js
   Speed: {
     // ... other fields ...
     hasBreakdown: true,
     breakdownKey: 'SpeedBreakdown'
   }
   ```

4. **In future: wire UI to call breakdown**

   ```javascript
   // (Phase 8+ when pinned breakdowns are implemented)
   const provider = TooltipRegistry.getBreakdownProvider('SpeedBreakdown');
   const breakdown = provider(actor);
   // Display breakdown in modal or pinned card
   ```

### Auditing Existing Tooltips

Use this workflow to review for spam or outdated content:

```javascript
// In browser console (with devMode enabled)
SWSEDiscovery.glossary; // View all entries

// Find all tier1 tooltips
const tier1 = Object.values(SWSEDiscovery.glossary)
  .filter(e => e.tier === 'tier1');
console.table(tier1);

// Find all tooltips in a category
const defenses = Object.values(SWSEDiscovery.glossary)
  .filter(e => e.category === 'defenses');
console.table(defenses);

// Find all tooltips with breakdowns
const withBreakdowns = Object.values(SWSEDiscovery.glossary)
  .filter(e => e.hasBreakdown);
console.table(withBreakdowns);

// Check if a tooltip is properly localized
const entry = SWSEDiscovery.glossary['HitPoints'];
const title = game.i18n.localize(entry.i18nPrefix + '.Title');
const body = game.i18n.localize(entry.i18nPrefix + '.Body');
console.log('Title:', title);
console.log('Body:', body);
```

---

## Regression Checklist

Use this checklist when making changes to the tooltip system to ensure nothing breaks.

### Core Binding & Rendering

- [ ] Tooltips appear on hover of `data-swse-tooltip` elements
- [ ] Hover delay respected (250ms default, 1000ms for icon buttons)
- [ ] Tooltip hides when mouse leaves element before delay expires
- [ ] Tooltip disappears on mouseleave after appearing
- [ ] Tooltip disappears on blur (keyboard navigation)
- [ ] Tooltips position correctly (no overlap, flip below if needed)
- [ ] Multiple tooltips don't accumulate (old tooltip removed before new one shows)

### Help Mode

- [ ] Help toggle button appears in sheet-actions bar
- [ ] Toggling help mode updates button visual state (.active class)
- [ ] Toggling help mode adds/removes .help-mode-active class on sheet
- [ ] Help mode state syncs with TooltipRegistry.isHelpMode()
- [ ] Affordance (inset glow) appears on hardpoints in help mode
- [ ] Affordance disappears when help mode is OFF
- [ ] Tooltip delays don't change based on help mode (only affordances do)

### Accessibility

- [ ] All `data-swse-tooltip` elements are focusable (tabindex auto-added)
- [ ] Focus triggers tooltip appearance with same delay as hover
- [ ] Blur hides tooltip
- [ ] Keyboard navigation doesn't break tooltip behavior
- [ ] Reduced motion media query is respected (no animations)

### Glossary & Registry

- [ ] Glossary imports correctly in registry
- [ ] TOOLTIP_DEFS builds correctly from glossary
- [ ] All current hardpoints have matching glossary entries
- [ ] TooltipRegistry.getEntry() works for all entries
- [ ] TooltipRegistry.glossary exposes full glossary
- [ ] getGlossaryEntry() helpers work correctly
- [ ] isValidTooltipKey() correctly validates/rejects keys

### Breakdown Providers

- [ ] DefenseTooltip.registerProviders() called on init
- [ ] WeaponTooltip.registerProviders() called on init
- [ ] Defense breakdowns register with correct semantic keys
- [ ] Breakdown providers return {title, body} objects
- [ ] Breakdown content is human-readable and accurate
- [ ] No duplicate listeners on rerender (AbortController cleanup works)

### Styling

- [ ] Tooltip visual styling (cyan glow, rounded corners) matches holo design
- [ ] No CSS conflicts from removed `skill-actions.css` pattern
- [ ] Help mode styling (inset glow) is subtle, not jarring
- [ ] Hover delay CSS variable works as intended
- [ ] Reduced motion media query hides animations properly

### Localization

- [ ] All i18n keys in glossary point to valid lang/en.json entries
- [ ] No missing .Title or .Body entries
- [ ] game.i18n.localize() returns proper text, not key placeholders
- [ ] Special characters (−, +, ©) render correctly
- [ ] Line breaks and formatting preserved in tooltip body

### Regression: DOM & Rerendering

- [ ] Sheet rerender doesn't duplicate tooltip listeners
- [ ] Rerender doesn't create orphaned tooltip elements
- [ ] Rerender cleanup (AbortController) works
- [ ] No memory leaks from hover timers
- [ ] No console errors on sheet open/close/rerender
- [ ] Help mode state persists across sheet rerender

### Regression: Integration

- [ ] V2 character sheet loads without errors
- [ ] Tooltips work on all hardpoint elements (HP, abilities, skills, defenses)
- [ ] Help mode toggle visible and functional
- [ ] Other discovery systems (callouts, tour) still work
- [ ] Existing sheet behavior unchanged (rolls, favorites, etc.)

### Cross-Browser/Platform

- [ ] Hover works on desktop (mouse/trackpad)
- [ ] Focus-visible styles work on keyboard navigation
- [ ] No touch-device issues (long-press, etc.)
- [ ] Tooltip positioning works at different zoom levels
- [ ] No console warnings or errors

---

## Future Expansion

### Phase 8: Pinned Breakdown Cards

Once the glossary and providers are solid, implement UI for persistent breakdown cards:

1. Click on a stat with `hasBreakdown: true` → shows modal or pinned card
2. Card displays full breakdown with detailed math
3. Card has close button or click-away dismiss
4. Styled to match holo visual language

**Implementation path:**
```javascript
const entry = TooltipRegistry.getEntry('ReflexDefense');
if (entry.hasBreakdown) {
  const provider = TooltipRegistry.getBreakdownProvider(entry.breakdownKey);
  const breakdown = await provider(actor);
  // Show breakdown in persistent UI
}
```

### Phase 8+: Expand to Other Sheets

Use the established patterns to add tooltips to:
- NPC sheets (use same glossary + tier filtering)
- Droid sheets (add tier2 entries for droid-specific concepts)
- Vehicle sheets (add tier2 entries for vehicle-specific concepts)
- Item sheets (weapons, armor, equipment)
- Force power sheets (add tier3 Force power entries)

### Phase 8+: Help Mode Persistence

Current: Help mode is per-sheet instance, resets on close
Future: Options:
- Per-character flag (actor.flags.foundry-swse.helpMode)
- Global user preference (client setting)
- One-time tutorial activation

### Phase 9: Tier-Based Help System (COMPLETE)

**Status:** ✅ IMPLEMENTED

The glossary tier model is now real player-facing behavior through a graduated help system with four levels:

#### Help Levels

- **OFF:** No help affordances shown; icon-only tooltips still available for direct inspection
- **CORE:** Tier1 concepts only (core player knowledge: abilities, skills, defenses, HP, initiative, BAB, grapple)
- **STANDARD:** Tier1 + Tier2 concepts (situational stats, equipment details, subsystem controls)
- **ADVANCED:** All tiers including Tier3 (expert mechanics, advanced feats, force powers)

#### Tier-Based Visibility Control

**File:** `scripts/sheets/v2/HelpModeManager.js`

Static utility class managing help levels with three key methods:

- `isTierVisible(tier, helpLevel)` — Returns whether a concept at this tier should show affordances
  - OFF: nothing visible (no affordances)
  - CORE: tier1 only
  - STANDARD: tier1 + tier2
  - ADVANCED: all tiers

- `getNextLevel(currentLevel)` — Cycles OFF → CORE → STANDARD → ADVANCED → OFF

- `setHelpLevel(actor, helpLevel)` — Persists to `actor.flags['foundryvtt-swse'].helpLevel`

#### Per-Character Persistence

- Help level defaults to CORE for new characters (reasonable middle ground)
- Persists across sessions via actor flags
- Each character can have different help preference
- On sheet initialization, loads persisted level via `HelpModeManager.initializeForActor(actor)`

#### Template Integration

**Character Sheet Changes:**

- Help toggle button in header cycles through levels and displays current level label with tooltip
- `data-help-tier` attributes on breakdown-capable elements control visibility
- CSS classes applied to sheet root (`help-level--{off|core|standard|advanced}`) drive affordance styling

**Resources Panel:**

- Initiative, BAB, Grapple have `data-breakdown` and `data-help-tier="tier1"` attributes
- Visible in CORE and above

**Defenses Panel:**

- Defense totals already have `data-breakdown` attributes
- Added `data-help-tier="tier1"` for consistency

#### Affordance Styling (CSS)

**File:** `styles/sheets/v2-sheet.css` (Phase 9 additions)

- Tier-based element visibility controlled by help level CSS classes
- Breakdown affordances show inset glow (`box-shadow: inset 0 0 6px rgba(0, 200, 255, 0.15)`) when appropriate tier is visible
- Hover/focus enhancement for breakdown elements
- Reduced motion support for all affordances

#### Breakdown Providers Added (Phase 9)

**File:** `scripts/ui/combat-stats-tooltip.js`

Three new breakdown providers follow normalized row structure:

1. **BaseAttackBonus**
   - Composition: Base (½ level) + Class bonus + Misc + Modifiers
   - Semantic classification: neutral base, positive/negative modifiers

2. **Grapple**
   - Composition: BAB + Strength modifier + Misc + Modifiers
   - Semantic classification: all rows included

3. **Initiative**
   - Composition: Dexterity modifier + Misc + Modifiers + Condition track penalty
   - Semantic classification: positive dex, negative condition penalties

All providers output normalized structure:
```javascript
{
  title: string,
  definition: string,
  rows: [{label, value, semantic}...],
  total: number
}
```

#### Help Mode Interaction Model

- **Hover/Focus:** Shows tier-appropriate tooltips (same as before, but filtered by help level)
- **Click:** Opens pinned breakdown card (always available if breakdown exists, regardless of help level)
  - Intent to understand is respected; tiers control passive discovery only
- **Affordance Visibility:** Inset glow indicates breakdown availability when help tier is appropriate
- **Help Level Change:** Closes any open breakdown card (clean slate)

#### Testing Checklist (Phase 9)

- [ ] Help level OFF: no affordances visible
- [ ] Help level CORE: tier1 affordances only (Abilities, Skills, Defenses, BAB, Grapple, Initiative)
- [ ] Help level STANDARD: tier1 + tier2 affordances
- [ ] Help level ADVANCED: all affordances including tier3
- [ ] Help level cycles correctly: OFF → CORE → STANDARD → ADVANCED → OFF
- [ ] Help level persists across sheet close/reopen
- [ ] Button text shows current level label with tooltip
- [ ] Hover shows tier-appropriate tooltip
- [ ] Click opens breakdown card (same behavior across all help levels)
- [ ] Breakdown card closes on help level change
- [ ] Breakdown affordance glow visible when appropriate
- [ ] Reduced motion: no glow, subtle visual indication only
- [ ] No console errors on help level cycling

### Phase 10+: Auto-Generation Safeguards

If auto-generation is ever considered:
- **Never** auto-generate from labels alone
- **Always** require explicit opt-in per sheet/concept
- **Always** use glossary as source of truth
- **Always** fallback to human-written copy, not auto-generation
- **Always** lint and validate generated content

---

## Summary

The Phase 7 refactoring establishes a **durable, maintainable, spam-resistant tooltip system** by:

1. **Centralizing all content** in a canonical glossary
2. **Separating concerns** (definitions vs. breakdowns)
3. **Introducing tier model** for future expansion control
4. **Documenting anti-spam policy** to keep tooltips calm
5. **Providing structured schema** for safe contributor workflow
6. **Preserving localization safety** with i18n-first approach
7. **Clarifying developer workflows** with examples and checklists

This foundation allows the system to scale to feats, talents, force powers, vehicles, and other subsystems without losing coherence or falling into spam patterns.
