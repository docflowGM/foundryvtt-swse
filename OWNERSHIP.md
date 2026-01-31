# SWSE v2 — File Ownership Map

## Core Principles

**v2 Mental Model (one sentence):**
SSOT defines what exists → Progression defines what can change → Prerequisites define what is legal → Suggestions define what is helpful → Sheets only render outcomes.

Nothing else is allowed to decide rules.

---

## SSOT Layer (Single Source of Truth)

**Owns:** Static rule data, compiled prerequisites, talent trees, classes, prerequisites
**Must not:** Read actors, mutate state, evaluate availability per-actor, make suggestions

### Core Data Files (`/data/`)
- `data/skills.json` — Skill definitions
- `data/talent-prerequisites.json` — Talent prerequisite mappings
- `data/prestige-class-prerequisites.json` — Prestige class gates (level, BAB, feats, skills, etc.)
- `data/feat-metadata.json` — Feat catalog
- `data/feat-combat-actions.json` — Feat → combat action mappings
- `data/force-secrets.json` — Force secret definitions
- `data/force-techniques.json` — Force technique definitions
- `data/talent-tree-descriptions.json` — Talent tree metadata
- `data/talent_tree_class_map.json` — Class → talent tree access mappings
- `data/talent_tree_access_rules.json` — Talent tree gating rules
- `data/talent-action-links.json` — Talent → action mappings
- `data/talent-granted-abilities.json` — Abilities talents grant
- `data/talent-classification-mapping.json` — Talent categorization
- `data/character-templates.json` — Character build templates
- `data/backgrounds.json` — Background definitions
- `data/chargen-config.json` — Character gen configuration
- `data/class-archetypes.json` — Class archetype variants
- `data/species-traits.json` — Species modifiers
- `data/languages.json` — Language definitions
- `data/lightsaber-form-powers.json` — Lightsaber form → force power links
- `data/combat-actions.json` — Combat action catalog
- `data/ship-combat-actions.json` — Starship combat actions
- `data/stock-ships.json` — Starship templates
- `data/gear-templates.json` — Starting equipment templates
- `data/follower-templates.json` — Companion templates
- `data/follower-enhancements.json` — Companion upgrades
- `data/upgrades/` — Equipment upgrade definitions (recursive)
- `data/vehicle-modifications/` — Vehicle mod definitions (recursive)
- `data/armor/` — Armor definitions (recursive)
- `data/nonheroic/` — NPC troop templates (recursive)

### Generated Artifacts (`/data/generated/`)
- `data/generated/talent-trees.registry.json` — Generated talent tree registry ✅ (auto-built)
- `data/generated/class-talent-tree-bindings.json` — Generated class ↔ tree bindings ✅ (auto-built)
- `data/generated/feat-view-model.json` — Generated feat UI model ✅ (auto-built)
- `data/generated/talents.fixed.json` — Fixed talent definitions ✅ (manual corrections applied)
- `data/generated/mentor-identity-template.json` — Generated mentor templates ✅ (auto-built)
- `data/fixes/` — Override definitions for compendium bugs ⚠️ (contains live logic band-aids)

### Data Models & Loaders (`scripts/data/`)
- `scripts/data/talent-db.js` — Talent registry/loader ✅
- `scripts/data/talent-normalizer.js` — Normalize talent item format ✅
- `scripts/data/talent-tree-db.js` — Talent tree registry/loader ✅
- `scripts/data/talent-tree-normalizer.js` — Normalize tree format ✅
- `scripts/data/classes-db.js` — Class registry/loader ✅
- `scripts/data/class-normalizer.js` — Normalize class format ✅
- `scripts/data/droid-systems.js` — Droid parts catalog ✅
- `scripts/data/generate-class-tree-bindings.js` — Build tool for generated artifacts ✅
- `scripts/data/models/ClassModel.js` — Class data structure ✅
- `scripts/data/adapters/ClassModelAdapters.js` — Class data adapter ✅
- `scripts/data/force-points.js` — Force point calculation (math only) ✅

**🔒 SSOT LAYER FROZEN:** No new logic allowed in this layer. All game rules belong in SSOT data files, not in loader code. Any new rule must be authored as SSOT data, loaded by existing readers.

