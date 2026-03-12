# Tier 1 Metadata Population Strategy

**Input**: Sample archetypes and their feat/talent lists
**Goal**: Efficiently populate `archetype`, `playstyle`, `tier` fields across 500+ feats

---

## PLAYSTYLE MAPPING FROM ARCHETYPE BIAS

### Pattern Recognition

From the examples, we can derive playstyle from `mechanicalBias` keys:

| mechanicalBias Key | → | Playstyle | Examples |
|-------------------|---|-----------|----------|
| `attackBonus`, `singleTargetDamage`, `critRange`, `striker` | → | `melee` or `ranged` | Jedi Duelist, Precision Striker |
| `autofire`, `areaDamage`, `areaStriker` | → | `ranged` | Heavy Weapons Specialist |
| `allyAttackBonus`, `moraleBonus`, `support`, `leader` | → | `support` | Battlefield Commander |
| `mobility`, `skirmisher`, `harasser` | → | `melee` | Mobile Skirmisher |

### Decision Tree

```
if mechanicalBias has:
  - allyAttackBonus OR support OR leader → playstyle = "support"
  - autofire OR areaDamage → playstyle = "ranged"
  - singleTargetDamage + critRange → playstyle = "melee" or "ranged" (check feat type)
  - mobility + skirmisher → playstyle = "melee"
  - deflect + block → playstyle = "defense"
  else:
    → playstyle = "utility"
```

---

## TIER MAPPING FROM FEAT DESCRIPTION & PREREQUISITES

### Tier Heuristics

**Tier 0 (Novice)** — Early-level, basic, foundational:
- Prerequisites: Level 1, no other feat requirements
- Examples: Weapon Focus, Armor Proficiency, Skill Focus
- Pattern: "basic", "simple", "proficiency"

**Tier 1 (Intermediate)** — Builds on basics, mid-level:
- Prerequisites: Level 4+, references another feat
- Examples: Improved Critical (requires Weapon Focus), Acrobatic Strike
- Pattern: "Improved X", "Enhanced X", builds on tier 0

**Tier 2 (Advanced)** — Complex mechanics, late-level:
- Prerequisites: Level 9+, multiple feat chains
- Examples: Master of Arms, Greater Weapon Focus
- Pattern: "Master", "Greater", "Superior"

**Tier 3 (Expert)** — Niche, high-level, specialized:
- Prerequisites: Level 17+, very specific builds
- Examples: Overwhelming Attack, Supreme Mastery
- Pattern: "Supreme", "Overwhelming", "Legendary"

### Assignment Rules

```
tier = 0  // default

if "Master of" in name or "Supreme" in name:
  tier = 3
else if "Greater" in name or "Superior" in name:
  tier = 2
else if "Improved" in name or prerequisites mention another feat:
  tier = 1
else:
  tier = 0
```

---

## ARCHETYPE TAGGING

### Direct Mapping

Each feat/talent in archetype definition gets tagged with that archetype:

**Jedi Duelist**:
- Block → `archetype: "jedi_duelist"`
- Deflect → `archetype: "jedi_duelist"`
- Riposte → `archetype: "jedi_duelist"`
- Weapon Focus (Lightsabers) → `archetype: "jedi_duelist"`
- Improved Critical (Lightsabers) → `archetype: "jedi_duelist"`
- Acrobatic Strike → `archetype: "jedi_duelist"`

**Heavy Weapons Suppression Specialist**:
- Autofire Assault → `archetype: "heavy_weapons_specialist"`
- Devastating Attack → `archetype: "heavy_weapons_specialist"`
- Burst Fire → `archetype: "heavy_weapons_specialist"`
- etc.

### Multi-Archetype Feats

Some feats support multiple archetypes:

```json
{
  "name": "Weapon Focus (Lightsabers)",
  "archetype": "jedi_duelist"  // Primary
}

// OR if supporting multiple:

{
  "name": "Weapon Focus (Lightsabers)",
  "archetype": ["jedi_duelist", "jedi_sentinel"]  // Multiple
}
```

---

## SAMPLE POPULATION

Using the provided examples:

### JEDI DUELIST

**Block (Talent)**
```json
{
  "name": "Block",
  "archetype": "jedi_duelist",
  "playstyle": "defense",
  "tier": 0
}
```

**Riposte (Talent)**
```json
{
  "name": "Riposte",
  "archetype": "jedi_duelist",
  "playstyle": "melee",
  "tier": 1  // Builds on Block
}
```

**Weapon Focus (Lightsabers) (Feat)**
```json
{
  "name": "Weapon Focus (Lightsabers)",
  "archetype": "jedi_duelist",
  "playstyle": "melee",
  "tier": 0  // Foundational
}
```

**Improved Critical (Lightsabers) (Feat)**
```json
{
  "name": "Improved Critical (Lightsabers)",
  "archetype": "jedi_duelist",
  "playstyle": "melee",
  "tier": 1  // Requires Weapon Focus
}
```

---

### HEAVY WEAPONS SUPPRESSION SPECIALIST

**Autofire Assault (Talent)**
```json
{
  "name": "Autofire Assault",
  "archetype": "heavy_weapons_specialist",
  "playstyle": "ranged",
  "tier": 1  // Intermediate mechanic
}
```

**Burst Fire (Feat)**
```json
{
  "name": "Burst Fire",
  "archetype": "heavy_weapons_specialist",
  "playstyle": "ranged",
  "tier": 0  // Foundational autofire
}
```

**Autofire Sweep (Feat)**
```json
{
  "name": "Autofire Sweep",
  "archetype": "heavy_weapons_specialist",
  "playstyle": "ranged",
  "tier": 1  // Advanced autofire
}
```

---

### PRECISION STRIKER (SCOUNDREL)

