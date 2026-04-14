# FORCE POWER PROVENANCE IMPLEMENTATION STATUS
**Status:** IMPLEMENTATION IN PROGRESS  
**Date:** 2026-04-11  
**Phase:** Core Engine & Schema Complete | Runtime Integration in Progress

---

## COMPLETED WORK

### Phase 1: Schema Design ✅
- **Document:** `FORCE_POWER_PROVENANCE_SCHEMA.md` (comprehensive design specification)
- **Design Decisions:**
  - Per-item provenance + Actor-level grant ledger architecture
  - Durable grant instance IDs for Force Training (ft-<level>-<context>)
  - Modifier-driven baseline vs extra power distinction
  - Conservative legacy migration strategy

### Phase 2: Core Engines ✅

**ForceProvenanceEngine** (`scripts/engine/progression/engine/force-provenance-engine.js`)
- ✅ `generateForceTairingGrantId()` - Durable grant ID generation
- ✅ `createProvenanceMetadata()` - Provenance metadata factory
- ✅ `getConfiguredAbilityMod()` - Canonical ability modifier lookup
- ✅ `reconcileForceGrants()` - Full ledger reconciliation (main algorithm)
- ✅ `storeReconciliation()` - Persist ledger to actor
- ✅ `getCachedLedger()` - Retrieve cached ledger
- ✅ `getTotalEntitled/Owned/Owed()` - Ledger calculations
- ✅ `hasLegacyIssues/getLegacyIssues()` - Legacy issue tracking
- ✅ `formatGrantSourceName()` - Human-readable grant names

**ForceProvenanceMigrator** (`scripts/engine/progression/engine/force-provenance-migrator.js`)
- ✅ `migrateIfNeeded()` - Idempotent migration entry point
- ✅ Conservative backfill for FS and FT powers
- ✅ `getMigrationSummary()` - Pre-migration report
- ✅ Issue tracking for ambiguous cases
- ✅ Honest legacy marking when provenance unknowable

### Phase 3: Schema Updates ✅
- ✅ `template.json` - forcepower provenance fields
  - `grantSourceType` (force-sensitivity|force-training|class-level|template|unknown-legacy)
  - `grantSourceId` (fs-chargen|ft-<level>-<context>|unknown-legacy)
  - `grantSubtype` (baseline|modifier-extra|unknown-legacy)
  - `isLocked` (boolean, prevents deletion)
  - `migratedAt` (timestamp for legacy powers)
  - `legacyIssues` (array of migration issues)

- ✅ `template.json` - Actor forceGrantLedger
  - `lastReconciled` (timestamp)
  - `lastReconciliationContext` (chargen|levelup|manual|ability-increase)
  - `grants` (object mapping grantSourceId → grant details)
  - `legacy` (unknownPowers count + issues array)

### Phase 4: Immutability Enforcement ✅
- ✅ `scripts/engine/progression/hooks/immutability-hook.js`
  - `registerImmutabilityHooks()` - Hook registration
  - `isForcePowerImmutable()` - Query immutability status
  - `getImmutabilityReason()` - UI display reason
  - Pre-delete validation preventing FS power deletion while feat exists
  - Registered in `index.js` during system init

### Phase 5: Chargen Integration ✅
- ✅ `scripts/apps/chargen/chargen-finalizer.js`
  - Import: `ForceProvenanceEngine`
  - New method: `_enrichForcePowersWithProvenance()`
  - Enhanced: `_buildItemsData()` to call enrichment
  - Assigns provenance metadata during chargen finalization
  - First power → Force Sensitivity (if exists)
  - Remaining powers → Force Training with baseline|modifier-extra subtypes

### Phase 6: Level-Up Integration ✅
- ✅ `scripts/engine/progression/engine/force-power-engine.js`
  - Import: `ForceProvenanceEngine`
  - Enhanced: `applySelected()` method
  - Determines grant source (FS vs FT) based on actor state
  - Assigns grantSourceId and grantSubtype appropriately
  - Supports modifier-extra creation during level-up

