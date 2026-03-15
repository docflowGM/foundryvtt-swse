# Soldier Archetype Metadata Mapping

**Normalized Names** (5 distinct optimization families)

---

## Archetype Normalization

| Original | Normalized | Role | Playstyle | Notes |
|----------|-----------|------|-----------|-------|
| Heavy Weapons Suppression Specialist | **Heavy Weapons Specialist** | Striker | ranged | Autofire control, area pressure |
| Armored Shock Trooper | **Armored Shock Trooper** | Tank | melee | Frontline bruiser, durability stacker |
| Precision Rifleman | **Precision Rifleman** | Striker | ranged | Single-target, crit-focused |
| Close-Quarters Breacher | **Close-Quarters Breacher** | Striker | melee | Shotgun/short-range aggression |
| Battlefield Enforcer | **Battlefield Enforcer** | Controller | melee | Condition track pressure |

---

## HEAVY WEAPONS SPECIALIST

**Archetype ID**: `heavy_weapons_specialist`
**Primary Role**: Striker (area pressure, autofire control)
**Playstyle**: `ranged`
**Attribute Focus**: STR (3), CON (2), DEX (1)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Autofire Assault** | heavy_weapons_specialist | ranged | 1 | Core autofire mechanic, intermediate |
| **Devastating Attack** | heavy_weapons_specialist | ranged | 1 | Damage enhancement, mid-level |
| **Penetrating Attack** | heavy_weapons_specialist | ranged | 2 | Advanced penetration, late-game |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Burst Fire** | heavy_weapons_specialist | ranged | 0 | Foundational autofire |
| **Autofire Sweep** | heavy_weapons_specialist | ranged | 1 | Advanced autofire area control |
| **Weapon Focus (Heavy Weapons)** | heavy_weapons_specialist | ranged | 0 | Foundational weapon proficiency |
| **Weapon Specialization (Heavy Weapons)** | heavy_weapons_specialist | ranged | 1 | Requires Weapon Focus |

---

## ARMORED SHOCK TROOPER

**Archetype ID**: `armored_shock_trooper`
**Primary Role**: Tank (durability, frontline)
**Playstyle**: `defense`
**Attribute Focus**: STR (3), CON (3)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Armor Specialist** | armored_shock_trooper | defense | 1 | Armor enhancement, intermediate |
| **Improved Damage Reduction** | armored_shock_trooper | defense | 2 | Advanced mitigation |
| **Melee Smash** | armored_shock_trooper | melee | 1 | Offensive pressure, mid-level |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Armor Proficiency (Heavy)** | armored_shock_trooper | defense | 0 | Foundational armor access |
| **Power Attack** | armored_shock_trooper | melee | 1 | Requires melee competence |
| **Toughness** | armored_shock_trooper | defense | 0 | Foundational survivability |
| **Weapon Focus (Advanced Melee)** | armored_shock_trooper | melee | 0 | Weapon proficiency |

---

## PRECISION RIFLEMAN

**Archetype ID**: `precision_rifleman`
**Primary Role**: Striker (single-target, crit-focused)
**Playstyle**: `ranged`
**Attribute Focus**: DEX (3), INT (1), CON (1)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Devastating Attack** | precision_rifleman | ranged | 1 | Damage enhancement |
| **Deadeye** | precision_rifleman | ranged | 1 | Accuracy mastery, intermediate |
| **Weapon Specialization** | precision_rifleman | ranged | 1 | Requires foundational focus |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Weapon Focus (Rifles)** | precision_rifleman | ranged | 0 | Foundational weapon proficiency |
| **Improved Critical (Rifles)** | precision_rifleman | ranged | 1 | Crit expansion, requires Weapon Focus |
| **Careful Shot** | precision_rifleman | ranged | 1 | Precision bonus, mid-level |

---

## CLOSE-QUARTERS BREACHER

**Archetype ID**: `close_quarters_breacher`
**Primary Role**: Striker (short-range aggression)
**Playstyle**: `melee`
**Attribute Focus**: STR (2), DEX (2), CON (2)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Devastating Attack** | close_quarters_breacher | melee | 1 | Damage enhancement |
| **Melee Smash** | close_quarters_breacher | melee | 1 | Close-range damage, intermediate |
| **Assault Tactics** | close_quarters_breacher | melee | 2 | Advanced close-quarters tactics |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Point Blank Shot** | close_quarters_breacher | melee | 0 | Foundational short-range |
| **Rapid Shot** | close_quarters_breacher | melee | 1 | Multi-attack, intermediate |
| **Weapon Focus (Rifles)** | close_quarters_breacher | melee | 0 | Weapon proficiency |

---

## BATTLEFIELD ENFORCER

**Archetype ID**: `battlefield_enforcer`
**Primary Role**: Controller (condition track pressure)
**Playstyle**: `control`
**Attribute Focus**: STR (2), CON (2), DEX (2)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Devastating Attack** | battlefield_enforcer | melee | 1 | Damage foundation |
| **Penetrating Attack** | battlefield_enforcer | control | 2 | Condition advancement, advanced |
| **Improved Suppression** | battlefield_enforcer | control | 2 | Condition pressure, late-game |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Power Attack** | battlefield_enforcer | melee | 1 | Melee enhancement |
| **Weapon Focus (Advanced Melee)** | battlefield_enforcer | melee | 0 | Weapon proficiency |
| **Improved Trip** | battlefield_enforcer | control | 1 | Condition application, intermediate |

