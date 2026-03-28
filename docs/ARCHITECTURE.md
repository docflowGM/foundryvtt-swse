# SWSE Progression System Architecture

**Version:** 1.0 (Phase 6)
**Status:** Production Ready
**Last Updated:** March 27, 2026

---

## Executive Overview

The SWSE character progression system is a unified engine for character generation, level-up, packaged templates, and NPC creation. It's built on a single canonical data structure, single rules authority, and single mutation path to ensure consistency and maintainability.

### Core Principle

**One spine, one rules checker, one state store, one mutation path.**

---

## System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION LAYER                   │
│  (Chargen Shell, Level-Up Shell, Template UI, Advisory)     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    SESSION          TEMPLATE         FORECAST
    MANAGEMENT      MANAGEMENT        & ADVISORY
        │                │                │
┌───────▼────────┐ ┌─────▼──────┐ ┌────▼──────────┐
│ Progression    │ │ Template   │ │ Suggestion    │
│ Session        │ │ Adapter    │ │ Context       │
│ (Phase 1)      │ │ (Phase 5)  │ │ (Phase 4)     │
│                │ │            │ │                │
│ - draftSelect. │ │ - Normalize│ │ - Build       │
│ - spine state  │ │ - Lock     │ │   Signals     │
│ - projection   │ │ - Validate │ │ - Forecast    │
│ - mutations    │ │            │ │ - Rank        │
└────┬──────────┘ └────┬───────┘ └───┬──────────┘
     │                 │              │
     └─────────────────┼──────────────┘
                       │
    ┌──────────────────▼─────────────────────┐
    │  CANONICAL SPINE & DEPENDENCY GRAPH    │
    │  (Phase 2: Node Registry)              │
    │  - 23 nodes with metadata              │
    │  - Activation policies                 │
    │  - Invalidation behaviors              │
    │  - Reconciliation rules                │
    └──────────────────┬─────────────────────┘
                       │
    ┌──────────────────▼─────────────────────┐
    │      RULES & LEGALITY AUTHORITY        │
    │  (Phase 3: PrerequisiteChecker)        │
    │  - Sole source of legality truth       │
    │  - Evaluates prerequisites             │
    │  - Powers all validation               │
    │  - Inputs to forecast/advisory         │
    └──────────────────┬─────────────────────┘
                       │
    ┌──────────────────┼─────────────────────┐
    │                  │                     │
┌───▼────────┐ ┌──────▼─────┐ ┌────────▼──┐
│ Projection │ │ Mutation   │ │ Reconciler│
│ Engine     │ │ Plan       │ │ (Phase 2) │
│ (Phase 3)  │ │ (Phase 3)  │ │           │
│            │ │            │ │ - Detects │
│ Derives    │ │ - Compiles │ │   impact  │
│ character  │ │ - Validates│ │ - Marks   │
│ state      │ │ - Applies  │ │   dirty   │
│ from       │ │   atoms    │ │ - Invokes │
│ selections │ │            │ │   re-eval │
└────┬───────┘ └──────┬─────┘ └─────┬────┘
     │                │              │
     └────────────────┼──────────────┘
                      │
            ┌─────────▼─────────┐
            │  ACTOR UPDATE     │
            │  (ActorEngine)    │
            │  - Atomic writes  │
            │  - Governance     │
            └───────────────────┘
