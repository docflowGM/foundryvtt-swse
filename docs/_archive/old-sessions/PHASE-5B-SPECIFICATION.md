# PHASE 5B IMPLEMENTATION SPECIFICATION
## Enforcement & Governance Hardening

**Date:** February 27, 2026
**Status:** SPECIFICATION (Ready for implementation)
**Current State:** Advisory enforcement exists; Phase 5B hardens to mandatory enforcement

---

## Executive Summary

Phase 5A made the suggestion system **smart**.
Phase 5B makes the mutation system **disciplined**.

**Current State:** Post-mutation violation detection
**Target State:** Pre-mutation violation prevention + explicit governance policy

**Key Changes:**
1. Preflight validation before mutations apply
2. Governance modes enforced at mutation boundary
3. Severity levels control blocking behavior
4. Integrity dashboard exposes compliance state
5. Audit trail tracks all enforcement decisions
6. Sentinel expands to defend mutation boundaries

---

## PART 1: Enforcement Policy Layer

### 1.1 EnforcementPolicy Class

**Location:** `scripts/governance/enforcement-policy.js` (NEW)

```javascript
export class EnforcementPolicy {
  /**
   * Evaluate a proposed mutation against governance policy
   * @param {Actor} actor - The actor being mutated
   * @param {Object} mutation - The proposed mutation { operation, itemsToAdd, itemsToRemove, updates }
   * @param {Object} context - Mutation context { source, reason, triggeredBy }
   * @returns {EnforcementDecision}
   */
  static evaluate(actor, mutation, context) {
    // Returns: { allowed, severity, violations[], reason, recommended[] }
  }

  /**
   * Check if violations should block mutation (based on governance mode + severity)
   * @param {Actor} actor - The actor
   * @param {Array} violations - Violation objects
   * @returns {boolean} - true if should block
   */
  static shouldBlock(actor, violations) {
    // Logic:
    // - If NORMAL mode + error-severity violations → block
    // - If OVERRIDE/FREEBUILD mode → never block
    // - If strictEnforcement enabled + any violations → block
  }

  /**
   * Get enforcement policy for an actor
   * @returns {Object} { mode, strictEnforcement, visibilityMode }
   */
  static getPolicy(actor) {
    return {
      mode: actor.system.governance?.enforcementMode ?? 'normal',
      strictEnforcement: game.settings.get('foundryvtt-swse', 'strictEnforcement'),
      visibilityMode: actor.system.governance?.visibilityMode ?? 'banner',
      approvedBy: actor.system.governance?.approvedBy,
      reason: actor.system.governance?.reason
    };
  }
}
```

### 1.2 EnforcementDecision Contract

**Returned by EnforcementPolicy.evaluate():**

```javascript
{
  // Outcome
  allowed: boolean,           // Should mutation proceed?
  reason: string,             // Why allowed/blocked

  // Violations Found
  violations: [{
    itemId: string,
    itemName: string,
    itemType: string,
    severity: 'error' | 'warning',
    missingPrereqs: string[],
    blockingReasons: string[],
    permanentlyBlocked: boolean
  }],

  // Severity Classification
  severity: 'none' | 'warning' | 'error' | 'structural',

  // Recommendations
  recommended: [{
    action: 'remove' | 'replace' | 'acknowledge',
    item: string,
    reason: string
  }],

  // Audit Context
  detectionContext: {
    governanceMode: 'normal' | 'override' | 'freeBuild',
    strictEnforcement: boolean,
    checkedAt: timestamp,
    checkedBy: 'system' | 'preflight' | 'hook'
  }
}
```

---

## PART 2: Mutation Preflight Gate

### 2.1 PreflightValidator Class

**Location:** `scripts/governance/mutation/preflight-validator.js` (NEW)

