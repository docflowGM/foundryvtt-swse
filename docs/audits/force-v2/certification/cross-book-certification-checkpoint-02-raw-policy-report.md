# SWSE Force V2 — Checkpoint 02B: Twelve Rules/Policy Owners (RAW-first)

**Date:** 2026-11-18  
**Repository:** `docflowGM/foundryvtt-swse`  
**Branch:** `audit/force-v2-seven-book-packages-v2-9-20261117`  
**Baseline:** `462261879bd25eea776e0b73e83982019c40e273` (Checkpoint 02 identity crosswalk)  
**Deliverable:** `cross-book-certification-checkpoint-02-raw-policy-owners.json` — 12 policy entries, 45 proposed regression assertions.  
**Disposition:** **12/12 policy ownership routes documented; 0/12 Foundry runtime certifications; implementation-ready = NO.**

## Governing rule of evidence

For every policy, the printed SWSE rule and **official errata** define what is legal. The original printed Core p.96 omits [telekinetic] and the published Core errata adds that descriptor and its cover/concealment interactions. The printed SotG p.25 calls Corellian Slip's follow-up attack a swift action, but published *Starships of the Galaxy Errata 1.0* corrects it to a free action. That same errata adds fighter-group restrictions beyond p.31. DJVU text was used to locate page passages; scans of the corresponding uploaded printed PDF pages were visually inspected. A bookwise graph operation is a proposal until it matches that printed/errata authority.

**Core errata:** <https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf> (October 2008, p.96 descriptor and Battle Strike text).  
**Starships errata:** *Starships of the Galaxy Errata 1.0* (January 2008), archived at <https://www.theberserker.net/berserker/sw/rule_books/SW_Saga_Starships_of_the_Galaxy.pdf> and corroborated by published transcriptions; original Wizards hosting was not independently retrieved in this pass.

## Summary

| Measure | Count |
|---|---:|
| Graph external rules/policies audited | **12 / 12** |
| Rules with explicit canonical owner boundaries recorded | **12 / 12** |
| Proposed source-grounded regression assertions | **45** |
| Executed Foundry v13 runtime assertions | **0** |
| Records added to live feat/talent/equipment/Force catalogs | **0** |
| Historical influence-graph edges changed | **0** |

This is a **policy ownership / source certification pass**, not a claim that a complete maneuver engine or full Force Power effects engine exists today. When an owner is marked, it is the existing service that should own the rule, not necessarily a service that currently implements it correctly. Do not create a new policy Item, modifier engine, or compatibility layer.

### The twelve policies

| # | Graph ID | Printed source | Owner / execution status |
|---:|---|---|---|
| 01 | `core/rule/telekinetic-descriptor` | Core Rulebook p.96 | existing authorities require typed convergence |
| 02 | `core/rule/move-light-object-projectile` | Core Rulebook p.77 | existing skill handler verified incorrect |
| 03 | `sotg/rule/one-active-attack-pattern` | Starships of the Galaxy p.24 | authorities identified effect state missing |
| 04 | `sotg/rule/fighter-group` | Starships of the Galaxy p.31 | vehicle domain owner assigned fighter group operation not located |
| 05 | `sotg/rule/target-sense-battle-strike` | Starships of the Galaxy p.30 | compose existing services no execution certification |
| 06 | `sotg/rule/corellian-slip-errata` | Starships of the Galaxy p.25 | event execution not certified |
| 07 | `sotg/rule/pilot-nat20` | Starships of the Galaxy p.24 | event owner assigned auto recovery not evidenced |
| 08 | `sotg/rule/fp-recovery` | Starships of the Galaxy p.24 | fp policy boundary conflict requires explicit reaction |
| 09 | `sotg/rule/rest-recovery` | Starships of the Galaxy p.24 | verified active premature recovery defect |
| 10 | `kotor/rule/kotor-size-adjusted-fortitude` | Knights of the Old Republic Campaign Guide p.50, 51, 52 | target defense gate not certified |
| 11 | `kotor/rule/energy-resistance-continuation` | Knights of the Old Republic Campaign Guide p.50, 51, 52 | lifecycle missing and resist force effect defect |
| 12 | `fucg/rule/temptation-of-dark-side` | Force Unleashed Campaign Guide p.85 | graph omits optional power mode runtime not certified |

## Mandatory code corrections or design gaps

