# Core/Web Feat Parity Report

Generated: 2026-06-30T11:39:27.539Z

Scope: Star Wars Saga Edition core rulebook feat families plus Saga Edition Web Enhancement 1: Tech Specialist

## Inputs

- manifestPath: data/feat-source-parity/core-web-feat-parity-manifest.json
- packPath: packs/feats.db
- catalogPath: data/feat-catalog.json
- effectPath: data/feat-effects.json
- prereqAuthorityPath: scripts/data/authority/feat-prerequisite-authority.js
- packDocCount: 401
- catalogDocCount: 401
- combinedNamedDocCount: 802
- uniqueNamedDocCount: 401
- hasFeatEffects: true
- hasPrereqAuthority: true

## Explicit exclusions

- Devastating Attack: Treat as talent/special-action terminology, not a core feat family for Phase 1 feat parity.
- Improved Initiative: Not present as a SWSE core feat in the uploaded source scan or current repo feat catalog; do not require it for Phase 1.

## Summary

- OK: 51
- Warnings: 0
- Errors: 0

## Errors

_None._

## Warnings

_None._

## OK

### Armor Proficiency

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveActorMath
- Presence: found (3)
- Matched docs: Armor Proficiency (heavy); Armor Proficiency (light); Armor Proficiency (medium)
- Scoped choice support: ok (3 scoped/tiered docs; 3 docs mention choice/scope fields)
- Prerequisite support: ok (3 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 3 matched docs contain automation-relevant text)

### Weapon Proficiency

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveRollMath
- Presence: found (5)
- Matched docs: Weapon Proficiency; Weapon Proficiency (Heavy Weapons); Weapon Proficiency (Pistols); Weapon Proficiency (Rifles); Weapon Proficiency (Simple Weapons)
- Scoped choice support: ok (4 scoped/tiered docs; 5 docs mention choice/scope fields)
- Prerequisite support: ok (5 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 5 matched docs contain automation-relevant text)

### Weapon Focus

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveRollMath
- Presence: found (1)
- Matched docs: Weapon Focus
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Skill Focus

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveActorMath
- Presence: found (1)
- Matched docs: Skill Focus
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Skill Training

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveActorMath
- Presence: found (1)
- Matched docs: Skill Training
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Force Training

- Kind: family
- Source: core
- Implementation class: scopedChoice, manualWorkflow
- Presence: found (1)
- Matched docs: Force Training
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)

### Double Attack

- Kind: family
- Source: core
- Implementation class: scopedChoice, activeCombatOption
- Presence: found (1)
- Matched docs: Double Attack
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Triple Attack

- Kind: family
- Source: core
- Implementation class: scopedChoice, activeCombatOption
- Presence: found (1)
- Matched docs: Triple Attack
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Triple Crit

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveRollMath
- Presence: found (1)
- Matched docs: Triple Crit
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Exotic Weapon Proficiency

- Kind: family
- Source: core
- Implementation class: scopedChoice, passiveRollMath
- Presence: found (1)
- Matched docs: Exotic Weapon Proficiency
- Scoped choice support: ok (1 docs mention choice/scope fields)
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Dual Weapon Mastery

- Kind: family
- Source: core
- Implementation class: passiveRollMath
- Presence: found (3)
- Matched docs: Dual Weapon Mastery I; Dual Weapon Mastery II; Dual Weapon Mastery III
- Scoped choice support: ok (3 scoped/tiered docs; 3 docs mention choice/scope fields)
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 3 matched docs contain automation-relevant text)

### Martial Arts

- Kind: family
- Source: core
- Implementation class: passiveActorMath, passiveRollMath
- Presence: found (3)
- Matched docs: Martial Arts I; Martial Arts II; Martial Arts III
- Scoped choice support: ok (3 scoped/tiered docs; 3 docs mention choice/scope fields)
- Effect/action support: candidate found (3 matched docs contain automation-relevant text)

### Bantha Rush

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Bantha Rush
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Burst Fire

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Burst Fire
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Careful Shot

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Careful Shot
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Cleave

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Cleave
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Combat Reflexes

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Combat Reflexes
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Coordinated Attack

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Coordinated Attack
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Crush

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Crush
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Cybernetic Surgery

- Kind: single
- Source: core
- Implementation class: manualWorkflow
- Presence: found (1)
- Matched docs: Cybernetic Surgery

### Deadeye

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Deadeye
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Dodge

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveActorMath
- Presence: found (1)
- Matched docs: Dodge
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Far Shot

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Far Shot
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Force Boon

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Force Boon
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Force Sensitivity

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Force Sensitivity
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Improved Charge

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Improved Charge
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Improved Damage Threshold

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Improved Damage Threshold
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Improved Defenses

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Improved Defenses
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Improved Disarm

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Improved Disarm
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Improved Grapple

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Improved Grapple
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Linguist

- Kind: single
- Source: core
- Implementation class: manualWorkflow
- Presence: found (1)
- Matched docs: Linguist

### Melee Defense

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveActorMath
- Presence: found (1)
- Matched docs: Melee Defense
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Mighty Swing

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Mighty Swing
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Pin

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Pin
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Point Blank Shot

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Point-Blank Shot
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Power Attack

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Power Attack
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Precise Shot

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Precise Shot
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Quick Draw

- Kind: single
- Source: core
- Implementation class: advisory
- Presence: found (1)
- Matched docs: Quick Draw

### Rapid Shot

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Rapid Shot
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Rapid Strike

- Kind: single
- Source: core
- Implementation class: activeCombatOption, passiveRollMath
- Presence: found (1)
- Matched docs: Rapid Strike
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Running Attack

- Kind: single
- Source: core
- Implementation class: advisory
- Presence: found (1)
- Matched docs: Running Attack

### Shake It Off

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Shake It Off
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Sniper

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Sniper
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Starship Designer

- Kind: single
- Source: core
- Implementation class: manualWorkflow
- Presence: found (1)
- Matched docs: Starship Designer

### Strong in the Force

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Strong in the Force
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Toughness

- Kind: single
- Source: core
- Implementation class: passiveActorMath
- Presence: found (1)
- Matched docs: Toughness
- Effect/action support: candidate found (data/feat-effects.json contains this feat/family name; 1 matched docs contain automation-relevant text)

### Trip

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Trip
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Vehicular Combat

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Vehicular Combat
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Weapon Finesse

- Kind: single
- Source: core
- Implementation class: passiveRollMath
- Presence: found (1)
- Matched docs: Weapon Finesse
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Whirlwind Attack

- Kind: single
- Source: core
- Implementation class: activeCombatOption
- Presence: found (1)
- Matched docs: Whirlwind Attack
- Effect/action support: candidate found (1 matched docs contain automation-relevant text)

### Tech Specialist

- Kind: single
- Source: web-enhancement-1
- Implementation class: manualWorkflow
- Presence: found (1)
- Matched docs: Tech Specialist
- Prerequisite support: ok (1 matched docs contain prerequisite-like text; feat-prerequisite-authority.js contains this feat/family name)

## Recommended next actions

1. If packDocCount and catalogDocCount are both zero, stop and repair Phase 0 data source drift before changing feat rules.
2. Fix every missing core/Web Enhancement feat or family before expanding to later sourcebooks, but do not add excluded non-feats just to satisfy a stale checklist.
3. For scoped feats, prefer one canonical family document with explicit choice metadata or clearly linked scoped documents. Do not silently grant every scope.
4. For manualWorkflow feats, surface an explicit sheet/detail-rail warning rather than fake automation.
5. For passive/active feats, make the sheet breakdown use the same calculation path as the final roll or derived stat.

