# SWSE v2 Migration - Comprehensive Implementation Plan

This document provides a complete roadmap for migrating the SWSE system to Foundry v2 architecture with full transactional progression, draft character state, and data-driven rules.

## Executive Summary

**Goal:** Transform SWSE into a robust, v2-compliant system with transactional character progression that eliminates state corruption bugs.

**Status:**
- ✅ Phase A-C: Core architecture implemented (ProgressionSession, DraftCharacter, MentorSystem)
- ✅ Phase D: Rule element system designed
- 🔄 Phase E: This implementation plan
- ⏳ Phase F-H: Integration with existing UI (pending)

**Timeline:** 4-6 weeks for full migration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    User Interface                    │
│  (Chargen UI, Level-Up UI, Character Sheet)         │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────┐
│              SWSEProgressionEngine                   │
│  - createSession() / startLevelUpSession()           │
│  - Session management & lifecycle                    │
└───────────────┬─────────────────────────────────────┘
                │
      ┌─────────┴────────┬──────────────┬─────────────┐
      ▼                  ▼              ▼             ▼
┌──────────────┐  ┌──────────────┐  ┌────────┐  ┌──────────┐
│ Progression  │  │    Draft     │  │ Mentor │  │   Rule   │
│   Session    │  │  Character   │  │ System │  │ Elements │
│              │  │              │  │        │  │          │
│ - Staging    │  │ - Separate   │  │ - Async│  │ - Data   │
│ - Commit     │  │   state      │  │ - Fault│  │   driven │
│ - Rollback   │  │ - Backtrack  │  │   safe │  │ - Self   │
│              │  │ - Validate   │  │        │  │   apply  │
└──────────────┘  └──────────────┘  └────────┘  └──────────┘
      │                  │              │             │
      └──────────────────┴──────────────┴─────────────┘
                         │
                         ▼
               ┌──────────────────┐
               │  Actor Document  │
               │  (Foundry Core)  │
               └──────────────────┘
```

---

## Phase Breakdown

### Phase A: Session-Level Transactions ✅ COMPLETE

**Files:**
- `scripts/engine/ProgressionSession.js`
- `templates/chat/progression-session-summary.hbs`

**What It Does:**
- Wraps entire chargen/levelup workflows in transactions
- All changes staged in memory until commit
- Atomic application prevents partial updates
- Rollback restores pre-session state

**Integration Points:**
- `SWSEProgressionEngine.createSession()`
- `SWSEProgressionEngine.startLevelUpSession()`
- `SWSEProgressionEngine.startChargenSession()`

**Testing:**
```javascript
const engine = new SWSEProgressionEngine(actor, "levelup");
const session = await engine.startLevelUpSession();
await session.addClassLevel("jedi");
await session.addTalent("Block");
const preview = await session.preview();
await session.commit(); // or session.rollback()
```

---

### Phase B: Draft Character Model ✅ COMPLETE

**Files:**
- `scripts/engine/DraftCharacter.js`

**What It Does:**
- Separate state model for character-in-progress
- Immutable base (original actor never touched)
- Downstream invalidation (changing species clears class/skills)
- Preview computation without mutation
- Atomic merge to actor only on confirmation

**Integration Points:**
- Used internally by ProgressionSession
- Can be used standalone for "what-if" builds

**Testing:**
```javascript
const draft = new DraftCharacter(actor);
draft.setSpecies("Human");
draft.addClass("Jedi");
draft.addTalent("Block");
const preview = await draft.computePreview();
const valid = await draft.validate();
if (valid) {
  await draft.mergeToActor();
}
```

---

### Phase C: Async Mentor System ✅ COMPLETE

**Files:**
- `scripts/engine/MentorSystem.js`

**What It Does:**
- Event-driven mentor advice via Foundry hooks
- Never blocks progression flow
- Fault tolerance (errors logged but don't propagate)
- Hybrid: authored + AI-generated suggestions
- Caching for repeated contexts

**Integration Points:**
- Listens to hooks: `swse:classSelected`, `swse:talentSelected`, etc.
- Posts whisper chat messages
- Fully independent from core mechanics

**Testing:**
```javascript
const mentor = new MentorSystem(actor);
await mentor.initialize();
mentor.enable();

