# PHASE 4 — STRUCTURED REBUILD + GOVERNANCE LAYER
## Complete Implementation Guide

---

## Overview

Phase 4 adds a complete **governance and UI orchestration layer** on top of the sovereign architecture built in Phases 1-3.

**What this phase does:**
- ✅ Displays integrity violations to users
- ✅ Provides structured rebuild UI (RebuildOrchestrator)
- ✅ Enforces level-up preflight gates
- ✅ Implements per-actor governance modes (normal/override/freeBuild)
- ✅ Handles slot overflow when slots disappear
- ✅ Marks exports with governance state
- ✅ Integrates all systems seamlessly

**What this phase does NOT do:**
- ❌ Change legality logic
- ❌ Modify mutation authority
- ❌ Change prerequisite schema
- ❌ Interpret rules outside AbilityEngine
- ❌ Auto-delete items
- ❌ Disable integrity detection

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      SHEET LAYER                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Integrity Banner                                       │ │
│  │ Shows: violation count + governance badge + fix button│ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ RebuildOrchestrator (Modal)                            │ │
│  │ Shows: table of broken items + remove/view actions    │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ SlotResolutionFlow (Modal)                             │ │
│  │ Shows: slot overflow + item selection for removal     │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│              ENFORCEMENT GATES LAYER                         │
│                                                              │
│  LevelUpPreflightGate                                        │
│  └─ Blocks level-up if violations exist + enforcement active│
│                                                              │
│  ActorEngineEnforcementGates                                │
│  └─ Checks governance mode, logs finalization attempts     │
│                                                              │
│  GovernanceSystem                                            │
│  └─ Manages enforcement modes (normal/override/freeBuild)   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│         MUTATION AUTHORITY (Phase 3)                         │
│                                                              │
│  ActorEngine  ← Single mutation authority                   │
│  └─ Routes all mutations through integrity checks           │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│       INTEGRITY ENFORCEMENT (Phase 3)                        │
│                                                              │
│  PrerequisiteIntegrityChecker                               │
│  └─ Evaluates all items after mutations                     │
│  └─ Detects violations and diffs                            │
│                                                              │
│  MissingPrereqsTracker                                      │
│  └─ Persists violations to actor.system                     │
│  └─ Provides UI-facing API                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Structure

### Core Governance
- `governance-system.js` — Main governance control
- `governance-integration.js` — Orchestrates all systems

### UI Components
- `ui/integrity-banner.js` — Sheet-level violation display
- `ui/rebuild-orchestrator.js` — Modal for fixing violations
- `ui/slot-resolution-flow.js` — Modal for slot overflow resolution

### Enforcement
- `enforcement/levelup-preflight-gate.js` — Blocks level-up if violations exist
- `enforcement/actor-engine-enforcement-gates.js` — Governance-aware mutation checks

### Data
- `export/export-marking.js` — Marks exported actors with governance state

---

## Integration Points

### 1. Sheet Integration

In your character sheet class (`character-sheet.js`):

```javascript
async _prepareContext(options) {
  const context = await super._prepareContext(options);

  // Add governance context
  GovernanceIntegration.prepareSheetContext(this.document, context);

  return context;
}

activateListeners(html) {
  super.activateListeners(html);

  // Activate governance listeners
  GovernanceIntegration.activateSheetListeners(html, this.document);
}
```

### 2. System Initialization

In your `system.js`:

```javascript
Hooks.on('init', () => {
  // Register governance settings
  GovernanceSystem.registerWorldSettings();
});

Hooks.on('ready', () => {
  // Initialize governance system
  GovernanceIntegration.initialize();

  // Register governance hooks
  GovernanceIntegration.registerHooks();
});
```

### 3. Template Integration

In your character sheet template (`character-sheet.hbs`):

```handlebars
{{#if integrityBanner}}
<div class="swse-sheet-header">
  {{{integrityBanner.html}}}
</div>
{{/if}}

<!-- Rest of sheet... -->
```

### 4. Level-Up Hook

In your level-up UI code:

```javascript
async handleLevelUp(actor) {
  // Check preflight gate
  const canProceed = await LevelUpPreflightGate.enforcePreflight(actor);

  if (!canProceed) {
    // Gate shows modal with fix button
    return;
  }

  // Proceed with level-up
  await performLevelUp(actor);
}
```

---

## Governance Modes

### NORMAL (Default)
```
enforcement: ON
detection: ON
tracking: ON
level-up: BLOCKED if violations
mutations: ALLOWED (integrity checks run)
```

### OVERRIDE
```
enforcement: OFF (GM approval)
detection: ON
tracking: ON
level-up: ALLOWED (warning shown)
mutations: ALLOWED
governance.approvedBy: userId
governance.reason: optional string
```

### FREEBUILD
```
enforcement: OFF (GM only)
detection: ON
tracking: ON
level-up: ALLOWED
mutations: ALLOWED
visibility: Controlled by world setting
```

---

## Visibility Settings

World-level setting controls free build badges:

- **banner** (default): Show badge only
- **visualTheme**: Show badge + subtle tint on sheet
- **hidden**: Hide from players, show to GM only

---

## Data Model

### actor.system.governance

