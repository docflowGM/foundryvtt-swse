# SSOT MUTATION SOVEREIGNTY BUCKET AUDIT
**Comprehensive Governance Scan — March 30, 2026**

---

## 1. BUCKET SCAN SUMMARY

### BUCKET 1 — PRIMARY AUTHORITY LAYER
**Status:** ✅ **STRONG**
- **Enforcement:** ActorEngine + MutationInterceptor fully implemented
- **Authority Points:**
  - ActorEngine.updateActor() (line 324)
  - ActorEngine.updateEmbeddedDocuments() (line 430)
  - ActorEngine.createEmbeddedDocuments() (line ~500)
  - ActorEngine.deleteEmbeddedDocuments() (line ~550)
- **Protection:** HP.max write gate (line 376-382)
- **Diagnostics:** GovernanceDiagnostics integrated (MutationInterceptor line 137)
- **Enforcement Levels:** STRICT/NORMAL/SILENT properly configured
- **Findings:** 0 violations, authority layer is clean
- **Next Action:** MAINTAIN — This is solid

### BUCKET 2 — APPROVED WRAPPERS / THIN ROUTERS
**Status:** ✅ **STRONG**
- **Key Files:**
  - actor-utils.js: applyActorUpdateAtomic (line 80) — routes through ActorEngine
  - document-api-v13.js: Foundry v13+ compatibility layer
- **Routing Verification:**
  - All wrappers preserve ActorEngine context
  - Comments accurately document delegation
  - No fallback patterns detected
- **Findings:** 0 violations
- **Next Action:** MAINTAIN — Wrappers are honest

### BUCKET 3 — UI MUTATION SURFACES
**Status:** ✅ **CLEAN**
- **Verified Compliant:**
  - inventory-handlers.js (line 35-60): Routes through actor.updateOwnedItem()
  - weapon-config-dialog.js (line 160-200): Routes through actor.updateOwnedItem() with parent validation
  - action-palette.js (line 276): Token creation (not actor mutations)
  - All other UI files checked: No direct actor.update() calls
- **Finding Count:** 0 violations in UI layer
- **Status Change:** Fixed in Phase 5 closure pass
- **Next Action:** MAINTAIN — All UI flows now properly routed

### BUCKET 4 — HOOKS / AUTOMATION / REACTIVE FLOWS
**Status:** ⚠️ **MIXED** (1 CRITICAL VIOLATION)
- **Compliant Hooks:**
  - follower-hooks.js (line 74): Uses ActorEngine.updateActor() ✅
  - actor-hooks.js: Uses ActorEngine routing ✅
  - force-domain-lifecycle.js: Compliant ✅
- **VIOLATION FOUND:**
  - **follower-creator.js (line 816-821):**
    ```javascript
    await follower.update({
      'system.level': ownerLevel,
      'system.baseAttackBonus': newBAB,
      'system.hp.max': newHP,              // ❌ VIOLATION
      'system.hp.value': Math.min(...)
    });
    ```
    - Type: Direct mutation bypass (no ActorEngine)
    - Hook: swse:progression:completed (line 829)
    - Severity: **CRITICAL** — Writes protected fields outside governance
    - Would THROW in STRICT mode
    - Impact: Level-up followers bypass recomputation pipeline
  - **follower-manager.js (line 249):**
    ```javascript
    'system.hp.max': 10 + ownerLevel,      // ❌ VIOLATION
    ```
    - Type: Direct mutation, same pattern
    - Severity: **CRITICAL**
    - Impact: Updates bypasses integrity checks

- **Finding Count:** 2 critical violations in hooks
- **Next Action:** **FIX NOW** — Route through ActorEngine

### BUCKET 5 — IMPORT / MIGRATION / MAINTENANCE / REPAIR
**Status:** ✅ **CLEAN**
- **Verified Files:**
  - CharacterGenerationEngine.js: Uses ActorEngine (line 180, 195, 211) ✅
  - actor-repair-engine.js: Uses ActorEngine ✅
  - migration scripts: Proper routing ✅
- **Finding Count:** 0 violations
- **Notes:** Import/migration paths properly authorized
- **Next Action:** MAINTAIN

### BUCKET 6 — EMBEDDED DOCUMENT SURFACES
**Status:** ✅ **CLEAN**
- **Pattern:** All createEmbeddedDocuments/updateEmbeddedDocuments routed through ActorEngine
- **Verified:**
  - CharacterGenerationEngine: ActorEngine.createEmbeddedDocuments() (line 195, 211) ✅
  - swse-vehicle-core.js: ActorEngine methods ✅
  - chargen files: All use ActorEngine routing ✅