**Sneak Attack (Talent)**
```json
{
  "name": "Sneak Attack",
  "archetype": "precision_striker",
  "playstyle": "melee",
  "tier": 0  // Core mechanic
}
```

**Weapon Focus (Pistols) (Feat)**
```json
{
  "name": "Weapon Focus (Pistols)",
  "archetype": "precision_striker",
  "playstyle": "ranged",
  "tier": 0  // Foundational
}
```

**Point Blank Shot (Feat)**
```json
{
  "name": "Point Blank Shot",
  "archetype": "precision_striker",
  "playstyle": "ranged",
  "tier": 0  // Basic ranged feat
}
```

**Improved Critical (Pistols) (Feat)**
```json
{
  "name": "Improved Critical (Pistols)",
  "archetype": "precision_striker",
  "playstyle": "ranged",
  "tier": 1  // Requires Weapon Focus
}
```

---

### BATTLEFIELD COMMANDER (NOBLE)

**Inspire Confidence (Talent)**
```json
{
  "name": "Inspire Confidence",
  "archetype": "battlefield_commander",
  "playstyle": "support",
  "tier": 0  // Foundational support
}
```

**Skill Focus (Persuasion) (Feat)**
```json
{
  "name": "Skill Focus (Persuasion)",
  "archetype": "battlefield_commander",
  "playstyle": "support",
  "tier": 0  // Foundational skill feat
}
```

---

## AUTOMATION OPPORTUNITY

### Script Template

```javascript
// Semi-automated population strategy

const archetypeData = require('./class-archetypes.json');
const allFeats = await game.packs.get('foundryvtt-swse.feats').getDocuments();

for (const [className, classData] of Object.entries(archetypeData.classes)) {
  for (const [archetypeId, archetype] of Object.entries(classData.archetypes)) {
    const archetypeName = archetype.name;
    const playstyleGuess = derivePlaystyleFromBias(archetype.mechanicalBias);

    // Tag all talents in this archetype
    for (const talentName of archetype.talents || []) {
      const talent = allFeats.find(f => f.name === talentName && f.type === 'talent');
      if (talent) {
        talent.system.archetype = archetypeName;
        talent.system.playstyle = playstyleGuess;
        talent.system.tier = inferTierFromName(talentName);
        await talent.update();
      }
    }

    // Tag all feats in this archetype
    for (const featName of archetype.feats || []) {
      const feat = allFeats.find(f => f.name === featName && f.type === 'feat');
      if (feat) {
        feat.system.archetype = archetypeName;
        feat.system.playstyle = playstyleGuess;
        feat.system.tier = inferTierFromName(featName);
        await feat.update();
      }
    }
  }
}
```

---

## POPULATION PHASES

### Phase 1: Archetype-Direct (Fastest)
- [ ] Extract feat/talent names from each archetype definition
- [ ] Set `archetype` field directly from archetype name
- [ ] Automated, high confidence
- **Effort**: 1-2 hours (can script most of this)
- **Coverage**: All feats in archetypes, ~80% of feats total

### Phase 2: Playstyle Inference (Semi-Auto)
- [ ] Analyze mechanicalBias of archetype
- [ ] Infer playstyle using decision tree
- [ ] Manual review for ambiguous cases
- **Effort**: 2-3 hours
- **Accuracy**: 90%+ with decision tree

### Phase 3: Tier Assignment (Manual)
- [ ] Check feat names for "Improved", "Master", "Greater", etc.
- [ ] Check prerequisites for tier dependencies
- [ ] Manual assignment for edge cases
- **Effort**: 3-4 hours (most time-consuming)
- **Accuracy**: 95%+ with naming conventions

### Phase 4: QA & Validation
- [ ] Run `ArchetypeMetadataEngine.validateMetadata()` on all items
- [ ] Spot-check suggestions in dev world
- [ ] Fix any validation warnings
- **Effort**: 1-2 hours

---

## PRIORITY ORDER

**Week 1** (High-ROI):
1. Core 100 feats (Jedi, Soldier, Scoundrel, Noble, Scout variants)
2. Common feats (Weapon Focus, Point Blank, etc.)
3. Archetype-specific talents

**Week 2** (Extended):
4. Remaining 400+ feats
5. Cross-archetype feats (support multiple archetypes)
6. Edge cases & validation

---

## SUCCESS METRICS

When done, verify:

✅ All feats/talents have `archetype` field (or empty)
✅ All feats/talents have `playstyle` field (or empty)
✅ All feats/talents have `tier` field (0-3)
✅ No validation errors logged
✅ Suggestions improve in dev world testing
✅ Characters get +0.10-0.25 confidence boost from metadata

---

## TOOLS PROVIDED

```javascript
// Validation
ArchetypeMetadataEngine.validateMetadata(item)
// → { valid: boolean, errors: string[] }

// Playstyle detection
ArchetypeMetadataEngine.detectCharacterPlaystyle(actor)
// → playstyle string or null

// Boost calculation (for testing)
ArchetypeMetadataEngine.calculateMetadataBoost(item, character)
// → { boost: number, reasons: string[] }
```

---

## NEXT STEP

Choose your approach:

**Option A: Automated + Manual Review**
- Script Phase 1 (archetype tagging): 1-2 hrs
- Manual Phase 2-3 (playstyle + tier): 3-4 hrs
- Total: 4-6 hours for core feats

**Option B: Full Manual (More Control)**
- Spreadsheet approach: 6-8 hours
- Better for understanding feat ecosystem
- More time but highest accuracy

**Option C: Hybrid (Recommended)**
- Automated archetype tagging (1 hr)
- Manual playstyle review (2 hrs)
- Tier inference from names (1 hr)
- Total: 4 hours, high quality

I can create the automation script if you want Option A or C.
