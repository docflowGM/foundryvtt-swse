# Combat Phase 0K - Context Contract Recommendations

Audit-only recommendations; no runtime changes in this phase.

## Implementation posture

Do not implement combat feats/talents one by one until the runtime can carry normalized context. The metadata already encodes many rules, but call paths routinely lose the predicates needed to activate them.

## Recommended sequence after Phase 0

1. **Action Routing Contract:** preserve `resolutionMode`, `executable`, `manualResolution`, `ruleData`, `requiredContext`, `spendAction`, and `automationBoundary` from action data to UI.
2. **Attack Context Builder:** convert UI selections and actor states into canonical booleans/fields: `aim`, `charge`, `maneuver`, `firingIntoMelee`, `areaAttack`, `attackMode`, `ammoCost`.
3. **Full Attack Gateway:** route Full Attack, Double/Triple Attack, Dual Weapon Fighting, and Multiattack Proficiency through one executor.
4. **Area/Burst/Ammo Packet:** separate Autofire area behavior from Burst Fire single-target behavior. Preserve ammo, hit/miss, Evasion, and damage-packet details to the damage button.
5. **Combat State Persistence:** store short-duration states once and have attacks, defenses, summary, and combat tab read the same state.
6. **Damage Packet Model:** represent Stun, Ion, Sonic, Fire, Acid, mixed damage, bonus dice, and deflectability as packets instead of one damage label.
7. **Healing/Repair Packet Model:** represent organic healing, droid repair, object/vehicle repair, bonus HP, gear requirements, and once-per-day limits separately.

## Manual / GM-managed boundaries confirmed

- Autofire target area and affected tokens: GM-managed.
- Cover/LoS/path legality: GM-managed unless explicitly toggled.
- Elusive Target: GM-adjudicated/manual checkbox/reminder.
- Grapple positioning and unusual body/size/limb edge cases: GM-assisted.
- Cybernetic/electronic target classification for Ion: automate only when target data is explicit; otherwise GM-assisted.
- Gear/source consumption for medpacs/tool kits until gear implementation exists: stub or GM-assisted.

## Strongest existing authorities to reuse

- `CombatOptionResolver` for explicit attack options.
- `multi-attack.js` / `full-attack-executor.js` for full attack sequencing.
- `SecondWindRules` for Second Wind calculation.
- `damage-resolution-engine.js` / `threshold-engine.js` for future special-damage expansion after packet preservation is solved.
- `reaction-registry.js` for Block/Deflect-style reaction hooks once attack snapshots preserve damage-packet/deflectability context.
