# SWSE Progression Engine — UX Audit
## Comprehensive Analysis & Improvement Opportunities

**Date**: 2026-03-28
**Scope**: Player-facing UX layer built on canonical progression architecture
**Goal**: Make progression feel effortless, readable, and trustworthy

---

## EXECUTIVE SUMMARY

**Current State**:
- Strong foundation: dynamic step composition, canonical status model, visited-state semantics
- Existing progress rail shows step states with visual indicators (complete ✔, error ⚠, caution !)
- Footer shows blocking issues and warnings
- Summary surface exists for review
- Feat/talent work surfaces show grouped items with counts

**Key Gaps Identified**:
1. **Orientation**: No "Step X of Y" context in work surface area
2. **Micro-progress**: No visible counts of remaining selections per step
3. **Next blocker clarity**: Footer shows issues but could be more specific
4. **Change feedback**: No feedback when steps unlock/hide or state changes
5. **Rail affordances**: Could more clearly indicate clickable vs future steps
6. **Prerequisite messaging**: No explanation for why selections are unavailable
7. **Summary navigation**: No jump-back links to problem steps
8. **Empty states**: Some empty states lack helpful guidance

**Authoritative State Sources**:
- **Active steps**: `this.steps` (from ActiveStepComputer) — SSOT for visible step list
- **Current step**: `this.currentStepIndex` — position within active list
- **Step status**: `_evaluateStepStatus()` → canonical state (error/caution/complete/in_progress/neutral)
- **Visited state**: `progressionSession.visitedStepIds` — which steps user has entered
- **Selections**: `progressionSession.draftSelections` — committed choices
- **Projection**: `progressionSession.currentProjection` — derived character state
- **Validation**: Step plugin methods (validate, getBlockingIssues, getWarnings)

---

## PHASE 1: ORIENTATION/YOU-ARE-HERE CLARITY

### Current State

**What works:**
- Progress rail shows all active steps in order
- Current step is highlighted (`prog-step--active` CSS class)
- Work surface placeholder shows "Step X of Y" (but only when template fails to render)

**What's missing:**
- No step context indicator in normal work surface rendering
- Composite steps (normalized Feat/Talent) show no subsection context
- No clear indication of step position in the journey
- Counts from hidden/inactive steps could leak into displays

### Findings

1. **Root cause**: Active step counts computed correctly in shell, but not surfaced to step templates
   - `this.steps.length` = true active count (only visible steps)
   - Step plugins receive context but don't get told their position in active list
   - Work surface templates cannot access `currentStepIndex`

2. **Composite steps**: Feat/Talent steps will be normalized in future phases
   - Normalized "Feat" step needs to show: "General Feat — Complete" / "Class Feat — 2 remaining"
   - Currently no mechanism to aggregate micro-progress within a single rail step

3. **Empty states**: Some steps (e.g., languages, force powers) can be empty when no options available
   - Current placeholder is generic
   - No contextual guidance on why section is unavailable

### Implementation Plan

**Phase 1A: Step Context in Work Surface**
```
Data to surface to templates:
- currentStepNumber: current step position (1-indexed)
- totalSteps: total active steps
- isFirstStep: boolean
- isLastStep: boolean
- stepDescription: friendly descriptor (e.g., "Choose Your Species")
```

Modify `_prepareContext()` to add:
```javascript
const currentStepNumber = this.currentStepIndex + 1;
const totalSteps = this.steps.length;

context.stepContext = {
  currentStepNumber,
  totalSteps,
  isFirstStep: this.currentStepIndex === 0,
  isLastStep: this.currentStepIndex === this.steps.length - 1,
  displayText: `Step ${currentStepNumber} of ${totalSteps}`,
};
```

Pass to step via context → step plugin can surface in getStepData().

**Phase 1B: Composite Step Subsection Context** (defer to normalized steps implementation)
- Feat step will receive list of general vs class-restricted slots
- Talent step will receive list of heroic vs class-restricted slots
- Show micro-progress: "General: 1 of 1 selected" / "Class: 2 of 3 remaining"

**Phase 1C: Empty State Guidance**
- When step has no valid options, explain why
- Examples:
  - Languages: "No language slots remaining after species choice"
  - Force Powers: "Requires Force Sensitivity. You have not selected this prerequisite."
  - Skills: "All available skill trainings used"

---

## PHASE 2: MICRO-PROGRESS INSIDE STEPS

### Current State

**What works:**
- Feat work surface shows feat counts per category
- Skills step has count in section header ("Trained Skills (5)")
- Summary shows "Feats (3)" and "Talents (2)"

