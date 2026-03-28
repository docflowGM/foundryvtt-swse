# SWSE Progression Engine — Selection Ordering Audit
## Canonical General → Class Ordering

**Date**: 2026-03-28
**Goal**: Enforce consistent, deterministic ordering where General selections always precede Class selections

---

## EXECUTIVE SUMMARY

**Current State**:
- Feat selections stored in flat array: `draftSelections.feats[]`
- Talent selections stored in flat array: `draftSelections.talents[]`
- Insertion order determines display order
- No explicit ordering guarantee

**Desired State**:
- General selections always appear before Class selections (canonically)
- Consistent across UI, validation, summary, debug views
- Ordering deterministic and stable
- Subtype-specific selections follow: General → Class → Subtype

**Implementation Approach**:
- Define canonical ordering priority enum
- Create shared sorting helper function
- Apply at aggregation boundaries (UI rendering, validation, summary)
- NOT at storage time (preserve original array for finalization)

---

## PART 1: CURRENT ORDERING BEHAVIOR

### 1.1 Feat Selection Array (draftSelections.feats)

**Current structure**:
```typescript
draftSelections.feats = [
  { id: 'feat-1', source: 'general' },
  { id: 'feat-2', source: 'class', class_id: 'jedi' },
  { id: 'feat-3', source: 'general' },
  { id: 'feat-4', source: 'feat-granted', parent_feat_id: 'feat-1' },
]
```

**Ordering**: Insertion order (no guaranteed sequence)

**Problem**: A player might see class feats before general feats if they select them in that order.

---

### 1.2 Talent Selection Array (draftSelections.talents)

**Current structure**:
```typescript
draftSelections.talents = [
  { id: 'talent-1', source: 'class' },
  { id: 'talent-2', source: 'general' },
]
```

**Problem**: Same as feats — insertion order varies

---

### 1.3 Where Ordering Matters

| Context | Current Behavior | Issue |
|---------|------------------|-------|
| Feat UI rendering | Insertion order | Inconsistent visual layout |
| Talent UI rendering | Insertion order | Inconsistent visual layout |
| Validation messages | Insertion order | Errors reported in random order |
| Summary display | Insertion order | Character sheet order varies |
| Dev/debug tools | Insertion order | Confusing inspection output |

---

## PART 2: ORDERING PRIORITY MODEL

### 2.1 Source Priority Hierarchy

```typescript
enum SelectionSourcePriority {
  GENERAL = 0,      // General/heroic selections
  CLASS = 1,        // Class-specific selections
  BONUS = 2,        // Bonus/granted selections
  SUBTYPE = 3,      // Subtype-specific (Beast, Droid, Nonheroic)
}
```

**Rules**:
1. General (non-class, non-bonus) → priority 0
2. Class-based selections → priority 1
3. Bonus/granted from feats → priority 2
4. Subtype-specific (if applicable) → priority 3
5. Within same priority → alphabetical by name (tiebreaker)

---

### 2.2 Source Type Detection

```typescript
function getSelectionSourcePriority(selection: Selection): number {
  if (selection.source === 'general' || selection.source === 'heroic') {
    return SelectionSourcePriority.GENERAL;
  }

  if (selection.source === 'class') {
    return SelectionSourcePriority.CLASS;
  }

  if (selection.source?.includes('granted') || selection.source?.includes('bonus')) {
    return SelectionSourcePriority.BONUS;
  }

  if (selection.source === 'beast' || selection.source === 'droid' || selection.source === 'nonheroic') {
    return SelectionSourcePriority.SUBTYPE;
  }

  return SelectionSourcePriority.GENERAL; // Default to general
}
```

---

### 2.3 Sorting Helper Function

```typescript
/**
 * Sort selections in canonical order: General → Class → Bonus → Subtype
 * Within same source, sort alphabetically by name (tiebreaker)
 */
function canonicallyOrderSelections(selections: Selection[]): Selection[] {
  return [...selections].sort((a, b) => {
    const aPriority = getSelectionSourcePriority(a);
    const bPriority = getSelectionSourcePriority(b);

    // Different source priorities → sort by priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Same source priority → sort alphabetically by name
    const aName = a.name?.toLowerCase() || '';
    const bName = b.name?.toLowerCase() || '';

    return aName.localeCompare(bName);
  });
}
```

