# Phase 3: Unified Progression Architecture - Strategic Plan

**Date:** 2026-01-26
**Scope:** Consolidate chargen, progression engine, and templates into ONE unified system
**Savings Potential:** 1,000+ lines through elimination of 3-way duplication
**Complexity:** HIGH - Requires coordinated refactoring of 87 files

---

## THE PROBLEM: 3-Way Duplication

Currently, character creation uses **THREE separate paths** that each do the same work:

### Path 1: Chargen Direct (2,634 lines)
```
species → _applySpeciesData() [chargen-species.js:370-451]
  ↓
class → _onSelectClass() [chargen-class.js]
  ↓
feats → _onSelectFeat() [chargen-feats-talents.js]
  ↓
talents → _onSelectTalent() [chargen-feats-talents.js]
  ↓
(All stored in memory in this.characterData)
  ↓
_createActor() [chargen-main.js:2644-2720]
  ↓
Items created with embedded documents
```

**Key Issue:** Chargen applies rules in-memory, THEN creates actor in one bulk operation

### Path 2: Progression Engine (71 files)
```
confirmSpecies → _action_confirmSpecies() [progression.js:1025-1060]
  ↓ (immediately updates actor)
confirmClass → _action_confirmClass()
  ↓ (immediately updates actor)
confirmFeats → _action_confirmFeats() [progression.js:1513-1534]
  ↓ (immediately updates actor)
confirmTalents → _action_confirmTalents()
  ↓ (immediately updates actor)
  ↓
finalize() [finalize-integration.js]
  ↓
Feature dispatcher creates items [feature-dispatcher.js]
```

**Key Issue:** Progression updates actor immediately with each action

### Path 3: Template Creator (template-character-creator.js)
```
createFromTemplate()
  ↓
_applyClass() [direct]
  ↓
_applySkills() [direct]
  ↓
applyTemplateFeat() [direct, chargen-feats-talents.js]
  ↓
applyTemplateTalent() [direct, chargen-feats-talents.js]
  ↓
(Bypass progression engine entirely)
```

**Key Issue:** Template path doesn't use progression engine at all

---

## ROOT CAUSE: Three Different Decision/Application Models

| Model | Store | Apply | When | Path |
|-------|-------|-------|------|------|
| **Chargen** | In-memory (characterData) | Bulk at end (_createActor) | Single actor creation | Direct |
| **Progression** | To actor immediately | Immediately with each action | Throughout play | Through engine |
| **Template** | Not stored, applied direct | Direct function calls | Single template application | Bypass |

**The Stress:** Each path:
- Has its own validation logic
- Applies rules independently
- Creates items differently
- Manages state differently
- Has separate mentor integration

---

## THE SOLUTION: One Unified Progression Engine

Make the progression engine the **canonical character creation system**:

```
┌──────────────────────────────────────────────────────┐
│  CHARGEN UI                TEMPLATE UI               │
│  (decision collection)    (template selection)       │
└──────────────┬─────────────────────────────┬─────────┘
               │                             │
               └─────────────┬───────────────┘
                             │
                    ┌────────▼────────┐
                    │ SWSEProgressionEngine
                    │  (SINGLE TRUTH)
                    │
                    │ • doAction()
                    │ • applyTemplatePackage()
                    │ • finalize()
                    │
                    │ Manages:
                    │ • Species rules
                    │ • Class features
                    │ • Feat/talent
                    │   validation & application
                    │ • Mentor integration
                    │ • Item creation
                    │ • State management
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ actor.system
                    │ actor.items
                    │ (Final state)
                    └─────────────────┘
```

---

## SPECIFIC CONSOLIDATIONS

### 1. Species Application (3-WAY → 1-WAY)

**Current:**
- Chargen: `chargen-species.js:370-451` applies species mods directly to characterData
- Progression: `progression.js:1025-1060` applies species mods to actor
- Template: `template-creator.js:340` applies species separately

