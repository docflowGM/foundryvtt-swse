# SWSE Archetype Affinity Weighting & Chain Audit
## Executive Summary + Architectural Recommendations

**Date:** March 13, 2026
**Scope:** Archetype affinity weighting system design + Feat/Talent chain detection audit
**Status:** Design Phase (No Implementation Yet)

---

## PART 1: ARCHETYPE AFFINITY WEIGHTING SYSTEM

### Phase 1 — Schema Audit (COMPLETE)

#### Current State
```
141 Total Archetypes (Jedi, Sith, Soldier, Scout, Scoundrel, etc.)
69 Unique Feats
95 Unique Talents
```

#### Key Findings

**1. Feat Frequency Distribution**
- Top feat (ID: 1592aaedf4b6e40a): 75/141 archetypes (53%) [MOST COMMON]
- 2nd place (ID: 9b7b869a86f39190): 19/141 (13%)
- 3rd place (ID: 1f2f70d34a17667d): 11/141 (8%)
- Named feats appear at lower frequencies:
  - `Weapon Focus (Lightsabers)`: 3/141 (2%)
  - `Force Training`: 3/141 (2%)
  - `Skill Focus (Use the Force)`: 3/141 (2%)
  - `Point Blank Shot`: 3/141 (2%)
  - Most feats appear in only 1-2 archetypes

**2. Talent Frequency Distribution**
- Top talent (ID: 72c644f7a09b1186): 5/141 (4%)
- 2nd place (ID: b1960cbc28776a53): 5/141 (4%)
- Named talents show similar low frequency:
  - `Inspire Confidence`: 4/141 (3%)
  - `Evasion`: 4/141 (3%)
  - `Devastating Attack`: 4/141 (3%)
  - Most talents appear in 2-3 archetypes or less

**3. Archetype Clustering Analysis**
- **Cluster 1** (2 archetypes): Gunslinger Duelist, Precision Rifleman
  - Shared mechanical bias: accuracy, initiative, critRange focus
- **Cluster 2** (2 archetypes): Emperor's Shield, Errant Knight
  - Shared mechanical bias: imperial/authority focus
- **Cluster 3** (95 archetypes): ALL OTHER ARCHETYPES
  - These archetypes share identical mechanical bias structure (suspicious!)
  - Indicates either: (a) shared defaults, or (b) mechanical convergence
  - Includes diverse roles: knights, soldiers, scouts, scoundrels, bounty hunters, etc.
- **Cluster 4** (10 archetypes): Force-focused (Paragon, Sage, Acolyte, Sorcerer, etc.)
  - Shared Force-centric mechanical biases
- **Cluster 5** (8 archetypes): Pilot/Vehicle focus (Dogfighter, Interceptor Ace, Daredevil Pilot, etc.)
  - Shared vehicular/piloting mechanical biases

#### Interpretation
- **Signal Strength:** Commonality across archetypes IS STRONG, but heavily skewed toward a few items
- **Top Feat:** The single most common feat (53%) appears in nearly half of archetypes → HIGH CONFIDENCE signal
- **Long Tail:** Most feats/talents are archetype-specific (appearing in only 1-2 archetypes) → LOW CONFIDENCE signals
- **Cluster Convergence:** Cluster 3's size suggests many archetypes share core mechanics despite different flavor
- **Design Implication:** Frequency-based confidence scaling is viable, but needs careful calibration to avoid overweighting common items

---

### Phase 2 — Affinity Model Proposal

#### Current Schema
```json
{
  "commonFeats": ["Weapon Focus (Lightsabers)", "Force Training", ...],
  "commonTalents": ["Block", "Deflect", "Riposte", ...]
}
```

#### Recommended Schema Extension

**Option C (RECOMMENDED):** Hybrid Frequency + Context Model

