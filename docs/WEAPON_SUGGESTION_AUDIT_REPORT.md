# SWSE Weapon/Gear Suggestion System — Architectural Audit Report

**Audit Date:** March 12, 2026
**Scope:** Weapons, Armor, Gear suggestion engines
**Assumption:** Zero prior knowledge of IdentityEngine or bias systems
**Objective:** Determine whether suggestion system classification can safely inform identity inference

---

## PHASE 2 — Classification Extraction Feasibility Analysis

### 2.1 Canonical Category Map

**Finding:** YES, structured taxonomy exists, but **distributed across three systems**

| System | Categories | Structure | Consistency |
|--------|-----------|-----------|-------------|
| **Weapons** | 8 main groups (simple-melee, advanced-ranged, exotic, lightsabers, grenades) | `system.group` metadata field | ✅ High - peer groups well-defined |
| **Armor** | 3 categories (light, medium, heavy) | `system.category` + soak bonus | ✅ High - mechanical definitions |
| **Gear** | 4 categories (survival, medical, tech, utility) | Tag-based, no formal category | ⚠️ Medium - tag inference only |

**Classification:** **STRUCTURED_TAXONOMY** (weapons, armor) + **TAG_ONLY** (gear)

### 2.2 Tag Standardization

**Finding:** Tags are **partially standardized** but **ad-hoc**

**Status:**
- ✅ Weapon tags: Consistent within categories (e.g., lightsaber tags)
- ⚠️ Armor tags: Basic set (Civilian, Military, Exotic)
- ❌ Gear tags: Unstructured; rely on manual author categorization

**Tag Sources:**
- Hand-authored in item definitions
- No central tag registry
- No validation against canonical tag list
- Tags used for explanation, not formal categorization

**Risk:** Medium - tag inflation possible, normalization may fail on custom items

### 2.3 Role-Awareness of Categories

**Finding:** Categories **ARE role-aware**, but roles are **inferred, not explicit**

**Current Role Inference:**
```
Role Detection Method: Class name pattern matching
├─ Soldier → melee-striker
├─ Scout → ranged-striker
├─ Jedi → caster
├─ Scoundrel → generalist
└─ Prestige classes → mapped to base class patterns
```

**How Categories Respond to Roles:**
- Weapon scoring: `role_alignment_engine` matches weapon type to role
- Armor scoring: Defender roles prefer heavy armor (+25 pts)
- Gear scoring: Medical gear bonus for support roles

**Risk:** Medium - Hard-coded class names create fragility; new classes break role inference

### 2.4 Category Consistency Across Items

**Finding:** Consistency is **EXCELLENT within weapon/armor groups**, but **WEAK across systems**

**Consistency Matrix:**

| Dimension | Weapons | Armor | Gear | Cross-System |
|-----------|---------|-------|------|--------------|
| **Naming** | Consistent (group field) | Consistent (3 categories) | Inconsistent (tags) | ❌ No overlap |
| **Metadata** | Rich (damage, accuracy) | Rich (soak, penalties) | Sparse (utility value) | ❌ Different schemas |
| **Normalization** | Peer-group based | Class-based | None | ❌ Not integrated |
| **Canonicality** | SSOT per group | SSOT per category | Ad-hoc | ⚠️ Mixed |

### 2.5 Centrality of Taxonomy

**Finding:** Taxonomy is **distributed across 8+ files**, not centralized

**Files Defining Categories:**
1. `weapon-suggestions.js` - Defines peer groups inline
2. `armor-suggestions.js` - Defines armor categories inline
3. `shared-suggestion-utilities.js` - CLASS_SYNERGY_DATA (class → abilities/skills)
4. `weight-config.js` - Weight constants (not categories)
5. Armor JSON files - Actual armor metadata
6. Weapon/gear item definitions - Metadata fields

**Issue:** No single "category registry" exists. Logic scattered across suggestion engines.

---

## PHASE 3 — Identity Integration Risk Assessment

### 3.1 Circular Dependency Risk

**Question:** Would importing weapon suggestion scoring create circular loops?

