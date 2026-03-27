# Progression System: Maintenance and Extension Guide

**Version:** 1.0 (Phase 6 Complete)
**Last Updated:** March 27, 2026

This guide explains how to extend and maintain the progression system safely without introducing competing authorities or duplicate logic.

---

## Quick Reference: Where to Add Things

### Adding a New Node
**Files to modify:**
1. `scripts/apps/progression-framework/registries/progression-node-registry.js` — Add node metadata
2. `scripts/apps/progression-framework/steps/step-plugin-base.js` — Update if needs custom logic
3. `PROGRESSION_NODE_REGISTRY` — Register plugin mapper

**Process:**
```javascript
// 1. Add to PROGRESSION_NODE_REGISTRY
myNewNode: {
  nodeId: 'my-new-node',
  label: 'My New Node',
  activationPolicy: ActivationPolicy.CANONICAL,
  modes: ['chargen'],
  subtypes: ['actor'],
  dependsOn: [],
  invalidates: {},
  selectionKey: 'mySelection',
  optional: false,
}

// 2. If needs custom rendering, create step plugin
// scripts/apps/progression-framework/steps/my-step.js

// 3. Register in node descriptor mapper
// See: scripts/apps/progression-framework/spine/node-descriptor-mapper.js
```

### Adding a New Prerequisite Rule
**Files to modify:**
1. `scripts/governance/prerequisite/prerequisite-checker.js` — Add rule logic

**Process:**
```javascript
// In PrerequisiteChecker.evaluateAcquisition()
case 'my-item-type':
  return this._evaluateMyItemType(itemId, actor);

// Add method
_evaluateMyItemType(itemId, actor) {
  // Check prerequisites
  // Return { legal: boolean, reason: string }
}
```

**Critical:** Do NOT add prerequisite checks anywhere else. All legality goes through PrerequisiteChecker.

### Adding a New Template
**Files to modify:**
1. `data/character-templates.json` — Add template data

**Process:**
```json
{
  "id": "my-template",
  "name": "My Template",
  "class": "Soldier",
  "species": "Human",
  "abilityScores": { "str": 15, ... },
  "feats": ["feat-id-1", "feat-id-2"],
  ...
}
```

**Validation:**
```javascript
// Validate before deploying
const validation = ContentContracts.validate('template', template);
if (!validation.valid) {
  console.error(validation.errors);
}
```

### Adding a New Target/Prestige Path
**Files to modify:**
1. Create target registry (TBD — Phase 7)

**Process:**
```javascript
// Once target registry exists
{
  id: 'my-prestige',
  name: 'My Prestige Class',
  category: 'prestige-class',
  requiredLevel: 10,
  requiredClass: 'Soldier',
  requiredFeats: ['feat-1'],
  milestones: [
    { level: 10, achievement: 'Unlock' },
    { level: 13, achievement: 'Ability unlock' }
  ]
}
```

### Adding Advisory Metadata
**Files to modify:**
1. Advisory metadata registry (TBD — Phase 7)

**Process:**
```javascript
// Metadata for a feat
{
  domain: 'feat',
  tags: ['combat', 'strength'],
  mentorBiases: {
    'ol-salty': 'favor',
    'miraj': 'neutral'
  },
  templateAffinities: ['warrior-template'],
  roleAssociations: ['tank', 'damage-dealer']
}
```

---

## Architecture Boundaries: Do's and Don'ts

### DO: Follow Single Authority Pattern

```javascript
// ✅ CORRECT: Check legality through PrerequisiteChecker
const checker = new PrerequisiteChecker(actor);
const { legal, reason } = await checker.evaluateAcquisition({
  itemId: featId,
  itemType: 'feat'
});
if (!legal) {
  // Surface to player, don't force-apply
}
```

```javascript
// ✅ CORRECT: Update state through ProgressionSession
session.commitSelection('my-step', 'feats', normalizedFeats);
```

```javascript
// ✅ CORRECT: Mutate actor through MutationPlan
const plan = MutationPlan.compileFromProjection(projection, actor);
await plan.apply(actor);
```

### DON'T: Bypass Authorities

```javascript
// ❌ WRONG: Custom prerequisite checks
if (actor.system.attributes.str < 15) {
  // Don't do this anywhere else
}

// ✅ CORRECT: Use PrerequisiteChecker
const { legal } = checker.evaluateAcquisition(...);
```