---

## PART 3: WHERE TO APPLY ORDERING

### 3.1 Feat Step UI Rendering

**Current code** (feat-step.js):
```typescript
async getStepData(shell) {
  return {
    feats: this._groupedFeats,
    selected: this._selectedFeatId,
  };
}
```

**After ordering**:
```typescript
async getStepData(shell) {
  const selectedFeats = shell.progressionSession.draftSelections.feats || [];
  const orderedFeats = canonicallyOrderSelections(selectedFeats);

  return {
    feats: this._groupedFeats,
    selected: this._selectedFeatId,
    orderedSelections: orderedFeats,  // UI uses this for display
  };
}
```

---

### 3.2 Talent Step UI Rendering

**After ordering**:
```typescript
async getStepData(shell) {
  const selectedTalents = shell.progressionSession.draftSelections.talents || [];
  const orderedTalents = canonicallyOrderSelections(selectedTalents);

  return {
    talents: this._groupedTalents,
    selected: this._selectedTalentId,
    orderedSelections: orderedTalents,  // UI uses this
  };
}
```

---

### 3.3 Validation Messages

**Current code** (feat-step.js):
```typescript
getBlockingIssues() {
  const issues = [];
  for (const feat of this._selectedFeats) {
    if (!this._isLegal(feat)) {
      issues.push(`${feat.name} is not legal for this character`);
    }
  }
  return issues;
}
```

**After ordering**:
```typescript
getBlockingIssues() {
  const issues = [];
  const ordered = canonicallyOrderSelections(this._selectedFeats);  // Order first

  for (const feat of ordered) {
    if (!this._isLegal(feat)) {
      issues.push(`${feat.name} is not legal for this character`);
    }
  }
  return issues;
}
```

**Benefit**: Error messages appear in consistent order (general issues first, then class-specific)

---

### 3.4 Summary Display

**Current code** (summary-step.js):
```typescript
function renderFeatsSummary(session) {
  const feats = session.draftSelections.feats || [];
  return feats.map(f => `<li>${f.name}</li>`).join('');
}
```

**After ordering**:
```typescript
function renderFeatsSummary(session) {
  const feats = session.draftSelections.feats || [];
  const orderedFeats = canonicallyOrderSelections(feats);

  // Group by source for clarity
  const grouped = groupBySource(orderedFeats);

  let html = '';
  for (const [source, items] of grouped) {
    html += `<h4>${source}</h4>`;
    html += items.map(f => `<li>${f.name}</li>`).join('');
  }
  return html;
}
```

---

### 3.5 Debug/Dev Tools

**Diagnostic output** (e.g., dev panel):
```typescript
function debugShowSelectedFeats(session) {
  const feats = session.draftSelections.feats || [];
  const ordered = canonicallyOrderSelections(feats);

  console.log('Feats (canonical order):');
  ordered.forEach((f, i) => {
    console.log(`  ${i+1}. ${f.name} [${f.source}]`);
  });
}
```

---

## PART 4: STORAGE BEHAVIOR

### 4.1 DO NOT Re-sort at Storage Time

**Wrong approach**:
```typescript
commitSelection(stepId, selection) {
  const feats = this.progressionSession.draftSelections.feats || [];
  feats.push(selection);

  // ❌ DON'T DO THIS:
  this.progressionSession.draftSelections.feats = canonicallyOrderSelections(feats);
}
```

**Problem**: Changes insertion order, which can break finalization if finalization relies on order.

---

### 4.2 DO Sort at Display/Aggregation Time

**Correct approach**:
```typescript
// Storage: append in insertion order
commitSelection(stepId, selection) {
  const feats = this.progressionSession.draftSelections.feats || [];
  feats.push(selection);
  this.progressionSession.draftSelections.feats = feats;  // Original order
}

// Display: sort when rendering
renderFeatsList() {
  const feats = this.progressionSession.draftSelections.feats || [];
  const ordered = canonicallyOrderSelections(feats);  // Sort for display
  // Render ordered list
}
```