**What's missing:**
- No "X of Y" for slots (e.g., "General Feat — 1 of 1 selected", "Languages — 3 of 4 remaining")
- Subsections with zero remaining are not visually distinct from available sections
- "Remaining" vs "selected" framing is inconsistent
- Progress indicators don't come from authoritative selection state

### Findings

1. **Current data flow**:
   - Step plugins know what's selected (can iterate `progressionSession.draftSelections`)
   - Templates do not receive slot totals or remaining counts
   - No dedicated "progress" data structure passed to templates

2. **Inconsistencies**:
   - Feat work surface shows "5 feats in category" (total available, not slots)
   - Skills header shows count of trained (absolute, not relative to slots)
   - Summary shows flat lists with no progress context
   - Different steps use different counting semantics

3. **Authorization sources**:
   - Slots/requirements → engine rules (class grants, heroic base, etc.)
   - Selected count → `progressionSession.draftSelections[stepKey].length`
   - Remaining → computed as (required - selected)

### Implementation Plan

**Phase 2A: Standardized Progress Naming**

Define a consistent pattern used across all steps:
```typescript
// For bounded selections (e.g., language slots)
selectedCount: number,      // How many selected
requiredCount: number,      // Total slots available
remainingCount: number,     // requiredCount - selectedCount
isComplete: remainingCount === 0,

// Display strings (templates)
progressLabel: "3 of 4 languages",
remainingLabel: "1 remaining",
completeBadge: "Complete" (when remainingCount === 0)

// For unbounded selections (e.g., feat suggestions)
canSelect: boolean,         // Whether more can be selected
selectedCount: number,
```

**Phase 2B: Step Plugin Enhancement**

Each step plugin's `getStepData()` adds progress object:
```javascript
// Example: feat step with 1 general feat slot
return {
  groupedFeats: {...},
  // NEW:
  slotProgress: {
    selectedFeats: shell.progressionSession.draftSelections.feats?.length || 0,
    requiredFeats: 1,  // From engine rules
    remainingFeats: 1 - selectedCount,
    isComplete: remainingFeats === 0,
  },
  // ...
};
```

**Phase 2C: Template Updates**

Feat work surface adds micro-progress banner:
```hbs
{{#if slotProgress}}
<div class="prog-selection-progress">
  {{#if slotProgress.isComplete}}
    <span class="prog-badge prog-badge--complete">
      <i class="fas fa-check-circle"></i> Complete
    </span>
  {{else}}
    <span class="prog-remaining">
      {{slotProgress.remainingFeats}} feat{{#unless (eq slotProgress.remainingFeats 1)}}s{{/unless}} remaining
    </span>
  {{/if}}
</div>
{{/if}}
```

**Phase 2D: Summary/Skills Aggregation**

For steps like Languages, Skills (which aggregate choices):
- Show subsection counts if multiple categories
- Example: "Trained Skills: 4 of 5 slots used"
- Example: "Languages: English, Huttese, Binary (3 of 4 available)"

---

## PHASE 3: NAVIGATION BLOCKER EXPLANATIONS

### Current State

**What works:**
- Footer shows blocking issues and warnings
- Progress rail shows step states (error/caution)
- Validation runs before allowing next-step

**What's missing:**
- Footer explanation is generic ("Resolve errors before continuing")
- No specific explanation of what's needed
- No distinction between "required selection missing" vs "invalid selection"
- Player might not understand why Next is blocked

### Findings

1. **Current footer behavior**:
   - `_buildFooterData()` gets blockingIssues from step plugin
   - These are rendered as list items in footer
   - Generic and sometimes vague (e.g., "Invalid selection")

2. **Available data**:
   - Step status includes `remainingChoices` array
   - Validation returns specific errors
   - Engine can explain prerequisites/requirements

3. **Problem**: Footer explanations aren't always specific enough
   - "Choose a species" would be clearer than "Required field missing"
   - "1 more talent needed" would be clearer than "Incomplete"

### Implementation Plan

**Phase 3A: Specific Blocker Messaging**

Replace generic validation with action-oriented messages:

```typescript
getBlockingIssues() {
  const issues = [];

  if (!this._selectedSpeciesId) {
    issues.push('Select a species to continue');
  }

  return issues;
}
```

Not:
```typescript
getBlockingIssues() {
  const issues = [];
  if (!this._selectedSpeciesId) {
    issues.push('Missing required selection');  // Generic!
  }
  return issues;
}
```

**Phase 3B: Remaining Choices Display**

If step has unbounded selections (feats, talents), show what's needed:

```typescript
// In footer context
remainingChoicesText: (() => {
  const remaining = currentPlugin.getRemainingPicks?.() || [];
  if (remaining.length === 0) return '';

  // "Select 1 more Talent"
  // "Choose 2 more Skills"
  return remaining.map(r =>
    `${r.count} more ${r.label.toLowerCase()}`
  ).join(' and ');
})();
```

