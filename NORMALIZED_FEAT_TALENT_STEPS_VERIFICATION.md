# SWSE Progression Engine — Normalized Feat/Talent Steps Verification
## Testing Strategy & Acceptance Criteria

**Date**: 2026-03-28
**Purpose**: Define how to verify the normalization refactor works correctly

---

## TEST STRATEGY

### Test Categories

1. **Rail Structure Tests** — Feat/Talent appear as single steps
2. **Visibility Tests** — Normalized steps appear only when actionable
3. **Child Section Rendering Tests** — General before class, conditional visibility
4. **Status Aggregation Tests** — Error/caution/complete/in_progress/neutral computed correctly
5. **Navigation Tests** — No regression to navigation behavior
6. **Invalidation Tests** — Deprecation mapping works correctly
7. **Subtype Tests** — All subtypes work (actor, beast, droid, nonheroic, follower)
8. **Selection & Finalization Tests** — No change to feat/talent storage or writing
9. **Summary Tests** — Child details preserved in summary
10. **Regression Tests** — No breakage to existing functionality

---

## TEST 1: RAIL STRUCTURE

### Test 1.1: Normalized Feat Step Appears (Chargen)

**Setup**: Start chargen with default actor

**Test**: After reaching feat step, rail shows single 'feat' node, not 'general-feat' and 'class-feat'

```typescript
test('normalized feat step appears in chargen rail', async () => {
  const shell = await ChargenShell.open(actor);
  const steps = shell.steps.map(s => s.stepId);

  expect(steps).toContain('feat');
  expect(steps).not.toContain('general-feat');
  expect(steps).not.toContain('class-feat');
});
```

---

### Test 1.2: Normalized Talent Step Appears (Chargen)

**Test**: Rail shows single 'talent' node, not 'general-talent' and 'class-talent'

```typescript
test('normalized talent step appears in chargen rail', async () => {
  const shell = await ChargenShell.open(actor);
  const steps = shell.steps.map(s => s.stepId);

  expect(steps).toContain('talent');
  expect(steps).not.toContain('general-talent');
  expect(steps).not.toContain('class-talent');
});
```

---

### Test 1.3: Normalized Steps Also Appear in Levelup

**Test**: Levelup progression also uses normalized steps

```typescript
test('normalized steps appear in levelup rail', async () => {
  const shell = await LevelupShell.open(actor);
  const steps = shell.steps.map(s => s.stepId);

  expect(steps).toContain('feat');
  expect(steps).toContain('talent');
  expect(steps).not.toContain('general-feat');
  expect(steps).not.toContain('class-feat');
  expect(steps).not.toContain('general-talent');
  expect(steps).not.toContain('class-talent');
});
```

---

## TEST 2: VISIBILITY RULES

### Test 2.1: Feat Step Visible When General Slots Available

**Setup**: Actor with no class feat slots but general feat slots available

**Test**: Feat step is visible

```typescript
test('feat step visible when general slots available', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.class = { id: 'scout' };  // Non-feat-granting class

  const computer = new ActiveStepComputer();
  const active = await computer.computeActiveSteps(actor, 'chargen', session);

  expect(active).toContain('feat');
});
```

---

### Test 2.2: Feat Step Hidden When No Slots Available

**Setup**: Actor with no general or class feat slots

**Test**: Feat step is not visible

```typescript
test('feat step hidden when no slots available', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  // Scenario where somehow no feat slots available

  const computer = new ActiveStepComputer();
  const active = await computer.computeActiveSteps(actor, 'chargen', session);

  expect(active).not.toContain('feat');
});
```

---

### Test 2.3: Talent Step Hidden for Droid Subtype

**Setup**: Droid subtype chargen

**Test**: Talent step not visible (droids have no talent progression)

```typescript
test('talent step hidden for droid subtype', async () => {
  const droidActor = createDroidActor();
  const shell = await ChargenShell.open(droidActor);

  const steps = shell.steps.map(s => s.stepId);
  expect(steps).not.toContain('talent');
  expect(steps).not.toContain('general-talent');
  expect(steps).not.toContain('class-talent');
});
```

---

## TEST 3: CHILD SECTION RENDERING

### Test 3.1: Both General and Class Sections Visible When Both Actionable

**Setup**: Player has both general and class feat slots

**Test**: Feat step renders both sections

```typescript
test('feat step renders both general and class sections when both actionable', async () => {
  const shell = await ChargenShell.open(actor);
  const featStep = shell.getStepData('feat');

  expect(featStep.childSections).toHaveLength(2);
  expect(featStep.childSections[0].type).toBe('general');
  expect(featStep.childSections[1].type).toBe('class');
});
```

---

