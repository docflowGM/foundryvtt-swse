# TIER 1 PRESSURE TEST PROTOCOL

## Overview

This document describes how to run the comprehensive Tier 1 pressure test suite with 4 character profiles that validate:

1. **3-Horizon scoring** with locked weights (Immediate 60% + ShortTerm 25% + Identity 15%)
2. **Prestige delay forecasting** integration with BAB projection
3. **Identity signals** (archetype affinity + chain continuation) in non-mechanical horizon only
4. **Signal dominance** (identity ≤ 3.8% of final score)
5. **Determinism** (same input → same output)

---

## Characters Under Test

### Character 1: Human Jedi 3
**Profile**: Early-game Force user, melee baseline
- **Abilities**: STR 15, DEX 13, CON 14, WIS 8, INT 10, CHA 13
- **Level**: 3 (level-up decision point)
- **Identity**: Jedi Guardian archetype
- **Test Goals**:
  - Validate melee chain continuation (Weapon Focus chain)
  - Confirm Force-focused archetype affinity signal
  - Ensure lightsaber prestige path is recognized

### Character 2: Twi'lek Noble 5 / Scoundrel 1 / Officer 1
**Profile**: Face/leader multiclass at prestige decision point
- **Abilities**: STR 6, DEX 13, CON 14, WIS 10, INT 14, CHA 22 (extreme CHA)
- **Level**: 7
- **Identity**: Noble Diplomat / Officer prestige path
- **Test Goals**:
  - Validate Officer prestige timing (normally level 7+)
  - Confirm CHA-based archetype affinity dominance
  - Test prestige delay with mixed-class penalties
  - Ensure leadership talent recommendations

### Character 3: Wookiee Soldier 2 / Scout 2 / Scoundrel 2 / Jedi 1
**Profile**: Melee bruiser with class mixing stress
- **Abilities**: STR 26 (extremely high), DEX 10, CON 16, WIS 10, INT 14, CHA 6
- **Level**: 7
- **Identity**: Weapon Master / Melee specialization
- **Test Goals**:
  - Stress test: multiclass composition affects prestige delay
  - Validate STR-dominated mechanical scoring
  - Confirm chain continuation for double attack → triple attack chain
  - Ensure identity signals don't override mechanical viability

### Character 4: Duros Scout 10 / Ace Pilot 9
**Profile**: High-level pilot identity with progression decision
- **Abilities**: STR 10, DEX 30 (extreme), CON 10, WIS 10, INT 10, CHA 10
- **Level**: 19 (late-game, attribute increase point)
- **Identity**: Pilot / Flight Specialist
- **Test Goals**:
  - Validate pilot archetype affinity across feat/talent recommendations
  - Test prestige continuation (Ace Pilot → ???)
  - Ensure vehicle/flight chain continuation applies
  - Confirm late-game mechanical dominance

---

## Test Setup

### Prerequisites

1. Foundry VTT instance running with SWSE system
2. All registries initialized:
   - ArchetypeRegistry
   - ChainRegistry
   - PrestigeLayerRegistry
   - IdentityEngine

### Running the Test

**In Foundry Console** (Press F12, go to Console tab):

```javascript
await import('/systems/foundryvtt-swse/scripts/engine/suggestion/tier1-pressure-test.js')
  .then(m => m.runTier1PressureTest())
```

**Expected Output**: Structured breakdown for each character with scoring details.

---

## Expected Outputs & Interpretation

### 1. Build Intent Analysis

For each character, the test reports:
```
📋 BUILD INTENT:
  Primary themes: melee, force, ... (top 3)
  Primary archetype: guardian-defender
  Prestige affinities: Sith Lord (85%), ... (top 3)
```

**Interpretation**:
- Primary themes should match character's build identity
- Primary archetype should map to applied template
- Top prestige affinities should align with class composition

### 2. Identity Bias Report