**Phase 3C: Multi-Issue Prioritization**

When multiple issues block next, prioritize:
1. Missing required (e.g., "Select a class")
2. Invalid current (e.g., "Fix 2 talent errors")
3. Incomplete optional (e.g., "Note: 1 feat slot remains")

```
Next is blocked by:
❌ Select a class to continue
⚠️ Resolve 1 talent error
💡 Tip: 1 feat slot remaining
```

**Phase 3D: Footer Button Tooltip/Label**

When disabled, Next button could show:
```hbs
<button {{#unless footer.next.enabled}}
          title="{{footer.next.blockerReason}}"
        {{/unless}}>
```

Or update button label itself:
```
❌ Missing Selection (Next disabled)
```

---

## PHASE 4: CHANGE FEEDBACK/STATE TRANSITION MESSAGING

### Current State

**What works:**
- Canonical state transitions are reliable
- Progress rail updates immediately when state changes
- Visited state prevents false completion indicators

**What's missing:**
- No toast/banner when steps unlock (conditional steps appear)
- No feedback when steps hide (become inactive)
- No messaging when downstream steps become stale (caution)
- Player might not notice rail changed

### Findings

1. **State transitions happen silently**:
   - `_recomputeActiveStepsIfNeeded()` rebuilds rail
   - New steps may appear, old steps may vanish
   - No visual acknowledgment of change

2. **Silent failures**:
   - Player changes species, some talents become unavailable
   - Progress rail updates but no explanation why
   - Player might think UI is broken

3. **Opportunity**: Dependency graph system (Phase D onwards) will have transition explanations
   - "Force Powers unlocked due to Force Sensitivity selection"
   - "Talents recalculated due to class change"

### Implementation Plan

**Phase 4A: Step Unlock Messaging** (prioritized)

When conditional steps activate:
```typescript
// In shell after _recomputeActiveStepsIfNeeded()
const newlyActive = newStepList.filter(s =>
  !oldStepList.find(o => o.stepId === s.stepId)
);

if (newlyActive.length > 0) {
  const stepNames = newlyActive.map(s => s.label).join(', ');
  this._showFeedback(`✓ ${stepNames} unlocked`, 'success');
}
```

**Phase 4B: Step Hide Messaging** (important)

When conditional steps disappear:
```typescript
const nowHidden = oldStepList.filter(s =>
  !newStepList.find(n => n.stepId === s.stepId)
);

if (nowHidden.length > 0) {
  // Only warn if current step was hidden
  if (nowHidden.some(s => s.stepId === currentDescriptor?.stepId)) {
    this._showFeedback(
      `${nowHidden[0].label} is no longer available`,
      'warning'
    );
    // Auto-repair currentStep if needed
  }
}
```

**Phase 4C: Downstream Invalidation Messaging** (defer to dependency graph)

When upstream change marks downstream steps stale:
```typescript
// Set during _trackDownstreamInvalidation()
const invalidatedSteps = updatedStepProgess.filter(s => s.isStale);

if (invalidatedSteps.length > 0) {
  const affectedNames = invalidatedSteps
    .slice(0, 2)
    .map(s => s.descriptor.label)
    .join(', ');

  this._showFeedback(
    `⚠️ ${affectedNames} require review`,
    'caution'
  );
}
```

**Phase 4D: Feedback UI**

Add lightweight toast/banner:
```hbs
{{#if lastFeedback}}
  <div class="prog-feedback prog-feedback--{{lastFeedback.level}}">
    {{lastFeedback.message}}
  </div>
{{/if}}
```

Auto-dismiss after 4 seconds, but allow manual close.

**Phase 4E: Prevent Message Spam**

Track which messages shown to avoid repeating:
```typescript
this._lastFeedbackMessages = new Set();

_showFeedback(message, level) {
  const key = `${level}:${message}`;
  if (this._lastFeedbackMessages.has(key)) return;

  this._lastFeedbackMessages.add(key);
  // Clear after 10 renders
  this._feedbackLifetime = 10;
}
```

---

## PHASE 5: RAIL CLICK AFFORDANCE CLARITY

### Current State

**What works:**
- Progress rail clearly shows current step with active styling
- Completed steps have checkmark (✔)
- Error/caution indicators present
- `canNavigate` property correctly computed

**What's missing**:
- Hover state doesn't clearly indicate clickability
- Disabled future steps look similar to incomplete steps
- No visual distinction between "locked future" vs "unvisited but available"
- Accessibility: can't tell from CSS alone which are clickable