---

## Prerequisite Engine Layer

**Owns:** Legality gate (validation only), returns true/false + reasons
**Must not:** Suggest, mutate actors, apply features, decide availability based on UI state

### Core Prerequisite Checkers
- `scripts/data/prerequisite-checker.js` — **Main: `checkPrerequisites(actor, className)`** ✅
  - Comprehensive multi-mode checker: level, BAB, feats, skills, talents, force powers
  - Reads SSOT (prestige-class-prerequisites.json) + actor snapshot
  - Returns `{ met, missing, details }`

- `scripts/progression/feats/prerequisite_engine.js` — **`PrerequisiteRequirements` legacy checker** ⚠️
  - Duplicate of prerequisite-checker logic
  - Should be merged or delegated to prerequisite-checker

- `scripts/utils/prerequisite-validator.js` — **`PrerequisiteValidator` class** ⚠️
  - Third validator implementation (string parser + checker)
  - Overlaps with prerequisite-checker
  - **CONSOLIDATION NEEDED**: Merge into single PrerequisiteChecker or clear delegation

- `scripts/apps/levelup/levelup-validation.js` — **`meetsClassPrerequisites()` async wrapper** ✅
  - UI-level validator wrapper
  - Loads from JSON + calls prerequisite-checker
  - Correct layer, but may call illegal validators

### Supporting Validators
- `scripts/progression/utils/prerequisite-normalizer.js` — Parse legacy prerequisite strings ✅

**🧨 Issue identified:** Three separate prerequisite validators (prerequisite-checker, prerequisite_engine, prerequisite-validator). Should consolidate into ONE.

---

## Progression Engine Layer (Compilation)

**Owns:** Chargen/levelup state machine, feature application, snapshot→delta compilation
**Must not:** Read UI state, read live actor (snapshot only), apply changes directly, make suggestions, validate availability

### Main Orchestrator
- `scripts/engine/progression.js` — **`SWSEProgressionEngine` main class** ✅
  - Chargen/levelup orchestrator
  - Forwards to feature engines
  - Entry point for progression

- `scripts/progression/engine/progression-engine.js` — **Facade/adapter layer** ✅
  - Backward compatibility wrapper
  - Routes to correct engine
  - ✅ Correct delegation pattern

### Session & State
- `scripts/engine/ProgressionSession.js` — Track in-progress chargen/levelup ✅
- `scripts/progression/engine/progression-state-normalizer.js` — Actor → progression state ✅
- `scripts/progression/engine/progression-actor-updater.js` — Apply progression deltas ✅ (Application layer work, but in Progression)

### Feature Engines (Individual Feature Application)
- `scripts/progression/engine/class-autogrants.js` — Auto-grant features per class ✅
- `scripts/progression/engine/force-training.js` — Force Training feat logic ✅
- `scripts/progression/engine/attribute-increase-handler.js` — Apply ability score increases ✅
- `scripts/progression/feats/feat-engine.js` — Apply feats to actor ✅
- `scripts/progression/feats/feat-dispatcher.js` — Route feat by type ✅
- `scripts/progression/feats/feat-registry.js` — Feat registry/loader ✅
- `scripts/progression/talents/talent-registry-ui.js` — Talent picker UI ⚠️ (belongs in Application layer)
- `scripts/progression/skills/skill-engine.js` — Apply skill ranks ✅
- `scripts/progression/skills/skill-validator.js` — Validate skill spending ✅

### Derived/Math Layer (should be in Derived, not Progression)
- `scripts/progression/engine/derived-calculator.js` — **Derived stat compilation** ❌
  - ⚠️ **Should be in Derived layer, not Progression**
  - Computes BAB, saves, bonuses
  - Reads progression-owned fields
  - Called from actor, not progression

- `scripts/progression/engine/derived-stats.js` — Autocalc math ❌
  - ⚠️ **Should be in Derived layer**

### Normalizers (Feature Canonicalization)
- `scripts/progression/engine/feature-normalizer.js` — Canonicalize item formats ✅
- `scripts/progression/engine/class-normalizer.js` — Canonicalize class format ✅
- `scripts/progression/engine/talent-tree-normalizer.js` — Canonicalize tree format ✅
- `scripts/progression/engine/force-normalizer.js` — Canonicalize force item format ✅
- `scripts/progression/utils/feature-normalizer.js` — Generic feature normalizer ✅