```javascript
export class PreflightValidator {
  /**
   * Validate mutation before applying
   * Returns decision: allow | block | warn
   */
  static async validateBeforeMutation(actor, mutation, context = {}) {
    // 1. Get enforcement policy
    const policy = EnforcementPolicy.getPolicy(actor);

    // 2. Run full legality evaluation for all mutation targets
    const violations = await this._evaluateProposedMutation(actor, mutation);

    // 3. Check if violations should block
    const decision = EnforcementPolicy.evaluate(actor, mutation, { violations, ...context });

    // 4. Log for audit trail
    this._logPreflightDecision(actor, mutation, decision);

    // 5. Return decision
    return decision;
  }

  /**
   * Evaluate legality of proposed mutation
   * @private
   */
  static async _evaluateProposedMutation(actor, mutation) {
    const violations = [];

    // For add operations: check if items would be legal
    for (const item of mutation.itemsToAdd || []) {
      const evaluation = AbilityEngine.evaluateAcquisition(actor, item);
      if (!evaluation.legal) {
        violations.push({
          operation: 'add',
          item: item.name,
          ...evaluation
        });
      }
    }

    // For update operations: check if updates violate constraints
    // (e.g., setting level to -1, removing required prereqs, etc.)
    for (const [path, value] of Object.entries(mutation.updates || {})) {
      const constraint = this._getConstraintFor(path);
      if (constraint && !constraint.validate(actor, value)) {
        violations.push({
          operation: 'update',
          field: path,
          value,
          reason: constraint.reason
        });
      }
    }

    return violations;
  }

  /**
   * Get constraint validator for a field
   * @private
   */
  static _getConstraintFor(fieldPath) {
    const constraints = {
      'system.level': {
        validate: (actor, value) => value > 0 && value <= 20,
        reason: 'Level must be 1-20'
      },
      'system.species': {
        validate: (actor, value) => value && value.length > 0,
        reason: 'Species cannot be empty'
      },
      // ... more constraints
    };
    return constraints[fieldPath];
  }

  /**
   * Log preflight decision for audit trail
   * @private
   */
  static _logPreflightDecision(actor, mutation, decision) {
    const entry = {
      timestamp: Date.now(),
      actor: actor.id,
      mutation: mutation.operation,
      decision: decision.allowed ? 'ALLOWED' : 'BLOCKED',
      violations: decision.violations.length,
      reason: decision.reason
    };

    // Store in audit log (Phase 5B-6: Sentinel expansion)
    this._appendToAuditLog(entry);
  }

  static _appendToAuditLog(entry) {
    // TODO: Phase 5B-6 implementation
  }
}
```

### 2.2 Mutation Preflight Gate Flow

**Integrated into ActorEngine.updateActor():**

```javascript
static async updateActor(actor, updateData, options = {}) {
  // NEW: Phase 5B Preflight Gate
  const preflight = await PreflightValidator.validateBeforeMutation(
    actor,
    { operation: 'update', updates: updateData },
    { source: options.source, reason: options.reason }
  );

  // Check if should block
  if (!preflight.allowed) {
    const policy = EnforcementPolicy.getPolicy(actor);
    if (policy.mode === 'normal') {
      throw new Error(
        `[Phase 5B] Mutation blocked: ${preflight.reason}\n` +
        `Violations: ${preflight.violations.map(v => v.itemName).join(', ')}`
      );
    }
    // OVERRIDE/FREEBUILD: log but continue
    SWSELogger.warn(`[Phase 5B] Mutation allowed via ${policy.mode}: ${preflight.reason}`);
  }

  // Existing mutation logic
  const updates = {};
  // ... prepare updates ...
  await actor.update(updates);

  // Existing post-mutation logic
  await PrerequisiteIntegrityChecker.evaluate(actor);
}
```

---

## PART 3: Severity Levels & Escalation

### 3.1 Severity Classification

**In PrerequisiteIntegrityChecker.evaluate():**

```javascript
static async evaluate(actor) {
  // ... existing evaluation logic ...

  // Phase 5B: Classify severity for each violation
  for (const [itemId, violation] of Object.entries(violations)) {
    violation.severity = this._classifySeverity(violation);
  }

  return { violations, summary: this._summarizeSeverity(violations) };
}

static _classifySeverity(violation) {
  // error: permanent incompatibility OR 3+ missing prerequisites
  if (violation.permanentlyBlocked || violation.missingPrereqs.length >= 3) {
    return 'error';
  }

  // warning: 1-2 missing prerequisites (likely fixable)
  if (violation.missingPrereqs.length >= 1) {
    return 'warning';
  }

  // none: no violations
  return 'none';
}

static _summarizeSeverity(violations) {
  const summary = {
    total: Object.keys(violations).length,
    errors: 0,      // Blocking violations
    warnings: 0,    // Advisory violations
    structural: 0   // Class/species incompatibilities
  };

  for (const violation of Object.values(violations)) {
    if (violation.severity === 'error') summary.errors++;
    else if (violation.severity === 'warning') summary.warnings++;
    else if (violation.severity === 'structural') summary.structural++;
  }

  return summary;
}
```

