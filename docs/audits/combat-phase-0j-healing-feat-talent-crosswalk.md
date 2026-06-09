# SWSE Combat Phase 0J - Healing, Repair, and Resource Crosswalk

Audit-only crosswalk. No runtime code was changed.

This file records feats, talents, species traits, Force powers, gear, and service layers that depend on healing/repair/bonus-HP systems. It is not exhaustive across the whole SWSE rules corpus yet, but it identifies the highest-risk repo-visible dependencies.

## Second Wind dependencies

| Feature | Current evidence | Rules dependency | Audit status |
|---|---|---|---|
| Extra Second Wind | `feat-metadata.json`, `talents.js`, `MetaResourceFeatResolver` references | Additional daily use; Nonheroic can use once/day if it has feat | Promising, but Nonheroic/droid/follower behavior needs fixture tests |
| Tough as Nails | `ActorEngine.applySecondWind()` checks talent by name | Adds to max uses in current code | Present, needs rule-source confirmation later |
| Forceful Recovery | `feat-metadata.json` summary, `MetaResourceFeatResolver`, `ActorEngine.applySecondWind()` pending flag | Regain one Force power on Second Wind | Hook exists as pending flag; needs UI/force-suite completion check |
| Improved Second Wind houserule | `SecondWindRules.calculateConditionRecovery()` and `HouseRuleService` | House rule, not RAW | Correctly houserule-gated conceptually |
| Regenerative Healing | `talent-granted-abilities.json`, `MetaResourceFeatResolver` delayedHealing hook | Replace immediate Second Wind HP with recurring healing | Metadata/hook exists; needs state expiration and recurring tick audit |
| Impetuous Move / movement-on-Second-Wind effects | `ActorEngine.applySecondWind()` options and feat rules | Grants move/movement with reduced/conditional healing | Hook exists, but UI choice context needs audit |
| Aggressive Surge | Scout talent mechanics mention free charge when using Second Wind | Triggered by Second Wind use | Needs event hook from canonical Second Wind result |
| Safe Zone | Talent data says allies in Safe Zone get extra HP on Second Wind | Positional/support context | Likely GM-assisted; needs ally/context picker |
| Equilibrium | Talent data says extra HP when using Second Wind based on Force Points | Add bonus HP/healing to Second Wind | Needs integration with SecondWindRules or resource resolver |
| Battle Meditation ally reaction Second Wind | Talent data says ally at 0 HP can take Second Wind as reaction | Reaction timing + Second Wind cap exception | Needs reaction/support flow; likely GM-assisted |

## Treat Injury / medical dependencies

| Feature | Current evidence | Rules dependency | Audit status |
|---|---|---|---|
| Skill Focus (Treat Injury) | `talents.js` has +5 Treat Injury | Roll bonus | Static skill bonus likely safe, but skill hydration should be separately verified |
| First Aid | `HealingMechanics.performFirstAid()`, combat action data, GM workflow | Full-Round, Medpac, DC 15, level + margin, 24h target cooldown | Partially modeled; gear consumption and workflow unification missing |
| Long-Term Care | `HealingMechanics.performLongTermCare()`, GM workflow flag | 8 hours, +level HP, once/day, max targets by training | Partially modeled; rest integration and trained/untrained target count missing |
| Perform Surgery | `HealingMechanics.performSurgery()`, GM workflow | Trained, Surgery Kit, 1 hour, DC 20, Con bonus x level, remove persistent condition, failure damage | Partially modeled; failure damage and kit/trained gates unsafe |
| Revivify | `HealingMechanics`, GM workflow, combat action data | Trained, Medical Kit, Full-Round, within 1 round, DC 25 | Stubbed; death window/state needs explicit model |
| Treat Poison | combat action data, PoisonEngine | Full-Round, trained, Medical Kit, check vs poison DC, remove poison ill effects | Data exists; executable workflow unclear |
| Treat Disease/Radiation | HealingRules categories and GM status effects | 8 hours, trained, Medical Kit, check vs DC, remove source-specific persistent effects | Needs first-class workflows |
| Critical Care | `HealingMechanics.performCriticalCare()` and GM workflow | One minute, Medpac+Surgery Kit, DC 20, level + margin, -5 per previous attempt, overdose damage | Partially modeled; GM workflow mismatch |
| Wilderness First Aid | `feat-metadata.json`, packs/feats | Survival can substitute for medpac for Treat Injury checks | Needs gear-requirement substitution hook |
| Extra First Aid | talent data | Additional First Aid benefit/cooldown interaction | Needs exact rules source and First Aid cooldown hook |
| Fosh Healing Glands | species data | Counts as Medpac/Medical Kit and can perform trained-only Treat Injury even untrained | Important gear/training override; currently likely metadata-only |
| Medical Secrets | `system.json` compendium and class feature references | Modifies Treat Injury applications | Needs dedicated crosswalk later; likely many sourcebook options |

