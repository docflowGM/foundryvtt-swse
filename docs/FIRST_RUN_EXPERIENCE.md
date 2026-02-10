# First-Run Experience & Progressive Tooltips - Phase 6

Complete documentation of the onboarding system for new SWSE GMs.

## Overview

The first-run experience consists of three integrated components:

1. **Welcome Dialog** - Introduces SWSE concepts and features
2. **Feature Labels** - Mark features as Recommended/Advanced/Experimental
3. **Tooltip Discovery** - Progressive disclosure with smart suggestions

Together, these create a guided onboarding flow that doesn't overwhelm new users.

---

## Flow Diagram

```
GM launches world for first time
        ↓
[Check welcomeShown setting]
        ↓ (not shown)
Display Welcome Dialog
  • Explain chargen, combat, progression
  • Reference tooltips
  • Mention mentor system
        ↓ (user clicks "Got It!")
Initialize Tooltip Discovery
        ↓
[Show suggested tooltips for key buttons]
  • Chargen Start (Priority 1)
  • Levelup Button (Priority 2)
  • Combat Actions (Priority 3)
  • Talents Tab (Priority 4)
  • Force Powers (Priority 5)
        ↓
GM explores UI with highlights
        ↓
[User hovers/clicks suggested elements]
        ↓
Progressive Tooltips appear
  • Enhanced content (not just basic)
  • Links to related concepts
  • "Got it" dismissal
        ↓
UI stops highlighting (user learned it)
        ↓
[Tooltip marked as discovered]
        ↓
Continue normal gameplay
```

---

## Component 1: Welcome Dialog

### When It Shows

- **First GM login** to a world with SWSE system
- Only shows once per world (unless reset)
- Can be manually triggered: `SWSEFirstRun.resetWelcome()`

### What It Explains

**Core Concepts:**
- **Character Generation** - Guided step-by-step chargen
- **Combat & Progression** - Attack resolution, levelup system
- **Force Powers** - Full Force system with resource tracking
- **Vehicles** - Starship and crew rules
- **System Settings** - Configure rules variants

**Navigation Tips:**
- Mentions hovering over UI elements for tooltips
- References the Mentor system for explanations
- Links to documentation and Discord

### User Actions

- Click "Got It!" to proceed
- Check "Don't show again" to suppress future displays
- Optionally explore system without clicking

### Styling

- Themed to match SWSE (cyan/holographic)
- Uses relative font sizes (accessible)
- Links are colored and underlined
- Responsive width (600px base)

---

## Component 2: Feature Labels

### Three Categories

| Label | Color | Icon | Usage |
|-------|-------|------|-------|
| **Recommended** | Green (✓) | ✓ | Core, stable, well-tested features |
| **Advanced** | Orange (⚙) | ⚙ | Powerful features needing expertise |
| **Experimental** | Orange (⚗) | ⚗ | New or unstable features |

### Example Features

**Recommended:**
- Character generation (chargen)
- Combat automation (auto-calculations)
- Level-up system
- Active effects
- Auto-skill calculations
- Action palette

**Advanced:**
- Vehicle combat
- Multiclass support
- Prestige classes
- Talent tree visualization
- Store UI
- Compendium browser

**Experimental:**
- Custom Force power creation
- Custom talent trees
- PDF export
- Destiny system
- Follower system
- Mentor AI system

### Experimental Feature Control

Experimental features can be toggled in **System Settings**:
- Each experimental feature has an on/off toggle
- Defaults to enabled
- GMs can disable features they don't use
- Setting persists across sessions

### Console Access

```javascript
// Check feature status
SWSEFeatures.getFeatureLabel('chargen')         // 'Recommended'
SWSEFeatures.getFeatureStatus('pdf-export')     // 'experimental'
SWSEFeatures.featureIsEnabled('mentor-system')  // true/false

// Get all features with label
SWSEFeatures.getFeaturesByLabel('Experimental') // Array of experimental features

// Create UI badge
const badge = SWSEFeatures.createFeatureBadge('levelup-system');
// → '<span class="feature-badge">✓ Recommended</span>'
```

---

## Component 3: Tooltip Discovery

### Smart Progressive Disclosure

Tooltips show different content based on context:

**First View:** Basic, concise help text
```
"Create a new character"
```

**Enhanced View:** Detailed explanation + context
```
"Start guided character generation. This walks you through:
• Choosing species and class
• Distributing ability scores
• Selecting talents and force powers
• Adding equipment

The system auto-calculates skills, defenses, and BAB."
```

### Suggested Tooltips (Priority Order)

1. **Chargen Start** - "Create a new character"
2. **Levelup Button** - "Advance character to next level"
3. **Combat Actions** - "Initiate combat action"
4. **Talents Tab** - "View character talents"
5. **Force Powers** - "Manage Force powers"
6. **Defenses** - "Character defensive values"
7. **Store UI** - "Browse item store"

### Visual Highlighting

When suggestions appear:
- Button gets glowing outline (cyan/holographic theme)
- Continuous pulse animation (1s cycle)
- Draws attention without being intrusive

### Popover Display

Enhanced tooltips appear as popovers:
- Position near the suggested element
- Include icon (💡), header, content, dismiss button
- High z-index (10000) to appear above UI
- Auto-dismiss or user-dismissible

### Discovery Tracking

The system tracks which tooltips have been discovered:
- Stored in world settings (encrypted)
- Used to avoid showing same suggestion twice
- Resets per world
- Console: `SWSETooltips.resetDiscovery()` to reset

---

## Integration: How They Work Together

### User Journey