```
🎭 IDENTITY BIAS:
  Mechanical bias themes: 5
  Role bias defined: YES
```

**Interpretation**:
- Mechanical bias themes indicate how many chainTheme entries are populated
- Role bias indicates if identity layer computed alignment bonuses
- Should be non-empty for characters with templates

### 3. Class Suggestions (Top 5)

Expected format:
```
📚 CLASS SUGGESTIONS (Top 5):

  1. Jedi (continued)
     Score: 0.6625
     Breakdown: I=0.75 S=0.60 Id=0.22
     ⏱️  Prestige delay: 0 (affects timing)
```

**Validate**:
- `Score = (I × 0.6) + (S × 0.25) + (Id × 0.15)` ← Math check
- `I` (Immediate) is 0..1 range
- `S` (ShortTerm) is 0..1 range
- `Id` (Identity) is ≤ 0.25 (cap enforced) ← **TIER 1 SIGNAL**
- `I + S ≥ 0.85 × Score` ← Mechanical dominance check

### 4. Feat Suggestions (Top 5)

Expected format (chain continuation example):
```
  1. Weapon Focus (Lightsaber)
     Score: 0.7365
     Breakdown: I=0.85 S=0.60 Id=0.18
     🔗 Chain: parent="Weapon Proficiency (Lightsaber)" tier=2 weight=1.0
```

**Validate**:
- Chain continuation should only appear if:
  - Candidate has `system.chainTheme` ← Metadata check
  - Candidate has `system.upgradeOf = parentId` ← Reference integrity
  - Actor owns parent item ← Ownership check
  - ChainRegistry.isValidTheme(chainTheme) === true ← DAG validation
- Chain signal ≤ 0.06 cap ← **TIER 1 CAP**
- If chain applies, `Id` should include chain contribution

### 5. Talent Suggestions (Top 5)

Expected format (affinity weighting example):
```
  1. Block (Force)
     Score: 0.7025
     Breakdown: I=0.80 S=0.55 Id=0.20
     📊 Affinity: freq=8/12 modifier=1.195 conf=67%
```

**Validate**:
- Affinity should only appear if:
  - buildIntent.primaryArchetypeId is set ← Template applied
  - buildIntent.archetypeAffinityIndex has candidate ← Enrichment successful
  - affinityEntry.confidence > 0.40 ← Threshold
- Frequency modifier: `1 + (log(freq) / log(maxFreq)) * 0.35`
  - For freq=8, maxFreq=12: log(8)=0.903, log(12)=1.079 → 1 + (0.903/1.079)*0.35 = 1.193 ✓
- Affinity signal ≤ 0.06 cap ← **TIER 1 CAP**
- Role alignment factor should be 0.5..1.25 clamped

### 6. Attribute Suggestions

For levels divisible by 4:
```
💪 ATTRIBUTE SUGGESTIONS:
  +1 Strength
  Reasoning: Breakpoint: approaching BAB +9 at next 3 levels
  Alternative: +1 Dexterity (AC investment if ranged pivot)
  Next opportunity: Level 8
```

For other levels:
```
💪 ATTRIBUTE SUGGESTIONS: N/A (next at level 4)
```

---

## Validation Checklist

### Per-Character Validation

For each character, verify:

- [ ] **Identity Horizon Cap**: `Identity breakdown.prestigeTrajectory + archetypeAffinity + chainContinuation + flexibility ≤ 0.25`
- [ ] **Mechanical Dominance**: `(Immediate + ShortTerm) ≥ 0.85 × FinalScore`
- [ ] **Signal Math**: `FinalScore = (I×0.6) + (S×0.25) + (Id×0.15) + conditional`
- [ ] **Chain Continuation**:
  - Only fires if `ChainRegistry.isValidTheme(chainTheme) === true`
  - Only fires if actor owns parent item
  - Contribution ≤ 0.06 cap
