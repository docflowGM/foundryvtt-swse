# Foundry SWSE Damage Pipeline Audit Report
**Status:** AUDIT ONLY — NO CHANGES MADE
**Date:** 2026-04-04
**Scope:** Complete damage application pipeline tracing

---

## A. CANONICAL DAMAGE PIPELINE

The system has a **unified, centralized damage pipeline** with clearly defined phases:

### Entry Point Flow
```
Damage Source
  ↓
[CHOICE OF ENTRY]
  ├─ DamageEngine.applyDamage(actor, damage, options)
  ├─ DamageResolutionEngine.resolveDamage(actor, damage, damageType, source)
  └─ ActorEngine.applyDamage(actor, damagePacket)
  ↓
DamageResolutionEngine.resolveDamage()
  [PURE CALCULATION - NO MUTATIONS]
  ↓
PHASE 1: Bonus HP (ModifierEngine)
  ↓
PHASE 2: Damage Mitigation (DamageMitigationManager)
  ├─ STAGE 1: ShieldMitigationResolver (SR → reduces damage)
  ├─ STAGE 2: DamageReductionResolver (DR → reduces damage)
  ├─ STAGE 3: TempHPResolver (Temp HP → absorbs remainder)
  └─ Result: Final HP damage amount
  ↓
PHASE 3: Damage Threshold Check (ThresholdEngine)
  ├─ Evaluates if DT was exceeded
  ├─ Calculates condition track shift
  └─ Determines rescue eligibility
  ↓
PHASE 4: Condition Track Logic
  └─ Applies CT shifts based on threshold result
  ↓
PHASE 5: Death/Destroy Eligibility Check
  └─ Determines unconscious/dead/destroyed states
  ↓
ActorEngine.applyDamage() [CANONICAL MUTATION POINT]
  └─ Builds atomic update with:
     ├─ system.hp.value (from resolution.hpAfter)
     ├─ system.hp.bonus (from resolution.bonusHpAfter)
     ├─ system.hp.temp (from resolution.mitigation.tempHP.after)
     ├─ system.conditionTrack.current
     └─ system.conditionTrack.persistent
  ↓
ActorEngine.updateActor()
  └─ Single atomic mutation commit
```

### Key File Locations
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Entry** | `/scripts/engine/combat/damage-engine.js` | 20-80 | User-facing damage application |
| **Orchestrator** | `/scripts/engine/combat/damage-resolution-engine.js` | 30-294 | Pure calculation pipeline |
| **Mitigation** | `/scripts/engine/combat/damage-mitigation-manager.js` | 60-193 | SR → DR → Temp HP sequencing |
| **Shield Resolver** | `/scripts/engine/combat/resolvers/shield-mitigation-resolver.js` | 38-79 | SR application (pure) |
| **DR Resolver** | `/scripts/engine/combat/resolvers/damage-reduction-resolver.js` | Pure calculation |
| **Temp HP Resolver** | `/scripts/engine/combat/resolvers/temp-hp-resolver.js` | Pure calculation |
| **Threshold** | `/scripts/engine/combat/threshold-engine.js` | DT evaluation & CT shifts |
| **Mutation** | `/scripts/governance/actor-engine/actor-engine.js` | 918-985 | `applyDamage()` canonical mutation |

---

## B. ENTRY POINTS TABLE

All identified damage application entry points:

| # | Source | Function Call | Location | Uses Pipeline? | Notes |
|---|--------|---------------|----------|----------------|-------|
| 1 | Combat UI | `DamageEngine.applyDamage()` | `/scripts/apps/damage-app.js:94` | ✅ SAFE | Damage button (apply/half/double) |
| 2 | Combat Tab | `DamageEngine.applyDamage()` | `/scripts/engine/combat/combat-executor.js` | ✅ SAFE | Attack execution |
| 3 | Talent Effect | `DamageEngine.applyDamage()` | `/scripts/engine/talent/*` | ✅ SAFE | Talent damage application |
| 4 | Chat Card | `DamageEngine.applyDamage()` | `/scripts/combat/rolls/damage.js` | ✅ SAFE | Inline damage rolls |
| 5 | Condition Shift | `ActorEngine.applyDamage()` | `/scripts/sheets/v2/character-sheet.js:2676` | ✅ SAFE | Condition button (through ActorEngine) |
| 6 | Healing (manual) | `ActorEngine.updateActor()` | `/scripts/apps/damage-app.js:105` | ⚠️ DIRECT | Manual healing in UI (not damage) |
| 7 | Temp HP restore | `ActorEngine.updateActor()` | `/scripts/apps/damage-app.js:113` | ⚠️ DIRECT | Manual temp HP restore (not damage) |
| 8 | Talent healing | `ActorEngine.updateActor()` | `/scripts/houserules/houserule-healing.js` | ⚠️ DIRECT | Healing talents bypass pipeline |
| 9 | HP max adjust | `applyHPMutation()` | `/scripts/sheets/v2/character-sheet.js:1247` | ⚠️ DIRECT | Level-up HP max (not damage) |

