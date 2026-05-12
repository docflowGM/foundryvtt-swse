# Phase 8: Store, NPC, and Compendium SSOT Alignment Audit

**Audit Date**: 2026-05-12  
**Status**: Complete — All Systems Conforming  
**Scope**: Store systems, NPC systems, compendium data, and import helpers

---

## Executive Summary

All inspected systems conform to the locked character actor/sheet contracts:
- ✅ **Store systems**: Use ActorEngine correctly, no problematic data writes
- ✅ **NPC systems**: Share character derived contract, no computed-field writes
- ✅ **Compendium data**: No direct ability/BAB/level writes, metadata flags only
- ✅ **No danger spots detected**: No effects writing to system.abilities.*.mod, system.derived.attributes.*, or system.class in mechanics

All systems are safe to keep as-is. No immediate fixes needed.

---

## Locked Contracts (from Character Sheet Phase)

1. **Ability Scores**
   - Canonical persistent input: `system.attributes.<ability>.{base,racial,enhancement,temp}`
   - Compatibility alias: `system.abilities.<ability>.*` (read-only for production)
   - Computed output: `system.derived.attributes.<ability>.{total,mod}` (read-only)

2. **Class / Level**
   - Canonical: `system.progression.classLevels` (per-class levels), `system.level` (total)
   - Legacy: `system.class` (manual display fallback only)
   - Rule: `system.level = sum(classLevels[*].level)` when classLevels exists

3. **Origin Fields** (separate)
   - `system.background`, `system.event`, `system.profession`, `system.planetOfOrigin`

4. **NPC Mode**
   - Progression mode: Uses calculated values via DerivedCalculator
   - Statblock mode: Uses manual values, but does not write to computed fields

---

## Phase 8 Audit Results

### A. Store Systems

**Files Inspected**:
- `scripts/engine/store/store-engine.js`
- `scripts/engine/store/store-transaction-engine.js`
- `scripts/engine/store/ledger-service.js`
- `scripts/apps/store/store-checkout.js`
- `scripts/engine/store/store-constants.js`

**Findings**:

✅ **Actor Data Writes**:
- Location: `store-transaction-engine.js:99, 110, 277, 482`
- Pattern: All use `ActorEngine.updateActor(actor, {...})`
- Safe: Correct mutation gateway used, triggers prepareDerivedData()
- Data touched: `system.credits` (canonical), `items` (normal creation)
- Not touched: `system.attributes`, `system.abilities`, `system.class`, `system.level`, `derived.*`

✅ **Item-Data Writes**:
- Purchases create new items in actor inventory
- No compendium source mutation (items cloned/normalized)
- Safe: Normal Foundry item creation pattern

✅ **Credit Tracking**:
- Canonical field: `system.credits`
- Properly persisted and read via LedgerService
- No legacy credit paths detected

**Classification**: **CONFORMING** ✅
- Store systems respect all locked contracts
- No ability/BAB/class/level data drift possible
- No migration needed

---

### B. NPC Systems

**Files Inspected**:
- `scripts/actors/v2/npc-actor.js`
- `scripts/actors/npc/npc-mode-adapter.js`
- `scripts/actors/npc/npc-profile-builder.js`
- `scripts/sheets/v2/npc-sheet.js`
- `scripts/actors/npc/` (full directory)

**Findings**:

✅ **NPC Derived Computation**:
- Location: `npc-actor.js:19-20`
- Pattern: `export function computeNpcDerived(actor, system) { computeCharacterDerived(actor, system); }`
- Intent: NPCs share identical derived contract with characters (intentional, per Phase 2)
- Pipeline: Uses same `DerivedCalculator.computeAll()` as characters
- Safe: No NPC-specific computed-field writes

✅ **NPC Data Model**:
- Character-data-model.js line 413: `const isNpc = actor?.type === 'npc';`
- NPCs use the same `system.attributes.*` schema as characters
- No NPC-specific ability path found
- `system.abilities.*` alias applies to NPCs identically
- Safe: No data drift between NPC and character ability handling

✅ **NPC Mode Handling**:
- File: `npc-mode-adapter.js`
- Two modes: Progression (calculated) vs Statblock (manual)
- Pattern: Clear documented switch, no accidental hybrid writes
- Safe: Mode intent is explicit and enforced

✅ **NPC Sheets**:
- File: `scripts/sheets/v2/npc-sheet.js`, `npc-full-sheet.js`, `npc-combat-sheet.js`
- Pattern: Read prepared context (like character sheets)
- No direct system field reads detected (uses view-models)
- Safe: Consistent with character sheet contract

**Classification**: **CONFORMING** ✅
- NPCs respect character actor/sheet contracts
- Derived computation uses same pipeline as characters
- Mode handling is clear and documented
- No migration needed

**Special Note**: NPCs intentionally share the derived contract with characters. This is by design (Phase 2). If NPC-specific differences are needed in future, the architecture supports them (separate functions, same signature).

---

### C. Compendium Data and Effects

**Packs/Source Directories Inspected**:
- `/packs/` (Foundry .db format)
  - `armor-*.db` (armor items)
  - `backgrounds.db` (background)
  - `classes.db` (classes)
  - `combat-actions.db` (actions)
  - `beasts.db`, `droids.db` (creatures/NPCs)
  - `equipment-*.db` (items)
  - `feats.db`, `talents.db` (abilities)
  - `weapons.db` (weapons)
- `/data/` (JSON source files)
  - `class-features.json`
  - `force-techniques.json`
  - `force-secrets.json`
  - `talent-granted-abilities.json`
  - `species-abilities-migrated.json`

**Findings**:

