# PHASE 5C IMPLEMENTATION SPECIFICATION
## Migration Resilience & Repair Hardening

**Status:** SPECIFICATION (Ready for implementation)
**Prerequisite:** Phase 5B Complete
**Objectives:** Self-auditing, repair-capable, migration-safe

---

## 🎯 Phase 5C Objective

Transform the system from enforced → self-healing.

**Before 5C:**
- System detects violations
- System enforces policy
- User must manually fix

**After 5C:**
- System audits world state
- System proposes repairs
- User approves & applies via ActorEngine
- System self-corrects on migration

---

## 🧱 PHASE 5C STRUCTURE

### 5C-1 — WorldIntegritySweep (Read-Only Audit)

**Location:** `scripts/engine/integrity/WorldIntegritySweep.js`

**Purpose:** Full-world legality verification (no mutation)

**API:**
```javascript
class WorldIntegritySweep {
  /**
   * Run full-world integrity sweep
   * @param {Object} options
   *   { includeNPCs: boolean }
   * @returns {SweepReport}
   */
  static async run(options = {}) {
    // Iterate all world actors
    // Call IntegrityChecker.evaluate(actor) for each
    // Aggregate violation statistics
    // Return summary (no mutations)
  }
}
```

**SweepReport Contract:**
```javascript
{
  actorCount: number,
  actorsScanned: number,
  actorsWithViolations: number,

  violations: [
    {
      actorId: string,
      actorName: string,
      violationCount: number,
      severities: {
        warning: number,
        error: number,
        structural: number
      },
      topViolations: [
        { itemName, severity, reason }
      ]
    }
  ],

  summary: {
    totalViolations: number,
    totalStructural: number,
    totalError: number,
    totalWarning: number,
    percentWithIssues: number
  },

  timestamp: number,
  elapsedMs: number
}
```

**Behavior:**
- Read-only operation
- No mutations
- No ActorEngine calls
- Report only
- Can be run anytime

**Trigger Points:**
- Manual GM button
- System ready (if version changed)
- Post-migration
- Scheduled diagnostic

**Implementation Notes:**
- Use PrerequisiteIntegrityChecker.getSnapshot()
- Don't call evaluate() unless needed
- Filter by actor type (player/npc/companion)
- Exclude non-living actors (items, objects)

---

### 5C-2 — MigrationIntegrityAdapter (Post-Migration Check)

**Location:** `scripts/engine/migration/MigrationIntegrityAdapter.js`

**Purpose:** Ensure system upgrades never silently corrupt

**API:**
```javascript
class MigrationIntegrityAdapter {
  /**
   * Run post-migration integrity check
   * @returns {MigrationReport}
   */
  static async validatePostMigration() {
    // Check if system version changed
    // If changed: run WorldIntegritySweep
    // If violations found: notify GM
    // Return report
  }

  /**
   * Check system version
   * @returns {boolean}
   */
  static async hasVersionChanged() {
    const stored = game.settings.get('foundryvtt-swse', 'lastSystemVersion');
    return stored !== game.system.version;
  }
}
```

**MigrationReport Contract:**
```javascript
{
  versionChanged: boolean,
  oldVersion: string,
  newVersion: string,

  // If version changed:
  sweep?: SweepReport,

  // GM notification
  requiresAttention: boolean,
  message: string,

  timestamp: number
}
```

**Integration Points:**
```javascript
// In Hooks.once('ready'):
Hooks.once('ready', async () => {
  const report = await MigrationIntegrityAdapter.validatePostMigration();
  if (report.requiresAttention) {
    ui.notifications.warn(`[SWSE] Integrity issues detected. Check console.`);
    console.warn('[5C-2] Migration Integrity Report:', report);
  }
});
```

**Behavior:**
- Non-blocking
- Advisory notifications
- Logs to console
- Provides link to repair panel
- No auto-mutations

---

### 5C-3 — ActorRepairEngine (Deterministic Analysis)

**Location:** `scripts/engine/repair/ActorRepairEngine.js`

**Purpose:** Analyze violations and propose repairs (analysis only)

**API:**
```javascript
class ActorRepairEngine {
  /**
   * Analyze actor for repair opportunities
   * @param {Actor} actor
   * @returns {RepairAnalysis}
   */
  static analyze(actor) {
    // Get actor violations
    // For each violation: propose repair
    // Return proposals (deterministic)
  }

  /**
   * Propose specific repair
   * @param {Actor} actor
   * @param {Object} violation
   * @returns {RepairProposal}
   */
  static proposeRepair(actor, violation) {
    // Analyze violation type
    // Generate repair options
    // Return best proposal
  }
}
```

