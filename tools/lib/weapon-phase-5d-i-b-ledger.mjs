// Phase 5D-I-B -- input ledger for wielding / activation state / threat-reach / host state (DATA, not logic).
// Used ONLY by tools/census-weapon-phase-5d-i-b-inputs.mjs and (for its proven duplicates) the 5D-H closure ledger; no runtime module imports it.
// MANDATORY keys = exactly the 17 residual keys the 5D-I-A manifest assigned to I-B. SIBLING keys = residual keys of the same state seams
// (reach-and-threat, crew-and-emplacement, configuration-and-wielding) reviewed here; a sibling is consumed only when the SAME seam executes it.
//
// disposition  IMPLEMENTED | DUPLICATE | DATA_DEFECT | DATA_COMPLETENESS | BLOCKED_BY_SUBSYSTEM | DEFERRED_WITH_EXPLICIT_OWNER
// A DUPLICATE row proves its structured carrier on EVERY identity carrying the key (VERIFY). An IMPLEMENTED row names a probe in executable code.
const S = 'scripts/items/weapon-runtime/';
const E = 'scripts/engine/combat/';
export const I_B_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'BLOCKED_BY_SUBSYSTEM', 'DEFERRED_WITH_EXPLICIT_OWNER']);
export const I_B_LATER_OWNERS = Object.freeze(['I-C', 'I-D', 'FINAL']);

const profiles = (r) => r?.canonicalStats?.attackProfiles ?? [];
const configs = (r) => r?.canonicalStats?.configurationStates ?? [];
const carriers = (reg, key) => reg.identities.filter((r) => r.operation && key in r.operation);
const every = (reg, key, fn) => { const l = carriers(reg, key); return l.length > 0 && l.every(fn); };
export const VERIFY = {
  carbine: (key) => (reg) => every(reg, key, (r) => (r.selectors?.families ?? []).includes('weapon-family:blaster-carbine')),
  detached: (reg) => every(reg, 'detachedTreatAs', (r) => {
    const t = r.operation?.configurationResolution?.detached;
    const target = t && reg.identities.find((x) => x.identityKey === t.resolveAsIdentityKey);
    return !!target && String(target.canonicalName ?? '').toLowerCase() === String(r.operation.detachedTreatAs).toLowerCase() && configs(r).some((c) => c.id === 'detached');
  }),
  twoHandedChoice: (reg) => every(reg, 'twoHandedDamageChoice', (r) => profiles(r).some((p) => (p.activationRequirements ?? []).some((a) => a.type === 'wielding' && a.condition === 'two-handed') && (p.activationRequirements ?? []).some((a) => a.type === 'choice' && a.condition === 'forgo-double-strength-bonus-to-damage'))),
  operatorsOf: (field) => (reg) => every(reg, field, (r) => profiles(r).some((p) => (p.activationRequirements ?? []).some((a) => a.type === 'operators' && (field === 'operatorsRequired' ? a.minimum === r.operation.operatorsRequired : JSON.stringify([...a.roles].map((x) => x.replace(/-.*/, '')).sort()) === JSON.stringify([...r.operation.operatorRoles].sort()))))),
  secondCrew: (reg) => every(reg, 'requiresSecondCrewRegulation', (r) => Number.isFinite(r.operation.unregulatedAttackPenalty)),
  configAction: (key, stateId) => (reg) => every(reg, key, (r) => configs(r).some((c) => c.id === stateId && c.transitionAction === r.operation[key])),
  allConfigAction: (key) => (reg) => every(reg, key, (r) => configs(r).length > 1 && configs(r).every((c) => c.transitionAction === r.operation[key])),
  disassembled: (field, key) => (reg) => every(reg, key, (r) => configs(r).some((c) => c.id === 'disassembled' && c[field] === r.operation[key])),
  noPlasmaProfile: (reg) => every(reg, 'lacksEnergyLancePlasmaMode', (r) => !profiles(r).some((p) => p.id === 'plasma-bolt')),
  profileAction: (key, profileId) => (reg) => every(reg, key, (r) => profiles(r).some((p) => p.id === profileId && (p.activationRequirements ?? []).some((a) => a.type === 'action' && a.action === r.operation[key]))),
};

