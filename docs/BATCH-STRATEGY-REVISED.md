# BATCH STRATEGY REVISION

## Discovery: Inventory/Store is Already Clean

**Batch 2 (inventory/store/commerce):** Only **2 violations** (both flags)
- store-checkout.js: 1 actor.setFlag()
- store-main.js: 1 actor.setFlag()

**Status:** ✅ **Already compliant for core mutations**

---

## Actual Violation Distribution

| System | Count | Type | Priority |
|--------|-------|------|----------|
| **mutation-lint.js** | 15 | Test/audit code | LOW |
| **DarkSidePowers** | 15 | Talent system | HIGH |
| **scout-talent-mechanics** | 9 | Talent system | HIGH |
| **destiny-effects** | 8 | Effects/mechanics | MEDIUM |
| **suggestion/mentor** | 20 | State/flags | MEDIUM |
| **other talents** | 25 | Talent system | HIGH |
| **test/audit files** | 20 | Test code | LOW |
| **misc systems** | 17 | Edge cases | LOW |
| **inventory/store** | 2 | Flags only | N/A |
| **TOTAL** | 154 | | |

---

## REVISED BATCH PLAN

Given this distribution, the **optimal path forward is:**

### ✅ **Batch 1: COMPLETE** 
- chargen/progression/levelup core mutations

### ✅ **Batch 2: SKIP** 
- inventory/store are already clean (2 flags only)

### **→ Batch 2B: TALENTS + EFFECTS (HIGH VALUE)**
- DarkSidePowers.js (15 violations)
- scout-talent-mechanics.js (9 violations)
- destiny-effects.js (8 violations)
- light-side-talent-mechanics.js (5 violations)
- **Total: 37 violations** (high-risk system)

### **Batch 3: SUGGESTION/MENTOR**
- SuggestionService.js
- mentor-memory.js / mentor-dialogues.js
- SelectionRecorder, etc.
- **Total: 20 violations** (state-heavy)

### **Batch 4: FLAGS POLICY**
- All actor.setFlag() / actor.unsetFlag() across system
- **Total: ~40 violations** (metadata evaluation)

### **Batch 5: TEST/AUDIT CLEANUP**
- mutation-lint.js itself (15)
- test files (20)
- **Total: 35 violations** (non-production)

---

## RECOMMENDATION

**Skip the empty Batch 2. Go straight to Batch 2B: Talents + Effects.**

Reason:
- Inventory/store is clean and doesn't need work
- Talents are high-risk (gameplay affecting)
- This gets you to more meaningful governance faster
- Batch order becomes: 1 → 2B → 3 → 4 → 5

Would you like me to execute **Batch 2B: Talents + Effects** (37 violations, high-value refactoring)?

This is where the real architectural debt lives.
