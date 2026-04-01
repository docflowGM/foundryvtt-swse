# 🔍 MUTATION LINT FINDINGS & REMEDIATION STRATEGY

**Date:** 2026-04-01  
**Tool:** `npm run lint:mutation`  
**Status:** ⚠️ MAJOR ARCHITECTURAL ISSUE DISCOVERED

---

## EXECUTIVE SUMMARY

The mutation lint tool successfully detected **291 direct mutation calls** that bypass ActorEngine governance.

**Current State:**
- ❌ 291 violations found
- ❌ Many core systems NOT routing through ActorEngine
- ❌ Governance not fully centralized

**Impact:** This is the critical architectural debt that needs to be addressed for complete governance.

---

## VIOLATION BREAKDOWN

| Type | Count | Severity | Examples |
|------|-------|----------|----------|
| `.createEmbeddedDocuments()` | ~100 | ERROR | chargen, progression, inventory |
| `.deleteEmbeddedDocuments()` | ~80 | ERROR | chargen, stores, inventory |
| `.updateEmbeddedDocuments()` | ~40 | ERROR | embedded updates |
| `actor.setFlag()` | ~70 | ERROR (STRICT) | suggestions, mentor, talents |
| `actor.unsetFlag()` | ~10 | ERROR | talent mechanics |

---

## CRITICAL VIOLATION AREAS

### **1. Character Generation (chargen)** 
**Impact:** HIGH — Creates items/talents during character creation  
**Files:**
- chargen-main.js (9 violations)
- chargen-templates.js (10 violations)
- chargen-class.js (5 violations)
- chargen-feats-talents.js (6 violations)

**Problem:**
```javascript
// Current (VIOLATION)
await actor.createEmbeddedDocuments('Item', itemData);

// Should be:
await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemData);
```

---

### **2. Progression System**
**Impact:** HIGH — Adds/removes class features  
**Files:**
- progression-engine.js (25+ violations)
- class-progression-engine.js (15+ violations)
- level-up-engine.js (10+ violations)

---

### **3. Item Management (Inventory)**
**Impact:** MEDIUM — Equips/unequips items  
**Files:**
- inventory-engine.js (8 violations)
- drop-service.js (5 violations)

---

### **4. Store/Commerce System**
**Impact:** MEDIUM — Adds items to inventory  
**Files:**
- store-transaction-engine.js (10+ violations)
- store-engine.js (5+ violations)

---

### **5. Talent/Dark Side System**
**Impact:** MEDIUM — Sets/unsets talent flags  
**Files:**
- dark-side-devotee-mechanics.js (5 violations)
- dark-side-talent-mechanics.js (3 violations)

---

### **6. Suggestion/Mentor System**
**Impact:** LOW-MEDIUM — Persists state via flags  
**Files:**
- suggestion-service.js (8+ violations)
- mentor-system.js (5+ violations)
- archive-shift-tracker.js (3+ violations)

---

## REMEDIATION STRATEGY

### **PHASE 1: Organize by Impact (Current)**

```
Priority 1 (CRITICAL):
  - chargen (character creation)
  - progression (class/level system)
  - inventory (item management)

Priority 2 (HIGH):
  - store (commerce)
  - combat (action economy)

Priority 3 (MEDIUM):
  - talents (special mechanics)
  - suggestions (advisor system)
```

---

### **PHASE 2: Refactor High-Priority Systems**

For each system, create wrapper functions that route through ActorEngine:

**Pattern:**
```javascript
// OLD (violation)
export async function addItemToActor(actor, itemData) {
  await actor.createEmbeddedDocuments('Item', [itemData]);
}

// NEW (compliant)
export async function addItemToActor(actor, itemData) {
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', [itemData]);
}
```

---

### **PHASE 3: Update All Callers**

Once wrappers are ActorEngine-compliant, callers automatically route through governance.

---

### **PHASE 4: Lint Again**

Run `npm run lint:mutation` after each priority level to verify compliance.

---

## QUICK FIXES FOR EACH VIOLATION TYPE

### Violation: `.createEmbeddedDocuments()`

```javascript
// ❌ VIOLATION
const created = await actor.createEmbeddedDocuments('Item', itemData);

// ✅ FIX
const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemData);
```

---