**RepairAnalysis Contract:**
```javascript
{
  actor: { id, name, type },

  violations: [
    {
      itemId: string,
      itemName: string,
      severity: 'warning' | 'error' | 'structural',
      missingPrereqs: string[],
      reason: string
    }
  ],

  proposals: [
    {
      id: string,
      priority: 'critical' | 'high' | 'medium' | 'low',
      type: 'removeItem' | 'suggestAcquisition' | 'classAdjustment',

      // For removeItem:
      itemId?: string,
      itemName?: string,
      reason?: string,

      // For suggestAcquisition:
      candidateId?: string,
      candidateName?: string,
      impact?: string,

      // For classAdjustment:
      details?: object,

      executionCost?: number // effort estimate
    }
  ],

  summary: {
    totalViolations: number,
    repairableCount: number,
    repairComplexity: 'simple' | 'moderate' | 'complex'
  },

  timestamp: number
}
```

**Proposal Types:**

**1. removeItem**
```javascript
{
  type: 'removeItem',
  itemId: 'feat-001',
  itemName: 'Exotic Feat',
  reason: 'Incompatible with current class',
  priority: 'critical'
}
// Action: Remove item from actor
```

**2. suggestAcquisition**
```javascript
{
  type: 'suggestAcquisition',
  candidateId: 'feat-prereq-001',
  candidateName: 'Basic Attack Feat',
  reason: 'Required by Exotic Feat',
  priority: 'high',
  impact: 'Enables other 3 feats'
}
// Action: Suggest acquiring feat (via SuggestionEngine)
```

**3. classAdjustment**
```javascript
{
  type: 'classAdjustment',
  details: {
    currentClass: 'Jedi',
    adjustedClass: 'Scoundrel'
  },
  reason: 'Class change resolves 5 violations',
  priority: 'critical'
}
// Action: Suggest class change (complex, manual review)
```

**Constraints:**
- Must NOT mutate actor
- Must NOT call ActorEngine
- Must call IntegrityChecker.evaluate()
- Must call SuggestionEngine for acquisition proposals
- Must NOT interpret raw prerequisite schema
- Proposals must be deterministic (same input = same output)

**Implementation Pattern:**
```javascript
static analyze(actor) {
  const violations = MissingPrereqsTracker.getMissingPrereqs(actor);
  const proposals = [];

  for (const violation of violations) {
    const proposal = this.proposeRepair(actor, violation);
    if (proposal) {
      proposals.push(proposal);
    }
  }

  return {
    actor: { id: actor.id, name: actor.name },
    violations: violations,
    proposals: proposals,
    summary: this._buildSummary(violations, proposals),
    timestamp: Date.now()
  };
}
```

---

### 5C-4 — Repair Execution Layer

**Location:** Part of ActorEngine

**Purpose:** Apply GM-approved repairs through ActorEngine

**API:**
```javascript
// Add to ActorEngine:
export const ActorEngine = {
  /**
   * Apply a repair proposal
   * @param {Actor} actor
   * @param {RepairProposal} proposal
   * @param {Object} options
   * @returns {Object} result
   */
  async applyRepair(actor, proposal, options = {}) {
    // Validate proposal
    // Build mutation from proposal
    // Call PreflightValidator
    // Apply via updateActor() if allowed
    // Return result
  }
};
```

**Repair Execution Flow:**
```
GM approves repair proposal
  ↓
Call ActorEngine.applyRepair(actor, proposal)
  ↓
Validate proposal structure
  ↓
Build mutation data from proposal
  ↓
Run PreflightValidator (9:2 gates apply!)
  ↓
  Block? → Return error
  ↓
Authorize via MutationInterceptor.setContext('repair')
  ↓
Execute mutation
  ↓
Recalculate derived
  ↓
Run IntegrityChecker (verify repair worked)
  ↓
Log to AuditTrail
  ↓
Return success with verification
```

**Error Handling:**
```javascript
try {
  const result = await ActorEngine.applyRepair(actor, proposal);
  if (result.success) {
    // Repair applied, violations resolved
  } else {
    // Repair failed governance check
    // Show GM reason
  }
} catch (err) {
  // Unexpected error during repair
  // Log and notify
}
```

**Governance Respect:**
```
Mode       Behavior
Normal     Repair required if violations
Override   Repair suggested (can ignore)
FreeBuild  Repair visible only (don't enforce)
```

---

### 5C-5 — Repair UI Panel

**Location:** `scripts/ui/repair/RepairPanel.js`

**Purpose:** UI for viewing repairs and applying them

**Features:**
1. **Integrity Status**
   - Actor name + summary
   - Violation count by severity
   - Last evaluation time

