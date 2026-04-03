# Phase 10: Skills Tab Expandable Skill Uses

**Status**: COMPLETED  
**Date**: 2026-04-03  
**Branch**: `claude/refactor-layout-systems-8pRgi`

## Overview

Phase 10 extends the Skills tab refactoring initiated in Phase 9 by adding expandable skill uses to each skill row. This feature surfaces extra skill uses (Jump variations, Perception techniques, etc.) from the canonical `ExtraSkillUseRegistry` system without redesigning the Skills tab or creating duplicate skill-use architectures.

## User-Facing Changes

### Skills Tab Enhancements

**Expand/Collapse Affordance**
- Each skill that has associated extra skill uses now displays a small chevron (▶) button in the skill name column
- The chevron only appears for skills with associated uses; other skills show no affordance
- Clicking the chevron toggles between collapsed (hidden) and expanded (visible) states
- The chevron rotates 90° and glows cyan when expanded for clear visual feedback

**Extra Skill Uses Display**
- When expanded, each skill shows a detail layer beneath the main row
- The layer displays all associated skill uses with smooth slide-down animation
- Each use shows:
  - **Name**: The skill use label (e.g., "Long Jump", "Gather Information")
  - **Description**: Short explanation of what the use does
  - **DC**: Difficulty Class (if applicable), displayed as "DC X"
  - **Action Economy Type**: Color-coded badge showing the action type (Swift, Move, Standard, Full Round, Free, Reaction)
  - **Use Button**: Action affordance to invoke the skill use

**Color-Coded Action Economy**
- Action economy badges use consistent, contextual colors:
  - **⚡ Swift**: Gold (`#ffc400`) - Quick actions within a turn
  - **▶ Move**: Blue (`#4cafff`) - Movement actions
  - **⬤ Standard**: Cyan (`#7ce8ff`) - Primary action per turn
  - **⟲ Full Round**: Red (`#ff6464`) - Actions taking an entire turn
  - **∞ Free**: Green (`#00ff88`) - Actions that don't consume action economy
  - **↩ Reaction**: Purple (`#c87cff`) - Out-of-turn responses
  - **Unknown**: Gray (default fallback)

## Architecture & Implementation

### Data Flow

```
ExtraSkillUseRegistry (canonical loader)
    ↓
_prepareContext() in character-sheet.js
    ↓
For each skill: getForSkill(skillKey, {actor})
    ↓
Normalize with _getTimeClass() & _getTimeLabel()
    ↓
skill.extraUses array in derived context
    ↓
skills-panel.hbs template rendering
    ↓
User interaction with expand/collapse UI
```

### Files Modified

#### 1. `/scripts/sheets/v2/character-sheet.js`

**Import Addition (Line 39)**
```javascript
import { ExtraSkillUseRegistry } from "/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js";
```

**Context Building (Lines 618-645)**
- After initial skill list creation, populates `skill.extraUses` from `ExtraSkillUseRegistry`
- Calls `ExtraSkillUseRegistry.initialize()` to load data (compendium or JSON fallback)
- For each skill, calls `getForSkill(skillKey, {actor})` to fetch accessible uses
- Normalizes each use with visual styling metadata (`timeClass`, `timeLabel`)
- Gracefully handles registry failures with empty arrays fallback

**Helper Methods (Lines 2710-2755)**
- `_getTimeClass(timeValue)`: Maps action economy time strings to CSS class names
  - Handles variations: "swift", "move", "standard", "full", "free", "reaction", "round"
  - Returns `time--{type}` class for color coding
  
- `_getTimeLabel(timeValue)`: Maps action economy time strings to human-readable labels with icons
  - Returns formatted strings like "⚡ Swift", "▶ Move", etc.
  - Provides accessible descriptions for screen readers and tooltips

**Event Handler (Lines 2120-2152)**
- `toggle-skill-expand` click handler in `_activateSkillsUI()`
- Finds the skill row and its associated `.skill-extra-uses` sibling
- Toggles `aria-expanded` attribute on the chevron button
- Switches between `skill-extra-uses--collapsed` and `skill-extra-uses--expanded` classes
- Triggers CSS animations for smooth transitions

#### 2. `/templates/actors/character/v2/partials/skills-panel.hbs`

**Skill Row Enhancement (Lines 26-27)**
- Added `data-skill-extra-uses="{{skill.extraUses.length}}"` attribute for styling context
- Added `data-skill="{{skill.key}}"` for JavaScript targeting

