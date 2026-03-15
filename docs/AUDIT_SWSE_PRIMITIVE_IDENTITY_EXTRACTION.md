# SWSE Primitive → Identity Extraction Audit

## PHASE 1: Primitive Inventory

### Total Unique Rule Types Found: 192

### Critical Identity-Related Primitives (Rule Types That Affect Bias)

**Mechanical Modifier Primitives:**
- `skillModifier` - Adds bonus to specific skills
- `skillBonus` - Generic skill bonus
- `skillTrained` - Marks skill as trained
- `damageModifier` - Modifies damage output
- `damageBonus` - Generic damage bonus
- `defenseBonus` - Defense modifier
- `defenseModifier` - Defense alteration
- `attackBonus` - Attack roll modifier
- `attackPenaltyReduction` - Reduces attack penalties
- `abilityScoreModifier` - Modifies ability scores
- `speedBonus` - Movement speed increase
- `initiative` - Initiative modifier

**Structural Access Primitives:**
- `featGrant` - Grants feats
- `featPattern` - Pattern-based feat granting
- `talentFromTree` - Grants talents
- `naturalWeapon` - Grants natural weapons
- `grantItem` - Grants items/equipment
- `sense` - Grants senses (darkvision, etc.)
- `immunity` - Grants immunities
- `proficiency` - Weapon/armor proficiency

**Conditional/Situational Primitives:**
- `reroll` - Allows rerolling
- `meleeCultureBonus` - Melee bonus in certain cultures
- `fastHealing` - Healing over time
- `damageReduction` - Reduces incoming damage
- `damageReductionPenetration` - Overcomes DR
- `concealment` - Provides concealment
- `evasion` - Dodge ability

**Action/Tactical Primitives:**
- `combatAction` - Grants combat action
- `counterattack` - Reaction attack capability
- `freeReaction` - Additional reaction
- `extraAction` - Extra action/turn ability

**Identity-Irrelevant Metadata Types (Not Primitives):**
- `encounter`, `day`, `rounds` (duration types)
- `swift`, `standard`, `fullRound` (action types)
- `always`, `skillCheck` (condition/trigger types)
- `equipment`, `species`, `background` (classification)

---

## PHASE 2: Canonical Bias Alignment

### Mapping Primitive Targets to Canonical Keys

| Primitive Type | Target Example | Canonical Key Match | Classification | Risk Level |
|---|---|---|---|---|
| `skillModifier` (persuasion) | persuasion +5 | `persuasionMastery` | NORMALIZATION_REQUIRED | LOW |
| `skillModifier` (stealth) | stealth +5 | `stealthMastery` | DIRECT_MATCH | LOW |
| `skillModifier` (knowledge) | knowledgeLifeSciences +2 | `knowledgeMastery` | NORMALIZATION_REQUIRED | LOW |
| `damageModifier` (melee) | melee +2 | `meleeDamage` | DIRECT_MATCH | LOW |
| `defenseModifier` | defense +1 | `reactionDefense` | NORMALIZATION_REQUIRED | LOW |
| `abilityScoreModifier` | str, dex, etc. | `str`, `dex`, etc. | DIRECT_MATCH | LOW |
| `featGrant` | any feat | DEPENDS_ON_FEAT | STRUCTURAL_ACCESS | MEDIUM |
| `naturalWeapon` | melee attack | `meleeDamage` + `striker` | STRUCTURAL_ACCESS | MEDIUM |
| `sense` (darkvision) | vision enhancement | `tacticalAwareness` | NORMALIZATION_REQUIRED | LOW |
| `immunity` (fear) | immune to fear | `moraleImpact` (inverted) | STRUCTURAL_ACCESS | MEDIUM |
| `speedBonus` | +5 ft move | `mobility` / `evasion` | STRUCTURAL_ACCESS | LOW |
| `reroll` (skill) | reroll checks | `resourcefulness` + `adaptability` | CONDITIONAL | MEDIUM |
| `damageReduction` | -5 damage | `damageReduction` | DIRECT_MATCH | LOW |
| `fastHealing` | heal 5/rnd | `healingMastery` + `combatStamina` | STRUCTURAL_ACCESS | MEDIUM |
| `counterattack` | reaction attack | `counterAttack` | DIRECT_MATCH | LOW |
| `meleeCultureBonus` | melee +2 culture | `meleeDamage` + `roleSpecific` | NORMALIZATION_REQUIRED | MEDIUM |

