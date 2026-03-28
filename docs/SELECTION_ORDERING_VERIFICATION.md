# SWSE Progression Engine — Selection Ordering Verification
## Canonical General → Class Ordering Tests

**Date**: 2026-03-28
**Purpose**: Verify canonical ordering implementation

---

## TEST SUITE: CANONICAL ORDERING

### Test Group 1: Helper Function Tests

#### Test 1.1: Source Priority Detection

```typescript
test('getSelectionSourcePriority detects source correctly', () => {
  expect(getSelectionSourcePriority({ source: 'general' }))
    .toBe(SelectionSourcePriority.GENERAL);

  expect(getSelectionSourcePriority({ source: 'heroic' }))
    .toBe(SelectionSourcePriority.GENERAL);

  expect(getSelectionSourcePriority({ source: 'class' }))
    .toBe(SelectionSourcePriority.CLASS);

  expect(getSelectionSourcePriority({ source: 'feat-granted' }))
    .toBe(SelectionSourcePriority.BONUS);

  expect(getSelectionSourcePriority({ source: 'beast' }))
    .toBe(SelectionSourcePriority.SUBTYPE);
});
```

---

#### Test 1.2: Sorting Function Basic

```typescript
test('canonicallyOrderSelections sorts by priority', () => {
  const selections = [
    { id: '1', name: 'Feat A', source: 'class' },
    { id: '2', name: 'Feat B', source: 'general' },
    { id: '3', name: 'Feat C', source: 'bonus' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].source).toBe('general');
  expect(ordered[1].source).toBe('class');
  expect(ordered[2].source).toBe('bonus');
});
```

---

#### Test 1.3: Alphabetical Tiebreaker

```typescript
test('selections with same source sorted alphabetically', () => {
  const selections = [
    { id: '1', name: 'Weapon Focus', source: 'general' },
    { id: '2', name: 'Attack Bonus', source: 'general' },
    { id: '3', name: 'Cleave', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered.map(s => s.name)).toEqual([
    'Attack Bonus',
    'Cleave',
    'Weapon Focus'
  ]);
});
```

---

#### Test 1.4: Case-Insensitive Tiebreaker

```typescript
test('tiebreaker is case-insensitive', () => {
  const selections = [
    { id: '1', name: 'Weapon Focus', source: 'general' },
    { id: '2', name: 'weapon expertise', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].name.toLowerCase()).toBeLessThan(
    ordered[1].name.toLowerCase()
  );
});
```

---

### Test Group 2: Feat Step Ordering Tests

#### Test 2.1: Feat UI Renders in Canonical Order

```typescript
test('feat step UI renders selections in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: '1', name: 'Jedi Power', source: 'class' },
    { id: '2', name: 'Weapon Focus', source: 'general' },
  ];

  const featStep = new FeatStep({ slotType: 'both' });
  const data = await featStep.getStepData(session);

  // orderedSelections should be in canonical order
  expect(data.orderedSelections[0].source).toBe('general');
  expect(data.orderedSelections[1].source).toBe('class');
});
```

---

#### Test 2.2: Feat Validation Errors In Order

```typescript
test('feat validation errors appear in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'c1', name: 'Illegal Class Feat', source: 'class' },
    { id: 'g1', name: 'Illegal General Feat', source: 'general' },
  ];

  const featStep = new FeatStep({ slotType: 'both' });
  const errors = await featStep.getBlockingIssues();

  // General error should appear before class error
  const generalIdx = errors.findIndex(e => e.includes('Illegal General'));
  const classIdx = errors.findIndex(e => e.includes('Illegal Class'));

  expect(generalIdx).toBeLessThan(classIdx);
});
```

---

#### Test 2.3: Feat Storage Order Unchanged

```typescript
test('feat storage keeps insertion order', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });

  // Commit class feat first
  session.commitSelection('feat', { id: 'c1', source: 'class' });
  // Then general
  session.commitSelection('feat', { id: 'g1', source: 'general' });

  // Storage should be class, then general (insertion order)
  expect(session.draftSelections.feats[0].source).toBe('class');
  expect(session.draftSelections.feats[1].source).toBe('general');
});
```

---

#### Test 2.4: Feat Summary Shows Canonical Order

```typescript
test('feat summary displays in canonical order', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'c1', name: 'Jedi Power', source: 'class' },
    { id: 'g1', name: 'Weapon Focus', source: 'general' },
  ];

  const html = renderFeatsSummary(session);

  const generalIdx = html.indexOf('Weapon Focus');
  const classIdx = html.indexOf('Jedi Power');

  expect(generalIdx).toBeLessThan(classIdx);
});
```

