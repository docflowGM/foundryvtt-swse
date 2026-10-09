// Phase 5D-I-A -- input ledger for the core attack / damage / range residual convergence (DATA, not logic).
// Used ONLY by tools/census-weapon-phase-5d-i-a-inputs.mjs; no runtime module imports it. Every residual executable key of the I-A owned
// census buckets (the 5D-H closure census at the I-A baseline) has exactly one row here. A key may never silently disappear: the manifest
// `--check` fails when a baseline key has no row, when an IMPLEMENTED row has no consumer evidence, when a DUPLICATE row cannot prove its
// structured carrier against the registry, or when a DEFERRED row names no owner.
//
// policy      AUTO | PROMPT | NOT_APPLICABLE_TO_I_A | DUPLICATE_OF_CONSUMED_FIELD | DATA_COMPLETENESS
// disposition IMPLEMENTED | DUPLICATE | DEFERRED_TO_OWNER | DATA_COMPLETENESS | NOT_APPLICABLE
// owner       I-B (wielding / configuration / resource / emplacement / reach), I-C (persistent effects / grapple / reaction / defense / sensing),
//             I-D (residual ability + data completeness + durability)
// stage       (damage keys) ATTACK_DAMAGE_COMPOSITION | DAMAGE_PACKET | MITIGATION | TARGET_THRESHOLD | WEAPON_OBJECT_DURABILITY | OUT_OF_SCOPE
const S = 'scripts/items/weapon-runtime/';
const E = 'scripts/engine/combat/';

export const I_A_OWNERS = Object.freeze(['I-B', 'I-C', 'I-D']);
export const I_A_POLICIES = Object.freeze(['AUTO', 'PROMPT', 'NOT_APPLICABLE_TO_I_A', 'DUPLICATE_OF_CONSUMED_FIELD', 'DATA_COMPLETENESS']);
export const I_A_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'DEFERRED_TO_OWNER', 'DATA_COMPLETENESS', 'NOT_APPLICABLE']);

// registry probes (pure predicates over data/weapons/canonical-weapon-registry.json): they prove a DUPLICATE row's structured carrier
const profiles = (rec) => rec?.canonicalStats?.attackProfiles ?? [];
const carriers = (reg, key) => reg.identities.filter((r) => r.operation && key in r.operation);
const every = (reg, key, fn) => { const l = carriers(reg, key); return l.length > 0 && l.every(fn); };
const hasModifier = (r, cond) => profiles(r).some((p) => (p.conditionalModifiers ?? []).some((m) => JSON.stringify(m.condition) === JSON.stringify(cond)));
export const VERIFY = {
  noThrownProfile: (reg) => every(reg, 'cannotBeThrownEffectively', (r) => !profiles(r).some((p) => p.id === 'thrown' || p.qualities?.thrown === true || p.range?.profileId === 'thrown-weapons')),
  hardMax: (key) => (reg) => every(reg, key, (r) => profiles(r).some((p) => Number.isFinite(p.range?.hardMaxSquares))),
  conditionalRange: (reg) => every(reg, 'modeEnvironmentRule', (r) => profiles(r).some((p) => (p.conditionalRangeRules ?? []).some((c) => c.operation === 'scale-range'))),
  damagePenaltyApplication: (reg) => every(reg, 'rangePenaltyApplication', (r) => profiles(r).some((p) => p.range?.penaltyApplication === 'damage')),
  carbineRangedMode: (reg) => every(reg, 'rangedModeFunctionsAs', (r) => profiles(r).some((p) => p.id === 'plasma-bolt' && p.range?.profileId === 'rifles' && p.stun?.capability === 'none')),
  conditionalModifier: (key, cond) => (reg) => every(reg, key, (r) => hasModifier(r, cond)),
  targetRuleRequirement: (reg) => every(reg, 'targetRule', (r) => profiles(r).some((p) => (p.activationRequirements ?? []).some((a) => a.type === 'target-rule'))),
  drConditional: (reg) => every(reg, 'ignoresDRCondition', (r) => r.canonicalStats?.damageReductionInteraction?.mode === 'conditional'),
  drIgnoredBySR: (reg) => every(reg, 'shieldRatingStillApplies', (r) => ['ignore', 'conditional'].includes(r.canonicalStats?.damageReductionInteraction?.mode) || r.schemaFamily?.proficiency === 'lightsabers' || /lightsaber/.test(r.identityKey)),
  stunUnits: (reg) => every(reg, 'stunShotsPerAttack', (r) => profiles(r).some((p) => Number.isFinite(p.resourceConsumption?.stunUnits))),
  noDamageProfile: (reg) => every(reg, 'dealsNoDamage', (r) => profiles(r).every((p) => p.resourceConsumption?.baseUnits === null || p.damage == null || p.damage.formula === '-')),
  nativeStunUnarmed: (reg) => every(reg, 'convertsUnarmedMeleeAttackToStunDamage', (r) => profiles(r).some((p) => p.stun?.capability === 'native-stun')),
  stunComponents: (reg) => every(reg, 'simultaneousDamageComponents', (r) => profiles(r).some((p) => (p.damageComponents ?? []).length >= 2)),
  sonicIsEnergy: (reg) => every(reg, 'sonicDamageIsEnergy', (r) => profiles(r).every((p) => (p.damageType?.types ?? []).includes('energy') && !(p.damageType?.types ?? []).includes('sonic'))),
  stunChoiceAtAttack: (reg) => every(reg, 'stunChoiceTiming', (r) => profiles(r).some((p) => p.stun?.activation?.timing === 'attack-declaration')),
  profileDamage: (key, formula) => (reg) => every(reg, key, (r) => profiles(r).some((p) => p.damage?.formula === formula)),
};