### Findings

1. **Current visual states**:
   - Active: `prog-step--active` (highlighted)
   - Complete: `prog-step--complete` (has checkmark)
   - Error: `prog-step--error` (has warning icon)
   - Caution: `prog-step--caution` (has ! icon)
   - In Progress: `prog-step--in-progress` (partial)
   - Neutral: `prog-step--neutral` (unvisited)
   - Conditional: `prog-step--conditional` (engine-unlocked)

2. **Clickability rules**:
   - Can click if: `canNavigate === true` (idx < currentStepIndex)
   - Cannot click if: `canNavigate === false` (future steps or current)
   - Disabled steps have `tabindex="-1"`

3. **Problem**: Visual cues don't match accessibility cues
   - CSS doesn't highlight `:hover` with distinct feedback
   - No cursor change to `pointer` for clickable steps
   - No `aria-disabled` or similar for non-clickable future steps

### Implementation Plan

**Phase 5A: Cursor and Pointer Feedback**

CSS enhancement:
```css
/* Clickable steps */
.prog-step[data-can-navigate="true"] {
  cursor: pointer;

  &:hover {
    background-color: var(--swse-interactive-hover);
    transform: translateX(2px);
  }
}

/* Non-clickable steps */
.prog-step[data-can-navigate="false"] {
  cursor: not-allowed;
  opacity: 0.6;
}
```

Template enhancement:
```hbs
<li class="prog-step ..."
    data-can-navigate="{{this.canNavigate}}"
    {{#unless this.canNavigate}}
      aria-disabled="true"
      data-tooltip="This step will unlock after current step"
    {{/unless}}>
```

**Phase 5B: Future Step Messaging**

Add explanatory tooltip for future steps:
```hbs
{{#unless this.canNavigate}}
  {{#if this.isNeutral}}
    data-tooltip="Available after {{previousStepName}}"
  {{else if this.isConditional}}
    data-tooltip="Unlocked by: {{this.descriptor.unlockReason}}"
  {{/if}}
{{/unless}}
```

**Phase 5C: Color-Coding by Category**

Optional: use step category color to differentiate:
```hbs
<li class="prog-step prog-step--category-{{this.descriptor.category}} ..."
```

CSS:
```css
.prog-step--category-identity { --step-color: #ff6b6b; }
.prog-step--category-grants { --step-color: #ffd93d; }
.prog-step--category-abilities { --step-color: #6bcf7f; }
```

---

## PHASE 6: INLINE PREREQUISITE/INVALIDATION EXPLANATIONS

### Current State

**What works:**
- Feat work surface shows prerequisite line (from FeatEngine)
- Details panel can show why item is unavailable
- Engine has prerequisite/requirement data

**What's missing**:
- Not all work surfaces show prerequisite info inline
- Disabled/unavailable options don't explain why
- Talent graph shows no prerequisite messaging
- Language/skill restrictions not clearly labeled
- Invalidated selections not explained

### Findings

1. **Where prerequisites should appear**:
   - Feat work surface: ✓ shows prereq line
   - Talent graph: ✗ no prereq messaging
   - Languages: ✗ no restriction messaging
   - Skills: ✗ no competition messaging
   - Species: ✗ no near-human/subtype messaging

2. **Current explanation sources**:
   - FeatEngine provides prerequisiteLine
   - AbilityEngine can evaluate acquisition
   - TalentEngine knows tree requirements
   - Engine rules know slot restrictions

3. **Silent failures**:
   - Talent node grayed out but no explanation
   - Language option missing but no guidance
   - Skill already trained but not clearly marked

### Implementation Plan

**Phase 6A: Prerequisite Messaging Pattern**

Standardized inline explanation format:
```
❌ [Icon] Requires [Prerequisite Name]

Example:
❌ Requires Force Sensitivity
❌ Requires Jedi Class
❌ Requires Level 5+
❌ No language slots remaining
```

**Phase 6B: Talent Graph Enhancement**

In talent-tree-graph.hbs, add prerequisite messaging:
```hbs
{{#each nodeStates as |state nodeId|}}
  <div class="talent-node {{#unless state.legal}}is-disabled{{/unless}}"
       data-talent-id="{{nodeId}}">
    <span class="talent-name">{{node.name}}</span>
    {{#unless state.legal}}
      <div class="talent-prereq-blocked">
        {{#if state.blockedReason}}
          <i class="fas fa-lock-alt"></i>
          {{state.blockedReason}}
        {{/if}}
      </div>
    {{/unless}}
  </div>
{{/each}}
```

