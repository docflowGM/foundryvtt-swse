# SWSE Skill Engine System Wiring

**Complete data flow from actor state to Sentinel monitoring**

---

## 🏗️ Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ ACTOR STATE LAYER                                               │
│                                                                 │
│ • actor.system.skills[skillKey]                                │
│ • actor.system.conditionTrack                                  │
│ • actor.system.attributes                                      │
│ • actor.system.derived.*                                       │
│ • actor.system.armor.*                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (read-only)
┌─────────────────────────────────────────────────────────────────┐
│ CONDITION READ AUTHORITY                                        │
│                                                                 │
│ actor.getConditionTrackState()                                 │
│ • Returns: { step, max, persistent, helpless }               │
│                                                                 │
│ actor.getConditionPenalty(step)                               │
│ • Returns: numeric penalty (0, -1, -2, -5, -10)              │
│                                                                 │
│ ConditionEngine (READ ONLY from enforcement perspective)       │
│ • Handles mutations only (ActorEngine delegates to it)        │
│ • Never called by SkillEnforcementEngine                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (read-only)
┌─────────────────────────────────────────────────────────────────┐
│ SKILL ENFORCEMENT ENGINE (PURE RULES AUTHORITY)                │
│                                                                 │
│ evaluate({                                                      │
│   actor,           // reads from actor                         │
│   skillKey,        // skill identifier                         │
│   actionType,      // "check" | "retry" | "passive"           │
│   context,         // environmental conditions (passed in)     │
│   telemetry        // optional diagnostics                     │
│ })                                                              │
│                                                                 │
│ ✅ READS ONLY:                                                 │
│ • actor.system.skills                                         │
│ • actor.getConditionTrackState()                              │
│ • actor.getConditionPenalty()                                 │
│ • CONFIG.SWSE.skills                                          │
│ • SkillAttemptRegistry (read-only)                            │
│                                                                 │
│ ❌ NEVER WRITES:                                               │
│ • No actor mutations                                           │
│ • No ConditionEngine calls                                     │
│ • No ActorEngine calls                                         │
│ • No DOM manipulation                                          │
│ • No chat posting                                              │
│ • No Sentinel imports                                          │
│                                                                 │
│ ✅ RETURNS: Decision object                                    │
│ {                                                               │
│   allowed: boolean,                                            │
│   warnings: string[],                                          │
│   reason: string | null,                                       │
│   penalties: [{ source, value }],                             │
│   substitutions: [{ from, to, reason }],                      │
│   overrides: { treatedAsTrained, autoSuccess, autoFail, ... },│
│   diagnostics: { rulesTriggered[], blockedBy }  [optional]    │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (decision object)
┌─────────────────────────────────────────────────────────────────┐
│ ROLL ENGINE                                                      │
│                                                                 │
│ if (!enforcement.allowed) {                                     │
│   SWSEChat.postHTML("Cannot use skill: " + enforcement.reason) │
│   return null;  // STOP HERE                                    │
│ }                                                               │
│                                                                 │
│ const roll = await SWSE.RollEngine.safeRoll(                   │
│   "1d20 + mod + penalties",                                     │
│   { ...enforcement.penalties }  // Apply enforcement decisions  │
│ ).evaluate({ async: true })                                    │
│                                                                 │
│ ✅ RESPONSIBILITIES:                                           │
│ • Consumes enforcement decision                                │
│ • Constructs roll formula with modifiers                       │
│ • Evaluates roll                                               │
│ • Applies substitutions if enforcement.substitutions present   │
│                                                                 │
│ ❌ NEVER:                                                       │
│ • Re-validates rules (enforcement already did)                │
│ • Duplicates enforcement logic                                │
│ • Mutates actor directly                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (roll result)
┌─────────────────────────────────────────────────────────────────┐
│ SWSE CHAT (UNIFIED OUTPUT SERVICE)                             │
│                                                                 │
│ await SWSEChat.postRoll({                                       │
│   roll,                                                         │
│   actor,                                                        │
│   flavor: "Acrobatics Check (+2)"                              │
│   context: { enforcement }  // Optional diagnostics for GM      │
│ })                                                              │
│                                                                 │
│ ✅ RESPONSIBILITIES:                                           │
│ • Renders roll via holo-roll.hbs template                      │
│ • Posts to ChatMessage                                         │
│ • Centralizes all roll output formatting                       │
│                                                                 │
│ Return: ChatMessage document                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (after roll completes)
┌─────────────────────────────────────────────────────────────────┐
│ SKILL ATTEMPT REGISTRY (RETRY TRACKING)                         │
│                                                                 │
│ SkillAttemptRegistry.record(                                    │
│   actor.id,                                                     │
│   skillKey,                                                     │
│   contextHash  // for retry collision detection                 │
│ )                                                               │
│                                                                 │
│ • WRITTEN TO by: RollEngine (after successful roll)            │
│ • READ FROM by: SkillEnforcementEngine.retryRule               │
│ • NEVER MUTATED by: enforcement rules                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (if mutation needed)
┌─────────────────────────────────────────────────────────────────┐
│ ACTOR ENGINE (CENTRALIZED MUTATION AUTHORITY)                  │
│                                                                 │
│ Only if roll affected actor state:                              │
│ • Spell slot consumption                                        │
│ • Item destruction/modification                                │
│ • Flag updates                                                  │
│ • Skill training (if learned during roll)                      │
│                                                                 │
│ await ActorEngine.updateActor(actor, {                          │
│   'system.skills[skillKey].trained': true                       │
│ }, { source: 'skill-roll' })                                    │
│                                                                 │
│ ✅ RESPONSIBILITIES:                                           │
│ • ONLY mutation authority for actor state                      │
│ • Triggers DerivedCalculator after mutations                   │
│ • Delegates to MutationInterceptor for validation              │
│ • Logs mutations for audit trail                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (mutations recorded)
┌─────────────────────────────────────────────────────────────────┐
│ DERIVED CALCULATOR (RECALCULATION LAYER)                       │
│                                                                 │
│ Called after ActorEngine mutations:                             │
│ • Recalculates HP, BAB, defenses                               │
│ • Applies modifiers via ModifierEngine                         │
│ • Updates system.derived.*                                      │
│                                                                 │
│ ✅ Non-mutating: returns updates only                          │
│ ✅ Atomic: all or nothing                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (violations/diagnostics)
┌─────────────────────────────────────────────────────────────────┐
│ SENTINEL ENGINE (MONITORING & GOVERNANCE)                       │
│                                                                 │
│ EXTERNAL REPORTING ONLY:                                        │
│ If telemetry: true in enforcement.evaluate(), caller may:      │
│                                                                 │
│ SentinelEngine.report('skills', SEVERITY.WARN, {               │
│   actor: actor.id,                                              │
│   skillKey,                                                     │
│   enforcement: result.diagnostics,  // rules triggered         │
│   blockedBy: result.diagnostics.blockedBy  // if blocked       │
│ })                                                              │
│                                                                 │
│ ✅ Sentinel NEVER imported inside:                             │
│ • SkillEnforcementEngine                                       │
│ • Any rule module                                              │
│                                                                 │
│ ✅ Caller decides whether to report:                           │
│ • GM debugging tool: always report                             │
│ • Player roll: report only violations                          │
│ • Passive check: report conflicts only                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
ACTOR STATE
    │
    └──→ [CONDITION AUTHORITY]
            │
            ├─→ actor.getConditionTrackState()
            └─→ actor.getConditionPenalty(step)
                    │
                    └──→ [SKILL ENFORCEMENT ENGINE - PURE]
                            │
                            ├─→ Rule Pipeline (composable)
                            │   ├─ trainingRule
                            │   ├─ substitutionRule
                            │   ├─ retryRule        (reads SkillAttemptRegistry)
                            │   ├─ conditionRule    (reads actor methods)
                            │   ├─ armorRule
                            │   ├─ environmentRule
                            │   └─ featSpeciesRule
                            │
                            └──→ DECISION OBJECT
                                    │
                                    └──→ [ROLL ENGINE]
                                            │
                                            ├─→ Check enforcement.allowed
                                            ├─→ Build roll formula + modifiers
                                            ├─→ Evaluate roll
                                            │
                                            └──→ ROLL RESULT
                                                    │
                                                    └──→ [SWSE CHAT]
                                                            │
                                                            ├─→ Render via template
                                                            └─→ ChatMessage.create()
                                                                    │
                                                                    └──→ [SKILL ATTEMPT REGISTRY]
                                                                            (record attempt)
                                                                            │
                                                                            └──→ [ACTOR ENGINE] (if mutations)
                                                                                    │
                                                                                    └──→ [DERIVED CALCULATOR]
                                                                                            │
                                                                                            └──→ [SENTINEL] (external report)
```

---

## 🧩 Dependency Graph (CLEAN)

```
SkillEnforcementEngine
  ├─ imports: ./rules/index.js
  ├─ imports: ./skill-attempt-registry.js
  └─ IMPORTS NOTHING ELSE

Rule Modules (rules/*.js)
  ├─ imports: (none - pure functions)
  ├─ reads: actor methods
  ├─ reads: CONFIG.SWSE
  ├─ reads: context parameter
  └─ NEVER imports: engine, roll, chat, sentinel

SkillAttemptRegistry
  ├─ imports: (nothing)
  ├─ self-contained state: Map
  └─ API: read and write (read-only from rules perspective)

RollEngine
  ├─ imports: SWSE.RollEngine
  ├─ DOES import: SkillEnforcementEngine
  ├─ DOES import: SWSEChat
  ├─ calls: SkillEnforcementEngine.evaluate()
  ├─ calls: SWSEChat.postRoll()
  └─ calls: SkillAttemptRegistry.record() (after roll)

SWSEChat
  ├─ imports: SWSERollEngine
  ├─ NO dependency on SkillEnforcementEngine
  └─ handles: any roll, any source

ActorEngine
  ├─ imports: DerivedCalculator
  ├─ imports: ModifierEngine
  ├─ NO dependency on SkillEnforcementEngine
  └─ handles: all mutations

Sentinel
  ├─ self-contained monitoring
  ├─ NO imports from SkillEnforcementEngine
  └─ receives reports from external callers

✅ NO CIRCULAR IMPORTS
✅ ONE-WAY DEPENDENCIES
✅ ENFORCEMENT = PURE AUTHORITY
✅ EXTERNAL REPORTING ONLY
```

---

## 📋 Call Sequence

```
1. UI (Sheet) or Macro calls:
   await rollSkill(actor, "acrobatics", { difficulty: 15 })

2. Skill Rolling Handler:
   enforcement = SkillEnforcementEngine.evaluate({
     actor,
     skillKey: "acrobatics",
     actionType: "check",
     context: { difficulty: 15, environment: {...} },
     telemetry: true  // GM debugging
   })

3a. If NOT allowed:
    SWSEChat.postHTML({
      content: `Cannot use: ${enforcement.reason}`,
      actor
    })
    return null;

3b. If allowed:
    roll = RollEngine.safeRoll(
      "1d20 + " + calculateMod(actor, enforcement)
    )

4. Post roll to chat:
   SWSEChat.postRoll({
     roll,
     actor,
     flavor: "Acrobatics Check",
     context: { enforcement }  // Optional: GM sees diagnostics
   })

5. After chat message created:
   SkillAttemptRegistry.record(actor.id, "acrobatics", contextHash)

6. If actor state changed (e.g., skill trained):
   ActorEngine.updateActor(actor, {
     'system.skills.acrobatics.trained': true
   }, { source: 'skill-roll' })

7. If mutations:
   DerivedCalculator.computeAll(actor)

8. Optional: Report to Sentinel (external):
   if (enforcement.diagnostics.blockedBy) {
     SentinelEngine.report('skills', SEVERITY.WARN, {
       violation: enforcement.diagnostics.blockedBy,
       actor: actor.id,
       skillKey: "acrobatics"
     })
   }
```

---

## ⚖️ Responsibility Boundaries

| Layer | Reads | Writes | Mutates | Side Effects |
|-------|-------|--------|---------|--------------|
| **Condition Authority** | actor state | none | none | none |
| **SkillEnforcementEngine** | actor, context, registry (RO) | decision object | none | none (pure) |
| **Rules Pipeline** | payload | result object | none | none (pure) |
| **RollEngine** | enforcement, actor | roll | none | creates chat |
| **SWSEChat** | roll, actor | chat message | none | posts message |
| **SkillAttemptRegistry** | map | map | map | none |
| **ActorEngine** | desired updates | actor | actor | triggers derive |
| **DerivedCalculator** | actor, modifiers | derived fields | none | recalculates |
| **Sentinel** | reports | violations log | none | monitoring |

---

## 🚫 What SkillEnforcementEngine MUST NOT DO

```javascript
❌ actor.update({ ... })
❌ actor.system.skills = ...
❌ import { ConditionEngine } from "..."
❌ import { ActorEngine } from "..."
❌ import { SentinelEngine } from "..."
❌ import { SWSEChat } from "..."
❌ ui.notifications.warn()
❌ ChatMessage.create()
❌ condition logic duplication
❌ derived data calculation
❌ modifier aggregation
```

---

## ✅ What SkillEnforcementEngine SHOULD DO

```javascript
✅ Read actor.system.skills[skillKey]
✅ Call actor.getConditionTrackState()
✅ Call actor.getConditionPenalty(step)
✅ Read CONFIG.SWSE.skills
✅ Read context parameter
✅ Query SkillAttemptRegistry.canRetry()
✅ Build decision object with all rule outputs
✅ Return deterministic result
✅ Emit diagnostics for Sentinel (optional)
✅ Stay pure (no side effects)
```

---

## 🔌 Plugin System Integration Point

When SkillEnforcementEngine has rule registration API:

```javascript
// Houserules can register at boot time:
SkillEnforcementEngine.registerRule('houserule-force-gating', {
  fn: (payload, result) => {
    // Custom force skill gating logic
    return result;
  },
  position: 'after:trainingRule',
  enabled: true
})

// Rule never directly imports Sentinel
// RollEngine can optionally report violations
// System stays pure and composable
```

---

## 📊 Why This Architecture Works

1. **SkillEnforcementEngine = Pure Authority**
   - No mutations
   - No side effects
   - Easy to test
   - Easy to Sentinel-monitor

2. **One-Way Dependencies**
   - RollEngine calls Enforcement
   - Enforcement never calls back
   - No circular imports

3. **Separation of Concerns**
   - Rules = decision logic only
   - Chat = formatting only
   - Engine = mutation only
   - Sentinel = observation only

4. **Extensibility**
   - Rules are composable
   - Plugin system can inject rules
   - No core files edited

5. **Governance**
   - Sentinel monitors boundaries
   - Each layer has clear responsibility
   - Violations are detectable