**Skill Name Column (Lines 42-60)**
- Conditional expand/collapse chevron button (only shown if `skill.extraUses.length > 0`)
- Chevron uses `data-action="toggle-skill-expand"` for event delegation
- `aria-expanded="false"` for accessibility (updated dynamically by JavaScript)
- Title attribute shows count: "Expand to show N skill uses"

**Extra Skill Uses Layer (Lines 143-178)**
- Template structure remains but enhanced with visual styling
- Initial state: `skill-extra-uses--collapsed` class hides the layer
- Each use row displays:
  - **Metadata section**: Label, DC, description
  - **Time badge**: Colored action economy badge (conditionally rendered)
  - **Action buttons**: Use button with skill key and use key data attributes
- Removed unused `usageCount` display for cleaner UI

**CSS Styling (Lines 528-633)**
- **Expand/Collapse Button**:
  - `.skill-expand-toggle`: Small, transparent button with hover scaling
  - Rotates 90° when `aria-expanded="true"` for visual feedback
  - Hover effect: brightens color and scales up
  
- **Collapsed/Expanded States**:
  - `.skill-extra-uses--collapsed`: `display: none` to hide
  - `.skill-extra-uses--expanded`: `display: flex` with slide-down animation
  
- **Animation**:
  - `@keyframes slideDown`: Opacity fade-in with upward slide
  - Duration: 0.2s for snappy response
  
- **Time Badges**:
  - Individual color classes for each action economy type
  - Consistent styling: padding, border-radius, font-weight
  - Semantic color choices matching SWSE rules (gold for swift, red for full-round, etc.)

### Data Structures

**Skill Object in Context**
```javascript
{
  key: "acrobatics",
  label: "Acrobatics",
  total: 15,
  trained: true,
  focused: false,
  favorite: false,
  selectedAbility: "dex",
  abilityMod: 3,
  halfLevel: 5,
  miscMod: 0,
  extraUses: [
    {
      key: "extra-use-123",
      label: "Tumble Away",
      name: "Tumble Away",
      dc: "15",
      time: "swift",
      description: "Move away from an opponent as a swift action",
      effect: "Move up to your speed while avoiding attacks",
      trainedOnly: false,
      timeClass: "time--swift",
      timeLabel: "⚡ Swift"
    },
    // ... more uses
  ]
}
```

## Technical Decisions

### 1. **Canonical Data Source: ExtraSkillUseRegistry**
- Use the existing `ExtraSkillUseRegistry` class from `/scripts/utils/extra-skill-use-registry.js`
- This loader:
  - Fetches from compendium pack "foundryvtt-swse.extraskilluses" (if available)
  - Falls back to JSON from "data/extraskilluses.json"
  - Normalizes data to consistent structure
  - Filters by actor accessibility (trainedOnly flag, etc.)
- **Why**: Avoids creating duplicate skill-use loaders or static mock data

### 2. **Inline CSS with Color Coding**
- Action economy colors embedded in the template `<style>` block
- Color choices align with visual metaphors:
  - Swift = Gold (quick, bright)
  - Move = Blue (travel/movement)
  - Standard = Cyan (primary, sheet accent color)
  - Full Round = Red (commitment, danger)
  - Free = Green (unrestricted)
  - Reaction = Purple (special/magical)
- **Why**: Provides immediate visual feedback without runtime color calculations

### 3. **Helper Methods for Time Mapping**
- Two methods handle time-to-display mapping:
  - `_getTimeClass()`: For CSS selectors
  - `_getTimeLabel()`: For human-readable output
- Both use `String.toLowerCase().trim()` and `.includes()` for flexible matching
- Handles variations: "swift", "swift action", "Swift Action", etc.
- **Why**: Normalizes potentially messy data from different sources

### 4. **Expand/Collapse State Management**
- State tracked by CSS classes (no separate data structure)
- `aria-expanded` attribute on button for accessibility
- Sibling traversal (`nextElementSibling` loop) to find the detail layer
- **Why**: Minimal JS footprint, CSS handles rendering, accessibility built-in

### 5. **Existing Handler Reuse**
- The "use-extra-skill" action handler already existed in `_activateMiscUI()`
- No changes needed for basic skill use invocation
- Handler records usage in `system.skills.{key}.extra` counter
- **Why**: Avoids duplicate code and leverages existing infrastructure

## Testing Checklist