const row = (family, key, mechanic, policy, disposition, extra) => Object.freeze({ family, key, mechanic, policy, disposition, ...extra });
const impl = (family, key, mechanic, policy, file, probe, reason, extra = {}) => row(family, key, mechanic, policy, 'IMPLEMENTED', { consumer: { file, probe }, reason, ...extra });
const dup = (family, key, mechanic, carrier, file, probe, verify, reason, extra = {}) => row(family, key, mechanic, 'DUPLICATE_OF_CONSUMED_FIELD', 'DUPLICATE', { carrier, consumer: { file, probe }, verify, reason, ...extra });
const defer = (family, key, mechanic, policy, owner, reason, extra = {}) => row(family, key, mechanic, policy, 'DEFERRED_TO_OWNER', { owner, reason, ...extra });
const na = (family, key, mechanic, reason, extra = {}) => row(family, key, mechanic, 'NOT_APPLICABLE_TO_I_A', 'NOT_APPLICABLE', { reason, ...extra });
const completeness = (family, key, mechanic, owner, reason, extra = {}) => row(family, key, mechanic, 'DATA_COMPLETENESS', 'DATA_COMPLETENESS', { owner, reason, ...extra });

const A = '3b.operation.attack-modifiers-and-penalties';
const D = '3b.operation.damage-modifiers';
const AR = '3b.operation.area-splash-burst';
const ST = '3b.operation.stun-ion-damage-modes';
const AC = '3b.operation.ability-compatibility';
const PC = '3b.profile.conditional';