Modify TalentStep._getTreeGraphData() to include:
```javascript
nodeStates[nodeId] = {
  legal: isLegal,
  owned: isOwned,
  selected: isSelected,
  // NEW:
  blockedReason: isLegal ? null : await this._getBlockedReason(talent),
};
```

**Phase 6C: Language Restrictions**

Language work surface shows why slots unavailable:
```hbs
{{#if languages.remainingSlots === 0}}
  <div class="prog-message prog-message--info">
    ℹ️ You have filled all available language slots.
    {{#if languages.couldAddMore}}
      {{languages.nextSlotLevel}} characters can learn more languages.
    {{/if}}
  </div>
{{/if}}
```

**Phase 6D: Skill Restrictions**

Skills step shows training limit:
```hbs
{{#if skills.trainingLimit}}
  <div class="prog-message prog-message--info">
    You can train {{skills.trainingLimit}} skills total.
    {{skills.trained.length}} / {{skills.trainingLimit}} trained.
  </div>
{{/if}}
```

---

## PHASE 7: SELECTION CONFIDENCE FEEDBACK

### Current State

**What works:**
- Feat work surface shows checkmark (✔) for selected feats
- Summary shows selected items with checkmark icons
- Visual feedback on focus vs selected states

**What's missing**:
- No subtle animation/confirmation when item selected
- No visual diff between focused and committed
- No "success" feedback after committing choice
- Unclear if click succeeded or needs retry

### Findings

1. **Current feedback mechanisms**:
   - CSS classes: `.selected`, `.focused`
   - Icons: ✔ for selected items
   - Details panel updates on focus

2. **Missing mechanisms**:
   - No toast/banner on successful commit
   - No animation when selection confirmed
   - No "you selected X" acknowledgment

3. **Accessibility**: Focus/selection distinction not clear to assistive tech
   - No `aria-selected` or `aria-current`
   - Screen reader can't distinguish focused from selected

### Implementation Plan

**Phase 7A: Subtle Selection Animation**

CSS enhancement for select/commit:
```css
.feat-item.selected {
  animation: selectPulse 0.3s ease-out;
  box-shadow: inset 0 0 8px rgba(107, 199, 127, 0.3);
}

@keyframes selectPulse {
  0% { box-shadow: inset 0 0 0 transparent; }
  100% { box-shadow: inset 0 0 8px rgba(107, 199, 127, 0.3); }
}
```

**Phase 7B: Accessibility Attributes**

Template enhancement:
```hbs
<div class="feat-item {{#if this.isSelected}}selected{{/if}}"
     aria-selected="{{this.isSelected}}"
     role="option">
  {{this.name}}
</div>
```

**Phase 7C: Toast on Commit**

Optional: lightweight confirmation toast after committing:
```typescript
async _onCommitItem(event, target) {
  const itemId = target.dataset.itemId;
  const item = this._getItem(itemId);

  // Commit...
  await currentPlugin.onItemCommitted(itemId, this);

  // Show brief confirmation
  this._showFeedback(
    `✓ Selected ${item.name}`,
    'success'
  );

  // Auto-dismiss after 1.5s
  setTimeout(() => this._hideFeedback(), 1500);
}
```

But keep this restrained — no noise.

---

## PHASE 8: EMPTY/THIN STEP UX

### Current State

**What works**:
- Steps with options show grouped lists
- Empty state placeholders exist in most templates

**What's missing**:
- Empty states are generic and don't explain context
- Thin steps (very few choices) feel sparse
- No guidance on what the player should do

### Findings

1. **Common empty scenarios**:
   - **No options available**: All feats filtered out by legality
   - **No slots remaining**: Language slots full, skills trained to limit
   - **Prerequisite not met**: Can't access Force Powers without Force Sensitivity
   - **Conditional step missing**: Droid-only options when not a droid

2. **Current handling**:
   - Generic "No feats available" message
   - No contextual guidance
   - No path forward suggested

3. **Thin step problems**:
   - Single skill choice looks incomplete/broken
   - Background choice with few options feels cramped
   - Player unsure if they're missing something

### Implementation Plan

**Phase 8A: Contextual Empty State Messages**

Feat step example:
```hbs
{{#unless groupedFeats}}
  <section class="feat-group empty-state">
    <div class="empty-message">
      <i class="fa-solid fa-hexagon-exclamation"></i>
      {{#if showAll}}
        <p>You have selected all available feats.</p>
      {{else}}
        <p>No feats currently meet your prerequisites.</p>
        <p class="small">Feats must match your species, class, and current abilities.</p>
        <p class="action-hint">Try enabling <strong>Show All</strong> to see ineligible options and understand what's needed.</p>
      {{/if}}
    </div>
  </section>
{{/unless}}
```