### Snapshot & Rollback
- `scripts/progression/utils/snapshot-manager.js` — Save/restore actor snapshots ✅
- `scripts/progression/engine/tools/rollback-store.js` — Checkpoint/restore logic ✅

### Special Feature Engines (Force, Skills, Equipment)
- `scripts/progression/engine/force-power-engine.js` — Force power acquisition ✅
- `scripts/progression/engine/force-secret-engine.js` — Force Secret acquisition ✅
- `scripts/progression/engine/force-technique-engine.js` — Force Technique acquisition ✅
- `scripts/progression/engine/equipment-engine.js` — Starting equipment ✅
- `scripts/progression/engine/template-engine.js` — Quick-build templates ✅
- `scripts/progression/engine/language-engine.js` — Language acquisition ✅
- `scripts/progression/engine/starship-maneuver-engine.js` — Starship maneuver selection ✅

### Utilities & Helpers
- `scripts/progression/engine/engine-helpers.js` — Shared engine utilities ✅
- `scripts/progression/utils/class-data-loader.js` — Load class from compendium ✅
- `scripts/progression/utils/apply-handlers.js` — Route feature application ✅
- `scripts/progression/engine/tools/prestige-readiness.js` — Prestige readiness check ✅
- `scripts/progression/engine/validators/feat-duplication.js` — Duplicate feat check ✅

---

## Suggestion Engine Layer

**Owns:** Recommendation ranking, build analysis, explanations, mentor guidance
**Must not:** Gate features, override prerequisites, mutate actors, make final choices

**🔒 SUGGESTION LAYER FROZEN:** This layer is correct and complete. No new features allowed here without architectural review.

### Core Suggestion System
- `scripts/engine/SuggestionEngine.js` — **Main suggestion engine (tier-based)** ✅
  - 6-tier system: PRESTIGE_PREREQ → FALLBACK
  - Scores suggestions
  - Non-blocking (informational only)

- `scripts/engine/SuggestionEngineCoordinator.js` — Coordinate multiple suggestion engines ✅
- `scripts/engine/SuggestionService.js` — Public suggestion API ✅
- `scripts/engine/suggestion-settings.js` — Tunable parameters ✅

### Build Analysis & Intent Detection
- `scripts/engine/BuildIntent.js` — Infer player build direction ✅
- `scripts/engine/BuildCoherenceAnalyzer.js` — Measure synergy ✅
- `scripts/engine/OpportunityCostAnalyzer.js` — Evaluate opportunity cost ✅
- `scripts/engine/PathPreview.js` — Preview prestige paths ✅
- `scripts/engine/PivotDetector.js` — Detect build pivots ✅

### Specialized Suggestion Engines
- `scripts/engine/ClassSuggestionEngine.js` — Suggest next class level ✅
- `scripts/engine/ArchetypeAffinityEngine.js` — Archetype synergy ✅
- `scripts/engine/ArchetypeSuggestionIntegration.js` — Archetype UI integration ✅
- `scripts/engine/AttributeIncreaseSuggestionEngine.js` — Suggest ability increases ✅
- `scripts/engine/BackgroundSuggestionEngine.js` — Suggest backgrounds ✅
- `scripts/engine/Level1SkillSuggestionEngine.js` — Suggest level 1 skills ✅
- `scripts/engine/ForceOptionSuggestionEngine.js` — Suggest force powers/secrets ✅

### Quality Assessment
- `scripts/engine/SynergyEvaluator.js` — Feat/talent synergy scoring ✅
- `scripts/engine/CommunityMetaSynergies.js` — Known good combinations ✅
- `scripts/engine/MetaTuning.js` — Balance parameters ✅
- `scripts/engine/SuggestionConfidence.js` — Confidence scoring ✅
- `scripts/engine/SuggestionExplainer.js` — Explain suggestions to player ✅

