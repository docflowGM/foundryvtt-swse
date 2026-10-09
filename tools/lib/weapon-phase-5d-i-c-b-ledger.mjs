// Phase 5D-I-C-B -- input ledger for weapon CONTROL mechanics: grab / grapple / restrain / net / snare / tractor / hurl (DATA, not logic).
// Used ONLY by tools/census-weapon-phase-5d-i-c-b-inputs.mjs and (for its proven duplicates) the 5D-H closure ledger; no runtime module imports it.
//
// Row kinds:  operation-key | special-mechanic | relation
// disposition IMPLEMENTED | DUPLICATE | DATA_DEFECT | DATA_COMPLETENESS | DEFERRED_TO_I_C_C | DEFERRED_TO_I_D | BLOCKED_BY_MISSING_CORE_GRAPPLE_CAPABILITY
// An IMPLEMENTED row names a probe in EXECUTABLE code of its consumer; a special-mechanic row must be classified AUTO / PROMPT by the 5D-E census, so the
// classification and the consumer cannot drift apart. A DUPLICATE proves its structured carrier on every identity carrying the key.
const S = 'scripts/items/weapon-runtime/';
const E = 'scripts/engine/combat/';
export const I_C_B_DISPOSITIONS = Object.freeze(['IMPLEMENTED', 'DUPLICATE', 'DATA_DEFECT', 'DATA_COMPLETENESS', 'DEFERRED_TO_I_C_C', 'DEFERRED_TO_I_D', 'BLOCKED_BY_MISSING_CORE_GRAPPLE_CAPABILITY']);

const profiles = (r) => r?.canonicalStats?.attackProfiles ?? [];
const trig = (r) => profiles(r).flatMap((p) => p.triggeredEffects ?? []);
const carriers = (reg, key) => reg.identities.filter((r) => r.operation && key in r.operation);
const every = (reg, key, fn) => { const l = carriers(reg, key); return l.length > 0 && l.every(fn); };
export const VERIFY = {
  netShock: (reg) => every(reg, 'ongoingStunWhileTrapped', (r) => trig(r).some((t) => t.id === 'ongoing-net-shock' && t.condition === 'target-still-trapped-by-this-electronet' && t.frequency === 'each-round-while-trapped')),
};

const row = (kind, key, family, mechanic, disposition, extra) => Object.freeze({ kind, key, family, mechanic, disposition, ...extra });
const opImpl = (key, family, mechanic, file, probe, reason, extra = {}) => row('operation-key', key, family, mechanic, 'IMPLEMENTED', { consumer: { file, probe }, reason, ...extra });
const opDup = (key, family, mechanic, carrier, file, probe, verify, reason, extra = {}) => row('operation-key', key, family, mechanic, 'DUPLICATE', { carrier, consumer: { file, probe }, verify, reason, ...extra });
const opOther = (key, family, mechanic, disposition, owner, reason, extra = {}) => row('operation-key', key, family, mechanic, disposition, { owner, reason, ...extra });
const mImpl = (identityKey, id, mechanic, file, probe, reason, extra = {}) => row('special-mechanic', `${identityKey}::${id}`, 'special-mechanic', mechanic, 'IMPLEMENTED', { identityKey, mechanicId: id, expect: { family: 'grab-grapple' }, consumer: { file, probe }, reason, ...extra });
const rel = (key, disposition, file, probe, reason, extra = {}) => row('relation', key, 'ability-relation', 'entitlement', disposition, { consumer: { file, probe }, reason, ...extra });

const CR = `${S}control-rules.js`;
const WC = `${E}weapon-control-effects.js`;
const GS = 'scripts/combat/systems/grappling-system.js';
const GR = '3b.operation.grab-grapple-restrain';
const AS = '3b.operation.area-splash-burst';
const SI = '3b.operation.stun-ion-damage-modes';
const AM = '3b.operation.attack-modifiers-and-penalties';
const COND = '3b.operation.condition-and-persistent-effects';
const DM = '3b.operation.damage-modifiers';