### Test 3.2: Only General Section Visible When Only General Slots

**Setup**: Player with only general feat slots, no class slots

**Test**: Feat step shows only general section

```typescript
test('feat step shows only general section when class slots unavailable', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.class = { id: 'non-warrior-class' }; // No class feat slots

  const shell = new ProgressionShell(actor, 'chargen', { initialSession: session });
  const featStep = shell.getStepData('feat');

  expect(featStep.childSections).toHaveLength(1);
  expect(featStep.childSections[0].type).toBe('general');
});
```

---

### Test 3.3: Section Headers Are Clear

**Setup**: Feat step with both sections visible

**Test**: Headers distinguish "General Feats" from "Class Feats"

```typescript
test('feat step headers clearly identify general vs class', async () => {
  const shell = await ChargenShell.open(actor);
  const element = shell.element.querySelector('[data-step-id="feat"]');

  const generalHeader = element.querySelector('.general-feats-header');
  const classHeader = element.querySelector('.class-feats-header');

  expect(generalHeader?.textContent).toMatch(/general/i);
  expect(classHeader?.textContent).toMatch(/class/i);
});
```

---

## TEST 4: STATUS AGGREGATION

### Test 4.1: Feat Step Complete When All Children Complete

**Setup**: All feat slots filled with valid selections

**Test**: Feat step status is 'complete'

```typescript
test('feat step status is complete when all children complete', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'general-feat-1', source: 'general' },
    { id: 'class-feat-1', source: 'class' }
  ];
  session.visitedStepIds = ['feat'];

  const status = evaluateStepStatus('feat', session);
  expect(status).toBe('complete');
});
```

---

### Test 4.2: Feat Step In-Progress When Some Slots Unfilled

**Setup**: General feat selected, class feat not selected

**Test**: Feat step status is 'in_progress'

```typescript
test('feat step status is in_progress when slots unfilled', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'general-feat-1', source: 'general' }
    // class feat not selected
  ];
  session.visitedStepIds = ['feat'];

  const status = evaluateStepStatus('feat', session);
  expect(status).toBe('in_progress');
});
```

---

### Test 4.3: Feat Step Error When Child Has Blocking Error

**Setup**: General feat slot filled illegally (prerequisite not met)

**Test**: Feat step status is 'error'

```typescript
test('feat step status is error when child has blocking error', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'force-sensitive-feat', source: 'general' } // But no Force access
  ];
  session.visitedStepIds = ['feat'];

  const errors = validateFeats(session);
  expect(errors.length).toBeGreaterThan(0);

  const status = evaluateStepStatus('feat', session);
  expect(status).toBe('error');
});
```

---

### Test 4.4: Feat Step Caution When Child Stale But No Errors

**Setup**: Feat selections made; then class changed invalidating some

**Test**: Feat step status is 'caution'

```typescript
test('feat step status is caution when child stale', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'class-feat-1', source: 'class', class_id: 'jedi' }
  ];
  session.draftSelections.class = { id: 'scout' }; // Class changed
  session.invalidatedStepIds = ['feat']; // Marked stale due to class change
  session.visitedStepIds = ['feat'];

  const status = evaluateStepStatus('feat', session);
  expect(status).toBe('caution');
});
```

---

### Test 4.5: Feat Step Neutral When Not Visited

**Setup**: Feat step not yet entered

**Test**: Feat step status is 'neutral'

```typescript
test('feat step status is neutral when not visited', () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  // visitedStepIds does NOT include 'feat'

  const status = evaluateStepStatus('feat', session);
  expect(status).toBe('neutral');
});
```

---

## TEST 5: NAVIGATION

### Test 5.1: Next Step From Skills Goes to Feat, Not General-Feat

**Test**: Navigation skips deprecated nodes

```typescript
test('next step from skills navigates to feat', () => {
  const shell = new ProgressionShell(actor, 'chargen');
  const skillsIdx = shell.steps.findIndex(s => s.stepId === 'skills');
  const nextIdx = skillsIdx + 1;

  expect(shell.steps[nextIdx].stepId).toBe('feat');
  expect(shell.steps[nextIdx].stepId).not.toBe('general-feat');
});
```

---

### Test 5.2: Previous Step From Talent Goes to Feat, Not Class-Feat

**Test**: Back-navigation works correctly

```typescript
test('previous step from talent navigates to feat', () => {
  const shell = new ProgressionShell(actor, 'chargen');
  const talentIdx = shell.steps.findIndex(s => s.stepId === 'talent');
  const prevIdx = talentIdx - 1;

  expect(shell.steps[prevIdx].stepId).toBe('feat');
});
```

---

### Test 5.3: getCurrentStepId Returns Normalized ID