// Mentor listens for events
Hooks.call('swse:classSelected', { classId: 'jedi', level: 1 });
// Mentor posts suggestion to chat (async, non-blocking)
```

---

### Phase D: Rule Element System ✅ COMPLETE

**Files:**
- `scripts/engine/RuleElement.js`
- `docs/RULE_ELEMENTS_MIGRATION_GUIDE.md`

**What It Does:**
- Data-driven feat/talent effects
- Self-applying items (no hard-coded logic)
- Automatic removal when item deleted
- Composable rule elements

**Rule Types:**
- StatBonus
- GrantAbility
- SkillTraining
- AttributeModifier
- ConditionalBonus
- Prerequisite

**Integration Points:**
- Items carry `system.rules` array
- `RuleEngine.applyAllRules(actor)` applies all rules
- Hooks on item create/delete auto-apply/remove

**Testing:**
```javascript
// In feat compendium data
{
  "name": "Dodge",
  "system": {
    "rules": [
      { "type": "StatBonus", "stat": "reflex", "value": 1, "bonusType": "dodge" }
    ]
  }
}

// Application
const ruleEngine = new RuleEngine(actor);
await ruleEngine.applyAllRules();
```

---

### Phase E: Implementation Plan ✅ COMPLETE

**This document!**

---

### Phase F: UI Integration (NEXT)

**Goal:** Migrate existing chargen/levelup UIs to use new architecture

**Workstreams:**

#### F1: Chargen UI Migration
**Files to modify:**
- `scripts/apps/chargen/chargen-main.js`
- `scripts/apps/chargen/chargen-shared.js`
- `scripts/apps/chargen/chargen-class.js`
- `scripts/apps/chargen/chargen-feats-talents.js`

**Changes:**
1. Replace direct actor updates with session staging
2. Add "Review & Confirm" final step
3. Preview shows draft character state
4. Backtracking clears downstream choices
5. Commit only on final confirmation

**Before:**
```javascript
// chargen-main.js
await actor.update({ 'system.progression.species': speciesId });
```

**After:**
```javascript
// chargen-main.js
const session = this.progressionSession;
await session.setSpecies(speciesId);
const preview = await session.preview();
this.render(); // Shows preview, doesn't commit
```

#### F2: Level-Up UI Migration
**Files to modify:**
- `scripts/apps/levelup/levelup-main.js`
- `scripts/apps/levelup/levelup-class.js`
- `scripts/apps/levelup/levelup-talents.js`
- `scripts/apps/levelup/levelup-feats.js`

**Changes:**
1. Open level-up in modal dialog
2. All choices staged in session
3. Preview shows what character will become
4. Cancel button discards session
5. Confirm button commits atomically

**Before:**
```javascript
// levelup-main.js
await actor.update({ 'system.level': newLevel });
await actor.createEmbeddedDocuments('Item', [talent]);
```

**After:**
```javascript
// levelup-main.js
const session = await engine.startLevelUpSession();
await session.addClassLevel(classId);
await session.addTalent(talentId);
const preview = await session.preview();
// User clicks confirm
await session.commit();
```

#### F3: Character Sheet Integration
**Files to modify:**
- `scripts/apps/character-sheet-v2.js`

**Changes:**
1. Add "Level Up" button that opens transactional dialog
2. Show active session indicator if in progress
3. Allow resuming incomplete sessions

---

### Phase G: Compendium Migration (ONGOING)

**Goal:** Add rule elements to all feats/talents in compendium

**Process:**
1. Inventory all feats/talents (200+ items)
2. Categorize by effect type
3. Design rule elements for each category
4. Batch update compendium items
5. Test each category

**Priority Categories:**
1. **Simple stat bonuses** (50 items) - Week 1
   - Weapon Focus, Dodge, Skill Focus, etc.
   - Single StatBonus rule
2. **Ability grants** (30 items) - Week 2
   - Deflect, Block, Sprint, etc.
   - GrantAbility rule
3. **Conditional bonuses** (40 items) - Week 3
   - Point Blank Shot, Precise Shot, etc.
   - ConditionalBonus rule
4. **Complex multi-rule** (80 items) - Week 4-5
   - Feats with prerequisites + effects
   - Multiple rule elements

**Automation Script:**
```javascript
// tools/migrate-feats-to-rules.js
async function migrateFeat(featName, ruleElements) {
  const pack = game.packs.get('foundryvtt-swse.feats');
  const feat = pack.index.find(i => i.name === featName);
  const doc = await pack.getDocument(feat._id);

  await doc.update({
    'system.rules': ruleElements
  });
}

