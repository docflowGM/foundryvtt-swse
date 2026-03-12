# Feat & Talent Metadata Improvements for Suggestion Engine

**Analysis Date**: 2026-03-11
**Scope**: Improving metadata to enable better suggestions
**Approach**: Non-breaking, additive field strategy

---

## CURRENT STATE

### Suggestion Engine's Actual Data Usage

The suggestion engine currently uses:

**From Feat/Talent Items**:
- `name` — Direct name matching
- `prerequisite` / `prerequisites` — Text parsing for chain detection
- `bonus_feat_for` — Class-specific bonus feat logic
- `tree` / `treeId` — Talent tree authority checks
- Item ID — For archetype recommendations

**What Gets Ignored**:
- `description` / `benefit` — Used only in UI, not suggestions
- `tags` — Present in many items, never consulted by suggestion engine
- `grantsBonuses` — Defined but not consumed
- `grantsActions` — Defined but not consumed
- `special` — Rules text, not parsed

**Hard-Coded Fallbacks**:
- Highest ability score (not from item, from actor)
- Trained skills (parsed from prerequisite text via regex)
- Class membership (from actor items, not feat metadata)
- Archetype affinity (from archetype definitions, not feat metadata)

### The Gap

The suggestion engine has **zero** metadata-driven signal for:
- How useful is this feat/talent for this character?
- Does this feat synergize with character's current choices?
- Is this feat too early or too late to suggest?
- What is the mechanical/playstyle impact?
- Is this feat archetype-aligned?

---

## IMPROVEMENT STRATEGY

**Principle**: Additive, non-breaking fields. Leave existing fields untouched.

**Target**: Enable the suggestion engine to:
1. ✅ Suggest items that align with character's archetype
2. ✅ Suggest items that synergize with existing choices
3. ✅ Suggest items at appropriate progression levels
4. ✅ Avoid suggesting conflicting or redundant choices
5. ✅ Rank suggestions by mechanical impact and playstyle fit

---

## TIER 1: HIGH-IMPACT, EASY ADDITIONS

These fields have immediate payoff with minimal effort. Should be added first.

### 1. `archetype` (String or Array)

**Purpose**: Explicitly declare which archetype(s) this feat/talent supports.

**Type**: `string` (single primary) or `Array<string>` (multiple)

**Example**:
```json
{
  "name": "Block",
  "archetype": "guardian_defender"
}

{
  "name": "Armor Proficiency (Light)",
  "archetype": ["guardian_defender", "sentinel", "trooper"]
}
```

**Usage by Suggestion Engine**:
```javascript
// Instead of:
if (archetypeRecommendedFeatIds.includes(feat.id)) {  // Tier 3 boost

// Could do:
if (feat.system.archetype === primaryArchetype.name) {  // Tier 3 boost
// More reliable than keyword matching, explicit in metadata
```

**Impact**:
- ✅ Direct archetype alignment (currently via keywords only)
- ✅ No keyword fuzzy-matching needed
- ✅ Easier to audit (what feats support what archetypes)
- ⏱ 30 mins to add to 500+ feats

**Canonical Values**: Derive from `/data/class-archetypes.json` archetype names

---

### 2. `playstyle` (String)

**Purpose**: Categorize feat/talent by tactical/mechanical playstyle.

**Type**: `string` (single, from enum)

**Valid Values**:
- `"melee"` — Melee combat tactics
- `"ranged"` — Ranged combat tactics
- `"force"` — Force power synergy
- `"support"` — Helping allies/buffs
- `"control"` — Crowd control/debuffs
- `"defense"` — Damage mitigation/survival
- `"skill"` — Skill/knowledge focus
- `"utility"` — Out-of-combat utility

**Example**:
```json
{
  "name": "Point Blank Shot",
  "playstyle": "ranged"
}

{
  "name": "Coordinated Attack",
  "playstyle": "support"
}

{
  "name": "Shake It Off",
  "playstyle": "defense"
}
```