### 3.2 Enforcement Escalation

**In EnforcementPolicy.shouldBlock():**

```javascript
static shouldBlock(actor, violations) {
  const policy = this.getPolicy(actor);

  // Governance Mode: FREEBUILD/OVERRIDE always allow (but track)
  if (policy.mode === 'override' || policy.mode === 'freeBuild') {
    return false;
  }

  // Governance Mode: NORMAL enforce
  if (policy.mode === 'normal') {
    // Strict enforcement: block on any violation
    if (policy.strictEnforcement) {
      return violations.length > 0;
    }

    // Normal: block on errors only
    return violations.some(v => v.severity === 'error');
  }

  return false;
}
```

---

## PART 4: Integrity Dashboard

### 4.1 IntegrityDashboard Class

**Location:** `scripts/governance/ui/integrity-dashboard.js` (NEW)

```javascript
export class IntegrityDashboard {
  /**
   * Get complete compliance state for an actor
   * @returns {DashboardState}
   */
  static getState(actor) {
    const tracker = MissingPrereqsTracker;
    const missing = tracker.getMissingPrereqs(actor);
    const checker = PrerequisiteIntegrityChecker;
    const snapshot = checker.getSnapshot(actor.id);

    return {
      // Compliance Status
      isCompliant: missing.length === 0,
      violationCount: missing.length,

      // Severity Breakdown
      errorCount: missing.filter(v => v.severity === 'error').length,
      warningCount: missing.filter(v => v.severity === 'warning').length,

      // Violations List
      violations: missing.map(v => ({
        itemId: v.itemId,
        itemName: v.itemName,
        itemType: v.itemType,
        severity: v.severity,
        missingPrereqs: v.missingPrereqs,
        detectedAt: v.detectionContext?.evaluatedAt,
        permanentlyBlocked: v.permanentlyBlocked,
        recommended: this._getRecommendations(v)
      })),

      // Governance Info
      governance: {
        mode: actor.system.governance?.enforcementMode ?? 'normal',
        approvedBy: actor.system.governance?.approvedBy,
        reason: actor.system.governance?.reason
      },

      // Timeline (Phase 5B-5: Audit Trail)
      timeline: this._getTimeline(actor),

      // Summary
      summary: {
        lastEvaluated: snapshot?.evaluatedAt,
        totalMissingPrereqs: missing.reduce((sum, v) => sum + v.missingPrereqs.length, 0),
        violationsByType: this._groupByType(missing),
        recommendedActions: this._getRecommendedActions(missing)
      }
    };
  }

  /**
   * Get remediation recommendations
   * @private
   */
  static _getRecommendations(violation) {
    if (violation.permanentlyBlocked) {
      return [{ action: 'remove', reason: 'Incompatible with current build' }];
    }

    return violation.missingPrereqs.map(prereq => ({
      action: 'acquire',
      item: prereq,
      reason: `Required prerequisite for ${violation.itemName}`
    }));
  }

  /**
   * Get audit timeline of violations
   * @private
   */
  static _getTimeline(actor) {
    // TODO: Phase 5B-6 implementation (audit trail storage)
    return [];
  }

  static _groupByType(violations) {
    const groups = {};
    for (const v of violations) {
      groups[v.itemType] = (groups[v.itemType] || 0) + 1;
    }
    return groups;
  }

  static _getRecommendedActions(violations) {
    const actions = new Set();
    for (const v of violations) {
      if (v.severity === 'error') {
        actions.add('remove-incompatible');
      } else if (v.severity === 'warning') {
        actions.add('acquire-prerequisites');
      }
    }
    return Array.from(actions);
  }
}
```

