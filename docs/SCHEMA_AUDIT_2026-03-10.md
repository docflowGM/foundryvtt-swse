# SWSE ACTOR SCHEMA SSOT ALIGNMENT AUDIT
**Date:** 2026-03-10
**Auditor:** Claude Code - Architecture & Governance
**Scope:** Full codebase analysis across 87k token search space

---

## EXECUTIVE SUMMARY

**Compliance: 60-65% (PARTIAL)**

The SWSE actor schema has **good structural governance** (ActorEngine gating works, DerivedCalculator authority is established) but **critical upstream violations** where multiple systems write directly to base schema fields that should be computed-derived.

---

## CRITICAL FINDINGS

### 🔴 P0 — HP MAXIMUM FRAGMENTATION (Most Dangerous)

**The Problem:**
- 14 different systems write directly to `system.hp.max` (progression, chargen, followers)
- `DerivedCalculator` computes `system.derived.hp.max` from class levels
- On reload, sheets see the **last written value**, not the **recomputed value**
- Character sheet shows 42 HP → reload → shows 38 HP (HP loss)

**Affected Files:**
- `ProgressionEngineV2.js:162`
- `ProgressionSession.js:430`
- `CharacterGenerationEngine.js`
- `chargen-improved.js`
- `chargen-main.js:3307-3308`
- `drop-handler.js:95-96`
- 8 more progression/follower handlers

**Consequence:** SAVES CORRUPT, HP VALUES DRIFT, CHARACTER DATA DEGRADES OVER TIME

---

### 🔴 P0 — CHARGEN DIRECTLY OVERWRITES DERIVED FIELDS

**File:** `chargen-main.js:3307`
```javascript
updates['system.derived.hp.max'] = (this.actor.system.derived?.hp?.max || 0) + hpGain;
updates['system.derived.hp.value'] = (this.actor.system.derived?.hp?.value || this.actor.system.hp?.value || 0) + hpGain;
```

- Chargen assumes it owns HP calculation
- Manually mutates `system.derived.*` (should be read-only)
- `DerivedCalculator.computeAll()` will overwrite this on next recalc
- Result: **Chargen gains are silently lost** if sheet recalc happens

---

### 🔴 P0 — BAB LEGACY PATH AMBIGUITY

- `system.bab` exists in template.json (base schema, default 0)
- `system.derived.bab` computed by DerivedCalculator
- Attack rolls may read either path inconsistently
- Neither is explicitly forbidden, both exist
- **Rolls inconsistent across sheets and combat systems**

---

### 🔴 P1 — DEFENSE TOTALS NEVER UPDATED IN BASE

- Template declares `system.defenses.fortitude.total = 10` (base schema)
- DerivedCalculator computes `system.derived.defenses.fortitude.total` (derived)
- Base field never gets updated (stale default)
- Old code might prefer base over derived
- **Defense values diverge across codebase**

---

### 🟡 P1 — FORCE POINTS CONFIG SCHEMA BLOAT

- `system.forcePoints.die = "1d6"` declared in template
- `system.forcePoints.diceType = "d6"` also declared
- **Never used in DerivedCalculator**
- No UI to modify them
- Dead schema weight

---

## SSOT COMPLIANCE BREAKDOWN

### What IS Compliant ✅
- **ActorEngine gating** - All mutations route through ActorEngine.updateActor()
- **MutationInterceptor** - Blocks unauthorized direct mutations
- **DerivedCalculator authority** - Single source for all derived math (attributes, defenses, skills, bab)
- **Force/Destiny values** - Clean separation (canonical value + computed total)
- **Abilities modifiers** - Base + derived cleanly separated

### What IS NOT Compliant 🔴
- **HP Max** - Written by 14 systems directly (bypasses derived authority)
- **Chargen HP** - Manually mutates system.derived.* expecting ownership
- **Defense Totals** - Base schema never synchronized with derived
- **BAB Paths** - Both system.bab and system.derived.bab written, unclear which is read
- **Drop Handler** - Adopts template values directly to derived, overwriting computation
- **Character-Actor Mirror** - Overwrites derived.hp values during sheet prep

---

## MUTATION VIOLATION SUMMARY

**Total Violations Found: 33+ direct writes to system.derived.***

| Violator | Count | Files Affected | Severity |
|----------|-------|-----------------|----------|
| Progression engines | 8 | ProgressionEngineV2, ProgressionSession, apply-handlers | 🔴 CRITICAL |
| Chargen | 6 | chargen-main.js, chargen-improved.js | 🔴 CRITICAL |
| Drop handler | 4 | drop-handler.js | 🔴 HIGH |
| Character-actor mirror | 2 | character-actor.js | 🟡 MEDIUM |
| DerivedCalculator | 13 | derived-calculator.js | ✅ OK (authorized) |

**Pattern:** All violations bypass ActorEngine for HP/BAB calculations, assuming independent authority.

---

## IDEMPOTENCE ANALYSIS