**Analysis:**
```
Current Dependency Graph:
weapon-suggestions.js
├── weapon-scoring-engine.js
│   ├── axis-a-engine (damage)
│   ├── axis-b-engine (hit-likelihood)
│   │   └── Requires: character attributes, proficiencies
│   └── tradeoff-resolver
│       └── Requires: character playstyle (inferred from armor + abilities)
├── shared-suggestion-utilities.js
│   └── CLASS_SYNERGY_DATA (hard-coded class → role mapping)
└── armor-suggestions.js (for checking current armor)

If IdentityEngine is introduced:
IdentityEngine
├── Computes: totalBias (aggregates archetype, primitives, skills, etc.)
├── Consumed by: SuggestionScorer (for tag projection)
└── Called from: BuildIntent.analyze()

Proposed Cycle:
weapon-suggestions → needs IdentityEngine.totalBias → IdentityEngine.computeTotalBias
  → reads actor.system.archetype, class, prestige, primitives, skills
  → could call back into weapon-suggestions for primitive extraction?
```

**Risk Assessment:** ⚠️ **MEDIUM - Circular dependency possible if not careful**

**Specific Risks:**
1. If weapon suggestion reads IdentityEngine output AND IdentityEngine reads weapon suggestions → CYCLE
2. If weapon suggestion uses primitive mappings already used by IdentityEngine → DUPLICATE
3. If weapon scoring logic is replicated in IdentityEngine → DRIFT

**Mitigation:** Keep weapon suggestion **stateless and upstream**. Do not feed identity back into suggestion.

### 3.2 Identity Abstraction Bypass Risk

**Question:** Would using weapon tags directly bypass identity abstraction?

**Analysis:**
Current weapon scoring uses **tags for explanation only**, not scoring weights. Tags are:
- Generated from item metadata
- Used for readability in explanations
- NOT used for damage/accuracy scoring

**If identity layer is introduced:**
- Tags could become "identity signals" (high-damage weapons → striker lean)
- This would **bypass the bias aggregation model**
- Creates alternative signal path to identity

**Risk Assessment:** 🔴 **HIGH - Tag inflation risk**

**Specific Risks:**
1. Weapons with "Damage" tag → inferred as striker → inflates striker bias
2. Light armor with "Mobile" tag → inferred as skirmisher → circular reasoning
3. Gear with "Medical" tag → inferred as support → without actual medical primitives

### 3.3 Hard-Coded Role Weights

**Question:** Are there hard-coded role weights inside weapon suggestion?

**Finding:** YES - extensively

**Examples:**
```javascript
// From armor-role-alignment-engine.js
const roleAlignmentScores = {
  'defender': { 'heavy': 25, 'medium': 15, 'light': 0 },
  'tank': { 'heavy': 25, 'medium': 10, 'light': -5 },
  'striker': { 'heavy': -10, 'medium': 5, 'light': 15 },
  'mobile': { 'heavy': -10, 'medium': 0, 'light': 25 }
};

// From tradeoff-resolver.js (hard-coded playstyle weights)
if (playstyle.includes('mobile')) weight_axis_b *= 1.2;
if (playstyle.includes('stationary')) weight_axis_a *= 1.2;
```

**Risk Assessment:** 🔴 **HIGH - Inference contamination**

**Issues:**
1. Hard-coded playstyle → weights assumes identity
2. If IdentityEngine computes different playstyle → suggestions now inconsistent
3. Two different systems inferring same thing creates drift

### 3.4 Weapon Suggestion Statefulness

**Question:** Is weapon suggestion stateful or stateless?

**Finding:** **STATELESS and pure**
- No actor state mutation
- No session state
- Pure function: `suggestWeapons(actor) → Suggestion[]`
- No caching of suggestions

**Risk Assessment:** ✅ **LOW - Good isolation**

### 3.5 Does Weapon Suggestion Read Actor Identity?

**Question:** Does weapon suggestion currently read identity fields?

**Finding:** **PARTIALLY - reads archetype but not as "identity"**

```javascript
// weapon-suggestions.js line 143
const buildContext = {
  archetype: actor.system?.archetype,
  class: actor.system?.classes,
  abilities: extractAbilityScores(actor),
  // Does NOT read:
  // - totalBias
  // - identity.mechanicalBias
  // - identity.roleBias
  // - constructed/prestige fields
};
```

