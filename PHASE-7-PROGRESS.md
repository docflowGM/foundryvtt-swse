# Phase 7 Progress — Experience Polish, Rollout Readiness, Operationalization

**Phase Goal**: Make the unified build system feel complete and deployable by improving player-facing clarity, GM/admin controls, recovery/error handling, review/explanation UX, template and advisory usability, rollout toggles and operational safety, and migration off remaining legacy entry points.

**Status**: In Progress (Steps 1-3 Complete, 43% of Phase 7)

---

## Step 3: Add Rollout Controls and Feature Settings ✅

**Completed**: Comprehensive rollout and feature flag system for operational control

### Deliverables

#### 1. `rollout-settings.js` (280 lines)
Centralized settings registry for all Phase 7 feature flags.

**Settings** (11 total):
- **Rollout Mode**: internal → gm-opt-in → beta → default → legacy-fallback
- **Feature Toggles**: templates, advisory, forecast, explainability, template-provenance, support-warnings, debug-tools
- **Recovery Controls**: session-resume, apply-retry
- **Legacy Compatibility**: legacy-fallback-enabled, legacy-entry-points-visible

**Methods**:
- `registerSettings()` — Initialize all game.settings at module load
- `getRolloutMode()` — Get current rollout mode
- `isFeatureEnabled(featureName)` — Check if feature is active
- `shouldUseUnifiedProgressionByDefault()` — Check if unified is primary
- `shouldSupportLegacyFallback()` — Check if legacy available
- `getActiveFeatures()` — Get all active features
- `generateRolloutReport()` — Admin diagnostic report

#### 2. `rollout-controller.js` (290 lines)
Applies rollout settings to progression shell and entry points.

**Methods**:
- `determineEntryPoint(actor)` — Route actor to unified vs. legacy
- `configureShell(shell)` — Apply settings to shell instance
- `_applyFeatureGates(shell)` — Hide/show major systems (templates, advisory, forecast)
- `_applyUIVisibility(shell)` — Control explanation and diagnostic UI
- `_applyRecoveryBehavior(shell)` — Enable/disable recovery features
- `getSupportWarningForFeature(featurePath)` — Get support level warning
- `shouldFallbackToLegacy(error)` — Decide if fallback is needed
- `validateRolloutConfig()` — Consistency check

#### 3. `legacy-entry-point-manager.js` (320 lines)
Manages migration off legacy build systems.

**Registry** (4 legacy systems tracked):
- chargen-main (deprecated)
- levelup-main (deprecated)
- quick-build (deprecated)
- direct-actor-mutation (deprecated API)

**Methods**:
- `isLegacyEntryPointActive(id)` — Check if entry point is available
- `getDeprecationWarning(id)` — Get UI warning for deprecated entry point
- `migrateToUnifiedProgression(actor, type)` — Wrap legacy call → unified shell
- `getLegacyEntryPointStatus()` — Status of all legacy systems
- `generateDeprecationReport()` — Roadmap documentation
- `areAllLegacyEntryPointsRetired()` — Phase 7 completion check
- `getMigrationChecklist()` — User-facing migration guide

---

## Rollout Modes Explained

| Mode | Templates | Advisory | Debug | Legacy | Use Case |
|------|-----------|----------|-------|--------|----------|
| **internal** | ✓ | ✓ | ✓ | Hidden | Development/QA only |
| **gm-opt-in** | ✓ | ✓ | ✗ | Visible | Beta testing, early adopters |
| **beta** | ✓ | ✓ | ✗ | Visible | Live testing with fallback |
| **default** | ✓ | ✓ | ✗ | Hidden | Production (unified is primary) |
| **legacy-fallback** | ✗ | ✗ | ✗ | Primary | Emergency mode (troubleshooting) |

## Feature Gate Examples

**Scenario**: You want to disable templates temporarily for testing.

Old approach (no rollout system):
- Change code, push, update server

New approach (rollout system):
1. Open settings
2. Find "Character Progression: Enable Template Mode"
3. Uncheck
4. Changes apply immediately, no restart needed

## Settings Application Flow

```
Game starts
    ↓
RolloutSettings.registerSettings()
    ↓
When ProgressionShell created:
    RolloutController.determineEntryPoint() → unified or legacy
    RolloutController.configureShell() → apply settings
    ↓
    shell._rolloutConfig populated
    ↓
Shell.onRender():
    - Check shell._hideTemplateSelection → don't render template UI
    - Check shell._hideExplanationBadges → don't render badges
    - Check shell._showDebugTools → show debug panel
    ↓
Step plugins:
    - Check shell._rolloutConfig.explainabilityEnabled → show/hide explanations
    - Check shell._rolloutConfig.supportWarningsEnabled → show/hide warnings
```

