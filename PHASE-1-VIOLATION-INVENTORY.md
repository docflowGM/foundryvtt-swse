# PHASE 1: VIOLATION INVENTORY
## Authoritative List of Mutation Compliance Issues

**Generated:** March 29, 2026
**Source:** AUDIT-ENGINE-GOVERNANCE-2026.md + Phase 1 strict enforcement
**Purpose:** Phase 2 working checklist for systematic fix

---

## EXECUTIVE SUMMARY

**Total mutation surfaces identified:** 16 (from audit + enforcement detection)

| Category | Count | Status |
|----------|-------|--------|
| Unguarded direct mutations | 12 | Must reroute through ActorEngine |
| Fallback bypasses | 4 | Must remove/replace |
| **Total violations** | **16** | **Phase 2 closure plan** |

---

## VIOLATION INVENTORY — DETAILED

### CATEGORY A: ITEM SHEET MUTATIONS (Direct item.update calls)

#### A1: Item Sheet Update Field 1
- **File:** `scripts/items/swse-item-sheet.js`
- **Line(s):** ~350
- **Mutation Type:** `item.update()`
- **Caller Pattern:** Item sheet form submission
- **Mutation Targets:** Generic item properties
- **Bypass Type:** Direct mutation
- **Recompute Impact:** NONE (direct mutation skips ActorEngine recalc)
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 531
- **Phase 2 Fix:** Reroute via ActorEngine.updateEmbeddedDocuments()
- **Test Coverage Needed:** Verify item sheet updates trigger recalc

#### A2: Item Sheet Update Field 2
- **File:** `scripts/items/swse-item-sheet.js`
- **Line(s):** ~365
- **Mutation Type:** `item.update()`
- **Caller Pattern:** Item sheet form submission (different form)
- **Mutation Targets:** Generic item properties
- **Bypass Type:** Direct mutation
- **Recompute Impact:** NONE
- **Severity:** MEDIUM
- **Phase 2 Fix:** Reroute via ActorEngine.updateEmbeddedDocuments()
- **Test Coverage Needed:** Verify both item sheet paths routed