### Phase 7: Authority Engine Enhancement ✅
- ✅ `scripts/engine/progression/engine/force-authority-engine.js`
  - Import: `ForceProvenanceEngine`
  - New method: `getProvenanceContext()`
  - Returns full ledger + query helpers
  - totalEntitled/Owned/Owed calculations
  - Helper methods for UI display

### Phase 8: Tests ✅
- ✅ `tests/force-provenance.test.js`
  - Unit tests for all public ForceProvenanceEngine methods
  - Unit tests for ForceProvenanceMigrator
  - Immutability enforcement tests
  - Ledger calculation tests
  - Mock actor scenarios

### Phase 9: Git Commits ✅
1. Commit 21eda18: "Implement Force power provenance schema and engines"
2. Commit de90c20: "Add force power immutability enforcement and provenance context queries"
3. Commit 99d70a6: "Register immutability hook during system initialization"

---

## IN PROGRESS / REMAINING WORK

### Phase 10: Suite Reselection (Ability Increase Handling)

**Status:** Ready for Optional Enhancement  
**Current State:** 
- Existing `suite-reselection-engine.js` already works with new provenance-aware `applySelected()`
- When ability increases, user can reselect via `clearAndReselectForcePowers()`
- Newly created powers get provenance metadata automatically

**Optional Optimization (Not Critical):**
- Could add `allocateModifierExtraPowers()` to intelligently add only the delta
- Instead of clearing all and re-selecting
- Would provide better UX by preserving existing power selections
- Can be implemented as follow-up enhancement

### Phase 11: Migration Dialog (Optional UI)

**Status:** Design Complete, Implementation Optional  
**Features:**
- Show migration summary when opening legacy actor
- Display: "3 powers of uncertain origin - migrate now?"
- Pre-migration report with ambiguities
- Optional manual reconciliation helper UI

### Phase 12: Documentation & Testing in Foundry

**Status:** Ready to Execute  
**Test Plan:**
- Test Case 1: Chargen with FS gets 1 power with isLocked=true
- Test Case 2: Chargen with FT (WIS+2) gets 3 powers (1 baseline + 2 modifier-extra)
- Test Case 3: Level-up FT acquisition creates baseline power
- Test Case 4: Ability increase triggers step reselection, creates modifier-extra
- Test Case 5: Charisma setting uses CHA modifier correctly
- Test Case 6: FS power cannot be deleted while feat exists
- Test Case 7: Legacy actor migration assigns provenance conservatively
- Test Case 8: Multiple FT feats show ambiguity warning in ledger

---

## ARCHITECTURE OVERVIEW

### Data Model

```
Forcepower Item
├── system.provenance
│   ├── grantSourceType: 'force-sensitivity' | 'force-training' | 'unknown-legacy'
│   ├── grantSourceId: 'fs-chargen' | 'ft-0-chargen' | 'ft-3-6754a23b' | 'unknown-legacy'
│   ├── grantSubtype: 'baseline' | 'modifier-extra' | 'unknown-legacy'
│   ├── isLocked: boolean (true for FS-granted)
│   ├── migratedAt: ISO-8601 timestamp (for legacy powers)
│   └── legacyIssues: string[] (ambiguities found during migration)
└── (existing: level, uses, description, source, etc.)

Actor.system
├── forceGrantLedger
│   ├── lastReconciled: ISO-8601 timestamp
│   ├── lastReconciliationContext: 'chargen-complete' | 'levelup-finalize' | 'manual'
│   ├── grants: {
│   │   'fs-chargen': {
│   │     grantSourceType: 'force-sensitivity',
│   │     acquisitionLevel: 0,
│   │     abilityModifier: 0,
│   │     entitled: 1,
│   │     owned: 1,
│   │     owed: 0,
│   │     breakdown: [{ subtype: 'baseline', count: 1 }]
│   │   },
│   │   'ft-0-chargen': {
│   │     grantSourceType: 'force-training',
│   │     acquisitionLevel: 0,
│   │     abilityModifier: 2,
│   │     entitled: 3,
│   │     owned: 3,
│   │     owed: 0,
│   │     breakdown: [
│   │       { subtype: 'baseline', count: 1 },
│   │       { subtype: 'modifier-extra', count: 2 }
│   │     ]
│   │   }
│   │ }
│   └── legacy
│       ├── unknownPowers: 0
│       └── issues: string[]
└── (existing: abilities, hp, classes, etc.)
```