2. **Violations List**
   - Item name
   - Severity indicator
   - Missing prerequisites
   - Root cause

3. **Proposals List**
   - Proposal type (remove/suggest/adjust)
   - Priority indicator
   - Action description
   - "Apply" button per proposal

4. **Bulk Actions**
   - "Apply All Critical"
   - "Apply All"
   - "Skip All"
   - "Manual Review"

**Implementation:**
```javascript
class RepairPanel extends Application {
  async getData() {
    const actor = this.actor;
    const analysis = ActorRepairEngine.analyze(actor);

    return {
      actor: actor,
      analysis: analysis,
      canRepair: game.user.isGM,
      governance: GovernanceSystem.getPolicy(actor)
    };
  }

  activateListeners(html) {
    // "Apply Repair" buttons
    html.on('click', '[data-action="apply-proposal"]', (e) => {
      const proposalId = e.currentTarget.dataset.proposalId;
      this._applyProposal(proposalId);
    });
  }

  async _applyProposal(proposalId) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    const result = await ActorEngine.applyRepair(this.actor, proposal);
    if (result.success) {
      this.render();
    }
  }
}
```

**Constraints:**
- Never mutate directly
- Always call ActorEngine
- Show enforcement status
- Respect governance modes

---

### 5C-6 — Drift Detection (Optional)

**Location:** `scripts/engine/integrity/DriftDetector.js`

**Purpose:** Detect mutations outside ActorEngine

**Strategy:**
```javascript
class DriftDetector {
  /**
   * Compute mutation signature
   * Hash of: items, classes, levels, feats, talents
   */
  static computeSignature(actor) {
    const data = {
      items: actor.items.map(i => ({ id: i.id, name: i.name })),
      level: actor.system.level,
      class: actor.system.class,
      feats: actor.items.filter(i => i.type === 'feat').length,
      talents: actor.items.filter(i => i.type === 'talent').length
    };
    return hashObject(data);
  }

  /**
   * Store signature after mutation
   */
  static storeSignature(actor) {
    if (!actor.system.integrity) {
      actor.system.integrity = {};
    }
    actor.system.integrity.lastSignature = this.computeSignature(actor);
  }

  /**
   * Check for drift on actor access
   */
  static checkDrift(actor) {
    const stored = actor.system.integrity?.lastSignature;
    const current = this.computeSignature(actor);

    if (stored && stored !== current) {
      // Drift detected
      SWSELogger.warn('[5C-6] Drift detected on', actor.name);
      AuditTrail.logEvent(actor, 'drift-detected', { stored, current });
    }
  }
}
```

**Behavior:**
- Compute signature after each mutation
- Recompute on actor open
- If mismatch without ActorEngine context:
  - Log warning
  - Flag in audit trail
  - No auto-correction

---

## 🔒 Sovereignty Constraints

**5C MUST NOT:**
- ❌ Modify SuggestionEngine
- ❌ Modify AbilityEngine
- ❌ Modify TierResolver
- ❌ Access compendiums directly
- ❌ Interpret raw prerequisite schema
- ❌ Bypass ActorEngine
- ❌ Duplicate enforcement logic
- ❌ Embed policy decisions

**5C MUST:**
- ✅ Route all legality checks through AbilityEngine
- ✅ Route all mutations through ActorEngine
- ✅ Route all policy decisions through EnforcementPolicy
- ✅ Respect all governance modes
- ✅ Log all decisions to AuditTrail
- ✅ Use IntegrityChecker for baseline data
- ✅ Call PreflightValidator for repairs

---

## 📊 Phase 5C Deliverables

| Component | Files | LOC | Tests | Status |
|-----------|-------|-----|-------|--------|
| 5C-1 | WorldIntegritySweep | 1 | ~300 | Ready |
| 5C-2 | MigrationIntegrityAdapter | 1 | ~200 | Ready |
| 5C-3 | ActorRepairEngine | 1 | ~400 | Ready |
| 5C-4 | Repair Execution | 1 | ~100 | Ready |
| 5C-5 | Repair Panel UI | 1 | ~300 | Ready |
| 5C-6 | DriftDetector | 1 | ~200 | Optional |
| **Total** | **6** | **~1,500** | **50+** | **Ready** |

---

## 🏁 After Phase 5C

System becomes:
- ✅ **Sovereign** (Phases 1–4)
- ✅ **Intelligent** (Phase 5A)
- ✅ **Enforced** (Phase 5B)
- ✅ **Self-healing** (Phase 5C)
- ✅ **Migration-safe**
- ✅ **Drift-aware**

Enterprise-grade architecture inside Foundry VTT.

---

**Specification Status:** ✅ **COMPLETE & READY FOR IMPLEMENTATION**