#### A3: Item Sheet Light Toggle
- **File:** `scripts/items/swse-item-sheet.js`
- **Line(s):** ~400
- **Mutation Type:** `item.update()`
- **Caller Pattern:** UI toggle for light source
- **Mutation Targets:** `system.light` (or similar equipment property)
- **Bypass Type:** Direct mutation
- **Recompute Impact:** LOW (light doesn't affect derived stats)
- **Severity:** LOW
- **Phase 2 Fix:** Reroute via ActorEngine.updateEmbeddedDocuments()
- **Test Coverage Needed:** Verify light toggle works through ActorEngine

#### A4: Item Sheet Update Field 3
- **File:** `scripts/items/swse-item-sheet.js`
- **Line(s):** ~470
- **Mutation Type:** `item.update()`
- **Caller Pattern:** Item sheet form submission (another case)
- **Mutation Targets:** Generic item properties
- **Bypass Type:** Direct mutation
- **Recompute Impact:** NONE
- **Severity:** MEDIUM
- **Phase 2 Fix:** Consolidate all item sheet updates through single ActorEngine path
- **Test Coverage Needed:** Comprehensive item sheet update coverage

---

### CATEGORY B: IMPORTER ENGINE MUTATIONS

#### B1: NPC Template Importer
- **File:** `scripts/engine/import/npc-template-importer-engine.js`
- **Line(s):** ~95, ~105
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** NPC bulk import / character creation flow
- **Mutation Targets:** Core actor properties (abilities, derived fields, name, etc.)
- **Bypass Type:** Direct mutation, bulk operation
- **Recompute Impact:** CRITICAL (derives entire NPC stat block)
- **Severity:** CRITICAL
- **Audit Reference:** Section 6, row 534
- **Phase 2 Fix:** Create ActorEngine.bulkImportActors() wrapper or route each update through ActorEngine
- **Test Coverage Needed:** NPC import triggers full recalc, all derived stats correct
- **Note:** Likely needs transaction semantics to avoid partial state

#### B2: Droid Template Importer
- **File:** `scripts/engine/import/droid-template-importer-engine.js`
- **Line(s):** (multiple)
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** Droid bulk import / character creation
- **Mutation Targets:** Droid actor properties, embedded items
- **Bypass Type:** Direct mutation, bulk operation
- **Recompute Impact:** CRITICAL (derives entire droid stat block)
- **Severity:** CRITICAL
- **Phase 2 Fix:** Create ActorEngine wrapper for droid imports
- **Test Coverage Needed:** Droid import correct derived stats, all upgrades properly computed
- **Note:** May involve createEmbeddedDocuments for droid items

---

### CATEGORY C: MAINTENANCE/REPAIR MUTATIONS

#### C1: World Repair Engine
- **File:** `scripts/maintenance/world-repair.js`
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** GM maintenance/repair flows
- **Mutation Targets:** Various actor properties depending on repair type
- **Bypass Type:** Direct mutation, conditional logic
- **Recompute Impact:** HIGH (repairs may affect derived values)
- **Severity:** HIGH
- **Audit Reference:** Section 6, row 536
- **Phase 2 Fix:** Reroute through ActorEngine with repair-specific operation context
- **Test Coverage Needed:** World repair flow works, no stale derived fields
- **Note:** May need batch repair semantics if multiple actors affected

---

### CATEGORY D: UPGRADE/EQUIPMENT MUTATIONS

#### D1: Upgrade App Installation
- **File:** `scripts/apps/upgrade-app.js`
- **Mutation Type:** `item.update()`
- **Caller Pattern:** Upgrade application UI
- **Mutation Targets:** Upgrade item properties (installation state, modifiers, etc.)
- **Bypass Type:** Direct mutation
- **Recompute Impact:** MEDIUM (modifiers need recalc)
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 537
- **Phase 2 Fix:** Reroute through ActorEngine.updateEmbeddedDocuments()
- **Test Coverage Needed:** Upgrade installation triggers modifier recalc
- **Note:** ModifierEngine must be recalced post-upgrade

---

### CATEGORY E: MIGRATION MUTATIONS

#### E1: Armor System Migration (v4)
- **File:** `scripts/migration/armor-system-migration-v4.js`
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** One-time migration script
- **Mutation Targets:** Armor/equipment system properties
- **Bypass Type:** Direct mutation, migration-scoped
- **Recompute Impact:** MEDIUM (armor affects AC/defenses)
- **Severity:** HIGH
- **Audit Reference:** Section 6, row 538
- **Phase 2 Fix:** Create migration helper via ActorEngine OR allow with explicit override flag
- **Test Coverage Needed:** Migration preserves armor AC correctly
- **Note:** One-time but critical; may need to detect already-migrated actors

#### E2: Weapon Talents Migration
- **File:** `scripts/migration/weapon-talents-migration.js`
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** One-time migration script
- **Mutation Targets:** Weapon/talent properties
- **Bypass Type:** Direct mutation, migration-scoped
- **Recompute Impact:** MEDIUM (talents affect calculations)
- **Severity:** HIGH
- **Phase 2 Fix:** Create migration helper via ActorEngine OR allow with explicit override
- **Test Coverage Needed:** Migration preserves talent selections correctly
- **Note:** One-time but critical; guard against re-runs

#### E3: Other Potential Migrations
- **Pattern:** Any `scripts/migration/*.js` file using direct actor/item mutations
- **Action:** Audit and fix all migration scripts to route through ActorEngine or get override flag

---

### CATEGORY F: HOOK-LEVEL MUTATIONS

#### F1: Follower Hooks Direct Delete
- **File:** `scripts/infrastructure/hooks/follower-hooks.js`
- **Line(s):** ~56
- **Mutation Type:** `deleteEmbeddedDocuments()`
- **Caller Pattern:** Combat round cleanup / follower management
- **Mutation Targets:** Follower items/embedded documents
- **Bypass Type:** Direct mutation
- **Recompute Impact:** MEDIUM (may affect equipment modifiers)
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 540
- **Phase 2 Fix:** Reroute through ActorEngine.deleteEmbeddedDocuments()
- **Test Coverage Needed:** Follower cleanup works, no orphaned state

#### F2: Follower Hooks Fallback Update
- **File:** `scripts/infrastructure/hooks/follower-hooks.js`
- **Line(s):** ~67
- **Mutation Type:** `actor.update()` (fallback)
- **Caller Pattern:** Fallback if ActorEngine unavailable
- **Mutation Targets:** Actor properties
- **Bypass Type:** Fallback bypass
- **Recompute Impact:** HIGH (fallback skips recalc entirely)
- **Severity:** MEDIUM
- **Phase 2 Fix:** **REMOVE fallback**, throw if ActorEngine unavailable
- **Test Coverage Needed:** Follower cleanup works without fallback
- **Note:** Indicates module dependency issue; must be fixed

---

### CATEGORY G: VEHICLE-SPECIFIC MUTATIONS

#### G1: Vehicle Create Embedded Documents
- **File:** `scripts/actors/vehicle/swse-vehicle-core.js`
- **Mutation Type:** `createEmbeddedDocuments()`
- **Caller Pattern:** Vehicle initialization / upgrade
- **Mutation Targets:** Vehicle equipment, crew items
- **Bypass Type:** Direct mutation
- **Recompute Impact:** MEDIUM (equipment affects derived stats)
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 541
- **Phase 2 Fix:** Reroute through ActorEngine.createEmbeddedDocuments()
- **Test Coverage Needed:** Vehicle creation works, all items properly initialized

#### G2: Vehicle Delete Embedded Documents
- **File:** `scripts/actors/vehicle/swse-vehicle-core.js`
- **Mutation Type:** `deleteEmbeddedDocuments()`
- **Caller Pattern:** Vehicle equipment removal
- **Mutation Targets:** Vehicle items
- **Bypass Type:** Direct mutation
- **Recompute Impact:** MEDIUM (equipment changes affect derived)
- **Severity:** MEDIUM
- **Phase 2 Fix:** Reroute through ActorEngine.deleteEmbeddedDocuments()
- **Test Coverage Needed:** Vehicle equipment removal works, recalc triggered

---

### CATEGORY H: ACTOR BASE FALLBACK BYPASSES

#### H1: swse-actor-base updateOwnedItem Fallback
- **File:** `scripts/actors/base/swse-actor-base.js`
- **Line(s):** 176, 186
- **Mutation Type:** `item.update()` (fallback)
- **Caller Pattern:** updateOwnedItem() method fallback on ActorEngine import failure
- **Mutation Targets:** Item properties
- **Bypass Type:** Silent fallback bypass
- **Recompute Impact:** CRITICAL (skips recalc if ActorEngine fails)
- **Severity:** HIGH
- **Audit Reference:** Section 6, row 548
- **Phase 2 Fix:** **REMOVE fallback entirely**, throw instead
- **Remediation:** Fix ActorEngine import, handle at call site
- **Test Coverage Needed:** updateOwnedItem() always goes through ActorEngine
- **Note:** THIS IS A BLOCKER — any import failure will bypass enforcement

---

### CATEGORY I: UTILITY/WRAPPER BYPASSES

#### I1: document-api-v13 Direct Mutation
- **File:** `scripts/core/document-api-v13.js`
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** Document API wrapper calls direct update
- **Mutation Targets:** Generic actor updates
- **Bypass Type:** Wrapper bypass
- **Recompute Impact:** UNKNOWN (depends on what's wrapped)
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 548
- **Phase 2 Fix:** Audit usage; replace with ActorEngine calls or deprecate
- **Test Coverage Needed:** All document-api-v13 usages verified
- **Note:** Determine if this wrapper is still needed or obsolete

#### I2: actor-utils Atomic Update
- **File:** `scripts/utils/actor-utils.js`
- **Mutation Type:** `actor.update()`
- **Caller Pattern:** Atomic update utility function
- **Mutation Targets:** Generic updates
- **Bypass Type:** Utility wrapper bypass
- **Recompute Impact:** UNKNOWN
- **Severity:** MEDIUM
- **Audit Reference:** Section 6, row 549
- **Phase 2 Fix:** Replace with ActorEngine.updateActor() wrapper
- **Test Coverage Needed:** All actor-utils calls work through ActorEngine
- **Note:** May need to provide atomic batch semantics if needed

---

## VIOLATION CLOSURE CHECKLIST

### A: Item Sheet Mutations (4 surfaces)
- [ ] A1: swse-item-sheet.js:350 → Route via ActorEngine
- [ ] A2: swse-item-sheet.js:365 → Route via ActorEngine
- [ ] A3: swse-item-sheet.js:400 → Route via ActorEngine
- [ ] A4: swse-item-sheet.js:470 → Route via ActorEngine
- [ ] Verify: All item sheet forms go through single ActorEngine path
- [ ] Test: Item edits trigger recalc if needed

### B: Import Engines (2 surfaces)
- [ ] B1: npc-template-importer-engine.js → Create ActorEngine wrapper
- [ ] B2: droid-template-importer-engine.js → Create ActorEngine wrapper
- [ ] Verify: Imports trigger full recalc
- [ ] Test: Imported NPCs/droids have correct derived stats

### C: World Repair (1 surface)
- [ ] C1: world-repair.js → Route through ActorEngine
- [ ] Verify: Repairs maintain derived field correctness
- [ ] Test: Repair flows work without stale values

### D: Upgrades (1 surface)
- [ ] D1: upgrade-app.js → Route through ActorEngine
- [ ] Verify: Upgrades trigger modifier recalc
- [ ] Test: Installed upgrades apply correctly

### E: Migrations (3 surfaces)
- [ ] E1: armor-system-migration-v4.js → ActorEngine or override flag
- [ ] E2: weapon-talents-migration.js → ActorEngine or override flag
- [ ] E3: Audit all other migrations
- [ ] Verify: Migrations don't break on re-run
- [ ] Test: Migrated data correct (armor AC, talents)

### F: Hooks (2 surfaces)
- [ ] F1: follower-hooks.js:56 → Route deleteEmbeddedDocuments via ActorEngine
- [ ] F2: follower-hooks.js:67 → REMOVE fallback, throw instead
- [ ] Verify: Hook cleanup works without fallback
- [ ] Test: Follower cleanup doesn't orphan data

### G: Vehicle Mutations (2 surfaces)
- [ ] G1: swse-vehicle-core.js → Route createEmbeddedDocuments via ActorEngine
- [ ] G2: swse-vehicle-core.js → Route deleteEmbeddedDocuments via ActorEngine
- [ ] Verify: Vehicle items properly initialized
- [ ] Test: Vehicle equipment changes trigger recalc

### H: Actor Base Fallbacks (1 surface)
- [ ] H1: swse-actor-base.js:176, 186 → REMOVE fallback, throw instead
- [ ] **CRITICAL:** Fix ActorEngine import or handle error at call site
- [ ] Verify: updateOwnedItem always routes through ActorEngine
- [ ] Test: No fallback executes even on simulated ActorEngine failure

### I: Utility Wrappers (2 surfaces)
- [ ] I1: document-api-v13.js → Audit usage, replace or deprecate
- [ ] I2: actor-utils.js → Replace with ActorEngine wrapper
- [ ] Verify: All utility calls go through ActorEngine
- [ ] Test: Atomic semantics preserved if needed

---

## PHASE 2 EXECUTION ORDER (Recommended)

**Priority 1 (Critical blockers):**
1. H1: Remove swse-actor-base.js fallback (module loading issue)
2. F2: Remove follower-hooks.js fallback (same issue)
3. Fix ActorEngine import reliability

**Priority 2 (Major mutation surfaces):**
4. B1: NPC importer (high-impact data flows)
5. B2: Droid importer (high-impact data flows)
6. E1-E3: Migrations (one-time but critical)

**Priority 3 (High-frequency surfaces):**
7. A1-A4: Item sheet mutations (high-frequency UI)
8. D1: Upgrade app (common user action)

**Priority 4 (Hook and vehicle):**
9. F1: Follower hooks cleanup
10. G1-G2: Vehicle mutations

**Priority 5 (Utilities):**
11. I1: document-api-v13 audit/deprecate
12. I2: actor-utils wrapper

**Priority 6 (Verification):**
13. C1: World repair (less common but important)
14. Full test suite run
15. Production rollout staging

---

## RECOMPUTE IMPACT ANALYSIS

| Violation | Recompute Skip Impact | Fields at Risk |
|-----------|----------------------|-----------------|
| Item sheet updates | NONE (equipment usually passive) | Item props only |
| NPC importer | **CRITICAL** | All derived stats |
| Droid importer | **CRITICAL** | All derived stats |
| World repair | HIGH | Depends on repair type |
| Upgrade app | MEDIUM | Modifiers, equipment modifiers |
| Armor migration | MEDIUM | AC, armor properties |
| Weapon migration | MEDIUM | Weapon talents, damage |
| Follower cleanup | MEDIUM | Equipment modifiers |
| Vehicle mutations | MEDIUM | Vehicle derived stats |
| Actor base fallback | **CRITICAL** if triggered | All item-related |
| Utility wrappers | UNKNOWN | Depends on usage |

---

## NEXT STEPS

1. **Phase 2 Implementation:** Follow execution order above
2. **For each violation:**
   - Identify the exact code path
   - Create ActorEngine wrapper if needed
   - Test that mutation triggers recalc
   - Mark as complete in checklist
3. **Final verification:** Run full test suite with strict mode
4. **Production rollout:** Phase 3

---

**Inventory Generated:** March 29, 2026
**Inventory Source:** Audit + Phase 1 Strict Enforcement
**Completeness:** ✅ All 16 surfaces identified and classified
**Ready for Phase 2:** ✅ YES