```javascript
// ❌ WRONG: Direct actor mutation in step
actor.system.attributes.str.value = 15;
// This bypasses validation and tracking

// ✅ CORRECT: Go through MutationPlan
const plan = MutationPlan.compileFromProjection(projection);
await plan.apply(actor);
```

```javascript
// ❌ WRONG: Competing state stores
this.myCustomState = { selections: [...] };

// ✅ CORRECT: Use ProgressionSession
session.commitSelection('step-id', 'mySelection', value);
```

---

## Validation Workflows

### Before Adding Content

```javascript
// Validate template
const validation = ContentValidator.validateContent('template', template);
if (!validation.valid) {
  console.error('Template invalid:', validation.errors);
  process.exit(1);
}

// Validate node metadata
const nodeValidation = ContentValidator.validateContent('node', nodeMetadata);

// Check production readiness
const ready = SupportTracker.checkProductionReadiness('chargen.actor');
console.log(`Feature ready: ${ready.ready}`);
```

### Comprehensive Audit

```javascript
// Run full validation before deployment
const report = ContentValidator.validateAllContent();
console.log(report.generateReport());

if (report.summary.criticalIssues > 0) {
  console.error('Critical issues found. Fix before deployment.');
  process.exit(1);
}
```

---

## Debugging and Troubleshooting

### Why Isn't a Node Appearing?

```javascript
const debug = ProgressionDebugHelpers.debugNodeActivation(session, 'my-node');
console.log(debug);
// Shows: dependencies, activation policy, mode/subtype match, state
```

### Why Did Suggestion Rank That Way?

```javascript
const debug = ProgressionDebugHelpers.debugSuggestionRanking(
  context,
  option,
  rank
);
console.log(debug);
// Shows: legality, forecast, signal matches, synergies, mentor bias
```

### Why Did Template Fail?

```javascript
const debug = ProgressionDebugHelpers.debugTemplateConflict(session, validationReport);
console.log(debug);
// Shows: conflicts, invalid items, resolution guide
```

### Complete State Dump

```javascript
const dump = ProgressionDebugHelpers.generateCompleteDump(session, shell);
console.log(dump);
// Shows: all selections, active steps, dirty nodes, audit trail
```

---

## Known Technical Debt

### Phase 6 Deferred

These are intentional deferments, not bugs:

1. **Prestige Class System** (Target: Phase 7-8)
   - Basic structure in place
   - Advanced prestige paths not yet modeled
   - Location: `target-registry` (to be created)
   - Impact: Medium (advisory system can work around this)

2. **Follower/Companion Progression** (Target: Phase 7)
   - Structural code exists
   - Not integrated into chargen shell
   - Location: `chargen-shell.js` → add follower mode check
   - Impact: Low (NPC quick-builds work as workaround)

3. **Nonheroic Simplified Rules** (Target: Phase 7)
   - Rules not yet fully specified
   - Structural shell exists
   - Location: `nonheroic-rules.js` (to be created)
   - Impact: Low (can use actor rules with restrictions)

4. **Vehicle/Starship Progression** (Target: Phase 8+)
   - Not started
   - No blocker for core system
   - Impact: None (not required for MVP)

### Phase 6 Partial Support

These work for main use cases but have known gaps:

1. **Multiclass Edge Cases** (Partial)
   - Most combinations work
   - Some prestige multiclass paths incomplete
   - Workaround: Restrict in prerequisites or advisory

2. **Force Droid Edge Cases** (Partial)
   - Core droid system works
   - Force powers on droids partially supported
   - Workaround: Use normal actor for force users

3. **Advanced Advisory Targeting** (Partial)
   - Basic suggestions work
   - Prestige path modeling incomplete
   - Workaround: Manual mentoring for advanced builds

---

## Testing and Validation

### Run Regression Tests

```javascript
const results = await ScenarioTestMatrix.runAll();
console.log(ScenarioTestMatrix.generateReport(results));

// Should show:
// - ✅ All scenario families passing
// - ✅ Parity tests passing
// - ✅ Negative path tests passing
```

### Validate All Content

```javascript
const report = ContentValidator.validateAllContent();
if (!report.summary.healthy) {
  console.error('Content validation failed');
  console.log(ContentValidator.generateReport(report));
}
```

### Check Support Levels

```javascript
const supportReport = SupportTracker.generateSupportReport();
console.log(supportReport);

// Before deploying to production, ensure:
// - Main features are FULL support
// - Partial support areas are documented
// - Unsupported areas don't affect MVP
```