### P0 — Five cross-cutting blockers

**1. Core p.77 — Move Light Object hit gate is currently incorrect.**  
`scripts/skills/skill-uses.js:2819-2883` checks DC 15 but does not compare the resulting Use the Force check to the target's Reflex Defense. Damage is a rolled **1d6**, while the returned text treats the rolled total as if it were a number of d6 dice. Printed Core p.77 distinguishes DC 10 move action from DC 15 standard-action projectile. The influence graph additionally labels all projectile uses as ranged attacks for feats/talents, but the printed rule alone does not support applying *every* ranged-attack interaction. Keep that global classification on interpretive hold.

**2. SotG p.24 — active hook restores maneuvers too early.**  
`scripts/infrastructure/hooks/starship-maneuver-hooks.js:91-114` recovers all spent maneuver Items on `deleteCombat`. `scripts/infrastructure/hooks/actor-hooks.js:174` initializes it. The printed recovery condition is encounter finished **plus one minute of rest**, which deleting a combat encounter does not prove. Replace the current trigger with a documented rest completion receipt; preserve GM/manual administrative resets separately.

**3. KOTOR p.51 — Resist Force scope is wrong in the present effect builder.**  
`scripts/engine/force/force-power-effects-engine.js:372-393` calls `_buildAllDefensesIntentEffects()`. Printed KOTOR *Resist Force* grants its rolled bonus against Force powers to **one chosen defense**; spending its Force Point option permits **two chosen defenses**, not all three. Separate the typed choice and spent-FP receipt, and verify it is constrained to incoming Force powers.

**4. SotG p.24 — one-maneuver FP recovery is a printed reaction, not generic off-turn spending.**  
`scripts/engine/force/force-points-service.js:302-366` and registered runtime patch `scripts/engine/feats/force-point-service-runtime-patches.js` reject any off-turn or reaction spend unless Force Readiness or another rule is detected. SotG p.24 is itself an explicit reaction permission; a typed source exception is required. `StarshipManeuversEngine.regainManeuver` merely flips `system.spent` and provides no FP atomic debit. The roll-only FP-bonus coordinator must not be used for non-roll spending without its own explicit contract.

**5. FUCG p.85 — the graph omits half the optional Temptation rule.**  
One FP can temporarily add a **[dark side] Force Power** as a free action, which then disappears upon use or encounter end and is explicitly **unrecoverable**. A *separate* option allows temporary Dark Side / Dark Side Devotee / Sith talents; valid prerequisite chains may use temporarily acquired talents, and at encounter end the user gains one DSP per FP spent on this **talent route**. The existing `fucg/rule/temptation-of-dark-side` edge only covers the latter. The `darkSideTemptation: strict/lenient/narrative` existing setting is not automatically the optional published rules toggle. Preserve the 178-edge historical graph and track this as a supplemental missing interaction, not a revision made by hand to the archive.

### Other high-value boundaries

- **Core telekinetic (official errata p.96):** `ForceExecutor._isTelekineticPower` currently uses a loose name/effect regex. Exact source descriptors, not substring heuristics, must drive the cross-book cover/concealment policy.
- **SotG fighter groups (p.31 + errata):** The current graph captures common knowledge and shared-use conditions but omits lost round/readied actions on joining and once-per-round group leader changes. Do not mistake `EnhancedPilot.pilotManeuver` (an optional per-round flying mode) for a published [attack pattern].
- **SotG p.24 maneuver recovery:** Pilot natural 20 must be an activation roll and recovers all **at end of turn**. The same character's other Pilot rolls, gunner attack rolls and Target Sense's **Use the Force** check do not trigger it.
- **SotG p.30 Target Sense:** Use the Force activation replaces the ship's Intelligence attack bonus with the pilot's Charisma bonus. At DC 25/30 it grants +2/+5 **maneuver** attack bonuses; these stack with a separately valid Battle Strike **Force** attack bonus, but not by double-counting vehicle Intelligence.
- **SotG p.25 Corellian Slip errata:** Follow-up attack is a **free** action, while the whole maneuver remains full-round. Failure and collision rules must also survive.
- **KOTOR pp.50–52:** Size-adjusted Fortitude affects only Force Scream, Force Whirlwind, Slow, and Wound as printed; not all Force powers. Maintain actions and on-damage DC 15 + damage concentration are **per active instance**; Whirlwind differs by requiring a move action and a fresh UTF check each round, and can end early when the target is attacked/damaged/condition-moved by the caster or allies.