**Unified:**
```javascript
// Only in progression engine:
_action_confirmSpecies(payload) {
  const species = this._loadSpeciesData(payload.speciesId);

  // Apply ALL species rules here
  this._applySpeciesAbilityModifiers(species);
  this._applySpeciesSize(species);
  this._applySpeciesSpeed(species);
  this._applySpeciesLanguages(species);
  this._applySpeciesFeatGrants(species);

  // Store in progression state
  actor.update({
    'system.progression.species': payload.speciesId,
    'system.race': species.name,
    'system.size': species.size,
    'system.speed': species.speed,
    // ... other fields
  });
}

// Chargen calls:
await engine.doAction('confirmSpecies', { speciesId: speciesId });

// Template calls:
await engine.applyTemplateStep('confirmSpecies', template.species);
```

**Files Affected:**
- DELETE duplication in `chargen-species.js` (delete _applySpeciesData method)
- DELETE duplication in `template-creator.js` (delete species application logic)
- KEEP only in `progression.js` (canonical location)

**Savings:** ~100 lines of duplicate code

---

### 2. Feat/Talent Application (3-WAY → 1-WAY)

**Current:**
- Chargen: `chargen-feats-talents.js:127-150` stores in characterData
- Progression: `feat-engine.js:43-106` + `progression.js:1536-1583` creates items and validates
- Template: `template-creator.js:352` calls direct functions

**Unified:**
```javascript
// Only in progression/feats/feat-engine.js:
async confirmFeat(actor, featId, options = {}) {
  const feat = this._loadFeat(featId);

  // Validate prerequisites (SINGLE location)
  this._validatePrerequisites(feat, actor);

  // Check budget
  this._validateFeatBudget(actor, feat);

  // Prevent duplicates
  this._preventDuplicate(actor, featId);

  // Create feat item
  await this._createFeatItem(actor, feat, options);

  // Store in progression state
  actor.update({
    'system.progression.feats': [..., featId]
  });
}

// Chargen calls:
const feat = await engine.confirmFeat(actor, featId);

// Template calls:
for (const featId of template.feats) {
  await engine.confirmFeat(actor, featId);
}
```

**Files Affected:**
- DELETE all feat/talent logic from `chargen-feats-talents.js`
- DELETE all feat/talent logic from `template-creator.js`
- KEEP only in `feat-engine.js` + `talent-engine.js` (canonical locations)

**Savings:** ~200 lines of duplicate code

---

### 3. Mentor Integration (3-WAY → 1-WAY)

**Current:**
- Chargen: `mentor-survey.js` + `BuildIntent` in chargen-main.js (influence feat suggestions)
- Progression: `mentor-memory.js` (tracks for level-up)
- Template: `mentor-dialogue.json` + `template-creator.js:154-255` (narrative only)

**Unified:**
```javascript
// In progression engine:
async confirmMentor(mentorClass, options = {}) {
  // Store in progression state (SINGLE SOURCE)
  actor.update({
    'system.progression.mentor': mentorClass,
    'system.mentorMemory': {
      class: mentorClass,
      biases: this._getMentorBiases(mentorClass),
      dialogueHistory: []
    }
  });
}

// During feat/talent/power selection:
_scoreForFeatSuggestion(feat) {
  const mentorBias = actor.system.mentorMemory?.biases?.[feat.type];
  // Use SAME mentor data throughout chargen and progression
  return baseScore * (mentorBias || 1.0);
}

// Chargen calls:
await engine.confirmMentor(selectedMentorClass);

// Chargen feat selection uses same biases:
const suggestions = this._scoreFeatsByMentor(actor.system.mentorMemory);

// Template shows mentor narrative (optional):
const dialogue = getMentorDialogue(mentorClass, 'template-intro');
```

**Files Affected:**
- DELETE mentor logic from chargen-main.js (chargen-specific part, keep UI)
- DELETE mentor-dialogue-integration.js (already dead)
- DELETE mentor-dialogue-v2-integration.js (if not used)
- CONSOLIDATE chargen mentor-survey.js + progression mentor-memory.js into progression mentor-integration.js