### Mentor System (Suggestion Driver)
- `scripts/engine/MentorSystem.js` — Mentor dialogue orchestration ✅
- `scripts/engine/MentorProfile.js` — Mentor personality/bias ✅
- `scripts/engine/mentor-memory.js` — Mentor persistence ✅
- `scripts/engine/mentor-suggestion-bias.js` — Mentor suggestion preference ✅
- `scripts/engine/mentor-archetype-paths.js` — Mentor prestige guides ✅
- `scripts/engine/mentor-story-resolver.js` — Mentor narrative ✅
- `scripts/engine/MentorWishlistIntegration.js` — Mentor + player goals ✅
- `scripts/apps/mentor-*.js` — Mentor UI files (belong in Application layer)

### Utility
- `scripts/progression/utils/PrerequisiteEnricher.js` — Enrich prereqs with metadata ✅

---

## Application Layer (Workflows, Intent Emission)

**Owns:** Multi-step UI workflows, user intent capture, dialogue trees
**Must not:** Validate prerequisites (delegate to engine), mutate actors directly (delegate to actor), compute rules (read from derived)

### Level-Up Workflow (`scripts/apps/levelup/`)
- `scripts/apps/levelup/levelup-main.js` — **Master levelup orchestrator** ✅
- `scripts/apps/levelup/levelup-class.js` — Class selection step ✅
- `scripts/apps/levelup/levelup-feats.js` — Feat selection step ✅
- `scripts/apps/levelup/levelup-talents.js` — Talent tree picker UI ✅
- `scripts/apps/levelup/levelup-skills.js` — Skill training step ✅
- `scripts/apps/levelup/levelup-force-powers.js` — Force power picker ✅
- `scripts/apps/levelup/levelup-force-secrets.js` — Force secret picker ✅
- `scripts/apps/levelup/levelup-force-techniques.js` — Force technique picker ✅
- `scripts/apps/levelup/levelup-starship-maneuvers.js` — Starship maneuver picker ✅
- `scripts/apps/levelup/levelup-enhanced.js` — Main levelup app class ✅
- `scripts/apps/levelup/levelup-validation.js` — ⚠️ **Calls prerequisite validators, correct layer**
- `scripts/apps/levelup/levelup-shared.js` — Shared levelup utilities ✅
- `scripts/apps/levelup/debug-panel.js` — Debug output ✅
- `scripts/apps/levelup/diff-viewer.js` — Before/after viewer ✅
- `scripts/apps/levelup/prestige-roadmap.js` — Prestige class roadmap ✅

### Character Generation Workflows
- `scripts/apps/chargen.js` — Old v1 chargen ⚠️ (deprecated, may remove)
- `scripts/apps/chargen-improved.js` — Enhanced v1 chargen ⚠️ (deprecated, may remove)
- `scripts/apps/chargen-init.js` — Chargen init hook ✅

### Other Workflows
- `scripts/apps/template-character-creator.js` — Quick character from template ✅
- `scripts/apps/proficiency-selection-dialog.js` — Proficiency picker ✅
- `scripts/apps/custom-item-dialog.js` — Custom item creation ✅

### Equipment & Item Management
- `scripts/apps/upgrade-app.js` — Equipment upgrade manager ✅
- `scripts/apps/upgrade-rules-engine.js` — ⚠️ **Upgrade application (should be in Progression)**
- `scripts/apps/vehicle-modification-app.js` — Vehicle mod manager ✅
- `scripts/apps/vehicle-modification-manager.js` — Vehicle mod orchestrator ⚠️ (coord logic)
- `scripts/apps/gear-templates-engine.js` — Apply gear templates ⚠️ (should be in Progression)
- `scripts/apps/follower-manager.js` — Follower manager ✅
- `scripts/apps/follower-creator.js` — Follower quick-creator ✅

### Browsing & Visualization
- `scripts/apps/combat-action-browser.js` — Combat action browser ✅
- `scripts/apps/nonheroic-units-browser.js` — NPC unit browser ✅
- `scripts/apps/talent-tree-visualizer.js` — Talent tree visualizer ✅
- `scripts/apps/prerequisite-builder-dialog.js` — Prerequisite UI builder ⚠️ (GM tool, not player progression)