const row = (key, family, mechanic, disposition, extra) => Object.freeze({ key, family, mechanic, disposition, ...extra });
const defer = (key, family, mechanic, owner, reason, extra = {}) => row(key, family, mechanic, 'DEFERRED_WITH_EXPLICIT_OWNER', { owner, reason, ...extra });
const impl = (key, family, mechanic, file, probe, reason, extra = {}) => row(key, family, mechanic, 'IMPLEMENTED', { consumer: { file, probe }, reason, ...extra });
const dup = (key, family, mechanic, carrier, file, probe, verify, reason, extra = {}) => row(key, family, mechanic, 'DUPLICATE', { carrier, consumer: { file, probe }, verify, reason, ...extra });
const blocked = (key, family, mechanic, subsystem, owner, reason, extra = {}) => row(key, family, mechanic, 'BLOCKED_BY_SUBSYSTEM', { subsystem, owner, reason, ...extra });
const PC = '3b.profile.conditional';
const A = '3b.operation.attack-modifiers-and-penalties';
const D = '3b.operation.damage-modifiers';
const ST = '3b.operation.stun-ion-damage-modes';
const RT = '3b.operation.reach-and-threat';
const CR = '3b.operation.crew-and-emplacement';
const CW = '3b.operation.configuration-and-wielding';