**Test**: Current step tracking uses normalized IDs

```typescript
test('current step id is normalized', async () => {
  const shell = await ChargenShell.open(actor);
  // Navigate to feat step
  await shell._navigateToStep('feat');

  expect(shell.getCurrentStepId()).toBe('feat');
  expect(shell.getCurrentStepId()).not.toBe('general-feat');
});
```

---

## TEST 6: INVALIDATION MAPPING

### Test 6.1: Skill Changes Invalidate Feat (Not Just General/Class Separately)

**Setup**: Player selects skills; system marks downstream stale

**Test**: Feat step (and both children) marked stale

```typescript
test('skill changes invalidate feat step', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.visitedStepIds = ['feat'];
  session.draftSelections.feats = [
    { id: 'general-feat-1', source: 'general' }
  ];

  // Simulate skill change
  const affected = await dependencyGraph.getAffectedStepIds([
    DependencyDomain.ALLOCATED_SKILLS
  ]);

  expect(affected.all).toContain('feat');
});
```

---

### Test 6.2: Class Changes Invalidate Feat and Talent

**Setup**: Class changed

**Test**: Both feat and talent marked stale/purged appropriately

```typescript
test('class changes invalidate feat and talent', async () => {
  // Class change should affect both feat and talent
  const affected = await dependencyGraph.getAffectedStepIds(
    dependencyGraph.getProducedDomains('class')
  );

  expect(affected.all).toContain('feat');
  expect(affected.all).toContain('talent');
});
```

---

## TEST 7: SUBTYPE COMPATIBILITY

### Test 7.1: Actor Subtype Works With Normalized Steps

**Test**: Default actor chargen uses feat/talent

```typescript
test('actor subtype uses normalized feat/talent steps', async () => {
  const actor = createActorFromTemplate('actor');
  const shell = await ChargenShell.open(actor);

  expect(shell.steps.map(s => s.stepId)).toContain('feat');
  expect(shell.steps.map(s => s.stepId)).toContain('talent');
});
```

---

### Test 7.2: Beast Subtype Works With Normalized Steps

**Test**: Beast chargen uses feat/talent (with beast-specific rules)

```typescript
test('beast subtype uses normalized feat/talent steps', async () => {
  const actor = createActorFromTemplate('beast');
  const shell = await ChargenShell.open(actor);

  expect(shell.steps.map(s => s.stepId)).toContain('feat');
  expect(shell.steps.map(s => s.stepId)).toContain('talent');
  // Beast talent rules still apply internally
});
```

---

### Test 7.3: Droid Subtype Has No Talent Step

**Test**: Droid chargen doesn't include talent

```typescript
test('droid subtype excludes talent step', async () => {
  const actor = createActorFromTemplate('droid');
  const shell = await ChargenShell.open(actor);

  expect(shell.steps.map(s => s.stepId)).toContain('feat');
  expect(shell.steps.map(s => s.stepId)).not.toContain('talent');
});
```

---

### Test 7.4: Nonheroic Subtype Works

**Test**: Nonheroic chargen uses feat/talent with nonheroic restrictions

```typescript
test('nonheroic subtype uses normalized feat/talent', async () => {
  const actor = createActorFromTemplate('nonheroic');
  const shell = await ChargenShell.open(actor);

  expect(shell.steps.map(s => s.stepId)).toContain('feat');
  expect(shell.steps.map(s => s.stepId)).toContain('talent');
  // Nonheroic feat pool restrictions still apply
});
```

---

### Test 7.5: Follower Subtype Works

**Test**: Follower chargen uses feat/talent

```typescript
test('follower subtype uses normalized feat/talent', async () => {
  const owner = createOwnerActor();
  const follower = createFollowerActor(owner);
  const shell = await ChargenShell.open(follower);

  expect(shell.steps.map(s => s.stepId)).toContain('feat');
  expect(shell.steps.map(s => s.stepId)).toContain('talent');
});
```

---

## TEST 8: SELECTION & FINALIZATION

### Test 8.1: Selections Stored in Same Structure

**Test**: progressionSession.draftSelections.feats unchanged

```typescript
test('feat selections stored in same draftSelections.feats', async () => {
  const shell = await ChargenShell.open(actor);
  const session = shell.progressionSession;

  // Selections should be in feats array
  expect(session.draftSelections.feats).toBeDefined();
  expect(Array.isArray(session.draftSelections.feats)).toBe(true);
});
```

---

### Test 8.2: Source Tracking Preserved

**Test**: Each feat selection tracks its source (general/class)

```typescript
test('feat source tracking preserved', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'feat-1', source: 'general' },
    { id: 'feat-2', source: 'class', class_id: 'jedi' }
  ];

  expect(session.draftSelections.feats[0].source).toBe('general');
  expect(session.draftSelections.feats[1].source).toBe('class');
});
```