```
1. GM logs in to SWSE world
   ↓
2. Welcome dialog appears
   • Explains SWSE high-level concepts
   • Mentions tooltips
   • References mentor system
   ↓
3. GM clicks "Got It!"
   ↓
4. Tooltip discovery activates
   • Finds key UI elements
   • Highlights them one at a time
   • Shows enhanced descriptions
   ↓
5. GM explores UI
   • Clicks suggested buttons
   • Reads enhanced tooltips
   • Learns system through practice
   ↓
6. Normal gameplay continues
   • Tooltips available on hover
   • Feature labels in UI
   • Mentor system for in-game help
```

### Feedback Loop

- Each tooltip dismissed = marked as discovered
- No duplicate suggestions
- All 3-5 key tooltips shown in sequence
- ~3 second between suggestions (adjustable)

### Mentoring Integration

The **Mentor System** bridges welcome → gameplay:
- When GM uses chargen, mentor explains choices
- When rolling combat, mentor suggests actions
- In-game explanations complement tooltips

---

## Configuration & Reset

### Console Commands

```javascript
// Reset welcome dialog (show again)
await SWSEFirstRun.resetWelcome()

// View tooltip discovery status
const discovered = await SWSETooltips.getDiscovered()

// Reset tooltip discovery (all suggestions appear again)
await SWSETooltips.resetDiscovery()

// Get suggested tooltips
const suggestions = await SWSETooltips.getSuggestedTooltips(3)

// View feature status
SWSEFeatures.getAllFeatures()
```

### System Settings

**Welcome Dialog:**
- Setting: `welcomeShown` (internal, world-scoped)
- Effect: Controls first-run dialog display
- Reset: `SWSEFirstRun.resetWelcome()`

**Feature Toggles:**
- Settings per experimental feature
- Enable/disable in System Settings → SWSE
- Allows GMs to customize experience

**Tooltip Discovery:**
- Setting: `tooltips-discovered` (internal, world-scoped)
- Tracks which tooltips have been seen
- Reset: `SWSETooltips.resetDiscovery()`

---

## UX Best Practices

### For New GMs

✓ **DO:**
- Let welcome dialog show first time (valuable context)
- Explore suggested tooltips (learn through UI)
- Use Mentor system in chargen (it explains choices)
- Hover over UI elements (discover more tooltips)

✗ **DON'T:**
- Skip welcome dialog without reading
- Assume you know everything (tooltips have details)
- Ignore "Experimental" labels (they're unstable)
- Monkey with settings before trying features

### For Experienced GMs

- Disable welcome: Check "Don't show again"
- Reset anytime: `SWSEFirstRun.resetWelcome()` in console
- Toggle experimental: System Settings → Experimental Features
- Customize: Hide tooltips you know

---

## Accessibility

### Keyboard Navigation

- All dialog buttons are tab-navigable
- Feature badges include ARIA labels
- Tooltip popover includes dismiss button
- Tab focus visible and clear

### Color & Contrast

- Welcome dialog uses system theme colors
- Feature badges have AAA contrast (with high-contrast theme)
- Glowing highlight visible even with color blindness
- No visual-only status indicators

### Text & Sizing

- All text uses relative sizing (scalable)
- Tooltips use readable font sizes
- Line height 1.5+ for accessibility
- High-contrast theme available for low vision

---

## Troubleshooting

### "Welcome dialog doesn't show"
- Check setting: `game.settings.get('foundryvtt-swse', 'welcomeShown')`
- If `true`, reset with: `await SWSEFirstRun.resetWelcome()`
- Ensure world is freshly created/loaded

### "Tooltips not highlighting"
- Check if GM logged in
- Verify `tooltips-discovered` setting exists
- Console: `await SWSETooltips.getSuggestedTooltips()` to debug

### "Suggestions keep appearing"
- They should show once per discovery
- If repeating, reset: `await SWSETooltips.resetDiscovery()`
- Check that tooltips are being marked as discovered

### "Feature toggles not working"
- Settings not showing? Refresh page
- Check System Settings → SWSE section
- Verify experimental feature is listed in feature-flags.js

---

## For Module Developers

### Adding Custom Tooltips

```javascript
// In your module init:
import { ENHANCED_TOOLTIPS } from 'foundryvtt-swse/scripts/core/tooltip-discovery.js';

ENHANCED_TOOLTIPS['[data-tooltip-key="my-feature"]'] = {
  basic: 'Quick help',
  enhanced: `Detailed help here
    • Point 1
    • Point 2`,
  relatedConcepts: ['my-concept'],
  keyButton: true,
  suggestionPriority: 8
};
```

### Adding Custom Feature Flags

```javascript
// In your module manifest:
{
  "type": "Module",
  "system": "foundryvtt-swse",
  "version": "1.0.0",
  "compatibility": {"minimum": "13", "verified": "13"},
  "title": "My SWSE Module",
  "esmodules": ["init.js"]
}

// In init.js:
Hooks.once('init', () => {
  game.settings.register('mymodule', 'enable-feature', {
    name: 'Enable My Feature',
    hint: 'Adds my custom feature to SWSE',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });
});
```

---

## Summary

The Phase 6 first-run experience creates a smooth onboarding that:

✓ **Welcomes new GMs** with clear explanations
✓ **Labels features** clearly (Recommended/Advanced/Experimental)
✓ **Guides exploration** through suggested tooltips
✓ **Respects experience** (all optional, can be dismissed)
✓ **Maintains immersion** (integrated with gameplay)
✓ **Stays accessible** (keyboard nav, contrast, scalable)

The result is a system that feels helpful rather than intrusive, discoverable rather than overwhelming.
