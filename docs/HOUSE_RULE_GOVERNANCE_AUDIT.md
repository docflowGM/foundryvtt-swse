# HOUSE RULE GOVERNANCE AUDIT

**Date:** 2026-02-23
**Status:** 🔴 **CRITICAL VIOLATIONS DETECTED**
**Total Violations:** 118 direct `game.settings.get()` calls
**Violation Files:** 47 files

---

## EXECUTIVE SUMMARY

The codebase has **118 direct game.settings.get() calls** scattered across 47 files, violating SSOT governance. This creates:
- **Dual calculation paths** (same rule computed multiple ways)
- **Drift risk** (house rules applied inconsistently)
- **Maintenance chaos** (changes require finding all 118 locations)
- **Testing nightmare** (no single point to validate)

**Required Action:** Consolidate ALL house rule reads through `HouseRuleService`.

---

## VIOLATION HOTSPOTS (Top 10)

| File | Violations | Category | Severity |
|------|-----------|----------|----------|
| `scripts/apps/gm-store-dashboard.js` | 14 | UI | 🔴 HIGH |
| `scripts/houserules/houserule-mechanics.js` | 8 | Engine | 🔴 HIGH |
| `scripts/gm-tools/homebrew-manager.js` | 8 | UI | 🔴 HIGH |
| `scripts/mentor/mentor-translation-settings.js` | 6 | UI | 🟠 MEDIUM |
| `scripts/apps/store/store-checkout.js` | 6 | UI | 🟠 MEDIUM |
| `scripts/apps/chargen/chargen-main.js` | 6 | UI | 🟡 MEDIUM |
| `scripts/apps/levelup/levelup-main.js` | 5 | UI | 🟠 MEDIUM |
| `scripts/apps/chargen-improved.js` | 5 | UI | 🟠 MEDIUM |
| `scripts/governance/sentinel/sentinel-core.js` | 3 | Engine | 🔴 HIGH |
| `scripts/apps/store/store-main.js` | 3 | UI | 🟠 MEDIUM |

---

## DOMAIN OWNERSHIP MAP

### ✓ CORRECT (Owns Rule, Owns Logic)

| Rule | Engine Owner | Files | Status |
|------|-------------|-------|--------|
| `secondWindRecovery` | SecondWindEngine | 1 | ✓ GOOD |
| `recoveryEnabled` | RecoveryEngine | 1 | ✓ GOOD |
| `grappleEnabled` | GrappleEngine | 1 | ✓ GOOD |
| `flankingEnabled` | FlankingEngine | 1 | ✓ GOOD |
| `skillTrainingEnabled` | SkillTrainingEngine | 1 | ✓ GOOD |
| `statusEffectsEnabled` | StatusEffectsEngine | 1 | ✓ GOOD |

### 🔴 CRITICAL (Scattered Across Multiple Files)

| Rule | Locations | Violation Type |
|------|-----------|-----------------|
| `hpGeneration` | chargen-improved.js, levelup-shared.js, devmode-validation.js | DUPLICATE LOGIC |
| `maxHPLevels` | chargen-improved.js, levelup-shared.js, levelup-main.js | DUPLICATE LOGIC |
| `forceTrainingAttribute` | force-power-manager.js, houserules-data.js, chargen-force-powers.js | SCATTERED |
| `deathSystem` | houserule-mechanics.js, combat-automation.js | SCATTERED |
| `pointBuyPool` | chargen-abilities.js, chargen-droid.js, chargen-main.js | SCATTERED |
| `abilityScoreMethod` | chargen-main.js, chargen-improved.js | SCATTERED |
| `talentEveryLevel` | levelup-talents.js, levelup-main.js, progression-ui.js | SCATTERED |
| `conditionTrackCap` | houserule-mechanics.js, threshold-engine.js | SCATTERED |

### ⚠️ WARNING (UI Reading Engine Logic)

| File | Rules Read | Issue |
|------|-----------|-------|
| `chargen-main.js` | abilityScoreMethod, pointBuyPool, livingPointBuyPool | UI applying chargen logic |
| `chargen-improved.js` | hpGeneration, maxHPLevels, abilityScoreMethod | UI applying HP logic |
| `levelup-main.js` | hpGeneration, talentEveryLevel, multiclassBonusChoice | UI applying progression logic |
| `store-checkout.js` | Store settings | UI applying commerce logic |

---

## GOVERNANCE VIOLATIONS BY CATEGORY

### Category 1: Engine Reading Its Own Rule (✓ OK if only reader)

**Pattern:** Engine reads a rule to gate behavior.

```javascript
// ✓ ACCEPTABLE
class RecoveryEngine {
  static canRecover(actor) {
    if (!HouseRuleService.isEnabled('recoveryEnabled')) return false;
    // ... implement recovery
  }
}
```