### Rendering & Visibility
- [ ] Skills with no associated uses: no chevron displayed
- [ ] Skills with associated uses: chevron visible in skill name column
- [ ] Chevron is properly aligned and proportioned within skill name cell
- [ ] Extra uses layer is hidden by default (collapsed state)

### Expand/Collapse Interaction
- [ ] Click chevron: uses expand with slide-down animation
- [ ] Click chevron again: uses collapse with fade-out
- [ ] Chevron rotates 90° when expanded, returns to normal when collapsed
- [ ] Chevron color changes to bright cyan when expanded
- [ ] Multiple skills can be expanded simultaneously (independent state)
- [ ] Expanding one skill doesn't affect others

### Data Display
- [ ] Each use shows: label, description, DC, action economy badge
- [ ] Description text is readable and not cut off
- [ ] DC displays as "DC 15" format (not malformed)
- [ ] Action economy badges show correct icons and labels
- [ ] Badges display correct colors for their type

### Action Economy Colors
- [ ] Swift actions: Gold background and text
- [ ] Move actions: Blue background and text
- [ ] Standard actions: Cyan background and text
- [ ] Full Round actions: Red background and text
- [ ] Free actions: Green background and text
- [ ] Reaction actions: Purple background and text
- [ ] Unknown type: Gray background and text

### Accessibility
- [ ] Keyboard navigation: Tab through chevron buttons
- [ ] Keyboard activation: Enter/Space on chevron expands/collapses
- [ ] Screen reader: aria-expanded attribute read aloud
- [ ] Tooltips: Hover shows "Expand to show N skill uses"
- [ ] Tooltips: Hover on time badge shows action economy type

### Interaction with Other Features
- [ ] Skill roll (clicking name or bonus): still works normally
- [ ] Favorite toggle: still works normally
- [ ] Ability selector: still works normally
- [ ] Trained/Focused checkboxes: still work normally
- [ ] Misc modifier input: still works normally
- [ ] Skill search/filter: doesn't interfere with expand/collapse state

### Edge Cases
- [ ] Skills with special characters in name: display correctly
- [ ] Very long use descriptions: text wraps or truncates appropriately
- [ ] Large number of uses per skill (5+): all display, layout doesn't break
- [ ] DC with non-numeric values: displays gracefully
- [ ] Missing time/action economy data: shows "—" instead of error

### Browser Compatibility
- [ ] Chrome: Chevron animation, colors, layout
- [ ] Firefox: Chevron animation, colors, layout
- [ ] Safari: Chevron animation, colors, layout
- [ ] Mobile (iOS): Touch interaction works, animation smooth

## Integration Points

### With Existing Systems
1. **ExtraSkillUseRegistry**: Already initialized, already handles compendium loading
2. **ActorEngine**: Used by existing "use-extra-skill" handler to update counters
3. **Action Economy Tracker**: Optional color coordination (action economy colors match combat tab)
4. **Skill Roll System**: Expand/collapse doesn't interfere with SWSERoll.rollSkill()

### With Future Features
1. **Skill Use Invocation**: The "Use" button could trigger actual skill use code (e.g., JumpUses.longJump())
   - Currently just increments a counter
   - Future: Integrate with skill-uses.js implementations
   
2. **Extra Skill Use Details Dialog**: Could expand on single-use to show more info
   - Time estimate, resources consumed, prerequisites, etc.
   - Would use same color-coding system

3. **Action Economy Integration**: Could highlight which uses are available this turn
   - Would require connecting to ActionEconomyTracker system
   - Could shade unavailable uses in gray

## Known Limitations

1. **Use Button**: Currently just increments a counter in `system.skills.{key}.extra`
   - Doesn't actually invoke skill use logic (e.g., JumpUses.longJump())
   - Future enhancement: Implement skill-use specific handlers

2. **Accessibility of Descriptions**: Long descriptions might be cut off in narrow windows
   - CSS uses `flex` layout without explicit height constraints
   - Could add `max-height` or `overflow-y: auto` if needed

3. **Time Field Interpretation**: Only looks at the `time` field in ExtraSkillUseRegistry
   - Some uses might have duration in different format (e.g., "1 round" vs "1round")
   - Mapping handles common variations but not exhaustive

4. **State Persistence**: Expand/collapse state not persisted across page refresh
   - Would require localStorage or actor flags to maintain state
   - Current design treats each render as fresh (appropriate for char sheets)

## Related Issues & PRs

- **Phase 8**: Roll routing and engine integration verification/fixes
- **Phase 9**: Combat tab redesign to surface existing combat actions
- **Phase 10**: Skills tab expandable skill uses (this phase)
- **Future**: Implement actual skill use invocation (e.g., JumpUses, PerceptionUses)