**Savings:** ~150 lines of duplicate mentor logic + data consolidation

---

### 4. Item Creation (3-WAY → 1-WAY)

**Current:**
- Chargen: `chargen-main.js:2644-2720` creates items directly with embedded documents
- Progression: `feature-dispatcher.js:16-150` + `feat-engine.js` etc. create items via specialized engines
- Template: Direct calls to application functions

**Unified:**
```javascript
// In progression/feats/feat-engine.js (SINGLE LOCATION):
async _createFeatItem(actor, feat, options = {}) {
  const itemData = this._buildFeatItemData(feat, options);

  const item = await actor.createEmbeddedDocuments('Item', [itemData]);
  return item[0];
}

// NEVER create items anywhere else in chargen or template code

// All item creation routes through:
// - FeatEngine.learn() - for feats
// - TalentEngine.learn() - for talents
// - ForceProgressionEngine.grantPower() - for force powers
// - etc.
```

**Files Affected:**
- DELETE all item creation from `chargen-main.js:2644-2720`
- DELETE all item creation from `template-creator.js`
- KEEP only in specialized engines (feat-engine, talent-engine, etc.)
- Have chargen/template call these engines instead

**Savings:** ~300 lines of duplicate item creation code

---

## IMPLEMENTATION ROADMAP

### Phase 3A: Refactor Progression Engine (8-10 hours)

1. **Add template application method:**
   ```javascript
   // In SWSEProgressionEngine:
   async applyTemplatePackage(templateId, options = {}) {
     const template = PROGRESSION_RULES.templates[templateId];

     await this.doAction('confirmSpecies', { speciesId: template.species });
     await this.doAction('confirmBackground', { bgId: template.background });
     await this.doAction('confirmAbilities', { method: 'preset', values: template.abilities });
     // ... all template steps

     return this.finalize();
   }
   ```

2. **Add mentor integration:**
   ```javascript
   async confirmMentor(mentorClass, options = {}) {
     // Stores in system.progression.mentor + system.mentorMemory
   }
   ```

3. **Expose feat/talent/species confirmation as public methods**
   - Instead of just `doAction('confirmFeats', ...)`, expose:
   - `async confirmFeat(actor, featId)`
   - `async confirmSpecies(actor, speciesId)`
   - etc.

4. **Centralize mentor-influenced suggestions**
   - All feat/talent/power scoring uses same mentor data source
   - Move BuildIntent into progression engine as internal state

5. **Add validation consolidation**
   - Single prerequisite validation engine
   - Single feat budget validation
   - Single duplicate detection

### Phase 3B: Refactor Chargen (6-8 hours)

1. **Remove duplicate species logic** from `chargen-species.js`
   - Keep UI, remove `_applySpeciesData()`
   - Have `_onSelectSpecies()` call `engine.doAction('confirmSpecies', ...)`

2. **Remove duplicate feat/talent logic** from `chargen-feats-talents.js`
   - Keep UI, remove validation and application
   - Have `_onSelectFeat()` call `engine.confirmFeat(...)`
   - Have `_onSelectTalent()` call `engine.confirmTalent(...)`

3. **Refactor `_createActor()`** in `chargen-main.js`
   - Remove item creation code (now in specialized engines)
   - Just call `engine.finalize()`
   - Engine handles ALL item creation

4. **Consolidate mentor survey**
   - Remove chargen-specific mentor logic
   - Have UI call `engine.confirmMentor(selectedClass)`
   - Let progression engine manage all mentor state

### Phase 3C: Refactor Templates (3-4 hours)

1. **Remove duplicate application logic** from `template-creator.js`
   - Don't call `applyTemplateFeat()` directly
   - Call `engine.applyTemplatePackage(templateId)` instead
   - One method, one path

2. **Template dialogues optional enhancement**
   - Can show mentor dialogue before/after template creation
   - But template data flows through progression engine
   - No special template application path

### Phase 3D: Consolidate Mentor System (4-6 hours)