// ---- the 17 mandatory keys (the I-A manifest's I-B-owned rows) -------------------------------------------------------------------------
export const I_B_MANDATORY = Object.freeze([
  impl('attackOfOpportunityChoices', A, 'aoo-choice', 'scripts/combat/rolls/attacks.js', 'resolveOpportunityChoice', 'Siang Lance: an attack of opportunity makes the wielder pick a ranged shot or the bayonet; each choice names its attack profile through a structured map (DATA_COMPLETENESS amendment, Rebellion Era Campaign Guide p.50); the choice and profile persist in the workflow.'),
  dup('canMakeAttackOfOpportunityEvenWithStockExtended', A, 'aoo-capability', 'Core Rulebook AoO rule: carbines can always make attacks of opportunity (weapon-family:blaster-carbine)', `${S}owned-state.js`, 'isCarbine', VERIFY.carbine('canMakeAttackOfOpportunityEvenWithStockExtended'), 'DUPLICATE_OF_CORE_AOO_RULE: Core p.121 "a blaster carbine can always be used to make an attack of opportunity even if its stock is not folded"; the base eligibility rule admits every carbine regardless of stock.'),
  impl('canMakeAttacksOfOpportunity', A, 'aoo-capability', `${S}attack-shape.js`, 'canMakeAttacksOfOpportunity', 'Siang Lance (and the mounted Vibrobayonet block): a weapon-declared capability widens the Core base rule; nothing else is widened.'),
  dup('canMakeAttacksOfOpportunityWithoutFoldedStock', A, 'aoo-capability', 'Core Rulebook AoO rule: carbines can always make attacks of opportunity (weapon-family:blaster-carbine)', `${S}owned-state.js`, 'isCarbine', VERIFY.carbine('canMakeAttacksOfOpportunityWithoutFoldedStock'), 'DUPLICATE_OF_CORE_AOO_RULE: each carrier is a blaster carbine ("like other blaster carbines, it can ... even if its stock is not folded"): the same Core carbine rule.'),
  dup('detachedTreatAs', A, 'detached-delegation', 'operation.configurationResolution.detached -> canonical Knife / Vibrodagger', `${S}weapon-runtime-resolver.js`, 'configurationResolution', VERIFY.detached, 'The prose is carried structurally by configuration states + configurationResolution (Vibrobayonet already; Bayonet added by a source-certified amendment, Core p.121); the runtime resolves the REFERENCED canonical weapon, copying nothing.'),
  impl('unregulatedAttackPenalty', A, 'crew-state', `${S}special-mechanics.js`, 'unregulatedAttackPenalty', 'E-Web repeating blaster: -2 unless a second crewman regulated the generator since this initiative count last round. The fact is observed from the owned crew adjudication of THIS combat round, else asked once and stored for the round.'),
  blocked('hurledObjectDamageRule', D, 'hurled-object', 'utility / movement: grabbed-object model (object identity, size, grabbed and hurled state)', 'I-C', 'Tactical Tractor Beam: falling-object damage by object size needs a grabbed-object model that does not exist; object size or movement is never invented.'),
  dup('twoHandedDamageChoice', D, 'wielding-damage-choice', 'attackProfiles[two-handed-base-override].activationRequirements (wielding two-handed + choice forgo-double-strength-bonus-to-damage)', `${S}activation-requirements.js`, 'forgoesDoubleStrength', VERIFY.twoHandedChoice, 'Long-Handle Lightsaber: the choice is the structured profile requirement pair, executed here: the profile is legal only while wielded two-handed, its 2d10 base replaces the blade damage and the Strength bonus is NOT doubled (the ordinary two-handed attack doubles it, Core p.141).'),
  impl('damageTypeAndBurstDeterminedByGrenade', ST, 'payload-delegation', `${S}attack-consumer.js`, 'delegateLoadedPayload', 'Grenade Launcher: damage, damage type, burst and effects come from the LOADED canonical grenade (owned loaded identity or an explicit choice); the launcher keeps its own range, proficiency and cost; a launcher cannot fire a Thermal Detonator or a non-grenade (refused). With no loaded identity the earlier documented deferral stays (nothing is invented).'),
  impl('activationRequirements.action', PC, 'activation-state', `${E}fire-state-store.js`, 'state-transition|configuration-switch', 'Persisted activation: Retrosaber overcharge (certified state machine: swift dial-up, until the end of the wielder\'s next turn, then one burnout round that locks the dial-up), Dual-Phase / Interchangeable settings (paid once per switch, persisted), Amphistaff configuration switches. A special attack\'s own action (Venom Spit) is the attack action itself.'),
  impl('activationRequirements.choice', PC, 'activation-choice', `${S}activation-requirements.js`, "case 'choice'", 'Siang bayonet attack-of-opportunity choice is legal only for an attack of opportunity; the forgo-doubling choice is made by selecting its profile (with the wielding requirement).'),
  impl('activationRequirements.configuration', PC, 'activation-configuration', `${E}fire-state-store.js`, 'configuration-switch', 'A profile executes only in its configuration (5D-B availability, unchanged); the OWNED configuration is now remembered and switching pays the configuration\'s transitionAction once; an unusable (disassembled) configuration refuses the attack.'),
  impl('activationRequirements.feat', PC, 'activation-feat', `${S}activation-requirements.js`, "case 'feat'", 'Haft-end forms require the page-23 feat by canonical identity (Long Haft Strike); the printed name "Long Haft Form" is provenance only (see the identity reconciliation).'),
  impl('activationRequirements.operators', PC, 'crew-state', `${S}activation-requirements.js`, "case 'operators'", 'Battering Ram: two operators (stabilize + trigger); a definite "no" refuses, an unobserved count is asked once and stored.'),
  impl('activationRequirements.proficiency', PC, 'activation-proficiency', `${S}activation-requirements.js`, "case 'proficiency'", 'Amphistaff whip Pin / Trip need a proficient wielder: decided by the canonical proficiency resolver (5D-A), never system.proficient or a name.'),
  impl('activationRequirements.usage-limit', PC, 'activation-usage', `${E}fire-state-store.js`, 'usage-exhausted', 'Amphistaff Venom Spit once per 24 standard hours: a persisted usage ledger measured against the campaign clock (game.time.worldTime); with no clock the use stays used until a GM reset (never approximated).'),
  impl('activationRequirements.wielding', PC, 'wielding', `${S}owned-state.js`, 'resolveWielding', 'Hands are the wielder\'s actual choice (attack option > owned state > a weapon that requires two hands); canonical data only constrains legality; an impossible wielding refuses before any cost.'),
]);