export const I_C_B_ROWS = Object.freeze([
  // ---- remaining grab-grapple-restrain operation keys ---------------------------------------------------------------------------------------------
  opImpl('allowedGrappleFeats', GR, 'maneuver-legality', CR, 'allowedGrappleFeats', 'Lightwhip / Amphistaff: Pin and Trip may be used with the weapon. Read by the control declaration as the allowed-maneuver list; the held target\'s control record carries it and SWSEGrappling gates Pin / Trip through controlManeuverLegality.'),
  opImpl('prohibitedGrappleFeats', GR, 'maneuver-legality', CR, 'prohibitedGrappleFeats', 'Lightwhip: Crush and Throw are prohibited while the lightwhip holds the target. Prohibition wins over any feat the holder owns.'),
  opImpl('allowedFeats', '3b.operation.ability-compatibility', 'maneuver-legality', CR, 'allowedFeats', 'Snare Pistol / Rifle spell the allowed grapple maneuvers (Pin, Trip) as allowedFeats. The 5D-H duplicate mapping of this key to the multi-shot PROHIBITED relation holds for multi-shot weapons only; the sole carriers are the snares, whose list is read here as the allowed-maneuver list.'),
  opImpl('disallowedFeats', '3b.operation.ability-compatibility', 'maneuver-legality', CR, 'disallowedFeats', 'Snare Pistol / Rifle: Crush and Throw are disallowed (the Pistol also lists Bone Crusher, kept as data: it only modifies Crush, which is already prohibited).'),
  opImpl('pinAndTripAllowed', GR, 'maneuver-legality', CR, 'pinAndTripAllowed', 'Net: Pin and Trip allowed (same declaration path as allowedGrappleFeats).'),
  opImpl('crushAndThrowDisallowed', GR, 'maneuver-legality', CR, 'crushAndThrowDisallowed', 'Net: Crush and Throw disallowed (same declaration path as prohibitedGrappleFeats).'),
  opImpl('escapeAcrobaticsDC', GR, 'escape-route', CR, 'escapeAcrobaticsDC', 'Net / Snare / Lightwhip: escape with Acrobatics DC 15. A declared escape route of the control record; SWSEGrappling._escapeAgainstDc resolves it.'),
  opImpl('breakStrengthDC', GR, 'escape-route', CR, 'breakStrengthDC', 'Net / Snare: break free with Strength DC 20 (a declared escape route; the Strength check is made against the DC).'),
  opImpl('rangedGrabOrGrapple', GR, 'grab-initiation', CR, 'rangedGrabOrGrapple', 'Net / Snare Pistol / Snare Rifle: the weapon\'s ranged attack initiates the grab / grapple.'),
  opImpl('canInitiateGrabOrGrappleAtRange', GR, 'grab-initiation', CR, 'canInitiateGrabOrGrappleAtRange', 'Stokhli Spray Stick: may initiate a grab / grapple at range (delegated to the Net declaration).'),
  opImpl('webbingFunctionsAsNet', GR, 'delegation', CR, 'webbingFunctionsAsNet', 'Stokhli Spray Stick webbing functions as a net: delegated through operation.treatControlAs to the NET identity\'s own control declaration (nothing cloned onto the Stokhli).'),
  opImpl('treatControlAs', GR, 'delegation', CR, 'treatControlAs', 'I-C-B structure backfill: the Stokhli Spray Stick\'s "functions as a net" (FUCG p.100) and the Electronet\'s "grabs the target as with a normal net" (Scum and Villainy p.51) as structured delegations to weapon-net (grab, maneuvers, escape); the delegating weapon keeps its own identity and its own control-bound effects.', { dataAction: 'DATA_COMPLETENESS backfilled into the canonical SSOT amendments (source-cited)' }),
  opImpl('maximumGrabRangeIncrement', GR, 'range-gate', CR, 'maximumGrabRangeIncrement', 'Snare Pistol / Rifle: a ranged grab is made no farther than Short range (the Rifle value is a source-cited backfill, Scum and Villainy p.51). Refused before any cost in the attack stage.'),
  opImpl('featTalentBonusesTreatGrabAsGarroteAttack', AM, 'identity-preserved-grab', CR, 'featTalentBonusesTreatGrabAsGarroteAttack', 'Garrote: bonuses from talents and feats that apply to the garrote apply to its grab attack. The grab attack IS the canonical garrote attack (identity preserved), so the ordinary selector join applies them; the declaration records the treatment.'),
  opImpl('attackTreatedAs', AM, 'identity-preserved-grab', CR, 'attackTreatedAs', 'Garrote: an attack with it is treated as a grab attack (normal grab penalty by canonical Grabber / Entangler identity; weapon identity preserved).'),
  opImpl('ongoingEffect', COND, 'grabbed-target-effect', CR, 'ongoingEffect', 'Garrote: at the START of the grabbed target\'s turn, before it acts, repeat the garrote\'s base damage and move -1 CT, in addition to the grab. Bound to the control record, idempotent per turn slot, ended with the grab.'),
  opImpl('maxTargetSize', GR, 'size-gate', CR, 'maxTargetSize', 'Tactical Tractor Beam: affects only Huge or smaller targets (the one generic size gate, canonical size rank).'),
  opImpl('moveGrabbedObjectSquares', GR, 'tractor-move', CR, 'moveGrabbedObjectSquares', 'Tactical Tractor Beam: a grabbed object can be moved up to 10 squares in any direction (structured movement intent; the token move stays GM / player adjudicated).'),
  opImpl('hurlGrabbedObjectRangeSquares', GR, 'tractor-hurl', CR, 'hurlGrabbedObjectRangeSquares', 'Tactical Tractor Beam: hurl at a target within 10 squares with a new ranged attack against Reflex.'),
  opDup('ongoingStunWhileTrapped', SI, 'trapped-effect', 'attackProfiles[].triggeredEffects[ongoing-net-shock]', CR, 'ongoing-net-shock', VERIFY.netShock, 'Electronet: the weapon-level flag duplicates the profile triggered effect (3d8 stun at the beginning of the ATTACKER\'s turn while the target is still trapped, no damage modifiers), which the control declaration reads.'),
  opImpl('blastEffect', AS, 'restraint', CR, 'blastEffect', 'Adhesive Grenade: every target in the blast makes a grapple check against the attacker\'s ranged attack roll; failure leaves it immobilized for 3 rounds. An equipment restraint: the attacker is not grappling, there is no grab state and no further check.'),
  opDup('tractorControl', GR, 'tractor', 'operation.tractorControl (acquisition / maintain / move / hurl)', CR, 'tractorControl', (reg) => carriers(reg, 'tractorControl').length > 0 && carriers(reg, 'tractorControl').every((r) => r.operation.tractorControl?.acquisition?.then === 'opposed-grapple-check' && r.operation.tractorControl?.maintain?.timing === 'start-of-controller-turn'), 'Tactical Tractor Beam structure backfill (Galaxy at War p.42 / Core p.174): the structured carrier is the control declaration source itself.'),
  opDup('hurledObjectDamageRule', DM, 'falling-object-damage', 'operation.tractorControl.hurl.damageAuthority = falling-object-by-object-size', `${E}falling-object-rules.js`, 'fallingObjectDamage', (reg) => carriers(reg, 'hurledObjectDamageRule').length > 0 && carriers(reg, 'hurledObjectDamageRule').every((r) => r.operation.tractorControl?.hurl?.damageAuthority === 'falling-object-by-object-size'), 'Hurled objects deal FALLING-OBJECT damage by object size (never the beam\'s own 3d6). The authority mechanism is implemented; see the falling-object table row.'),
  opOther('fallingObjectDamageTable', DM, 'falling-object-damage', 'DATA_COMPLETENESS', 'final-certification', 'Core Rulebook Table 14-2 (falling-object damage by size): the damage column is not legible in the repo text layer, so no damage value is certified; fallingObjectDamage refuses with falling-object-table-uncertified rather than invent values. Needs the PDF-certified table.', { virtual: true }),
  opImpl('pinTripSubstitution', GR, 'maneuver-entitlement', CR, 'pinTripSubstitution', 'Amphistaff whip form: Pin / Trip without owning the feat. Entitlement is the weapon declaration plus canonical proficiency; no feat Item is created.'),

  // ---- special mechanics (5D-E census) ---------------------------------------------------------------------------------------------------------------
  mImpl('lightsaber-chassis-lightwhip', 'triggered-0', 'grab-initiation', WC, 'initiateControl', 'Lightwhip hit: may initiate a grab (grapple through the ordinary opposed check); DC 15 Acrobatics escape.'),
  mImpl('lightsaber-chassis-lightwhip', 'triggered-1', 'recurring-held-damage', WC, 'processControlTurnEvent', 'Lightwhip: a creature ENDING its turn held takes the weapon\'s base damage only (no Strength / half level / other modifiers / critical).'),
  mImpl('unmapped::Amphistaff', 'pin-without-feat', 'maneuver-entitlement', WC, 'performEntitledManeuver', 'Amphistaff whip-pin: resolves as Pin without the feat.'),
  mImpl('unmapped::Amphistaff', 'trip-without-feat', 'maneuver-entitlement', WC, 'performEntitledManeuver', 'Amphistaff whip-trip: resolves as Trip without the feat.'),
  mImpl('unmapped::Garrote', 'operation.control', 'grab-initiation', WC, 'initiateControl', 'Garrote: the attack is a grab (weapon identity preserved).'),
  mImpl('unmapped::Garrote', 'triggered-0', 'recurring-held-damage', WC, 'processControlTurnEvent', 'Garrote: base damage and -1 CT at the start of the grabbed target\'s turn; cancelled when the grab ends. Whether Strength / other modifiers apply is NOT stated by the certified entry: base dice only (documented uncertainty, never silently automated further).'),
  mImpl('unmapped::Shock Whip', 'optional-grab-on-hit', 'grab-initiation', WC, 'secondAttack', 'Shock Whip: optional free second attack roll at the normal attack bonus (no -5), target at most one size larger.'),
  mImpl('unmapped::Shock Whip', 'trip-substitution', 'trip-substitution', WC, 'tripSubstitution', 'Shock Whip: with the Trip feat (canonical identity) the whip may knock the target prone instead of the grab attack.'),
  mImpl('unmapped::Shock Whip', 'grabbed-target-shock', 'swift-shock', WC, 'shockHeldTarget', 'Shock Whip: once per turn, swift action, 2d6 energy on the held target with no attack roll.'),
  mImpl('unmapped::Shock Whip', 'weapon-locked-while-grabbing', 'weapon-lock', WC, 'weaponLockFor', 'Shock Whip: while holding a target the weapon cannot attack other targets.'),
  mImpl('weapon-electronet', 'grab-on-hit', 'grab-initiation', WC, 'initiateControl', 'Electronet hit: grabs as a normal net; its stun damage (3d8) is the weapon\'s ordinary damage on the same card (alsoDealStun is carried by that damage, never rolled twice).'),
  mImpl('weapon-electronet', 'ongoing-net-shock', 'recurring-held-damage', WC, 'processControlTurnEvent', 'Electronet: 3d8 stun at the beginning of the ATTACKER\'s turn while the target is still trapped; ends when the target escapes.'),
  mImpl('weapon-net', 'operation.control', 'grab-initiation', WC, 'initiateControl', 'Net: ranged grab / grapple with Pin / Trip allowed and Crush / Throw disallowed.'),
  mImpl('weapon-snare-pistol', 'operation.control', 'grab-initiation', WC, 'initiateControl', 'Snare Pistol: ranged grab no farther than Short range.'),
  mImpl('weapon-snare-pistol', 'stun-on-successful-grab', 'grab-stun', CR, 'carriedByBaseDamage', 'Snare Pistol: 1d4 stun on a successful grab with no further attack roll. It IS the weapon\'s ordinary (native stun) damage, rolled and applied by the card\'s normal Damage / Apply Damage path; the declaration records carriedByBaseDamage so the control never rolls it again.'),
  mImpl('weapon-snare-pistol', 'escape-options', 'escape-route', GS, 'escapeOptionsFor', 'Snare: Acrobatics DC 15 or Strength DC 20 escape (the uniform escape-options contract).'),
  mImpl('weapon-snare-rifle', 'operation.control', 'grab-initiation', WC, 'initiateControl', 'Snare Rifle: ranged grab no farther than Short range (source-cited backfill).'),
  mImpl('weapon-snare-rifle', 'stun-on-successful-grab', 'grab-stun', CR, 'carriedByBaseDamage', 'Snare Rifle: 1d6 stun on a successful grab with no further attack roll; the weapon\'s ordinary native stun damage (carriedByBaseDamage), never rolled twice.'),
  mImpl('weapon-snare-rifle', 'escape-options', 'escape-route', GS, 'escapeOptionsFor', 'Snare: Acrobatics DC 15 or Strength DC 20 escape.'),
  mImpl('weapon-stokhli-spray-stick', 'operation.control', 'delegation', WC, 'initiateControl', 'Stokhli Spray Stick webbing: the NET\'s control declaration through delegation.'),
  mImpl('weapon-adhesive-grenade', 'operation.blastEffect', 'restraint', WC, 'applyRestraint', 'Adhesive Grenade restraint blast (per-target grapple check against the ranged attack roll; immobilized 3 rounds).'),
  mImpl('weapon-tactical-tractor-beam', 'operation.tractorControl', 'tractor', WC, 'acquireTractor', 'Tactical Tractor Beam: acquisition (attack vs Reflex, then opposed grapple check), maintenance each operator turn, move up to 10 squares, hurl up to 10 squares.'),

  // ---- relation -----------------------------------------------------------------------------------------------------------------------------------
  rel('PROFICIENT_WIELDER_MAY_USE_AS_THOUGH_POSSESSING_FEAT_IN_WHIP_FORM', 'IMPLEMENTED', WC, 'entitlementOf', 'Amphistaff whip form: a proficient wielder may use Pin / Trip as though possessing the feat. The deferral marker is removed: the relation is consumed by the control entitlement (no feat Item created).'),
]);

// virtual rows describe a certified-data gap that has no operation key of its own (the mechanism is covered by the row of the key that needs it)
export const I_C_B_BASELINE = Object.freeze({ UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER: 109, RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER: 144, UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER: 14, EXECUTABLE_FORM_MECHANICS_DEFERRED: 25, SPECIAL_DEFER_I_C_B: 15, SPECIAL_DEFER_I_C_C: 7, SPECIAL_DEFER_I_D: 3, EXECUTABLE_RELATION_FAMILIES_DEFERRED: 7, GRAB_GRAPPLE_RESTRAIN_UNCONSUMED_KEYS: 14 });
// filled from the regenerated closure census when the manifest is built (see tools/census-weapon-phase-5d-i-c-b-inputs.mjs I_C_B_AFTER)
export const I_C_B_AFTER = Object.freeze({});