export const I_A_LEDGER = Object.freeze([
  // ============================================================ 3b.operation.attack-modifiers-and-penalties (32 keys)
  defer(A, 'allyAttackBonus', 'designation-maintenance', 'PROMPT', 'I-D', 'The +2 is an ALLY\'s attack bonus against a target the wielder designated; it needs cross-actor designation state (who designated whom, repeated each round), not a modifier on this attack. No owning subsystem exists.'),
  defer(A, 'allyEligibleWeapons', 'designation-maintenance', 'PROMPT', 'I-D', 'Eligible-weapon scope of the ally bonus above (missile launcher / grenade launcher / vehicle weapon); same cross-actor designation state.'),
  defer(A, 'attackOfOpportunityChoices', 'aoo-capability', 'PROMPT', 'I-B', 'Which attack the wielder may use for an attack of opportunity (ranged shot / affixed bayonet). AoO eligibility is adjudicated manually today (combat-actions-mapper: "GM/player confirms the selected weapon is AoO-eligible") and the base SWSE rule for ranged-weapon AoOs is not automated here. Owner: reach-and-threat.'),
  defer(A, 'attackTreatedAs', 'attack-classification-substitution', 'AUTO', 'I-C', 'Garrote: an attack with it is TREATED AS a grab attack (feat/talent grab bonuses apply). Needs the grab/grapple state machine (grab-grapple-restrain).'),
  impl(A, 'autofireEquipmentBonus', 'conditional-attack-modifier', 'AUTO', `${S}special-mechanics.js`, 'autofireEquipmentBonus', 'Weapon-level attack modifier under the structural fire-state condition {fireMode: autofire}; evaluated by resolveAttackStageModifiers and fed through the existing typed situational-contribution pipeline (rollAttack and Autofire).'),
  defer(A, 'canMakeAttackOfOpportunityEvenWithStockExtended', 'aoo-capability', 'AUTO', 'I-B', 'Weapon-declared AoO capability exception tied to the stock state; no AoO eligibility enforcer exists (manual adjudication) and the stock-state model is I-B.'),
  defer(A, 'canMakeAttacksOfOpportunity', 'aoo-capability', 'AUTO', 'I-B', 'Weapon-declared AoO capability. No AoO eligibility enforcer exists to apply it to (manual adjudication). Owner: reach-and-threat.'),
  defer(A, 'canMakeAttacksOfOpportunityWithoutFoldedStock', 'aoo-capability', 'AUTO', 'I-B', 'Weapon-declared AoO capability tied to the folded-stock configuration state; no AoO eligibility enforcer exists and the stock/configuration model is I-B.'),
  dup(A, 'cannotBeThrownEffectively', 'attack-classification-substitution', 'attackProfiles[] (the weapon publishes no thrown profile)', `${S}weapon-runtime-resolver.js`, 'profiles', VERIFY.noThrownProfile, 'The Vibrolance publishes no thrown attack profile, so selecting a thrown form fails closed (profile not found): the same fact as the operation key.'),
  impl(A, 'cannotBraceWithoutTripodOrMount', 'braced-state', 'PROMPT', `${S}attack-shape.js`, 'cannotBraceWithoutTripodOrMount', 'Brace legality: a mount-only brace is refused only when the weapon is KNOWN not to be mounted; an unobserved mount state is asked once (never a blanket prohibition).'),
  dup(A, 'conditionalAttackBonus', 'conditional-attack-modifier', 'attackProfiles[].conditionalModifiers (attack of opportunity while wielded one-handed, +1)', `${S}special-mechanics.js`, 'evaluateRegisteredCondition', VERIFY.conditionalModifier('conditionalAttackBonus', 'attack-of-opportunity-and-wielded-one-handed'), 'The profile conditional modifier carries the same +1; it is now evaluated through condition-policy (AUTO when the attack declares an attack of opportunity and its wielding, otherwise the stored prompt).'),
  defer(A, 'detachedTreatAs', 'attack-classification-substitution', 'AUTO', 'I-B', 'A detached bayonet is treated as a Knife / Vibrodagger: configuration-and-wielding (host/attachment state).'),
  impl(A, 'improvisedWeaponPenaltyReplacement', 'conditional-attack-modifier', 'AUTO', `${S}special-mechanics.js`, 'improvisedWeaponPenaltyReplacement', 'Entrenching Tool: its published -2 (operation.attackPenalty) REPLACES the -5 improvised-weapon penalty. This runtime applies no improvised penalty, so the -2 is the weapon\'s inherent attack modifier. CONSUMER_DEFECT fixed: the 5D-H census counted operation.attackPenalty "consumed" only because the identifier exists elsewhere (actor.system.attackPenalty) -- the weapon\'s -2 was never applied.'),
  defer(A, 'lineOfSightOriginHeightSquares', 'environment-legality', 'PROMPT', 'I-C', 'Mortar line-of-sight origin height (20 squares) needs a line-of-sight / sensing model (concealment-stealth-sensing); no LOS engine exists.'),
  dup(A, 'maximumRangeIncrement', 'range-override', 'attackProfiles[].range.hardMaxSquares', `${S}canonical-range.js`, 'withinHardMax', VERIFY.hardMax('maximumRangeIncrement'), 'The Darter\'s "maximum range Short" is published as range.hardMaxSquares (40). CONSUMER_DEFECT fixed: hardMaxSquares was carried but never limited the allowed bands; canonical-range now drops every band that begins beyond it.'),
  dup(A, 'maximumRangeSquares', 'range-override', 'attackProfiles[].range.hardMaxSquares', `${S}canonical-range.js`, 'withinHardMax', VERIFY.hardMax('maximumRangeSquares'), 'The Stun Pistol\'s 20-square maximum is range.hardMaxSquares; only the bands that begin within 20 squares remain legal (same consumer fix as above).'),
  dup(A, 'modeEnvironmentRule', 'range-override', 'attackProfiles[].conditionalRangeRules (scale-range 0.5 underwater / not-underwater)', `${S}canonical-range.js`, 'resolveRangeEnvironment', VERIFY.conditionalRange, 'The SG-4 prose rule is carried structurally by the profiles\' conditionalRangeRules; resolveRangeEnvironment evaluates them through condition-policy.'),
  dup(A, 'mustAimImmediatelyBeforeAttackToAvoidPenalty', 'aim-state', 'attackProfiles[].conditionalModifiers ("not-aimed-at-target-immediately-before-attack", -5)', `${S}special-mechanics.js`, 'evaluateRegisteredCondition', VERIFY.conditionalModifier('mustAimImmediatelyBeforeAttackToAvoidPenalty', 'not-aimed-at-target-immediately-before-attack'), 'The profile conditional modifier is evaluated through condition-policy against the attack\'s observed aim state (AUTO when the attack states aim, otherwise a stored prompt).'),
  na(A, 'preferredMode', 'mode-hint', 'The riot gun "favors autofire": a UI default-selection hint with no legality or arithmetic effect (single and autofire are both legal and priced by singleShotAttackPenalty / autofireEquipmentBonus).'),
  dup(A, 'rangePenaltyApplication', 'range-override', 'attackProfiles[].range.penaltyApplication ("damage")', `${S}canonical-range.js`, 'canonicalDamageRangePenalty', VERIFY.damagePenaltyApplication, 'CR-1 blast cannon: the band penalty applies to the DAMAGE roll, not the attack roll. CONSUMER_DEFECT fixed: range.penaltyApplication was carried but never consumed (the attack roll took the penalty and damage took none).'),
  impl(A, 'rangeStepReductionPreparation', 'range-override', 'PROMPT', `${S}attack-shape.js`, 'rangeStepReductionPreparation', 'E-Web missile launcher: a per-attack "Range Preparation" option (one band closer; stacks with Far Shot) whose structured two-swift-action cost is paid through the existing action economy. DATA_COMPLETENESS amendment: the cost was prose only; a structured requiredActions copy is added through the controlled amendment path.'),
  dup(A, 'rangedModeFunctionsAs', 'attack-classification-substitution', 'attackProfiles[plasma-bolt] (rifle range family, no stun)', `${S}canonical-range.js`, 'resolveCanonicalRange', VERIFY.carbineRangedMode, 'The Energy Lance\'s plasma-bolt profile already uses the rifle range family and has no stun setting ("functions as a blaster carbine without stun").'),
  defer(A, 'repeatAttackEachRoundToMaintainDesignation', 'designation-maintenance', 'PROMPT', 'I-D', 'Designation must be maintained by repeating the attack each round: cross-round, cross-actor designation state (see allyAttackBonus). No owning subsystem exists.'),
  impl(A, 'singleShotAttackPenalty', 'conditional-attack-modifier', 'AUTO', `${S}special-mechanics.js`, 'singleShotAttackPenalty', 'Weapon-level attack modifier under the structural fire-state condition {fireMode: single}.'),
  dup(A, 'sniperPointBlankAttackPenalty', 'conditional-attack-modifier', 'attackProfiles[].conditionalModifiers ("target at unmodified point-blank range", -2)', `${S}special-mechanics.js`, 'evaluateRegisteredCondition', VERIFY.conditionalModifier('sniperPointBlankAttackPenalty', 'target at unmodified point-blank range'), 'The profile conditional modifier is evaluated through condition-policy against the observed range band (AUTO).'),
  dup(A, 'targetRule', 'target-eligibility', 'attackProfiles[].activationRequirements (type: target-rule)', `${S}special-mechanics.js`, 'resolveTargetRequirements', VERIFY.targetRuleRequirement, 'Battering ram: the prose rule is carried structurally as a target-rule requirement; resolveTargetRequirements evaluates it (a definite "no" refuses the attack before any cost).'),
  defer(A, 'targetRules', 'target-eligibility', 'AUTO', 'I-C', 'EMP grenade: hit/miss damage fractions depend on whether the target is a droid / vehicle / electronic / cybernetic (target-type-dependent half-damage resolution). It shares the Evasion / half-damage-on-miss path owned by defense-and-reaction-interactions.'),
  na(A, 'targeting', 'target-eligibility', 'Sonic stunner: "deaf targets can still be harmed". The runtime models no deafness immunity, so there is nothing to override; informational only.'),
  dup(A, 'unAimedAttackPenalty', 'aim-state', 'attackProfiles[].conditionalModifiers ("not-aimed-at-target-immediately-before-attack", -5)', `${S}special-mechanics.js`, 'evaluateRegisteredCondition', VERIFY.conditionalModifier('unAimedAttackPenalty', 'not-aimed-at-target-immediately-before-attack'), 'Sniper blaster rifle: the profile conditional modifier carries the -5 and is evaluated against the attack\'s observed aim state.'),
  impl(A, 'unbracedAdditionalAttackPenalty', 'braced-state', 'PROMPT', `${S}special-mechanics.js`, 'unbracedAdditionalAttackPenalty', 'Rotary blaster cannon: the additional -5 applies to autofire that is not braced (structural condition {fireMode: autofire, braced: false}); the braced state of the Autofire attack is observed, otherwise asked once.'),
  impl(A, 'underwaterUsableProfiles', 'environment-legality', 'AUTO', `${S}attack-shape.js`, 'underwaterUsableProfiles', 'Energy Lance: when the attack is explicitly underwater only the listed profiles are legal; an unknown environment never restricts anything.'),
  defer(A, 'unregulatedAttackPenalty', 'crew-state', 'PROMPT', 'I-B', 'E-Web repeating blaster: -2 unless a second crewman regulated the generator since the same initiative count last round. Needs the crew-and-emplacement model.'),

  // ============================================================ 3b.operation.damage-modifiers (12 keys)
  impl(D, 'adjacentBonusDamage', 'conditional-damage-term', 'PROMPT', `${S}special-mechanics.js`, 'adjacentBonusDamage', 'CR-1 blast cannon: +1d8 damage against an adjacent target. The adjacency of the target is asked once at the attack and stored; the damage composition adds the die after the weapon multiplier.', { stage: 'ATTACK_DAMAGE_COMPOSITION' }),
  defer(D, 'damageThresholdAdjustment', 'target-threshold', 'AUTO', 'I-C', 'Disruptors treat every target\'s damage threshold as 5 lower: a TARGET_THRESHOLD-stage fact applied at Apply Damage (existing pattern: options.thresholdMeasuredDamage as in grapple-feat-actions). Owner: defense-and-reaction-interactions.', { stage: 'TARGET_THRESHOLD' }),
  defer(D, 'hurledObjectDamageRule', 'hurled-object', 'AUTO', 'I-B', 'Tactical tractor beam: falling-object damage by object size for a hurled object. Needs the utility-and-movement (grabbed object) model.', { stage: 'OUT_OF_SCOPE' }),
  dup(D, 'ignoresDRCondition', 'dr-conditional', 'damageReductionInteraction (mode conditional, "target is an unattended object")', `${S}special-mechanics.js`, 'dr-conditional', VERIFY.drConditional, 'Fire Blade: the conditional DR exception is the structured damageReductionInteraction; the 5D-E dr-conditional PROMPT (asked once, stored) executes it.', { stage: 'MITIGATION' }),
  impl(D, 'pointBlankDamageEquipmentBonus', 'conditional-damage-term', 'AUTO', `${S}special-mechanics.js`, 'pointBlankDamageEquipmentBonus', 'Pulse-wave pistol/rifle: +4/+5 equipment bonus to damage at point-blank range, composed once in the existing damage composition from the observed range band.', { stage: 'ATTACK_DAMAGE_COMPOSITION' }),
  na(D, 'powerAttackExtraDamageAppliesToObjectsAndVehicles', 'damage-allowance', 'Power Hammer: Power Attack extra damage may be added against objects and vehicles. The composition adds Power Attack damage to every target type (no object/vehicle exclusion exists to lift); regression-tested.', { stage: 'ATTACK_DAMAGE_COMPOSITION' }),
  dup(D, 'shieldRatingStillApplies', 'mitigation-order', 'damage mitigation stage order (Shield Rating is stage 1; bypass-dr only touches stage 2)', `${E}damage-mitigation-manager.js`, 'ShieldMitigationResolver', VERIFY.drIgnoredBySR, 'Lightsaber chassis: SR still applies because the DR-ignore flag only affects the Damage Reduction stage; structural regression test on the stage order.', { stage: 'MITIGATION' }),
  impl(D, 'strengthModifierAppliesToDamage', 'strength-damage', 'AUTO', `${E}combat-stat-rules.js`, 'strengthModifierAppliesToDamage|strengthAppliesToDamage', 'Bow and sling: the Strength modifier applies to damage once. CONSUMER_DEFECT fixed: getDamageAbilityContribution returned 0 for every non-thrown ranged weapon, so the published Strength damage was silently lost; the canonical operation flag now adds it exactly once (never doubled).', { stage: 'ATTACK_DAMAGE_COMPOSITION', consumerAlt: `${S}attack-shape.js` }),
  defer(D, 'twoHandedDamageChoice', 'wielding-damage-choice', 'PROMPT', 'I-B', 'Long-handle lightsaber: wielded two-handed the wielder may forgo doubling the Strength bonus for a 2d10 base. Needs the wielding model (hands state) that I-B owns.', { stage: 'ATTACK_DAMAGE_COMPOSITION' }),
  defer(D, 'weaponDR', 'weapon-object-durability', 'AUTO', 'I-D', 'Electrostaff DR 20 is the weapon\'s own damage reduction AS AN OBJECT (when struck); durability / object statistics.', { stage: 'WEAPON_OBJECT_DURABILITY' }),
  defer(D, 'weaponDRAppliesAgainstLightsabers', 'weapon-object-durability', 'AUTO', 'I-D', 'The weapon-object DR above is not ignored by lightsabers; durability / object statistics.', { stage: 'WEAPON_OBJECT_DURABILITY' }),
  completeness(D, 'weaponDRValue', 'weapon-object-durability', 'I-D', 'Shockstaff: the published value is "not_stated_in_KOTOR_entry" -- the source is silent; recorded, never invented.', { stage: 'WEAPON_OBJECT_DURABILITY' }),

  // ============================================================ 3b.operation.area-splash-burst (6 keys)
  defer(AR, 'blastEffect', 'area-effect', 'AUTO', 'I-C', 'Adhesive grenade: targets in the blast make a grapple check or cannot move for 3 rounds (grab/grapple state + persistent duration).'),
  impl(AR, 'bracedAutofireAreaSquares', 'braced-state', 'AUTO', `${S}area-shape.js`, 'bracedAutofireAreaSquares', 'Rotary blaster cannon: braced Autofire covers the published 2x4 area instead of the generic 2x2 (resolveAutofireArea; the braced state of the Autofire attack selects it).'),
  impl(AR, 'contactDetonation', 'detonation-timing', 'AUTO', `${S}area-shape.js`, 'contactDetonation', 'R-9 flash canister: detonates on contact (separate from the 3-square burst geometry); a chosen timer is ignored.'),
  defer(AR, 'embeddedShrapnel', 'area-effect', 'AUTO', 'I-C', 'Ripper: when damage exceeds the damage threshold and moves the target at least one step down the condition track, embedded shrapnel deals an extra 1d4 immediately. An Apply Damage condition-track follow-up (persistent-effects / threshold path).'),
  completeness(AR, 'remoteDetonationSafetyRule', 'detonation-timing', 'I-D', 'Remote grenade: the published rule ("cannot be remotely detonated within 100 meters of the transmitter") is prose only; the numeric distance is not structured and no remote-detonation workflow exists. A source-certified structured field is needed before anything can execute it.'),
  impl(AR, 'timerRounds', 'detonation-timing', 'PROMPT', `${S}area-shape.js`, 'timerRounds', 'Thermal detonator: the thrower\'s timer choice (1-3 rounds) is validated against the published range and carried in the workflow\'s area shape; the choice itself stays the player\'s.'),

  // ============================================================ 3b.operation.stun-ion-damage-modes (11 keys)
  dup(ST, 'burnoutDamage', 'alternate-damage-mode', 'attackProfiles[burnout].damage (2d4)', `${S}damage-profile-resolver.js`, 'damageMultiplier', VERIFY.profileDamage('burnoutDamage', '2d4'), 'Retrosaber: the burnout dice are the burnout profile\'s damage. The overcharge -> burnout DURATION sequencing (until end of next turn; cannot dial up for a round) is persisted activation state: I-B (configuration / activation state).'),
  dup(ST, 'convertsUnarmedMeleeAttackToStunDamage', 'alternate-damage-mode', 'attackProfiles[].stun.capability = native-stun', `${S}attack-consumer.js`, 'native-stun', VERIFY.nativeStunUnarmed, 'Stunning gauntlet: native-stun capability (5D-E) makes the stun damage mode effective.'),
  defer(ST, 'damageTypeAndBurstDeterminedByGrenade', 'payload-delegation', 'AUTO', 'I-B', 'Grenade launcher: damage, damage type and burst come from the LOADED grenade (ammo payload delegation). Needs the ammunition/payload loading model (ammo-resource-reload).'),
  dup(ST, 'dealsNoDamage', 'no-damage-attack', 'attackProfiles[].damage (no ordinary damage) -> NO_ORDINARY_DAMAGE', `${S}attack-consumer.js`, 'no-damage', VERIFY.noDamageProfile, 'Targeting laser: the attack roll resolves and the damage roll is refused (resolveCanonicalDamage status no-damage).'),
  defer(ST, 'ongoingStunWhileTrapped', 'ongoing-effect', 'AUTO', 'I-C', 'Electronet: a trapped target takes stun damage again at the start of the attacker\'s turn (persistent effect + grab state).'),
  dup(ST, 'overchargeDamage', 'alternate-damage-mode', 'attackProfiles[overcharge].damage (2d10)', `${S}damage-profile-resolver.js`, 'damageMultiplier', VERIFY.profileDamage('overchargeDamage', '2d10'), 'Retrosaber: the overcharge dice are the overcharge profile\'s damage; the swift dial-up duration is activation state (I-B).'),
  dup(ST, 'simultaneousDamageComponents', 'simultaneous-components', 'attackProfiles[].damageComponents (stun + slashing rider)', `${S}damage-profile-resolver.js`, 'components', VERIFY.stunComponents, 'Neuronic whip: stun damage plus a separately rolled slashing rider (5D-C components / 5D-E riders).'),
  dup(ST, 'sonicDamageIsEnergy', 'damage-type-substitution', 'attackProfiles[].damageType.types = [energy]', `${S}damage-profile-resolver.js`, 'damageType', VERIFY.sonicIsEnergy, 'All five sonic weapons publish damageType energy (never sonic), so DR/resistance/immunity decisions already see energy damage.'),
  dup(ST, 'stunChoiceTiming', 'mode-switch-action', 'attackProfiles[].stun.activation.timing = attack-declaration', `${S}attack-consumer.js`, 'effectiveDamageMode', VERIFY.stunChoiceAtAttack, 'San-Ni staff: stun is chosen per attack (damageMode on the attack), costing no action.'),
  dup(ST, 'stunShotsPerAttack', 'resource-cost', 'attackProfiles[].resourceConsumption.stunUnits', `${S}canonical-resource.js`, 'stunUnits', VERIFY.stunUnits, 'Bluebolt blaster pistol: a stun attack consumes two shots through the canonical per-attack resource cost (5D-D); regression-tested.'),
  impl(ST, 'stunSwitchAction', 'mode-switch-action', 'AUTO', `${S}attack-shape.js`, 'stunSwitchAction', 'Shockboxing gloves: switching to the stun setting costs its published swift action ONCE; the setting persists on the owned item (fire state) until an attack uses the other setting. Only the switch to stun is priced (no cost is stated for switching back).'),

  // ============================================================ 3b.operation.ability-compatibility (6 residual keys): none directly controls attack legality/resolution
  defer(AC, 'darkSideEmpowerment', 'activation-effect', 'PROMPT', 'I-D', 'Sith sword: a swift-action Force Point empowerment (+1 Dark Side Score) for the next attack. A resource-cost activation with no owning subsystem; not attack legality.'),
  defer(AC, 'lightsaberTalentCompatibility', 'defense-reaction-compat', 'AUTO', 'I-C', 'Sith sword counts as a lightsaber for Block / Deflect / Redirect Shot: the reaction roll reads it (defense-and-reaction-interactions).'),
  completeness(AC, 'redirectionCrystalCompatibility', 'equipment-compat', 'I-D', 'Xerrol Nightstinger: a prose mention ("remains a separate equipment record on p.67"); no structured compatibility to execute.'),
  defer(AC, 'surveillanceTaggerCompatibility', 'equipment-compat', 'NOT_APPLICABLE_TO_I_A', 'I-D', 'Darter: surveillance-tagger compatibility belongs to the equipment authority (p.67); not attack resolution.'),
  defer(AC, 'surveillanceTaggerCompatible', 'equipment-compat', 'NOT_APPLICABLE_TO_I_A', 'I-D', 'Duplicate boolean of the above equipment compatibility.'),
  defer(AC, 'upgradeRestrictions', 'upgrade-restriction', 'NOT_APPLICABLE_TO_I_A', 'I-D', 'Sniper blaster rifle: the Rapid Recycler upgrade is excluded -- customization workbench rule (UpgradeSlotEngine), not attack resolution.'),

  // ============================================================ 3b.profile.conditional: activationRequirements (by structured `type`) + conditionalRangeRules
  impl(PC, 'activationRequirements.target', 'target-eligibility', 'AUTO', `${S}special-mechanics.js`, 'resolveTargetRequirements', 'Snare pistol / rifle: the structured target requirement (registered condition: hostile target at up to short range / a character at range) is evaluated from the observed range band, disposition and target type; a definite "no" refuses before any cost, an unobserved fact is asked once.'),
  impl(PC, 'activationRequirements.target-rule', 'target-eligibility', 'PROMPT', `${S}special-mechanics.js`, 'resolveTargetRequirements', 'Battering ram: normal damage only against a stationary unattended object; the fact is asked once and a definite "no" refuses the attack.'),
  defer(PC, 'activationRequirements.action', 'activation-state', 'AUTO', 'I-B', 'Dual-phase extended / retrosaber overcharge (swift) and Amphistaff venom spit (standard): the activation lasts across attacks (until the end of the next turn), so it needs persisted activation state, not a per-attack charge.'),
  defer(PC, 'activationRequirements.wielding', 'wielding', 'AUTO', 'I-B', 'Long-handle two-handed base override: needs the wielding (hands) model.'),
  defer(PC, 'activationRequirements.choice', 'activation-choice', 'PROMPT', 'I-B', 'Long-handle forgo-Strength choice (wielding) and the Siang lance bayonet attack-of-opportunity choice (reach-and-threat).'),
  defer(PC, 'activationRequirements.feat', 'activation-feat', 'AUTO', 'I-B', 'Haft-end forms require the feat "Long Haft Form", which is not an ability in the corpus (the unlocking ability is Long Haft Strike -- the 5D-H relation fix). A DATA_COMPLETENESS finding for I-B to correct from the source together with the wielding model.'),
  defer(PC, 'activationRequirements.configuration', 'activation-configuration', 'AUTO', 'I-B', 'Amphistaff quarterstaff / spear forms require that configuration (configuration-and-wielding).'),
  defer(PC, 'activationRequirements.proficiency', 'activation-proficiency', 'AUTO', 'I-B', 'Amphistaff whip forms require a proficient wielder; bound to the configuration state above.'),
  defer(PC, 'activationRequirements.usage-limit', 'activation-resource', 'AUTO', 'I-B', 'Amphistaff venom spit: once per 24 standard hours (a persisted usage counter -- resource owner).'),
  defer(PC, 'activationRequirements.operators', 'crew-state', 'PROMPT', 'I-B', 'Battering ram: two operators (stabilize + trigger) -- crew-and-emplacement.'),
  impl(PC, 'conditionalRangeRules', 'range-override', 'PROMPT', `${S}canonical-range.js`, 'resolveRangeEnvironment', 'SG-4: scale-range 0.5 underwater (blaster) / out of water (harpoon). Evaluated through condition-policy; an unobserved environment applies nothing (never a blanket restriction).'),
]);

// Global baseline (5D-H merged main, closure census) -- the "before" side of the I-A counters
export const I_A_BASELINE = Object.freeze({
  TOTAL_EXECUTION_FIELD_FAMILIES: 57, FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: 33, PARTIAL_EXECUTION_FIELD_FAMILIES: 14, UNCONSUMED_EXECUTION_FIELD_FAMILIES: 10,
  UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 15, UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 196, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 256,
  I_A_INPUT_KEYS: 78,
});
// Global counters as of the END of 5D-I-A (pinned: later phases move the live closure census, never this phase's record)
export const I_A_AFTER = Object.freeze({
  TOTAL_EXECUTION_FIELD_FAMILIES: 57, FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: 33, PARTIAL_EXECUTION_FIELD_FAMILIES: 14, UNCONSUMED_EXECUTION_FIELD_FAMILIES: 10,
  UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 15, UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 161, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 212,
});
export const I_A_OWNED_FAMILIES = Object.freeze([A, D, AR, ST, AC, PC]);