**Usage by Suggestion Engine**:
```javascript
// Could boost suggestions for feats matching character's playstyle pattern
if (feat.system.playstyle === character.detectedPlaystyle) {
    confidence += 0.1;  // Playstyle alignment bonus
}
```

**Impact**:
- ✅ Playstyle-driven suggestions (character plays ranged → suggest ranged feats)
- ✅ Avoids suggesting contradictory playstyles
- ✅ Enables "character coherence" scoring
- ⏱ 1-2 hours (need to categorize all feats)

**Validation**: Enum enforcement in template.json

---

### 3. `tier` (Number)

**Purpose**: Relative complexity/power level for progressive suggestion.

**Type**: `number` (0-3)

**Values**:
- `0` = Novice (basic, early-level appropriate)
- `1` = Intermediate (builds on novice, mid-level)
- `2` = Advanced (complex synergies, late-level)
- `3` = Expert (niche, high-level only)

**Example**:
```json
{
  "name": "Armor Proficiency (Light)",
  "tier": 0  // Everyone learns early
}

{
  "name": "Master of Arms",
  "tier": 2  // Advanced weapon mastery
}

{
  "name": "Overwhelming Attack",
  "tier": 3  // Expert-only, high-level build marker
}
```

**Usage by Suggestion Engine**:
```javascript
// Only suggest tier-appropriate feats for character's level
if (feat.system.tier <= character.calculatedProgression) {
    // Available for suggestion
} else {
    // Skip (too advanced for this level)
}
```

**Impact**:
- ✅ Level-appropriate suggestions (no suggesting expert feats at level 1)
- ✅ Guides player progression naturally
- ✅ Prevents overwhelming new players
- ⏱ 1-2 hours (need to tier all ~500 feats)

**Validation**: Range check (0-3) in template.json

---

## TIER 2: MEDIUM-IMPACT, MODERATE EFFORT

These enable richer suggestions. Add after Tier 1.

### 4. `synergiesWith` (Array<string>)

**Purpose**: Declare feats/talents this item synergizes with.

**Type**: `Array<string>` (item names)

**Example**:
```json
{
  "name": "Rapid Strike",
  "synergiesWith": ["Two-Weapon Fighting", "Flurry of Blows", "Weapon Finesse"]
}
```

**Usage by Suggestion Engine**:
```javascript
// If character already has one of these, boost this feat
if (character.ownedFeats.some(f => feat.system.synergiesWith.includes(f.name))) {
    suggestion.tier = Math.min(suggestion.tier + 0.5, maxTier);
}
```

**Impact**:
- ✅ Chain/combo suggestions (feat chains that work together)
- ✅ Build coherence (feats that stack/synergize)
- ✅ Prevents suggesting orphaned feats
- ⏱ 3-4 hours (need to map synergies, moderate complexity)

**Validation**: Name resolution at load time (warn on unresolved)

---

### 5. `conflictsWith` (Array<string>)

**Purpose**: Declare feats/talents this item conflicts with or makes redundant.

**Type**: `Array<string>` (item names)

**Example**:
```json
{
  "name": "Acrobatics Mastery",
  "conflictsWith": ["Tumble", "Escape Artist"]  // Replaces these
}

{
  "name": "Light Armor Proficiency",
  "conflictsWith": ["Medium Armor Proficiency"]  // Can't stack
}
```

**Usage by Suggestion Engine**:
```javascript
// Don't suggest if character already has conflicting feat
if (character.ownedFeats.some(f => feat.system.conflictsWith.includes(f.name))) {
    return null;  // Skip suggestion entirely
}
```

**Impact**:
- ✅ Prevents suggesting redundant feats
- ✅ Avoids feat stacking mistakes
- ✅ Clears up commonly-conflated feats
- ⏱ 3-4 hours (map conflicts across feat database)

**Validation**: Name resolution, mutual consistency checking

---

### 6. `skillAffinity` (Object)

**Purpose**: Declare which skills this feat/talent synergizes with.

**Type**: `Object<skillKey, number>` (key → weight 0-1)