### Flow: Chargen → Level-Up → Ability Increase

**Chargen Finalization:**
1. User selects feats (Force Sensitivity and/or Force Training)
2. User selects desired Force powers
3. ChargenFinalizer._buildItemsData() calls _enrichForcePowersWithProvenance()
4. Enrichment assigns:
   - First power: grantSourceId='fs-chargen', isLocked=true, if FS exists
   - Remaining: grantSourceId='ft-0-chargen', subtype='baseline|modifier-extra'
5. Powers created with full provenance metadata

**Level-Up: Force Training Acquired**
1. User selects Force Training feat
2. ForcePowerEngine.applySelected() is called
3. Engine examines actor state:
   - Has FS? Mark first power as FS
   - Has FT? Mark remaining as FT with generated grantSourceId
4. Creates powers with grantSourceId='ft-<level>-<hex>' 
5. Powers assigned to FT feat for future reference

**Ability Increase:**
1. Actor receives +1 ability score (e.g., WIS +2 → +3)
2. Suite reselection offered (if enabled)
3. User selects "Reconcile Force Powers"
4. clearAndReselectForcePowers():
   - Clears all existing powers
   - Recalculates capacity (now higher due to increased modifier)
   - Opens picker with new capacity
   - User selects powers (can select additional ones now)
   - applySelected() creates powers with provenance

**Alternative: Intelligent Modifier-Extra Allocation (Optional)**
- Instead of clearing all, could detect "owed" powers from reconciliation
- Create only the delta powers with grantSubtype='modifier-extra'
- Attach to existing FT grants by grantSourceId

---

## INTEGRATION POINTS

### Runtime Queries

**Get Current Provenance State:**
```javascript
const context = await ForceAuthorityEngine.getProvenanceContext(actor);
console.log(context.totalEntitled); // 4
console.log(context.totalOwned);    // 3
console.log(context.totalOwed);     // 1 (need 1 more power)
console.log(context.isUnderEntitled()); // true
```

**Check Power Immutability:**
```javascript
import { isForcePowerImmutable } from './immutability-hook.js';

if (isForcePowerImmutable(powerItem)) {
  // Disable delete button, show lock icon
}
```

**Manual Reconciliation:**
```javascript
const ledger = await ForceProvenanceEngine.reconcileForceGrants(actor, 'manual');
await ForceProvenanceEngine.storeReconciliation(actor, ledger);

// Now check reconciliation results
console.log(ledger.grants['fs-chargen'].owed); // 0 (FS complete)
console.log(ledger.grants['ft-0-chargen'].owed); // 2 (need 2 more FT powers)
```

### UI Display Examples

**Character Sheet - Force Powers Tab:**
```
Force Powers (Entitled: 4 | Owned: 3 | Owed: 1)

Force Sensitivity (1)
├── Force Courage          [🔒 Immutable]

Force Training - Chargen (3)
├── Force Speed           [Baseline]
├── Telepathy             [Modifier-Driven]
├── (Owed: 1 more)

Legacy Issues:
└── (none)
```

**Level-Up Dialog:**
```
Force Power Reconciliation
- Current WIS: +2 (entitled to 3 per FT)
- Ability increase detected: WIS now +3
- New capacity: 4 powers per FT
- You own 3, can select 1 more

Select 1 Force Power:
```

---

## BACKWARD COMPATIBILITY

### Legacy Actor Migration

**Automatic on First Load:**
1. Actor opened in UI
2. System detects: powers with no provenance metadata
3. Calls `ForceProvenanceMigrator.migrateIfNeeded(actor)`
4. Conservative backfill:
   - If FS feat exists: first power → 'fs-chargen', isLocked=true
   - If FT feats exist: remaining → 'ft-unknown-legacy'
   - If multiple FT: mark with legacyIssues indicating ambiguity