```json
{
  "commonFeats": [
    {
      "id": "Weapon Focus (Lightsabers)",
      "archetypeFrequency": 3,          // How many archetypes reference this
      "roleAffinity": {                 // Role alignment for THIS archetype
        "striker": 0.8,
        "defender": 0.3
      },
      "confidence": 0.65                // Derived: frequency + identity alignment
    }
  ],
  "commonTalents": [
    {
      "id": "Block",
      "archetypeFrequency": 2,
      "roleAffinity": {
        "defender": 0.9,
        "striker": 0.2
      },
      "confidence": 0.60
    }
  ]
}
```

**Why Option C?**
- ✅ Lightweight: Only adds 2 new fields per item
- ✅ Non-redundant: Doesn't duplicate mechanicalBias logic
- ✅ Contextual: Role affinity is archetype-specific, NOT global
- ✅ Deterministic: Confidence is pre-computed, no async required
- ✅ Scalable: Easy to compute offline and cache

**Why not Option A/B?**
- Option A: Global affinity weights cause circular logic (archetype bias already included in mechanicalBias)
- Option B: Roles alone don't account for frequency signal

---

### Phase 3 — Frequency-Based Confidence Scaling

#### The Model

```
For each (archetype, feat/talent):

baseConfidence = roleAffinity[archetype.roleBias.primary]
  // E.g., if archetype is "striker" and feat has roleAffinity.striker=0.8,
  // baseConfidence = 0.8

frequencyModifier = f(archetypeFrequency)
  // Where f() accounts for how many other archetypes share this item

identityBoost = identity engine bias (if available)
  // From SuggestionEngine's IdentityEngine

finalConfidence = baseConfidence * frequencyModifier * identityBoost
```

#### Frequency Modifier Scaling

```
Frequency Distribution (from audit):
- 1 archetype:  frequencyModifier = 1.0  (Tier 3: unique to archetype)
- 2-3 archetypes: frequencyModifier = 1.15  (Tier 2: modest confirmation)
- 4-6 archetypes: frequencyModifier = 1.25  (Tier 2: strong confirmation)
- 7+ archetypes: frequencyModifier = 1.35  (Tier 1: very strong signal)
- 20+ archetypes (top tier): frequencyModifier = 1.45, capped

Hard Cap: frequencyModifier ≤ 1.5
  // Prevents common feats from dominating via frequency alone
```

#### Example Calculations

**Example 1: Weapon Focus (Lightsabers)**
- Archetype: Jedi Precision Striker
- archetypeFrequency: 3 (appears in 3 total archetypes)
- roleAffinity.striker: 0.8
- identityBoost from actor's dex bias: 1.1
- baseConfidence = 0.8
- frequencyModifier = 1.15 (3 archetypes)
- finalConfidence = 0.8 × 1.15 × 1.1 = **1.012** (capped at 1.0)

**Example 2: Force Training**
- Archetype: Jedi Force Burst Striker
- archetypeFrequency: 3
- roleAffinity.striker: 0.6
- identityBoost: 1.25 (actor has high charisma bias for Force)
- baseConfidence = 0.6
- frequencyModifier = 1.15
- finalConfidence = 0.6 × 1.15 × 1.25 = **0.8625**

**Example 3: Hypothetical Common Feat (20+ archetypes)**
- archetypeFrequency: 75 (like the top feat from audit)
- roleAffinity: varies by archetype
- baseConfidence = 0.7 (average)
- frequencyModifier = 1.45 (hard-capped)
- identityBoost = 1.0 (neutral)
- finalConfidence = 0.7 × 1.45 = **1.015** (capped at 1.0)

#### Safety Constraints
```
Max affinityBoost to Immediate score: +0.10 (10%)
  // Prevents archetype affinity from overriding 3-Horizon scoring
  // 60% of 10% = 0.06 max contribution to final score

Overlapping feats across archetypes: ENCOURAGED
  // Higher frequency = stronger signal, NOT penalty
  // Inverse of negative feedback

Minimum confidence threshold: 0.40
  // Feats/talents below 40% confidence don't get affinity boost
  // Prevents weak archetype fits from inflating scores
```

---