### Separate acquisition convergence issue surfaced

Modern `scripts/apps/progression-framework/steps/starship-maneuver-step.js` correctly models repeated maneuver selections as counts. Older `scripts/utils/starship-maneuver-manager.js:23-36` excludes already learned maneuver names; `scripts/engine/progression/engine/maneuver-authority-engine.js:153-183` rejects repeated IDs. Starships p.24 explicitly allows multiple copies of the same maneuver. This is the maneuver equivalent of the Force Power duplicate-copy conflict and must be call-graph audited before it is retired or rewired.

## Individual source and owner contracts

### P01 — `core/rule/telekinetic-descriptor`

**Primary RAW:** Saga Edition Core Rulebook, printed p.96 (PDF file page 97); OFFICIAL_CORE_ERRATA_OCT_2008. Official errata evidence: <https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf>.

**Source contract:** Official Core errata introduces [telekinetic] descriptor, cover bonus to target Defense or opposed check, concealment penalty to Use the Force unless Sense Surroundings was used this turn, and enumerates five Core Powers to receive the descriptor.

**SSOT ownership:** **registry:** `scripts/engine/registries/force-registry.js`; **roll:** `scripts/engine/force/force-executor.js`; **defense:** `scripts/engine/combat/attack-domain-router.js`; **mutator:** `scripts/governance/actor-engine/actor-engine.js`.

**Classification:** `EXISTING_AUTHORITIES_REQUIRE_TYPED_CONVERGENCE`. **Runtime certified:** NO.

**Verified findings / gates:**
- Printed original Core p96 lacks this paragraph; only official errata establishes it.
- ForceExecutor._isTelekineticPower at lines 1233-1247 infers status by name and free-text regex rather than strict descriptor.
- No cover/concealment/Sense Surroundings modifier is applied in the inspected ForceExecutor activation path.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P01-T1` — A [telekinetic] Power receives target cover to its relevant Defense/opposed check using actual geometry.
- `CP02B-P01-T2` — Concealment penalizes its UTF activation check unless Sense Surroundings used during this turn.
- `CP02B-P01-T3` — An otherwise similar Power lacking [telekinetic] is unaffected.
- `CP02B-P01-T4` — Core corrected five descriptors and all later books use canonical tags, not substring name heuristics.

### P02 — `core/rule/move-light-object-projectile`

**Primary RAW:** Saga Edition Core Rulebook, printed p.77 (PDF file page 78); PRINTED_CORE.

**Source contract:** Trained Use the Force application moves <=5 kg object 6 squares with DC 10 move action; using object as a projectile requires standard action and DC 15, and the UTF result must beat target Reflex Defense; a hit deals 1d6 bludgeoning damage.

**SSOT ownership:** **skill:** `scripts/skills/skill-uses.js`; **roll:** `scripts/engine/rolls/swse-roll-engine.js`; **damage:** `scripts/engine/combat/damage-engine.js`.

**Classification:** `EXISTING_SKILL_HANDLER_VERIFIED_INCORRECT`. **Runtime certified:** NO.

**Verified findings / gates:**
- UseTheForceUses.moveLightObject lines 2819-2883 only checks DC15 and does not compare against target Reflex.
- It rolls 1d6 but emits the rolled result as a count of d6 dice in the returned damage field.
- The graph's broad 'ranged-attack-for-feat-talent-interactions' categorization is not explicitly established by printed p77 and must not be propagated indiscriminately.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P02-T1` — Untrained actor rejected; ordinary movement DC10/5kg/6sq and move action.
- `CP02B-P02-T2` — Projectile consumes a standard action and requires both fixed DC and target Reflex comparison.
- `CP02B-P02-T3` — Successful projectile deals exactly 1d6 bludgeoning, never 1d6 multiplied by rolled result.
- `CP02B-P02-T4` — Equality boundary and applicability of individual ranged-attack feats are source-adjudicated before broad automation.

### P03 — `sotg/rule/one-active-attack-pattern`

**Primary RAW:** Starships of the Galaxy, printed p.24 (PDF file page 25); PRINTED_SOTG.

**Source contract:** An activated [attack pattern] lasts through encounter; only one may benefit actor at any moment; new pattern replaces effects of old, without recovering spent maneuver copy.