- [ ] **Archetype Affinity**:
  - Only fires if template applied AND item in archetypeAffinityIndex
  - Frequency modifier calculated correctly
  - Role alignment in [0.5, 1.25] range
  - Contribution ≤ 0.06 cap
- [ ] **Prestige Timing**: Delay factors present if multiclass
- [ ] **BAB Breakpoints**: Flagged at +7, +12 (if applicable)

### Cross-Character Patterns

- [ ] **Determinism**: Re-running same character produces identical scores
- [ ] **Identity Isolation**: Identity signals never dominate mechanical ranking
- [ ] **Archetype Affinity Distribution**: Items recommended by more archetypes score higher (monotonic relationship)
- [ ] **Chain Continuation Gradient**: Lower tiers (1-2) weight full, higher tiers (4+) significantly reduce
- [ ] **Prestige Proximity**: Suggestions at +1 to +3 levels show prestige flags

---

## Anomaly Detection

### Red Flags (Investigate Immediately)

| Anomaly | Cause | Resolution |
|---------|-------|-----------|
| Identity > 0.25 | Cap not enforced | Check _computeIdentityProjectionScore() total cap |
| Chain tier=3 weight > 0.5 | Floor not applied | Verify `max(0.25, 1/tier)` logic |
| Affinity freq=1 modifier > 1.4 | Logarithm underflow | Check maxFrequency ≥ 1 |
| Score = 0 for known good item | Missing breakIntent enrichment | Verify buildIntent populated |
| Mechanical < 0.70 but Identity > 0.20 | Signal weighting incorrect | Check horizon weights in final formula |
| Same candidate, different score | Randomness in scorer | Confirm no `Math.random()` calls |
| Chain applies but parent not owned | Ownership check broken | Verify actor._itemIdSet initialization |
| Affinity fires but identity=0 | Signal not contributing | Check cap logic (cap might be hitting 0 due to filtering) |

### Yellow Flags (Monitor & Document)

| Flag | Expected Cause |
|------|----------------|
| Very high Identity (0.20+) | Deep archetype match or prestige trajectory alignment—OK if mechanical dominates |
| No prestige affinities | Character not progressing toward known prestige—OK for off-path builds |
| Chain continuation always 0 | No valid chains in candidate set—OK if no chained items in suggestions |
| Affinity modifier < 1.1 | Item recommended by few archetypes—correct behavior, lower weight expected |

---

## Sample Output (Expected)

```
═══════════════════════════════════════════════════════════
🧪 TIER 1 PRESSURE TEST SUITE
═══════════════════════════════════════════════════════════

CHARACTER: Character 1 — Human Jedi 3
Level: 3 | Classes: Jedi
Abilities: STR 15 | DEX 13 | CON 14 | WIS 8 | INT 10 | CHA 13

📋 BUILD INTENT:
  Primary themes: melee, force
  Primary archetype: guardian-defender
  Prestige affinities: Sith Lord (85%), Jedi Master (60%)

🎭 IDENTITY BIAS:
  Mechanical bias themes: 8
  Role bias defined: YES

📚 CLASS SUGGESTIONS (Top 5):

  1. Jedi (continued)
     Score: 0.6625
     Breakdown: I=0.75 S=0.60 Id=0.22

⚔️  FEAT SUGGESTIONS (Top 5):

  1. Weapon Focus (Lightsaber)
     Score: 0.7365
     Breakdown: I=0.85 S=0.60 Id=0.18
     🔗 Chain: parent="Weapon Proficiency (Lightsaber)" tier=2 weight=1.0
     📊 Affinity: freq=5/8 modifier=1.154 conf=62%

✨ TALENT SUGGESTIONS (Top 5):

  1. Block (Force)
     Score: 0.7025
     Breakdown: I=0.80 S=0.55 Id=0.20
     📊 Affinity: freq=7/10 modifier=1.185 conf=70%

💪 ATTRIBUTE SUGGESTIONS: N/A (next at level 4)

───────────────────────────────────────────────────────────
```