## No Split-Brain Architecture

**Critical design principle**: The rollout system gates FEATURES of a single unified engine, not alternate engines.

```
❌ WRONG (Split-Brain):
UnifiedProgressionShell
    ↓
    LegacyChargenAdapter
        ↓
        LegacyChargenCore (alternate engine)

✓ RIGHT (Single Engine):
ProgressionShell (unified)
    ↓
    _hideTemplateSelection = true (if disabled)
    _hideAdvisory = true (if disabled)
    ↓
    Single core path, controlled exposure
```

This prevents:
- Duplicate logic
- Inconsistent state
- Conflicting authorities
- Migration complexity

---

## Integration Points (Ready)

- ProgressionShell uses `shell._rolloutConfig`
- Steps check feature flags before rendering UI
- Entry point selection uses `RolloutController.determineEntryPoint()`
- Legacy calls can use `LegacyEntryPointManager.migrateToUnifiedProgression()`

## Not Yet Integrated

- [ ] Wiring into ProgressionShell initialization
- [ ] Step plugin feature gate checks
- [ ] GM settings UI integration
- [ ] Dialog for legacy entry point deprecation warning

---

## Step 2: Build Recovery and Interruption Handling ✅

**Completed**: Comprehensive recovery system for dirty nodes, template conflicts, apply failures, and session resume

### Deliverables

#### 1. `recovery-coordinator.js` (300 lines)
Core recovery planning engine that detects scenarios and creates resolution plans.

**Methods**:
- `planDirtyNodeRecovery(session)` — Recovery for nodes invalidated by upstream changes
  - Identifies all dirty nodes
  - Explains why each became dirty
  - Routes user to required resolution points

- `planTemplateConflictRecovery(session, validationReport)` — Recovery for template issues
  - Categorizes conflicts (game rules vs. unresolved)
  - Distinguishes blocking vs. non-blocking
  - Provides resolution paths

- `planApplyFailureRecovery(error, session)` — Recovery when confirm/apply fails
  - Categorizes error (validation, prerequisite, mutation, template)
  - Preserves session state
  - Suggests retry or recovery steps

- `planResumeRecovery(actor, savedSession)` — Recovery for interrupted/resumed sessions
  - Detects stale sessions (>1 hour old)
  - Checks for incompatible actor state
  - Warns about level/subtype mismatches
  - Flags unresolved items

- `createRecoveryGuidance(recoveryPlan)` — Convert plan to user-facing guidance
  - Title, message, hints, warnings
  - Action buttons with labels
  - Next-steps walkthrough

#### 2. `recovery-display.js` (400+ lines)
UI rendering for recovery guidance.

**Components**:
- `renderRecoveryModal()` — Blocking recovery modal
  - Header with issue title
  - Body with message, details, warnings
  - Action buttons
  - Next-steps section

- `renderRecoveryPanel()` — Non-blocking recovery panel
  - Inline guidance (no modal)
  - Severity indicator (warning/error/info)
  - Compact version of modal

- `renderRecoveryNotice()` — Lightweight notice
  - Single-line alert
  - No interaction required

**CSS**: ~350 lines
- Modal styling (backdrop, content, buttons)
- Panel styling (severity colors, inline layout)
- Notice styling (minimal alert)

#### 3. `progression-recovery-manager.js` (280 lines)
Orchestrator that integrates recovery into ProgressionShell.

**Methods**:
- `checkAndInitiateRecovery(session)` — Detect and start recovery flow
  - Checks for dirty nodes, template conflicts
  - Initiates appropriate recovery
  - Routes to recovery steps

- `checkResumeStrategy(actor, savedSession)` — Handle session resume
  - Returns: 'resume' | 'start-fresh' | 'proceed'
  - Shows modal if needed
  - Validates session compatibility

- `handleApplyFailure(error, session)` — Graceful apply failure handling
  - Preserves session state
  - Shows error modal with recovery steps
  - Suggests retry or alternative paths

- `navigateToRecoveryStep(stepId, options)` — Route user to resolution
  - Navigates shell to specific step
  - Tracks recovery reason
  - Enables analytics

---

## Recovery Flow Walkthrough

### Dirty Node Recovery
```
Upstream change invalidates node
    ↓
dirty node added to session
    ↓
checkAndInitiateRecovery() detects it
    ↓
planDirtyNodeRecovery() creates plan
    ↓
showDirtyNodePanel() displays guidance
    ↓
navigateToRecoveryStep() sends user to node
    ↓
User confirms choice
    ↓
Dirty flag cleared
```

