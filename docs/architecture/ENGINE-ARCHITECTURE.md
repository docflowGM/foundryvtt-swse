# Engine Architecture (Governance Doctrine)

Authoritative reference for engine structure, authority boundaries, and invariants.

> This document encodes architectural decisions that prevent God Object regrowth and silent boundary erosion. Violations are system regressions.

---

## 1. Engine Ownership Table

| Engine | Domain | Owns | Delegates To | Never Owns |
|--------|--------|------|--------------|-----------|
| **CharacterGenerationEngine** | Character creation orchestration | Ability score method gating, starting wealth rules, droid construction rules, initial feat/talent gating | HPGeneratorEngine, ProgressionEngine, ActorEngine | Formulas, HP calculation, mutations |
| **ProgressionEngine** | Level advancement rules | Talent cadence, skill advancement, ability increases, multiclass bonus logic | HPGeneratorEngine, ModifierEngine, ActorEngine | Combat penalties, condition effects, armor math |
| **CombatMechanicsEngine** | Rule variant interpretation | Which rule variant to activate, whether to apply massive damage, instant death settings | DamageResolutionEngine, ThresholdEngine, ConditionEngine, MovementEngine, ModifierEngine, SkillEngine | Damage calculation, threshold math, condition mutations, armor rules |
| **HPGeneratorEngine** | HP calculation logic | HP scaling formulas, hit die interpretation | ModifierEngine | Mutations, bonus registration |
| **ThresholdEngine** | Threshold math | Threshold formula selection, calculation logic | ModifierEngine | Condition mutations, penalty application |
| **DamageResolutionEngine** | Damage and death rules | Damage math, death logic, instant death variant selection | ModifierEngine, ActorEngine | Threshold calculation, condition mutations |
| **ConditionEngine** | Condition mechanics | Condition track logic, condition cap rules | ModifierEngine, ActorEngine | Combat math, damage calculation |
| **ModifierEngine** | Modifier calculation | Modifier resolution, penalty stacking, bonus caps | ActorEngine | Mutations, direct state changes |
| **ActorEngine** | Mutation gatekeeper (SINGLE) | All actor state changes, all owned item changes | None (only reads) | Any calculation, any business logic |

---

## 2. The Mutation Rule (INVARIANT)

**All mutations go through ActorEngine and only ActorEngine.**

```
✅ Allowed paths:
  ActorEngine.updateActor(actor, data, options)
  ActorEngine.updateOwnedItems(actor, updates, options)
  actor.updateOwnedItem(item, changes, options)  // must call ActorEngine internally
  Actor gameplay APIs (useAction, useItem, applyDamage, equipItem, ...)

❌ Forbidden paths:
  actor.update(...)
  item.update(...)
  actor.updateEmbeddedDocuments('Item', ...)
  actor.items.update(...)
```

**Why:** Single gate prevents state desync and silent corruption.

---

## 3. The Settings Rule (INVARIANT)

**All house rule reads go through HouseRuleService and only HouseRuleService.**

```
✅ Allowed:
  HouseRuleService.getRule('ruleKey')
  HouseRuleService.isRuleEnabled('ruleKey')
  HouseRuleService.getRuleVariant('ruleKey')

❌ Forbidden:
  game.settings.get('swse', 'ruleKey')
  game.settings.get()  // anywhere in an engine
  Direct access to actor.system.houseRules
```

**Why:** Single source of truth for configuration. Prevents rule interpretation inconsistency.

---

## 4. Dependency Direction Rule (INVARIANT)

**Dependencies flow downward only. No upward or sideways calls.**

```
Dependency Hierarchy:
  Tier 0: HouseRuleService (reads only, no dependencies)
  Tier 1: ChargenEngine, ProgressionEngine, CombatMechanicsEngine
  Tier 2: HPGeneratorEngine, DamageResolutionEngine, ThresholdEngine, ConditionEngine
  Tier 3: ModifierEngine
  Tier 4: ActorEngine (mutation only, no business logic)

✅ Allowed calls:
  ChargenEngine → HPGeneratorEngine
  ProgressionEngine → HPGeneratorEngine
  CombatMechanicsEngine → ThresholdEngine
  DamageResolutionEngine → ModifierEngine
  ThresholdEngine → ModifierEngine
  Any engine → ActorEngine

❌ Forbidden calls:
  DamageResolutionEngine → ProgressionEngine
  ThresholdEngine → ChargenEngine
  ModifierEngine → CombatMechanicsEngine
  HPGeneratorEngine → ProgressionEngine
  ConditionEngine → ThresholdEngine
```