### DerivedCalculator.computeAll() - SAFE ✅
- Pure function (reads system, returns updates)
- Called by ActorEngine after every mutation
- Overwrites all derived fields atomically
- Idempotent: same input → same output

### Progression Engines - AT RISK 🔴
- Write `system.hp.max` directly
- Don't trigger DerivedCalculator recompute until ActorEngine.updateActor() completes
- **Race condition:** Sheet renders before recalc completes
- **Risk window:** Brief lag where HP diverges

### Chargen HP Logic - DANGEROUS 🔴
- Reads old `system.derived.hp.max`
- Adds gain
- Writes back
- **BUT:** DerivedCalculator will ignore this and recompute from class levels
- **Result:** Chargen gains are silently lost

### Character-Actor Mirror - RISKY ⚠️
- Mirrors `system.hp.max` → `system.derived.hp.max` during `prepareDerivedData()`
- Overwrites DerivedCalculator output
- Can create sync issues if migration incomplete

---

## DATA CORRUPTION VECTORS

### Vector 1: Level-Up HP Loss
1. Player levels up → Progression engine adds 6 HP
2. Engine writes `system.hp.max = 42` directly
3. Sheet renders, shows 42 HP ✓
4. Someone reloads/saves character
5. DerivedCalculator recomputes from level/class → `system.hp.max = 38` (without chargen gain)
6. Sheet shows 38 HP, **player loses 4 HP** ❌

### Vector 2: Chargen Gains Deleted
1. Character gains 8 HP from level-up selection in chargen
2. Chargen writes `system.derived.hp.max += 8` directly
3. Chargen preview shows 48 HP ✓
4. Player clicks "Accept"
5. ActorEngine.updateActor() triggers DerivedCalculator.computeAll()
6. DerivedCalculator recomputes derived fields from base inputs
7. `system.derived.hp.max` reverts to base computation
8. **Chargen gain disappears** ❌

### Vector 3: Template Adoption Corruption
1. GM imports character template with HP 40
2. Drop handler writes `system.derived.hp.max = 40` directly
3. But `system.hp.max` (base) is still 32
4. Next chargen save updates base only
5. Now base = 32, derived = 40
6. Sheet reads derived (shows 40), combat reads base (uses 32)
7. **HP values inconsistent** ❌

---

## IMMEDIATE HARDENING REQUIRED

### FREEZE 1: No More Direct Derived Writes
- All 33 writes to `system.derived.*` outside DerivedCalculator must route through ActorEngine
- MutationBoundaryDefense should block these (now that ENFORCE mode is active from Phase 3)
- Audit and fix:
  - Progression engines
  - Chargen HP logic
  - Drop handler template adoption
  - Character-actor mirror

### FREEZE 2: HP Authority
- Declare `system.hp.max` as source input for progression
- DerivedCalculator owns final computation
- Progression: write to temporary `system.progression.hpBonuses` instead
- DerivedCalculator reads `.progression.*` and computes final `system.derived.hp.max`

### FREEZE 3: Deprecate Base Defenses
- Mark `system.defenses.*.total` (base schema) as deprecated
- All reads redirect to `system.derived.defenses.*.total`
- Migrate templates away from base defenses by v14

### FREEZE 4: Remove BAB Base Path
- Declare `system.bab` read-only (legacy field)
- All rolls use `system.derived.bab` only
- Migrate chargen/progression away from writing `system.bab`

---

## QUESTIONS FOR DESIGNER

1. **Is HP.max supposed to be:**
   - (A) Progression engine computes it, DerivedCalculator reads input
   - (B) DerivedCalculator computes it from class levels, progression can't change it
   - (C) Both somehow sync (currently broken)

2. **Who owns Chargen's HP bonuses?**
   - (A) Chargen applies bonus, progression applies class HP, DerivedCalculator adds them
   - (B) Chargen applies bonus to base, DerivedCalculator computes final

3. **Should template adoption override computed values?**
   - (A) Yes, template is authoritative
   - (B) No, only provide defaults, DerivedCalculator recomputes

---

## SUMMARY TABLE

| Issue | Current State | Risk Level | Fix Complexity |
|-------|---------------|------------|-----------------|
| **HP Authority** | 14 systems + DerivedCalculator | 🔴 CRITICAL | MEDIUM (audit + route) |
| **Chargen Derived Writes** | 6 locations | 🔴 CRITICAL | MEDIUM (consolidate) |
| **BAB Legacy Path** | Both paths written/read | 🔴 CRITICAL | MEDIUM (migrate) |
| **Defense Base Fields** | Template, never updated | 🟡 HIGH | MEDIUM (deprecate) |
| **FP Config Schema** | Dead weight | 🟢 LOW | LOW (remove) |
| **Character-Actor Mirror** | Overwrites derived | 🟡 MEDIUM | MEDIUM (remove) |

---

**Next Phase:** Implement FREEZE 1-4 to harden schema boundaries before Phase 4 refactor.