---

## Governance Enforcement

### Check Architecture Compliance

```javascript
const auditReport = ArchitectureGovernance.auditArchitectureBoundaries();
console.log(auditReport);

// Should show:
// - No forbidden imports
// - No competing state stores
// - No duplicate rule engines
// - No direct actor mutations outside plans
```

### Generate Developer Guide

```javascript
const guide = ArchitectureGovernance.generateEnforcementGuide();
console.log(guide);

// Share with team before code changes
```

---

## Safe Change Procedures

### When Modifying Core Infrastructure

1. **Understand Impact**
   ```javascript
   // E.g., changing PrerequisiteChecker
   const audit = ArchitectureGovernance.auditArchitectureBoundaries();
   // Know: PrerequisiteChecker is the sole rules authority
   // All changes must preserve this guarantee
   ```

2. **Test Comprehensively**
   ```javascript
   // Run full scenario matrix
   const results = await ScenarioTestMatrix.runAll();
   // Ensure all scenarios still pass
   ```

3. **Validate Content**
   ```javascript
   // Check templates, nodes, targets still valid
   const report = ContentValidator.validateAllContent();
   // Fix any new validation errors
   ```

4. **Document Changes**
   - Update ARCHITECTURE.md if contract changed
   - Update MAINTENANCE.md if process changed
   - Add test case if new scenario uncovered

### When Adding New Content

1. **Define Contract**
   ```javascript
   // Check ContentContracts for your content type
   const contract = ContentContracts.nodeMetadataContract;
   // Ensure your content matches the schema
   ```

2. **Validate Content**
   ```javascript
   const validation = ContentValidator.validateContent('node', myNode);
   if (!validation.valid) throw validation.errors;
   ```

3. **Add Test Case**
   ```javascript
   // Add to ScenarioTestMatrix for your new node
   ```

4. **Check Support Level**
   ```javascript
   // Use SupportTracker.checkProductionReadiness()
   // Update support matrix if applicable
   ```

---

## Getting Help

### If Something Breaks

1. **Reproduce systematically**
   ```javascript
   const debug = ProgressionDebugHelpers.debugNodeActivation(...);
   // Get detailed state

   const dump = ProgressionDebugHelpers.generateCompleteDump(...);
   // Get complete picture
   ```

2. **Check architecture compliance**
   ```javascript
   const audit = ArchitectureGovernance.auditArchitectureBoundaries();
   // Ensure no boundary violations
   ```

3. **Validate content**
   ```javascript
   const report = ContentValidator.validateAllContent();
   // Check for stale/broken references
   ```

4. **Review logs**
   - swseLogger output shows action sequence
   - Check for warnings about competing authorities

### If You're Adding Something

1. **Read:** ARCHITECTURE.md (what exists)
2. **Follow:** This guide (process)
3. **Validate:** Use ContentValidator
4. **Test:** Add to ScenarioTestMatrix
5. **Check:** Support matrix after completion

---

## Quick Checklist: Safe Extension

Before committing changes:

- [ ] No new competing authorities (PrerequisiteChecker, ProgressionSession, etc.)
- [ ] All state writes via ProgressionSession.commitSelection()
- [ ] All legality checks via PrerequisiteChecker.evaluateAcquisition()
- [ ] All mutations via MutationPlan.apply()
- [ ] Invalidation via ProgressionReconciler only
- [ ] Templates via TemplateAdapter only
- [ ] New content validates against ContentContracts
- [ ] New nodes added to PROGRESSION_NODE_REGISTRY
- [ ] New test scenario added to ScenarioTestMatrix
- [ ] Architecture boundary audit passes
- [ ] Full content validation passes
- [ ] Support levels documented
- [ ] ARCHITECTURE.md updated if contract changed
- [ ] MAINTENANCE.md updated if process changed

---

## Future Phases

### Phase 7 Goals
- Complete follower/companion progression
- Define nonheroic simplified rules
- Build target/prestige registry
- Extend advisory metadata coverage
- Integrate all into chargen shell

### Phase 8+ Goals
- Vehicle/starship progression system
- Advanced targeting and prestige paths
- UI/UX polish and customization
- Performance optimization
- Content expansion library

---

**For questions:** See ARCHITECTURE.md or search for relevant modules.

**For bugs:** File with architecture audit results and debug dumps.

**For extensions:** Follow process in this guide.