**Why:** Prevents circular dependencies, authority diffusion, and implicit God Objects.

---

## 5. Violation Patterns (Never Allow These)

| Pattern | Why Forbidden | Detection |
|---------|---------------|-----------|
| Engine writes to `actor.system` directly | Bypasses ActorEngine, risks desync | `actor.system` assignment in engine files |
| Engine calls `game.settings.get()` | Multiple configuration sources cause inconsistency | Grep for `game.settings.get` in `scripts/engine/` |
| Engine calls `actor.update()` | Bypasses mutation gate | Grep for `\.update\(` in engine files |
| Engine imports UI files | Breaks separation of concerns, creates test bloat | Imports of `FormApplication`, `Dialog`, `ApplicationV2` in engines |
| Engine imports sheet files | Sheets are views, not business logic containers | Imports of files from `scripts/sheets/` in engines |
| Lateral engine calls (sideways) | Creates implicit authority hubs | Engine A imports Engine B at same tier |
| Upward engine calls | Creates circular dependencies | Engine B imports Engine A where A is higher tier |
| Engine duplicates formula logic | Loses SSOT, creates maintenance debt | Same calculation in two engines |
| CombatMechanicsEngine computes damage | It selects rule variant, not calculates | Direct `threshold - hardness` math in CombatMechanicsEngine |
| ChargenEngine reimplements HP formula | ProgressionEngine owns HP scaling | Different HP calculation in ChargenEngine vs ProgressionEngine |

---

## 6. Engine Contract Checklist

**Every engine MUST satisfy all of these before merge:**

```
□ Does NOT write to actor.system directly
  ↳ All mutations go through ActorEngine.apply() or actor gameplay APIs
  ↳ Grep: No "actor.system." assignments in engine file

□ Returns structured values or decision plans
  ↳ Not side-effects, not direct mutations
  ↳ Example: { variant: 'CORE', applyRule: true } not actor updates

□ Reads HouseRuleService ONLY for config
  ↳ No game.settings.get() calls
  ↳ No direct actor.system.houseRules reads
  ↳ Grep: No "game.settings.get" in engine file

□ Delegates mutation to ActorEngine
  ↳ Engine computes, ActorEngine applies
  ↳ Engine returns structured plan or values

□ Does not import sheet files
  ↳ No imports from scripts/sheets/
  ↳ Grep: No "scripts/sheets" imports

□ Does not import UI applications
  ↳ No FormApplication, Dialog, ApplicationV2
  ↳ Grep: No "FormApplication\|Dialog\|ApplicationV2" imports

□ Does not duplicate logic from other engines
  ↳ If another engine owns calculation, call it
  ↳ No reimplemented formulas
  ↳ Code review: Compare with owned domain

□ Follows dependency direction rule
  ↳ Only downward dependencies
  ↳ No lateral or upward calls
  ↳ Code review: Trace all imports

□ Has logged entry/exit points
  ↳ SWSELogger.debug() at method start with params
  ↳ SWSELogger.debug() at method end with result
  ↳ Enables debugging when rules don't apply

□ All house rules accessed once per call
  ↳ Read HouseRuleService at method start
  ↳ Pass rule state to downstream calls
  ↳ Prevents multiple config lookups
```

---

## 7. Correct Flow Examples

### Example: Character Generation (Correct Pattern)

```javascript
// CharacterGenerationEngine.generateCharacter(actor, options)
// 1. Orchestrates character creation
const abilityScores = this.#generateAbilityScores(options);
const startingWealth = this.#calculateStartingWealth(options);

// 2. Delegates HP to HPGeneratorEngine
const hpPlan = HPGeneratorEngine.calculateLevel1HP(actor, abilityScores);

// 3. Returns structured data, no mutations yet
return {
  abilityScores,
  startingWealth,
  hitPoints: hpPlan.hitPoints,
  modifiers: hpPlan.modifiers
};

// 4. CALLER uses ActorEngine to apply:
await ActorEngine.updateActor(actor, {
  'system.abilities': abilityScores,
  'system.derived.hp': hpPlan.hitPoints,
  // ...
});
```

### Example: Progression (Correct Pattern)