**Example**:
```json
{
  "name": "Skill Focus (Stealth)",
  "skillAffinity": {
    "stealth": 1.0,          // Primary affinity
    "hide": 0.8,             // Secondary
    "perception": 0.3        // Tertiary (opposition skill)
  }
}

{
  "name": "Force Persuasion",
  "skillAffinity": {
    "use_the_force": 1.0,
    "deception": 0.6
  }
}
```

**Usage by Suggestion Engine**:
```javascript
// Boost suggestion if character has trained in synergistic skills
for (const [skill, weight] of Object.entries(feat.system.skillAffinity || {})) {
    if (character.trainedSkills.has(skill)) {
        suggestion.confidence += weight * 0.15;  // Skill synergy boost
    }
}
```

**Impact**:
- ✅ Skill-based feat recommendations (trained in Stealth → suggest Stealth feats)
- ✅ Builds coherent skill focus
- ✅ More nuanced than simple prerequisite text parsing
- ⏱ 2-3 hours (extract from prerequisite text, normalize)

**Skill Keys**: Use canonical skill keys from `/data/skills.json`

---

## TIER 3: NICE-TO-HAVE, HIGH-EFFORT

These are polish features. Add last if resources allow.

### 7. `classAffinity` (Object)

**Purpose**: Declare which classes this feat/talent is particularly suited for.

**Type**: `Object<className, number>` (class → weight 0-1)

**Example**:
```json
{
  "name": "Heavy Weapon Proficiency",
  "classAffinity": {
    "soldier": 1.0,
    "scout": 0.7,
    "jedi": 0.3
  }
}
```

**Impact**:
- ✅ Class-agnostic but class-aligned suggestions
- ✅ Helps multi-class characters find feat fit
- ⏱ 2-3 hours (extract from feat database history)

---

### 8. `levelRecommendation` (Object)

**Purpose**: Suggest when character should learn this feat/talent.

**Type**: `Object { minLevel, maxLevel, idealLevel }`

**Example**:
```json
{
  "name": "Evasion",
  "levelRecommendation": {
    "minLevel": 3,     // Can take at level 3
    "idealLevel": 5,   // Best at level 5
    "maxLevel": 20     // Don't take after level 20
  }
}
```

**Impact**:
- ✅ Temporal guidance (when to take this feat)
- ✅ Prevents late-game irrelevant suggestions
- ⏱ 3-4 hours (analyze feat effectiveness curves)

---

### 9. `roleBias` (Object)

**Purpose**: Align feat/talent with archetype roles.

**Type**: `Object<role, number>` (offense/defense/support/etc → weight)

**Example**:
```json
{
  "name": "Greater Weapon Focus",
  "roleBias": {
    "offense": 1.0,
    "defense": 0.2,
    "support": 0.1
  }
}
```