### UNKNOWN Primitives (No Clear Canonical Match):
- `meleeCultureBonus` - Culture-specific bonus (non-standard)
- `autoRedirect` - Automatic redirection mechanic
- `talentFromTree` - Talent grant mechanism
- `chargeBenefit` - Charge-specific bonus
- `costReduction` - Cost reduction (unclear what cost)
- `darkSideScoreDynamic` - Dark Side corruption tracking
- `drainHeal` - Drain = heal conversion
- `guaranteedResult` - Automatic success
- `halfDamageOnHit` - Damage reduction on hit
- `keepDexBonus` - DEX bonus retention
- `missChance` - Gives miss chance
- `negatesPenalty` - Removes penalties
- `rangePenalty` - Range-based penalty
- `suppressionPenalty` - Suppression effect
- `vehicleEvasion` - Vehicle-specific evasion

---

## PHASE 3: Semantic Mapping Feasibility

### Proposed Deterministic Mappings for Structural Primitives

#### 1. FeatGrant Primitive
```
if primitive.type === "featGrant":
  feat = lookupFeatByName(primitive.featName)
  if feat has bias mapping:
    bias += feat.bias
  else:
    bias += inferBiasFromFeatName(feat.name)  // RISKY - text inference
```

**Risk:** `inferBiasFromFeatName()` requires text analysis → introduces drift
**Recommendation:** Feats must have explicit bias metadata in feat-metadata.json

#### 2. Natural Weapon Primitive
```
if primitive.type === "naturalWeapon":
  bias.mechanicalBias.meleeDamage += 0.3
  bias.roleBias.striker += 0.2
  bias.roleBias.bruiser += 0.1
```

**Risk:** Fixed mapping assumes all natural weapons are equal → incorrect
**Recommendation:** Different natural weapons (claws vs. tusks) map differently

#### 3. Immunity Primitive
```
if primitive.type === "immunity" && primitive.immunity === "fear":
  bias.mechanicalBias.moraleImpact += 0.2  // resistance to morale effects
  if primitive.appliesToAllies:
    bias.roleBias.support += 0.1
```

**Risk:** Some immunities are defensive (fear), others offensive (mind)
**Recommendation:** Classification required per immunity type

#### 4. Speed Bonus Primitive
```
if primitive.type === "speedBonus":
  bonus = primitive.value  // e.g., 5 ft/round
  if bonus >= 10:
    bias.mechanicalBias.mobility += 0.3
    bias.roleBias.skirmisher += 0.2
  else if bonus >= 5:
    bias.mechanicalBias.mobility += 0.15
```

**Risk:** Linear mapping may not reflect actual game impact
**Recommendation:** Tiered mapping based on bonus magnitude

#### 5. Fast Healing Primitive
```
if primitive.type === "fastHealing":
  healsPerRound = primitive.value  // e.g., 5 HP/rnd
  if healsPerRound >= 5:
    bias.mechanicalBias.combatStamina += 0.4
    bias.roleBias.defender += 0.2
  else:
    bias.mechanicalBias.healingMastery += 0.2
```

**Risk:** Doesn't account for combat duration or enemy damage output
**Recommendation:** Simple magnitude-based mapping acceptable

---

## PHASE 4: Conditional Primitive Safety

### Primitives with Situational Application

| Primitive | Condition | Recommended Bias Treatment | Confidence |
|---|---|---|---|
| `reroll` | Only triggers on failure | Reduce bias by 30% (not guaranteed) | HIGH |
| `meleeCultureBonus` | Only in specific cultures | Reduce bias by 50% (situational) | HIGH |
| `fastHealing` | Only while combat active | Full bias (always in combat context) | MEDIUM |
| `counterattack` | Only after enemy action | Reduce bias by 40% (reactive) | HIGH |
| `freeReaction` | Limited by reaction economy | Reduce bias by 25% (action economy) | MEDIUM |
| `damageReduction` | Only against physical damage | Full bias (most attacks are physical) | HIGH |
| `concealment` | Depends on lighting/environment | Reduce bias by 50% (situational) | MEDIUM |

---

## PHASE 5: SSOT Violations & Critical Findings

### ✅ No hardcoded identity metadata in feats/talents (Good)

### ⚠️ MODERATE VIOLATIONS:

1. **Inconsistent Primitive Structure**
   - Some primitives have `value` fields (numeric)
   - Others have complex nested objects
   - Some use `bonusType` ("species", "competence"), others don't
   - **Impact:** Makes deterministic aggregation difficult

2. **Text-Inferred Identity in Feat Names**
   - Example: Feat named "Weapon Focus" must infer `weaponMastery` bias
   - **Impact:** No explicit bias-to-primitive mapping exists
   - **Solution:** Add `identityKey` field to feat-metadata.json