### 4.2 DashboardState Contract

```javascript
{
  // Compliance Status
  isCompliant: boolean,
  violationCount: number,

  // Severity Breakdown
  errorCount: number,      // Blocking violations
  warningCount: number,    // Advisory violations

  // Detailed Violations
  violations: [{
    itemId: string,
    itemName: string,
    itemType: string,
    severity: 'error' | 'warning',
    missingPrereqs: string[],
    detectedAt: timestamp,
    permanentlyBlocked: boolean,
    recommended: [{
      action: 'remove' | 'acquire',
      item: string,
      reason: string
    }]
  }],

  // Governance Context
  governance: {
    mode: 'normal' | 'override' | 'freeBuild',
    approvedBy: userId,
    reason: string
  },

  // Audit Trail (Phase 5B-6)
  timeline: [{
    timestamp: number,
    event: 'violated' | 'resolved' | 'approved' | 'changed',
    item: string,
    actor: string,
    reason: string
  }],

  // Summary
  summary: {
    lastEvaluated: timestamp,
    totalMissingPrereqs: number,
    violationsByType: { feat: n, talent: n, ... },
    recommendedActions: string[]
  }
}
```

---

## PART 5: Strict Enforcement Toggle

### 5.1 System Setting

**Add to game.settings:**

```javascript
game.settings.register('foundryvtt-swse', 'strictEnforcement', {
  name: 'Strict Prerequisite Enforcement',
  hint: 'When enabled, ANY violation (even warnings) will block mutations in NORMAL governance mode',
  scope: 'world',
  config: true,
  type: Boolean,
  default: false,
  requiresReload: true,
  onChange: (value) => {
    SWSELogger.log(`[Phase 5B] Strict enforcement ${value ? 'ENABLED' : 'DISABLED'}`);
  }
});
```

### 5.2 Behavior

| Setting | Mode | Behavior |
|---------|------|----------|
| OFF | NORMAL | Error violations block; warnings allowed |
| OFF | OVERRIDE/FREEBUILD | All violations allowed (with tracking) |
| ON | NORMAL | ANY violation blocks |
| ON | OVERRIDE/FREEBUILD | Same as OFF (mode is ultimate authority) |

---

## PART 6: Sentinel Expansion (Mutation Boundary Defense)

### 6.1 Enhanced Sentinel

**Location:** `scripts/core/swse-sentinel.js` (expand)

```javascript
export class SWSESentinel {
  /**
   * Expand monitoring to mutation boundaries
   */
  static expandForMutationDefense() {
    // 1. Monitor MutationInterceptor usage
    this._monitorMutationContext();

    // 2. Detect macro-based direct mutations
    this._monitorMacroMutations();

    // 3. Detect direct system writes
    this._monitorDirectSystemWrites();

    // 4. Validate mutation authorization
    this._validateMutationAuthorization();
  }

  /**
   * Monitor MutationInterceptor for proper context
   * @private
   */
  static _monitorMutationContext() {
    const original = ActorDocument.prototype.update;

    ActorDocument.prototype.update = async function(updateData, options) {
      const context = MutationInterceptor._getCurrentContext();

      if (globalThis.SWSE_DEV_MODE) {
        if (!context) {
          console.warn(
            `[SENTINEL] ⚠️  Actor.update() called without MutationInterceptor context\n` +
            `Stack: ${new Error().stack}`
          );
        }
      }

      return original.call(this, updateData, options);
    };
  }

  /**
   * Detect direct mutations from macros/console
   * @private
   */
  static _monitorMacroMutations() {
    // Track if mutations originate from scripts outside governance layer
    if (globalThis.SWSE_DEV_MODE) {
      // In dev mode: log all macro mutations with stack trace
      // In prod mode: block or warn
    }
  }

  /**
   * Detect direct system field writes
   * @private
   */
  static _monitorDirectSystemWrites() {
    if (globalThis.SWSE_DEV_MODE) {
      // Monitor actor.system property writes
      // Check if they bypass ActorEngine
    }
  }

  /**
   * Validate mutation authorization
   * @private
   */
  static _validateMutationAuthorization() {
    // Ensure only ActorEngine sets MutationInterceptor context
    // Prevent permission escalation attempts
  }
}
```