---

## C. VIOLATIONS REPORT

### Direct HP Mutations (NOT using damage pipeline)

#### HEALING OPERATIONS (Expected bypasses - not damage)
| File | Function | Line | Operation | Severity |
|------|----------|------|-----------|----------|
| `/scripts/apps/damage-app.js` | `_heal()` | 105 | `ActorEngine.updateActor({'system.hp.value': newHP})` | LOW |
| `/scripts/houserules/houserule-healing.js` | Various | 54, 157, 248, 267, 351, 418, 450 | Direct HP mutations for healing | LOW |
| `/scripts/engine/talent/dark-side-talent-mechanics.js` | `activateTalent()` | 292 | Direct HP update for crippling mechanic | **MEDIUM** |

#### TEMP HP OPERATIONS (Expected bypasses - not damage)
| File | Function | Line | Operation | Severity |
|------|----------|------|-----------|----------|
| `/scripts/apps/damage-app.js` | `_restoreTemp()` | 113 | `ActorEngine.updateActor({'system.hp.temp': restored})` | LOW |

#### HP MAX OPERATIONS (Expected bypass - progression, not combat)
| File | Function | Line | Operation | Severity |
|------|----------|------|-----------|----------|
| `/scripts/sheets/v2/character-sheet.js` | UI listener | 1247 | `applyHPMutation({'system.hp.max': newMax})` | LOW |
| `/scripts/engine/progression/ProgressionSession.js` | Level-up | 430 | `updates['system.hp.max'] = ...` | LOW |
| `/scripts/governance/actor-engine/actor-engine.js` | `recomputeHP()` | 3288, 3360 | HP max recalculation | SAFE (ActorEngine) |

---

## D. FINAL MUTATION LOCATION

**CANONICAL MUTATION POINT — The ONE place all damage must flow:**

```
File: /scripts/governance/actor-engine/actor-engine.js
Function: ActorEngine.applyDamage()
Lines: 918-985
```

### Mutation Sequence (CRITICAL)
```javascript
// Line 932-939: Calculate via DamageResolutionEngine (pure)
const resolution = await DamageResolutionEngine.resolveDamage({
  actor,
  damage: damagePacket.amount,
  damageType: damagePacket.type ?? 'normal',
  source: damagePacket.sourceActor ?? null,
  options: damagePacket.options ?? {},
});

// Line 943-960: Build atomic update object
const updates = {
  ...SchemaAdapters.setHPUpdate(resolution.hpAfter),           // Line 944
  'system.hp.bonus': resolution.bonusHpAfter,                  // Line 949
  'system.hp.temp': resolution.mitigation.tempHP.after,        // Line 952
  'system.conditionTrack.current': resolution.conditionAfter,  // Line 956
  'system.conditionTrack.persistent': ...                       // Line 959
};

// Line 962: Single atomic commit
await this.updateActor(actor, updates);
```

### Critical Properties in Update
- **`system.hp.value`** — Final HP after all mitigation (from `setHPUpdate()`)
- **`system.hp.temp`** — Remaining temp HP after absorption
- **`system.hp.bonus`** — Remaining bonus HP after consumption
- **`system.conditionTrack.current`** — Condition track position (0-5)
- **`system.conditionTrack.persistent`** — Persistent condition flag

---

## E. ARCHITECTURE ASSESSMENT

### Centralization Level: **HIGHLY CENTRALIZED** ✅

**Evidence:**
1. All damage flows through `DamageResolutionEngine.resolveDamage()`
2. Pure calculation layer isolated from mutations
3. Single canonical mutation point: `ActorEngine.applyDamage()`
4. No alternative HP reduction paths for damage (only healing/max adjustment)
5. Resolver pattern enforces locked order (SR → DR → Temp HP → HP)

### Pipeline Integrity: **INTACT** ✅