### Mentor System UI
- `scripts/apps/mentor-dialogues.js` — Mentor dialogue system ✅
- `scripts/apps/mentor-dialogue-v2-integration.js` — v2 mentor integration ✅
- `scripts/apps/mentor-survey.js` — Initial mentor survey ✅
- `scripts/apps/mentor-guidance.js` — Mentor guidance UI ✅
- `scripts/apps/mentor-reflective-dialogue.js` — Mentor introspection ✅
- `scripts/apps/store/` — Mentor store dialogue system ✅

### Automation (scheduled/event-driven)
- `scripts/automation/upkeep.js` — Daily upkeep automation ✅

---

## Derived Layer (Computed Values, Sheets, Actors)

**Owns:** Numerical calculations, derived stats, actor presentation, display only
**Must not:** Store progression-owned fields, decide rules, validate prerequisites, apply raw mutations

### Actor Base Classes (v2)
- `scripts/actors/v2/base-actor.js` — **v2 actor contract** ✅
  - Core v2: derived only, intent APIs
  - No logic, computation only

- `scripts/actors/v2/character-actor.js` — Character actor v2 ✅
- `scripts/actors/v2/npc-actor.js` — NPC actor v2 ✅
- `scripts/actors/v2/droid-actor.js` — Droid actor v2 ✅
- `scripts/actors/v2/vehicle-actor.js` — Vehicle actor v2 ✅

### Actor Mutation Engine
- `scripts/actors/engine/actor-engine.js` — **Actor update & recalc** ✅
  - `ActorEngine.updateActor()` — apply changes
  - `ActorEngine.recalcAll()` — trigger recalculation
  - Centralized mutation point

### Character Sheets (v2 - Dumb Views)
- `scripts/sheets/v2/character-sheet.js` — **Character sheet (read-only)** ✅
  - Reads from `actor.system.derived` only
  - Emits intent via Actor APIs
  - No computation

- `scripts/sheets/v2/npc-sheet.js` — NPC sheet (read-only) ✅
- `scripts/sheets/v2/droid-sheet.js` — Droid sheet (read-only) ✅
- `scripts/sheets/v2/vehicle-sheet.js` — Vehicle sheet (read-only) ✅

**🔒 v2 SHEETS FROZEN:** These are read-only projections. No new logic allowed in sheets. All rules belong in Engine layer.

### Legacy Actor System (v1 - to be deprecated)
- `scripts/actors/base/swse-actor-base.js` — Old v1 base ⚠️ (deprecate)
- `scripts/actors/character/swse-character-sheet.js` — Old v1 character ⚠️ (deprecate)
- `scripts/actors/npc/swse-npc.js` — Old v1 NPC ⚠️ (deprecate)
- `scripts/actors/droid/swse-droid.js` — Old v1 droid ⚠️ (deprecate)
- `scripts/actors/vehicle/swse-vehicle.js` — Old v1 vehicle ⚠️ (deprecate)

### Derived Calculation (should be here, currently in Progression)
- `scripts/progression/engine/derived-calculator.js` — ❌ **Should move here**
- `scripts/progression/engine/derived-stats.js` — ❌ **Should move here**

---

## Utilities & Core Support

**Owns:** General-purpose helpers, logging, validation, configuration
**Must not:** Contain game rules, make progression decisions

### Logging & Error Handling
- `scripts/utils/logger.js` — Logging system ✅
- `scripts/core/logger.js` — Legacy logger ⚠️ (consolidate with utils/logger.js)
- `scripts/core/error-handler.js` — Global error handler ✅

### Validation & Utilities
- `scripts/utils/validation-utils.js` — Type checking ✅
- `scripts/utils/data-utils.js` — Object/array utilities ✅
- `scripts/utils/string-utils.js` — String formatting ✅
- `scripts/utils/math-utils.js` — Math helpers ✅
- `scripts/utils/ui-utils.js` — DOM utilities ✅
- `scripts/utils/performance-utils.js` — Performance monitoring ✅
- `scripts/utils/notifications.js` — Toast/popup system ✅
- `scripts/utils/security-utils.js` — Permission checking ✅

