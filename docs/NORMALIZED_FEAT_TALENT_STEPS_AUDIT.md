# SWSE Progression Engine — Normalized Feat/Talent Steps Audit
## Architecture Analysis & Design

**Date**: 2026-03-28
**Goal**: Normalize player-facing rail to show Feat and Talent as single steps while preserving internal source distinction

---

## EXECUTIVE SUMMARY

**Current State**:
- Rail displays 4 separate steps: general-feat, class-feat, general-talent, class-talent
- Players see long progression rail
- Internal source distinction is maintained

**Desired State**:
- Rail displays 2 normalized steps: Feat, Talent
- Cleaner, simpler player-facing progression
- Internal source/grant tracking preserved for validation/finalization

**Approach**:
- Create normalized "feat" and "talent" rail steps
- Group child domain selections (general + class) within each
- Aggregated completion status across children
- Preserve internal validation and source tracking
- No flattening of game rules or grant logic

---

## PART 1: CURRENT ARCHITECTURE

### 1.1 Registry Structure

**Current Step Nodes** (in PROGRESSION_NODE_REGISTRY):

```
general-feat (nodeId: 'general-feat')
  - label: 'General Feat'
  - modes: chargen, levelup
  - selectionKey: 'feats'
  - category: canonical

class-feat (nodeId: 'class-feat')
  - label: 'Class Feat'
  - modes: chargen, levelup
  - selectionKey: 'feats'
  - category: canonical

general-talent (nodeId: 'general-talent')
  - label: 'Heroic Talent'
  - modes: chargen, levelup
  - selectionKey: 'talents'
  - category: canonical

class-talent (nodeId: 'class-talent')
  - label: 'Class Talent'
  - modes: chargen, levelup
  - selectionKey: 'talents'
  - category: canonical
```

**Key Observation**: Both general and class feats use the SAME selectionKey: 'feats'
Similarly, both talents use selectionKey: 'talents'

This means selections are already aggregated in progressionSession.draftSelections, NOT separated by source.

---

### 1.2 Step Plugin Architecture

**FeatStep Plugin** (`feat-step.js`):
```typescript
export class FeatStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    this._slotType = descriptor.slotType || 'heroic';  // 'heroic' or 'class'
    this._classId = descriptor.classId || null;
  }
}
```

- Single FeatStep plugin class
- Instantiated separately for general-feat and class-feat
- Differentiated by `slotType` parameter in descriptor

**Similarly, TalentStep Plugin** (`talent-step.js`):
```typescript
export class TalentStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    this._slotType = descriptor.slotType || 'general';  // 'general' or 'class'
  }
}
```

---

### 1.3 Current Rail Sequence (Chargen)

```
intro
→ species
→ droid-builder (conditional)
→ attribute
→ class
→ l1-survey
→ background
→ skills
→ general-feat         ← Step 1
→ class-feat           ← Step 2
→ general-talent       ← Step 3
→ class-talent         ← Step 4
→ languages
→ force-powers (conditional)
→ force-techniques (conditional)
→ force-secrets (conditional)
→ starship-maneuvers (conditional)
→ summary
```

**Problem**: Feat/talent take 4 positions instead of 2

---

### 1.4 How Slots Are Determined

**Feat Slots** (from FeatSlotValidator):
- General feat slots come from: level + class grants + feat grants + background grants
- Class feat slots come from: class-specific entitlements + level

**Talent Slots** (from TalentRegistry):
- General talent slots come from: level + class grants
- Class talent slots come from: class-specific entitlements + level

**Current Logic**: Separate feat/talent step plugins query separate slot pools

---

### 1.5 Validation & Grant Tracking

**Feats Selection** (progressionSession.draftSelections.feats):
```typescript
[
  { id: 'feat-id-1', source: 'general', source_level: 1, ... },
  { id: 'feat-id-2', source: 'class', class_id: 'jedi', ... },
  { id: 'feat-id-3', source: 'feat-granted', parent_feat_id: 'feat-id-1', ... },
]
```

Each feat object tracks its source internally.

**Talents Selection** (progressionSession.draftSelections.talents):
```typescript
[
  { id: 'talent-id-1', source: 'general', ... },
  { id: 'talent-id-2', source: 'class', class_id: 'jedi', ... },
]
```

Similarly source-tracked.

---

### 1.6 Invalidation Relationships

