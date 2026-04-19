# PHASE 3E: PROGRESSION/LEVELING FAMILY MIGRATION — SCOPE AUDIT

## DELIVERABLE A: FAMILY SCOPE CONFIRMATION

### Exact Rules in Scope (14 active rules, explicitly assigned in Phase 1)

**Ability Score & Advancement** (2 rules):
1. `abilityScoreMethod` — String (4d6drop/pointbuy/standard), initial ability score generation method
2. `abilityIncreaseMethod` — String (standard/flexible), how ability increases work during level-up

**HP Generation** (2 rules):
3. `hpGeneration` — String (standard/average/average_minimum/roll), HP gain method per level
4. `maxHPLevels` — Number, levels at which maximum HP is automatically granted

**Multiclass Policy** (4 rules):
5. `multiclassEnhancedEnabled` — Boolean, master toggle for multiclass features
6. `multiclassRetraining` — Boolean, whether multiclass grants retraining
7. `multiclassExtraStartingFeats` — Boolean, extra feat grant on multiclass
8. `multiclassBonusSkillDelta` — Boolean, skill delta calculation for multiclass

**Multiclass Bonus Selection** (1 rule):
9. `multiclassBonusChoice` — String (single_feat/feat_or_skill), what multiclass bonus can be

**Talent Access & Configuration** (3 rules):
10. `talentTreeRestriction` — String (current/all/epic), which talent trees are accessible
11. `groupDeflectBlock` — Boolean, whether Block/Deflect display grouped in UI
12. `blockDeflectTalents` — String (separate/combined), Block/Deflect talent configuration

**Droid Construction** (2 rules):
13. `allowDroidOverflow` — Boolean, whether unspent droid construction credits overflow to general credits
14. `droidConstructionCredits` — Number, base droid construction credit budget

**Character Creation Access** (1 rule):
15. `allowPlayersNonheroic` — Boolean, whether players can create non-heroic (NPC) characters

**Force Suite Reselection** (1 rule):
16. `allowSuiteReselection` — Boolean, whether Force Power suites can be reselected during level-up

**TOTAL: 16 rules** (14 core progression + 2 cross-family but read by progression files)

### Exact Files in Scope (21 files, ~37 direct reads)

**Core Levelup Workflow**:
- scripts/apps/progression-framework/steps/levelup/levelup-main.js (5 reads)
- scripts/apps/progression-framework/steps/levelup/levelup-talents.js (2 reads)

**Character Generation**:
- scripts/apps/chargen/chargen-improved.js (2 reads)
- scripts/apps/chargen/chargen-narrative.js (1 read)
- scripts/apps/chargen/chargen-droid.js (1 read)

**Level-Up Steps**:
- scripts/apps/progression-framework/steps/summary-step.js (2 reads)
- scripts/apps/progression-framework/steps/confirm-step.js (2 reads)
- scripts/apps/progression-framework/steps/droid-builder-step.js (2 reads)
- scripts/apps/progression-framework/steps/droid-builder-adapter.js (2 reads)
- scripts/apps/progression-framework/steps/final-droid-configuration-step.js (1 read)
- scripts/apps/progression-framework/steps/follower-steps/follower-background-step.js (1 read)

**Engine/Core Logic**:
- scripts/engine/HP/HPGeneratorEngine.js (2 reads)
- scripts/engine/progression/policies/multiclass-policy.js (4 reads)

**Houserule Integration**:
- scripts/houserules/houserule-mechanics.js (2 reads)

**Force-Related (Cross-Family)**:
- scripts/engine/force/ForceRules.js (2 reads - already wrapped, but verify)
- scripts/engine/progression/utils/suite-reselection-utils.js (1 read)

**Character Creation Access**:
- scripts/apps/chargen/chargen-init.js (1 read)
- scripts/apps/chargen/template-character-creator.js (1 read)

**Store/Commerce** (Optional, may be out of scope if Phase 3E excludes store):
- scripts/apps/store/store-checkout.js (2 reads)

**TOTAL: 21 files, ~37 direct game.settings.get() calls**

---

## EXACT DIRECT READS TO REPLACE

### By File and Line Number

