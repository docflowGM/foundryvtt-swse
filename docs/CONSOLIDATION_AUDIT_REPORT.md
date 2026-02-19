# SWSE CODEBASE CONSOLIDATION AUDIT
## Full Structural Analysis & Consolidation Plan

**Report Generated**: 2026-02-19
**Total Files Analyzed**: 698
**Directories**: 44
**Engine Classes**: 30+
**Critical Shadow Systems**: 5
**Consolidation Opportunity**: MASSIVE

---

## EXECUTIVE SUMMARY

**System Status**: FRACTURED — V1 and V2 systems running in parallel with significant overlap and authority confusion.

### Key Metrics

| Metric | Value | Impact |
|--------|-------|--------|
| Total JS Files | 698 | Massive scope |
| Core V2 Engines | 5 | Authoritative |
| Domain-Specific Engines | 25+ | Underutilized |
| Shadow System Files | 200+ | CRITICAL RISK |
| Files Importing RollEngine | 11 | Should be 100+ |
| Derived Data Implementations | 21 | Single-truth VIOLATED |
| Condition Track Implementations | 51 | Authority unclear |
| Roll Logic Outside RollEngine | 114 | Modifier bypass risk |
| V1 Legacy (.data. pattern) | 135 instances | Incomplete migration |
| Unported Subsystems | 2 major (144 files) | Must preserve |

---

## CRITICAL FINDINGS

### 1. **SHADOW SYSTEM — Derived Data Calculation** (CRITICAL)
- **Authority Crisis**: prepareDerivedData in 21 different files
- **Risk**: Fields computed multiple times, potential desync
- **Impact**: Data integrity compromised

### 2. **SHADOW SYSTEM — Condition Track** (CRITICAL)
- **Authority Crisis**: 51 files touching conditionTrack
- **Risk**: Multiple implementations, no single authority
- **Impact**: State management reliability compromised

### 3. **SHADOW SYSTEM — Roll Logic** (CRITICAL)
- **Authority Crisis**: 114 files doing roll logic outside RollEngine
- **Risk**: Modifiers not applied uniformly
- **Impact**: Combat consistency compromised

### 4. **SHADOW SYSTEM — Modifier Stacking** (CRITICAL)
- **Authority Crisis**: Calculations in multiple locations
- **Risk**: Bonuses applied inconsistently
- **Impact**: Balance and fairness compromised

### 5. **UNPORTED SUBSYSTEM — Progression** (MAJOR)
- **Status**: 76 files, completely separate from ActorEngine
- **Risk**: Not integrated with V2 actor system
- **Verdict**: PRESERVE (too critical to delete)

### 6. **UNPORTED SUBSYSTEM — Suggestion/Mentor** (MAJOR)
- **Status**: 68 files, completely separate from AbilityEngine
- **Risk**: Not integrated with V2 ability system
- **Verdict**: PRESERVE (too critical to delete)

---

## DOMAIN ANALYSIS

| Domain | V1 Files | V2 Engine | Authority Status | Shadow Systems | Consolidation Need |
|--------|----------|-----------|------------------|-----------------|-------------------|
| **Combat Rolls** | 6 | RollEngine | Correct but not adopted | 4+ direct Roll() | CRITICAL |
| **Derived Stats** | 5 | SWSEV2BaseActor | Correct but duplicated | 21 implementations | CRITICAL |
| **Condition Track** | Multiple | None | Missing | 51 files | CRITICAL |
| **Modifier Stacking** | Multiple | ModifierEngine | Correct but not adopted | 4+ locations | CRITICAL |
| **Talent/Ability** | 24 | AbilityEngine | Correct but not adopted | Scattered mechanics | HIGH |
| **Progression** | 76 | ActorEngine | Partially integrated | Own subsystem | MEDIUM |
| **Force Powers** | Multiple | ForceEngine | DEAD (0 imports) | Scattered | MEDIUM |

---

## CONSOLIDATION PLAN

### KEEP (Authoritative V2 Engines)
- ✅ RollEngine (rolls authority)
- ✅ ActorEngine (actor updates authority)
- ✅ AbilityEngine (abilities authority)
- ✅ ModifierEngine (modifiers authority)
- ✅ SWSEV2BaseActor (V2 actor archetype)
- ✅ SentinelEngine (system integrity)
- ✅ V2 Sheet implementations