**What it DOES read:**
- Class name (for role inference)
- Ability scores (for attribute matching)
- Proficiencies (for penalty calculation)
- Current armor (for playstyle hints)
- Equipment group (hardcoded metadata)

**What it does NOT read:**
- Archetype metadata (only ID)
- Prestige amplifiers
- Specialist choices
- Skill selections
- Primitive effects
- Behavior bias

**Risk Assessment:** ✅ **LOW - No identity coupling yet**

But if identity inference adds new fields, weapon suggestion will be BLIND to them unless updated.

---

## PHASE 4 — Decoupled Integration Proposal

### 4.1 Safe Reusable Data Inventory

**What CAN be safely exported without architectural contamination:**

| Data | From | Reusable As | Risk | Notes |
|------|------|-------------|------|-------|
| **Weapon groups** (simple, advanced, exotic) | weapon metadata | Equipment proficiency bias | ✅ Low | Structural only |
| **Armor categories** (light, medium, heavy) | armor.category | Movement/agility identity signal | ⚠️ Med | Needs normalization |
| **Attribute mappings** (STR→melee, DEX→ranged) | Axis B logic | Ability-to-role mapping | ✅ Low | Already canonical |
| **Damage tier bands** (low/med/high) | Axis A engine | Equipment affinity bands | ⚠️ Med | Context-dependent |
| **Character context extraction** | shared-utilities | Identity actor-state building | ✅ Low | Pure utility |
| **Playstyle inference** (mobile/stationary) | Tradeoff resolver | Build pattern detection | ⚠️ Med | Overlaps with pattern detection |
| **Role inferences** (class → role) | Suggestion engines | Base role classification | 🔴 High | Hard-coded, fragile |

### 4.2 What MUST NOT Be Exported

| Data | Reason | Risk |
|------|--------|------|
| **Role alignment weights** (e.g., defender: heavy=+25) | Domain-specific to equipment | Would create circular role inference |
| **Tradeoff adjustment logic** | Creates pathway to bypass bias model | Could duplicate identity computation |
| **Score weighting formulas** | Suggests how to weight identity signals | Couples identity to equipment scoring |
| **Explanation templates** | Domain-specific to equipment context | No translation to identity layer |
| **Hard-coded class → role mappings** | Extremely fragile to new classes | Should be in identity layer, not equipment |

### 4.3 Proposed Integration Boundary: "Equipment Affinity Mapping"

**NEW Registry File:** `/data/equipment-affinity-mapping.json`

**Purpose:** Decoupled interpretation layer between weapon suggestions and identity

**What it contains:**
```json
{
  "metadata": {
    "version": "1.0",
    "purpose": "Map equipment categories to structural identity signals (NOT scoring weights)",
    "note": "Interpretation layer only. Scores remain in weapon suggestion system."
  },

  "weapon_group_affinity": {
    "simple_melee": {
      "implies_strength_focus": 0.2,
      "implies_close_combat": 0.3,
      "no_tech_reliance": true
    },
    "advanced_melee": {
      "implies_strength_focus": 0.25,
      "implies_close_combat": 0.4,
      "implies_technique": 0.3
    },
    "simple_ranged": {
      "implies_dexterity_focus": 0.2,
      "implies_distance_combat": 0.3,
      "low_accuracy_tech": true
    },
    "advanced_ranged": {
      "implies_dexterity_focus": 0.25,
      "implies_distance_combat": 0.4,
      "implies_accuracy": 0.3
    },
    "lightsaber": {
      "implies_force_connection": 0.4,
      "implies_technique": 0.4,
      "implies_close_combat": 0.5
    },
    "exotic": {
      "implies_specialization": 0.3,
      "implies_non_standard": 0.2
    }
  },

  "armor_category_affinity": {
    "light": {
      "implies_mobility": 0.3,
      "implies_agility_focus": 0.2,
      "no_heavy_encumbrance": true
    },
    "medium": {
      "implies_balance": 0.2,
      "implies_versatility": 0.2
    },
    "heavy": {
      "implies_defense_focus": 0.3,
      "implies_durability": 0.3,
      "implies_stationary_tactics": 0.2,
      "no_high_dexterity": true
    }
  },

  "integration_rules": {
    "rule_1": "Affinity signals are suggestions only, not overrides",
    "rule_2": "Weights are 0.2–0.4 range (small contribution)",
    "rule_3": "Multiple equipment selections accumulate affinity",
    "rule_4": "Affinity is conditional on active equipment (actual selection, not just access)",
    "rule_5": "Never read from weapon suggestion scoring; only metadata",
    "rule_6": "Equipment affinity is an optional refinement layer, not required"
  }
}
```

