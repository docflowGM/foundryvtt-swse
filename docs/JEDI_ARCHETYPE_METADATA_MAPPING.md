# Jedi Archetype Metadata Mapping

**Normalized Names** (no merge needed, but renamed for clarity)

---

## Archetype Normalization

| Original | Normalized | Role | Playstyle | Notes |
|----------|-----------|------|-----------|-------|
| Jedi Duelist | **Precision Striker** | Striker | melee | Single-target, crit-focused |
| Jedi Guardian Defender | **Tank Guardian** | Tank | defense | Mitigation, reactions |
| Jedi Force Controller | **Battlefield Controller** | Controller | control | Area denial, forced movement |
| Jedi Dark Side Striker | **Force Burst Striker** | Striker | force | Experimental, damage spike |
| Jedi Sentinel Hybrid | **Sentinel Generalist** | Flex | melee+force | Balanced utility |

---

## PRECISION STRIKER

**Archetype ID**: `precision_striker`
**Primary Role**: Striker (crit-focused, single-target)
**Playstyle**: `melee`
**Attribute Focus**: DEX (3), STR (2), CHA (1)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Block** | precision_striker | melee | 0 | Foundational defensive reaction |
| **Deflect** | precision_striker | defense | 0 | Core Jedi mechanic |
| **Riposte** | precision_striker | melee | 1 | Builds on Block (counter-attack) |
| **Ataru** | precision_striker | melee | 2 | Advanced mobility + combat (lightsaber form) |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Weapon Focus (Lightsabers)** | precision_striker | melee | 0 | Foundational weapon proficiency |
| **Weapon Specialization (Lightsabers)** | precision_striker | melee | 1 | Requires Weapon Focus |
| **Improved Critical (Lightsabers)** | precision_striker | melee | 1 | Requires Weapon Focus; core to archetype |
| **Acrobatic Strike** | precision_striker | melee | 1 | Mobility + attack synergy |

---

## TANK GUARDIAN

**Archetype ID**: `tank_guardian`
**Primary Role**: Tank (mitigation, anchor)
**Playstyle**: `defense`
**Attribute Focus**: CON (3), STR (2), WIS (1)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Improved Block** | tank_guardian | defense | 1 | Requires Block; guardian talent |
| **Improved Deflect** | tank_guardian | defense | 1 | Requires Deflect; guardian talent |
| **Damage Reduction** | tank_guardian | defense | 2 | Advanced mitigation, late-level |
| **Guardian Spirit** | tank_guardian | support | 2 | Group defense buff, advanced |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Toughness** | tank_guardian | defense | 0 | Foundational survivability |
| **Improved Defenses** | tank_guardian | defense | 1 | Enhanced mitigation |
| **Weapon Focus (Lightsabers)** | tank_guardian | melee | 0 | Baseline weapon proficiency |

---

## BATTLEFIELD CONTROLLER

**Archetype ID**: `battlefield_controller`
**Primary Role**: Controller (area denial, crowd control)
**Playstyle**: `control`
**Attribute Focus**: CHA (3), WIS (2)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Force Slam** | battlefield_controller | control | 1 | Area control, intermediate |
| **Force Grip** | battlefield_controller | control | 1 | Forced movement, prerequisite-friendly |
| **Telekinetic Savant** | battlefield_controller | force | 2 | Advanced force control, mastery |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Force Training** | battlefield_controller | force | 0 | Foundational Force access |
| **Skill Focus (Use the Force)** | battlefield_controller | force | 0 | Core skill focus for controllers |

---

## FORCE BURST STRIKER

**Archetype ID**: `force_burst_striker`
**Primary Role**: Striker (glass cannon, nova damage)
**Playstyle**: `force`
**Attribute Focus**: CHA (3), STR (1), DEX (1)
**Status**: **EXPERIMENTAL**

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Force Lightning** | force_burst_striker | force | 1 | Core burst damage, intermediate |
| **Dark Rage** | force_burst_striker | force | 2 | Offensive buff, dark side, advanced |
| **Power of the Dark Side** | force_burst_striker | force | 2 | Damage spike, experimental |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Force Training** | force_burst_striker | force | 0 | Foundational Force access |
| **Strong in the Force** | force_burst_striker | force | 1 | Force affinity boost |
| **Skill Focus (Use the Force)** | force_burst_striker | force | 0 | Core skill focus |

---

## SENTINEL GENERALIST

**Archetype ID**: `sentinel_generalist`
**Primary Role**: Flex (balanced, utility)
**Playstyle**: `skill` (primary), `melee` (secondary), `force` (tertiary)
**Attribute Focus**: DEX (2), CHA (2), INT (1)

### Talents

| Talent | Archetype | Playstyle | Tier | Reasoning |
|--------|-----------|-----------|------|-----------|
| **Skilled Advisor** | sentinel_generalist | skill | 0 | Utility/support talent |
| **Block** | sentinel_generalist | melee | 0 | Foundational defense option |
| **Force Perception** | sentinel_generalist | force | 0 | Awareness/utility force talent |

### Feats

