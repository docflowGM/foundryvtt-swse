# Phase 5: Template/Fast-Build Integration — Audit Report

**Date:** March 27, 2026
**Status:** Audit Complete, Ready for Phase 5 Implementation
**Finding:** Existing template infrastructure is reusable with adapters. No rebuild needed.

---

## Executive Summary

The codebase **already has a functioning template system** that can be adopted and integrated into the Phase 1-4 progression infrastructure. The system includes:

✅ **Template loader** (`CharacterTemplates`)
✅ **Template UI** (`TemplateCharacterCreator`)
✅ **Template applicator** (`TemplateEngine`)
✅ **Template data** (JSON with ID-based references)
✅ **Archetype registry** for build metadata

**What needs to change:**
- Template data flow into **canonical progressionSession** instead of direct actor mutation
- Template validation against **current prerequisite authority**
- Integration with **Phase 3 projection** for review
- Integration with **Phase 4 advisory** for conflicts

---

## Inventory of Existing Template Infrastructure

### 1. Template Data Files

**Location:** `data/character-templates.json` (in system data directory)

**Format:** Version 2 (ID-based)
```javascript
{
  version: 2,
  templates: [
    {
      id: "scout-pilot",
      name: "Scout Pilot",
      label: "Scout Pilot Fast Build",
      description: "A mobile scout specializing in piloting and reconnaissance",
      class: "Scout",
      speciesId: "...",       // Compendium ID
      classId: "...",         // Compendium ID
      backgroundId: "...",    // Registry slug
      featIds: [...],         // Array of compendium IDs
      talentIds: [...],       // Array of compendium IDs
      talentTreeIds: [...],   // Array of tree IDs
      forcePowerIds: [...],   // Array of power IDs
      itemIds: [...],         // Equipment IDs
      skills: [...],          // Skill names
      abilities: { str: 14, dex: 16, ... },  // Ability scores
      mentor: "obi-wan",      // Mentor key
      ...
    }
  ]
}
```

**Status:** ✅ Reusable as-is
- Uses UUID-based references (matches Phase 1 ID-first resolution)
- Includes validation against compendiums
- Version-controlled format

---

### 2. CharacterTemplates Loader (`chargen-templates.js`)

**Responsibilities:**
- Load templates from JSON
- Validate template IDs against compendiums
- Report validation failures
- Cache loaded templates

**Methods:**
- `loadTemplates()` → Load and validate
- `_validateTemplateIds(templates)` → Check all IDs exist
- `_validateSingleTemplate(template)` → Validate one template

**Status:** ✅ Reusable with minimal changes
- Can be refactored to populate progressionSession instead of direct actor mutation
- Validation logic remains the same

---

### 3. TemplateCharacterCreator UI (`template-character-creator.js`)

**Responsibilities:**
- Class selection UI
- Template card display
- Mentor dialogue integration
- Character creation flow

**Features:**
- Class-first navigation
- Template cards with mentor preview
- Custom build fallback
- Mentor dialogue display

**Status:** ✅ Reusable for UI flow
- Can be adapted to feed templates into progressionSession mode
- Mentor context can source from Phase 4 advisory system

---

### 4. TemplateEngine (`template-engine.js`)

**Current Behavior:**
- Takes actor + template
- Calls `SWSEProgressionEngine.doAction()` for each domain (species, background, abilities, class, skills, feats, talents)
- Calls `engine.finalize()`
- Records template application in actor flags

**Current Flow:**
1. Create progression engine
2. Call doAction() for each selection
3. Finalize (handles mutations)
4. Record in actor.flags

**Status:** ⚠️ Needs refactoring
- Currently mutates actor directly
- Should instead populate progressionSession
- Should use Phase 3 MutationPlan instead of engine.doAction()

---

### 5. ArchetypeRegistry (`archetype-registry.js`)

**Responsibilities:**
- Load archetypes from `class-archetypes.json`
- Load custom archetypes from world items
- Provide metadata: name, baseClassId, mechanical/role/attribute bias

**Status:** ✅ Reusable
- Can feed into Phase 4 BuildSignalsNormalizer
- Provides target path metadata