## Mechanics Repair / Droid recovery dependencies

| Feature | Current evidence | Rules dependency | Audit status |
|---|---|---|---|
| Repair damaged/Disabled Droid | User rule addendum, GM repair workflows | DC 20 Mechanics after 1 hour, restore droid level HP, remove persistent conditions | Not RAW-complete in current stubs |
| Repair object/vehicle | User rule addendum, GM repair workflows | DC 20 Mechanics after 1 hour, restore 1d8 HP, remove persistent conditions | Not RAW-complete in current stubs |
| Repairs on the Fly | talent data | Repair as Standard Action once/day per droid/object/vehicle | Metadata exists; needs repair workflow action-cost override |
| Droid Expert | talent data | Droid repair gains +1 HP per point above DC 20 | Metadata exists; needs repair formula hook |
| Expert Droid Repair | feat metadata | Repair multiple droids simultaneously | Metadata exists; needs multi-target repair workflow |
| Fast Repairs | talent/feat data mentions repair speed | Likely duration reduction | Needs exact rules source and workflow duration hook |
| Biotech Specialist / Biotech Repair | feat/talent data and Treat Injury source | Treat Injury repairs biotech with penalty unless feat/toolkit | Needs target-kind `biotech` support separate from droid/organic |
| Temporary Mending | user source | Full-Round Treat Injury DC 20, +2 CT and 1d8 HP for biotech/living vehicle, later -5 CT and Disabled | Needs encounter-expiring repair packet |
| Vehicle repair while onboard | user source | Apply vehicle CT penalty to Mechanics check if repairing onboard | Needs context checkbox/GM flag |

## Force healing and drain-heal dependencies

| Feature | Current evidence | Rules dependency | Audit status |
|---|---|---|---|
| Vital Transfer | `force-powers.json` has healing DC tiers | Heal HP based on Use the Force result | Data exists, but ForcePowerEffectsEngine healing builder returns no HP mutation |
| Vital Transfer condition tier | `force-powers.json` includes healing + condition at higher tiers | Remove one/all ongoing condition(s) depending on result | Needs source-scoped condition model |
| Healing Boost / Improved Healing Boost | talent data | Increase Vital Transfer healing | Needs Vital Transfer execution hook |
| Dark Healing | `TalentEffectEngine` plan builders | Damage target and heal source | Skeleton exists, but direct HP updates bypass damage/healing packet authority |
| Improved Dark Healing | talent data and plan builder | Half damage/healing on failure | Needs attack/result context and canonical packet model |
| Dark Healing Field | talent data and plan builder | Multi-target drain-heal | Needs multi-target packet and GM-assisted target selection |

## Bonus Hit Point dependencies

| Feature | Current evidence | Rules dependency | Audit status |
|---|---|---|---|
| Bolster Ally | Noble talent mechanics and talent-effect-engine | Grants Bonus HP/temporary HP to ally | Existing mechanics, but stacking/end-of-encounter rules need verification |
| Shoulder to Shoulder | NPC/gear text includes `Shoulder to Shoulder (6 HP)` | Bonus HP style buffer | Needs source mapping if implemented |
| Massassi Duty Bound / species bonus HP | User rule mention, species data possible | Bonus HP temporary pool | Needs species trait crosswalk later |
| Force/talent bonus HP on Recover/Second Wind | feat metadata mentions bonus HP on Recover or Second Wind | Temporary buffer not normal healing | Needs canonical bonus HP field and cleanup |

## Gear stubs needed before full gear implementation

Since the inventory/gear system is currently mostly nominal, future healing implementation should introduce non-invasive stubs first:

1. `GearRequirementResolver.hasRequiredGear(actor, requirement, options)`
   - Returns `yes`, `no`, or `gm-managed`.
   - Supports Medpac, Medical Kit, Surgery Kit, Tool Kit, Biotech Tool Kit.

2. `GearConsumptionService.consumeIfTracked(actor, itemKey, quantity, options)`
   - If gear tracking is enabled and item exists, decrement quantity/uses.
   - If gear tracking is off or gear is nominal, produce a GM reminder instead of blocking.

3. `HealingWorkflowContextBuilder`
   - Adds self-treatment, trained/untrained, target type, gear availability, prior 24h use, action economy, and margin of success.

4. `RepairWorkflowContextBuilder`
   - Adds droid/object/vehicle/biotech target type, Tool Kit availability, self-repair penalty, duration, vehicle CT penalty, and Aid Another support.

These stubs let healing/repair rules become accurate without forcing a complete inventory overhaul first.