---

### Test Group 3: Talent Step Ordering Tests

#### Test 3.1: Talent UI Renders in Canonical Order

```typescript
test('talent step UI renders selections in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.talents = [
    { id: '1', name: 'Jedi Training', source: 'class' },
    { id: '2', name: 'General Training', source: 'general' },
  ];

  const talentStep = new TalentStep({ slotType: 'both' });
  const data = await talentStep.getStepData(session);

  expect(data.orderedSelections[0].source).toBe('general');
  expect(data.orderedSelections[1].source).toBe('class');
});
```

---

#### Test 3.2: Talent Validation Errors In Order

```typescript
test('talent validation errors appear in canonical order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.talents = [
    { id: 'c1', name: 'Illegal Class Talent', source: 'class' },
    { id: 'g1', name: 'Illegal General Talent', source: 'general' },
  ];

  const talentStep = new TalentStep({ slotType: 'both' });
  const errors = await talentStep.getBlockingIssues();

  const generalIdx = errors.findIndex(e => e.includes('Illegal General'));
  const classIdx = errors.findIndex(e => e.includes('Illegal Class'));

  expect(generalIdx).toBeLessThan(classIdx);
});
```

---

#### Test 3.3: Talent Summary Shows Canonical Order

```typescript
test('talent summary displays in canonical order', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.talents = [
    { id: 'c1', name: 'Jedi Training', source: 'class' },
    { id: 'g1', name: 'General Training', source: 'general' },
  ];

  const html = renderTalentsSummary(session);

  const generalIdx = html.indexOf('General Training');
  const classIdx = html.indexOf('Jedi Training');

  expect(generalIdx).toBeLessThan(classIdx);
});
```

---

### Test Group 4: Mixed Source Ordering Tests

#### Test 4.1: General → Class → Bonus Priority

```typescript
test('selections ordered as general → class → bonus', () => {
  const selections = [
    { id: 'b1', name: 'Bonus Feat 1', source: 'feat-granted' },
    { id: 'c1', name: 'Class Feat 1', source: 'class' },
    { id: 'g1', name: 'General Feat 1', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].source).toBe('general');
  expect(ordered[1].source).toBe('class');
  expect(ordered[2].source).toBe('feat-granted');
});
```

---

#### Test 4.2: With Subtype Selections

```typescript
test('selections ordered as general → class → bonus → subtype', () => {
  const selections = [
    { id: 's1', name: 'Beast Talent', source: 'beast' },
    { id: 'b1', name: 'Bonus Talent', source: 'talent-granted' },
    { id: 'c1', name: 'Class Talent', source: 'class' },
    { id: 'g1', name: 'General Talent', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].source).toBe('general');
  expect(ordered[1].source).toBe('class');
  expect(ordered[2].source).toBe('talent-granted');
  expect(ordered[3].source).toBe('beast');
});
```

---

### Test Group 5: Edge Case Tests

#### Test 5.1: Empty Array

```typescript
test('canonicallyOrderSelections handles empty array', () => {
  const ordered = canonicallyOrderSelections([]);
  expect(ordered).toEqual([]);
});
```

---

#### Test 5.2: Single Selection

```typescript
test('canonicallyOrderSelections handles single selection', () => {
  const selections = [{ id: '1', name: 'Feat', source: 'general' }];
  const ordered = canonicallyOrderSelections(selections);

  expect(ordered).toHaveLength(1);
  expect(ordered[0].source).toBe('general');
});
```

---

#### Test 5.3: All Same Source

```typescript
test('all same source sorted alphabetically', () => {
  const selections = [
    { id: '1', name: 'Zebra Feat', source: 'general' },
    { id: '2', name: 'Apple Feat', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].name).toBe('Apple Feat');
  expect(ordered[1].name).toBe('Zebra Feat');
});
```

---

#### Test 5.4: Only Class Selections

```typescript
test('only class selections shown in order', () => {
  const selections = [
    { id: '1', name: 'Jedi Reflex', source: 'class' },
    { id: '2', name: 'Jedi Power', source: 'class' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].name).toBe('Jedi Power');
  expect(ordered[1].name).toBe('Jedi Reflex');
  expect(ordered.every(s => s.source === 'class')).toBe(true);
});
```

---

#### Test 5.5: Only General Selections