### Actor & Character Utilities
- `scripts/utils/actor-utils.js` — Actor helpers ✅
- `scripts/utils/character-utils.js` — Character helpers ✅
- `scripts/utils/droid-appendage-utils.js` — Droid part utilities ✅

### Data & Resource Loaders
- `scripts/utils/compendium-loader.js` — Compendium helpers ✅
- `scripts/core/data-preloader.js` — Boot-time data loading ✅
- `scripts/core/lazy-loader.js` — Deferred loading ✅

### Combat & Rules Utilities
- `scripts/utils/dice-utils.js` — Dice formatting ✅
- `scripts/utils/skill-resolver.js` — Skill lookup ✅
- `scripts/utils/skill-use-filter.js` — Skill filtering ✅
- `scripts/utils/force-power-manager.js` — Force power item ops ✅
- `scripts/utils/starship-maneuver-manager.js` — Maneuver item ops ✅
- `scripts/utils/force-enhancement-detector.js` — Force enhancement detection ✅
- `scripts/utils/movement-normalizer.js` — Movement calculations ✅
- `scripts/utils/destiny-effects.js` — Destiny point effects ✅

### Specialized Utilities
- `scripts/utils/wishlist-helpers.js` — Player goals ✅
- `scripts/utils/verify-suggestions.js` — Check suggestions valid ✅
- `scripts/utils/feat-actions-mapper.js` — Feat → action mappings ✅
- `scripts/utils/template-id-mapper.js` — Template ID mapping ✅
- `scripts/utils/typing-animation.js` — Text animation ✅
- `scripts/utils/warn-gm.js` — GM notifications ✅
- `scripts/utils/hook-performance.js` — Hook monitoring ✅
- `scripts/utils/macro-functions.js` — Macro functions ✅
- `scripts/utils/calc-conditions.js` — Condition math ✅

### Core & Framework
- `scripts/core/init.js` — System boot ✅
- `scripts/core/config.js` — SWSE config constant ✅
- `scripts/core/constants.js` — Game constants ✅
- `scripts/core/settings.js` — Foundry settings ✅
- `scripts/core/cache-manager.js` — Caching layer ✅
- `scripts/core/effect-sanitizer.js` — Active effect validation ✅
- `scripts/core/keybindings.js` — Keyboard shortcuts ✅
- `scripts/core/races.js` — Species constant ✅
- `scripts/core/rolls-init.js` — Roll system init ✅
- `scripts/core/utils-init.js` — Utilities init ✅
- `scripts/core/world-data-loader.js` — World-specific data ✅
- `scripts/core/load-templates.js` — Template preload ✅
- `scripts/core/devmode-validation.js` — Dev mode checks ✅
- `scripts/core/swse-data.js` — Data exports ✅

### Hook Registry
- `scripts/hooks/hooks-registry.js` — Hook registration ✅

---

## Rules & Combat (Out of Scope for v2 Refactor)

These layers are stable and not part of the v2 progression refactor. Leave as-is for now.

### Combat System
- `scripts/combat/` — Combat orchestration ✅ (stable)

### Rules Engines
- `scripts/rules/` — Rule enforcement ✅ (stable)

### Skills System
- `scripts/skills/` — Skill mechanics ✅ (stable)

---

## Handlebars & Templates

**Owns:** View rendering, template structure
**Must not:** Contain game logic

### Template Helpers
- `helpers/handlebars/*.js` — Template helpers ✅
- `helpers/handlebars/levelup-helpers.js` — Level-up template helpers ✅

### Handlebars Templates
- `templates/` — All .hbs files ✅

---

## Item System (Out of Scope for v2 Refactor)

- `scripts/items/base/` — Item base classes ✅ (stable)

---

## Known Issues & Consolidation Needed

### 🧨 CRITICAL: Three Prerequisite Validators (Illegal Architecture)

**Constraint:** Only PrerequisiteEngine may answer "Is this legal?"

Multiple validators exist because logic leaked historically. Under v2, this is forbidden.

**Files involved:**
1. `scripts/data/prerequisite-checker.js` — CORRECT owner (reads SSOT)
2. `scripts/progression/feats/prerequisite_engine.js` — ILLEGAL (prereq logic in Progression)
3. `scripts/utils/prerequisite-validator.js` — ILLEGAL (prereq logic in Utilities)