3. **Missing Bias Metadata**
   - Feat-metadata.json has `tags` but NO canonical bias keys
   - Example: "Weapon Focus" has tags ["weapon-mastery", "accuracy"] but no `mechanicalBias` mapping
   - **Impact:** IdentityEngine cannot extract bias without text inference

4. **Conditional Primitives Lack Weighting Info**
   - Primitive says "reroll 1/encounter" but doesn't say "reduce bias to 70%"
   - **Impact:** All conditionals treated as 100% reliable in bias calculation

5. **Talent Tree Primitives Not Standardized**
   - `talentFromTree` grants are unstructured
   - No mapping from talent name to bias keys
   - **Impact:** Cannot deterministically map talents → bias

### 🔴 CRITICAL VIOLATIONS:

1. **No Central Primitive → Bias Registry**
   - Primitives reference skills, feats, talents by NAME
   - No canonical registry maps name → canonical bias key
   - **Risk:** Name changes break bias mapping
   - **Example:** If skill "Persuasion" renamed to "Influence", all mappings fail

2. **Feat-Metadata Missing Identity Layer**
   - Feat-metadata.json has metadata but NO bias fields
   - Must add `mechanicalBias`, `roleBias`, `attributeBias` to each feat
   - **Current State:** feat-metadata.json is classification only, not identity
   - **Required:** Extend feat-metadata.json with explicit bias mappings

---

## PHASE 6: IdentityEngine Extraction Feasibility

### Question 1: Can IdentityEngine iterate actor.items.rules and build TotalBias deterministically?

**Answer: PARTIALLY, with major caveats**

✅ Yes if:
- All feats have explicit bias metadata in feat-metadata.json
- All talents have bias mappings
- All primitives are numeric and aggregatable
- Conditional primitives have weighting factors

❌ No if:
- Feats are mapped by text inference (current state)
- Talents are not enumerated
- Conditional primitives lack weighting
- Unknown primitives (meleeCultureBonus, etc.) cannot be mapped

**Current State: NOT DETERMINISTIC** — would require text inference on feat names.

---

### Question 2: Are all primitive values numeric and aggregatable?

**Answer: MOSTLY YES, but with exceptions**

✅ Aggregatable primitives:
- skillModifier, damageModifier, defenseBonus, attackBonus
- speedBonus, abilityScoreModifier
- All numeric bonuses

❌ Non-aggregatable primitives:
- featGrant (grants a feat, not a number)
- talentFromTree (grants a talent)
- sense, immunity, naturalWeapon (binary grants)
- reroll (probability modifier)

**Workaround:** Map binary grants to bias points (e.g., immunity = +0.2 defense bias)

---

### Question 3: Are there any primitives that would cause double counting?

**Answer: YES, SIGNIFICANT RISK**

**Double-Counting Scenarios:**

1. **Feat Contains Both Primitive and Identity Metadata**
   ```json
   {
     "name": "Weapon Focus",
     "primitive": { "type": "attackBonus", "value": 2 },
     "mechanicalBias": { "accuracy": 0.3 }  // DOUBLE COUNT!
   }
   ```
   Risk: Apply both primitive (+2 accuracy) AND feat bias (+0.3 accuracy)

2. **Talent Grants Feat That Also Grants Primitive**
   ```
   Talent grants: Feat("Weapon Focus") which has primitive attackBonus
   + Primitive is added to actor.items.rules
   Result: attackBonus counted twice
   ```

3. **Class Feature + Feat + Primitive Stack**
   Example: Noble class feature grants "Command" feat
   - Feat has primitive: commandAuthority +2
   - Feat has metadata: commandAuthority bias +0.2
   - Actor has primitive from feat
   Result: Double application

**Recommendation:**
- Primitives should NOT also have identity metadata
- Choose one: either primitive-based or metadata-based
- Create mapping table: primitive → canonical bias (not both)

---

### Question 4: Are stacking rules deterministic?

**Answer: PARTIALLY**

✅ Deterministic:
- Multiple skillModifier primitives stack (additive)
- Multiple damageBonus primitives stack (additive)
- Standard Foundry bonus types (competence, circumstance) follow canonical stacking

❌ Non-deterministic:
- Custom bonuses (e.g., "meleeCultureBonus") have unclear stacking
- Conditional primitives don't specify interaction
- No stacking cap enforcement

**Recommendation:** Enforce additive-only stacking, cap identity bias layers at 5.0

---

### Question 5: Is there any hidden logic that would conflict with additive bias model?