**SSOT ownership:** **state:** `scripts/engine/StarshipManeuversEngine.js`; **turn:** `scripts/engine/combat/starship/vehicle-turn-controller.js`; **pilot:** `scripts/engine/combat/starship/enhanced-pilot.js`.

**Classification:** `AUTHORITIES_IDENTIFIED_EFFECT_STATE_MISSING`. **Runtime certified:** NO.

**Verified findings / gates:**
- Vehicle sheet and StarshipManeuversEngine only toggle system.spent and don't enforce active pattern exclusivity or application duration.
- EnhancedPilot.pilotManeuver is a separate optional per-round pilot-control mode and must not be conflated with published [attack pattern] suite state.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P03-T1` — One pattern active with effect until encounter end.
- `CP02B-P03-T2` — Activating a second replaces former effects and former instance remains spent.
- `CP02B-P03-T3` — An attack pattern's own printed termination/action provisions still apply.

### P04 — `sotg/rule/fighter-group`

**Primary RAW:** Starships of the Galaxy, printed p.31 (PDF file page 32); PRINTED_SOTG_PLUS_OFFICIAL_ERRATA_1_0. Official errata evidence: <https://www.theberserker.net/berserker/sw/rule_books/SW_Saga_Starships_of_the_Galaxy.pdf>.

**Source contract:** Printed group composition 2-6 starfighters/airspeeders, trained Pilot join, same-size willing allies, shared square/group initiative, leader controls and group mechanics. Official errata adds join ends round actions, leader change at most once per group turn, every member knowing and using maneuver, and active individual attack pattern ending on join.

**SSOT ownership:** **encounter:** `scripts/engine/combat/starship/vehicle-turn-controller.js`; **vehicle:** `scripts/engine/combat/subsystems/vehicle/index.js`; **maneuver:** `scripts/engine/StarshipManeuversEngine.js`.

**Classification:** `VEHICLE_DOMAIN_OWNER_ASSIGNED_FIGHTER_GROUP_OPERATION_NOT_LOCATED`. **Runtime certified:** NO.

**Verified findings / gates:**
- Graph operation covers all-members-know/use and prior pattern termination but omits errata join-action loss and leader change frequency.
- No fighter-group runtime class or group-action contract was located in inspected vehicle/maneuver entrypoints; do not invent an Item.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P04-T1` — Group membership allowed only for 2-6 same-size allied willing vehicles with trained joining pilot.
- `CP02B-P04-T2` — Joining consumes remaining actions/readied actions.
- `CP02B-P04-T3` — Group leader change at most once per group turn.
- `CP02B-P04-T4` — Everyone must know shared maneuver and everyone spends a use.
- `CP02B-P04-T5` — Individual attack pattern ends upon joining; group stats and leader initiative follow p31.

### P05 — `sotg/rule/target-sense-battle-strike`

**Primary RAW:** Starships of the Galaxy, printed p.30 (PDF file page 31); PRINTED_SOTG_PLUS_CORE_BATTLE_STRIKE_ERRATA. Official errata evidence: <https://www.swse.xphilesrealm.com/Errata/SWRGP-Errata.pdf>.

**Source contract:** Target Sense [Force] is Swift action, uses an actual Use the Force check, substitutes attacker's Charisma modifier for ship Intelligence bonus for attack rolls until start next turn; DC25/30 adds +2/+5 maneuver bonus; those bonuses expressly stack with Battle Strike Force Power's Force bonus within overlapping duration.

**SSOT ownership:** **maneuver:** `scripts/engine/StarshipManeuversEngine.js`; **attack:** `scripts/engine/combat/vehicle-attack-math.js`; **force:** `scripts/engine/force/force-executor.js`.

**Classification:** `COMPOSE_EXISTING_SERVICES_NO_EXECUTION_CERTIFICATION`. **Runtime certified:** NO.

**Verified findings / gates:**
- Existing graph preserves different bonus types but must also represent Intelligence->Charisma substitution, not additive Charisma.
- Actual UTF activation is not Pilot roll and must not trigger Pilot-natural-20 maneuver recovery.
- Core Battle Strike +1 Force attack benefit uses errata's timing, not stale Core printing.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P05-T1` — Target Sense uses UTF and requires eligible Force maneuver access.
- `CP02B-P05-T2` — DC20 Cha replaces vehicle Int with no double count; DC25/30 adds only maneuver +2/+5.
- `CP02B-P05-T3` — Battle Strike stacks when separately and legally active; no stacking after either duration expires.
- `CP02B-P05-T4` — Target Sense natural 20 UTF does not trigger Pilot-natural-20 maneuver recovery.

