# SWSE Combat Phase 0L - Automation Boundary Report

Audit-only phase. No runtime files were changed.

## Purpose

Phase 0L consolidates Phase 0A through 0K into a practical automation boundary for the next implementation work. The goal is to prevent the combat system from drifting into full tactical-map automation while still making the sheet a reliable tabletop assistant.

The guiding rule is:

- Automate sheet-owned math, resource accounting, action economy, roll context, and temporary actor states.
- Assist with GM-adjudicated actions by rolling, explaining, and preserving context.
- Do not automate tactical table calls such as exact areas, line of sight, cover from terrain, movement path legality, or which creatures are inside an area when the GM is not using the map.

## Boundary classes

### Automate

The system should fully calculate and apply these when the source data and target are known:

- Attack total math.
- Damage total math.
- Half heroic level to damage.
- Range penalties when the player selects a range band.
- Proficiency penalties when weapon proficiency is known.
- Condition track penalties.
- Action economy spending.
- Second Wind healing value and usage limits.
- Fight Defensively and Total Defense defense bonuses once activated.
- Acrobatics-trained Fight Defensively and Total Defense bonus upgrades.
- Burst Fire attack penalty, damage dice, ammo cost, and non-stacking damage-option exclusion.
- Autofire attack penalty and ammo cost when ammo tracking is enabled.
- Stun and Ion damage packet semantics once target category is known.
- Natural 1 automatic miss and natural 20 automatic hit.
- Meets-beats comparisons for attacks, DCs, and opposed checks where RAW says attacker succeeds on a tie.
- Ammo decrement and reload visibility when ammo tracking is enabled.
- Suppressing all ammo UI and ammo gates when ammo tracking is disabled.

### Assist

The system should provide a button, dialog, roll, chat card, state candidate, or apply button, but the GM may make the final call:

- Aid Another application to an ally.
- Firing into melee penalty checkbox.
- Elusive Target reminder/checkbox.
- Charge legality and movement path.
- Disarm result and object placement.
- Grapple state application and maintenance.
- Ready action trigger.
- Feint target consequence.
- Create Diversion to Hide.
- Tumble through threatened squares.
- Treat Injury outcomes that consume nominal or future gear.
- Repair outcomes for droids, devices, and vehicles.
- Fire and Acid recurring hazard application.
- Force/Yuuzhan Vong immunity where target traits are incomplete.

### GM managed

The system should present rules text, reminders, and optional notes only. It should not enforce these unless a future map/tactical mode explicitly opts in:

- Exact Autofire 2x2 area placement.
- Which targets are inside an area attack.
- Line of sight.
- Cover from terrain.
- Whether a target is actually adjacent to allies for firing into melee.
- Whether a movement path is straight and legal for Charge.
- Whether a target is helpless for Coup de Grace.
- Environmental extinguishing or neutralizing Acid/Fire.
- Any rule whose legality depends mainly on table positioning not represented by the sheet.

## System area boundary decisions

### Combat actions

Combat action cards should not all be executable. Each card needs a routing contract:

- attack
- fullAttack
- aidAnother
- skillCheck
- combatState
- damage
- healRepair
- manual
- reference

Reference/manual cards should never look like broken executable buttons. They should produce a rule card or note, not a failed roll.

### Attack options

Attack options are mostly automation candidates, but only through a clean context builder. The system should not infer complex positional truth. It should ask the player/GM through checkboxes or small dialogs.

Examples:

- Firing into melee: checkbox, applies -5 unless Precise Shot suppresses it.
- Elusive Target: optional GM adjudicated checkbox/reminder, because the system cannot reliably know melee engagement.
- Charge: checkbox/action context, not map path enforcement.
- Disarm: maneuver context, but GM handles item result.
- Autofire: attack roll and ammo accounting automated; area targets GM managed.

### Damage

Damage needs a packet model. Until that exists, many later fixes will be fragile.

The model should preserve:

- base damage formula
- bonus damage formula
- damage type
- damage tags
- attack mode
- area attack flag
- half damage on miss flag
- crit behavior
- canBeDeflected
- countsAsEnergy
- hp multiplier
- threshold damage source
- target category gates
- non-stacking riders

This is required for Stun, Ion, Sonic, Autofire, Burst Fire, Evasion, Fire, Acid, and Force immunity.

### Healing and repair

Healing should not be treated as negative damage unless a specific future engine explicitly supports that packet type. HP restoration, Bonus HP, condition removal, Persistent Condition removal, and repair are distinct operations.

Organic healing, droid repair, vehicle repair, and biotech repair need separate packets:

- healHp
- grantBonusHp
- removePersistentCondition
- improveConditionTrack
- repairHp
- revivify
- detoxify
- cureDisease
- cureRadiation

### Gear

Gear is currently nominal, so Phase 1-3 should not hard-block on complete gear accounting. However, gear stubs should be planned for:

- Medpac
- Medical Kit
- Surgery Kit
- Tool Kit
- Biotech Tool Kit
- ammo cells/power packs

Early implementation can be GM-assisted: consume action economy and show gear requirement/reminder, but do not block if gear accounting is not enabled.

### NPC and follower compatibility

NPC/follower sheets should reuse the same action routing and packet outputs, but with lighter UI. Do not create a parallel NPC-only combat system.

## Hard implementation guardrails

1. Do not build a map dependency into core combat actions.
2. Do not create a second damage roller for special damage.
3. Do not create a second action economy engine.
4. Do not create a second grapple state engine; fix or consolidate the existing one.
5. Do not make ammo UI visible when ammo counting is disabled.
6. Do not make Burst Fire an area attack.
7. Do not make Evasion interact with Burst Fire.
8. Do not let chat damage buttons lose attack context.
9. Do not let reference/manual actions masquerade as executable actions.
10. Do not make droids benefit from organic rest healing.

## Readiness conclusion

The system is ready to start implementation, but only if the first implementation phase is foundational. Jumping straight to individual features will create more parallel logic.

Recommended next implementation start:

1. Action Routing Contract.
2. Attack Context Builder.
3. Damage/State Packet Preservation.
4. Action Economy correction/hardening.
5. Then implement combat options in clusters.
