# Phase 5D-I-A — Core attack / damage / range residual convergence

Branch `audit/weapon-phase-5d-i-a-core-attack-residuals`, created from merged `main`. One draft PR against `main`. 5D-I-B/C/D are **not** started here.

## 1. 5D-H merge and I-A baseline
- 5D-H (#1013) merged into `main` as `11971c0a046330aca6781c7b6d11258abe7a8054` (normal merge commit).
- I-A baseline SHA: `11971c0a046330aca6781c7b6d11258abe7a8054` (branch point). Rolling suite on the baseline: **333 passed / 0 failed / 5 documented exclusions**.
- Not repeated here: the remote branch deletions that fail with `remote end hung up unexpectedly` (recorded in 5D-G; manual cleanup needed).

## 2. Input manifest (evidence, not authority)
`tools/census-weapon-phase-5d-i-a-inputs.mjs` (`--check`) → `data/audits/weapon-phase-5d-i-a-input-manifest.json`; ledger `tools/lib/weapon-phase-5d-i-a-ledger.mjs` (data only, no runtime module imports either). One row per residual executable key of the I-A owned buckets: family, key, identity count, raw occurrences, representative weapons, the structured source field that already carries it, the current consumer, the proposed policy and the disposition. `--check` fails when a baseline key has no row, an IMPLEMENTED row has no consumer evidence in executable code, a DUPLICATE row cannot prove its structured carrier on **every** identity that carries the key, a deferral names no owner, or a residual key of the owned buckets in the current closure census is unclassified.

| counter | value |
|---|---|
| I_A_INPUT_KEYS | 78 (32 attack modifiers, 12 damage modifiers, 6 area/splash/burst, 11 stun/ion, 6 ability-compatibility, 11 profile conditionals) |
| I_A_KEYS_CONSUMED (IMPLEMENTED) | 17 |
| I_A_KEYS_DUPLICATE_OF_CONSUMED_FIELD | 21 |
| I_A_KEYS_DEFERRED_TO_OWNER | 34 (I-B 17, I-C 8, I-D 9) |
| I_A_KEYS_DATA_COMPLETENESS | 3 |
| I_A_KEYS_NOT_APPLICABLE_TO_I_A | 3 |
| **I_A_UNCLASSIFIED_KEYS** | **0** |

The 11 profile-conditional keys are the `activationRequirements` structured `type`s (10) plus `conditionalRangeRules`; the 5D-H census listed them as two fields. Attack-direct ability-compatibility: none of the six residual keys directly controls attack legality or resolution (see §9).

## 3. Taxonomy (mechanic families, not weapons)
`activation-choice` 1 · `activation-configuration` 1 · `activation-effect` 1 · `activation-feat` 1 · `activation-proficiency` 1 · `activation-resource` 1 · `activation-state` 1 · `aim-state` 2 · `alternate-damage-mode` 3 · `aoo-capability` 4 · `area-effect` 2 · `attack-classification-substitution` 4 · `braced-state` 3 · `conditional-attack-modifier` 5 · `conditional-damage-term` 2 · `crew-state` 2 · `damage-allowance` 1 · `damage-type-substitution` 1 · `defense-reaction-compat` 1 · `designation-maintenance` 3 · `detonation-timing` 3 · `dr-conditional` 1 · `environment-legality` 2 · `equipment-compat` 3 · `hurled-object` 1 · `mitigation-order` 1 · `mode-hint` 1 · `mode-switch-action` 2 · `no-damage-attack` 1 · `ongoing-effect` 1 · `payload-delegation` 1 · `range-override` 6 · `resource-cost` 1 · `simultaneous-components` 1 · `strength-damage` 1 · `target-eligibility` 5 · `target-threshold` 1 · `upgrade-restriction` 1 · `weapon-object-durability` 3 · `wielding` 1 · `wielding-damage-choice` 1

Execution stage for damage keys: ATTACK_DAMAGE_COMPOSITION (implemented here), DAMAGE_PACKET, MITIGATION, TARGET_THRESHOLD, WEAPON_OBJECT_DURABILITY, OUT_OF_SCOPE — only composition-stage terms were implemented.

## 4. Mechanic families implemented
No new attack / damage / range / area engine. Every consumer extends the 5D-A…H authority that already owns the decision.

1. **Conditional attack modifiers through condition-policy** (`special-mechanics.js`). A conditional modifier whose condition is registered in condition-policy is evaluated from the observed attack context (`attacks.js#buildAttackConditionContext`: fire mode, range band, explicit aim / brace / mounted / wielding / adjacency choices, attacker Strength and size, target size, attack of opportunity). **An unobserved fact is never read as false**: the condition is asked once as the stored PROMPT (same `special.answers` mechanism as 5D-E) and an unanswered one is surfaced, not applied. Autofire resolves the same stage (`resolveCanonicalAttackStage`) so both attack paths use one pipeline.
2. **Weapon-level fire-state attack modifiers** (structural conditions `{fireMode}` / `{fireMode, braced}`): riot-gun single −1 / autofire +2, rotary cannon unbraced autofire −5, Entrenching Tool's inherent −2 (replaces the improvised −5).
3. **Range**: `hardMaxSquares` now removes every band that begins beyond the stated maximum (Stun Pistol 20 → point-blank only; Darter "Short"); `penaltyApplication: damage` (CR-1) moves the band penalty from the attack roll to the damage roll; `resolveRangeEnvironment` evaluates SG-4's environment `conditionalRangeRules` (unknown environment applies nothing); E-Web missile launcher "Range Preparation" option (one band closer, stacks with Far Shot) whose **structured** two-swift-action cost is paid through the action economy.
4. **Braced state**: mount-only brace (Heavy Repeating Blaster) is refused only when the weapon is *known* unmounted, unknown is asked once; braced Autofire publishes the weapon's 2×4 area instead of the generic 2×2 (`resolveAutofireArea`).
5. **Environment legality**: `underwaterUsableProfiles` refuses other profiles only for an explicitly underwater attack. Never a blanket prohibition.
6. **Target eligibility** (structural resolver, no natural-language parsing): the selected profile's `activationRequirements` of type `target` (Snare pistol/rifle) and `target-rule` (Battering ram) are evaluated through registered conditions; only a definite "no" refuses (before any cost), an unobserved fact is asked once and stored.
7. **Area timing** (separate from geometry): thermal-detonator timer 1–3 validated and persisted in the workflow area shape (player choice); flash canister detonates on contact; serializer carries `detonation`.
8. **Conditional damage terms** composed once in the existing damage composition: pulse-wave point-blank equipment bonus, CR-1 adjacent die (adjacency asked once at the attack and stored).
9. **Stun setting switch** (Shockboxing Gloves): the published swift action is paid once when switching to stun; the setting persists in the owned item's fire state; switching back is not priced (the source states no cost).
10. **Strength damage for bow/sling** (CONSUMER_DEFECT): `operation.strengthModifierAppliesToDamage` is now honoured, once.
11. **Sport Hunter / Sporting Blaster Pistol reroll** (§6).

## 5. Per-family disposition
### 5.1 attack-modifiers-and-penalties (32)
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `allyAttackBonus` | targeting-laser (1/1) | designation-maintenance | PROMPT | DEFERRED_TO_OWNER → I-D | The +2 is an ALLY's attack bonus against a target the wielder designated; it needs cross-actor designation state (who designated whom, repeated each round), not a modifier on this attack. No owning subsystem exists. |
| `allyEligibleWeapons` | targeting-laser (1/1) | designation-maintenance | PROMPT | DEFERRED_TO_OWNER → I-D | Eligible-weapon scope of the ally bonus above (missile launcher / grenade launcher / vehicle weapon); same cross-actor designation state. |
| `attackOfOpportunityChoices` | siang-lance (1/1) | aoo-capability | PROMPT | DEFERRED_TO_OWNER → I-B | Which attack the wielder may use for an attack of opportunity (ranged shot / affixed bayonet). AoO eligibility is adjudicated manually today (combat-actions-mapper: "GM/player confirms the selected weapon is AoO-eligible") and the base SWSE rule for ranged-weapon AoOs is not automated here. Owner: reach-and-threat. |
| `attackTreatedAs` | Garrote (1/1) | attack-classification-substitution | AUTO | DEFERRED_TO_OWNER → I-C | Garrote: an attack with it is TREATED AS a grab attack (feat/talent grab bonuses apply). Needs the grab/grapple state machine (grab-grapple-restrain). |
| `autofireEquipmentBonus` | espo-500-riot-gun (1/1) | conditional-attack-modifier | AUTO | IMPLEMENTED | Weapon-level attack modifier under the structural fire-state condition {fireMode: autofire}; evaluated by resolveAttackStageModifiers and fed through the existing typed situational-contribution pipeline (rollAttack and Autofire). |
| `canMakeAttackOfOpportunityEvenWithStockExtended` | blaster-carbine (1/1) | aoo-capability | AUTO | DEFERRED_TO_OWNER → I-B | Weapon-declared AoO capability exception tied to the stock state; no AoO eligibility enforcer exists (manual adjudication) and the stock-state model is I-B. |
| `canMakeAttacksOfOpportunity` | siang-lance (1/1) | aoo-capability | AUTO | DEFERRED_TO_OWNER → I-B | Weapon-declared AoO capability. No AoO eligibility enforcer exists to apply it to (manual adjudication). Owner: reach-and-threat. |
| `canMakeAttacksOfOpportunityWithoutFoldedStock` | double-barreled-blaster-carbine, hunting-blaster-carbine, sporting-blaster-carbine (3/3) | aoo-capability | AUTO | DEFERRED_TO_OWNER → I-B | Weapon-declared AoO capability tied to the folded-stock configuration state; no AoO eligibility enforcer exists and the stock/configuration model is I-B. |
| `cannotBeThrownEffectively` | Vibrolance (1/1) | attack-classification-substitution | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The Vibrolance publishes no thrown attack profile, so selecting a thrown form fails closed (profile not found): the same fact as the operation key. |
| `cannotBraceWithoutTripodOrMount` | heavy-repeating-blaster (1/1) | braced-state | PROMPT | IMPLEMENTED | Brace legality: a mount-only brace is refused only when the weapon is KNOWN not to be mounted; an unobserved mount state is asked once (never a blanket prohibition). |
| `conditionalAttackBonus` | lightsaber-chassis-dueling (1/1) | conditional-attack-modifier | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The profile conditional modifier carries the same +1; it is now evaluated through condition-policy (AUTO when the attack declares an attack of opportunity and its wielding, otherwise the stored prompt). |
| `detachedTreatAs` | Bayonet, Vibrobayonet (2/2) | attack-classification-substitution | AUTO | DEFERRED_TO_OWNER → I-B | A detached bayonet is treated as a Knife / Vibrodagger: configuration-and-wielding (host/attachment state). |
| `improvisedWeaponPenaltyReplacement` | Entrenching Tool (1/1) | conditional-attack-modifier | AUTO | IMPLEMENTED | Entrenching Tool: its published -2 (operation.attackPenalty) REPLACES the -5 improvised-weapon penalty. This runtime applies no improvised penalty, so the -2 is the weapon's inherent attack modifier. CONSUMER_DEFECT fixed: the 5D-H census counted operation.attackPenalty "consumed" only because the identifier exists elsewhere (actor.system.attackPenalty) -- the weapon's -2 was never applied. |
| `lineOfSightOriginHeightSquares` | mortar-launcher (1/1) | environment-legality | PROMPT | DEFERRED_TO_OWNER → I-C | Mortar line-of-sight origin height (20 squares) needs a line-of-sight / sensing model (concealment-stealth-sensing); no LOS engine exists. |
| `maximumRangeIncrement` | darter (1/1) | range-override | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The Darter's "maximum range Short" is published as range.hardMaxSquares (40). CONSUMER_DEFECT fixed: hardMaxSquares was carried but never limited the allowed bands; canonical-range now drops every band that begins beyond it. |
| `maximumRangeSquares` | stun-pistol (1/1) | range-override | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The Stun Pistol's 20-square maximum is range.hardMaxSquares; only the bands that begin within 20 squares remain legal (same consumer fix as above). |
| `modeEnvironmentRule` | sg-4-blaster-rifle (1/1) | range-override | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The SG-4 prose rule is carried structurally by the profiles' conditionalRangeRules; resolveRangeEnvironment evaluates them through condition-policy. |
| `mustAimImmediatelyBeforeAttackToAvoidPenalty` | sniper-blaster-rifle (1/1) | aim-state | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The profile conditional modifier is evaluated through condition-policy against the attack's observed aim state (AUTO when the attack states aim, otherwise a stored prompt). |
| `preferredMode` | espo-500-riot-gun (1/1) | mode-hint | NOT_APPLICABLE_TO_I_A | NOT_APPLICABLE | The riot gun "favors autofire": a UI default-selection hint with no legality or arithmetic effect (single and autofire are both legal and priced by singleShotAttackPenalty / autofireEquipmentBonus). |
| `rangedModeFunctionsAs` | Energy Lance (1/1) | attack-classification-substitution | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The Energy Lance's plasma-bolt profile already uses the rifle range family and has no stun setting ("functions as a blaster carbine without stun"). |
| `rangePenaltyApplication` | cr-1-blast-cannon (1/1) | range-override | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | CR-1 blast cannon: the band penalty applies to the DAMAGE roll, not the attack roll. CONSUMER_DEFECT fixed: range.penaltyApplication was carried but never consumed (the attack roll took the penalty and damage took none). |
| `rangeStepReductionPreparation` | e-web-missile-launcher (1/1) | range-override | PROMPT | IMPLEMENTED | E-Web missile launcher: a per-attack "Range Preparation" option (one band closer; stacks with Far Shot) whose structured two-swift-action cost is paid through the existing action economy. DATA_COMPLETENESS amendment: the cost was prose only; a structured requiredActions copy is added through the controlled amendment path. |
| `repeatAttackEachRoundToMaintainDesignation` | targeting-laser (1/1) | designation-maintenance | PROMPT | DEFERRED_TO_OWNER → I-D | Designation must be maintained by repeating the attack each round: cross-round, cross-actor designation state (see allyAttackBonus). No owning subsystem exists. |
| `singleShotAttackPenalty` | espo-500-riot-gun (1/1) | conditional-attack-modifier | AUTO | IMPLEMENTED | Weapon-level attack modifier under the structural fire-state condition {fireMode: single}. |
| `sniperPointBlankAttackPenalty` | interchangeable-weapon-system (1/1) | conditional-attack-modifier | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | The profile conditional modifier is evaluated through condition-policy against the observed range band (AUTO). |
| `targeting` | sonic-stunner (1/1) | target-eligibility | NOT_APPLICABLE_TO_I_A | NOT_APPLICABLE | Sonic stunner: "deaf targets can still be harmed". The runtime models no deafness immunity, so there is nothing to override; informational only. |
| `targetRule` | battering-ram (1/1) | target-eligibility | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Battering ram: the prose rule is carried structurally as a target-rule requirement; resolveTargetRequirements evaluates it (a definite "no" refuses the attack before any cost). |
| `targetRules` | emp-grenade (1/1) | target-eligibility | AUTO | DEFERRED_TO_OWNER → I-C | EMP grenade: hit/miss damage fractions depend on whether the target is a droid / vehicle / electronic / cybernetic (target-type-dependent half-damage resolution). It shares the Evasion / half-damage-on-miss path owned by defense-and-reaction-interactions. |
| `unAimedAttackPenalty` | sniper-blaster-rifle (1/1) | aim-state | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Sniper blaster rifle: the profile conditional modifier carries the -5 and is evaluated against the attack's observed aim state. |
| `unbracedAdditionalAttackPenalty` | rotary-blaster-cannon (1/1) | braced-state | PROMPT | IMPLEMENTED | Rotary blaster cannon: the additional -5 applies to autofire that is not braced (structural condition {fireMode: autofire, braced: false}); the braced state of the Autofire attack is observed, otherwise asked once. |
| `underwaterUsableProfiles` | Energy Lance (1/1) | environment-legality | AUTO | IMPLEMENTED | Energy Lance: when the attack is explicitly underwater only the listed profiles are legal; an unknown environment never restricts anything. |
| `unregulatedAttackPenalty` | e-web-repeating-blaster (1/1) | crew-state | PROMPT | DEFERRED_TO_OWNER → I-B | E-Web repeating blaster: -2 unless a second crewman regulated the generator since the same initiative count last round. Needs the crew-and-emplacement model. |

### 5.2 damage-modifiers (12)
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `adjacentBonusDamage` | cr-1-blast-cannon (1/1) | conditional-damage-term | PROMPT | IMPLEMENTED | CR-1 blast cannon: +1d8 damage against an adjacent target. The adjacency of the target is asked once at the attack and stored; the damage composition adds the die after the weapon multiplier. |
| `damageThresholdAdjustment` | disruptor-pistol, disruptor-rifle, sonic-disruptor (3/3) | target-threshold | AUTO | DEFERRED_TO_OWNER → I-C | Disruptors treat every target's damage threshold as 5 lower: a TARGET_THRESHOLD-stage fact applied at Apply Damage (existing pattern: options.thresholdMeasuredDamage as in grapple-feat-actions). Owner: defense-and-reaction-interactions. |
| `hurledObjectDamageRule` | tactical-tractor-beam (1/1) | hurled-object | AUTO | DEFERRED_TO_OWNER → I-B | Tactical tractor beam: falling-object damage by object size for a hurled object. Needs the utility-and-movement (grabbed object) model. |
| `ignoresDRCondition` | Fire Blade (1/1) | dr-conditional | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Fire Blade: the conditional DR exception is the structured damageReductionInteraction; the 5D-E dr-conditional PROMPT (asked once, stored) executes it. |
| `pointBlankDamageEquipmentBonus` | pulse-wave-pistol, pulse-wave-rifle (2/2) | conditional-damage-term | AUTO | IMPLEMENTED | Pulse-wave pistol/rifle: +4/+5 equipment bonus to damage at point-blank range, composed once in the existing damage composition from the observed range band. |
| `powerAttackExtraDamageAppliesToObjectsAndVehicles` | Power Hammer (1/1) | damage-allowance | NOT_APPLICABLE_TO_I_A | NOT_APPLICABLE | Power Hammer: Power Attack extra damage may be added against objects and vehicles. The composition adds Power Attack damage to every target type (no object/vehicle exclusion exists to lift); regression-tested. |
| `shieldRatingStillApplies` | lightsaber-chassis-short, double-bladed-lightsaber, lightfoil, lightsaber (4/4) | mitigation-order | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Lightsaber chassis: SR still applies because the DR-ignore flag only affects the Damage Reduction stage; structural regression test on the stage order. |
| `strengthModifierAppliesToDamage` | bow, sling (2/2) | strength-damage | AUTO | IMPLEMENTED | Bow and sling: the Strength modifier applies to damage once. CONSUMER_DEFECT fixed: getDamageAbilityContribution returned 0 for every non-thrown ranged weapon, so the published Strength damage was silently lost; the canonical operation flag now adds it exactly once (never doubled). |
| `twoHandedDamageChoice` | lightsaber-chassis-longhandle (1/1) | wielding-damage-choice | PROMPT | DEFERRED_TO_OWNER → I-B | Long-handle lightsaber: wielded two-handed the wielder may forgo doubling the Strength bonus for a 2d10 base. Needs the wielding model (hands state) that I-B owns. |
| `weaponDR` | electrostaff (1/1) | weapon-object-durability | AUTO | DEFERRED_TO_OWNER → I-D | Electrostaff DR 20 is the weapon's own damage reduction AS AN OBJECT (when struck); durability / object statistics. |
| `weaponDRAppliesAgainstLightsabers` | Shockstaff, electrostaff (2/2) | weapon-object-durability | AUTO | DEFERRED_TO_OWNER → I-D | The weapon-object DR above is not ignored by lightsabers; durability / object statistics. |
| `weaponDRValue` | Shockstaff (1/1) | weapon-object-durability | DATA_COMPLETENESS | DATA_COMPLETENESS → I-D | Shockstaff: the published value is "not_stated_in_KOTOR_entry" -- the source is silent; recorded, never invented. |

### 5.3 area-splash-burst (6)
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `blastEffect` | adhesive-grenade (1/1) | area-effect | AUTO | DEFERRED_TO_OWNER → I-C | Adhesive grenade: targets in the blast make a grapple check or cannot move for 3 rounds (grab/grapple state + persistent duration). |
| `bracedAutofireAreaSquares` | rotary-blaster-cannon (1/1) | braced-state | AUTO | IMPLEMENTED | Rotary blaster cannon: braced Autofire covers the published 2x4 area instead of the generic 2x2 (resolveAutofireArea; the braced state of the Autofire attack selects it). |
| `contactDetonation` | flash-canister (1/1) | detonation-timing | AUTO | IMPLEMENTED | R-9 flash canister: detonates on contact (separate from the 3-square burst geometry); a chosen timer is ignored. |
| `embeddedShrapnel` | ripper (1/1) | area-effect | AUTO | DEFERRED_TO_OWNER → I-C | Ripper: when damage exceeds the damage threshold and moves the target at least one step down the condition track, embedded shrapnel deals an extra 1d4 immediately. An Apply Damage condition-track follow-up (persistent-effects / threshold path). |
| `remoteDetonationSafetyRule` | remote-grenade (1/1) | detonation-timing | DATA_COMPLETENESS | DATA_COMPLETENESS → I-D | Remote grenade: the published rule ("cannot be remotely detonated within 100 meters of the transmitter") is prose only; the numeric distance is not structured and no remote-detonation workflow exists. A source-certified structured field is needed before anything can execute it. |
| `timerRounds` | thermal-detonator (1/1) | detonation-timing | PROMPT | IMPLEMENTED | Thermal detonator: the thrower's timer choice (1-3 rounds) is validated against the published range and carried in the workflow's area shape; the choice itself stays the player's. |

### 5.4 stun-ion-damage-modes (11)
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `burnoutDamage` | lightsaber-chassis-retrosaber (1/1) | alternate-damage-mode | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Retrosaber: the burnout dice are the burnout profile's damage. The overcharge -> burnout DURATION sequencing (until end of next turn; cannot dial up for a round) is persisted activation state: I-B (configuration / activation state). |
| `convertsUnarmedMeleeAttackToStunDamage` | Stunning Gauntlet (1/1) | alternate-damage-mode | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Stunning gauntlet: native-stun capability (5D-E) makes the stun damage mode effective. |
| `damageTypeAndBurstDeterminedByGrenade` | grenade-launcher (1/1) | payload-delegation | AUTO | DEFERRED_TO_OWNER → I-B | Grenade launcher: damage, damage type and burst come from the LOADED grenade (ammo payload delegation). Needs the ammunition/payload loading model (ammo-resource-reload). |
| `dealsNoDamage` | targeting-laser (1/1) | no-damage-attack | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Targeting laser: the attack roll resolves and the damage roll is refused (resolveCanonicalDamage status no-damage). |
| `ongoingStunWhileTrapped` | electronet (1/1) | ongoing-effect | AUTO | DEFERRED_TO_OWNER → I-C | Electronet: a trapped target takes stun damage again at the start of the attacker's turn (persistent effect + grab state). |
| `overchargeDamage` | lightsaber-chassis-retrosaber (1/1) | alternate-damage-mode | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Retrosaber: the overcharge dice are the overcharge profile's damage; the swift dial-up duration is activation state (I-B). |
| `simultaneousDamageComponents` | Neuronic Whip (1/1) | simultaneous-components | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Neuronic whip: stun damage plus a separately rolled slashing rider (5D-C components / 5D-E riders). |
| `sonicDamageIsEnergy` | aurial-blaster, heavy-sonic-pistol, sonic-disruptor, sonic-pistol (5/5) | damage-type-substitution | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | All five sonic weapons publish damageType energy (never sonic), so DR/resistance/immunity decisions already see energy damage. |
| `stunChoiceTiming` | San-Ni Staff (1/1) | mode-switch-action | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | San-Ni staff: stun is chosen per attack (damageMode on the attack), costing no action. |
| `stunShotsPerAttack` | bluebolt-blaster-pistol (1/1) | resource-cost | DUPLICATE_OF_CONSUMED_FIELD | DUPLICATE | Bluebolt blaster pistol: a stun attack consumes two shots through the canonical per-attack resource cost (5D-D); regression-tested. |
| `stunSwitchAction` | Shockboxing Gloves (1/1) | mode-switch-action | AUTO | IMPLEMENTED | Shockboxing gloves: switching to the stun setting costs its published swift action ONCE; the setting persists on the owned item (fire state) until an attack uses the other setting. Only the switch to stun is priced (no cost is stated for switching back). |

## 6. Sport Hunter — Sporting Blaster Pistol reroll
- Source: Galaxy at War p.25 (certified in `data/canonical/feats.json`: *"Sporting blaster pistol: reroll damage-die results of 1 until a non-1 result"*); Core Rulebook p.126 weapon text repeats it (*"Reroll any result of 1 on sporting blaster pistol damage dice until a result other than 1 is obtained"*).
- Before: only a "metadata only until damage-die reroll UI exists" `riderRules` record; the legacy `sport-hunter-*` patch / normalization modules are **orphaned** (never registered) and match weapon *names*.
- Now (SSOT → generator → pack): `WEAPON_DAMAGE_DICE_REROLL { weaponGroups: ['sporting-blaster-pistol'], requiresAttackType: ranged, rerollValues: [1], untilDifferent: true, appliesTo: 'weapon-dice' }` in the canonical feat's `abilityMeta.rules`; the `riderRules` placeholder is removed; `build-feat-production` regenerated `packs/feats.db`, `data/feat-catalog.json`.
- Consumer: `combat-option-resolver.js#collectWeaponRuleModifiers` (scope joined to the selected form's structured descriptor, ability identity from the canonical slug) → `weaponDiceRerollValues` → `combat-roll-math.js#markRerollWeaponDice` marks **only** the weapon dice term (`3d4rr1`: Foundry recursive reroll). Talent dice, Force Item / Inquisition dice, rider dice, Force Point and custom terms are never rerolled; the critical multiplier wraps the rerolled dice.
- This relation pair (`weapon-sporting-blaster-pistol <- Sport Hunter`) was one of two "inconsistent" EXPLICIT_WEAPON_BENEFIT pairs in the 5D-H census and is now consistent (the 5D-H test expectation was updated; only the Long Haft Strike pair remains).
- Not changed: the legacy orphaned modules (classified deprecated-and-unreferenced; deletion left for the heuristic-retirement phase I-D). Existing Sport Hunter rules carry no "proficient with weapon used" gate; the new rule matches them (data-completeness note for I-D).

## 7. Profile conditionals
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `activationRequirements.action` | lightsaber-chassis-dual-phase, lightsaber-chassis-retrosaber, Amphistaff (3/3) | activation-state | AUTO | DEFERRED_TO_OWNER → I-B | Dual-phase extended / retrosaber overcharge (swift) and Amphistaff venom spit (standard): the activation lasts across attacks (until the end of the next turn), so it needs persisted activation state, not a per-attack charge. |
| `activationRequirements.choice` | lightsaber-chassis-longhandle, siang-lance (2/2) | activation-choice | PROMPT | DEFERRED_TO_OWNER → I-B | Long-handle forgo-Strength choice (wielding) and the Siang lance bayonet attack-of-opportunity choice (reach-and-threat). |
| `activationRequirements.configuration` | Amphistaff, Vibrobayonet (2/8) | activation-configuration | AUTO | DEFERRED_TO_OWNER → I-B | Amphistaff quarterstaff / spear forms require that configuration (configuration-and-wielding). |
| `activationRequirements.feat` | lightsaber-chassis-longhandle, lightsaber-chassis-pike (2/2) | activation-feat | AUTO | DEFERRED_TO_OWNER → I-B | Haft-end forms require the feat "Long Haft Form", which is not an ability in the corpus (the unlocking ability is Long Haft Strike -- the 5D-H relation fix). A DATA_COMPLETENESS finding for I-B to correct from the source together with the wielding model. |
| `activationRequirements.operators` | battering-ram (1/1) | crew-state | PROMPT | DEFERRED_TO_OWNER → I-B | Battering ram: two operators (stabilize + trigger) -- crew-and-emplacement. |
| `activationRequirements.proficiency` | Amphistaff (1/2) | activation-proficiency | AUTO | DEFERRED_TO_OWNER → I-B | Amphistaff whip forms require a proficient wielder; bound to the configuration state above. |
| `activationRequirements.target` | snare-pistol, snare-rifle (2/2) | target-eligibility | AUTO | IMPLEMENTED | Snare pistol / rifle: the structured target requirement (registered condition: hostile target at up to short range / a character at range) is evaluated from the observed range band, disposition and target type; a definite "no" refuses before any cost, an unobserved fact is asked once. |
| `activationRequirements.target-rule` | battering-ram (1/1) | target-eligibility | PROMPT | IMPLEMENTED | Battering ram: normal damage only against a stationary unattended object; the fact is asked once and a definite "no" refuses the attack. |
| `activationRequirements.usage-limit` | Amphistaff (1/1) | activation-resource | AUTO | DEFERRED_TO_OWNER → I-B | Amphistaff venom spit: once per 24 standard hours (a persisted usage counter -- resource owner). |
| `activationRequirements.wielding` | lightsaber-chassis-longhandle (1/1) | wielding | AUTO | DEFERRED_TO_OWNER → I-B | Long-handle two-handed base override: needs the wielding (hands) model. |
| `conditionalRangeRules` | sg-4-blaster-rifle (1/2) | range-override | PROMPT | IMPLEMENTED | SG-4: scale-range 0.5 underwater (blaster) / out of water (harpoon). Evaluated through condition-policy; an unobserved environment applies nothing (never a blanket restriction). |

`activationRequirements.feat` — the haft-end forms require the feat "Long Haft Form", which is **not an ability in the corpus** (the unlocking ability is Long Haft Strike, fixed for conditions in 5D-H): DATA_COMPLETENESS finding for I-B.

## 8. Existing profile conditional modifiers
All profile `conditionalModifiers` conditions already registered in condition-policy are now evaluable: not-aimed, target at unmodified point-blank, AoO + one-handed, wielder Strength below 15, Medium wielder not mounted, Double/Triple/Rapid Strike/Shot, target size. The condition `wielder-size-Large-or-larger` (Great lightsaber wielding rule, I-B) read `actorSizeRank >= 4` which admitted Medium wielders (Medium = 4, Large = 5): **CONSUMER_DEFECT fixed** (threshold 5).

## 9. Ability-compatibility disposition
| key | weapons (identities / raw) | mechanic family | policy | disposition | reason ||
|---|---|---|---|---|---|
| `darkSideEmpowerment` | sith-sword (1/1) | activation-effect | PROMPT | DEFERRED_TO_OWNER → I-D | Sith sword: a swift-action Force Point empowerment (+1 Dark Side Score) for the next attack. A resource-cost activation with no owning subsystem; not attack legality. |
| `lightsaberTalentCompatibility` | sith-sword (1/1) | defense-reaction-compat | AUTO | DEFERRED_TO_OWNER → I-C | Sith sword counts as a lightsaber for Block / Deflect / Redirect Shot: the reaction roll reads it (defense-and-reaction-interactions). |
| `redirectionCrystalCompatibility` | xerrol-nightstinger (1/1) | equipment-compat | DATA_COMPLETENESS | DATA_COMPLETENESS → I-D | Xerrol Nightstinger: a prose mention ("remains a separate equipment record on p.67"); no structured compatibility to execute. |
| `surveillanceTaggerCompatibility` | darter (1/1) | equipment-compat | NOT_APPLICABLE_TO_I_A | DEFERRED_TO_OWNER → I-D | Darter: surveillance-tagger compatibility belongs to the equipment authority (p.67); not attack resolution. |
| `surveillanceTaggerCompatible` | darter (1/1) | equipment-compat | NOT_APPLICABLE_TO_I_A | DEFERRED_TO_OWNER → I-D | Duplicate boolean of the above equipment compatibility. |
| `upgradeRestrictions` | sniper-blaster-rifle (1/1) | upgrade-restriction | NOT_APPLICABLE_TO_I_A | DEFERRED_TO_OWNER → I-D | Sniper blaster rifle: the Rapid Recycler upgrade is excluded -- customization workbench rule (UpgradeSlotEngine), not attack resolution. |

## 10. Findings
**DATA_DEFECT** — none changed.
**CONSUMER_DEFECT (fixed)**
- `range.hardMaxSquares` carried but never limited `allowedBands` (Stun Pistol, Darter).
- `range.penaltyApplication: damage` never consumed (CR-1 took the penalty on the attack roll).
- `operation.strengthModifierAppliesToDamage`: bow and sling lost the published Strength damage (every non-thrown ranged weapon returns no ability modifier).
- `operation.attackPenalty` (Entrenching Tool −2) was counted "consumed" by the 5D-H census only because the identifier exists elsewhere (`actor.system.attackPenalty`); it was never applied. **Census caveat**: consumer evidence by identifier name is weak evidence; the I-A manifest requires a probe in executable code per implemented key and a registry-verified structured carrier per duplicate.
- Sport Hunter / Sporting Blaster Pistol reroll had no executable form.
- `wielder-size-Large-or-larger` threshold (see §8).
**DATA_COMPLETENESS**
- E-Web missile launcher's range-step-reduction action cost was prose only → structured `requiredActions` added through the controlled amendment path (`5D-I-A-operation-structure-backfill`, Force Unleashed Campaign Guide p.198; logged in `postCertificationAmendments`).
- Remote grenade's 100 m safety rule (prose only), Shockstaff weapon-DR value ("not stated in the KOTOR entry"), redirection-crystal compatibility (prose mention): recorded, never invented.
- `activationRequirements.feat` "Long Haft Form" (§7).
**DEFERRED_TO_OWNER**: 34 keys with reason and owner in §5/§7/§9 (I-B 17: AoO eligibility/reach, configuration/wielding/activation state, crew, hurled objects, payload delegation; I-C 8: grab/grapple/persistent effects, threshold, target-type half damage, line of sight, reaction compatibility; I-D 9: designation state, weapon-object durability, equipment/customization compatibilities).
**DUPLICATE** (21): each proves a structured carrier on every carrying identity (`VERIFY` probes in the ledger). The 5D-H closure ledger derives its duplicate entries from the same I-A ledger — one source.
**Rules uncertainty documented, not automated**: the base SWSE rule for ranged-weapon attacks of opportunity is not automated (manual adjudication exists); the improvised-weapon −5 penalty is not implemented anywhere, so the Entrenching Tool's −2 is applied as its inherent modifier.

## 11. Tests
`tests/weapon-phase-5d-i-a-core-attack-residuals.test.mjs` — 35 checks: conditional attack bonus/penalty AUTO and stored PROMPT; aim-required (aimed / unaimed / unobserved / unanswered); operation duplicates applied once; fire-state modifiers (riot gun, rotary cannon); max-range override; range-penalty override; SG-4 environment range; environment-gated profile; E-Web range preparation (+ swift cost, Far Shot stacking, unpayable); target-rule legal/illegal; brace mount rule; braced autofire 2×4 area; timer / contact detonation (persisted, validated); point-blank equipment bonus; adjacent die; bow/sling Strength once; no-damage attack; damage-type substitution; simultaneous components; Power Attack / Shield Rating order; stun resource cost; stun switch timing (once, persists, switch-back free, unpayable fails closed); non-priced stun untouched; Sport Hunter reroll rule (SSOT → pack), weapon-dice-only, scope, critical wrapping; Riflemaster / Sport Hunter rifle+pistol / Disabler regressions; legacy / homebrew intact (even when named like a canonical weapon); stock droid flat contract intact; 5D-G reload / 5D-H brace / 5D-F paths intact; unobserved facts never refuse; no weapon-name branches; manifest zero-unclassified and current; counter arithmetic against the closure census.
Existing tests amended (intent preserved): 5D-E *PROMPT lifecycle* now uses the Energy Lance (mounted state still unobservable) because the Arg'garok's "Strength below 15" is now AUTO from the wielder's Strength score; 5D-H relation consistency drops the now-consistent Sport Hunter pair.

## 12. Validation
See the PR description / final report for the command log (focused I-A, 5D-A…H, builders `--check`, censuses `--check`, `verify-canonical-production`, `validate-partials`, `validate-data`, `system.json`, syntax check, full rolling suite).

## 13. Counters before / after
| counter | before (5D-H main) | after (I-A) |
|---|---|---|
| execution field families fully consumed / partial / unconsumed | 33 / 14 / 10 | 33 / 14 / 10 |
| operation families with unconsumed keys | 15 | 15 |
| unique unconsumed operation keys | 196 | **161** |
| raw unconsumed key occurrences | 256 | **212** |

The counter moved only through consumers with executable probes and registry-verified duplicates. The repo-wide residual was **not** driven to zero (the remaining 161 keys belong to I-B/C/D families or other subsystems). The family *statuses* are unchanged: every owned family still has deferred keys, and `3b.profile.conditional` remains PARTIAL (target / target-rule / conditionalRangeRules consumed; activation, wielding, configuration, crew types deferred).

## 14. Foundry smoke checklist (NOT RUN — static + shim tests only)
- Sniper Blaster Rifle: attack aimed / not aimed / answer the prompt; confirm −5 appears only when unaimed and the prompt is not re-asked on the damage card.
- Dueling lightsaber AoO with wielding one/two hands.
- Rotary Blaster Cannon Autofire braced vs unbraced: ledger shows −2 vs −10; damage card area 2×4 vs 2×2.
- Heavy Repeating Blaster brace with and without a mount answer.
- Thermal Detonator with a 2-round timer; flash canister contact.
- Pulse-wave pistol point-blank damage; CR-1 at medium range (damage −5, attack unpenalised) and adjacent (+1d8 prompt once).
- Bow/sling damage with Strength modifier; Stun Pistol long-range refusal; Darter medium refusal.
- Shockboxing Gloves: stun switch swift once, second stun attack free, lethal then stun pays again.
- E-Web missile launcher range preparation (two swifts, one band closer, with Far Shot).
- Snare pistol vs friendly / hostile; Battering Ram prompt.
- Sporting Blaster Pistol with Sport Hunter: damage formula shows `rr1` on weapon dice; Foundry rerolls recursively; Force Point die not rerolled.

## 15. Recommended 5D-I-B scope
Wielding / configuration / resource / emplacement / reach (the 17 I-B-owned keys of this manifest): the hands/wielding state (twoHandedDamageChoice, `activationRequirements.wielding/choice/configuration/proficiency`, Long Haft Form data fix, `wielder-size-Large-or-larger` wielding rule); persisted activation state (dual-phase extended, retrosaber overcharge/burnout duration, Amphistaff venom spit + usage limit); detached-weapon treat-as; crew-and-emplacement (unregulated −2, battering-ram operators); AoO eligibility / reach (`canMakeAttacksOfOpportunity*`, Siang lance choice — settle the base ranged-AoO rule first); ammo payload delegation (grenade launcher); hurled objects (tractor beam). Start with the wielding/activation state model — most of the remaining I-A-deferred keys depend on it.