- **Finding Count:** 0 violations in authorization layer
- **Next Action:** MAINTAIN

### BUCKET 7 — RESOURCE / DERIVED / PROTECTED FIELD SURFACES
**Status:** 🔴 **NON-COMPLIANT** (4 VIOLATIONS)

**Protected Field Writers Audit:**

1. **chargen-improved.js (line 493):**
   ```javascript
   await globalThis.SWSE.ActorEngine.updateActor(actor, {
     'system.level': newLevel,
     'system.hp.max': newHP,              // ❌ VIOLATION
     'system.hp.value': newHP
   });
   ```
   - Issue: Writes hp.max WITHOUT isRecomputeHPCall option
   - ActorEngine line 376 check WILL THROW: "HP SSOT Violation...only ActorEngine.recomputeHP() may write"
   - Severity: **CRITICAL** — Blocks in STRICT mode
   - Function: _handleLevelUp() (line 475)
   - Impact: Level-up flow broken in STRICT mode

2. **drop-handler.js (line 372-373):**
   ```javascript
   const updates = {
     'system.hp.max': chassis.system.hp || 30,        // ❌ VIOLATION
     'system.hp.value': chassis.system.hp || 30
   };
   await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
   ```
   - Issue: Same problem — missing isRecomputeHPCall flag
   - Function: handleDroidChassisDrop() (line 350)
   - Severity: **CRITICAL**
   - Impact: Droid chassis template application broken in STRICT mode

3. **follower-creator.js (line 816-821):** [DUPLICATE from BUCKET 4]
   - Direct mutation, not through ActorEngine
   - Severity: **CRITICAL**

4. **follower-manager.js (line 249):** [DUPLICATE from BUCKET 4]
   - Direct mutation, not through ActorEngine
   - Severity: **CRITICAL**

**system.derived.* Writes:**
- drop-handler.js (line 95-96): Writes system.derived.hp.max/value
  - Routed through ActorEngine.updateActor() ✅
  - But: Derived writes SHOULD be via isDerivedCalculatorCall flag
  - Medium risk: May violate ActorEngine._validateDerivedWriteAuthority() (line 182)

**Finding Count:** 4+ critical violations, 1 medium violation
**Next Action:** **FIX NOW** — All hp.max writes must use isRecomputeHPCall=true flag, or route through ActorEngine.recomputeHP()

### BUCKET 8 — TEST / DIAGNOSTIC / SENTINEL COVERAGE
**Status:** ⚠️ **FRAGILE**
- **Diagnostics Integrated:**
  - GovernanceDiagnostics.js: Created and wired ✅
  - MutationInterceptor.initialize() calls verifyGuardrails() ✅
  - Runtime verification active in STRICT mode ✅
- **Tests Implemented:**
  - tests/phase-5-governance-compliance.test.js: 29+ tests
  - But: **Tests cannot run** (module resolution errors)
  - Jest configuration exists but broken
- **Issue:** Tests are dead code — cannot execute
- **Coverage Gaps:**
  - No test covers hp.max write violations
  - No test covers follower-creator.js flows
  - No test for chargen hp.max writes
- **Finding Count:** 3 issues (test infra broken, coverage gaps)
- **Severity:** MEDIUM — Diagnostics working but tests non-functional
- **Next Action:** **FIX NEXT** — Fix Jest module resolution, ensure tests run

### BUCKET 9 — FORBIDDEN / DEPRECATED / LEGACY SURFACES
**Status:** ⚠️ **SERVICEABLE**
- **Deprecated patterns found:** 5 files
  - combat-action-browser.js: Legacy combat system (marked TODO)
  - feature-flags.js: Old feature flag system
  - holo-init.js: Bootstrap code (legacy)
- **Legacy Comments Present:** Some files contain "FIXME", "TODO remove" markers
- **Dead Code:** Minimal detected
- **Status:** Not blocking SSOT, but potential tech debt
- **Next Action:** DEFER — Clean up after SSOT closure

---

## 2. CROSS-BUCKET HOTSPOTS

