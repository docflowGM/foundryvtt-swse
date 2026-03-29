# PHASE 4: ENFORCEMENT MODES — EXPLICIT CONTRACTS

**Purpose:** One clear contract for each enforcement mode

After Phase 3, the system supports multiple enforcement levels. This document defines what each one does, guarantees, and allows.

---

## ENFORCEMENT LEVEL: SILENT

**When Used:**
- Production environment
- Game actively running

**Mutation Behavior:**
- Direct `actor.update()`: ❌ Blocked (intercepted)
- Direct `item.update()`: ❌ Blocked if owned (intercepted), ✅ Allowed if unowned
- `ActorEngine.updateActor()`: ✅ Allowed (primary path)
- Other direct mutations: ❌ Blocked

**Recomputation:**
- ✅ Always runs after ActorEngine mutations
- ❌ Does NOT run after unowned item mutations

**Integrity Checks:**
- ✅ Run after authorized mutations (observational, non-blocking)

**Sentinel/Diagnostics:**
- ❌ No logging (performance priority)
- ❌ No runtime diagnostics

**Error Handling:**
- Silent interception (no user-facing messages)
- No warnings or alerts

**Use Case:**
- Full production gameplay
- Zero diagnostic overhead

---

## ENFORCEMENT LEVEL: NORMAL

**When Used:**
- Development environment (localhost/127.0.0.1)
- Server-side testing
- Most developer scenarios

**Mutation Behavior:**
- Direct `actor.update()`: ❌ Blocked (logs warning)
- Direct `item.update()`: ❌ Blocked if owned (logs warning), ✅ Allowed if unowned
- `ActorEngine.updateActor()`: ✅ Allowed (primary path)
- Derived field writes: ❓ Warn-only (via MutationInterceptor)
- Other direct mutations: ⚠️ Logged as violations

**Recomputation:**
- ✅ Always runs after ActorEngine mutations
- ❌ Does NOT run after unowned item mutations

**Integrity Checks:**
- ✅ Run after authorized mutations
- ⚠️ Violations logged, non-blocking

**Sentinel/Diagnostics:**
- ✅ Detailed mutation logs
- ✅ Recomputation pipeline visible
- ✅ Violation tracking in Sentinel
- ✅ Performance warnings if > 100ms

**Error Handling:**
- ⚠️ Warnings logged to console
- ⚠️ Violations visible in Sentinel
- ✅ Gameplay continues despite violations

**Use Case:**
- Active development
- Debugging issues
- Testing with diagnostics enabled

---

## ENFORCEMENT LEVEL: STRICT

**When Used:**
- Dev/test mode with strict flag
- Continuous integration testing
- Governance verification
- Pre-production testing

**Mutation Behavior:**
- Direct `actor.update()`: ❌ **THROWS ERROR**
- Direct `item.update()`: ❌ **THROWS ERROR** if owned
- Derived field writes: ❌ **THROWS ERROR** outside recompute
- Skip flags: ❌ **THROWS ERROR** if set
- `ActorEngine.updateActor()`: ✅ Allowed (primary path)

**Recomputation:**
- ✅ Always runs after ActorEngine mutations
- ✅ Pipeline visible with detailed logging
- ✅ Stage-by-stage performance tracking

**Integrity Checks:**
- ✅ Run after authorized mutations
- ✅ Violations throw errors (blocking)
- ❌ Cannot bypass with _skipIntegrityCheck

**Sentinel/Diagnostics:**
- ✅ Very detailed mutation logs (5-stage pipeline)
- ✅ Computed value snapshots
- ✅ Performance timing per stage
- ✅ All violations reported with full context
- ✅ Mutation attempt tracking

**Error Handling:**
- ❌ **THROWS IMMEDIATELY** on unauthorized mutation
- ❌ **BLOCKS GAMEPLAY** on violation
- ✅ Full stack trace provided
- ✅ Error message includes caller context

**Use Case:**
- Enforcing governance contracts in tests
- CI/CD verification
- Detecting sovereignty regressions
- Pre-release validation