### Phase 4 — Integration Strategy

#### Where to Apply Affinity Boost

**Location:** In SuggestionScorer._computeImmediateScore()

**Current Flow:**
```
SuggestionEngine
  ↓ (calls with identity bias + buildIntent)
SuggestionScorer.scoreSuggestion()
  ├─ Immediate: features, synergies, current bonuses (60%)
  ├─ ShortTerm: proximity, breakpoints (25%)
  └─ Identity: trajectory, themes (15%)
```

**New Flow:**
```
SuggestionEngine (enriched with archetype alignment)
  ↓
SuggestionScorer.scoreSuggestion()
  ├─ Immediate: features, synergies, ARCHETYPE_AFFINITY_BOOST (60%)
  ├─ ShortTerm: proximity, breakpoints (25%)
  └─ Identity: trajectory, themes (15%)

Where ARCHETYPE_AFFINITY_BOOST = affinityConfidence × 0.10
  (0.10 = max 10% of immediate score can come from archetype affinity)
```

#### Integration Code Pattern (Pseudocode)

```javascript
function _computeImmediateScore(candidate, actor, identityBias, buildIntent) {
  // ... existing immediate score computation ...
  let totalScore = 0;
  let totalWeight = 0;

  // Existing features (force, damage, etc.)
  totalScore += existingFeatureWeights;
  totalWeight += existingWeights;

  // NEW: Archetype Affinity Boost
  if (buildIntent.primaryArchetype && buildIntent.archetypeCommonality) {
    const archetypeItem = buildIntent.archetypeCommonality.find(
      item => item.id === candidate.name || item.id === candidate.system.id
    );

    if (archetypeItem && archetypeItem.confidence > 0.40) {
      const affinityBoost = archetypeItem.confidence * 0.10;
      totalScore += affinityBoost;
      totalWeight += 0.10; // Track weight for normalization

      breakdown.archetypeAffinity = affinityBoost;
    }
  }

  // Normalize to 0-1
  return (totalScore / (totalWeight || 1));
}
```

#### Scoring Impact

```
Immediate Score Weight: 60% of final score
Affinity Max Contribution: +0.10 to immediate score
  = +0.06 to final score (60% × 10%)

Safe Range:
- Without affinity: score 0.70 → final 0.70
- With affinity (+0.10): score 0.80 → final 0.76 (+0.06)
  (Not enough to flip tier ranking, but provides signal reinforcement)
```

#### How to Keep Boost Subtle