```

---

## Core Modules

### 1. ProgressionSession (Phase 1)

**Location:** `scripts/apps/progression-framework/shell/progression-session.js`

**Responsibility:** Single authoritative state container for all character progression.

**Key Data:**
```javascript
{
  mode: 'chargen' | 'levelup' | 'template',
  subtype: 'actor' | 'droid' | 'npc' | 'follower' | 'nonheroic',

  draftSelections: {
    species: { id, name, ... },
    class: { id, name, ... },
    background: { id, name, ... },
    attributes: { str, dex, con, int, wis, cha },
    skills: [skillId, ...],
    feats: [{ id, name, ... }, ...],
    talents: [{ id, name, ... }, ...],
    languages: [langId, ...],
    forcePowers: [...],
    forceTechniques: [...],
    forceSecrets: [...],
    survey: { mentorChoice, archetypeChoice, ... },
    droid: { ... }
  },

  // Derived state
  activeSteps: [nodeId, ...],
  currentStepId: string,
  completedStepIds: [nodeId, ...],
  invalidatedStepIds: [nodeId, ...],
  dirtyNodes: Set<nodeId>,

  // Projection
  projectedCharacter: { identity, attributes, skills, ... },

  // Template-specific
  isTemplateSession: boolean,
  templateId: string,
  lockedNodes: Set<nodeId>,
  auditTrail: [{ type, nodeId, timestamp, ... }, ...],
}
```

**Key Methods:**
- `commitSelection(stepId, key, value)` — Write selection with validation
- `getSelection(key)` — Read selection
- `getAllSelections()` — Get all current selections
- `toCharacterData()` — Serialize for export

**Rules:**
- All state writes must go through `commitSelection()`
- `draftSelections` is the single source of truth
- No mutation outside this contract
- `projectedCharacter` is derived, not edited directly

---

### 2. Progression Node Registry (Phase 2)

**Location:** `scripts/apps/progression-framework/registries/progression-node-registry.js`

**Responsibility:** Canonical specification of all possible progression nodes and their dependencies.

**23 Nodes:** intro, species, droid-builder, attribute, class, background, skills, feats, talents, languages, force-power, force-secret, force-technique, starship-maneuver, summary, droid-configuration, levelup-attribute, levelup-class, levelup-feats, levelup-talents, levelup-forces, levelup-summary, finalizer

**Node Metadata:**
```javascript
{
  nodeId: string,
  label: string,
  activationPolicy: 'canonical' | 'prerequisite' | 'conditional' | 'level-event',
  dependsOn: [nodeId, ...],
  invalidates: { [nodeId]: InvalidationBehavior, ... },
  modes: ['chargen' | 'levelup' | 'template'],
  subtypes: ['actor' | 'npc' | 'droid' | ...],
  selectionKey: string,
  optional: boolean,
}
```

**Key Methods:**
- `getNode(nodeId)` — Get node metadata
- `getDependents(nodeId)` — Get all downstream nodes
- `getDependencies(nodeId)` — Get all upstream requirements
- `getActiveStepsForMode(mode, subtype, session)` — Compute active nodes
- `getInvalidationBehavior(fromNodeId, toNodeId)` — How to handle downstream impact

**Rules:**
- Registry is immutable (locked in Phase 2)
- All dependency/invalidation rules are here
- No node appears outside this registry
- Active step computation is registry-driven

---

### 3. PrerequisiteChecker (Phase 3)

**Location:** `scripts/governance/prerequisite/prerequisite-checker.js`

**Responsibility:** Single authoritative source for all legality checks. No other module makes rules decisions.

**Key Methods:**
- `evaluateAcquisition({ itemId, itemType })` → `{ legal, reason, ... }`
- `evaluateMultiple([{ itemId, itemType }, ...])` → results
- `checkLegalityFor(itemType)` → rules for that type

**What It Checks:**
- Feat prerequisites
- Talent prerequisites
- Force power/secret/technique requirements
- Class compatibility with species/background
- Attribute requirements
- Skill legality

**Rules:**
- This is the ONLY place prerequisites are enforced
- All other modules must call PrerequisiteChecker
- No shadow rules logic anywhere else
- Results are deterministic given same actor state

---

### 4. ProjectionEngine (Phase 3)

**Location:** `scripts/apps/progression-framework/shell/projection-engine.js`

**Responsibility:** Derive a complete character projection from a ProgressionSession.

**Input:** ProgressionSession + actor (for baseline reference)

**Output:**
```javascript
{
  identity: { species, class, background },
  attributes: { str, dex, con, int, wis, cha },
  skills: { trained: [...], untrained: [...] },
  abilities: { feats: [...], talents: [...], forcePowers: [...], ... },
  languages: [...],
  droid: { ... },
  derived: { warnings, metadata, ... }
}
```

**Key Methods:**
- `buildProjection(session, actor)` — Generate full projection

**Rules:**
- Projection is derived, never edited
- Projection is rebuilt after every commit
- Projection is authoritative for what character "would be"
- All logic uses only draftSelections (source-agnostic)

---

### 5. MutationPlan (Phase 3)

**Location:** `scripts/apps/progression-framework/shell/mutation-plan.js`

**Responsibility:** Compile a complete mutation plan from a projection and apply it atomically.

**Pipeline:**
```
Projection
  ↓ compileFromProjection()