### P06 — `sotg/rule/corellian-slip-errata`

**Primary RAW:** Starships of the Galaxy, printed p.25 (PDF file page 26); OFFICIAL_SOTG_ERRATA_1_0. Official errata evidence: <https://www.theberserker.net/berserker/sw/rule_books/SW_Saga_Starships_of_the_Galaxy.pdf>.

**Source contract:** Corellian Slip remains full-round maneuver; official errata changes its follow-up attack on entering target square to a FREE action rather than printed swift. Failed activation may cause collision under printed special rule; it does not grant an attack.

**SSOT ownership:** **turn:** `scripts/engine/combat/starship/vehicle-turn-controller.js`; **attack:** `scripts/engine/combat/attack-domain-router.js`; **maneuver:** `scripts/engine/StarshipManeuversEngine.js`.

**Classification:** `EVENT_EXECUTION_NOT_CERTIFIED`. **Runtime certified:** NO.

**Verified findings / gates:**
- Graph corrects free action but does not specify printed failed-activation and collision consequences.
- Vehicle maneuver sheet marks item spent but does not resolve Corellian Slip movement/attack/collision.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P06-T1` — Successful Slip moves straight up to twice speed, attacks as free action, no extra swift cost.
- `CP02B-P06-T2` — Failure before target square makes activation fail; unsuccessful activation with entry follows printed collision clause.
- `CP02B-P06-T3` — Correct DC15-35 tiers, no extra attack on failure.

### P07 — `sotg/rule/pilot-nat20`

**Primary RAW:** Starships of the Galaxy, printed p.24 (PDF file page 25); PRINTED_SOTG.

**Source contract:** A natural 20 on Pilot check TO ACTIVATE a starship maneuver restores all spent maneuver copies at the end of character's turn, not immediately and not for other Pilot uses.

**SSOT ownership:** **roll:** `scripts/engine/rolls/swse-roll-engine.js`; **turn:** `scripts/engine/combat/starship/vehicle-turn-controller.js`; **suite:** `scripts/engine/StarshipManeuversEngine.js`.

**Classification:** `EVENT_OWNER_ASSIGNED_AUTO_RECOVERY_NOT_EVIDENCED`. **Runtime certified:** NO.

**Verified findings / gates:**
- StarshipManeuversEngine contains per-item use/regain toggles only.
- StarshipManeuverHooks deleteCombat handler is not the natural-20 end-of-turn rule.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P07-T1` — True natural20 on activation Pilot queues recover-all at own end of turn.
- `CP02B-P07-T2` — Pilot checks for other purposes, UTF Target Sense, weapon attacks, and Take10 do not trigger.
- `CP02B-P07-T3` — Only spent existing suite instances are refreshed.

### P08 — `sotg/rule/fp-recovery`

**Primary RAW:** Starships of the Galaxy, printed p.24 (PDF file page 25); PRINTED_SOTG.

**Source contract:** Spend one Force Point as reaction to recover exactly one already-spent starship maneuver immediately.

**SSOT ownership:** **validation:** `scripts/engine/force/force-points-service.js`; **mutator:** `scripts/governance/actor-engine/actor-engine.js`; **suite:** `scripts/engine/StarshipManeuversEngine.js`.

**Classification:** `FP_POLICY_BOUNDARY_CONFLICT_REQUIRES_EXPLICIT_REACTION`. **Runtime certified:** NO.