---

## Debugging Guide

### If score math doesn't add up:

```javascript
// Check horizon weight application
console.log('I*0.6 =', I * 0.6);
console.log('S*0.25 =', S * 0.25);
console.log('Id*0.15 =', Id * 0.15);
console.log('Sum =', (I*0.6) + (S*0.25) + (Id*0.15));
// Should equal FinalScore (before conditional bonus)
```

### If chain continuation doesn't apply:

```javascript
// Check each condition
console.log('Has chainTheme?', candidate.system?.chainTheme);
console.log('Has upgradeOf?', candidate.system?.upgradeOf);
console.log('ChainRegistry valid?', ChainRegistry.isValidTheme(theme));
console.log('Actor owns parent?', actor._itemIdSet.has(parentId));
console.log('Affinity > 0.3?', identityBias.mechanicalBias[theme]);
```

### If affinity doesn't fire:

```javascript
// Check enrichment
console.log('Affinity index exists?', buildIntent.archetypeAffinityIndex !== null);
console.log('Item in index?', buildIntent.archetypeAffinityIndex?.has(itemId));
console.log('Entry:', buildIntent.archetypeAffinityIndex?.get(itemId));
console.log('Confidence > 0.40?', entry?.confidence);
```

---

## Interpretation Guide

### "Archetype Affinity Applied" Meaning

When you see:
```
📊 Affinity: freq=8/12 modifier=1.195 conf=67%
```

This means:
- Item is recommended by 8 out of 12 total archetypes
- Confidence = 8/12 = 67%
- Log modifier = 1 + (log(8)/log(12)) × 0.35 = 1.195
- This item gets ~19.5% boost due to high archetype consensus
- Contribution to identity = confidence × modifier × alignment (capped at 0.06)

### "Chain Continuation Applied" Meaning

When you see:
```
🔗 Chain: parent="Weapon Proficiency (Lightsaber)" tier=2 weight=1.0
```

This means:
- Candidate requires parent item "Weapon Proficiency (Lightsaber)"
- Actor owns this parent (ownership check passed)
- This is tier 2 in the chain (tier 1 = root)
- Tier weight = max(0.25, 1/2) = 0.5 (not shown but used internally)
- Chain theme (e.g., "dualWield") has mechanical bias > 0.3
- Contribution to identity = 0.10 × themeAffinity × tierWeight (capped at 0.06)

### "No Signal Applied" Meaning

If affinity/chain don't show:
- **Affinity**: Candidate not in archetype recommendations OR confidence ≤ 0.40
- **Chain**: No parent item, parent not owned, or theme invalid
- **Both OK**: Mechanical scoring still applies, identity just doesn't reinforce

---

## Comparative Analysis

To compare pressure test runs:

### Before vs After Changes

If you re-run pressure test after code changes, compare:

1. **Score deltas**: Should be minimal (<0.01) if changes are localized
2. **Signal attribution**: New signals (affinity/chain) should only appear post-Tier 1
3. **Mechanical scores unchanged**: I and S horizons should be identical
4. **Identity dominance maintained**: Identity contribution always ≤ 4% of final

### Character-to-Character

Expected patterns:

| Character | Primary Signal | Expected Identity % |
|-----------|---|---|
| Jedi 3 | Chain continuation | ~2-3% |
| Noble/Officer | Archetype affinity | ~2-3% |
| Wookiee | Chain continuation | ~2-3% |
| Duros Pilot | Archetype affinity | ~2-3% |

All should cluster around 3-4% identity contribution.

---

## Conclusion

This pressure test validates that Tier 1 enhancements:
- ✅ Don't override mechanical scoring (identity isolated)
- ✅ Respect all locked caps (individual + total)
- ✅ Apply signals deterministically
- ✅ Handle edge cases gracefully
- ✅ Provide interpretable breakdowns

Run this test before & after code changes to confirm Tier 1 behavior is stable and non-regressive.