---

## MULTI-ARCHETYPE FEATS

Feats that support multiple Soldier archetypes:

| Feat | Primary Archetype | Secondary Archetypes | Playstyle | Tier |
|------|-------------------|----------------------|-----------|------|
| **Devastating Attack** | precision_rifleman | close_quarters_breacher, battlefield_enforcer | melee/ranged | 1 |
| **Weapon Focus** | heavy_weapons_specialist | precision_rifleman, close_quarters_breacher | varies | 0 |
| **Power Attack** | armored_shock_trooper | battlefield_enforcer, close_quarters_breacher | melee | 1 |
| **Toughness** | armored_shock_trooper | heavy_weapons_specialist | defense | 0 |

---

## POPULATION CHECKLIST

### Heavy Weapons Specialist (3 talents, 4 feats = 7 items)
- [ ] Autofire Assault → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 1
- [ ] Devastating Attack → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 1
- [ ] Penetrating Attack → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 2
- [ ] Burst Fire → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 0
- [ ] Autofire Sweep → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 1
- [ ] Weapon Focus (Heavy Weapons) → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 0
- [ ] Weapon Specialization (Heavy Weapons) → archetype: heavy_weapons_specialist, playstyle: ranged, tier: 1

### Armored Shock Trooper (3 talents, 4 feats = 7 items)
- [ ] Armor Specialist → archetype: armored_shock_trooper, playstyle: defense, tier: 1
- [ ] Improved Damage Reduction → archetype: armored_shock_trooper, playstyle: defense, tier: 2
- [ ] Melee Smash → archetype: armored_shock_trooper, playstyle: melee, tier: 1
- [ ] Armor Proficiency (Heavy) → archetype: armored_shock_trooper, playstyle: defense, tier: 0
- [ ] Power Attack → archetype: armored_shock_trooper, playstyle: melee, tier: 1
- [ ] Toughness → archetype: armored_shock_trooper, playstyle: defense, tier: 0
- [ ] Weapon Focus (Advanced Melee) → archetype: armored_shock_trooper, playstyle: melee, tier: 0

### Precision Rifleman (3 talents, 3 feats = 6 items)
- [ ] Devastating Attack → archetype: precision_rifleman, playstyle: ranged, tier: 1
- [ ] Deadeye → archetype: precision_rifleman, playstyle: ranged, tier: 1
- [ ] Weapon Specialization → archetype: precision_rifleman, playstyle: ranged, tier: 1
- [ ] Weapon Focus (Rifles) → archetype: precision_rifleman, playstyle: ranged, tier: 0
- [ ] Improved Critical (Rifles) → archetype: precision_rifleman, playstyle: ranged, tier: 1
- [ ] Careful Shot → archetype: precision_rifleman, playstyle: ranged, tier: 1

### Close-Quarters Breacher (3 talents, 3 feats = 6 items)
- [ ] Devastating Attack → archetype: close_quarters_breacher, playstyle: melee, tier: 1
- [ ] Melee Smash → archetype: close_quarters_breacher, playstyle: melee, tier: 1
- [ ] Assault Tactics → archetype: close_quarters_breacher, playstyle: melee, tier: 2
- [ ] Point Blank Shot → archetype: close_quarters_breacher, playstyle: melee, tier: 0
- [ ] Rapid Shot → archetype: close_quarters_breacher, playstyle: melee, tier: 1
- [ ] Weapon Focus (Rifles) → archetype: close_quarters_breacher, playstyle: melee, tier: 0

### Battlefield Enforcer (3 talents, 3 feats = 6 items)
- [ ] Devastating Attack → archetype: battlefield_enforcer, playstyle: melee, tier: 1
- [ ] Penetrating Attack → archetype: battlefield_enforcer, playstyle: control, tier: 2
- [ ] Improved Suppression → archetype: battlefield_enforcer, playstyle: control, tier: 2
- [ ] Power Attack → archetype: battlefield_enforcer, playstyle: melee, tier: 1
- [ ] Weapon Focus (Advanced Melee) → archetype: battlefield_enforcer, playstyle: melee, tier: 0
- [ ] Improved Trip → archetype: battlefield_enforcer, playstyle: control, tier: 1

**Unique Items**: 27 (estimated)
**Estimated Time**: 20-30 minutes manual tagging

---

## VALIDATION CHECKLIST

After population:

- [ ] All talents tagged with archetype
- [ ] All feats tagged with archetype
- [ ] All playstyles valid enum (melee, ranged, force, support, control, defense, skill, utility)
- [ ] All tiers 0-3
- [ ] Run `ArchetypeMetadataEngine.validateMetadata()` on each item
- [ ] Test in dev world: Soldier character gets archetype boost in suggestions
- [ ] Verify confidence increases by +0.10-0.30 for archetype-matched feats