**Verified findings / gates:**
- ForcePointsService.validateSpend and force-point-service-runtime-patches reject off-turn/reaction spending unless Force Readiness or generic permission, despite this printed reaction authorization.
- StarshipManeuversEngine.regainManeuver toggles spent without any FP receipt.
- Roll-only ForcePointSpendCoordinator cannot simply be reused for a non-roll recovery.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P08-T1` — Valid reaction spends exactly one FP and unspends exactly one selected maneuver copy.
- `CP02B-P08-T2` — Explicit SotG reaction exception works without requiring unrelated feat.
- `CP02B-P08-T3` — Ineligible/no spent choice fails without spending; no duplicate grant or race/double spend.
- `CP02B-P08-T4` — Other generic FP-spend restrictions continue applying where RAW requires.

### P09 — `sotg/rule/rest-recovery`

**Primary RAW:** Starships of the Galaxy, printed p.24 (PDF file page 25); PRINTED_SOTG.

**Source contract:** Regain all spent starship maneuver uses only once battle is over AND character has an opportunity to rest for one minute.

**SSOT ownership:** **hook:** `scripts/infrastructure/hooks/starship-maneuver-hooks.js`; **suite:** `scripts/engine/StarshipManeuversEngine.js`; **mutation:** `scripts/governance/actor-engine/actor-engine.js`.

**Classification:** `VERIFIED_ACTIVE_PREMATURE_RECOVERY_DEFECT`. **Runtime certified:** NO.

**Verified findings / gates:**
- Active initialized deleteCombat hook in starship-maneuver-hooks.js lines 91-114 unconditionally restores all actor-owned spent maneuvers when combat deletes.
- ActorHooks.initialize registers this hook; elapsed minute/rest opportunity is never verified.
- Vehicle-owned/crew-linked maneuver ownership across vehicle actor may be incomplete in this handler.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P09-T1` — Deleting combat without one-minute rest does NOT recover suite.
- `CP02B-P09-T2` — Confirmed battle conclusion + opportunity for full minute restores all eligible individual spent copies.
- `CP02B-P09-T3` — Correct actor/crew ownership, no phantom recovery, repeated rest idempotent.

### P10 — `kotor/rule/kotor-size-adjusted-fortitude`

**Primary RAW:** Knights of the Old Republic Campaign Guide, printed p.50, 51, 52 (PDF file pages 51, 52, 53); PRINTED_KOTOR.

**Source contract:** Force Scream, Force Whirlwind, Slow, Wound each add target size modifier to Fortitude: Medium/smaller 0, Large +5, Huge +10, Gargantuan +20, Colossal +50. Only compare for powers whose text states it.

**SSOT ownership:** **sourceData:** `docs/audits/force-v2/bookwise-v2.9/REVALIDATED_KOTOR_Definitions_for_v2.9.json`; **roll:** `scripts/engine/force/force-executor.js`; **defense:** `scripts/engine/combat/attack-domain-router.js`.

**Classification:** `TARGET_DEFENSE_GATE_NOT_CERTIFIED`. **Runtime certified:** NO.

**Verified findings / gates:**
- Graph correctly names four affected powers; source pages span 50-52, not just page50.
- ForceExecutor.executeForcePower lines 225-380 computes generic baseDC and force power tier and does not evidence per-target size-adjusted Fortitude gate in that path.
- Never extend size Fortitude to Fear vs Will or Ionize vs Reflex.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P10-T1` — All four affected powers compare target Fortitude plus size modifiers, including Medium0 Large5 Huge10 Garg20 Colossal50.
- `CP02B-P10-T2` — Exactly-equal defense comparison succeeds when source says equals or exceeds.
- `CP02B-P10-T3` — Failure cannot apply hit-only conditions/damage.
- `CP02B-P10-T4` — Other KOTOR Powers outside explicit Fortitude rule remain unchanged.

### P11 — `kotor/rule/energy-resistance-continuation`

**Primary RAW:** Knights of the Old Republic Campaign Guide, printed p.50, 51, 52 (PDF file pages 51, 52, 53); PRINTED_KOTOR.

**Source contract:** Maintaining Energy Resistance, Kinetic Combat, Resist Force and Valor costs swift action; Force Whirlwind maintenance costs move action and fresh UTF each round. Damage while maintaining requires UTF DC =15+damage taken or duration ends. Whirlwind ends if caster/allies hurt or move target down CT; Resist Force and Valor may coexist in separate instances with per-instance maintenance action.

**SSOT ownership:** **activation:** `scripts/engine/force/force-executor.js`; **effects:** `scripts/engine/force/force-power-effects-engine.js`; **damage:** `scripts/engine/combat/damage-engine.js`; **turn:** `scripts/engine/combat/action/action-economy-hooks.js`.

**Classification:** `LIFECYCLE_MISSING_AND_RESIST_FORCE_EFFECT_DEFECT`. **Runtime certified:** NO.

**Verified findings / gates:**
- Graph encodes general damage concentration check but omits differing maintenance action, fresh Whirlwind check, early termination, and multiple-instance rules.
- ForcePowerEffectsEngine._buildResistForceEffect lines 372-393 indiscriminately creates all-defenses bonuses; KOTOR p51 grants one chosen defense unless a Force Point is spent to cover TWO chosen defenses.
- No typed per-instance maintenance receipt was found in the inspected ForceExecutor/ForcePowerEffectsEngine paths.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P11-T1` — Each maintained instance consumes source-defined action and checks DC15+actual damage taken; fail expires that instance.
- `CP02B-P11-T2` — Force Whirlwind move action + new UTF every round, and ends on printed early-break events.
- `CP02B-P11-T3` — Resist Force targets ONE defense, TWO with legal FP; never all three.
- `CP02B-P11-T4` — Valor may affect different allies, Resist Force multiple instances, each costs distinct swift action.