---

## Classification: Reusable, Adapter-Required, or Obsolete

| Component | Status | Notes |
|-----------|--------|-------|
| **Template JSON data** | ✅ Reusable as-is | ID-based format, no schema change needed |
| **CharacterTemplates loader** | ✅ Reusable with adapter | Extract template data, populate session |
| **TemplateCharacterCreator UI** | ✅ Reusable with wrapper | Feed into template mode, not chargen mode |
| **TemplateEngine** | ⚠️ Needs refactoring | Extract logic, use new session-based flow |
| **ArchetypeRegistry** | ✅ Reusable | Feed into advisory signals |
| **Mentor dialogue system** | ✅ Reusable | Use Phase 4 advisory context |
| **Progression engine doAction()** | ⏳ Keep for now | Will be deprecated by mutation-plan in Phase 5 |

---

## Integration Points Identified

### 1. Template → Progression Session

**What needs to happen:**
- Instead of: Template → TemplateEngine → doAction() → actor mutation
- New flow: Template → TemplateAdapter → progressionSession.draftSelections

**Implementation:**
```javascript
// NEW: TemplateAdapter.initializeFromTemplate(template, actorSnapshot)
const adapter = new TemplateAdapter();
const session = adapter.initializeFromTemplate(template, actorSnapshot);
// Result: progressionSession with populated draftSelections
```

### 2. Validation Through Prerequisite Authority

**What needs to happen:**
- Template selections validated through PrerequisiteChecker
- Invalid selections marked dirty, not forced

**Implementation:**
```javascript
// Validate each template selection through prerequisite authority
const validation = TemplateValidator.validateTemplate(template, actor);
// Result: { valid, invalid, conflicts, warnings }
```

### 3. Projection From Template

**What needs to happen:**
- Template-seeded session → ProjectionEngine.buildProjection() → projected character
- Projection shown in summary for review

**Integration:** Already works!
- Phase 3 ProjectionEngine doesn't care if selections came from manual chargen or template
- Just needs normalized draftSelections

### 4. Mutation Plan Compilation

**What needs to happen:**
- Template-seeded projection → MutationPlan.compileFromProjection()
- Same apply() path as manual chargen

**Integration:** Already works!
- Phase 3 MutationPlan is agnostic to selection source

### 5. Advisory Integration

**What needs to happen:**
- Unresolved template nodes → SuggestionContextAdapter → ForecastEngine
- Suggestions help fill gaps
- Mentor context reflects template package

**Implementation:**
- Feed template targets/signals into BuildSignalsNormalizer
- Use advisory system for unresolved or conflicting selections

---

## Reusability Mapping

### ✅ Direct Reuse (No Changes)

1. **Template data format** — Use JSON as-is
2. **Template validation logic** — Same compendium checks
3. **ArchetypeRegistry** — Existing archetype loading
4. **Mentor dialogue data** — Same dialogue structure
5. **Template UI cards/icons** — Existing presentation

### ⚠️ Reusable with Adapter

1. **CharacterTemplates loader** → Wrap to return normalized selections
2. **TemplateCharacterCreator UI** → Wrap to trigger template mode instead of direct creation
3. **TemplateEngine logic** → Extract domain-by-domain application into adapter

### ⏳ Needs Refactoring

1. **TemplateEngine.applyTemplate()** → Will be deprecated
   - Old path: Template → Engine → doAction() → finalize() → mutate actor
   - New path: Template → Adapter → progressionSession → ProjectionEngine → Mutation Plan → apply()

---

## Implementation Strategy

### Phase 5 Will Build:

1. **TemplateAdapter** — Initialize progressionSession from template
2. **TemplateValidator** — Validate template selections through prerequisite authority
3. **TemplateTraversalPolicy** — Node lock/auto-resolve/required-stop rules
4. **TemplateModeShell** — Wrapper that uses template mode with spine traversal
5. **TemplateOverrideHandler** — Handle player overrides with reconciliation

### Phase 5 Will Keep Unchanged:

1. **Template JSON data** — Reuse as-is
2. **Template UI** — Reuse with light wrapper
3. **Template validation** — Reuse compendium checks
4. **ArchetypeRegistry** — Reuse for signals
5. **Mentor dialogues** — Reuse for presentation

---

## Known Issues in Existing System

### 1. Stale Template Content Risk
- Templates are pre-authored; may be outdated
- Current system forces them through silently
- **Phase 5 solution:** Validate through prerequisite authority, surface conflicts

### 2. No Reconciliation on Override
- If player changes a template-provided class, downstream template picks become invalid
- Current system has no recovery mechanism
- **Phase 5 solution:** Use ProgressionReconciler when selections change

### 3. Template Content Not Visible in Draft Review
- Templates apply directly to actor; not visible as selections
- **Phase 5 solution:** Use ProjectionEngine to derive visible character state

### 4. No Advisory for Template Conflicts
- Templates bypass suggestion/mentor system
- **Phase 5 solution:** Feed template packages into advisory context

---

## Files and Locations

**Existing Template Infrastructure:**

| File | Purpose | Status |
|------|---------|--------|
| `scripts/apps/chargen/chargen-templates.js` | Template loader + validator | Reusable |
| `scripts/apps/template-character-creator.js` | Template UI/selector | Reusable |
| `scripts/apps/gear-templates-engine.js` | Equipment templates (separate system) | Research needed |
| `scripts/engine/progression/engine/template-engine.js` | Template applicator | Needs refactoring |
| `scripts/engine/archetype/archetype-registry.js` | Archetype metadata | Reusable |
| `data/character-templates.json` | Template data | Reusable |
| `scripts/core/load-templates.js` | Initialization hook | Check integration |
| `scripts/maintenance/migrate-templates-to-ids.js` | Migration utility | Reference only |

**Phase 5 Will Create:**

| File | Purpose |
|------|---------|
| `scripts/engine/progression/template/template-adapter.js` | Convert template → session |
| `scripts/engine/progression/template/template-validator.js` | Validate through prerequisites |
| `scripts/engine/progression/template/template-traversal-policy.js` | Node lock/auto-resolve rules |
| `scripts/engine/progression/template/template-override-handler.js` | Handle player overrides |
| `scripts/apps/progression-framework/template-mode-shell.js` | Template traversal wrapper |

---

## Success Metrics for Phase 5

✅ **Template Loading**
- Existing templates load without schema change
- Template data validated on load
- Stale content surfaced, not silently forced

✅ **Template → Session Flow**
- Templates populate progressionSession.draftSelections
- Selections normalized to Phase 1 format
- Build signals extracted

✅ **Traversal Policy**
- Template mode skips fully satisfied nodes
- Locked nodes cannot be changed
- Required player stops work correctly

✅ **Validation & Reconciliation**
- Invalid template picks marked dirty
- Player overrides trigger reconciliation
- Conflict resolution works

✅ **Projection & Review**
- Template-seeded session builds projection correctly
- Summary shows template + player selections
- Parity with mutation plan

✅ **Advisory Integration**
- Unresolved template nodes get suggestions
- Mentor context reflects template package
- Warnings surface conflicts

---

## Conclusion

**The existing template system is production-ready for reuse.** Phase 5 will not rebuild templates from scratch; instead, it will:

1. ✅ Adopt existing template data format (no change)
2. ✅ Adopt existing template loader (with adapter)
3. ✅ Adopt existing template UI (with wrapper)
4. ✅ Adopt archetype registry (with signal mapping)
5. ✅ Build adapters to flow templates through canonical progression spine
6. ⏳ Refactor TemplateEngine to use new flow (but keep logic reusable)

**Phase 5 is an integration task, not a rebuild.**

---

## Next Steps

1. **Phase 5 Step 1:** Extract and test reusable loader logic
2. **Phase 5 Step 2:** Build TemplateAdapter to populate progressionSession
3. **Phase 5 Step 3:** Build TemplateValidator for prerequisite checking
4. **Phase 5 Step 4:** Wire UI into template mode
5. **Phase 5 Step 5-9:** Complete integration as scoped in brief