| File | Lines | Setting Key | Rule Name | Context |
|------|-------|-------------|-----------|---------|
| levelup-main.js | 381 | multiclassBonusChoice | Multiclass Bonus Choice | Bonus type selection |
| levelup-main.js | 384 | talentTreeRestriction | Talent Access | Tree filtering |
| levelup-main.js | 387 | abilityIncreaseMethod | Ability Increase | ASI method |
| levelup-main.js | 537 | showSuggestionDiffOnLevelUp | Suggestion Display | **OUT OF SCOPE** (client UI) |
| levelup-main.js | 1530 | abilityIncreaseMethod | Ability Increase | ASI validation |
| levelup-talents.js | 85 | talentTreeRestriction | Talent Access | Tree filtering |
| levelup-talents.js | 421 | groupDeflectBlock | Block/Deflect Group | Talent grouping |
| chargen-improved.js | 29 | abilityScoreMethod | Ability Score Method | Score generation |
| chargen-improved.js | 447 | blockDeflectTalents | Block/Deflect Talents | Talent combination |
| chargen-narrative.js | 483 | groupDeflectBlock | Block/Deflect Group | Display grouping |
| summary-step.js | 542 | hpGeneration | HP Generation | HP calculation |
| summary-step.js | 543 | maxHPLevels | Max HP Levels | Level cap |
| confirm-step.js | 427 | hpGeneration | HP Generation | HP resolution |
| confirm-step.js | 428 | maxHPLevels | Max HP Levels | Level cap |
| HPGeneratorEngine.js | 26 | hpGeneration | HP Generation | Primary read |
| HPGeneratorEngine.js | 27 | maxHPLevels | Max HP Levels | Level threshold |
| HPGeneratorEngine.js | 114-115 | hpGeneration, maxHPLevels | HP Generation | Settings snapshot |
| houserule-mechanics.js | 171 | hpGeneration | HP Generation | Houserule integration |
| houserule-mechanics.js | 172 | maxHPLevels | Max HP Levels | Houserule cap |
| multiclass-policy.js | 24 | multiclassEnhancedEnabled | Multiclass Enable | Master toggle |
| multiclass-policy.js | 101 | multiclassRetraining | Multiclass Retraining | Skill retraining |
| multiclass-policy.js | 102 | multiclassExtraStartingFeats | Multiclass Extra Feats | Feat grant |
| multiclass-policy.js | 103 | multiclassBonusSkillDelta | Multiclass Skill Delta | Skill delta calc |
| multiclass-policy.js | 257 | multiclassEnhancedEnabled | Multiclass Enable | Mode verify |
| multiclass-policy.js | 275-277 | multiclass* (4 rules) | Multiclass Bonus | Feature flags |
| droid-builder-step.js | 61 | droidConstructionCredits | Droid Credits | Base budget |
| droid-builder-step.js | 62 | allowDroidOverflow | Droid Overflow | Credit handling |
| droid-builder-adapter.js | 54 | droidConstructionCredits | Droid Credits | Base pool |
| droid-builder-adapter.js | 56 | droidConstructionCredits | Droid Credits | Remaining calc |
| final-droid-configuration-step.js | 482 | allowDroidOverflow | Droid Overflow | Final handling |
| chargen-droid.js | 124 | droidConstructionCredits | Droid Credits | Legacy chargen |
| store-checkout.js | 509 | droidConstructionCredits | Droid Credits | Purchase limits |
| store-checkout.js | 1182 | droidConstructionCredits | Droid Credits | Pool fetch |
| chargen-init.js | 52 | allowPlayersNonheroic | Allow Nonheroic | NPC creation |
| template-character-creator.js | 92 | allowPlayersNonheroic | Allow Nonheroic | Template NPC |
| ForceRules.js | 27 | allowSuiteReselection | Suite Reselection | **ALREADY WRAPPED** |
| ForceRules.js | 35 | blockDeflectTalents | Block/Deflect Talents | **ALREADY WRAPPED** |
| ForceRules.js | 42-43 | groupDeflectBlock | Block/Deflect Group | **ALREADY WRAPPED** |
| suite-reselection-utils.js | 15 | allowSuiteReselection | Suite Reselection | Gating logic |
| follower-background-step.js | 23 | enableFollowerBackgrounds | Follower Backgrounds | **EXPERIMENTAL** |

**TOTAL DIRECT READS TO REPLACE: ~36** (excluding showSuggestionDiffOnLevelUp which is client UI, and 2 already wrapped in ForceRules, and 1 experimental)

---

## RULES EXPLICITLY OUT OF SCOPE

These rules are present in progression code but belong to OTHER families per Phase 1 assignment:

| Rule | Family Assignment | Reason | Action |
|------|---|---|---|
| `crossClassSkillTraining` | Skills/Training | Skill selection, not progression | Do not migrate |
| `skillFocusVariant` | Skills/Training | Feat variant, not core progression | Do not migrate |
| `skillFocusActivationLevel` | Skills/Training | Feat timing, not core progression | Do not migrate |
| `pointBuyPool` | Character Creation | Shared attribute allocation, separate system | Do not migrate |
| `droidPointBuyPool` | Character Creation | Droid attribute allocation, separate system | Do not migrate |
| `livingPointBuyPool` | Character Creation | Living character attribute allocation, separate system | Do not migrate |
| `enableBackgrounds` | Background Family | Background feature toggle | Do not migrate |
| `backgroundSelectionCount` | Background Family | Background count constraint | Do not migrate |
| `showSuggestionDiffOnLevelUp` | Suggestion UI Family | Client-side UI display, diagnostic only | Do not migrate |
| `enableFollowerBackgrounds` | Follower System (Experimental) | Experimental feature, assess separately | Do not migrate (for now) |