**Phase 8B: Helper Text for Thin Steps**

If step has very few choices (≤3), add context:
```hbs
{{#if (lte totalOptions 3)}}
  <div class="prog-helper-text">
    <i class="fas fa-lightbulb"></i>
    {{stepHelperText}}
  </div>
{{/if}}
```

Step plugin provides:
```typescript
getStepData(context) {
  return {
    // ...
    stepHelperText: "Your species provides a bonus talent choice. Select wisely — talents shape your character's abilities.",
  };
}
```

**Phase 8C: Whitespace and Layout**

For thin steps, avoid giant empty surfaces:
- Use flexible width container instead of fixed-width card
- Center content vertically if very few items
- Add visual breathing room without dead space

---

## PHASE 9: SUMMARY AS CONTROL CENTER

### Current State

**What works**:
- Summary reviews all selections
- Shows name input and level slider
- Lists attributes, skills, feats, talents
- Notes about datapad registration

**What's missing**:
- No grouping of issues (errors vs warnings vs ready)
- No jump-back links to problem steps
- No indication of change since last review
- No finalization readiness summary
- Silent failures not surfaced

### Findings

1. **Current summary structure**:
   - Left: Character identity card (name, level, species, class)
   - Center: Full progression review
   - Right: (In normal mode) action buttons

2. **Missing elements**:
   - Issue summary at top (errors, warnings, info)
   - Jump links back to problem steps
   - Finalization readiness check
   - Change log (what changed since last save)

3. **Data available**:
   - `stepProgress` from shell has status for all steps
   - Invalid steps can be identified
   - Blocking issues are known
   - Projection shows finalization-ready state

### Implementation Plan

**Phase 9A: Issue Summary Section**

Top of summary adds grouped issues:
```hbs
{{#if anyIssues}}
  <div class="prog-summary-issues">

    {{#if blockingIssues.length}}
      <div class="prog-issue-group prog-issue-group--error">
        <h4><i class="fas fa-exclamation-circle"></i> Issues ({{blockingIssues.length}})</h4>
        <ul class="prog-issue-list">
          {{#each blockingIssues}}
            <li>
              <span class="prog-issue-text">{{this.message}}</span>
              <a class="prog-jump-link" data-step-id="{{this.stepId}}" data-action="jump-step">
                Go to {{this.stepLabel}}
              </a>
            </li>
          {{/each}}
        </ul>
      </div>
    {{/if}}

    {{#if cautionIssues.length}}
      <div class="prog-issue-group prog-issue-group--warning">
        <h4><i class="fas fa-exclamation-triangle"></i> Needs Review ({{cautionIssues.length}})</h4>
        <ul class="prog-issue-list">
          {{#each cautionIssues}}
            <li>
              <span class="prog-issue-text">{{this.message}}</span>
              <a class="prog-jump-link" data-step-id="{{this.stepId}}" data-action="jump-step">
                Review {{this.stepLabel}}
              </a>
            </li>
          {{/each}}
        </ul>
      </div>
    {{/if}}

  </div>
{{/if}}
```

**Phase 9B: Finalization Readiness**

Below issue summary, show readiness state:
```hbs
<div class="prog-readiness-panel">
  {{#if readinessSummary.isReady}}
    <div class="prog-readiness--ready">
      <i class="fas fa-check-circle"></i>
      <strong>Ready to Finalize</strong>
      <p>All required selections complete. Click Confirm to create your character.</p>
    </div>
  {{else}}
    <div class="prog-readiness--not-ready">
      <i class="fas fa-hourglass-half"></i>
      <strong>Not Yet Ready</strong>
      <p>{{readinessSummary.blockedBy}} before you can finalize.</p>
    </div>
  {{/if}}
</div>
```

**Phase 9C: Change Awareness**

If implementation includes change tracking, show what changed:
```hbs
{{#if changesSinceLast.length}}
  <div class="prog-changes-banner">
    <i class="fas fa-history"></i>
    <strong>Recent Changes:</strong>
    <ul>
      {{#each changesSinceLast}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
{{/if}}
```

**Phase 9D: Summary Data Collection**

SummaryStep.getStepData() computes:
```javascript
// Identify invalid steps
const invalidSteps = stepProgress.filter(s =>
  s.status === 'error' || s.status === 'caution'
);

const blockingIssues = invalidSteps
  .filter(s => s.status === 'error')
  .map(s => ({
    message: s.errors?.[0] || 'Unknown issue',
    stepId: s.descriptor.stepId,
    stepLabel: s.descriptor.label,
  }));

const cautionIssues = invalidSteps
  .filter(s => s.status === 'caution')
  .map(s => ({
    message: s.warnings?.[0] || 'Needs review',
    stepId: s.descriptor.stepId,
    stepLabel: s.descriptor.label,
  }));

return {
  summary: this._summary,
  issuesData: {
    blockingIssues,
    cautionIssues,
    anyIssues: blockingIssues.length > 0 || cautionIssues.length > 0,
  },
  readinessSummary: {
    isReady: blockingIssues.length === 0 && this._characterName,
    blockedBy: blockingIssues.length > 0
      ? `Resolve ${blockingIssues.length} issue(s)`
      : 'Enter character name',
  },
};
```

