# Phase 7 Progress — Experience Polish, Rollout Readiness, Operationalization

**Phase Goal**: Make the unified build system feel complete and deployable by improving player-facing clarity, GM/admin controls, recovery/error handling, review/explanation UX, template and advisory usability, rollout toggles and operational safety, and migration off remaining legacy entry points.

**Status**: In Progress (Step 1 Complete, 14% of Phase 7)

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
└── step-explainability-mixin.js                  (160 lines)

PHASE-7-PROGRESS.md                               (this file)
```

**Total**: ~1,260 lines of explainability code + CSS

---

## Execution Order

Phase 7 has 7 steps. This is Step 1 of 7:

1. ✅ **Step 1**: Add explainability for active/skipped/dirty nodes, suggestion rationale, template provenance
2. **Step 2**: Build recovery flows for invalid template picks, dirty reconciliation states, apply failure, safe resume
3. **Step 3**: Add/refine rollout settings and feature controls
4. **Step 4**: Inventory and close or deprecate remaining legacy build entry points
5. **Step 5**: Refine summary/review as the clear checkout step
6. **Step 6**: Improve GM/admin diagnostics and packaged-build usability
7. **Step 7**: Produce readiness checklist and in-repo player/admin/maintainer documentation

---

## Known Limitations (Phase 7 Step 1)

- Integration hooks not yet wired into ProgressionShell
- Step plugins not yet using the mixin
- SummaryStep integration not yet active
- Full test coverage pending (manual verification phase)
- Suggestion rationale requires context from step's suggestion coordinator