### 🔴 Pattern 1: HP.MAX WRITE GOVERNANCE FAILURE
**Appears in:** Buckets 4, 7
**Files:** 4 (chargen-improved.js, drop-handler.js, follower-creator.js, follower-manager.js)
**Root Cause:** ActorEngine.updateActor() enforces hp.max protection (line 376-382):
```javascript
if (hpMaxPath && !options.isRecomputeHPCall && !options.isMigration) {
  throw new Error('[HP SSOT Violation] system.hp.max may only be written by ActorEngine.recomputeHP()...');
}
```
**Problem:** Callers don't know about this flag requirement, so they write hp.max directly
**Impact:** All 4 violations WILL THROW in STRICT mode
**Solution:** Either:
- Option A: Route through ActorEngine.recomputeHP() instead of updateActor()
- Option B: Add isRecomputeHPCall: true to options
- Option C: Call ActorEngine.recomputeHP() AFTER updateActor()

### 🔴 Pattern 2: DIRECT MUTATION BYPASS (No ActorEngine)
**Appears in:** Buckets 4, 7
**Files:** 2 (follower-creator.js line 816, follower-manager.js line 249)
**Root Cause:** Writes directly to follower.update() without routing through ActorEngine
**Problem:** Bypasses:
  - MutationInterceptor enforcement
  - Recomputation pipeline
  - Integrity checks
  - Authorization context
**Impact:** WILL THROW immediately in STRICT mode (before hp.max check)
**Solution:** Route through ActorEngine.updateActor()

### 🟡 Pattern 3: DERIVED FIELD BYPASS
**Appears in:** Bucket 7
**File:** drop-handler.js (line 95-96: system.derived.hp.max/value)
**Issue:** Writes to derived fields via ActorEngine, but without isDerivedCalculatorCall flag
**Risk:** Medium — May violate ActorEngine._validateDerivedWriteAuthority() check
**Status:** Routed through ActorEngine (compliant routing), but flag might be needed

### 🟡 Pattern 4: TEST INFRASTRUCTURE BROKEN
**Appears in:** Bucket 8
**Files:** tests/phase-5-governance-compliance.test.js
**Issue:** Jest cannot resolve module paths (relative imports from system directory)
**Impact:** Tests are discoverable but not executable
**Blocking:** Cannot verify SSOT compliance programmatically
**Status:** Needs infrastructure fix, not code fix

---

## 3. SSOT COMPLIANCE SCORECARD

| Bucket | Status | Score | Blockers |
|--------|--------|-------|----------|
| **1** — Primary Authority | Strong | 10/10 | None |
| **2** — Approved Wrappers | Strong | 10/10 | None |
| **3** — UI Mutations | Strong | 10/10 | None (Fixed in Phase 5) |
| **4** — Hooks/Automation | Mixed | 6/10 | 2 critical violations |
| **5** — Import/Migration | Strong | 10/10 | None |
| **6** — Embedded Documents | Clean | 10/10 | None |
| **7** — Protected Fields | **Non-Compliant** | **2/10** | **4+ critical violations** |
| **8** — Tests/Diagnostics | Fragile | 5/10 | Test infrastructure broken |
| **9** — Deprecated/Legacy | Serviceable | 7/10 | Tech debt, non-blocking |
| **OVERALL** | **FAILING** | **6.4/10** | **SSOT NOT COMPLETE** |

---

## 4. ACTION LIST

### 🔴 FIX NOW (Blocking SSOT Compliance)

#### A. HP.MAX Write Violations (4 files)
1. **chargen-improved.js (line 491-495)**
   - Current: `await globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.hp.max': newHP, ... });`
   - Fix: Either:
     - Option 1: `await ActorEngine.recomputeHP(actor);` after updateActor (recommended)
     - Option 2: Pass `{ ..., isRecomputeHPCall: true }` in options
   - Files affected: Level-up flow
   - Test: Try leveling up character in STRICT mode

2. **drop-handler.js (line 372-377)**
   - Current: `const updates = { 'system.hp.max': ..., ... }; await ActorEngine.updateActor(actor, updates);`
   - Fix: Same as above — either use recomputeHP or add flag
   - Files affected: Droid chassis template drops
   - Test: Try dropping droid chassis in STRICT mode

3. **follower-creator.js (line 816-821)**
   - Current: `await follower.update({ 'system.level': ownerLevel, 'system.hp.max': newHP, ... });`
   - Fix: Route through ActorEngine:
     ```javascript
     await ActorEngine.updateActor(follower, {
       'system.level': ownerLevel,
       'system.hp.max': newHP,
       'system.hp.value': Math.min(...)
     }, { isRecomputeHPCall: true });
     ```
   - Files affected: Follower level-up on owner progression
   - Test: Level up owner, check follower updates