### Template Conflict Recovery
```
Template validation fails
    ↓
session.templateValidationReport marked invalid
    ↓
checkAndInitiateRecovery() detects it
    ↓
planTemplateConflictRecovery() categorizes issues
    ↓
If blocking → showTemplateConflictModal()
If caution → showTemplateConflictPanel()
    ↓
User resolves conflicts or exits template mode
    ↓
Template revalidated
```

### Apply Failure Recovery
```
User clicks Confirm
    ↓
ProgressionFinalizer.apply() fails
    ↓
handleApplyFailure() captures error
    ↓
planApplyFailureRecovery() explains issue
    ↓
showApplyFailureModal() shows recovery steps
    ↓
User chooses: retry, fix, or exit
    ↓
Session state preserved for next attempt
```

### Session Resume Recovery
```
User opens shell for actor with saved session
    ↓
checkResumeStrategy() evaluates saved session
    ↓
If incompatible → showResumeModal() → 'start-fresh'
If stale/warnings → showResumeModal() → 'resume' or 'start-fresh'
If clean → return 'resume'
    ↓
Shell initializes with appropriate strategy
```

---

## Design Principles

**State Preservation**
- Session state never lost due to errors
- Last error captured for debugging
- Retry is always possible

**Clear Pathways**
- Recovery is never just "You messed up"
- Each issue has a concrete next step
- User always knows where to go

**Non-Blocking Where Possible**
- Warnings are panels, not modals
- Only truly blocking issues use modals
- User retains control

**Failure Categorization**
- Validation errors: "Fix these choices"
- Prerequisite errors: "Go back and review"
- Mutation errors: "Try again or contact support"
- Template errors: "Exit template mode or update template"

---

## Not Yet Integrated

- [ ] ProgressionShell integration hooks
- [ ] ProgressionFinalizer apply failure handling
- [ ] Session persistence for retry scenarios
- [ ] Error tracking/analytics

---

## Step 1: Build User-Facing Explainability ✅

**Completed**: User explainability layer with four main components

### Deliverables

#### 1. `user-explainability.js` (320 lines)
Core explainability engine that wraps Phase 6 debug helpers and provides player-friendly output.

**Methods**:
- `explainNodePresence(session, nodeId)` — Why is this step here?
  - Returns: concise reasons (required for chargen, unlocked by choice, etc.)
  - Player-friendly language, no jargon

- `explainNodeStateChange(session, nodeId, previousState)` — Why did it disappear?
  - Detects why a node became dirty or inactive
  - Clear, actionable reasons

- `explainSuggestionRationale(context, option, rank)` — Why is this recommended?
  - Top reasons (signal alignment, mentor bias, synergies, target alignment)
  - Notable tradeoffs, without overwhelming
  - Legality reasons if illegal

- `explainTemplateProvenance(selectionInfo)` — Where did this choice come from?
  - Template locked, suggested, auto-resolved, overridden, unresolved
  - Helpful hints for each source type

- `explainTemplateIssues(validationReport)` — What's wrong with this template?
  - Categorized by severity: blocking, incomplete, caution
  - Actionable next steps

#### 2. `explanation-display.js` (500+ lines)
UI rendering layer that converts explainability data to DOM elements and CSS.

**Components**:
- `renderNodePresenceBadge()` — Badge with tooltip for active nodes
- `renderNodeStateChangeAlert()` — Alert/notice for dirty or disappeared nodes
- `renderSuggestionRationale()` — Inline explanation for suggestion ranking
- `renderTemplateProvenanceBadge()` — Icon + hint for source (🔒 locked, 💡 suggested, ✓ chosen)
- `renderTemplateIssuesPanel()` — Grouped issues (blocking/incomplete/caution)
- `renderStepExplanationCard()` — Card showing why a step is in progression

**CSS**:
- ~400 lines of explanation styles
- Auto-injected on module load
- Organized: badges, alerts, suggestions, provenance, issues, cards

#### 3. `progression-shell-explainability-integration.js` (280 lines)
Integration hook for the ProgressionShell to attach explanations after rendering.

**Methods**:
- `afterShellRender(shell, element)` — Called after each shell render
  - Attaches badges to current step in progress rail
  - Shows alerts for dirty nodes
  - Displays template info panels

- `enhanceSummaryStep(summaryElement, session, shell)` — Enhance summary step
  - Template validation issues (grouped by severity)
  - Template provenance info
  - Warnings panel for unresolved items and dirty nodes

- `_createDirtyNodeGuidance()` — Recovery steps for dirty nodes
  - 4-step recovery flow (review → understand → revisit → confirm)

#### 4. `step-explainability-mixin.js` (160 lines)
Mixin for step plugins to easily surface explanations without core changes.