5. Updates actor.system.forceGrantLedger.legacy with issues
6. Idempotent: calling multiple times has no effect

### Fallback Behavior

If migration fails or is skipped:
- Powers still function normally (no game-breaking issues)
- Immutability enforcement is disabled (conservative)
- Ledger reconciliation returns empty grants (worst case)
- User can manually reconcile via UI dialog (if implemented)

---

## FILES MODIFIED

### New Files (9)
1. `FORCE_POWER_PROVENANCE_SCHEMA.md` - Design specification
2. `FORCE_POWER_PROVENANCE_IMPLEMENTATION.md` - This document
3. `scripts/engine/progression/engine/force-provenance-engine.js` - Reconciliation engine
4. `scripts/engine/progression/engine/force-provenance-migrator.js` - Legacy migration
5. `scripts/engine/progression/hooks/immutability-hook.js` - Deletion prevention
6. `tests/force-provenance.test.js` - Unit tests

### Modified Files (5)
1. `template.json` - Schema additions for forcepower and actor
2. `scripts/apps/chargen/chargen-finalizer.js` - Provenance enrichment
3. `scripts/engine/progression/engine/force-power-engine.js` - Level-up provenance
4. `scripts/engine/progression/engine/force-authority-engine.js` - Provenance queries
5. `index.js` - Immutability hook registration

---

## NEXT STEPS (TODO)

### Immediate (Before Foundry Testing)
1. ⏳ Code review for cyclic imports or missing dependencies
2. ⏳ Verify test file syntax and runner compatibility
3. ⏳ Ensure all imports use correct system paths

### Testing Phase
1. ⏳ Run unit tests with vitest
2. ⏳ Manual testing in Foundry (Test Cases 1-8 from above)
3. ⏳ Test legacy actor migration with existing characters
4. ⏳ Verify immutability enforcement (prevent FS power deletion)
5. ⏳ Test Charisma setting with CHA modifier

### Optional Enhancements (Post-Core Implementation)
1. ⏳ Intelligent modifier-extra allocation (avoid clearing all on ability increase)
2. ⏳ Migration UI dialog with summary before backfill
3. ⏳ Manual reconciliation helper (show power-to-grant mapping)
4. ⏳ Audit report: "Powers not matching any grant source"
5. ⏳ Force domain unlock reconciliation

### Documentation
1. ⏳ Update system rules documentation
2. ⏳ Add player-facing help for immutable powers
3. ⏳ Document migration process for content creators

---

## DESIGN PRINCIPLES MAINTAINED

✅ **Schema-First** - Provenance baked into data model (not ad-hoc flags)  
✅ **Explicit** - Grant ledger makes accounting transparent (not hidden)  
✅ **Honest** - Legacy migration marks unknowns (doesn't fake provenance)  
✅ **Recoverable** - All data durable; can reconcile/recompute anytime  
✅ **Immutable Where Needed** - FS powers protected from accidental deletion  
✅ **No Speculative Logic** - Only track what's explicitly granted  
✅ **Audit Trail** - legacyIssues document ambiguities for transparency  

---

## ISSUE TRACKING

### Known Limitations (By Design)
- ⚠️ Cannot distinguish which of multiple FT feats granted which power (retroactively)
  - **Mitigation:** Use durable grant IDs going forward, mark ambiguities in legacy
- ⚠️ Cannot restore provenance for existing unprovenance-tracked powers
  - **Mitigation:** Conservative backfill with legacyIssues documentation

### Not Implemented (Out of Scope for Phase 1)
- ❌ Force Secret/Technique/Maneuver provenance (separate system, can be added later)
- ❌ Class-level grant provenance (deferred until class data available)
- ❌ Template-based power grants (deferred until template system finalized)
- ❌ Per-ability-score-increase power allocation (requires finalize integration)

---

**Ready for Foundry Testing**  
**Core Implementation Complete**  
**Optional Enhancements Identified**