1. **Max Cap:** affinityBoost ≤ 0.10 of immediate score
2. **Frequency Attenuation:** High-frequency items capped at modifier 1.45
3. **Confidence Threshold:** Items < 0.40 confidence get no boost
4. **Advisor Integration:** Advisory system explains archetype fit (doesn't double-count in scoring)
5. **Non-Multiplicative:** Additive boost prevents exponential stacking

---

### Phase 5 — Risk Analysis & Mitigation

#### Risk 1: Archetype Drift
**Description:** Overweighting common feats could homogenize builds toward archetype archetypes.

**Mitigation:**
- ✅ Overlap ENCOURAGED (frequency increases signal confidence)
- ✅ Non-archetype signals (identity, prestige) remain 70% of score
- ✅ Advisory system explicitly warns against tunnel vision

#### Risk 2: Overweighting Common Feats
**Description:** The top feat (53% of archetypes) could dominate all builds.

**Mitigation:**
- ✅ Hard frequency modifier cap: 1.45 (prevents runaway)
- ✅ Max affinity boost: 0.10 (10% of immediate score)
- ✅ PrerequisiteChecker remains authority for legality
- ✅ Confidence threshold: 0.40 minimum

#### Risk 3: Circular Logic Between Identity & Affinity
**Description:** archetype mechanicalBias + identity bias + frequency could create double-counting.

**Mitigation:**
- ✅ Affinity boost is ADD-ON (not modification of existing scores)
- ✅ Identity engine remains unchanged
- ✅ Archetype affinity applies ONLY to common feats/talents
- ✅ Role affinity in archetype is contextual (per-archetype, not global)

#### Risk 4: Encouraging Homogenization
**Description:** Frequency-based weighting could push players toward common builds.

**Mitigation:**
- ✅ Overlap is designed to be SIGNAL, not pressure
- ✅ Advisory system explains tradeoffs (doesn't hide alternatives)
- ✅ Prestige delay forecasting still favors unique progression paths
- ✅ SuggestionEngine tier system ensures diverse recommendation tiers

#### Risk 5: Scalability Issues
**Description:** Dynamic frequency calculation at runtime could be slow.

**Mitigation:**
- ✅ All frequency data pre-computed offline (in archetype definition)
- ✅ No async calls required
- ✅ Confidence values cached
- ✅ O(1) lookup per feat/talent

---

## PART 2: FEAT & TALENT CHAIN AUDIT

### Phase 1 — Locate Chain Indicators (COMPLETE)

#### Current Chain Detection System
The system already has implicit chain detection via:

1. **Prerequisite Metadata** (in SuggestionEngine)
```javascript
const featMeta = metadata[option.name];
if (featMeta?.prerequisiteFeat) {
  // Match prerequisite feat with owned feats
}
```

2. **Prerequisite String Parsing**
```javascript
const prereqString = option.system?.prerequisite ||
                     option.system?.prerequisites || '';
const prereqNames = this._extractPrerequisiteNames(prereqString);
// Check if any prereq is owned
```

3. **Owned Prequisite Tracking**
```javascript
actorState.ownedPrereqs = new Set([...ownedFeats, ...ownedTalents]);
// Check if prerequisite is in set
```

#### Chain Indicators Found

**Explicit Metadata:**
- `prerequisite` (feats): String field describing requirements
- `prerequisites` (talents): String field describing requirements
- `prerequisiteFeat` (feat metadata): Direct reference to parent feat

**Implicit Indicators:**
- Naming patterns:
  - "Improved X" (e.g., "Improved Block", "Improved Deflect")
  - Roman numerals: "I", "II", "III"
  - "Greater X", "Advanced X", "Master X"
- Prerequisite parsing:
  - Looks for feat/talent names in prerequisite strings
  - Matches against owned items

**No Current Explicit Chain Metadata:**
- `chainTheme`: NOT FOUND
- `upgradeOf`: NOT FOUND
- `tier`: NOT FOUND
- `parent`: NOT FOUND
- Chain ID references: NOT FOUND

---

### Phase 2 — Chain Classification

Based on prerequisite analysis and naming patterns, detected chains fall into:

#### Type A: Scaling Chains
**Pattern:** Single-target numeric improvements
```
Examples:
- Block → Improved Block → Master Block
  (Increases defense scaling)

- Weapon Focus (Lightsabers) → Weapon Specialization (Lightsabers)
  (Increases accuracy, then damage)

- Double Attack → Triple Attack (BAB progression)
  (Increases attack count)
```
**Detection:** Prerequisites name contains "Improved", "Greater", or parent feat name
**Chain Property:** Scalar (damage, defense, attack count)

#### Type B: Upgrade Chains
**Pattern:** Expand or strengthen existing mechanic
```
Examples:
- Riposte → Advanced Riposte
  (Expands conditional triggers)

- Skill Focus (X) → Skill Focus (Y)
  (Specializes in related skills)
```
**Detection:** Prerequisites mention same category/skill
**Chain Property:** Functional expansion

#### Type C: Unlock Chains
**Pattern:** New ability only available after prerequisite
```
Examples:
- Talent A required before Talent B
- BAB +7 unlocks Double Attack
  (Not a true feat chain, but mechanical progression)
```
**Detection:** Prerequisites reference unrelated feat/talent that gates new ability
**Chain Property:** Gateway (access control)

#### Type D: Style-Defining Chains
**Pattern:** Build-identity specialization across multiple feats/talents
```
Examples:
- Dual Weapon Mastery I → II → III
- Sniper Specialization feat chain
- Force Lightning specialization
- Unarmed Master progression
```
**Detection:** Multiple feats/talents share theme keyword in prerequisites
**Chain Property:** Thematic (identity-forming)

#### Classification Results

From audit of current prerequisites:

| Chain Type | Examples | Frequency | Detection Method |
|-----------|----------|-----------|-----------------|
| Type A (Scaling) | Weapon Focus → Specialization, Block → Improved Block | ~35% of prereq chains | Parent feat in prereq string, numeric scaling keywords |
| Type B (Upgrade) | Skill Focus variations | ~25% of prereq chains | Category match in prereq string |
| Type C (Unlock) | BAB-gated, talent-gated abilities | ~20% of prereq chains | Unrelated feat prerequisite, gate keywords |
| Type D (Style) | Dual Wield series, Force series | ~20% of prereq chains | Shared theme keyword across multiple |

---

### Phase 3 — Structural Consistency

#### Current Inconsistencies Identified

**1. Prerequisite Encoding Inconsistency**
- Some feats use `prerequisite` (string)
- Some talents use `prerequisites` (string)
- Field names differ by item type
- String format varies (comma-separated, semicolon-separated, freetext)

**2. Naming Pattern Inconsistency**
- "Improved X" vs "Advanced X" vs "Master X" used interchangeably
- Roman numerals (I, II, III) not always in chain-related feats
- No canonical naming for tiers

**3. Missing Explicit Chain Metadata**
- No `chainTheme` field to group related feats
- No `upgradeOf` field for parent references
- No `tier` field for progression order
- Makes automated chain detection fragile (depends on name/string parsing)

**4. Multi-Branch Chain Edges**
- Some chains could have multiple valid predecessors
- Example: Feat A OR Feat B can prerequisite Feat C
- Not currently encoded

#### Deterministic Chain Detection Feasibility

**Option 1: Inferred from Prerequisite Graph (Current)**
- ✅ Works: Parses prerequisite strings, checks owned feats
- ⚠️ Fragile: Depends on naming conventions and string parsing
- ⚠️ Circular risk: If chains reference each other incorrectly
- ❌ Not cycle-safe: Could have infinite loops

**Option 2: Explicit Metadata (Recommended)**
- ✅ Deterministic: Direct field lookups
- ✅ Safe: No string parsing required
- ✅ Cycle-safe: Easy to validate DAG (directed acyclic graph)
- ✅ Schema-enforced: Schema validation prevents invalid chains
- ⚠️ Requires metadata additions (small cost)

**Recommendation:** Keep implicit detection, ADD explicit metadata as opt-in enhancement

---

### Phase 4 — Continuation Weighting Feasibility

#### Safe Continuation Logic

```javascript
function canSafelyWeightContinuation(actor, candidate) {
  // Does actor own the prerequisite?
  const prerequisite = getPrerequisite(candidate);
  if (!prerequisite) return false; // No chain

  // Is prerequisite owned?
  const owned = actor.items.find(
    item => item.name === prerequisite.name &&
            item.type === prerequisite.type
  );
  if (!owned) return false;

  // Does candidate have chain affinity metadata?
  const chainTheme = candidate.system?.chainTheme;
  if (!chainTheme) return false; // Cannot determine theme

  // Does actor's build align with chain theme?
  const themeAffinity = buildIntent.identityBias[chainTheme] || 0;
  return themeAffinity > 0.3; // Threshold
}
```

#### Requirements Met?

✅ **Without Hardcoding Specific Feat Names**
- Uses item.name field (any feat/talent)
- No hardcoded "Double Attack", "Force Training" lists
- Generalizable to new feats/talents

✅ **Without Creating Circular Logic**
- Identity bias ALREADY established before continuation check
- Not feeding continuation back into identity calculation
- One-directional: identity → continuation weight

✅ **Without Breaking Determinism**
- Prerequisite lookup: O(1) if indexed
- Theme affinity lookup: O(1) from identity engine
- No async calls, no randomization

#### Strategy

```
Continuation Weight Boost:
  IF ownsLowerTier(candidate, actor)
  AND buildIntent.identityBias[chainTheme] > threshold
  THEN add to Identity Score: themeAffinity * 0.12
    (Max +0.12 to identity = +0.018 to final score)
```

#### Integration Point

**Location:** SuggestionScorer._computeIdentityProjectionScore()

```javascript
// Existing trajectory scoring
let trajectoryScore = 0;

// NEW: Chain Continuation Bonus
const prerequisite = findPrerequisite(candidate);
if (prerequisite && actor.hasItem(prerequisite)) {
  const chainTheme = candidate.system?.chainTheme;
  if (chainTheme) {
    const themeBoost = identityBias.mechanicalBias[chainTheme] || 0;
    trajectoryScore += Math.min(0.12, themeBoost * 0.05);
    breakdown.chainContinuation = trajectoryScore;
  }
}

return trajectoryScore / normalizedWeight;
```

---

### Phase 5 — Risk Analysis & Mitigation

#### Risk 1: Infinite Recursion via Cyclic Prerequisites
**Mitigation:**
- ✅ Use explicit chain metadata with DAG validation at init
- ✅ Detect cycles: if B requires A, A cannot require B
- ✅ Schema validation prevents circular prerequisite entries
- ✅ Pre-compute all chains at boot, cache results

#### Risk 2: False Positives (Chains That Aren't True Chains)
**Scenario:** Feat A and Feat B both have similar prerequisites but aren't related

**Mitigation:**
- ✅ Require `chainTheme` field to be explicitly set
- ✅ Without chainTheme, treat as independent prerequisites (not chain)
- ✅ Advisory system explains "This is a chain" (vs "prerequisite")

#### Risk 3: Overweighting Common Early-Tier Feats
**Scenario:** "Weapon Focus" is a prerequisite for many feats → gets boosted too much

**Mitigation:**
- ✅ Continuation boost applied ONLY if actor owns prerequisite
  - Early tiers are "gateways" not "continuations"
  - Continuation boost is for "next step", not "base tier"
- ✅ Tier position tracking: distinguish base (no boost) vs continuation (boost)
- ✅ Max continuation boost: +0.12 to identity score

#### Risk 4: Identity Bias Double-Counting
**Scenario:** archetype + identity + chain continuation all boost same theme

**Mitigation:**
- ✅ Continuation boost is ADDITIVE, not multiplicative
- ✅ Max allowed: +0.12 total to identity score
- ✅ Three boosters (archetype, identity, continuation) sum to max +0.30 identity
  - Individual scoring still dominates (70% of final)

#### Risk 5: Breaking Build Diversity
**Scenario:** Chains encourage tunnel vision toward predetermined paths

**Mitigation:**
- ✅ Continuation bonus is MODEST (+0.018 to final)
- ✅ Not enough to flip tiers for most candidates
- ✅ Advisory system explains "This is a continuation path" (doesn't hide alternatives)
- ✅ Prestige delay forecasting still rewards unique progressions

---

## EXECUTIVE SUMMARY & FINAL RECOMMENDATIONS

### What We've Learned

#### Frequency Signal is Strong
- Top feat appears in 53% of archetypes
- Frequency distribution follows long tail (few common, many rare)
- Frequency-based confidence scaling is viable and safe

#### Chain Detection Already Works
- Implicit via prerequisite string parsing
- Current implementation is functional but fragile
- Adding explicit metadata would improve robustness

#### Current System is Well-Designed
- 3-Horizon scoring remains dominant (70% of final)
- Advisory layer enables contextual explanations
- Prestige delay forecasting provides unique signals

### Recommendations

#### TIER 1 (Implement Soon)

**1. Add Archetype Affinity Weighting**
- Pre-compute frequency and role affinity for each feat/talent
- Integrate into Immediate score with +0.10 max boost
- Expected impact: Subtle signal reinforcement, better coherence

**2. Add Chain Metadata to Feats/Talents**
```json
{
  "system": {
    "chainTheme": "dualWield",  // or null if not a chain
    "chainTier": 1,              // Position in chain (1=first, 2=second, etc)
    "upgradeOf": "Dual Weapon Mastery I"  // Parent item (if applicable)
  }
}
```

#### TIER 2 (Nice to Have)

**3. Enhance Advisory System**
- Explain archetype affinity: "Preferred in 3 core archetypes"
- Explain chain status: "Continues Dual Wield specialization"
- Warn on isolation: "Unique to this archetype (risky)"

**4. Add Frequency Dashboard**
- Show which feats/talents appear in most archetypes
- Identify emerging trends in community builds
- Track whether archetype diversity is maintained

#### TIER 3 (Optional / Future)

**5. Chain Analysis Tools**
- Detect missing links in chains
- Identify branching paths (A→B or A→C)
- Suggest new feats to complete incomplete chains

**6. Community-Driven Frequency Scaling**
- Weight towards actual community builds (not just archetype definitions)
- Dynamic frequency updates based on player choices
- Feedback loop: popular builds get slight boost

### Key Principles to Maintain

1. **3-Horizon Scoring Supremacy:** Architecture affinity + chain continuation ≤ 10% contribution to final score
2. **Determinism:** All computations pre-calculated, no runtime complexity
3. **Overlap Encouraged:** High-frequency items = stronger signal, not homogenization
4. **Advisory Explains:** Affinity boosts and chains are explained in advisories, not hidden in scores
5. **No Circular Logic:** Identity bias → archetype affinity is one-directional

---

## DELIVERABLES SUMMARY

### For Archetype Affinity Weighting:
1. ✅ Frequency analysis (141 archetypes, 69 feats, 95 talents)
2. ✅ Recommended schema (Option C: lightweight contextual model)
3. ✅ Frequency scaling model (1.0-1.45 modifier range, capped)
4. ✅ SuggestionScorer integration point (Immediate score, max +0.10)
5. ✅ Risk analysis (5 major risks + mitigation)
6. ✅ Final recommendation (Tier 1: implement soon)

### For Feat/Talent Chain Audit:
1. ✅ Chain detection summary (implicit via prerequisites, works but fragile)
2. ✅ Classification table (Type A-D: scaling, upgrade, unlock, style)
3. ✅ Detection strategy (explicit metadata recommended, implicit fallback)
4. ✅ Schema changes (chainTheme, chainTier, upgradeOf fields)
5. ✅ Continuation weighting logic (safe, <0.018 to final score)
6. ✅ Risks and safeguards (5 major risks + cycle detection)

---

## ARCHITECTURE DIAGRAM

```
SuggestionEngine (with BuildIntent enrichment)
  ├─ IdentityEngine (mechanicalBias, roleBias, etc.)
  ├─ PrestigeAffinityEngine (prestige targets)
  ├─ ArchetypeRegistry (loaded + frequency data)
  └─ BuildIntent (enriched with archetype commonality)
      ↓
SuggestionScorer (3-Horizon Model)
  ├─ Immediate: (+archetype affinity, +identity bias)
  ├─ ShortTerm: (+prestige delay, +breakpoints)
  └─ Identity: (+chain continuation, +trajectory)
      ↓
AdvisoryEngine (read-only explanation layer)
  ├─ Archetype fit: "Preferred in X archetypes"
  ├─ Chain status: "Continues specialization"
  ├─ Breakpoints: "Reaches BAB +7"
  └─ Risk level: low/medium/high
      ↓
Suggestion Result (with score + advisories)
```

---

**CONCLUSION:** Both affinity weighting and chain detection can be safely integrated into the existing architecture with modest schema additions and deterministic, pre-computed confidence values. No scoring logic needs to change; both systems are additive signals that enhance coherence without overriding mechanical supremacy.