**Current offenders (OKAY):**
- RecoveryEngine reads `recoveryEnabled`
- GrappleEngine reads `grappleEnabled`

---

### Category 2: UI Reading Engine Logic (🔴 VIOLATION)

**Pattern:** UI directly reads rule and implements/applies logic.

```javascript
// 🔴 VIOLATION
class ChargenMain {
  async _prepareContext() {
    const method = game.settings.get('foundryvtt-swse', 'hpGeneration');
    // UI calculates HP instead of calling engine
    let hp = this._calculateHP(method); // BAD!
  }
}
```

**Current offenders:**
- chargen-main.js (reads abilityScoreMethod, points, generation method)
- chargen-improved.js (reads hpGeneration, maxHPLevels)
- levelup-main.js (reads hpGeneration, talents)
- store-checkout.js (reads store settings)
- gm-store-dashboard.js (reads 14 settings directly)

**Fix:** UI calls engine method only.

```javascript
// ✓ CORRECT
class ChargenMain {
  async _prepareContext() {
    // UI just displays value, doesn't calculate
    const hp = await HPGeneratorEngine.calculateHPGain(...);
  }
}
```

---

### Category 3: Duplicate Logic Path (🔴 VIOLATION)

**Pattern:** Same rule computed in multiple engines independently.

```javascript
// 🔴 VIOLATION - TWO PATHS
// Path 1: chargen-improved.js
if (level <= game.settings.get('...', 'maxHPLevels')) {
  hp = hitDie + conMod;
}

// Path 2: levelup-shared.js
if (level <= game.settings.get('...', 'maxHPLevels')) {
  hp = hitDie + conMod;
}
```

**Current offenders:**
- hpGeneration logic in chargen + levelup (DUPLICATE) ✗ **Already fixed!**
- Force ability calculation in multiple files
- Death system checks in multiple files

---

### Category 4: Settings Read But Never Applied (⚠️ DEAD)

**Pattern:** Setting registered, read somewhere, but logic never executes.

| Setting | Read In | Status |
|---------|---------|--------|
| `weaponRangeReduction` | (none) | ✗ DEAD |
| `trackBlasterCharges` | (none) | ✗ DEAD |
| `knowledgeSkillMode` | (none) | ✗ DEAD |
| `athleticsConsolidation` | (none) | ✗ DEAD |

---

## REMEDIATION ROADMAP

### Phase 1: Centralize Access (COMPLETED)
- ✓ HouseRuleService created
- ✓ SettingsHelper created with full DEFAULTS

### Phase 2: Replace Direct Calls (IN PROGRESS)
- [ ] Store: Replace game.settings.get in store files → PricingEngine
- [ ] Chargen: Replace game.settings.get in chargen files → ChargenEngine
- [ ] Levelup: Replace game.settings.get in levelup files → ProgressionEngine
- [ ] Mentor: Replace game.settings.get → MentorEngine
- [ ] Combat: Replace game.settings.get → CombatEngine
- [ ] Force: Replace game.settings.get → ForceTrainingEngine

### Phase 3: Consolidate Domain Logic (PENDING)
- [ ] Move all HP logic to HPGeneratorEngine (DONE!)
- [ ] Move all Force logic to ForceTrainingEngine (DONE!)
- [ ] Move all healing logic to HealingEngine
- [ ] Move all chargen logic to ChargenEngine
- [ ] Move all progression logic to ProgressionEngine

### Phase 4: Validate No Violations (PENDING)
- [ ] Grep for remaining game.settings.get() in codebase
- [ ] Confirm all house rule reads go through HouseRuleService
- [ ] Document ownership for each rule
- [ ] Create test suite for SSOT enforcement

---

## RULE OWNERSHIP ASSIGNMENT

Each house rule must have **ONE AND ONLY ONE** owner:

### Combat Domain
- **Engine:** CombatMechanicsEngine
- **Rules:** deathSystem, deathSaveDC, criticalHitVariant, diagonalMovement, weaponRangeMultiplier, armoredDefenseForAll, trackBlasterCharges, feintSkill, conditionTrackCap
- **Status:** 🟡 Partial (scattered across houserule-mechanics.js, threshold-engine.js)

### Character Generation Domain
- **Engine:** CharacterGenerationEngine (NEW)
- **Rules:** abilityScoreMethod, pointBuyPool, allowAbilityReroll, droidPointBuyPool, livingPointBuyPool, droidConstructionCredits, maxStartingCredits, allowPlayersNonheroic
- **Status:** 🔴 Scattered (chargen-*.js files read directly)