```javascript
{
  enforcementMode: 'normal' | 'override' | 'freeBuild',
  approvedBy: userId,           // Who set the mode
  reason: string,               // Optional reason
  timestamp: number,            // When it was set
  visibilityMode: 'banner' | 'visualTheme' | 'hidden'
}
```

### actor.system.missingPrerequisites

```javascript
{
  itemId: {
    itemName: string,
    itemType: string,
    missingPrereqs: string[],
    severity: 'error' | 'warning',
    detectedAt: timestamp
  }
}
```

---

## Usage Examples

### Display Governance Badge (GM-facing)
```javascript
const badge = GovernanceSystem.getGoveranceBadge(actor);
// Returns: { label: 'FB', title: '...', class: '...' } or null
```

### Check if Actor Can Proceed
```javascript
const canFinalize = ActorEngineEnforcementGates.canFinalize(actor);
const canLevelUp = LevelUpPreflightGate.canLevelUp(actor);
const isValid = ActorEngineEnforcementGates.isValidForProgression(actor);
```

### Get Violation Summary
```javascript
const summary = ActorEngineEnforcementGates.getViolationSummary(actor);
// Returns: { total: 2, byType: { feat: 1, talent: 1 }, items: [...] }
```

### Launch Rebuild UI
```javascript
await RebuildOrchestrator.launch(actor);
```

### Set Governance Mode (GM only)
```javascript
GovernanceSystem.setEnforcementMode(actor, 'freeBuild', {
  reason: 'Testing build options'
});
```

### Export with Governance
```javascript
const marked = ExportMarking.markExportedActor(actor, exportData);
// Appends [FB] or [OM] to actor name if applicable
```

---

## Console Debugging

```javascript
// Get full governance status
GovernanceIntegration.getDebugInfo(actor)

// Get banner context
IntegrityBanner.prepareBannerContext(actor)

// Get violation summary
ActorEngineEnforcementGates.getViolationSummary(actor)

// Check enforcement status
GovernanceSystem.isEnforcementActive(actor)
GovernanceSystem.isFreeBuild(actor)
GovernanceSystem.isOverride(actor)

// Export current governance
GovernanceSystem.exportGovernance(actor)
```

---

## CSS Styles

All UI components include embedded CSS:

- `INTEGRITY_BANNER_STYLES` (integrity-banner.js)
- `REBUILD_ORCHESTRATOR_STYLES` (rebuild-orchestrator.js)
- `LEVELUP_GATE_STYLES` (levelup-preflight-gate.js)
- `SLOT_RESOLUTION_STYLES` (slot-resolution-flow.js)

Include these in your main stylesheet or inject via JavaScript.

---

## Zero Impact on Production

✅ Governance modes are DEV/GM tools
✅ Players see governance badges only (no enforcement)
✅ Integrity checks are always silent (no gameplay interruption)
✅ No changes to rules, mutations, or legality
✅ All changes are optional UI/UX improvements

---

## Next Steps

1. **Integrate into sheets** — Add prepareContext() and activateListeners() calls
2. **Add to system.js** — Register hooks and initialize
3. **Update templates** — Add banner section
4. **Test governance modes** — Try normal/override/freeBuild
5. **Validate level-up gate** — Ensure violations block level-up
6. **Test export/import** — Verify governance persists

---

## Architecture Validation

Phase 4 preserves all Phase 3 sovereignty:

✅ **Enumeration Sovereignty** — Only registries access compendiums (unchanged)
✅ **Rule Sovereignty** — Only AbilityEngine imports PrerequisiteChecker (unchanged)
✅ **Legality Sovereignty** — AbilityEngine is sole authority (unchanged)
✅ **Mutation Sovereignty** — ActorEngine is sole authority (unchanged)
✅ **Integrity Sovereignty** — Checks run after every mutation (unchanged)

Phase 4 adds:
✅ **Governance Sovereignty** — Per-actor enforcement modes + UI controls
✅ **Visibility Sovereignty** — Per-world visibility settings

---

## Common Issues

### Banner Not Showing
- Ensure IntegrityBanner.prepareBannerContext() is called in sheet
- Check that actor.system.missingPrerequisites is populated
- Verify governance is initialized

### Level-Up Gate Not Working
- Ensure LevelUpPreflightGate.enforcePreflight() is called before level-up
- Check that actor has violations (check console with getDebugInfo)
- Verify enforcement mode is 'normal'

### Governance Not Persisting
- Ensure actor.system.governance is initialized
- Check that governance data is saved to actor
- Verify export includes governance in system object

---

## Testing Checklist

- [ ] Integrity banner shows/hides correctly
- [ ] RebuildOrchestrator modal opens from banner
- [ ] Item removal works and re-evaluates integrity
- [ ] Level-up gate blocks when violations exist
- [ ] Level-up gate allows when no violations
- [ ] Override mode allows level-up despite violations
- [ ] Free build badges display correctly
- [ ] Visibility setting controls badge visibility
- [ ] Export marks actors with governance state
- [ ] Import restores governance state
- [ ] Governance mode changes log correctly
- [ ] Console debugging works (getDebugInfo, etc.)

---

## Performance Notes

- Integrity banner is read-only (no computation)
- RebuildOrchestrator only queries existing violation data
- Governance gates are lightweight checks
- No new database queries introduced
- All governance data stored in actor.system

---

Complete Phase 4 implementation with zero impact on existing systems.