---

## COUPLING & ISOLATION STRATEGY

### Identified Tight Couplings

**1. HP Generation ↔ Levelup Flow (TIGHT)**
- `hpGeneration` and `maxHPLevels` read in 2+ contexts (levelup steps, HPGeneratorEngine, houserule integration)
- **Isolation Strategy**: Encapsulate HP reads in HPGenerationPolicy; read once at levelup start, pass through context
- **Files Affected**: summary-step.js, confirm-step.js, HPGeneratorEngine.js, houserule-mechanics.js

**2. Multiclass Policy ↔ Progression Engine (TIGHT)**
- `multiclass*` settings read in multiclass-policy.js (8 reads across 4+ methods)
- Settings affect feat/skill grants during levelup
- **Isolation Strategy**: Already well-encapsulated; freeze settings in session at levelup start
- **Files Affected**: multiclass-policy.js (primary), levelup-main.js (consumer)

**3. Talent Access ↔ Levelup Talent Step (TIGHT)**
- `talentTreeRestriction` and `groupDeflectBlock` read during talent selection phase
- Controls runtime behavior (which trees visible, how grouped)
- **Isolation Strategy**: Encapsulate in TalentTreeAccessPolicy; read at talent phase start
- **Files Affected**: levelup-talents.js, levelup-main.js

**4. Droid Construction ↔ Store + Chargen (LOOSE)**
- `droidConstructionCredits` and `allowDroidOverflow` read in 6 places
- Droid system is well-isolated; no direct impact on core progression
- **Isolation Strategy**: Encapsulate in DroidConstructionPolicy; reads already isolated
- **Files Affected**: droid-builder-step.js, droid-builder-adapter.js, final-droid-configuration-step.js, chargen-droid.js, store-checkout.js

**5. Force Suite Reselection ↔ Levelup (MODERATE)**
- `allowSuiteReselection` gates entire reselection phase
- `blockDeflectTalents` and `groupDeflectBlock` affect talent display
- **Isolation Strategy**: Already handled by ForceRules adapter (verify in Phase 3E)
- **Files Affected**: suite-reselection-utils.js, levelup-talents.js

**6. Character Creation Access ↔ Chargen (LOOSE)**
- `allowPlayersNonheroic` gates NPC creation
- Well-isolated, no impact on progression engine
- **Isolation Strategy**: Encapsulate in CharacterCreationAccessPolicy
- **Files Affected**: chargen-init.js, template-character-creator.js

---

## RECOMMENDED ADAPTER STRUCTURE

Create `scripts/engine/progression/ProgressionRules.js` with semantic getters for all 16 rules:

```javascript
export class ProgressionRules {
  // Ability Scores
  static getAbilityScoreMethod() { return HouseRuleService.getString(...) }
  static getAbilityIncreaseMethod() { return HouseRuleService.getString(...) }

  // HP Generation
  static getHPGeneration() { return HouseRuleService.getString(...) }
  static getMaxHPLevels() { return HouseRuleService.getNumber(...) }

  // Multiclass Policy
  static isMulticlassEnhancedEnabled() { return HouseRuleService.getBoolean(...) }
  static multiclassRetrainingEnabled() { return HouseRuleService.getBoolean(...) }
  static multiclassExtraStartingFeatsEnabled() { return HouseRuleService.getBoolean(...) }
  static multiclassBonusSkillDeltaEnabled() { return HouseRuleService.getBoolean(...) }
  static getMulticlassBonusChoice() { return HouseRuleService.getString(...) }

  // Talent Access
  static getTalentTreeRestriction() { return HouseRuleService.getString(...) }
  static groupDeflectBlockEnabled() { return HouseRuleService.getBoolean(...) }
  static getBlockDeflectTalents() { return HouseRuleService.getString(...) }

  // Droid Construction
  static droidOverflowEnabled() { return HouseRuleService.getBoolean(...) }
  static getDroidConstructionCredits() { return HouseRuleService.getNumber(...) }

  // Character Creation Access
  static allowPlayersNonheroic() { return HouseRuleService.getBoolean(...) }

  // Force Suite Reselection
  static suiteReselectionAllowed() { return HouseRuleService.getBoolean(...) }
}
```

---

## SUMMARY: PHASE 3E SCOPE CONFIRMED

✓ **16 rules identified** (14 core progression + 2 force-adjacent)
✓ **21 files reading progression rules** (~36 direct reads to replace)
✓ **Couplings identified and isolation strategies defined**
✓ **Out-of-scope rules clearly marked** (Skills, Background, Character Creation families)
✓ **No scope creep required**

**Ready to proceed with ProgressionRules adapter creation and file rewiring.**