**Action (non-negotiable):**
1. **Consolidate all prerequisite logic** into `scripts/data/prerequisite-checker.js`
   - Merge logic from prerequisite_engine.js
   - Merge logic from prerequisite-validator.js
   - Ensure single implementation of each check (level, BAB, skills, feats, talents, force)

2. **Delete or stub out** the illegal validators
   - `scripts/progression/feats/prerequisite_engine.js` — delete or delegate to prerequisite-checker
   - `scripts/utils/prerequisite-validator.js` — delete or delegate to prerequisite-checker

3. **Enforce:** Any new prereq check must be added to PrerequisiteChecker, nowhere else.

**Why:** Multiple validators = multiple sources of truth = bugs. v2 has one source of truth.

---

### ⚠️ Misplaced Logic (Derived Math in Progression — Boundary Violation)

**Constraint:** Progression may set progression-owned fields only. Derived may compute read-only projections only. No layer may overwrite the other's outputs.

**Files involved:**
- `scripts/progression/engine/derived-calculator.js` — ILLEGAL (math computation in Progression)
- `scripts/progression/engine/derived-stats.js` — ILLEGAL (math computation in Progression)

**Current problem:**
- These files compute derived values (BAB, saves, AC) in Progression layer
- But they are called from Actor.prepareDerivedData() in Derived layer
- This creates a layer violation: Progression reaches into Derived

**Action needed:**
1. **Move to Derived layer** — `scripts/actors/engine/derived-calculator.js` or similar
   - These compute derived values from progression-owned inputs
   - Should live where they are called: in prepareDerivedData()

2. **Clear ownership:** Progression writes `actor.system.progression.*`, Derived writes `actor.system.derived.*`

**Why:** This is how BAB was written by both layers at different times = bugs. Clear ownership prevents this.

---

### ⚠️ Misplaced Files (Application Logic in Progression)

**Files involved:**
- `scripts/progression/talents/talent-registry-ui.js` — UI belongs in `scripts/apps/`
- `scripts/progression/engine/force-secret-suggestion-engine.js` — Suggestions belong in `scripts/engine/`
- `scripts/progression/engine/force-technique-suggestion-engine.js` — Suggestions belong in `scripts/engine/`

**Action needed:** Move to correct layers

---

### ⚠️ Misplaced Files (Progression Logic in Application)

**Files involved:**
- `scripts/apps/upgrade-rules-engine.js` — Feature application belongs in Progression
- `scripts/apps/gear-templates-engine.js` — Feature application belongs in Progression
- `scripts/apps/vehicle-modification-manager.js` — Coordination logic belongs in Progression

**Action needed:** Move to `scripts/progression/`

---

### ⚠️ Deprecated/Redundant Files (Remove Later)

- `scripts/apps/chargen.js` — Old v1 chargen
- `scripts/apps/chargen-improved.js` — Old v1 chargen
- `scripts/actors/base/swse-actor-base.js` — Old v1 actor base
- `scripts/actors/character/swse-character-sheet.js` — Old v1 character
- `scripts/actors/npc/swse-npc.js` — Old v1 NPC
- `scripts/actors/droid/swse-droid.js` — Old v1 droid
- `scripts/actors/vehicle/swse-vehicle.js` — Old v1 vehicle
- `scripts/core/logger.js` — Consolidate with `scripts/utils/logger.js`

**Action:** Keep for now (v1 backward compat), flag for removal in future pass.

---

### ⚠️ Duplicate/Overlapping Logic

- `scripts/progression/utils/prerequisite-normalizer.js` + `scripts/utils/prerequisite-validator.js` — Both parse prerequisites
- `scripts/progression/engine/class-normalizer.js` vs `scripts/data/class-normalizer.js` — Class normalization in two places
- `scripts/progression/feats/feat-normalizer.js` vs `scripts/progression/engine/feature-normalizer.js` — Feature normalization duplicated

**Action:** Audit and consolidate normalizers after prerequisites consolidation.

---

## Illegal Patterns (All Layers)

These patterns are forbidden under v2. Code review must reject them immediately.