### P12 — `fucg/rule/temptation-of-dark-side`

**Primary RAW:** The Force Unleashed Campaign Guide, printed p.85 (PDF file page 86); PRINTED_FUCG_OPTIONAL.

**Source contract:** GM-optional Temptation has TWO separate FP-for-benefit modes. (1) As free action, Force-sensitive user spends one FP to temporarily add one [dark side] Force Power; consumed on first use or end encounter and cannot recover by normal means. (2) As free action spend one FP per temporary Dark Side/Dark Side Devotee/Sith talent; meet every prerequisite, temporary talents can chain; benefits end encounter and DSP rises by number of FP spent on temporary talents at encounter end.

**SSOT ownership:** **policy:** `scripts/engine/force/ForceRules.js`; **prerequisites:** `scripts/engine/progression/engine/force-authority-engine.js`; **force:** `scripts/engine/force/force-executor.js`; **dsp:** `scripts/engine/darkside/dsp-engine.js`; **mutation:** `scripts/governance/actor-engine/actor-engine.js`.

**Classification:** `GRAPH_OMITS_OPTIONAL_POWER_MODE_RUNTIME_NOT_CERTIFIED`. **Runtime certified:** NO.

**Verified findings / gates:**
- Graph edge covers temporary talents but omits distinct temporary Power mode, which must be added to expanded interaction inventory rather than changing original 178 historical edges.
- ForceRules.getDarkSideTemptationMode / ForceTrainingEngine getter offers strict/lenient/narrative setting, not verified equivalent to this printed opt-in rule.
- No certified end-encounter cleanup, nonrecoverable temporary Power state, acquisition prerequisite chain or DSP settlement exists in inspected execution path.

**Proposed regression assertions (NOT RUN):**
- `CP02B-P12-T1` — Default off; GM opt-in explicitly gates both temp options.
- `CP02B-P12-T2` — Temporary dark-side Power only added through real FP cost; expends at use or encounter end; ordinary recovery always disallowed.
- `CP02B-P12-T3` — Temporary talents legal via actual prerequisites, including chains; expire at encounter end.
- `CP02B-P12-T4` — Exactly one DSP per FP spent on these temporary talents at encounter end; do not automatically assign identical end-encounter DSP rule to unused temporary Powers.

## Release and handoff gate

- 12/12 policy ownership boundaries are assigned to existing V2 domains, but all execution integrations must still be proven. No equivalence between **source verified** and **runtime verified** is permitted.
- Before implementation, certify strict event-receipt ownership (Use the Force/Pilot rolls, actor/vehicle identity, source descriptor, action timing, FP cost, per-instance spent state, effect target, turn/encounter cleanup), with fail-closed behavior when missing.
- Run all 45 described assertions in executable tests after integrating the policies; retain the 12 editorial blockers from Checkpoint 01 and the separate unresolved Death Sticks consumable/status ownership.
- Check external owner crosswalk `cross-book-certification-checkpoint-02-owner-crosswalk.json` before binding any identifier; no fuzzy fallback or synthetic feat/talent item.
- This branch is audit-only; ahead/behind vs `main` must be reverified before any production merge or code mutating PR. No runtime test execution, release readiness, or source-corpus exhaustiveness is asserted here.

**Checkpoint 02B outcome:** RAW/errata policies documented, existing owner route allocated, concrete defects exposed; runtime implementation and tests remain future stages.