**Answer: YES**

**Conflicts Found:**

1. **Dark Side Corruption (`darkSideScoreDynamic`)**
   - Primitive corrupts actor with Dark Side points
   - This is NOT bias; it's mechanical state change
   - **Conflict:** Adds to actor state, not bias vector
   - **Resolution:** Exclude from IdentityEngine bias, track separately

2. **Cost Reductions (`costReduction`)**
   - Reduces resource cost of actions
   - Not directly a bias; it's economy modifier
   - **Conflict:** Doesn't map to any canonical bias key
   - **Resolution:** Map to `resourcefulness` or `skillUtility`?

3. **Talent Tree Auto-Selection (`talentFromTree`)**
   - Auto-grants talents based on conditions
   - Could trigger circular dependencies
   - **Conflict:** IdentityEngine would need to resolve talent chain recursively
   - **Resolution:** Pre-compute all granted talents before bias extraction

4. **Vehicle Combat (`vehicleEvasion`, `shipCombatAction`)**
   - Primitives are vehicle-specific, not character-based
   - **Conflict:** Identity is character-based, not vehicle-based
   - **Resolution:** Skip vehicle primitives in IdentityEngine

---

## DETERMINISTIC EXTRACTION VERDICT

### ❌ **NOT SAFE TO PROCEED WITHOUT REFACTOR**

#### Current Issues:

1. **Feat-metadata.json lacks identity layer**
   - Has categories and tags, not bias mappings
   - IdentityEngine cannot extract feat bias deterministically
   - **Would require:** Text inference on feat names (introduces drift)

2. **Talent system not integrated**
   - Talents granted via `talentFromTree` primitives
   - No talent-to-bias mapping exists
   - **Would require:** Talent registry with bias fields

3. **Conditional primitives unweighted**
   - Rerolls, situational bonuses marked as "1/encounter"
   - No bias reduction factor applied
   - **Would require:** Weighting metadata on each conditional

4. **Structural access primitives (feats, talents) require leap**
   - From primitive grant → to identity bias
   - Requires intermediate mapping layer
   - **Current:** No mapping layer exists

5. **Unknown primitives unmappable**
   - `meleeCultureBonus`, `costReduction`, `darkSideScoreDynamic`, etc.
   - Cannot be safely mapped to canonical bias keys
   - **Would require:** Classification of all 192 types

---

## Estimated Refactor Scope

### REQUIRED (Blocking):

1. **Extend feat-metadata.json with bias mappings** (2-4 hours)
   - Add `mechanicalBias`, `roleBias`, `attributeBias` to every feat
   - Remove text inference entirely
   - Use canonical keys only

2. **Create talent registry with bias mappings** (3-5 hours)
   - Map every talent to canonical bias keys
   - Pre-compute talent chains (no circular dependencies)
   - Integrate with `talentFromTree` primitives

3. **Normalize conditional primitive weighting** (1-2 hours)
   - Add `biasWeight` field to reroll, situational primitives
   - Example: `{ "type": "reroll", "biasWeight": 0.7 }`
   - Document weighting decisions

4. **Classify & map unknown primitives** (2-3 hours)
   - Review all 192 types
   - Classify as IDENTITY (map to bias), MECHANICAL (skip), METADATA (skip)
   - Create mapping table for all IDENTITY types

### OPTIONAL (Quality):

1. **Create primitive → bias registry** (1-2 hours)
   - Central JSON mapping all primitives to canonical bias
   - Used by IdentityEngine for deterministic lookup

2. **Add stacking rules document** (1 hour)
   - Enforce additive-only
   - Define bias layer caps
   - Document exception cases

3. **Exclude vehicle/ship primitives** (30 min)
   - Filter out vehicle-specific types from IdentityEngine
   - Document exclusion rationale

---

## FINAL RECOMMENDATION

### ✅ **Proceed with Refactor Before IdentityEngine Integration**

**Order:**
1. ✏️ Extend feat-metadata.json with canonical bias fields
2. 📋 Create talent registry with bias mappings
3. ⚖️ Normalize conditional primitive weighting
4. 📖 Classify all 192 primitive types

**After Refactor:**
- IdentityEngine.computeObservedBehaviorBias() can safely iterate actor.items
- All primitives map deterministically to canonical bias keys
- No text inference required
- No double counting risk
- No SSOT violations

**Time Estimate:** 8-15 hours total refactor

---

## Audit Generated
**Date:** 2026-03-12
**Branch:** claude/formalize-archetype-schema-3aL3T
**Auditor:** SWSE Architecture Team