**When skills change**:
```
invalidates: ['general-feat', 'class-feat', 'general-talent', 'class-talent']
```

**When class changes**:
```
invalidates: ['class-feat', 'class-talent']
```

**When general-feat changes**:
```
invalidates: ['class-feat', 'general-talent', 'class-talent']
```

**Current Problem**: Invalidation references individual nodes; normalization requires mapping to parent categories.

---

## PART 2: NORMALIZATION DESIGN

### 2.1 New Rail Structure

**Proposed Normalized Steps**:

```
intro
→ species
→ droid-builder (conditional)
→ attribute
→ class
→ l1-survey
→ background
→ skills
→ feat                 ← NEW (aggregates general-feat + class-feat)
→ talent               ← NEW (aggregates general-talent + class-talent)
→ languages
→ force-powers (conditional)
→ force-techniques (conditional)
→ force-secrets (conditional)
→ starship-maneuvers (conditional)
→ summary
```

**Benefit**: Feat/talent now take 2 positions instead of 4

---

### 2.2 Child Domain Mapping

Within each normalized step, child domains remain distinct:

**Feat Step children**:
- general-feat domain (general feat slots)
- class-feat domain (class feat slots)

**Talent Step children**:
- general-talent domain (general talent slots)
- class-talent domain (class talent slots)

---

### 2.3 Visibility Rules

**Feat step is visible IF**:
- At least one feat slot is actionable (general OR class)
- AND there are legal feat choices available in at least one pool

**Talent step is visible IF**:
- At least one talent slot is actionable (general OR class)
- AND there are legal talent choices available in at least one pool

**Hidden conditions**:
- If no slots available in either pool → step not visible
- If slots available but no legal choices → step not visible

---

### 2.4 Internal Rendering Structure

Within the normalized Feat step:

```
┌─────────────────────────┐
│ Feat Selection          │
├─────────────────────────┤
│ General Feats (2/3)     │  ← Section for general-feat domain
│  [Feat A]               │
│  [Feat B]               │
│                         │
│ Class Feats (1/2)       │  ← Section for class-feat domain
│  [Feat C]               │
│                         │
└─────────────────────────┘
```

Within the normalized Talent step:

```
┌─────────────────────────┐
│ Talent Selection        │
├─────────────────────────┤
│ General Talents (1/2)   │  ← Section for general-talent domain
│  [Talent A]             │
│                         │
│ Class Talents (0/1)     │  ← Section for class-talent domain
│  (No selections yet)    │
│                         │
└─────────────────────────┘
```

**Key Rules**:
1. Each section shows only if it has actionable slots
2. Sections appear in order: General → Class
3. Completeness calculated per section
4. Overall step status aggregates children

---

### 2.5 Status Aggregation

**Feat step status**:

| Condition | Status |
|-----------|--------|
| Any child has blocking errors | error |
| All filled children are complete, no children with only caution | complete |
| At least one child incomplete, no errors | in_progress |
| At least one child stale/caution, others complete | caution |
| Step visited but no selections yet | in_progress |
| Step not visited | neutral |

**Talent step status**: Similar rules

---

### 2.6 Navigation Implications

**Current**: Steps available in sequence
```
... → general-feat → class-feat → general-talent → class-talent → ...
```

**After normalization**:
```
... → feat → talent → ...
```

**Navigation methods**:
- `getNextActiveStepId('feat')` → returns 'talent' (not 'class-feat')
- `getPreviousActiveStepId('talent')` → returns 'feat' (not 'general-talent')
- `currentStepIndex` points to 'feat' or 'talent', not to child domains

**No change to currentStepIndex repair logic** — just operating at normalized level

---

### 2.7 Visited State Tracking

**Option A: Track at normalized level**
```typescript
visitedStepIds = ['feat', 'talent', ...]
// Don't track 'general-feat', 'class-feat' separately
```

**Option B: Track at both levels** (for diagnostic purposes)
```typescript
visitedStepIds = ['feat', 'talent', ...]
visitedChildDomains = {
  'feat': ['general-feat', 'class-feat'],  // Which children visited
  'talent': ['general-talent'],
}
```

**Recommendation**: Option A (simpler) unless diagnostic value of Option B is needed

---

## PART 3: IMPLEMENTATION STRATEGY

### 3.1 Registry Updates

**Add two new normalized nodes**:

```typescript
feat: {
  nodeId: 'feat',
  label: 'Feat',
  icon: 'fa-star',
  category: 'normalized',
  modes: ['chargen', 'levelup'],
  subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast'],
  activationPolicy: ActivationPolicy.CANONICAL,

  // Child domains
  childDomains: ['general-feat', 'class-feat'],

  // Aggregated invalidation
  invalidates: [ /* union of child invalidations */ ],

  selectionKey: 'feats',  // Same as before
  optional: false,
  isSkippable: false,
  isFinal: false,
}

talent: {
  nodeId: 'talent',
  label: 'Talent',
  icon: 'fa-gem',
  category: 'normalized',
  modes: ['chargen', 'levelup'],
  subtypes: ['actor', 'npc', 'follower', 'nonheroic'],
  activationPolicy: ActivationPolicy.CANONICAL,

  // Child domains
  childDomains: ['general-talent', 'class-talent'],

  // Aggregated invalidation
  invalidates: [ /* union of child invalidations */ ],

  selectionKey: 'talents',  // Same as before
  optional: false,
  isSkippable: false,
  isFinal: false,
}
```

**Mark old nodes as DEPRECATED** (keep in registry for backward compat, but mark):
```typescript
'general-feat': {
  // ...
  deprecated: true,  // Add flag
  normalizedParent: 'feat',
}
```

---

### 3.2 Step Plugin Architecture

**Option A: Create NormalizedFeatStep plugin**
```typescript
export class NormalizedFeatStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    // Child step plugins
    this.generalFeatPlugin = new FeatStep({
      ...descriptor,
      slotType: 'heroic'
    });
    this.classFeatPlugin = new FeatStep({
      ...descriptor,
      slotType: 'class'
    });
  }

  async onStepEnter(shell) {
    // Initialize both child plugins
    await this.generalFeatPlugin.onStepEnter(shell);
    await this.classFeatPlugin.onStepEnter(shell);
  }

  async getStepData(shell) {
    // Aggregate data from both child plugins
    const generalData = await this.generalFeatPlugin.getStepData(shell);
    const classData = await this.classFeatPlugin.getStepData(shell);

    return {
      childSections: [
        { type: 'general', data: generalData },
        { type: 'class', data: classData }
      ]
    };
  }
}
```

**Option B: Enhance FeatStep to support aggregation**
```typescript
export class FeatStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    this._slotType = descriptor.slotType;
    this._aggregatedMode = descriptor.aggregatedMode || false;
    this._childSteps = [];
  }
}
```

**Recommendation**: Option A (cleaner separation, reuses existing plugin logic)

---

### 3.3 ActiveStepComputer Updates

**Current logic**:
```typescript
const applicableActive = [];
for (const nodeId of sortedActive) {
  const node = PROGRESSION_NODE_REGISTRY[nodeId];
  const isApplicable = await this._evaluateStepApplicability(node, ...);
  if (isApplicable) {
    applicableActive.push(nodeId);
  }
}
```

**After normalization**:
1. Filter deprecated child nodes before applicability check
2. Add normalized parent if any child is applicable
3. Remove child nodes from active list

```typescript
async _normalizeDeprecatedSteps(activeNodeIds) {
  const normalized = [];

  for (const nodeId of activeNodeIds) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];

    if (node.deprecated && node.normalizedParent) {
      // Skip; will be added via parent
      continue;
    }

    if (node.childDomains) {
      // This is a normalized node
      // Check if any child is applicable
      const anyChildApplicable = await this._isNormalizedStepApplicable(node);
      if (anyChildApplicable) {
        normalized.push(nodeId);
      }
    } else {
      // Regular node
      normalized.push(nodeId);
    }
  }

  return normalized;
}
```

---

### 3.4 Invalidation Mapping

**Current invalidation in registry**:
```typescript
invalidates: ['general-feat', 'class-feat', ...]
```

**After normalization**, need mapping:
- If registry says "invalidate general-feat or class-feat" → mark 'feat' as stale
- If registry says "invalidate general-talent or class-talent" → mark 'talent' as stale

```typescript
_mapDeprecatedToNormalized(deprecatedNodes) {
  const normalized = new Set();

  for (const nodeId of deprecatedNodes) {
    const node = PROGRESSION_NODE_REGISTRY[nodeId];

    if (node.deprecated && node.normalizedParent) {
      normalized.add(node.normalizedParent);
    } else {
      normalized.add(nodeId);
    }
  }

  return Array.from(normalized);
}
```