**Impact**:
- ✅ Role-based suggestions (archetype's roleBias filters feats)
- ✅ Aligns with archetype metadata structure
- ⏱ 2-3 hours (map to existing archetype roles)

---

## IMPLEMENTATION PATH

### Phase 1: Foundation (Week 1)
1. Add Tier 1 fields to template.json:
   - `archetype` (string)
   - `playstyle` (enum: melee, ranged, force, support, control, defense, skill, utility)
   - `tier` (number: 0-3)

2. Populate for core 100 feats (highest-priority)
3. Update suggestion engine to use new fields
4. Test in dev world

### Phase 2: Expansion (Week 2-3)
1. Add Tier 2 fields:
   - `synergiesWith` (array)
   - `conflictsWith` (array)
   - `skillAffinity` (object)

2. Populate across all ~500 feats (can be automated with regex + manual review)
3. Update suggestion engine scoring
4. Test for regressions

### Phase 3: Polish (Week 4+)
1. Add Tier 3 fields as needed
2. Schema validation at load time
3. UI for editing metadata
4. Build tooling for maintenance

---

## SUGGESTED CHANGES TO SUGGESTION ENGINE

### New Scoring Boost: `_calculateMetadataBoost()`

```javascript
static _calculateMetadataBoost(feat, character) {
    let boost = 0.0;

    // 1. Archetype alignment (+0.15)
    if (feat.system.archetype === character.primaryArchetype?.name) {
        boost += 0.15;
    }

    // 2. Playstyle coherence (+0.10)
    if (feat.system.playstyle === character.detectedPlaystyle) {
        boost += 0.10;
    }

    // 3. Tier appropriateness (+0.05)
    if (feat.system.tier <= character.progressionTier) {
        boost += 0.05;
    }

    // 4. Synergy with existing feats (+0.10)
    if (feat.system.synergiesWith?.some(name => character.ownedFeats.has(name))) {
        boost += 0.10;
    }

    // 5. Skill affinity (+0.10)
    const skillBoost = Object.entries(feat.system.skillAffinity || {})
        .filter(([skill, _]) => character.trainedSkills.has(skill))
        .reduce((sum, [_, weight]) => sum + weight * 0.05, 0);
    boost += Math.min(skillBoost, 0.10);

    // Cap total boost
    return Math.min(boost, 0.25);
}
```

### Integration Point

In `_evaluateFeat()`, apply metadata boost to Tier 3+:

```javascript
if (suggestion.tier >= UNIFIED_TIERS.CATEGORY_SYNERGY) {
    const metadataBoost = this._calculateMetadataBoost(feat, actor);
    suggestion.confidence = Math.min(suggestion.confidence + metadataBoost, 1.0);
}
```

---

## VALIDATION & QUALITY GATES

### At Load Time
```javascript
// 1. Archetype validation
if (feat.system.archetype && !allArchetypes.includes(feat.system.archetype)) {
    logger.warn(`Feat "${feat.name}" references unknown archetype: ${feat.system.archetype}`);
}

// 2. Playstyle validation
if (feat.system.playstyle && !validPlaystyles.includes(feat.system.playstyle)) {
    logger.error(`Feat "${feat.name}" has invalid playstyle: ${feat.system.playstyle}`);
}

// 3. Synergy resolution
for (const syncName of feat.system.synergiesWith || []) {
    if (!allFeats.some(f => f.name === syncName)) {
        logger.warn(`Feat "${feat.name}" synergizes with unknown feat: ${syncName}`);
    }
}
```

### Audit Tools
- Script to find all feats without archetype assignment
- Report on playstyle distribution (ensure balanced coverage)
- Validate mutual references (if A synergizes with B, B should synergize with A)

---

## MIGRATION PATH

**Non-Breaking**:
- All new fields are optional
- Missing fields default to "no boost"
- Existing suggestion logic unchanged
- Suggestions gradually improve as metadata fills in

**Backwards Compatible**:
- Old feats without metadata work fine (just get no new boosts)
- Can populate metadata incrementally
- No code changes required to keep system functional

---

## EFFORT ESTIMATE

| Task | Hours | Difficulty |
|------|-------|-----------|
| Template.json updates (Tier 1 fields) | 1 | Low |
| Suggestion engine code changes | 2-3 | Low-Medium |
| Populate Tier 1 (100 core feats) | 4-6 | Medium |
| Populate Tier 1 (remaining 400 feats) | 8-12 | Medium (repetitive) |
| Add Tier 2 fields (template + code) | 2-3 | Medium |
| Populate Tier 2 (500 feats) | 10-15 | Medium-High |
| Validation & tooling | 4-6 | Medium |
| **Total** | **31-46** | - |

**Realistic Timeline**: 4-6 weeks part-time, or 2 weeks full-time

---

## PRIORITY RECOMMENDATION

**Start with Tier 1** (`archetype`, `playstyle`, `tier`):
- Highest impact per effort
- Immediately improves suggestions
- Sets foundation for Tier 2
- Easiest to populate

**Then Tier 2** (`synergiesWith`, `conflictsWith`, `skillAffinity`):
- Enables combo/synergy suggestions
- Prevents bad suggestions
- Moderate effort, high value

**Tier 3 is nice-to-have** — don't block on this.

---

## NEXT STEP

Once you commit the archetype contract fix, this metadata strategy becomes safe to implement. The suggestion engine will have working archetype recommendations, so we can add metadata as an additive layer.

**Ready to proceed when you approve the direction.**