---

## PART 7: Implementation Roadmap

### Phase 5B-1: EnforcementPolicy (Foundation)
- [ ] Create EnforcementPolicy class
- [ ] Define EnforcementDecision contract
- [ ] Implement policy evaluation logic
- [ ] Add system setting for strictEnforcement

### Phase 5B-2: PreflightValidator (Gating)
- [ ] Create PreflightValidator class
- [ ] Integrate into ActorEngine.updateActor()
- [ ] Implement constraint validation
- [ ] Add constraint definitions for key fields

### Phase 5B-3: Severity Levels (Classification)
- [ ] Update PrerequisiteIntegrityChecker with severity classification
- [ ] Implement _classifySeverity()
- [ ] Update violation tracking to include severity
- [ ] Update UI to show severity indicators

### Phase 5B-4: IntegrityDashboard (Visibility)
- [ ] Create IntegrityDashboard class
- [ ] Implement getState() method
- [ ] Add recommendation logic
- [ ] Update UI components to use dashboard state

### Phase 5B-5: Audit Trail (Governance History)
- [ ] Define audit log schema
- [ ] Implement timestamp tracking for violations
- [ ] Create audit trail storage (actor.system.auditLog)
- [ ] Add timeline to integrity dashboard

### Phase 5B-6: Sentinel Expansion (Mutation Defense)
- [ ] Expand SWSESentinel for mutation boundaries
- [ ] Monitor MutationInterceptor usage
- [ ] Detect unauthorized mutations
- [ ] Add self-defending enforcement

---

## PART 8: Success Criteria

### Enforcement Hardening
- [ ] Preflight validation runs before mutations
- [ ] Violations can block mutations in NORMAL mode
- [ ] strictEnforcement toggle works correctly
- [ ] OVERRIDE/FREEBUILD modes bypass enforcement
- [ ] All enforcement decisions are logged

### Governance Consistency
- [ ] Governance modes enforced at mutation boundary
- [ ] Violations never bypass AbilityEngine authority
- [ ] Legality is deterministic (same inputs = same decision)
- [ ] No mutations create inconsistent state

### Visibility & Auditability
- [ ] IntegrityDashboard shows complete compliance state
- [ ] Severity levels guide UI presentation
- [ ] Recommendations help GMs fix violations
- [ ] Audit trail tracks all enforcement decisions
- [ ] Timeline shows violation lifecycle

### Mutation Boundary Defense
- [ ] MutationInterceptor context always validated
- [ ] Macro mutations are logged/blocked
- [ ] Direct system writes are detected
- [ ] No unauthorized mutations possible

---

## PART 9: Breaking Changes

**For External Code:**

1. **ActorEngine.updateActor()** now throws if violations block mutation
   - External code must catch and handle
   - OR apply through OVERRIDE/FREEBUILD mode

2. **PreflightValidator.validateBeforeMutation()** is now mandatory
   - Should be called before mutations
   - Can be bypassed via MutationInterceptor.setContext() (legacy)

3. **Integrity tracking** now includes severity
   - Existing code reading violations needs severity handling
   - Dashboard state replaces direct missingPrerequisites reads

---

## PART 10: Rollback Plan

If Phase 5B implementation causes issues:

1. **Disable strict enforcement:** Set strictEnforcement to false
2. **Temporarily disable preflight:** Comment out preflight gate in ActorEngine
3. **Revert to advisory-only:** Override EnforcementPolicy to never block

All changes are non-destructive (no data deletion).

---

## CONCLUSION

Phase 5B transforms enforcement from **advisory** to **mandatory**.

**Before 5B:** System detects violations, users can ignore them
**After 5B:** System prevents violations from being created

This ensures that once the suggestion system guides players correctly (5A), the enforcement system prevents them from making mistakes (5B).

**Next Phase:** Phase 5C - World Sweep & Repair (fix any existing violations in campaigns)

---

**Specification Date:** February 27, 2026
**Status:** READY FOR IMPLEMENTATION
**Implementation Sequence:** 5B-1 → 5B-2 → 5B-3 → 5B-4 → 5B-5 → 5B-6