### MERGE INTO ENGINE (15 files)
1. /combat/rolls/ → RollEngine adapters
2. /talents/mechanics → AbilityEngine
3. /engine/TalentAbilitiesEngine → AbilityEngine (merge registry)
4. /combat/feint-mechanics → CombatEngine (new)
5. /combat/saber-lock-mechanics → CombatEngine (new)
6. All modifier calculations → ModifierEngine
7. All condition logic → ConditionTrackEngine (new)
8. All force power logic → ForceEngine (reactivate)

### ARCHIVE (15 files)
- /actors/base/swse-actor-base.js (V1 legacy)
- /progression/ (76 files - too large to migrate)
- /suggestion-engine/ (26 files - too large to migrate)
- /mentor/ (42 files - too large to migrate)
- /apps/levelup/, /apps/chargen/ (V1 systems)
- Data model files (V1 reference)

### DELETE (20+ files)
- /combat/swse-combatant.js (duplicate)
- /engine/force-power-categories.js (metadata)
- /engine/audit/ (debug tools)
- /debug/, /dev/, /tests/ (development)
- Unused metadata files

---

## FINAL ENGINE STRUCTURE

```
CORE ENGINES
├── RollEngine [All rolls, combat, initiative, skills, force]
├── ActorEngine [Actor updates, recalc triggers]
├── AbilityEngine [Abilities, talents, racial abilities]
├── ModifierEngine [Modifier stacking & application]
├── DerivedCalculator [Derived stats computation]
└── SentinelEngine [System integrity monitoring]

DOMAIN ENGINES
├── DamageEngine [Damage application]
├── ConditionTrackEngine [Condition mechanics]
├── ForceEngine [Force points & powers]
├── CombatEngine [Combat-specific rules]
├── EncumbranceEngine [Encumbrance]
└── InventoryEngine [Inventory management]

PRESERVED SUBSYSTEMS
├── ProgressionSubsystem [Leveling & XP - 76 files]
├── SuggestionSubsystem [CharGen - 68 files]
└── StarshipSubsystem [Starship mechanics]

SUPPORT
├── Utilities [43 files]
├── Helpers [Handlebars]
├── Services [Drop service, etc.]
└── Config [Configuration]
```

---

## RISK MATRIX

| Risk | Severity | Current State | After Consolidation |
|------|----------|---------------|-------------------|
| Derived data desync | CRITICAL | 21 implementations | Single source |
| Roll modifier bypass | CRITICAL | 114 files bypass | All routed |
| Condition track desync | CRITICAL | 51 implementations | Single engine |
| Modifier inconsistency | CRITICAL | Scattered logic | Centralized |
| V1 still running | HIGH | 135 .data. usages | Eliminated |

---

## IMPLEMENTATION ROADMAP

### Session 1 (COMPLETED)
- ✅ Fix NPC sheet Roll() bypass
- ✅ Fix critical combat mechanics
- ✅ Fix talent systems
- ✅ Complete 12/104 Roll() fixes

### Session 2 (NEXT)
- Complete Roll() elimination (92 instances)
- Consolidate /combat/rolls/ to RollEngine adapters

### Session 3
- Eliminate duplicate prepareDerivedData() (21 → 1)
- Consolidate derived stat calculation

### Session 4
- Consolidate modifier calculations to ModifierEngine
- Eliminate modifier shadow systems

### Session 5
- Merge AbilityEngine and TalentAbilitiesEngine
- Consolidate all talent mechanics

### Future (Major Subsystems)
- Plan Progression subsystem integration
- Plan Suggestion/Mentor subsystem integration

---

## CONCLUSION

The SWSE codebase is in a **TRANSITION STATE**:
- V2 engines exist but are **underutilized** (RollEngine: 11 imports, should be 100+)
- V1 systems **continue running in parallel** (135 legacy usages)
- **Multiple shadow systems duplicate logic** (200+ files, 21 derived data implementations)
- **Authority is unclear** across all major domains

**This is NOT a feature-phase issue. This is an architectural stabilization crisis.**

The consolidation plan is **executable** and will result in:
- Single source of truth per domain
- Unified roll processing (RollEngine authority)
- Unified actor updates (ActorEngine authority)
- Unified abilities (AbilityEngine authority)
- Unified modifiers (ModifierEngine authority)
- Eliminated duplicate computation
- Improved determinism and debuggability

**Target State**: All 698 files organized under 5-6 authoritative engines with zero shadow systems.