**Methods**:
- `_attachExplanationsToOptions(shell, stepElement)` — Auto-attach badges to options
  - Finds [data-option-id] elements
  - Adds suggestion rationale for recommended options
  - Adds template provenance indicators

- `_createValidationExplanation()` — Styled validation issue explanation
- `_createStepDirectiveCard()` — Card explaining why step is in progression

---

## Why This Design

### Separation of Concerns

```
ProgressionDebugHelpers (Phase 6)
    ↓ (deep technical traces)
UserExplainability (Phase 7 Step 1)
    ↓ (player-friendly abstractions)
ExplanationDisplay + Integration
    ↓ (UI rendering)
[DOM elements and CSS]
```

- **ProgressionDebugHelpers**: Full debug traces for developers (never shown to players)
- **UserExplainability**: Translate traces → concise, actionable player language
- **ExplanationDisplay + Integration**: Convert to UI elements

### Conciseness
- Player explanations are <50 words
- Top 2-3 reasons, not exhaustive
- Technical jargon avoided (no "prerequisite metadata", no "activation policy")

### Actionability
- Every explanation includes next step (where applicable)
- Dirty node guidance provides recovery flow
- Template issues link back to what needs fixing

---

## Integration Points

### ProgressionShell
- Call `ProgressionShellExplainabilityIntegration.afterShellRender()` after each render
- Automatically attaches badges, alerts, and panels

### Step Plugins
- Mix `StepExplainabilityMixin` into step classes
- Call `_attachExplanationsToOptions()` in onDataReady()
- Automatically detects and explains suggestions and template provenance

### SummaryStep
- Call `ProgressionShellExplainabilityIntegration.enhanceSummaryStep()` in onDataReady()
- Automatically shows template issues and recovery guidance

---

## Not Yet Integrated (Next Steps)

- [ ] Actual ProgressionShell integration hook
- [ ] SummaryStep integration
- [ ] Step plugin examples (e.g., AttributeStep, SkillStep)
- [ ] Dirty node recovery flows (Step 2)
- [ ] Rollout settings (Step 3)
- [ ] Legacy entry-point closure (Step 4)

---

## Testing Coverage

### Manual verification needed:
- [ ] Node presence badges display correctly
- [ ] Dirty node alerts are clear and actionable
- [ ] Suggestion rationale matches ranking logic
- [ ] Template provenance indicators are correct
- [ ] Summary step shows template issues clearly
- [ ] Recovery guidance helps users resolve dirty states
- [ ] CSS doesn't conflict with existing styles

---

## Files Created

```
scripts/apps/progression-framework/ux/
├── user-explainability.js                        (320 lines)
├── explanation-display.js                        (500+ lines)
├── progression-shell-explainability-integration.js (280 lines)
├── step-explainability-mixin.js                  (160 lines)
├── recovery-coordinator.js                       (300 lines)
├── recovery-display.js                           (400+ lines)
└── progression-recovery-manager.js               (280 lines)

scripts/apps/progression-framework/rollout/
├── rollout-settings.js                           (280 lines)
├── rollout-controller.js                         (290 lines)
└── legacy-entry-point-manager.js                 (320 lines)

PHASE-7-PROGRESS.md                               (this file, expanded)
```

**Total**: ~3,220 lines of explainability + recovery + rollout code + CSS

---

## Execution Order

Phase 7 has 7 steps. Steps 1-3 complete:

1. ✅ **Step 1**: Add explainability for active/skipped/dirty nodes, suggestion rationale, template provenance
2. ✅ **Step 2**: Build recovery flows for invalid template picks, dirty reconciliation states, apply failure, safe resume
3. ✅ **Step 3**: Add/refine rollout settings and feature controls
4. **Step 4**: Inventory and close or deprecate remaining legacy build entry points
5. **Step 5**: Refine summary/review as the clear checkout step
6. **Step 6**: Improve GM/admin diagnostics and packaged-build usability
7. **Step 7**: Produce readiness checklist and in-repo player/admin/maintainer documentation

---

## Known Limitations (Phase 7 Steps 1-2)

**Step 1 (Explainability)**:
- Integration hooks not yet wired into ProgressionShell
- Step plugins not yet using the mixin
- SummaryStep integration not yet active
- Suggestion rationale requires context from step's suggestion coordinator

**Step 2 (Recovery)**:
- ProgressionShell integration hooks not yet wired
- ProgressionFinalizer apply failure hook not yet added
- Session persistence for retry not yet implemented
- Error tracking/analytics pending

**General**:
- Full test coverage pending (manual verification phase)
- No integration testing across steps yet