---

## ENFORCEMENT LEVEL: LOG_ONLY

**When Used:**
- Analysis and logging without blocking
- Profiling mutation volume
- Understanding migration behavior

**Mutation Behavior:**
- Direct `actor.update()`: ⚠️ Logged as violation
- Direct `item.update()`: ⚠️ Logged as violation if owned
- `ActorEngine.updateActor()`: ✅ Allowed
- Mutations are ALLOWED but LOGGED

**Recomputation:**
- ✅ Runs normally
- ✅ Pipeline visible

**Integrity Checks:**
- ✅ Run and logged
- ⚠️ Non-blocking

**Sentinel/Diagnostics:**
- ✅ All mutations logged
- ✅ Comprehensive audit trail
- ❌ Not meant for gameplay

**Error Handling:**
- ⚠️ Only logging; no errors thrown

**Use Case:**
- Mutation audit trails
- Understanding system behavior
- Compliance logging
- Data recovery analysis

---

## ENFORCEMENT MODE DECISION TABLE

| Scenario | Recommended Level | Why |
|----------|-------------------|-----|
| Active gameplay, production | SILENT | Zero overhead |
| Development, normal debugging | NORMAL | Warnings visible, gameplay continues |
| Governance verification | STRICT | Hard enforcement, detects violations |
| Pre-release CI/CD | STRICT | Full validation before release |
| Mutation analysis/audit | LOG_ONLY | Complete record without blocking |
| Performance profiling | SILENT or NORMAL | Avoid STRICT overhead |
| Testing new mutation surface | STRICT | Catch errors early |
| Migration/maintenance | NORMAL or LOG_ONLY | Allow operations, log violations |

---

## HOW TO ENABLE ENFORCEMENT LEVELS

### Code-Based (Test/Server)
```javascript
import { MutationInterceptor } from "...";

// Set globally for test
MutationInterceptor.setEnforcementLevel('strict');

// Set locally in test
try {
  MutationInterceptor.setEnforcementLevel('strict');
  // Test code
} finally {
  MutationInterceptor.setEnforcementLevel('normal');
}
```

### Settings-Based (Game UI)
```javascript
// Setting: foundrytt-swse > "dev-strict-enforcement"
// Automatic: localhost/127.0.0.1 defaults to STRICT
// Can be overridden via game.settings
```

### Environment Auto-Detection
- `localhost` or `127.0.0.1`: Defaults to STRICT
- Production server: Defaults to SILENT
- Can be overridden by `dev-strict-enforcement` setting

---

## MIGRATION/MAINTENANCE EXCEPTION PATH (if applicable)

**When Used:**
- One-time data migrations
- Maintenance operations
- Repair/recovery operations

**How Authorized:**
```javascript
await ActorEngine.updateActor(actor, updates, {
  isMigration: true,  // Flag for one-time op
  meta: { origin: 'migration-name' }  // Track origin
});
```

**Behavior:**
- In STRICT: ✅ Allowed (with isMigration flag)
- In NORMAL: ✅ Allowed
- In SILENT: ✅ Allowed
- HP write bypass: ✅ Allowed with flag
- Logged with migration metadata

**Constraints:**
- Must have explicit `isMigration: true` flag
- Mutations must be routed through ActorEngine, not direct
- Each operation must have documented origin
- Cannot use this path for ongoing operations

---

## FREEBUILD/OVERRIDE MODE (if exists)

**Status:** [TO BE DETERMINED BY AUDIT]

If an override mode exists, document:
- When is it available?
- What does it bypass?
- Who can use it?
- What logging occurs?

---

## COMPLIANCE & TESTING

Each mode must be tested to prove:
- [ ] Stated behavior matches actual code
- [ ] Transitions between modes work correctly
- [ ] Errors/warnings occur as documented
- [ ] Recomputation runs as expected
- [ ] Integrity checks behave as promised

---

**Last Updated:** March 29, 2026 (draft)
**Status:** Pending audit validation and completion