Mutation Plan { mutations: { identity, attributes, items, system }, validated, ... }
  ↓ validate()
Validation Report { valid, errors, warnings }
  ↓ (if valid) apply()
Actor mutations applied
```

**Mutations:**
```javascript
{
  identity: { species, class, background },
  attributes: { str, dex, con, int, wis, cha },
  items: [{ action: 'add'|'update'|'remove', type, data }, ...],
  system: { hp, bab, skills, ... }
}
```

**Key Methods:**
- `compileFromProjection(projection, actor)` → MutationPlan
- `validate()` → validation report
- `apply(actor)` → atomic write

**Rules:**
- Validate before apply (never apply unvalidated plans)
- Apply is atomic (all or nothing)
- All actor mutations go through this path
- Plan is built from projection, not ad-hoc

---

### 6. ProgressionReconciler (Phase 2)

**Location:** `scripts/apps/progression-framework/shell/progression-reconciler.js`

**Responsibility:** Detect and handle cascade impacts when a selection changes.

**Pipeline:**
```
Player selects class at node X
  ↓ reconcileAfterCommit(session, 'class')
Find downstream nodes: skills, feats, talents, forces, summary
  ↓ Apply invalidation behaviors
PURGE invalid selections
DIRTY revalidation-needed nodes
RECOMPUTE active steps
  ↓ Update session state
Session.dirtyNodes, Session.activeSteps updated
```

**Key Methods:**
- `reconcileAfterCommit(session, changedNodeId)` → reconciliation report

**Rules:**
- This is the ONLY place invalidation happens
- No ad-hoc dirty marking
- No manual invalidation logic elsewhere
- Registry owns the rules; reconciler owns the execution

---

### 7. TemplateAdapter (Phase 5)

**Location:** `scripts/engine/progression/template/template-adapter.js`

**Responsibility:** Convert template JSON into canonical ProgressionSession state.

**Flow:**
```
Template JSON
  ↓ TemplateAdapter.initializeSessionFromTemplate()
  ├─ Create ProgressionSession
  ├─ Normalize selections via Phase 1 normalizers
  ├─ Mark template-provided nodes as locked
  └─ Extract build signals
  ↓
ProgressionSession with populated draftSelections
```

**Key Methods:**
- `initializeSessionFromTemplate(template, actor)` → ProgressionSession

**Rules:**
- All template data flows through draftSelections
- Uses existing Phase 1 normalizers (no custom logic)
- No actor mutation during load
- Template is immutable once loaded into session

---

### 8. TemplateValidator (Phase 5)

**Location:** `scripts/engine/progression/template/template-validator.js`

**Responsibility:** Validate template selections through PrerequisiteChecker.

**Output:**
```javascript
{
  valid: boolean,
  conflicts: [{ node, current, reason }, ...],
  invalid: [{ selection, reason, suggestion }, ...],
  warnings: [{ node, text, severity }, ...],
  dirtyNodes: [nodeId, ...],
  reconciliationNeeded: boolean
}
```

**Key Methods:**
- `validateTemplateSelections(session, actor)` → validation report

**Rules:**
- Invalid picks marked dirty, not force-applied
- All checks go through PrerequisiteChecker
- No bypassing of rules
- Conflicts surface for player reconciliation

---

## Data Flow Patterns

### Pattern 1: User Selection in Chargen

```
User clicks "Select Class: Soldier"
  ↓ ClassStep.onItemCommitted()
  ↓ normalizeClass({ classId, className })
  ↓ progressionSession.commitSelection('class-step', 'class', normalized)
  ↓ ProgressionReconciler.reconcileAfterCommit(session, 'class')
     - Identify affected: skills, feats, talents, forces
     - Apply invalidation behaviors (purge, dirty, recompute)
  ↓ ProgressionShell.invalidateDownstream()
  ↓ Shell re-renders active steps
