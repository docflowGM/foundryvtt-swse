# PHASE 3 MUTATION GOVERNANCE — BATCH ROADMAP

## Current Status
- **BATCH 3:** ✅ COMPLETE (Progression System)
  - 22 files routed
  - 60+ mutations governed
  - Sentinel integration tests created

## Remaining Work: 8 Batches

### BATCH 4: CORE ENGINE SYSTEMS
**Priority: CRITICAL** — Foundational gameplay mechanics

**Systems:**
- Combat & Initiative (1 update)
- Force System (3 updates)
- Effects Management (4 updates)
- Crew/Mount System (3 updates)
- Bonus HP Engine (2 updates, 1 creates)
- Prerequisites/Archetype (5 updates)
- Rule Element System (11 updates)
- NPC Levelup (3 updates, 2 creates)
- Progression Core (4 updates, 3 creates)
- Natural Weapons & Droid Systems (2 creates)

**Total:** ~15 files, ~40 mutations
**Estimated Effort:** 2-3 hours

---

### BATCH 5: TALENT SYSTEM
**Priority: HIGH** — Heavy mutation concentration

**Systems:**
- Dark Side Powers (24 updates - CRITICAL)
- Light Side Talent Mechanics (4 updates)
- Dark Side Devotee Mechanics (6 updates)
- Other Talent Systems (1 update)

**Total:** 4 files, 35 mutations
**Note:** DarkSidePowers.js is single largest mutation site (24 updates)
**Estimated Effort:** 1-2 hours

---

### BATCH 6: SHEET UI & DIRECT MUTATIONS
**Priority: MEDIUM-HIGH** — Real-time user interactions

**Systems:**
- Droid Sheet V2 (18 updates - UI-driven)
- Character Sheet V2 (1 update, 1 creates)
- NPC Full Sheet (2 updates)
- NPC Combat Sheet (1 update)

**Total:** 4 files, 22 mutations
**Note:** Droid sheet has high mutation density due to configuration options
**Estimated Effort:** 1.5-2 hours

---

### BATCH 7: UTILITIES & SUPPORT SYSTEMS
**Priority: MEDIUM** — Infrastructure and helper utilities

**Systems:**
- Actor Utilities (2 updates, 3 creates)
- Destiny Effects (1 update)
- Hardening/Cloning (1 update, 3 creates)
- Starship Maneuver Manager (3 updates, 1 creates)
- Force Power Manager (1 creates)
- Droid Appendage Utils (1 creates)
- Houserules (2 updates)
- Components (4 updates)

**Total:** 8 files, 17 mutations
**Estimated Effort:** 1-1.5 hours

---

### BATCH 8: ITEM CREATION & EMBEDDED DOCUMENTS
**Priority: MEDIUM** — Character generation and item drops

**Systems:**
- Chargen Main Flows (1 update, 20 creates)
- Item Creation Dialogs (0 updates, 7 creates)
- Drag & Drop Handler (7 creates)
- Combat Effects Manager (4 creates)
- Grappling System (1 creates)

**Total:** 12 files, 1 update, 39 creates
**Estimated Effort:** 1.5-2 hours

---

### BATCH 9: APPS & UI DIALOGS
**Priority: LOW-MEDIUM** — Light mutations scattered across UI

**Systems:**
- Ability Rolling App (1 update)
- Damage App (2 updates)
- Skill Modifier Breakdown (3 updates)
- Droid Builder App (1 update)
- GM Dashboards (5 updates)
- Mentor Survey (1 update)
- Item Selling System (1 update)
- Other Dialogs (3 updates)

**Total:** 12 files, 17 mutations
**Estimated Effort:** 1.5-2 hours

---

### BATCH 10: HOOKS & INFRASTRUCTURE
**Priority: MEDIUM** — Core lifecycle and event handling

**Systems:**
- Actor Hooks (3 updates, 1 creates)
- Talent Effects Hooks (1 creates)
- Progression Hooks (1 update)
- Language Module (3 updates)
- Snapshot Manager (1 update)