---

## PHASE 10: REVERSIBILITY/SAFETY MESSAGING

### Current State

**What works**:
- Back button always available (except first step)
- Can return to any previous step
- Selections don't finalize until confirm

**What's missing**:
- No reassurance text that edits are safe
- No explanation of reversibility
- Player might fear "locking in" choices prematurely

### Findings

1. **Reversibility guarantees**:
   - All steps except Confirm can be revisited
   - Changes to earlier steps invalidate later (correctly)
   - No permanent consequences until final confirmation

2. **Player uncertainty**:
   - Might worry that committing a feat locks it in
   - Might fear that changing class later breaks feats
   - Not clear that summary is not final

3. **Safe design patterns**:
   - Make edit affordances obvious
   - Show reassurance messages sparingly
   - Avoid false urgency

### Implementation Plan

**Phase 10A: Initial Reassurance (Intro)**

Intro step or splash screen:
```
You are building a character. Feel free to explore,
change your mind, and go back. Nothing is finalized
until you click Confirm at the very end.
```

**Phase 10B: Mid-Journey Reassurance (Conditional)**

If player seems uncertain (back + forth navigation), show:
```
💡 Tip: You can change any earlier selection by clicking
the step in the progress bar. Going back will update
dependent choices automatically.
```

But only show once, and never spam.

**Phase 10C: Summary Reassurance**

Summary step intro:
```
Review your character before finalizing. You can still
go back and make changes. Click Confirm only when you're
ready to create your character.
```

---

## PHASE 11: LIVE CHARACTER PREVIEW PANEL

### Current State

**Architecture**: ProgressionShell has 3 main columns:
- Left: Summary panel (step-specific summaries)
- Center: Work surface (step interaction)
- Right: Details panel (focused item details)

**Current usage**:
- Left: Empty most of time (step can render summaries but rarely does)
- Center: Always filled with work surface
- Right: Empty when no focused item

### Findings

1. **Opportunity**: Left panel is largely empty
   - Could show live preview of character build
   - Not essential to progression, but nice-to-have
   - Requires ProjectionEngine to compute live state

2. **Feasibility**: Projection already exists
   - `progressionSession.currentProjection` available
   - Shows derived character stats (attributes, skills, hp, etc.)
   - Updates as user makes selections

3. **Risks**:
   - Projection computation might be slow on every render
   - Preview might distract from focus
   - Extra rendering could destabilize layout

### Implementation Plan

**Phase 11A: Lightweight Character Card Preview**

If feasible, render summary in left panel:
```hbs
{{#if currentProjection}}
  <div class="prog-live-preview">
    <h3 class="prog-preview-title">Character Preview</h3>
    <div class="prog-preview-card">
      <div class="preview-identity">
        <span class="preview-species">{{currentProjection.identity.species}}</span>
        <span class="preview-class">{{currentProjection.identity.class}}</span>
      </div>
      <div class="preview-level">
        <span class="preview-label">Level</span>
        <span class="preview-value">{{currentProjection.level}}</span>
      </div>
      <div class="preview-attributes">
        {{#each currentProjection.attributes}}
          <div class="preview-attr">
            <span class="attr-name">{{capitalize @key}}</span>
            <span class="attr-value">{{this.total}}</span>
          </div>
        {{/each}}
      </div>
      <div class="preview-grants">
        <span class="preview-label">Key Grants</span>
        <ul>
          {{#each currentProjection.majorGrants}}
            <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
    </div>
  </div>
{{/if}}
```

**Phase 11B: Performance Optimization**

Only compute projection when explicitly needed:
```javascript
// In shell
if (this.showLivePreview) {
  if (!this.progressionSession.currentProjection) {
    this.progressionSession.currentProjection =
      ProjectionEngine.buildProjection(
        this.progressionSession,
        this.actor
      );
  }
}
```

Cache and invalidate on selection change.

**Phase 11C: Alternative: Defer Implementation**

If performance concerns:
- Use placeholder mockup
- Document recommended architecture
- Defer to post-1.0 polish phase

---

## PHASE 12: AUDIT SUMMARY

