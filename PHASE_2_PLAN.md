# PHASE 2: Pre-Commit Change Preview — Implementation Plan

## Objectives
1. Show downstream impact BEFORE player commits a selection
2. Track what changes due to upstream edits (which nodes are affected, why)
3. Provide clear "this will affect X, Y, Z" feedback
4. Enable informed decision-making before committing

## Key Concepts

### Invalidation Sources
When a step commits, it can invalidate downstream nodes. Sources include:
- **Prerequisite changes** - New selection no longer meets downstream step's prerequisites
- **Entitlement changes** - New selection grants fewer/different entitlements
- **Exclusion rules** - New selection excludes downstream options
- **Synergy changes** - New selection breaks synergy bonuses with already-selected items

### Preview Data Structure
```javascript
{
  sourceNodeId: 'species',              // What's changing
  sourceSelection: { id, name },        // New selection
  affectedNodes: [
    {
      nodeId: 'skills',                 // Downstream step
      invalidationBehavior: 'DIRTY',    // RECOMPUTE | DIRTY | PURGE
      affectedCount: 5,                 // How many items in this node
      reasons: [
        'Prerequisite: class=Jedi no longer met',
        'Entitlement: skill points reduced',
        'Synergy: loses +2 synergy bonus'
      ]
    },
    { ... }
  ],
  summary: "Species change affects 3 steps, 12 items total"
}
```

## Implementation Strategy

### 1. Pre-Commit Hook in Step Plugins
**Location**: step-plugin-base.js (all steps inherit)

New method: `getPreviewBeforeCommit(sessionState, newSelection)`
- Called when player clicks "Choose" button (before commitSelection)
- Returns preview data WITHOUT mutating anything
- Queries registry for affected nodes
- Computes impact reasons

### 2. Invalidation Preview Service
**New file**: `invalidation-preview.js`

```javascript
class InvalidationPreview {
  static async computePreview(
    sessionState,
    stepId,
    newSelection
  ) {
    // Get invalidated nodes from registry
    const invalidatedNodes = registry.getInvalidatedNodes(stepId);

    // For each invalidated node, compute impact
    const affectedNodes = [];
    for (const node of invalidatedNodes) {
      const impact = this._computeNodeImpact(
        sessionState,
        node,
        newSelection
      );
      affectedNodes.push(impact);
    }

    return {
      sourceNodeId: stepId,
      sourceSelection: newSelection,
      affectedNodes,
      summary: this._generateSummary(affectedNodes)
    };
  }

  static _computeNodeImpact(sessionState, node, newSelection) {
    // Check prerequisite changes
    const reasons = [];

    // Check if new selection breaks prerequisites
    const prereqs = node.prerequisites;
    for (const check of prereqs) {
      if (!check.eval(sessionState, newSelection)) {
        reasons.push(`Prerequisite: ${check.description} no longer met`);
      }
    }

    // Check entitlement changes
    const newEntitlements = newSelection.grants;
    const oldEntitlements = sessionState.draftSelections[stepId.parentKey]?.grants;
    if (/* entitlements changed */) {
      reasons.push(`Entitlement: ${changeDescription}`);
    }

    // Return impact summary
    return {
      nodeId: node.id,
      invalidationBehavior: node.invalidationBehavior,
      affectedCount: this._countAffectedItems(sessionState, node),
      reasons,
      isVisited: sessionState.visitedStepIds.includes(node.id)
    };
  }
}
```

### 3. Preview Dialog in Action Footer
**Location**: action-footer.js (where "Choose" button is)

Before committing, show:
```
┌─────────────────────────────────┐
│ Confirm Selection: Human Spy     │
├─────────────────────────────────┤
│ This selection will affect:      │
│                                 │
│ Skills: 5 items may be invalid  │
│ Class:  must be re-chosen       │
│ Feats:  2 synergy bonuses lost  │
│                                 │
│ [Cancel]  [Confirm Anyway]      │
└─────────────────────────────────┘
```

Dialog shows:
- What step is changing (Human Spy)
- What downstream steps are affected
- How many items in each step are affected
- Why (short explanation)

### 4. Mutable Preview State
**Location**: progression-shell.js

Track in-memory preview without persisting:
```javascript
this.pendingPreview = {
  stepId: 'species',
  selection: { id: 'human-spy', ... },
  impact: { affectedNodes: [...], ... }
};
```

Preview is:
- Computed on-demand (when player clicks Choose)
- Shown in dialog
- Discarded if player clicks Cancel
- Converted to real invalidation when player confirms

### 5. Invalidation Link: Preview → Commit
**Logic**: When player confirms despite preview warnings:

```javascript
async onConfirmSelection(newSelection) {
  // 1. Compute preview
  const preview = await InvalidationPreview.computePreview(
    this.progressionSession,
    this.currentStepId,
    newSelection
  );

  // 2. If affected nodes exist, show dialog
  if (preview.affectedNodes.length > 0) {
    const confirmed = await this._showPreviewDialog(preview);
    if (!confirmed) return;  // User cancelled
  }

  // 3. Commit (triggers real invalidation tracking)
  await this.commitSelection(newSelection);
}
```

## Files to Create/Modify

- `invalidation-preview.js` — new, compute impact before commit
- `step-plugin-base.js` — add getPreviewBeforeCommit() stub
- `action-footer.js` — show preview dialog before commit
- `progression-shell.js` — track pending preview, connect to commit flow

## Preview Dialog Behaviors

### Visited Step Affected
```
The following visited steps are affected by this change:

Skills (visited)
  - Prerequisite: class=Jedi no longer met
  - 3 items will be invalid

Class (visited)
  - Entitlement: skill points reduced
  - Class choice must be re-selected
```

### Unvisited Step Affected
```
The following unvisited steps may be affected:

Feats (not yet visited)
  - Will need to re-choose when you get there
```

### Warnings
```
WARNING: Making this change will:
- Invalidate 2 visited steps (Skills, Feats)
- Remove 3 previously-selected items
- Reset 1 choice

Are you sure you want to proceed?
```

## Validation Checklist
- [ ] Preview computed before commit (never partial)
- [ ] Affected count matches actual invalid items
- [ ] Reasons explain WHY (not just WHAT)
- [ ] Visited/unvisited distinction shown
- [ ] Preview discarded on Cancel
- [ ] Preview triggers invalidation on Confirm
- [ ] No preview mutations (immutable preview)
- [ ] Works with all step types (not just species)
- [ ] Handles cascading invalidations (A → B → C)

## Test Scenarios

1. Species change affects downstream (happy path)
2. Multiple downstream steps affected (show all)
3. Player cancels preview (no mutation)
4. Player confirms despite warnings (triggers invalidation)
5. Unvisited step affected (neutral status, no caution yet)
6. Visited step affected (becomes caution after confirm)
7. Cascading invalidations (A change affects B, B affects C)
8. No downstream effects (show "No other steps affected")

## Future Enhancements

- Color-coded impact (red=error, yellow=warning, green=info)
- Rollback: "Undo this change" button on summary
- Cascade visualization: Show dependency chain
- Impact on completion: "Completing X will unlock Y"