**Prerequisite checks outside PrerequisiteEngine:**
- ❌ Validation logic in sheets, application, or progression layers
- ❌ Multiple implementations of the same rule
- ✅ All prereq checks go through `scripts/data/prerequisite-checker.js`

**Actor mutation outside Application layer:**
- ❌ Progression, Suggestion, or Utility layers mutating actors
- ❌ Sheets writing to actor
- ✅ Only `ActorEngine.updateActor()` mutates actors

**Derived layer writing progression-owned fields:**
- ❌ Derived code writing to `actor.system.progression.*`
- ❌ Derived overwrites Progression outputs
- ✅ Derived computes `actor.system.derived.*` from read-only inputs

**Sheets reading SSOT directly:**
- ❌ Sheets importing from `data/*.json` or `scripts/data/`
- ❌ Sheets making availability decisions
- ✅ Sheets read `actor.system.derived` only

**Items containing rule logic:**
- ❌ Item's `system` fields contain active rules/checks
- ❌ Items decide availability or requirements
- ✅ Items store ownership state + `ssotId` pointer to rules in SSOT

**Suggestion engine gating:**
- ❌ Suggestions blocking or disabling options
- ❌ Suggestions overriding prerequisites
- ✅ Suggestions rank valid options, never gate

**Progression reading live actor:**
- ❌ Progression reading from mutable actor state
- ❌ Order-dependent progression (depends on actor field changes)
- ✅ Progression reads `snapshot` only (frozen copy of actor)

---

## Deletion is Success

If a file's responsibility disappears under v2 architectural enforcement, **deletion is the correct action**, not relocation.

**Examples of "glue code" to delete (after ownership is enforced):**

- Files that exist only to compensate for leaked logic
  - E.g., normalizer that patches bad data from wrong layer → delete once source is fixed

- Duplicate validators that existed because logic leaked
  - E.g., second prerequisite checker → delete once single checker is canonical

- Adapter layers that translate between illegal architectures
  - E.g., wrapper that works around layer violation → delete once layers are separated

- Fallback implementations that patched missing SSOT
  - E.g., hardcoded rules when SSOT data was missing → delete once data is authored

**Before deleting, verify:**
1. ✅ Logic is consolidated in correct layer
2. ✅ All callers updated to use new location
3. ✅ Tests pass with deletion
4. ✅ No backward-compat requirements

**Permission granted:** You may delete files guilt-free if they were created to work around architectural leakage. Simplification is progress.

---

## Summary Table

| Layer | Owner | Constraint | Status |
|-------|-------|-----------|--------|
| **SSOT** | `data/`, `scripts/data/` | Read-only, no actor logic | ✅ Clean |
| **Progression** | `scripts/progression/`, `scripts/engine/` | State machine, rule application | ⚠️ Has Derived math, misplaced logic |
| **Prerequisite** | `scripts/data/` | Validation only, snapshots | 🧨 3 validators, needs consolidation |
| **Suggestion** | `scripts/engine/` | Non-blocking ranking | ✅ Clean |
| **Application** | `scripts/apps/` | Intent emission, workflows | ⚠️ Some progression logic, some misplaced |
| **Derived** | `scripts/actors/`, `scripts/sheets/` | Read-only projection, math | ⚠️ Derived math in Progression |
| **Utilities** | `scripts/utils/`, `scripts/core/` | General helpers | ✅ Clean (consolidate loggers) |
| **Combat/Rules** | `scripts/combat/`, `scripts/rules/` | Out of scope | ✅ Stable |

---

## Annotation Legend

- ✅ **Correct** — Right owner, right layer, ready to lock
- ⚠️ **Move/Consolidate** — Right file, wrong location or needs consolidation
- ❌ **Illegal** — Violates layer ownership
- 🧨 **Delete/Replace** — Redundant or deprecated, should be removed

---

## Next Steps

1. **Review this draft** — Flag any disagreements
2. **Lock agreement** — Confirm ownership assignments
3. **Identify mitigations** — Which issues block the work?
4. **Plan consolidations** — Batch similar refactors
5. **Begin Phase #2** — Walk a concrete click (pick talent) to validate

This map is now the enforcement document for all future refactoring.