### Violation: `.deleteEmbeddedDocuments()`

```javascript
// ❌ VIOLATION
await actor.deleteEmbeddedDocuments('Item', itemIds);

// ✅ FIX
await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', itemIds);
```

---

### Violation: `.updateEmbeddedDocuments()`

```javascript
// ❌ VIOLATION
await actor.updateEmbeddedDocuments('Item', updates);

// ✅ FIX
await ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates);
```

---

### Violation: `actor.setFlag()` (Data Mutations)

```javascript
// ❌ VIOLATION (if setting data state)
await actor.setFlag('swse', 'currentClass', className);

// ✅ FIX (route data changes through ActorEngine)
await ActorEngine.updateActor(actor, { 'system.class': className });

// ✅ OK (if pure metadata/state, not game data)
await actor.setFlag('swse', 'uiState', { expanded: true }); // metadata-only
```

---

### Violation: `actor.unsetFlag()`

```javascript
// ❌ VIOLATION
await actor.unsetFlag('swse', 'temporaryBonus');

// ✅ FIX
await ActorEngine.updateActor(actor, { 'system.tempBonus': 0 }); // if data
// OR
actor.setFlag('swse', 'temporaryBonus', null); // if just removing state
```

---

## IMPLEMENTATION GUIDE

### Step 1: Identify Your File

Run lint and note which files have violations:

```bash
npm run lint:mutation 2>&1 | grep "scripts/apps/chargen" | head -5
```

### Step 2: Understand the Pattern

Look at imports and understand what the code is doing:

```javascript
// In chargen-main.js line 3313
import { ActorEngine } from '...';

async function addClassFeatures(actor, features) {
  // Current code:
  await actor.createEmbeddedDocuments('Item', features); // ❌ VIOLATION
  
  // Should be:
  await ActorEngine.createEmbeddedDocuments(actor, 'Item', features); // ✅ COMPLIANT
}
```

### Step 3: Apply Fix

Replace the direct call with ActorEngine equivalent.

### Step 4: Verify

```bash
npm run lint:mutation
```

Rerun to confirm violations are fixed.

---

## ADDING EXCEPTIONS (When Necessary)

For cases where you need to bypass the linter (rare):

```javascript
// @mutation-exception
// NOTE: This flag update is part of the UI state management system,
// not a data mutation. It persists user preferences only.
await actor.setFlag('swse', 'sheetExpanded', true);
```

**Valid exception comments:**
- `// @mutation-exception`
- `// @mutation-approved`
- `// MUTATION EXCEPTION:`
- `// APPROVED BYPASS:`

---

## TIMELINE RECOMMENDATION

### **Week 1:**
- Fix Priority 1 (chargen, progression) — ~40 violations
- Highest impact, most critical to governance

### **Week 2:**
- Fix Priority 2 (inventory, stores) — ~30 violations
- Core game loops

### **Week 3:**
- Fix Priority 3 (talents, suggestions) — ~30 violations
- Special systems

### **After:**
- Lint becomes automated CI check
- All future PRs must pass `npm run lint:mutation`

---

## MAKING IT PERMANENT (CI Integration)

Once violations are fixed, add to CI pipeline:

**GitHub Actions Example:**
```yaml
- name: Mutation Lint Check
  run: npm run lint:mutation
```

**This ensures:**
- ✅ No new violations introduced
- ✅ Governance stays centralized
- ✅ ActorEngine remains the only mutation authority

---

## SUCCESS CRITERIA

The system is fully governance-compliant when:

```bash
$ npm run lint:mutation

✅ PASS: No forbidden mutation patterns found

Mutation governance is enforced at the code level.
All actor updates route through ActorEngine.
```

---

## RESOURCES

- **Implementation Guide:** See quick fix examples above
- **Architecture:** PERMANENT-FIX-SUMMARY.md
- **Audit Results:** UI-MUTATION-PATH-AUDIT.md
- **Code:** scripts/tools/mutation-lint.js

---

## KEY INSIGHT

This lint tool didn't **create** the problem — it **exposed** it.

The good news:
- We have a clear inventory of violations
- We have a clear remediation path
- We have a tool to prevent regression

**Next step:** Systematically refactor Priority 1 systems to route through ActorEngine.

This is the final piece of governance architecture.