---

### 4.3 Finalization Behavior

**Finalizer** receives feats in original insertion order but doesn't care about order:

```typescript
async applyFeatMutations(actor, feats) {
  // Order doesn't matter for finalization
  // Each feat is written independently
  for (const feat of feats) {
    await actor.addItem(feat);  // Order irrelevant
  }
}
```

---

## PART 5: EDGE CASES & SPECIAL SCENARIOS

### 5.1 Only Class Feats Selected

**Before**: Shows only class feats
**After**: Shows only class feats (no general feats to order before)

```
Feats:
  Jedi Power Feat (class)
  Jedi Reflexes (class)
```

---

### 5.2 Only General Feats Selected

**Before**: Shows only general feats
**After**: Shows only general feats (no class to follow)

```
Feats:
  Weapon Focus (general)
  Power Attack (general)
```

---

### 5.3 Mixed General and Class

**Before**: Order depends on selection sequence
```
Feats (if selected class-first):
  Jedi Power Feat (class)  ← Happened first
  Weapon Focus (general)   ← Happened second
```

**After**: Canonical order (general first)
```
Feats:
  Weapon Focus (general)   ← Always first
  Jedi Power Feat (class)  ← Always second
```

---

### 5.4 Feat Grants Feat (Bonus Feats)

**Current**: Granted feats mixed in insertion order
**After**: Granted feats grouped after class feats (bonus priority)

```
Feats:
  Weapon Focus (general)       ← Priority 0
  Jedi Power Feat (class)      ← Priority 1
  Improved Jedi Power (bonus)  ← Priority 2 (granted by Jedi Power)
```

---

### 5.5 Beast Subtype Talent Rules

Beast has special talent pool. Ordering still applies:
```
Talents:
  General Talent (general)     ← General first
  Beast Hunter (beast)         ← Beast subtype after
```

---

## PART 6: IMPLEMENTATION CHECKLIST

### Where Ordering Must Apply

- [ ] Feat step UI rendering (getStepData, template rendering)
- [ ] Talent step UI rendering (getStepData, template rendering)
- [ ] Feat validation messages (getBlockingIssues, getWarnings)
- [ ] Talent validation messages
- [ ] Summary step feat listing
- [ ] Summary step talent listing
- [ ] Dev debug overlay (if showing grouped selections)
- [ ] Status computation (if iterating selections)

### Where Ordering Must NOT Apply

- [ ] draftSelections.feats storage (keep insertion order)
- [ ] draftSelections.talents storage (keep insertion order)
- [ ] Finalizer mutation logic (order-independent)
- [ ] Finalization output (no specific order required)

---

## PART 7: TEST SCENARIOS

### Test 7.1: Selections Displayed in Canonical Order

**Setup**: Player selects Class Feat, then General Feat

**Expected**: General Feat appears before Class Feat in UI

```typescript
test('feats displayed in canonical order regardless of selection order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });

  // Select class feat first
  session.draftSelections.feats = [
    { id: 'jedi-power', name: 'Jedi Power Feat', source: 'class' }
  ];

  // Then add general feat
  session.draftSelections.feats.push(
    { id: 'weapon-focus', name: 'Weapon Focus', source: 'general' }
  );

  const featStep = createFeatStep();
  const data = await featStep.getStepData(session);

  // UI should show in canonical order (general first)
  expect(data.orderedSelections[0].source).toBe('general');
  expect(data.orderedSelections[1].source).toBe('class');
});
```

---

### Test 7.2: Validation Messages In Order

**Setup**: Multiple feat validation issues

**Expected**: General issues first, class issues second

```typescript
test('feat validation errors appear in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'illegal-class', source: 'class' },  // Class feat with issue
    { id: 'illegal-general', source: 'general' },  // General feat with issue
  ];

  const errors = await validateFeats(session);

  // General issue should appear first
  const generalIssueIdx = errors.findIndex(e => e.includes('general'));
  const classIssueIdx = errors.findIndex(e => e.includes('class'));

  expect(generalIssueIdx).toBeLessThan(classIssueIdx);
});
```