```javascript
// ProgressionEngine.advanceLevel(actor, levelUp, options)
// 1. Owns advancement cadence logic
const talentData = this.#getTalentAcquisition(levelUp);
const skillData = this.#getSkillAdvancement(levelUp);

// 2. Delegates HP to HPGeneratorEngine (SAME ENGINE AS CHARGEN)
const hpPlan = HPGeneratorEngine.calculateLevelUpHP(actor, levelUp);

// 3. Reads HouseRuleService once
const houseRules = HouseRuleService.getAllRules();

// 4. Returns structured plan
return {
  newAbilities: this.#getAbilityIncreases(levelUp, houseRules),
  newTalents: talentData,
  newSkills: skillData,
  newHP: hpPlan.hitPoints,
  modifiers: hpPlan.modifiers
};

// 5. CALLER uses ActorEngine to apply
await ActorEngine.updateActor(actor, progressionPlan);
```

### Example: Combat Rule Selection (Correct Pattern)

```javascript
// CombatMechanicsEngine.selectDeathVariant(actor, options)
// 1. Only decides which variant to use
const houseRules = HouseRuleService.getAllRules();

// 2. Returns decision structure, not calculations
return {
  useInstantDeath: houseRules.deathInstantDeath.enabled,
  thresholdVariant: houseRules.deathThresholdVariant.value,
  applyMassiveDamage: houseRules.massiveDamage.enabled
};

// 3. DamageResolutionEngine interprets these settings:
DamageResolutionEngine.resolveDamage(damage, actor, {
  useInstantDeath: decision.useInstantDeath,
  thresholdVariant: decision.thresholdVariant,
  applyMassiveDamage: decision.applyMassiveDamage
});

// 4. DamageResolutionEngine returns structured result:
return {
  finalDamage: X,
  targetDead: boolean,
  messages: []
};

// 5. CALLER uses ActorEngine to apply death state
```

---

## 8. Detecting Drift (Code Review Checklist)

When reviewing new engines or engine modifications:

1. **Does the engine write state directly?** (Violation: Tier 4 authority)
2. **Does it read game.settings.get() directly?** (Violation: Settings isolation)
3. **Does it call an engine at the same tier?** (Violation: Dependency direction)
4. **Does it call an engine upward?** (Violation: Circular dependency)
5. **Does it duplicate logic from another engine?** (Violation: SSOT)
6. **Does it own calculation AND mutation?** (Violation: Separation of concerns)
7. **Does it import UI or sheet code?** (Violation: Layer crossing)
8. **Does it have logging at entry/exit?** (Code quality check)

If any answer is "yes", reject and request refactoring.

---

## 9. The Core Invariant (Governs All Others)

**Engine computes. ActorEngine applies.**

This rule, held strictly, makes all other violations impossible.

If this rule breaks, stop development and refactor immediately.

---

## 10. Suggestion Engine Contract (CRITICAL GOVERNANCE LAYER)

**SuggestionEngines are pure evaluators only. They are NOT:**
- State managers
- Persistence layers
- Analytics engines
- Enforcement mechanisms
- Calculation duplicators

**SuggestionEngines MUST:**

```javascript
// ✅ ALLOWED: Pure evaluation
const suggestion = SuggestionEngine.suggestFeat(feat, actor, buildIntent);
// Returns: { tier: 4, reason: 'CHAIN_CONTINUATION', confidence: 0.75 }

// ✅ ALLOWED: Read immutable actor snapshot
const level = actor.system.level;
const abilities = actor.system.abilities;
const feats = actor.items.filter(i => i.type === 'feat');

// ✅ ALLOWED: Read house rules through HouseRuleService
const multiclassRules = HouseRuleService.get('multiclassRules');

// ✅ ALLOWED: Return structured recommendation objects
return {
  tier: tier,
  reason: reasonCode,
  confidence: confidenceValue,
  explanation: humanReadableText
};
```

**SuggestionEngines MUST NOT:**