1. **Merge mentor-survey + mentor-memory** into ONE mentor integration
   - Chargen survey data feeds into progression.mentorMemory
   - Same data available for level-up decisions
   - No separate data stores

2. **Move BuildIntent biases to mentor data**
   - feat suggestions use mentor biases from progression state
   - No separate BuildIntent calculation

3. **Create unified mentor API**
   - All mentor queries go through ONE system
   - Both chargen and progression use same API

---

## BEFORE & AFTER CODE EXAMPLES

### Species Selection

**BEFORE (3-way duplication):**
```javascript
// chargen-species.js - applies to characterData
_applySpeciesData(speciesId) {
  const species = SPECIES_DATA[speciesId];
  this.characterData.size = species.size;
  this.characterData.speed = species.speed;
  // 50 lines of duplicate application logic
}

// progression.js - applies to actor
_action_confirmSpecies(payload) {
  const species = loadSpeciesDocument(payload.speciesId);
  actor.update({
    'system.size': species.size,
    'system.speed': species.speed
  });
  // 35 lines of duplicate application logic
}

// template-creator.js - applies again
_applySpeciesBonus(actor, species) {
  actor.system.race = species.name;
  actor.system.size = species.size;
  // 25 lines of duplicate application logic
}
```

**AFTER (single path):**
```javascript
// progression.js - ONLY location
async confirmSpecies(actor, speciesId) {
  const species = loadSpeciesDocument(speciesId);
  await this._applyAllSpeciesRules(actor, species);

  actor.update({
    'system.progression.species': speciesId,
    'system.race': species.name,
    'system.size': species.size,
    'system.speed': species.speed,
    // ... all rules applied once
  });
}

// chargen-species.js - ONLY calls progression
_onSelectSpecies(speciesId) {
  await this.engine.confirmSpecies(this.actor, speciesId);
}

// template-creator.js - ONLY calls progression
await this.engine.confirmSpecies(actor, template.species);
```

**Savings:** 110+ lines eliminated, single source of truth

---

### Feat Selection

**BEFORE (3-way duplication):**
```javascript
// chargen-feats-talents.js
_onSelectFeat(featId) {
  this._validateFeatPrerequisites(featId);
  this._validateFeatBudget(featId);
  this._preventDuplicate(this.characterData.feats, featId);
  this.characterData.feats.push(featId);
}

// feat-engine.js
async learn(actor, featId) {
  this._validatePrerequisites(feat, actor);
  this._validateFeatBudget(actor, feat);
  const item = await this._createFeatItem(actor, feat);
  actor.update({ 'system.feats': [..., item.id] });
}

// template-creator.js
applyTemplateFeat(actor, featId) {
  CharacterTemplates.applyTemplateFeat(actor, featId);
  // Direct application, no validation
}
```

**AFTER (single validation path):**
```javascript
// feat-engine.js - ONLY location for feat logic
async confirmFeat(actor, featId, options = {}) {
  const feat = this.loadFeat(featId);
  this.validatePrerequisites(feat, actor);  // ONCE
  this.validateBudget(actor);               // ONCE
  this.preventDuplicate(actor, featId);     // ONCE

  const item = await this._createFeatItem(actor, feat);
  actor.update({
    'system.progression.feats': [..., featId]
  });

  return { item, feat };
}

// chargen-feats-talents.js - ONLY calls engine
_onSelectFeat(featId) {
  const result = await this.engine.confirmFeat(this.actor, featId);
  this._updateUI(result); // Just refresh UI
}

// template-creator.js - ONLY calls engine
for (const featId of template.feats) {
  await this.engine.confirmFeat(actor, featId);
}
```

**Savings:** 150+ lines eliminated, unified validation

---

## FILES THAT WILL CHANGE

### Delete (Dead Code After Consolidation)
- `scripts/apps/chargen/chargen-species.js` (method `_applySpeciesData` removed)
- `scripts/apps/template-character-creator.js` (method `_applySpeciesBonus` removed)
- Large portions of `chargen-feats-talents.js` (validation removed)
- Large portions of `chargen-main.js` (item creation removed)
- Duplicate mentor files (consolidate to single integration)