✅ **Ability Effect Metadata**:
- Example: `system.abilities.dex.applyToDamage` in talents.fixed.json
- Purpose: Feature flag metadata (not score/mod/total)
- Pattern: Using `system.abilities` namespace for compatibility
- Safe: Setting flags only, not writing ability scores
- No computed-field writes detected

✅ **Ability Score Grants**:
- Format: Defined in `talent-granted-abilities.json`, `species-abilities-migrated.json`
- Path: Grants target correct persistent fields (base/racial/enhancement)
- Safe: Not writing to aliases or computed fields
- Process: Handled by progression/item-effect pipeline

✅ **Class Feature Data**:
- File: `class-features.json`
- Content: HP per level, BAB progression, skill grants
- Structure: Per-level definitions, not scalar assignments
- Safe: DerivedCalculator reads these at evaluation time
- Note: No `system.class` scalar lookups found in mechanics

✅ **Species / Background Data**:
- File: `species-abilities-migrated.json`
- Format: Defines ability bonuses (racial modifiers)
- Target: `system.attributes.<ability>.racial` (canonical)
- Safe: Correct persistent input path used

✅ **Compendium Source Integrity**:
- No direct writes to `system.derived.attributes.*` in effect data
- No writes to `system.abilities.*.{mod,total}` (computed fields)
- No scalar `system.class` or `system.race` dependencies in feature mechanics
- Legacy references exist (e.g., `system.race` in old data) but are not actively used by mechanics

**Classification**: **CONFORMING** ✅
- Compendium effects respect all locked contracts
- No ability/class/BAB/level data corruption vectors
- Metadata flags use compatibility alias correctly
- No migration needed

**Special Note**: Some legacy compendium data may have `system.race` or `system.class` fields from old builds, but these are not read by active game mechanics (which use `system.species` and `system.progression.classLevels`).

---

### D. Import / Build / Normalization Scripts

**Files Inspected**:
- `scripts/engine/import/npc-template-importer-engine.js`
- `scripts/core/npc-template-data-loader.js`
- `scripts/maintenance/inspect-packs.js`
- `scripts/migration/migrate-force-powers-in-packs.js`
- `scripts/apps/npc-import-customization-wizard.js`

**Findings**:

✅ **NPC Template Importer**:
- Pattern: Loads NPC templates and normalizes to actor data
- Writes: Via ActorEngine (correct pattern)
- Normalization: Maps template data to canonical actor schema
- Safe: Uses same schema as manual character creation

✅ **Pack Migration Scripts**:
- Example: `migrate-force-powers-in-packs.js`
- Purpose: Update pack data as schema evolves
- Pattern: Direct pack updates (not actor-level)
- Safe: Not writing computed fields
- Note: These are tooling scripts, not user-facing migrations

✅ **Data Loader**:
- File: `npc-template-data-loader.js`
- Purpose: Load from compendium and prepare for NPC creation
- Safe: No data mutation during load
- Pattern: Read-only access, returns normalized data

**Classification**: **CONFORMING** ✅
- Importers use ActorEngine correctly
- Pack tools don't corrupt canonical paths
- No actor/world migration code (as expected for unpublished system)

---

## Writer Inventory Table

| File | Path Read/Written | Purpose | Classification | Risk |
|------|------------------|---------|-----------------|------|
| store-transaction-engine.js | `system.credits` | Credit deduction | Conforming | None |
| store-engine.js | Item creation | Inventory granting | Conforming | None |
| npc-actor.js | `system.derived.*` (read/compute) | Derived stats | Conforming | None |
| npc-mode-adapter.js | Mode flag | Manual vs progression | Conforming | None |
| DerivedCalculator.js | `system.attributes.*` (read) | Ability computation | Conforming | None |
| DerivedCalculator.js | `system.derived.attributes.*` (write) | Computed output | Conforming | None |
| talents.fixed.json | `system.abilities.*` (flag metadata) | Feature flags | Conforming | None |
| species-abilities-migrated.json | `system.attributes.*.racial` | Ability bonuses | Conforming | None |
| character-record-header.hbs | `system.class` (read) | Legacy display fallback | Legacy but harmless | Low |
| npc-sheet.js | Prepared context (read) | UI binding | Conforming | None |

---

## Confirmed Bugs

**Status**: None found ✅

All systems either conform to or intentionally differ from character contracts with clear documentation.

---

## Recommended Next Steps

### Phase 8 Outcome
- ✅ Store systems are production-ready
- ✅ NPC systems are production-ready
- ✅ Compendium data is clean
- ✅ No critical path misalignment
- ✅ No actor/world migration needed

### Future Recommendations
1. **NPC-Specific Enhancements** (Optional, no urgency):
   - If `computeNpcDerived()` needs NPC-specific logic in future, the architecture supports it
   - Current delegation pattern allows easy extension without breaking compatibility

2. **Legacy Cleanup** (Optional, post-publish):
   - After system publication, if needed: deprecate `system.race` references
   - Current code doesn't rely on `system.race` for mechanics
   - Low migration risk when/if done

3. **Documentation** (Optional):
   - Add explicit comment in `npc-actor.js` explaining the intentional character/NPC derived equivalence
   - Document NPC mode contract in `npc-mode-adapter.js` (already clear, just formalizing)

---

## Conclusion

Phase 8 audit is **COMPLETE AND CLEAN**.

All store, NPC, and compendium systems conform to the locked character actor/sheet contracts. No bugs found. No migration scripts needed. No immediate code/data fixes required.

The SWSE system is ready for production development with these systems as-is.

| Phase | Result |
|-------|--------|
| Character sheet (0-7) | ✅ Locked, no migration needed |
| Store/NPC/Compendium (8) | ✅ Conforming, no migration needed |
| **Total Audit Status** | **✅ COMPLETE & CLEAN** |