```javascript
// ❌ FORBIDDEN: Direct mutations
actor.system.suggestionEngine.state = value;  // VIOLATION
await actor.setFlag('swse', 'suggestion', data);  // VIOLATION
actor.system.lastSuggested = Date.now();  // VIOLATION

// ❌ FORBIDDEN: Indirect mutations through ActorEngine
await ActorEngine.updateActor(actor, data);  // VIOLATION
await ActorEngine.createEmbeddedDocuments(...);  // VIOLATION

// ❌ FORBIDDEN: Direct settings access
const rule = game.settings.get('foundryvtt-swse', 'rule');  // VIOLATION

// ❌ FORBIDDEN: Rolling or probability calculations
const roll = new Roll('2d20');  // VIOLATION
const damage = Math.random() * 10;  // VIOLATION

// ❌ FORBIDDEN: Replicating progression math
const bab = calculateTotalBAB(actor);  // VIOLATION (BAB belongs in ProgressionEngine)
const hp = d8 + conMod;  // VIOLATION (HP belongs in HPGeneratorEngine)
const modifier = Math.floor((score - 10) / 2);  // VIOLATION (Modifier math belongs in ModifierEngine)

// ❌ FORBIDDEN: Analytics tracking
recordSelection(featId, tierReason);  // VIOLATION
trackPlayerDecision(choice);  // VIOLATION

// ❌ FORBIDDEN: Lateral engine coupling
const forceMods = ForceOptionSuggestionEngine.suggestPowers(...);  // VIOLATION
const classMods = ClassSuggestionEngine.suggestClass(...);  // VIOLATION

// ❌ FORBIDDEN: Lateral domain imports
import { FeatEngine } from '../engines/FeatEngine.js';  // VIOLATION
import { ClassSuggestionEngine } from './ClassSuggestionEngine.js';  // VIOLATION

// ❌ FORBIDDEN: Sheet or UI imports
import { CharacterSheet } from '../sheets/';  // VIOLATION
import { FormApplication } from '@league-of-foundry-developers/foundry-vtt-types';  // VIOLATION
```

### Boundary Architecture

**What SuggestionEngines do:**
```
Input: actor snapshot + house rules + static data
    ↓
Pure evaluation logic
    ↓
Output: structured recommendation object { tier, reason, confidence }
    ↓
UI consumes and displays
```

**What SuggestionEngines do NOT do:**
```
❌ Input → Mutate → Output (NO)
❌ Input → Calculate → Persist → Output (NO)
❌ Input → Track → Enforce → Output (NO)
```

### Responsibility Matrix

| Responsibility | Owner | SuggestionEngine Role |
|---|---|---|
| Evaluate feat tier | SuggestionEngine | Core responsibility ✓ |
| Suggest feat name | SuggestionEngine | Core responsibility ✓ |
| Track player history | PlayerAnalytics (NEW) | None (forbidden) ✗ |
| Persist suggestions | SuggestionStateService (NEW) | None (forbidden) ✗ |
| Calculate BAB | ProgressionEngine | Use pre-computed value only |
| Calculate HP | HPGeneratorEngine | Use pre-computed value only |
| Calculate modifiers | ModifierEngine | Use pre-computed value only |
| Modify actor | ActorEngine | Never call ✗ |
| Read settings | HouseRuleService | Read-only only |

### Violation Detection Patterns

**Pattern: God Object Drift (Combining Evaluation + Persistence)**
```javascript
// ❌ VIOLATION PATTERN
static suggestFeat(feat, actor, ...) {
  const tier = this._evaluateTier(feat, actor);

  // ❌ DRIFT: Persistence embedded in evaluator
  await actor.setFlag('swse', 'lastSuggested', { feat, tier, timestamp: Date.now() });

  return { tier, reason: ... };
}
```

**Fix: Separate Concerns**
```javascript
// ✅ CORRECT: Evaluator only
static suggestFeat(feat, actor, ...) {
  const tier = this._evaluateTier(feat, actor);
  return { tier, reason: ... };
}

// ✅ CORRECT: Persistence in separate service
SuggestionStateService.persistSuggestion(actor, { feat, tier, timestamp: Date.now() });
```

### New Services (Required for Compliance)

These must be created to prevent violations:

1. **SuggestionStateService**
   - Persists suggestion state to flags
   - One responsibility: storage only
   - Called by UI layer, not by SuggestionEngines

2. **PlayerAnalytics**
   - Tracks suggestion history
   - Tracks acceptance/rejection patterns
   - Never reads by SuggestionEngines
   - One responsibility: analytics only

3. **SharedUtilities** (extract from duplication)
   - `AbilityScoreExtractor.getAbilities(actor)`
   - `SkillNormalizer.normalize(skillName)`
   - `BABResolver.computeBAB(actor)`
   - `ModifierCalculator.getModifier(abilityScore)`
   - `ClassSynergyLookup.getSynergies(classId)`

---

## 11. References

- Mutation paths: `docs/ARCHITECTURE_MUTATION_RULES.md`
- Execution pipeline: `docs/EXECUTION_PIPELINE.md`
- Adding actions: `docs/ACTIONS.md`
- Authority model: `docs/ARCHITECTURE.md`