### Significantly Modified
- `scripts/engine/progression.js` (add public API methods)
- `scripts/progression/feats/feat-engine.js` (become canonical)
- `scripts/progression/talents/talent-engine.js` (become canonical)
- `scripts/apps/chargen/chargen-main.js` (UI only, no logic)
- `scripts/apps/template-character-creator.js` (use engine only)

### Expanded (New Methods)
- `scripts/engine/progression.js` (add applyTemplatePackage, confirmMentor, etc.)
- `scripts/progression/integration/mentor-integration.js` (consolidated mentor handling)

### Unchanged
- `scripts/progression/data/progression-data.js` (remains SSOT for rules)
- All compendium loading and data access
- All UI logic in chargen
- All rendering in template creator

---

## EXPECTED OUTCOMES

### Code Consolidation
| Category | Before | After | Savings |
|----------|--------|-------|---------|
| Species application | 3 locations | 1 location | 100+ lines |
| Feat application | 3 locations | 1 location | 150+ lines |
| Talent application | 3 locations | 1 location | 100+ lines |
| Item creation | 3 locations | 1 location | 300+ lines |
| Mentor integration | 3 locations | 1 location | 150+ lines |
| Validation logic | Multiple | Single | 150+ lines |
| **Total** | - | - | **950+ lines** |

### Architectural Improvements
✅ Single progression engine as SSOT for all character creation
✅ Consistent validation rules (not duplicated)
✅ Consistent state management (system.progression is only source)
✅ Single mentor data store (no split between chargen/progression)
✅ Single item creation path (no duplicate logic)
✅ Templates become first-class progression feature (not workaround)
✅ Chargen becomes UI-only (no business logic)
✅ Progression engine is reusable (templates, chargen, level-up all use it)

### Reduced System Stress
- No inconsistent data between chargen and progression
- No mentor biases lost between chargen and level-up
- No item creation differences between paths
- No duplicate validation errors
- No confusing three-path architecture

---

## RISK ASSESSMENT

**Risk Level: MEDIUM** (Lower risk if done incrementally)

**Why medium?**
- Affects core character creation paths
- Three paths currently exist, so changes must be coordinated
- Must maintain backward compatibility with existing characters

**Mitigation:**
- Test each consolidation independently
- Migrate one system at a time (species → feats → mentor → items)
- Keep chargen and template UIs unchanged initially
- Progression engine already handles these, so we're removing duplicates not adding new code

**Why NOT high-risk?**
- Progression engine already works correctly
- We're removing duplicate code, not changing behavior
- Chargen and template just call progression engine instead of doing their own work
- All complex logic already in progression engine

---

## DECISION POINT

**Should we proceed with Phase 3: Unified Progression Consolidation?**

### Option A: Full Consolidation
- Eliminate 3-way duplication
- Single progression engine as SSOT
- 950+ lines saved
- 8-10 weeks of coordinated refactoring
- Highest architectural clarity

### Option B: Incremental Consolidation
- Do one system at a time (species first, then feats, etc.)
- 3-4 weeks spread over time
- Same final outcome
- Less risky (test between phases)

### Option C: Pause Here
- Phase 2 complete (mentor consolidation done)
- Phase 1 complete (suggestion engines merged)
- Review and test before Phase 3
- User can decide on consolidation scope

**Recommendation:** Start with Phase 3A (Refactor Progression Engine) to expose public API methods. This prepares infrastructure for chargen/template consolidation without breaking anything.

---

## Next Steps

**If proceeding with Phase 3:**

1. Read current progression.js structure
2. Design public API methods (`confirmFeat`, `confirmSpecies`, etc.)
3. Test methods in isolation
4. Update chargen to use new API (phase by phase)
5. Update template to use new API
6. Remove duplicate code from chargen and template
7. Consolidate mentor system

**If pausing for review:**
- Current Phase 2 (mentor consolidation) is complete
- Document Phase 3 strategy (this file)
- User reviews and decides on timing