| Feat | Archetype | Playstyle | Tier | Reasoning |
|------|-----------|-----------|------|-----------|
| **Skill Focus (Use the Force)** | sentinel_generalist | force | 0 | Foundational Force skill |
| **Weapon Focus (Lightsabers)** | sentinel_generalist | melee | 0 | Combat competence |
| **Force Training** | sentinel_generalist | force | 0 | Balanced Force access |

---

## MULTI-ARCHETYPE FEATS

These feats appear in multiple Jedi archetypes. Assign primary, with additional archetypes optional:

| Feat | Primary Archetype | Secondary Archetypes | Playstyle | Tier |
|------|-------------------|----------------------|-----------|------|
| **Weapon Focus (Lightsabers)** | precision_striker | tank_guardian, sentinel_generalist | melee | 0 |
| **Force Training** | battlefield_controller | force_burst_striker, sentinel_generalist | force | 0 |
| **Skill Focus (Use the Force)** | battlefield_controller | force_burst_striker, sentinel_generalist | force | 0 |
| **Block** | tank_guardian | precision_striker, sentinel_generalist | defense | 0 |

---

## POPULATION CHECKLIST

### Precision Striker (4 talents, 4 feats = 8 items)
- [ ] Block → archetype: precision_striker, playstyle: melee, tier: 0
- [ ] Deflect → archetype: precision_striker, playstyle: defense, tier: 0
- [ ] Riposte → archetype: precision_striker, playstyle: melee, tier: 1
- [ ] Ataru → archetype: precision_striker, playstyle: melee, tier: 2
- [ ] Weapon Focus (Lightsabers) → archetype: precision_striker, playstyle: melee, tier: 0
- [ ] Weapon Specialization (Lightsabers) → archetype: precision_striker, playstyle: melee, tier: 1
- [ ] Improved Critical (Lightsabers) → archetype: precision_striker, playstyle: melee, tier: 1
- [ ] Acrobatic Strike → archetype: precision_striker, playstyle: melee, tier: 1

### Tank Guardian (4 talents, 3 feats = 7 items)
- [ ] Improved Block → archetype: tank_guardian, playstyle: defense, tier: 1
- [ ] Improved Deflect → archetype: tank_guardian, playstyle: defense, tier: 1
- [ ] Damage Reduction → archetype: tank_guardian, playstyle: defense, tier: 2
- [ ] Guardian Spirit → archetype: tank_guardian, playstyle: support, tier: 2
- [ ] Toughness → archetype: tank_guardian, playstyle: defense, tier: 0
- [ ] Improved Defenses → archetype: tank_guardian, playstyle: defense, tier: 1
- [ ] (Weapon Focus shared with precision_striker)

### Battlefield Controller (3 talents, 2 feats = 5 items)
- [ ] Force Slam → archetype: battlefield_controller, playstyle: control, tier: 1
- [ ] Force Grip → archetype: battlefield_controller, playstyle: control, tier: 1
- [ ] Telekinetic Savant → archetype: battlefield_controller, playstyle: force, tier: 2
- [ ] Force Training → archetype: battlefield_controller, playstyle: force, tier: 0 (shared)
- [ ] Skill Focus (Use the Force) → archetype: battlefield_controller, playstyle: force, tier: 0 (shared)

### Force Burst Striker (3 talents, 3 feats = 6 items)
- [ ] Force Lightning → archetype: force_burst_striker, playstyle: force, tier: 1
- [ ] Dark Rage → archetype: force_burst_striker, playstyle: force, tier: 2
- [ ] Power of the Dark Side → archetype: force_burst_striker, playstyle: force, tier: 2
- [ ] (Force Training shared)
- [ ] Strong in the Force → archetype: force_burst_striker, playstyle: force, tier: 1
- [ ] (Skill Focus shared)

### Sentinel Generalist (3 talents, 3 feats = 6 items)
- [ ] Skilled Advisor → archetype: sentinel_generalist, playstyle: skill, tier: 0
- [ ] (Block shared with tank_guardian)
- [ ] Force Perception → archetype: sentinel_generalist, playstyle: force, tier: 0
- [ ] (Skill Focus shared)
- [ ] (Weapon Focus shared)
- [ ] (Force Training shared)

**Unique Items**: 26 (8 + 7 + 5 + 6 + 6 - shared items)
**Estimated Time**: 30-45 minutes manual tagging

---

## VALIDATION CHECKLIST

After population:

- [ ] All talents tagged with archetype
- [ ] All feats tagged with archetype
- [ ] All playstyles valid enum (melee, ranged, force, support, control, defense, skill, utility)
- [ ] All tiers 0-3
- [ ] Run `ArchetypeMetadataEngine.validateMetadata()` on each item
- [ ] Test in dev world: Jedi character gets archetype boost in suggestions
- [ ] Verify confidence increases by +0.10-0.30 for archetype-matched feats

---

## NAMING REFERENCE

For future archetype definitions, use this pattern:

**[Class] [Role/Function]**
- ❌ Avoid: "Jedi Duelist", "Jedi Guardian Defender"
- ✅ Use: "Precision Striker", "Tank Guardian"
- ✅ Clear role (Striker, Tank, Controller, Flex)
- ✅ Mechanical identity (Precision, Burst, Guardian, Generalist)
- ✅ No redundant class prefix