```

### Pattern 2: Template Load → Apply

```
User selects template "Jedi Guardian"
  ↓ TemplateAdapter.initializeSessionFromTemplate(template, actor)
     - Normalize all template fields to draftSelections
     - Mark class, feats, talents as locked (template-provided)
     - Extract build signals
  ↓ TemplateValidator.validateTemplateSelections(session, actor)
     - Check each selection via PrerequisiteChecker
     - Mark conflicts as dirty
  ↓ TemplateTraversalPolicy.computeMinimumPath(session, activeSteps)
     - Skip locked nodes
     - Show required decision points
  ↓ Shell renders fast-build flow
  ↓ Player makes required overrides (or confirms)
  ↓ ProjectionEngine.buildProjection(session)
  ↓ MutationPlan.compileFromProjection(projection)
  ↓ MutationPlan.validate() + apply()
  ↓ Character sheet updated
```

### Pattern 3: Advisory/Suggestion

```
Player at feat-selection node, 4 feats available
  ↓ SuggestionContextAdapter.buildSuggestionContext(shell, options)
     - Read draftSelections (current choices)
     - Build projection
     - Filter by legality (PrerequisiteChecker)
  ↓ BuildSignalsNormalizer.normalizeSignals(context)
     - Extract explicit signals (survey answers)
     - Infer signals (from class, attributes, current picks)
  ↓ ForecastEngine.forecastAcquisition(feat, context)
     - Will this feat be legal at next step?
     - What does it unlock?
  ↓ SuggestionEngine.rankOptions(context)
     - Score each feat for:
       - Builds toward declared target
       - Synergy with other picks
       - Prerequisite satisfaction
  ↓ AdvisoryResultFormatter.formatForMentor(suggestion)
     - Build recommendation message
  ↓ Mentor dialogue displays suggestion
```

---

## Authority Hierarchy

```
┌─────────────────────────────────────────┐
│  Rules Authority: PrerequisiteChecker   │ (SOLE)
│  All legality decisions here, nowhere   │
│  else.                                  │
└─────────────────────────────────────────┘
            ▲
            │ Powers all of:
    ┌───────┼───────┐
    │       │       │
┌───▼──┐ ┌─▼──┐ ┌──▼──┐
│Valid │ │Fore│ │Advis│
│ation │ │cast│ │ory  │
└──────┘ └────┘ └─────┘