### 4.4 Integration Points (Proposal)

**Where equipment affinity can be safely consumed:**

1. **ObservedBehaviorBias layer** (after primitives, attributes, skills)
   - Low impact (small weights 0.2-0.4)
   - Additive only
   - Transient (not persisted)

2. **BuildIntent equipment context detection**
   - Does NOT influence prestige inference
   - Does NOT override archetype
   - Informational only

3. **Future: SuggestionScorer prestige refinement**
   - Could nudge prestige affinity scores
   - Only if confidence > threshold (e.g., +25 prestige affinity if 3+ matching equipment pieces)

### 4.5 What NOT to Do (Red Lines)

🔴 **DO NOT:**
1. Read weapon suggestion scores into identity
2. Replicate weapon scoring logic into identity computation
3. Hard-code weapon group weights into identity
4. Infer role from equipped weapons (circular)
5. Use equipment affinity to bypass prestige inference
6. Create equipment → prestige suggestion feedback loop

---

## PHASE 5 — Structural Verdict

### Question 1: Can the current weapon system safely inform identity?

**Answer:** **CONDITIONAL YES**

**With these conditions:**
- ✅ Equipment affinity is an **optional, additive layer** (not required)
- ✅ Affinity signals are **structural only** (not scoring weights)
- ✅ Integration is **downstream** (identity computed first, affinity applied after)
- ✅ Weights are **small** (0.2-0.4 range, cannot dominate)
- ✅ **No feedback loop** (weapon suggestion doesn't read identity)

**Without these conditions, UNSAFE:**
- ❌ If replicating role weights
- ❌ If creating circular scoring dependency
- ❌ If using tags as identity signals
- ❌ If hard-coding playstyle assumptions

### Question 2: What must be refactored before integration?

**Required Refactors:** **NONE (can integrate as-is)**

**Recommended Improvements (not blocking):**

| Improvement | Scope | Priority | Rationale |
|-------------|-------|----------|-----------|
| Centralize category taxonomy | Create `/data/equipment-categories.json` | Medium | Reduce scattered definitions |
| Externalize role inference | Extract CLASS_SYNERGY_DATA to registry | High | Enable new classes without code changes |
| Normalize gear tags | Define canonical tag set | Medium | Prevent tag inflation |
| Add structure to gear categories | Formalize gear classification | Low | Consistency with weapons/armor |
| Isolate hard-coded weights | Create weight registry (already exists) | High | Allow tuning without code changes |

### Question 3: Is the current taxonomy sufficient?

**Answer:** **YES, for initial integration**

**Current Coverage:**
- ✅ Weapons: 8 groups, well-structured peer groups
- ✅ Armor: 3 categories, mechanically clear
- ⚠️ Gear: Tag-based, adequate but informal

**For identity purposes:**
- ✅ Enough structure to extract meaningful affinity signals
- ✅ Peer grouping sufficient for normalization
- ⚠️ Could be enriched with sub-categorization (blasters vs. vibroblades)

### Question 4: Is it overcomplicated?

**Answer:** **NO, complexity is justified**

**Why the dual-axis model exists:**
- Damage alone doesn't determine fit (weak STR can't use heavy weapons)
- Hit-likelihood alone doesn't determine fit (low-damage accurate weapons are traps)
- Tradeoff adjustment prevents pathological cases (light weapon + mobile character isn't always best)

**Verdict:** Architecture is appropriately complex for the problem space.

### Question 5: Does it require normalization?

**Answer:** **ALREADY NORMALIZED**

**How:**
- Peer-group normalization prevents outliers
- Weight capping prevents single component dominance
- Clamp functions bound scores to 0-100
- Tradeoff adjustments catch edge cases

**For identity integration:**
- No additional normalization required
- Small affinity weights (0.2-0.4) self-bound
- Additive model keeps them secondary

---

## Integration Strategy Summary

### Recommended Approach: "Equipment Affinity as Optional Enhancement"

**Step 1: Create equipment-affinity-mapping.json** (Registry interpretation layer)
- Decoupled from weapon suggestion system
- Purely structural signals, no weights
- Conditional on actual equipment (not access)

**Step 2: Integrate into IdentityEngine.computeObservedBehaviorBias()**
- After primitives, attributes, skills
- Small weights (0.2-0.4)
- Fully additive

**Step 3: Prevent Circular Dependencies**
- Weapon suggestion does NOT read totalBias
- Identity does NOT read weapon scores
- One-way flow: Equipment → Affinity → Identity (never back)

**Step 4: Add Guard Rails**
- Affinity weight cap: 0.5 total (across all equipment)
- Require threshold: 2+ matching pieces for signal (not just one item)
- Document: Equipment affinity is refinement, not foundation

### Risk Level: **LOW** (if following proposal)

**Rationale:**
- ✅ No circular dependencies (one-way flow)
- ✅ No score duplication (different systems)
- ✅ No metadata duplication (interpretation layer only)
- ✅ Bounded weights (0.2-0.4, capped at 0.5 total)
- ✅ Stateless integration (no actor mutation)

---

## Hard Boundaries to Maintain

🔒 **DO NOT CROSS THESE LINES:**

1. **Weapon suggestion scoring logic must stay in suggestion engine**
   - Do not replicate role alignment weights
   - Do not copy tradeoff formulas
   - Do not export Axis B weighting

2. **Equipment affinity must not feedback into weapon suggestion**
   - No circular reading of identity
   - Weapon scoring remains independent
   - Suggestions ranked same way for all players

3. **Role inference must not be duplicated**
   - Current system: hard-coded class → role
   - Identity system: should derive from primitives + archetype + behavior
   - Equipment should NOT vote on role

4. **Weights must remain small and segregated**
   - Equipment affinity: 0.2-0.4 per item type
   - Total affinity contribution: capped at 0.5
   - Never dominant compared to primitives/archetype

5. **No tags-based identity inference**
   - Do NOT infer identity from equipment tags
   - Only structural signals (weapon group type, armor category)
   - No "medical gear → support" inference

---

## Final Recommendation

### ✅ **SAFE TO INTEGRATE** (with conditions)

**Status:** The weapon/gear suggestion system contains **reusable structural data** that can safely inform identity without architectural contamination.

**Integration Path:**
1. Create `equipment-affinity-mapping.json` (interpretation layer)
2. Load in IdentityEngine at system init
3. Apply in `computeObservedBehaviorBias()` with 0.2-0.4 weights
4. Document one-way flow (equipment → affinity → identity, never back)
5. Add weight caps and threshold guards

**Risk Mitigation:**
- ✅ Decoupled via interpretation layer (not direct reference)
- ✅ One-way data flow (no feedback loops)
- ✅ Bounded contributions (0.2-0.4 weights, 0.5 total cap)
- ✅ Optional enhancement (works without it)
- ✅ No duplication (reads metadata only, not scores)

**Next Steps:**
1. Create equipment-affinity-mapping.json
2. Integrate into IdentityEngine
3. Test with hypothetical builds
4. Monitor for drift or circular dependencies

---

## Appendix: Files to Monitor for Future Changes

If weapon suggestion system evolves, watch these files for breaking changes:

- ❗ `shared-suggestion-utilities.js` - CLASS_SYNERGY_DATA (role mappings)
- ❗ `weight-config.js` - WEIGHT_CAPS definitions
- ⚠️ `armor-role-alignment-engine.js` - Role-to-armor-category weights
- ⚠️ `category-normalization-engine.js` - Peer group definitions
- ⚠️ Armor/weapon JSON files - New categories added

**Action:** When these files change, review for:
1. New hard-coded weights
2. New role definitions
3. New category hierarchies
4. Changes to role inference logic

If changes found, may need to update `equipment-affinity-mapping.json`.

---

**Audit Complete**
**Classification: SAFE TO INTEGRATE**
**Recommended Action: Proceed with Equipment Affinity Layer**