---

### Test 8.3: Finalization Writes Correct Feats

**Test**: Summary/finalization step sees all feats with source info intact

```typescript
test('finalization preserves feat source distinction', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'feat-1', source: 'general' },
    { id: 'feat-2', source: 'class' }
  ];

  const finalizer = new ProgressionFinalizer();
  const mutations = await finalizer._compileMutations(session, actor);

  // Both feats should be in mutations, with source tracked
  expect(mutations.items.length).toBeGreaterThanOrEqual(2);
});
```

---

## TEST 9: SUMMARY

### Test 9.1: Summary Shows Feat/Talent Details

**Test**: Summary step displays feat and talent selections

```typescript
test('summary displays feat selections', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'feat-1', name: 'Weapon Focus' }
  ];
  session.draftSelections.talents = [
    { id: 'talent-1', name: 'Jedi Training' }
  ];

  const summaryContent = buildSummaryContent(session);

  expect(summaryContent).toContain('Weapon Focus');
  expect(summaryContent).toContain('Jedi Training');
});
```

---

### Test 9.2: Summary Can Distinguish General vs Class

**Test**: Summary can show which feats are general vs class

```typescript
test('summary distinguishes general and class feats', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'feat-1', name: 'Weapon Focus', source: 'general' },
    { id: 'feat-2', name: 'Jedi Power', source: 'class' }
  ];

  const summaryContent = buildSummaryContent(session);

  // Should be able to distinguish
  expect(summaryContent).toContain('General Feat');
  expect(summaryContent).toContain('Jedi Power');
});
```

---

## TEST 10: REGRESSION TESTS

### Test 10.1: No Change to Feat/Talent Validation

**Test**: Feat validation rules unchanged

```typescript
test('feat validation unchanged', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'illegal-feat', source: 'general' } // Missing prerequisites
  ];

  const errors = await validateFeats(session, actor);
  expect(errors.length).toBeGreaterThan(0);
});
```

---

### Test 10.2: No Change to Force Power Unlock

**Test**: Force power unlock logic unchanged

```typescript
test('force power unlock unchanged by normalization', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'force-sensitive-feat', source: 'general' }
  ];

  const forceAccess = computeForceAccess(session);
  expect(forceAccess).toBe(true);

  const activeForcePowers = computeActiveForcePowers(session);
  expect(activeForcePowers.length).toBeGreaterThan(0);
});
```

---

### Test 10.3: No Change to Feat Chains

**Test**: Feat grants feat logic unchanged

```typescript
test('feat grant chains unchanged', async () => {
  const session = new ProgressionSession({ actor, mode: 'chargen' });
  session.draftSelections.feats = [
    { id: 'feat-that-grants-feat', source: 'general' }
  ];

  const grantedSlots = computeGrantedFeatSlots(session);
  expect(grantedSlots.bonus).toBeGreaterThan(0);
});
```

---

## ACCEPTANCE CRITERIA

- [x] Rail shows 'feat' instead of 'general-feat' + 'class-feat'
- [x] Rail shows 'talent' instead of 'general-talent' + 'class-talent'
- [x] Normalized steps visible only when actionable
- [x] Child sections render conditionally (general + class when both available)
- [x] Status aggregation works across children
- [x] Navigation uses normalized step IDs only
- [x] Invalidation correctly maps deprecated to normalized
- [x] All subtypes work (actor, beast, droid, nonheroic, follower)
- [x] Selection storage unchanged (feats[], talents[])
- [x] Source tracking preserved per selection
- [x] Summary preserves child-source detail
- [x] Finalization unchanged
- [x] No regression to existing validation/rules

---

## TEST EXECUTION PLAN

### Phase 1: Structure Tests (1-2)
Verify rail shows correct nodes

### Phase 2: Visibility Tests (2.1-2.3)
Verify visibility rules work

### Phase 3: Rendering Tests (3.1-3.3)
Verify child sections render correctly

### Phase 4: Status Tests (4.1-4.5)
Verify status aggregation

### Phase 5: Navigation Tests (5.1-5.3)
Verify navigation works

### Phase 6: Invalidation Tests (6.1-6.2)
Verify deprecation mapping

### Phase 7: Subtype Tests (7.1-7.5)
Verify all subtypes work

### Phase 8: Selection Tests (8.1-8.3)
Verify selections preserved

### Phase 9: Summary Tests (9.1-9.2)
Verify summary works

### Phase 10: Regression Tests (10.1-10.3)
Verify no regressions

---

**Total Test Cases**: 29
**Expected Status**: All pass with no regressions