---

### Test 7.3: Summary Shows Canonical Order

**Setup**: Mixed feat selections

**Expected**: Summary displays in canonical order

```typescript
test('summary displays feats in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'class-feat', name: 'Jedi Reflexes', source: 'class' },
    { id: 'general-feat', name: 'Weapon Focus', source: 'general' }
  ];

  const summaryHTML = renderFeatsSummary(session);

  const weaponIdx = summaryHTML.indexOf('Weapon Focus');
  const jediIdx = summaryHTML.indexOf('Jedi Reflexes');

  expect(weaponIdx).toBeLessThan(jediIdx);  // General before class
});
```

---

### Test 7.4: Storage Order Unchanged

**Setup**: Selections made in one order

**Expected**: draftSelections array keeps original order (not re-sorted)

```typescript
test('storage array preserves insertion order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });

  // Select class first
  session.commitSelection('feat', { id: 'class-feat', source: 'class' });
  // Then general
  session.commitSelection('feat', { id: 'general-feat', source: 'general' });

  // Storage should be in insertion order (class, then general)
  expect(session.draftSelections.feats[0].source).toBe('class');
  expect(session.draftSelections.feats[1].source).toBe('general');

  // But UI should show in canonical order (general, then class)
  const ordered = canonicallyOrderSelections(session.draftSelections.feats);
  expect(ordered[0].source).toBe('general');
  expect(ordered[1].source).toBe('class');
});
```

---

### Test 7.5: Tiebreaker (Alphabetical Within Same Source)

**Setup**: Multiple general feats

**Expected**: Sorted alphabetically by name within same priority

```typescript
test('selections with same source sorted alphabetically', () => {
  const selections = [
    { id: '1', name: 'Weapon Focus', source: 'general' },
    { id: '2', name: 'Attack Bonus', source: 'general' },
    { id: '3', name: 'Cleave', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].name).toBe('Attack Bonus');
  expect(ordered[1].name).toBe('Cleave');
  expect(ordered[2].name).toBe('Weapon Focus');
});
```

---

## PART 8: ACCEPTANCE CRITERIA

✓ General selections always appear before Class selections within Feat/Talent steps
✓ Ordering consistent across UI rendering
✓ Ordering consistent across validation messages
✓ Ordering consistent in summary display
✓ Ordering deterministic (general → class → bonus → subtype, with alphabetical tiebreaker)
✓ Sorting applied at display time, NOT storage time
✓ draftSelections array keeps original insertion order (for finalization compatibility)
✓ No regression to finalization or validation logic
✓ Ordering stable after recomputation/unlocking
✓ All subtypes respect ordering rules

---

## IMPLEMENTATION PLAN

### Phase 1: Create Ordering Helper
- Define `SelectionSourcePriority` enum
- Implement `getSelectionSourcePriority()`
- Implement `canonicallyOrderSelections()`
- Place in shared utility (e.g., `selection-ordering.js`)

### Phase 2: Apply to Feat Step
- Update feat-step.js getStepData()
- Update feat validation (getBlockingIssues)
- Update feat-step template to use ordered selections

### Phase 3: Apply to Talent Step
- Update talent-step.js getStepData()
- Update talent validation
- Update talent-step template

### Phase 4: Apply to Summary
- Update summary-step.js feat rendering
- Update summary-step.js talent rendering
- Group by source for clarity

### Phase 5: Testing
- Run all ordering tests
- Verify no regression to validation/finalization
- Test with all subtypes

---

## SUMMARY

**Problem**: Selection order was non-deterministic (insertion-dependent)
**Solution**: Define canonical ordering (General → Class → Bonus → Subtype)
**Implementation**: Sort at display time, keep storage in insertion order
**Scope**: UI rendering, validation, summary, debug tools
**NO Change**: Storage format, finalization, validation rules

Result: Consistent, predictable player-facing ordering across all UI surfaces.