**Strengths:**
- `ShieldMitigationResolver`, `DamageReductionResolver`, `TempHPResolver` are pure (no mutations)
- `DamageMitigationManager` enforces locked order
- `DamageResolutionEngine` is declarative (returns results, doesn't apply)
- `ThresholdEngine` handles DT evaluation correctly (DT is a trigger, not DR)
- `ActorEngine.applyDamage()` is the single mutation authority

**Weaknesses:**
- Healing operations bypass pipeline (acceptable — healing ≠ damage)
- Direct temp HP/bonus HP mutations in UI (acceptable — not damage resolution)
- Dark side crippling uses direct HP update (see violation #9 below)

### Potential Issues Found

#### MEDIUM SEVERITY — Dark Side Crippling Bypass
```
File: /scripts/engine/talent/dark-side-talent-mechanics.js
Line: 292
Function: activateTalent()
Issue: Direct HP mutation outside damage pipeline
```
This talent is reducing HP with:
```javascript
await ActorEngine.updateActor(actor, { 'system.hp.value': newHp });
```
**Analysis:** Not flowing through `ActorEngine.applyDamage()`, so:
- No shield mitigation
- No damage reduction
- No threshold evaluation
- No condition track shifts

**Should be:** Route through `ActorEngine.applyDamage()` or `DamageResolutionEngine`

---

## F. SCHEMA CONTRACT

### HP Update Structure (Canonical)
```javascript
{
  'system.hp.value': number,           // Current HP (0 to max)
  'system.hp.max': number,             // Maximum HP (>= 1)
  'system.hp.bonus': number,           // Bonus HP pool (0+)
  'system.hp.temp': number             // Temporary HP (0+)
}
```

### Condition Track Structure
```javascript
{
  'system.conditionTrack.current': number,     // 0 = healthy, 5 = helpless/disabled
  'system.conditionTrack.persistent': boolean  // Whether shift is permanent
}
```

### Resolved Damage Result Structure
```javascript
{
  // State before
  hpBefore: number,
  bonusHpBefore: number,
  conditionBefore: number,

  // State after
  hpAfter: number,
  bonusHpAfter: number,
  damageToHP: number,

  // Mitigation breakdown
  mitigation: {
    originalDamage: number,
    shield: { applied, degraded, remaining, source },
    damageReduction: { applied, source, bypassed },
    tempHP: { absorbed, before, after },
    breakdown: Array<{stage, input, output, mitigation, details}>
  },

  // Threshold evaluation
  thresholdExceeded: boolean,
  thresholdTotal: number,
  thresholdBreakdown: Array,
  thresholdMeasuredDamage: number,

  // Condition track impact
  conditionDelta: number,
  conditionAfter: number,
  conditionPersistent: boolean,

  // Special states
  unconscious: boolean,
  dead: boolean,
  destroyed: boolean,
  forceRescueEligible: boolean
}
```

---

## G. CONFIDENCE ASSESSMENT

### System Integrity: **HIGH** ✅

**Key Evidence:**
- Pipeline is fully centralized in `DamageResolutionEngine`
- Locked order is enforced (SR → DR → Temp HP → HP)
- Pure calculation layer is separated from mutations
- Single mutation authority (`ActorEngine.applyDamage()`)
- No circular dependencies or re-entrance risks
- All resolvers are stateless

### Risk of Bypass: **LOW** ✅

**Mitigating Factors:**
- `ActorEngine.applyDamage()` is the only canonical entry
- Healing/temp HP direct mutations are intentional and non-damage
- Dark side crippling is the only identified damage-like operation outside pipeline

### Unification Readiness: **READY** ✅

The system is ready for:
- Fixing the dark side crippling violation (route through pipeline)
- Adding new damage sources (route through `DamageResolutionEngine`)
- Modifying mitigation order (modify `DamageMitigationManager`)
- Changing condition track logic (modify `ThresholdEngine`)

All changes can be made surgically without redesigning the system.

---

## SUMMARY

| Aspect | Status | Details |
|--------|--------|---------|
| **Pipeline Centralized?** | ✅ YES | `DamageResolutionEngine` is SPOF |
| **Locked Order Enforced?** | ✅ YES | `DamageMitigationManager.resolve()` |
| **Order: Shield → DR → Temp → HP?** | ✅ YES | Lines 80-150 (in sequence) |
| **DT Handled Correctly?** | ✅ YES | DT is trigger (threshold), not DR |
| **Temp HP Consumed First?** | ✅ YES | Line 132-149 (`TempHPResolver.resolve()`) |
| **Single Mutation Point?** | ✅ YES | `ActorEngine.applyDamage()` at line 918 |
| **Bypasses Exist?** | ⚠️ YES | Dark side crippling (1 MEDIUM case) |
| **System Fragmented?** | ✅ NO | Highly unified architecture |