┌─────────────────────────────────────────┐
│ State Authority: ProgressionSession     │ (SOLE)
│ draftSelections is single source        │
│ of truth for all selections.            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Mutation Authority: MutationPlan        │ (SOLE)
│ All actor updates go through this       │
│ path. Validated before apply.           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Dependency Authority: Node Registry +   │ (SOLE)
│ ProgressionReconciler                   │
│ Only place invalidation rules are       │
│ defined and executed.                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Template Authority: TemplateAdapter →   │ (SOLE)
│ draftSelections → canonical path        │
│ All templates flow through spine.       │
└─────────────────────────────────────────┘
```

---

## Boundary Rules (Phase 6 Enforcement)

### Rule 1: PrerequisiteChecker Monopoly
- ✅ PrerequisiteChecker.evaluateAcquisition()
- ❌ Custom prerequisite checks anywhere else
- ❌ Suggestion modules making legality calls
- ❌ Advisory modules filtering by rules

### Rule 2: ProgressionSession Monopoly
- ✅ All state writes via commitSelection()
- ✅ All state reads from draftSelections
- ❌ Direct actor mutations
- ❌ BuildIntent as primary authority
- ❌ CommittedSelections as primary authority
- ❌ Side state stores

### Rule 3: MutationPlan Monopoly
- ✅ All actor mutations via MutationPlan
- ✅ Validate before apply
- ❌ Direct ActorEngine calls from steps
- ❌ CreateEmbeddedDocuments calls in plugins
- ❌ Bypass of validation

### Rule 4: ProgressionReconciler Monopoly
- ✅ Dirty marking via reconciliation
- ✅ Invalidation via registry rules
- ❌ Ad-hoc dirty marking
- ❌ Custom invalidation logic
- ❌ Manual step removal

### Rule 5: Template via Spine
- ✅ Templates → TemplateAdapter → draftSelections
- ✅ Validate via TemplateValidator
- ✅ Apply via MutationPlan
- ❌ TemplateEngine side paths
- ❌ Template validation bypass
- ❌ Direct template mutations

---

## Supported Domains

### Actor (Full)
- ✅ Chargen
- ✅ Level-up
- ✅ Templates
- ✅ All classes, species, abilities

### NPC (Partial)
- ✅ Quick-build templates
- ⚠️ Custom class restrictions TBD
- ⚠️ Prestige access limited

### Droid (Partial)
- ✅ Droid chassis selection
- ✅ Custom systems
- ⚠️ Prestige droid paths unsupported
- ⚠️ Some force powers restricted

### Follower (Structural)
- ⚠️ NPC with preset packages
- ⚠️ Not yet integrated into chargen shell
- ⚠️ Planned for Phase 7

### Nonheroic (Structural)
- ⚠️ Simplified attribute selection
- ⚠️ Not yet integrated into chargen shell
- ⚠️ Planned for Phase 7

### Vehicles/Ships (Unsupported)
- ❌ No progression support yet
- ❌ Deferred to Phase 8+

---

## Extension Points

### Adding a New Node

1. Add to PROGRESSION_NODE_REGISTRY with metadata
2. Add step plugin if needed
3. Update ActiveStepComputer if conditional
4. Add to relevant mode/subtype lists
5. Test reconciliation impact

### Adding a New Prerequisite Check

1. Add logic to PrerequisiteChecker
2. Update evaluateAcquisition() signature if needed
3. Test via TemplateValidator
4. Add scenario test
5. Update PrerequisiteChecker docstring

### Adding a New Template

1. Define in character-templates.json
2. Validate against TemplateValidator
3. Test via template scenario
4. Document locked vs optional nodes
5. Add to template registry

---

## Debugging and Observability

### Available Debug Tools

**Progression Shell:**
- `shell.progressionSession` → All state
- `shell.currentStepId` → Current node
- `shell.projectionEngine.buildProjection()` → Projection
- `shell.getAuditTrail()` → History

**Template System:**
- `session.auditTrail` → Override history
- `session.templateSignals` → Build intent metadata
- `session.lockedNodes` → Template constraints

**Validation:**
- `TemplateValidator.generateValidationReport()` → Issues
- `TemplateObservability.generateAuditReport()` → Timeline
- `TemplateObservability.generateDebugOutput()` → Full dump

**Suggestion System:**
- `SuggestionContextAdapter.buildDebugContext()` → Context breakdown
- `ForecastEngine.getDebugForOption(option)` → Why this ranked
- `AdvisoryResultFormatter.formatForDebug()` → Reasons/tradeoffs

---

## FAQ

**Q: How do I add a new feat?**
A: Add to compendium, update PROGRESSION_NODE_REGISTRY prerequisites if needed, test via TemplateValidator.

**Q: Why can't I directly mutate the actor?**
A: All mutations go through MutationPlan to ensure they're validated, tracked, and reversible.

**Q: What if a template becomes invalid?**
A: TemplateValidator marks selections as dirty, surfaces them in UI, player confirms or overrides.

**Q: Can I add a custom rule?**
A: Custom rules must go in PrerequisiteChecker. No other module should make legality calls.

**Q: How do I know why a node appeared/disappeared?**
A: Check ArchitectureGovernance.auditArchitectureBoundaries() and TemplateObservability.generateDebugOutput().

---

## Phase 6 Status

- ✅ Core architecture locked
- ✅ Governance enforcement in place
- ✅ Content contracts defined
- ✅ Scenario test matrix established
- ✅ Observability tools available
- ⚠️ Partial-support coverage truthfulness ongoing
- ⏳ Full documentation planned Phase 6 Step 7

**Last Updated:** Phase 6 Step 1 (Architecture Governance)