### What Will Be Implemented (Priority Order)

**Phase 1** (HIGH): Orientation
- Step X of Y context in work surface
- Helper text for empty/thin steps

**Phase 2** (HIGH): Micro-progress
- Remaining selection counts
- Complete badges
- Consistent progress labeling

**Phase 3** (HIGH): Next blocker messaging
- Specific action-oriented messages
- What's needed to continue

**Phase 5** (MEDIUM): Rail click affordances
- Cursor feedback (pointer for clickable)
- Tooltip for future steps
- `aria-disabled` for non-clickable

**Phase 6** (MEDIUM): Prerequisite messaging
- Explain why selection unavailable
- Inline explanations

**Phase 9** (MEDIUM): Summary control center
- Issue grouping
- Jump-back links
- Finalization readiness

**Phase 4** (LOW): Change feedback (defer to dependency graph)
- Unlock/hide messaging
- Downstream invalidation feedback

**Phase 7** (LOW): Selection confidence
- Subtle animations
- Aria-selected attributes

**Phase 8** (LOW): Empty state guidance
- Contextual messages
- Helper text

**Phase 10** (NICE-TO-HAVE): Safety messaging
- Reversibility reassurance
- Sparingly shown

**Phase 11** (NICE-TO-HAVE): Live preview
- Defer if performance issues
- Depends on ProjectionEngine performance

---

## KEY IMPLEMENTATION PRINCIPLES

1. **Read from authoritative state only**
   - `this.steps` → active step list
   - `this.currentStepIndex` → current position
   - `progressionSession.draftSelections` → selections
   - `_evaluateStepStatus()` → canonical status
   - Step plugins → validation/blocking

2. **Surface data to templates via context**
   - Pass stepContext, progress, issues to step templates
   - Don't compute in templates
   - Don't hardcode counts/labels

3. **Use consistent patterns across steps**
   - Same progress naming ("X of Y", "X remaining")
   - Same prerequisite explanation format
   - Same empty state structure

4. **Keep messaging concise and specific**
   - "Select a species" not "Required field"
   - "1 feat remaining" not "Incomplete"
   - "Requires Force Sensitivity" not "Invalid"

5. **Maintain accessibility**
   - Add aria attributes for state
   - Use semantic HTML
   - Support keyboard navigation
   - Don't hide critical info behind hover

6. **Avoid noise and spam**
   - One message per state transition
   - Auto-dismiss feedback after 3-4 seconds
   - Don't repeat same message multiple times
   - Let player control visibility (collapsible sections)

---

## FILES TO MODIFY

**Core Shell**:
- `scripts/apps/progression-framework/shell/progression-shell.js` — add stepContext, feedback UI
- `templates/apps/progression-framework/progression-shell.hbs` — add feedback banner region

**Progress Rail**:
- `scripts/apps/progression-framework/shell/progress-rail.js`
- `templates/apps/progression-framework/progress-rail.hbs` — add tooltips, cursor feedback

**Step Templates**:
- `templates/apps/progression-framework/steps/feat-work-surface.hbs` — micro-progress
- `templates/apps/progression-framework/steps/talent-tree-*.hbs` — prerequisite messaging
- `templates/apps/progression-framework/steps/language-work-surface.hbs` — slot explanations
- `templates/apps/progression-framework/steps/skill-work-surface.hbs` — training limit messaging
- `templates/apps/progression-framework/steps/summary-work-surface.hbs` — issue grouping, readiness

**Step Plugins**:
- All step plugins' `getStepData()` methods — add context/progress/issues
- All step plugins' `getBlockingIssues()` methods — make specific/actionable

**Footer**:
- `scripts/apps/progression-framework/shell/action-footer.js` — add blocker reason
- `templates/apps/progression-framework/progression-shell.hbs` (footer region) — add tooltip

**CSS**:
- `styles/apps/progression-framework/progression-shell.scss` — feedback styles, hover states
- `styles/apps/progression-framework/progress-rail.scss` — cursor, tooltip, affordances
- `styles/apps/progression-framework/steps.scss` — animation, selection feedback

---

## ACCEPTANCE CRITERIA

✓ Player always knows current step and total active steps
✓ Player can see what remains in actionable steps (micro-progress)
✓ If Next is blocked, the reason is clearly shown near navigation
✓ Dynamic state changes surface feedback (unlock/hide/invalidate)
✓ Rail clearly indicates what is clickable vs what is future
✓ Invalid/unavailable choices explain why
✓ Summary acts as a useful review/finalization hub
✓ UX remains calm, readable, grounded in canonical state
✓ No stale counts, ghost states, or duplicated validation logic
✓ All messaging comes from authoritative progression sources