---

## PART 4: COMPATIBILITY & MIGRATION

### 4.1 Backward Compatibility

**Selections remain unchanged**:
- progressionSession.draftSelections.feats still exists, same structure
- progressionSession.draftSelections.talents still exists, same structure
- No change to how feats/talents are stored

**API Compatibility**:
- Finalizer still writes feats/talents to actor (unchanged)
- Projection engine still consumes feats/talents (unchanged)
- Adapters still work with feat/talent structures (unchanged)

---

### 4.2 Migration Path

**Phase 1: Add normalized nodes to registry** (without activating)
**Phase 2: Update ActiveStepComputer to use normalized**
**Phase 3: Create normalized step plugins**
**Phase 4: Update shell to handle normalized nav**
**Phase 5: Mark old nodes deprecated in registry**
**Phase 6: Remove old nodes when confident (major version bump)**

---

## PART 5: EDGE CASES & SPECIAL SCENARIOS

### 5.1 Only General Feats Available

```
Feat step shows:
┌──────────────────────┐
│ General Feats (2/3)  │
│ [Feat A]             │
│ [Feat B]             │
└──────────────────────┘

(Class Feat section not shown because no class feat slots available)
```

---

### 5.2 Only Class Talents Available

```
Talent step shows:
┌──────────────────────┐
│ Class Talents (1/2)  │
│ [Talent A]           │
└──────────────────────┘

(General Talent section not shown)
```

---

### 5.3 Droid Subtype (No Talents)

Droid subtype should have NO talent step in active rail, even if normalized.

Registry marks talent node with:
```typescript
subtypes: ['actor', 'npc', 'follower', 'nonheroic', 'beast']
// Note: 'droid' NOT included
```

---

### 5.4 Beast Subtype (Special Talent Rules)

Beast has different talent pools/rules but same normalized structure.

Adapters handle source-specific rules:
```typescript
// In BeastSubtypeAdapter
contributeActiveSteps(active, session) {
  // 'talent' node is active
  // But internal logic about beast talent pools stays in adapter
  return active;
}
```

---

## PART 6: SUMMARY & MIGRATION PLAN

### Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Rail steps for feats | 2 (general-feat, class-feat) | 1 (feat) |
| Rail steps for talents | 2 (general-talent, class-talent) | 1 (talent) |
| Selection storage | feats[] (same) | feats[] (same) |
| Internal source tracking | Per selection | Per selection (unchanged) |
| Navigation | general → class → general-talent → class | feat → talent |
| Status aggregation | Per step | Aggregated across children |

### Files to Change

1. **progression-node-registry.js**
   - Add normalized 'feat' and 'talent' nodes
   - Mark old nodes deprecated
   - Update invalidation mapping

2. **active-step-computer.js**
   - Add _normalizeDeprecatedSteps() method
   - Add _isNormalizedStepApplicable() method
   - Filter out deprecated child nodes

3. **progression-shell.js**
   - Update status aggregation for normalized steps
   - Update navigation to use normalized IDs

4. **Step plugin architecture**
   - Create NormalizedFeatStep and NormalizedTalentStep
   - Or enhance existing FeatStep/TalentStep for aggregation mode

5. **Templates**
   - Create templates for normalized step rendering
   - Support child section grouping

6. **Summary step**
   - Update to show feat/talent details from normalized structure

---

## ACCEPTANCE CRITERIA

✓ Rail displays 'feat' instead of 'general-feat' and 'class-feat'
✓ Rail displays 'talent' instead of 'general-talent' and 'class-talent'
✓ Normalized steps visible only when at least one child is actionable
✓ Internal source/grant distinction preserved
✓ Status aggregation across children works correctly
✓ Navigation uses normalized step IDs
✓ Invalidation correctly maps to normalized parent
✓ No change to feat/talent selection storage
✓ Summary/finalization/debugging preserve child-source detail
✓ All subtypes work correctly (including special cases like Beast/Droid)

---

## NEXT STEPS

1. **Implement Part 3 (Implementation Strategy)** following this design
2. **Create normalization-specific step plugins**
3. **Update ActiveStepComputer for normalized filtering**
4. **Test with all subtype paths (actor, beast, droid, nonheroic, follower)**
5. **Verify invalidation mapping works correctly**
6. **Update summary to display normalized structure**