4. **follower-manager.js (line 249)**
   - Current: `await follower.update({ 'system.hp.max': 10 + ownerLevel, ... });`
   - Fix: Same pattern — use ActorEngine.updateActor()
   - Files affected: Manual follower management
   - Test: Manually update follower via manager

#### B. Direct Mutation Bypass (2 files)
5. **follower-creator.js (line 816)**
   - Additional issue: Uses follower.update() instead of ActorEngine
   - Fix: Use ActorEngine.updateActor() as noted above

6. **follower-manager.js (line 249)**
   - Additional issue: Direct mutation
   - Fix: Use ActorEngine.updateActor()

**Total Fix-Now Impact:** 4 critical issues, affecting:
   - Character level-up flow
   - Droid chassis template application
   - Follower management system
   - Progression hooks

---

### 🟡 FIX NEXT (High Priority)

#### C. Test Infrastructure
7. **tests/phase-5-governance-compliance.test.js**
   - Issue: Jest module resolution failing
   - Root cause: Cannot resolve "/systems/foundryvtt-swse/scripts/..." paths
   - Fix: Update jest.config.js moduleNameMapper or change import paths
   - Impact: Cannot verify fixes programmatically
   - Effort: 1-2 hours

#### D. Derived Field Write Clarity
8. **drop-handler.js (line 95-96)**
   - Issue: Writes system.derived.hp.max without isDerivedCalculatorCall flag
   - Fix: Add flag to updateActor options if derived writes are intended
   - Risk: Medium — check if this violates _validateDerivedWriteAuthority()
   - Effort: 30 minutes investigation, 15 minutes fix

---

### 🟢 DEFER (Non-Blocking)

#### E. Code Cleanup
9. **Bucket 9 files:** Deprecation cleanup
   - 5 files with legacy markers
   - Effort: 2-3 hours
   - Impact: Tech debt, not governance-blocking

---

## 5. FINAL BOTTOM LINE

### Is Mutation SSOT Truly Complete?

**NO.** ❌

**Current Status:**
- **Authority layer (Bucket 1):** ✅ Perfect
- **Routing infrastructure (Buckets 2-3, 5-6):** ✅ Clean
- **Protected field enforcement (Bucket 7):** ❌ **BROKEN**
- **Hook governance (Bucket 4):** ❌ **BROKEN**
- **Test coverage (Bucket 8):** ⚠️ Wired but non-functional

### Why SSOT Is Not Complete:

1. **4+ critical hp.max violations** that WILL THROW in STRICT mode
2. **2 follower files** bypass ActorEngine entirely
3. **Tests cannot execute** to verify fixes
4. **Recomputation pipeline** bypassed in multiple gameplay flows

### Which Bucket Prevents 100/100?

**BUCKET 7 — Protected Fields** is the primary blocker.
- hp.max write governance incomplete
- Callers don't know about isRecomputeHPCall requirement
- No fallback to safer recomputeHP() method

**Secondary Blocker: BUCKET 4 — Hooks**
- Two hook handlers (follower-creator, follower-manager) bypass all governance

### Smallest Remaining Fix Set for Honest Compliance:

**MANDATORY (Blocking STRICT mode readiness):**
1. Fix 4 hp.max violations (chargen, drop-handler, follower-creator x2, follower-manager)
2. Route follower mutations through ActorEngine
3. Fix Jest test infrastructure
4. Run tests to verify all fixes work

**ESTIMATED EFFORT:** 2-3 hours
**ESTIMATED CONFIDENCE:** After fixes + passing tests = **100% SSOT ready**

---

## SUMMARY TABLE

| Finding | Severity | Count | Bucket | Status |
|---------|----------|-------|--------|--------|
| HP.MAX write violations | CRITICAL | 4 | 7 | Needs fix |
| Direct mutation bypasses | CRITICAL | 2 | 4 | Needs fix |
| Derived field ambiguity | MEDIUM | 1 | 7 | Needs clarification |
| Test infrastructure broken | MEDIUM | 1 | 8 | Needs fix |
| Tech debt markers | LOW | 5 | 9 | Can defer |
| **Total Blocking Issues** | | **6** | | **FIX NOW** |