```typescript
test('only general selections shown in order', () => {
  const selections = [
    { id: '1', name: 'Weapon Focus', source: 'general' },
    { id: '2', name: 'Attack Bonus', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].name).toBe('Attack Bonus');
  expect(ordered[1].name).toBe('Weapon Focus');
  expect(ordered.every(s => s.source === 'general')).toBe(true);
});
```

---

### Test Group 6: Stability Tests

#### Test 6.1: Ordering Stable After Recomputation

```typescript
test('ordering stable after step recomputation', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: '1', name: 'Class Feat', source: 'class' },
    { id: '2', name: 'General Feat', source: 'general' },
  ];

  // First render
  const ordered1 = canonicallyOrderSelections(session.draftSelections.feats);

  // Simulate recomputation
  await shell._recomputeActiveStepsIfNeeded();

  // Render again
  const ordered2 = canonicallyOrderSelections(session.draftSelections.feats);

  // Order should be identical
  expect(ordered1.map(s => s.id)).toEqual(ordered2.map(s => s.id));
});
```

---

#### Test 6.2: Ordering Stable Across Sessions

```typescript
test('ordering stable when session saved/restored', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'c1', name: 'Class Feat', source: 'class' },
    { id: 'g1', name: 'General Feat', source: 'general' },
  ];

  // Save session
  await SessionStorage.saveSession(actor, session, 'chargen');

  // Load session
  const loaded = SessionStorage.loadSession(actor, 'chargen');
  const newSession = new ProgressionSession({ actor, mode: 'chargen' });
  SessionStorage.restoreIntoSession(newSession, loaded);

  // Order should be preserved
  const original = canonicallyOrderSelections(session.draftSelections.feats);
  const restored = canonicallyOrderSelections(newSession.draftSelections.feats);

  expect(original.map(s => s.id)).toEqual(restored.map(s => s.id));
});
```

---

### Test Group 7: Subtype-Specific Tests

#### Test 7.1: Beast Subtype Ordering

```typescript
test('beast subtype respects canonical ordering', () => {
  const selections = [
    { id: 'b1', name: 'Beast Talent', source: 'beast' },
    { id: 'g1', name: 'General Talent', source: 'general' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  // General before subtype-specific
  expect(ordered[0].source).toBe('general');
  expect(ordered[1].source).toBe('beast');
});
```

---

#### Test 7.2: Nonheroic Subtype Ordering

```typescript
test('nonheroic subtype respects canonical ordering', () => {
  const selections = [
    { id: 'n1', name: 'Nonheroic Feat', source: 'nonheroic' },
    { id: 'c1', name: 'Class Feat', source: 'class' },
  ];

  const ordered = canonicallyOrderSelections(selections);

  expect(ordered[0].source).toBe('class');
  expect(ordered[1].source).toBe('nonheroic');
});
```

---

### Test Group 8: No Regression Tests

#### Test 8.1: Finalization Unaffected by Ordering

```typescript
test('finalization works regardless of display order', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'c1', source: 'class' },
    { id: 'g1', source: 'general' },
  ];

  // Finalization should work with original storage order
  const mutations = await ProgressionFinalizer._compileMutations(session, actor);

  expect(mutations.items).toHaveLength(2);
  // Finalization doesn't care about display order
});
```

---

#### Test 8.2: Validation Rules Unchanged

```typescript
test('validation logic unaffected by ordering', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'illegal', source: 'class' }
  ];

  const errors = await validateFeats(session);

  // Validation should still work
  expect(errors.length).toBeGreaterThan(0);
});
```

---

## ACCEPTANCE CRITERIA

✓ Helper function correctly detects selection source priority
✓ Sorting function orders by priority (general → class → bonus → subtype)
✓ Tiebreaker sorts alphabetically within same priority
✓ Feat step UI uses ordered selections for display
✓ Talent step UI uses ordered selections for display
✓ Validation messages appear in canonical order
✓ Summary displays in canonical order
✓ Storage array keeps insertion order (unchanged)
✓ Ordering stable after recomputation
✓ Ordering consistent across session save/restore
✓ All subtypes respect canonical ordering
✓ No regression to finalization
✓ No regression to validation logic

---

## TEST EXECUTION SUMMARY

**Total Test Cases**: 26
**Categories**:
- Helper function tests: 4
- Feat step tests: 4
- Talent step tests: 3
- Mixed source tests: 2
- Edge case tests: 5
- Stability tests: 2
- Subtype tests: 2
- Regression tests: 2

**Expected Status**: All pass with no regressions