// Example usage
await migrateFeat('Dodge', [
  { type: 'StatBonus', stat: 'reflex', value: 1, bonusType: 'dodge' }
]);
```

---

### Phase H: Testing & Validation (FINAL)

**Test Categories:**

#### H1: Unit Tests
- [ ] ProgressionSession commit/rollback
- [ ] DraftCharacter validation
- [ ] RuleElement application/removal
- [ ] MentorSystem fault tolerance

#### H2: Integration Tests
- [ ] Full chargen workflow (species → finalize)
- [ ] Level-up workflow (level 1 → 2)
- [ ] Backtracking (change species mid-chargen)
- [ ] Multiple level-ups in sequence
- [ ] Template character creation

#### H3: Regression Tests
- [ ] Existing characters still work
- [ ] Derived stats calculate correctly
- [ ] Items apply effects
- [ ] Chat messages post correctly

#### H4: Edge Case Tests
- [ ] Network failure during commit
- [ ] Page reload mid-chargen
- [ ] Concurrent sessions (multiple actors)
- [ ] Invalid selections (budget exceeded)
- [ ] Prerequisite violations

**Test Script:**
```javascript
// tests/progression-test-suite.js
async function testFullChargen() {
  const actor = await Actor.create({ name: "Test", type: "character" });
  const engine = new SWSEProgressionEngine(actor, "chargen");
  const session = await engine.startChargenSession();

  // Species
  await session.setSpecies("Human", "str");

  // Class
  await session.addClassLevel("jedi");

  // Abilities
  await session.setAbilities({
    str: 14, dex: 12, con: 13,
    int: 10, wis: 15, cha: 8
  }, "pointBuy");

  // Skills
  await session.addSkills(["useTheForce", "perception"]);

  // Feats
  await session.addFeats(["Force Sensitive"]);

  // Talents
  await session.addTalents(["Force Training"]);

  // Validate
  const preview = await session.preview();
  assert(preview.valid, "Chargen should be valid");

  // Commit
  const result = await session.commit();
  assert(result.success, "Commit should succeed");

  // Verify
  assert.equal(actor.system.level, 1);
  assert.equal(actor.system.progression.species, "Human");
  assert.equal(actor.system.progression.classLevels[0].class, "jedi");

  console.log("✅ Full chargen test passed");
}
```

---

## Migration Checklist

### Pre-Migration
- [ ] Back up production world
- [ ] Test in development environment
- [ ] Document current chargen flow
- [ ] Identify all hard-coded feat/talent logic

### Migration Execution
- [x] Phase A: ProgressionSession
- [x] Phase B: DraftCharacter
- [x] Phase C: MentorSystem
- [x] Phase D: RuleElements
- [x] Phase E: Implementation Plan
- [ ] Phase F: UI Integration
- [ ] Phase G: Compendium Migration
- [ ] Phase H: Testing & Validation

### Post-Migration
- [ ] Remove legacy progression code
- [ ] Update documentation
- [ ] Release notes for players
- [ ] Performance monitoring

---

## Rollback Plan

If migration causes critical issues:

### Step 1: Revert Git Branch
```bash
git checkout main
git branch -D claude/foundry-v2-migration-RkzSc
```

### Step 2: Restore World Backup
- Use Foundry's world backup restoration
- Or manually restore from `Data/worlds/[world-name]`

### Step 3: Communicate to Players
- Announce rollback in Discord/forums
- Explain issue and timeline for fix
- Provide workarounds if possible

---

## Performance Considerations

### Expected Performance Impact

**ProgressionSession:**
- Staging: Minimal (in-memory operations)
- Commit: ~100-200ms (single actor update + item creation)
- Memory: ~50KB per active session

**DraftCharacter:**
- Preview computation: ~50-100ms
- Validation: ~20-50ms
- Merge: ~100-200ms (same as session commit)

**RuleEngine:**
- Apply all rules: ~50ms per 10 rules
- Recalculate: ~100ms (clear + reapply)
- Per-item application: ~5-10ms

**MentorSystem:**
- Authored suggestions: <10ms (cache lookup)
- AI suggestions: 1-3s (external API call, async)
- Total impact: 0ms (async, doesn't block)

### Optimization Strategies

1. **Lazy Loading:** Only load rule engine when needed
2. **Caching:** Cache computed previews
3. **Batching:** Apply multiple rules in single update
4. **Debouncing:** Delay validation until user stops typing

---

## Support & Troubleshooting

### Common Issues

**Issue:** Session won't commit
- **Cause:** Validation errors
- **Fix:** Check `session.validationErrors`

**Issue:** Draft character preview wrong
- **Cause:** Stale computed state
- **Fix:** Call `draft._markDirty()` then `computePreview()`

**Issue:** Mentor not posting suggestions
- **Cause:** Disabled or hook not fired
- **Fix:** Check `mentor.enabled` and hook registration

**Issue:** Rule elements not applying
- **Cause:** Missing `system.rules` or invalid rule type
- **Fix:** Verify rule element syntax in compendium

### Debug Mode

Enable detailed logging:
```javascript
CONFIG.debug.swse = true;
CONFIG.debug.swse.progression = true;
CONFIG.debug.swse.mentor = true;
CONFIG.debug.swse.rules = true;
```

### Reporting Issues

Include:
1. Steps to reproduce
2. Console error messages
3. Actor ID and name
4. Session ID (if applicable)
5. Browser/Foundry version

---

## Timeline

### Week 1-2: UI Integration (Phase F)
- Modify chargen UI to use sessions
- Modify levelup UI to use sessions
- Add "Review & Confirm" step
- Test backtracking

### Week 3-4: Compendium Migration (Phase G)
- Migrate simple feats (stat bonuses)
- Migrate ability-granting talents
- Migrate conditional bonuses
- Test each category

### Week 5: Complex Migrations
- Multi-rule feats
- Prestige class prerequisites
- Force power prerequisites
- Edge cases

### Week 6: Testing & Polish (Phase H)
- Full test suite
- Regression testing
- Performance optimization
- Bug fixes

---

## Success Criteria

### Must Have
- [ ] Chargen completes without errors
- [ ] Level-up completes without errors
- [ ] Backtracking works (no ghost data)
- [ ] Session rollback works
- [ ] Existing characters unaffected

### Should Have
- [ ] 80%+ feats using rule elements
- [ ] Mentor provides suggestions
- [ ] Performance <200ms for commits
- [ ] No console errors

### Nice to Have
- [ ] 100% feats using rule elements
- [ ] AI mentor integration
- [ ] Session persistence across reloads
- [ ] Visual diff preview

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Begin Phase F** (UI integration)
3. **Create GitHub issues** for each workstream
4. **Set up test environment**
5. **Start weekly progress reviews**

---

## Questions?

Contact the development team or refer to:
- `docs/RULE_ELEMENTS_MIGRATION_GUIDE.md`
- `scripts/engine/ProgressionSession.js`
- `scripts/engine/DraftCharacter.js`
- `scripts/engine/MentorSystem.js`
- `scripts/engine/RuleElement.js`