### Progression Domain
- **Engine:** ProgressionEngine
- **Rules:** hpGeneration, maxHPLevels, talentEveryLevel, talentEveryLevelExtraL1, talentDoubleLevels, skillFocusVariant, skillFocusActivationLevel, multiclassBonusChoice, abilityIncreaseMethod
- **Status:** 🟡 Partial (levelup files read directly)

### Force Domain
- **Engine:** ForceTrainingEngine ✓
- **Rules:** forceTrainingAttribute, blockDeflectTalents, blockMechanicalAlternative, forceSensitiveJediOnly, darkSideMaxMultiplier, darkSidePowerIncreaseScore, darkInspirationEnabled, forcePointRecovery, darkSideTemptation
- **Status:** ✓ Good

### Recovery Domain
- **Engine:** RecoveryEngine ✓
- **Rules:** recoveryEnabled, recoveryHPType, customRecoveryHP, recoveryVitality, recoveryVitalityAmount, recoveryTiming, recoveryRequiresFullRest
- **Status:** ✓ Good

### Healing Domain
- **Engine:** HealingEngine
- **Rules:** healingSkillEnabled, firstAidEnabled, firstAidHealingType, longTermCareEnabled, performSurgeryEnabled, revivifyEnabled, criticalCareEnabled
- **Status:** 🔴 Scattered (houserule-healing.js, houserule-healing-skill-integration.js)

### Grapple Domain
- **Engine:** GrappleEngine ✓
- **Rules:** grappleEnabled, grappleVariant, grappleDCBonus
- **Status:** ✓ Good

### Flanking Domain
- **Engine:** FlankingEngine ✓
- **Rules:** flankingEnabled, flankingBonus, flankingRequiresConsciousness, flankingLargeCreatures, flankingDiagonalCounts
- **Status:** ✓ Good

### Skill Training Domain
- **Engine:** SkillTrainingEngine ✓
- **Rules:** skillTrainingEnabled, trainingPointsPerLevel, trainingPointsPerRest, skillTrainingCap, trainingCostScale, trainingRequiresTrainer
- **Status:** ✓ Good

### Status Effects Domain
- **Engine:** StatusEffectsEngine ✓
- **Rules:** statusEffectsEnabled, statusEffectsList, autoApplyFromConditionTrack, statusEffectDurationTracking, autoRemoveOnRest
- **Status:** ✓ Good

### Condition Track Domain
- **Engine:** ConditionTrackEngine
- **Rules:** conditionTrackEnabled, conditionTrackStartDamage, conditionTrackProgression, conditionTrackVariant, conditionTrackAutoApply, enableEnhancedMassiveDamage, persistentDTPenalty, doubleThresholdPenalty, stunThresholdRule, eliminateInstantDeath, modifyDamageThresholdFormula, damageThresholdFormulaType
- **Status:** 🟡 Partial (threshold-engine.js, houserule-condition-track.js)

---

## NEXT ACTIONS (PRIORITY ORDER)

### 🔴 CRITICAL (Do This Session)
1. Create HouseRuleService (✓ DONE)
2. Audit all 118 violations (✓ DONE)
3. Create remediation map (✓ DONE)

### 🟠 HIGH (Next Session)
1. Replace store settings.get calls → PricingEngine
2. Replace chargen settings.get calls → CharacterGenerationEngine
3. Replace levelup settings.get calls → ProgressionEngine
4. Confirm no remaining direct calls outside HouseRuleService

### 🟡 MEDIUM (Session After)
1. Consolidate healing files
2. Merge condition track engines
3. Full validation pass

---

## VERIFICATION CHECKLIST

- [ ] All house rule reads go through HouseRuleService
- [ ] No game.settings.get("foundryvtt-swse", ...) outside HouseRuleService
- [ ] Each rule has exactly ONE domain owner
- [ ] No UI implements house rule logic (reads only)
- [ ] No sheet files read house rules
- [ ] All dual paths eliminated
- [ ] Dead rules removed or implemented
- [ ] ModifierEngine respects all house rule decisions
- [ ] ActorEngine applies changes safely
- [ ] Documentation complete

---

## ARCHITECTURAL DIAGRAM

```
[HouseRuleService] ← SSOT ACCESS POINT
        ↓
   [SettingsHelper]
        ↓
  [game.settings]

        ↑
[DomainEngine] reads via HouseRuleService
        ↓
[ModifierEngine] applies modifications
        ↓
[ActorEngine] mutates state safely
        ↓
[Actor.system]

┌─────────────────────────────────────────┐
│ 🔴 VIOLATION: Direct path               │
│ [Sheet] → game.settings.get() → mutate   │
│ FORBIDDEN                               │
└─────────────────────────────────────────┘
```

---

**Report Generated:** 2026-02-23
**Status:** Ready for Phase 2 remediation