// ---- sibling keys reviewed (same state seams) -----------------------------------------------------------------------------------------
export const I_B_SIBLINGS = Object.freeze([
  // reach-and-threat: one reach resolver for the selected form
  ...['reachBonusSquares', 'reachIncreaseSquares', 'reachSquares', 'reachProfileIds', 'extendedReachBonusSquares'].map((k) => impl(k, RT, 'reach', `${S}owned-state.js`, k, `resolveReach: the reach of the SELECTED form (weapon-wide bonus, absolute whip reach limited to its profiles, the extended setting's bonus only while its profile is selected); the two weapon-wide bonus keys echo one fact and are never summed.`, { sibling: true })),
  // crew-and-emplacement
  impl('crewRegulation', CR, 'crew-state', `${S}special-mechanics.js`, 'crewRegulation', 'Tactical Tractor Beam: its -2 unregulated penalty is read through the same crew-regulation fact as the E-Web.', { sibling: true }),
  impl('normallyRequiresTripod', CR, 'crew-state', `${S}attack-shape.js`, 'normallyRequiresTripod', 'E-Web repeating blaster: refused only when the weapon is KNOWN not to be mounted; an unknown mount is asked once and stored on the owned weapon.', { sibling: true }),
  dup('operatorRoles', CR, 'crew-state', 'attackProfiles[].activationRequirements (type operators, roles)', `${S}activation-requirements.js`, "case 'operators'", VERIFY.operatorsOf('operatorRoles'), 'Battering Ram: the roles are the structured operators requirement.', { sibling: true }),
  dup('operatorsRequired', CR, 'crew-state', 'attackProfiles[].activationRequirements (type operators, minimum)', `${S}activation-requirements.js`, "case 'operators'", VERIFY.operatorsOf('operatorsRequired'), 'Battering Ram: the count is the structured operators requirement.', { sibling: true }),
  dup('requiresSecondCrewRegulation', CR, 'crew-state', 'operation.unregulatedAttackPenalty (the penalty applies exactly when no second crewman regulated)', `${S}special-mechanics.js`, 'unregulatedAttackPenalty', VERIFY.secondCrew, 'E-Web: "requires a second crewman to regulate" is the condition of the unregulated penalty.', { sibling: true }),
  blocked('tripodEffectiveSize', CR, 'size-derived-wielding', 'size-derived wielding (weapon size vs wielder size -> one-/two-handed / too large)', 'I-D', 'The tripod-mounted effective size only matters to a size-derived wielding model; the runtime deliberately never infers hands from size (hands are the wielder\'s choice, size only constrains).', { sibling: true }),
  // configuration-and-wielding: constraints the wielding resolver executes
  impl('requiresTwoHands', CW, 'wielding', `${S}owned-state.js`, 'requiresTwoHands', 'Garrote: hands are two (a one-handed choice is illegal).', { sibling: true }),
  impl('cannotWieldTwoHanded', CW, 'wielding', `${S}owned-state.js`, 'cannotWieldTwoHanded', 'Lightfoils: a two-handed wielding is illegal.', { sibling: true }),
  impl('cannotBeWieldedTwoHanded', CW, 'wielding', `${S}owned-state.js`, 'cannotBeWieldedTwoHanded', 'Lightfoil: a two-handed wielding is illegal (the same constraint, second spelling).', { sibling: true }),
  impl('configurationSwitchAction', CW, 'configuration-setting', `${S}attack-shape.js`, 'configurationSwitchAction', 'Interchangeable Weapon System: switching among its three modes costs the published standard action once; the setting persists on the owned weapon (the default mode is free).', { sibling: true }),
  // duplicates of costs already structured on configuration states / profiles
  dup('assemblyAction', CW, 'configuration-cost', 'configurationStates[assembled].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.configAction('assemblyAction', 'assembled'), 'Wan-Shen / Targeting Blaster Rifle: the assemble action is the assembled state\'s transitionAction (Wan-Shen\'s was added by a source-certified amendment, Jedi Academy Training Manual p.54).', { sibling: true }),
  dup('disassemblyAction', CW, 'configuration-cost', 'configurationStates[disassembled].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.configAction('disassemblyAction', 'disassembled'), 'Targeting Blaster Rifle: the disassemble action is the disassembled state\'s transitionAction.', { sibling: true }),
  dup('disassembleAction', CW, 'configuration-cost', 'configurationStates[disassembled].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.configAction('disassembleAction', 'disassembled'), 'Adventurer slugthrower: the disassemble action is the disassembled state\'s transitionAction.', { sibling: true }),
  dup('reassembleAction', CW, 'configuration-cost', 'configurationStates[assembled].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.configAction('reassembleAction', 'assembled'), 'Adventurer slugthrower: the reassemble action is the assembled state\'s transitionAction.', { sibling: true }),
  dup('expandCollapseAction', CW, 'configuration-cost', 'configurationStates[expanded|collapsed].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.allConfigAction('expandCollapseAction'), 'Snap Baton: expanding or collapsing is each state\'s transitionAction.', { sibling: true }),
  dup('switchFormAction', CW, 'configuration-cost', 'configurationStates[].transitionAction', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.allConfigAction('switchFormAction'), 'Amphistaff: switching form is each configuration\'s transitionAction (swift).', { sibling: true }),
  dup('dialUpAction', CW, 'activation-cost', 'attackProfiles[overcharge].activationRequirements (action swift) + stateMachine', `${E}fire-state-store.js`, 'state-transition', VERIFY.profileAction('dialUpAction', 'overcharge'), 'Retrosaber: the dial-up action is the overcharge profile\'s activation action.', { sibling: true }),
  dup('switchAction', CW, 'activation-cost', 'attackProfiles[extended].activationRequirements (action swift) + modeProfiles[].switchAction', `${S}attack-shape.js`, 'switchAction', VERIFY.profileAction('switchAction', 'extended'), 'Dual-Phase Lightsaber: the switch action is the extended blade profile\'s activation action.', { sibling: true }),
  dup('disassembledComponentSize', CW, 'configuration-state', 'configurationStates[disassembled].componentSize', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.disassembled('componentSize', 'disassembledComponentSize'), 'Wan-Shen: the disassembled state carries the component size.', { sibling: true }),
  dup('disassembledComponents', CW, 'configuration-state', 'configurationStates[disassembled].components', `${E}fire-state-store.js`, 'configuration-switch', VERIFY.disassembled('components', 'disassembledComponents'), 'Wan-Shen: the disassembled state carries the component count.', { sibling: true }),
  dup('lacksEnergyLancePlasmaMode', CW, 'configuration-state', 'attackProfiles[] (the Power Lance publishes no plasma-bolt profile)', `${S}weapon-runtime-resolver.js`, 'profiles', VERIFY.noPlasmaProfile, 'Power Lance: it has no plasma mode because it has no plasma-bolt profile (selecting one fails closed).', { sibling: true }),
  blocked('tripodTreatsAsOneSizeSmallerForWielding', CW, 'size-derived-wielding', 'size-derived wielding (weapon size vs wielder size)', 'I-D', 'E-Web missile launcher, Flame Cannon, Tactical Tractor Beam: effective size when tripod-mounted needs a size-derived wielding model the runtime deliberately does not have (hands are the wielder\'s choice).', { sibling: true }),
  blocked('sizeGate', CW, 'size-derived-wielding', 'size-derived wielding', 'I-D', 'Great Lightsaber: "only Large or larger can use it with feats / talents affecting light weapons" needs the size-derived wielding model.', { sibling: true }),
  blocked('sizeRule', CW, 'size-derived-wielding', 'size-derived wielding', 'I-D', 'Stunning Gauntlet / Vibroknucklers: "two sizes smaller than the wearer" needs the size-derived wielding model.', { sibling: true }),
  blocked('mayCountAsSmallWhenBeneficial', CW, 'size-derived-wielding', 'size-derived wielding', 'I-D', 'Lightfoils: counted as Small when beneficial -- a size choice that only matters to the size-derived wielding model.', { sibling: true }),
  blocked('mayTreatAsSizeWhenBeneficial', CW, 'size-derived-wielding', 'size-derived wielding', 'I-D', 'Lightfoil: treated as a stated size when beneficial -- same size model.', { sibling: true }),
  blocked('designedForTwoHandedUse', CW, 'size-derived-wielding', 'size-derived wielding', 'I-D', 'Vibrosword: "designed for two-handed use" is a descriptive wielding note with no stated mechanical effect beyond the size model.', { sibling: true }),
  defer('multipleHeldOneHandCountsAsOneWeapon', CW, 'dual-wield-count', 'I-D', 'Darkstick: several held in one hand count as one weapon for dual-wield accounting; belongs with the dual-wield / thrown-weapon accounting, not hands state.', { sibling: true }),
  defer('collapsedForm', CW, 'descriptive-state', 'I-D', 'Snap Baton: the collapsed form is "a small handle" -- descriptive size/concealment of a state; no attack mechanic.', { sibling: true }),
  defer('disintegratesOnKillOrDestruction', CW, 'damage-outcome-effect', 'I-C', 'Disruptors / incinerator rifle / sonic disruptor: a kill disintegrates the target -- an outcome effect applied at Apply Damage (persistent / status effects).', { sibling: true }),
  blocked('encumbranceException', CW, 'inventory-encumbrance', 'inventory / encumbrance', 'I-D', 'PLX-2M: ignores its weight while the active drawn weapon -- needs the encumbrance model.', { sibling: true }),
  blocked('forearmMounted', CW, 'worn-equipment-slots', 'worn-equipment / inventory slots', 'I-D', 'Wrist Rocket Launcher: forearm mounting is an equipment-slot fact (no attack mechanic).', { sibling: true }),
  blocked('wornOnWrist', CW, 'worn-equipment-slots', 'worn-equipment / inventory slots', 'I-D', 'Concealed Dart Launcher: worn on the wrist -- equipment-slot fact.', { sibling: true }),
  blocked('wornAs', CW, 'worn-equipment-slots', 'worn-equipment / inventory slots', 'I-D', 'Wrist Blaster: worn as a bracelet -- equipment-slot / jewelry fact.', { sibling: true }),
  defer('fragile', CW, 'object-durability', 'I-D', 'Verpine Shattergun: fragile -- weapon-object durability.', { sibling: true }),
]);

export const I_B_LEDGER = Object.freeze([...I_B_MANDATORY, ...I_B_SIBLINGS]);

// Global counters at the START of 5D-I-B (merged main after 5D-I-A) -- the "before" side
export const I_B_BASELINE = Object.freeze({
  TOTAL_EXECUTION_FIELD_FAMILIES: 57, FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: 33, PARTIAL_EXECUTION_FIELD_FAMILIES: 14, UNCONSUMED_EXECUTION_FIELD_FAMILIES: 10,
  UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 15, UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 161, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 212,
  MANDATORY_I_B_INPUT_KEYS: 17,
});
export const I_B_SIBLING_FAMILIES = Object.freeze([RT, CR, CW]);

// Global counters at the END of 5D-I-B (pinned: later phases move the live closure census, never this phase's record). Filled from the regenerated census.
export const I_B_AFTER = Object.freeze({
  TOTAL_EXECUTION_FIELD_FAMILIES: 57, FULLY_CONSUMED_EXECUTION_FIELD_FAMILIES: 33, PARTIAL_EXECUTION_FIELD_FAMILIES: 16, UNCONSUMED_EXECUTION_FIELD_FAMILIES: 8,
  UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 15, UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 133, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 178,
});