**Total:** 5 files, 8 mutations
**Estimated Effort:** 1 hour

---

### BATCH 11: INFRASTRUCTURE & MIGRATIONS
**Priority: LOW** — Infrastructure and data migrations

**Systems:**
- Data & Migrations (2 updates)
- Document API (1 update, 3 creates)
- Migration Manager (1 update)
- Runtime Safety (1 update, 1 creates)
- World Repair (1 update)
- ID Migration (1 update)
- Build Tools (1 creates)

**Total:** 7 files, 7 updates, 6 creates
**Estimated Effort:** 1 hour

---

## Summary Statistics

| Batch | System | Files | Mutations | Effort | Priority |
|-------|--------|-------|-----------|--------|----------|
| 3 | Progression | 22 | 60+ | ✅ Done | CRITICAL |
| 4 | Core Engines | 15 | 40 | 2-3h | CRITICAL |
| 5 | Talents | 4 | 35 | 1-2h | HIGH |
| 6 | Sheet UI | 4 | 22 | 1.5-2h | MEDIUM-HIGH |
| 7 | Utilities | 8 | 17 | 1-1.5h | MEDIUM |
| 8 | Item Creation | 12 | 40 | 1.5-2h | MEDIUM |
| 9 | App Dialogs | 12 | 17 | 1.5-2h | LOW-MEDIUM |
| 10 | Hooks | 5 | 8 | 1h | MEDIUM |
| 11 | Infrastructure | 7 | 14 | 1h | LOW |
| **TOTAL** | | **89** | **250+** | **12-15h** | |

---

## Architecture Coverage

### Phase 3 Governance Scope
- **Progression System:** ✅ 100% Complete
- **Combat & Effects:** ⏳ Ready (BATCH 4-5)
- **Character Sheet:** ⏳ Ready (BATCH 6)
- **Utilities:** ⏳ Ready (BATCH 7)
- **Item Management:** ⏳ Ready (BATCH 8)
- **UI/Dialogs:** ⏳ Ready (BATCH 9)
- **Infrastructure:** ⏳ Ready (BATCH 10-11)

### Complete System Coverage
After all 11 batches complete:
- **All actor mutations governed** by Sentinel MutationIntegrityLayer
- **All mutation transactions audited** with invariant enforcement
- **All operations atomic** with bounded mutation counts
- **Constitutional mutation authority** across entire system

---

## Next Steps

### Immediate (BATCH 4)
1. Route 15 core engine system files
2. Create policies for combat/force/effects operations
3. Test orchestration patterns from BATCH 3
4. Commit with transaction reports

### Short-term (BATCHES 5-8)
1. Route high-mutation systems (talents, sheets)
2. Establish patterns for UI-driven mutations
3. Consolidate item creation workflows

### Medium-term (BATCHES 9-11)
1. Route remaining UI and dialogs
2. Harden hooks and lifecycle
3. Complete infrastructure

---

## Rollout Strategy

**Phase A (BATCH 3-4):** ✅ Done + BATCH 4
- Core mutation governance locked
- Progression + core engines atomic

**Phase B (BATCH 5-7):** Talent, UI, Utilities
- Major gameplay systems governed
- 50%+ system coverage

**Phase C (BATCH 8-9):** Item creation and dialogs
- User interactions governed
- 75%+ system coverage

**Phase D (BATCH 10-11):** Infrastructure
- Complete coverage
- 100% system governance

---

## Enforcement Model

All batches follow same pattern:
1. **Identification:** Find direct mutations
2. **Import ActorEngine:** Add static import
3. **Route mutations:** Replace actor.update/create with ActorEngine calls
4. **Verify Sentinel:** Transaction counts validate
5. **Commit:** Document pattern and count
6. **Test:** Run integration tests

---

**Estimated Total Effort:** 12-15 hours to complete full system governance
**Benefit:** Constitutional mutation authority + 100% audit trail + invariant enforcement across all SWSE systems