## Files by Impact

| File | Type | Impact | Lines |
|------|------|--------|-------|
| `/scripts/sheets/v2/character-sheet.js` | JS | Context building, helpers, event handler | +54 |
| `/templates/actors/character/v2/partials/skills-panel.hbs` | Template | Expand/collapse UI, styling, display | +122 |
| `/scripts/utils/extra-skill-use-registry.js` | Existing | No changes, used as data source | — |
| `/scripts/skills/skill-uses.js` | Existing | No changes, potential future integration | — |

## Performance Considerations

1. **Registry Initialization**: Runs once per sheet render
   - Async operation happens during context building
   - Compendium or JSON load happens in parallel with other rendering
   
2. **DOM Queries**: Expand/collapse handler uses `nextElementSibling` loop
   - Maximum 2-3 iterations (skill rows, extra uses, optional hidden elements)
   - O(1) complexity in practice
   
3. **CSS Animations**: Slide-down uses hardware-accelerated properties
   - `opacity` and `transform` (translateY) are GPU-optimized
   - No layout thrashing or reflows
   
4. **Memory**: Extra uses cached in `derived.skills` for render lifetime
   - Typical: 5-20 uses per skill × 18 skills = ~1-2 KB of data
   - Negligible compared to weapon/item inventory data

## Code Quality

- **Comments**: Detailed inline comments explaining logic
- **Error Handling**: Try/catch with graceful fallback to empty arrays
- **Accessibility**: aria-expanded attribute, semantic buttons, screen-reader friendly
- **Styling**: Consistent color scheme, hover effects, smooth animations
- **Structure**: Template separate from styling, clean DOM hierarchy

## Future Enhancements

1. **Actual Skill Use Invocation**
   - Implement handlers for each skill use type
   - Call SWSEChat.postRoll() with skill use results
   - Integrate with actor damage/healing systems

2. **Use Availability Indicators**
   - Check if action economy allows use this turn
   - Dim unavailable uses with visual feedback
   - Show "Not available this turn" message

3. **Use Customization Dialog**
   - Click use to open dialog for parameters (distance, difficulty, etc.)
   - Example: "Long Jump" → choose distance, get DC
   - Roll directly from dialog

4. **Expanded Use Details**
   - Display full rules text, resources consumed, prerequisites
   - Link to related skills or abilities
   - Show examples of use

5. **Favorites/Pinning**
   - Pin most-used skills' expand states
   - Quick access buttons for frequent skill uses
   - Customizable skill use toolbar

## Appendix: Testing Data

### Sample Extra Skill Uses (from extraskilluses.json)

```json
[
  {
    "name": "Long Jump",
    "skill": "jump",
    "dc": "15 + (distance × 3)",
    "time": "standard action",
    "description": "Make a jump further than normal running jump",
    "effect": "Jump distance: 15 + (Acrobatics check result - DC) feet"
  },
  {
    "name": "Gather Information (Streetwise)",
    "skill": "gatherInformation",
    "dc": "10 + target's Deception DC",
    "time": "10 minutes",
    "description": "Gather rumors and information about a specific topic",
    "effect": "Learn common knowledge about your target",
    "trainedOnly": true
  }
]
```

### Expected Rendered Output (HTML)

```html
<div class="skills-grid-row swse-row-surface" data-skill="jump" data-skill-extra-uses="3">
  <!-- ... skill columns ... -->
  <div class="col-skill-name">
    <button class="skill-expand-toggle" data-action="toggle-skill-expand" aria-expanded="false">
      ▶
    </button>
    <button class="skill-name-btn rollable">Jump</button>
  </div>
  <!-- ... rest of skill columns ... -->
</div>

<div class="skill-extra-uses skill-extra-uses--collapsed" data-skill="jump">
  <div class="extra-use-row">
    <div class="extra-use-copy">
      <span class="extra-use-label">Long Jump</span>
      <span class="extra-use-description">Make a jump further than normal</span>
    </div>
    <span class="extra-use-time time--standard">⬤ Standard</span>
    <div class="extra-use-actions">
      <button data-action="use-extra-skill" data-skill="jump">Use</button>
    </div>
  </div>
  <!-- ... more uses ... -->
</div>
```

---

**Implementation completed**: 2026-04-03  
**Branch**: `claude/refactor-layout-systems-8pRgi`  
**Commit**: `798b215`
