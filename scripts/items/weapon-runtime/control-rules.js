// Phase 5D-I-C-B -- declarative weapon CONTROL contract (grab / grapple / restrain / net / snare / tractor / hurl).
// "Weapons declare what they are. Abilities declare what they apply to." This module turns the STRUCTURED control fields of a canonical weapon
// (operation keys + profile triggeredEffects, all enumerated ids / numbers -- never a weapon name or description text) into ONE declaration, and
// answers the pure questions about it: size gate, range gate, which maneuvers are legal, which escapes exist, which recurring effects bind to the
// held target, whether the weapon is locked. It never mutates, rolls or posts: the existing grapple system (GrappleStateEngine / SWSEGrappling)
// stays the only owner of grab / grapple / pin state; weapon-control-effects.js executes the declaration through it.
import { SIZE_RANK } from './condition-policy.js';

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const slug = (s) => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** distinct control states: a weapon control never collapses grabbed / grappled / pinned / restrained into one flag */
export const CONTROL_STATES = Object.freeze({ GRABBED: 'grabbed', GRAPPLED: 'grappled', PINNED: 'pinned', RESTRAINED: 'restrained', TRAPPED: 'trapped', TRACTORED: 'tractored' });

export const MANEUVERS = Object.freeze(['pin', 'trip', 'crush', 'throw']);

/** range bands in increasing order (a `maximumGrabRangeIncrement` caps the band a ranged grab may use) */
const BAND_ORDER = Object.freeze(['pointBlank', 'short', 'medium', 'long']);
const bandOf = (s) => { const k = slug(s); return BAND_ORDER.find((b) => slug(b) === k) ?? null; };

/** the one size authority: canonical rank of a size token (null when unknown -> the gate refuses, never guesses) */
export function sizeRankOf(size) {
  const want = slug(size);
  const key = Object.keys(SIZE_RANK ?? {}).find((k) => slug(k) === want);
  const r = key === undefined ? undefined : SIZE_RANK[key];
  return Number.isFinite(r) ? r : null;
}

/**
 * Generic size gate ("no more than one size category larger", "Huge or smaller").
 *   { maxDelta:1 }            target rank <= controller rank + 1
 *   { maxSize:'huge' }        target rank <= rank(Huge)
 * @returns {{ok:boolean, reason?:string}}
 */
export function sizeGate({ controllerSize, targetSize, maxDelta = null, maxSize = null } = {}) {
  const t = sizeRankOf(targetSize);
  if (t === null) return { ok: false, reason: 'target-size-unobserved' };
  if (maxSize != null) {
    const m = sizeRankOf(maxSize);
    if (m === null) return { ok: false, reason: 'size-limit-unrecognized' };
    return t <= m ? { ok: true } : { ok: false, reason: 'target-too-large' };
  }
  if (maxDelta != null) {
    const c = sizeRankOf(controllerSize);
    if (c === null) return { ok: false, reason: 'controller-size-unobserved' };
    return t <= c + Number(maxDelta) ? { ok: true } : { ok: false, reason: 'target-too-large' };
  }
  return { ok: true };
}

/** ranged control range gate: the band of the attack must not exceed the weapon's maximum grab band */
export function rangeGate(declaration, band) {
  const cap = declaration?.grab?.maxBand ?? null;
  if (!cap) return { ok: true };
  const b = bandOf(band);
  if (b === null) return { ok: false, reason: 'range-band-unobserved' };
  return BAND_ORDER.indexOf(b) <= BAND_ORDER.indexOf(cap) ? { ok: true } : { ok: false, reason: 'beyond-maximum-grab-range' };
}

const ESCAPE_METHODS = Object.freeze({ acrobatics: 'acrobatics', strength: 'strength', 'break-strength': 'strength' });

function escapeRoutes(op, effects) {
  const out = [];
  const push = (method, dc, via) => {
    const m = ESCAPE_METHODS[slug(method)];
    if (m && Number.isFinite(Number(dc)) && !out.some((r) => r.method === m && r.dc === Number(dc))) out.push({ method: m, dc: Number(dc), via });
  };
  if (Number.isFinite(Number(op?.escapeAcrobaticsDC))) push('acrobatics', op.escapeAcrobaticsDC, 'operation.escapeAcrobaticsDC');
  if (Number.isFinite(Number(op?.breakStrengthDC))) push('strength', op.breakStrengthDC, 'operation.breakStrengthDC');
  for (const e of effects) {
    if (e?.escape?.method) push(e.escape.method, e.escape.DC ?? e.escape.dc, 'triggeredEffects.escape');
    for (const o of asArray(e?.options)) push(o?.method, o?.dc ?? o?.DC, 'triggeredEffects.options');
  }
  return out;
}

const baseFormula = (definition) => (/^\d+d\d+$/.test(String(definition?.damage?.formula ?? '')) ? definition.damage.formula : null);
const baseTypes = (definition) => asArray(definition?.damageType?.types ?? definition?.damageTypes).map(String);
const maneuverSet = (list) => new Set(asArray(list).map((m) => slug(m)).filter((m) => MANEUVERS.includes(m)));

/**
 * Build the control declaration of a weapon form.
 * @param {{identityKey?:string, operation?:object, definition?:object}} weapon  registry identity operation + the selected profile definition
 * @param {{resolveIdentity?:(key:string)=>object|null}} [ctx]  resolves a delegated identity (Stokhli Spray Stick -> Net); injected, never looked up by name
 * @returns {object|null} null when the weapon declares no control
 */
export function controlDeclarationOf({ identityKey = null, operation = null, definition = null } = {}, ctx = {}) {
  const op = operation ?? {};
  const effects = asArray(definition?.triggeredEffects);
  const byId = (id) => effects.find((e) => e?.id === id) ?? null;
  const d = { identityKey, kinds: [], prohibitedAbilities: [], grab: null, treatedAs: null, maneuvers: { allowed: [], prohibited: [] }, escape: [], recurring: [], lockWeapon: false,
    tripSubstitution: null, shock: null, restraint: null, tractor: null, entitlement: null, stunOnGrab: null, delegatedFrom: null };

  // delegation: "functions as a net" / "grabs as with a normal net" resolves to the NET's own declaration (grab, maneuvers, escape); nothing is cloned into the
  // delegating record. The delegating weapon keeps its own identity and its own control-bound effects (Electronet's recurring stun).
  let inherited = null;
  if (op.treatControlAs?.identityKey && ctx.resolveIdentity) {
    const target = ctx.resolveIdentity(op.treatControlAs.identityKey);
    if (target) inherited = controlDeclarationOf({ identityKey: op.treatControlAs.identityKey, operation: target.operation, definition: null }, {});
  }

  // --- grab / grapple initiation ---------------------------------------------------------------------------------------------------------------
  const grabOnHit = effects.find((e) => e?.effect === 'may-initiate-grab-or-grapple' || e?.effect === 'target-grabbed' || e?.id === 'optional-grab-on-hit');
  const mode = definition?.attackResolution?.mode ?? null;
  const ranged = op.rangedGrabOrGrapple === true || op.canInitiateGrabOrGrappleAtRange === true || op.webbingFunctionsAsNet === true;
  if (grabOnHit || mode === 'grab' || ranged || op.attackTreatedAs === 'grab') {
    d.kinds.push('grab');
    d.grab = {
      onHit: !!grabOnHit && grabOnHit.optional !== true,
      optional: grabOnHit?.optional === true,
      freeAction: grabOnHit?.action === 'free',
      secondAttack: grabOnHit?.resolution?.makeSecondAttackRoll === true,
      noGrabPenalty: grabOnHit?.resolution?.normalGrabPenaltyApplied === false,
      attackBonus: grabOnHit?.resolution?.attackBonus ?? null,
      maxSizeDelta: /one-size-category-larger/.test(String(grabOnHit?.targetSizeLimit ?? '')) ? 1 : null,
      ranged,
      maxBand: bandOf(op.maximumGrabRangeIncrement),
      mayGrapple: grabOnHit?.effect === 'may-initiate-grab-or-grapple',
      normalNetRules: grabOnHit?.resolution === 'normal-net-grab-rules',
    };
  }
  if (op.attackTreatedAs === 'grab') d.treatedAs = { attack: 'grab', featsApplyAsGarroteAttack: op.featTalentBonusesTreatGrabAsGarroteAttack === true };

  // --- maneuvers ---------------------------------------------------------------------------------------------------------------------------------
  // `allowedFeats` / `disallowedFeats` are the Snare Pistol / Rifle spelling of the same lists (their only carriers); only enumerated grapple maneuvers
  // count here, so a multi-shot weapon listing Rapid Shot style feats is unaffected. A listed non-maneuver ability (Bone Crusher) is kept as data.
  d.maneuvers.allowed = [...new Set([...maneuverSet(op.allowedGrappleFeats), ...maneuverSet(op.allowedFeats)])];
  d.maneuvers.prohibited = [...new Set([...maneuverSet(op.prohibitedGrappleFeats), ...maneuverSet(op.disallowedFeats)])];
  d.prohibitedAbilities = asArray(op.disallowedFeats).map(slug).filter((x) => x && !MANEUVERS.includes(x));
  if (op.pinAndTripAllowed === true) for (const m of ['pin', 'trip']) if (!d.maneuvers.allowed.includes(m)) d.maneuvers.allowed.push(m);
  if (op.crushAndThrowDisallowed === true) for (const m of ['crush', 'throw']) if (!d.maneuvers.prohibited.includes(m)) d.maneuvers.prohibited.push(m);
  if (op.pinTripSubstitution?.feat === 'none-required') {
    d.entitlement = { maneuvers: [...maneuverSet(op.allowedGrappleFeats)], profileIds: asArray(op.pinTripSubstitution.profileIds), requiresProficientWielder: op.pinTripSubstitution.requiresProficientWielder === true, createsFeatItems: false };
    d.kinds.push('entitlement');
  }

  // --- escape ------------------------------------------------------------------------------------------------------------------------------------
  d.escape = escapeRoutes(op, effects);

  // --- recurring control-bound effects -------------------------------------------------------------------------------------------------------------
  const og = op.ongoingEffect;
  if (og?.repeatBaseWeaponDamage === true && /start-of-grabbed-target-turn/.test(String(og.timing ?? ''))) {
    d.recurring.push({ id: 'held-target-start-turn-damage', timing: { owner: 'held-target', point: 'start' }, while: 'held', damage: { source: 'weapon-base-damage', modifiers: 'unstated', baseFormula: baseFormula(definition), types: baseTypes(definition) },
      conditionTrackSteps: Number.isFinite(Number(og.conditionTrackSteps)) ? Number(og.conditionTrackSteps) : 0, source: 'operation.ongoingEffect' });
    d.kinds.push('recurring');
  }
  for (const e of effects) {
    if (e?.effect === 'damage' && e.damageSource === 'weapon-base-damage' && /target-ends-turn-grabbed-or-grappled/.test(String(e.trigger ?? ''))) {
      d.recurring.push({ id: 'held-target-end-turn-damage', timing: { owner: 'held-target', point: 'end' }, while: 'held', damage: { source: 'weapon-base-damage', modifiers: 'base-dice-only', exclude: asArray(e.modifierPolicy?.exclude), baseFormula: baseFormula(definition), types: baseTypes(definition) }, source: 'profile.triggeredEffects' });
      d.kinds.push('recurring');
    }
    if (e?.id === 'ongoing-net-shock' && e.trigger === 'beginning-of-wielder-turn' && e.condition === 'target-still-trapped-by-this-electronet') {
      d.recurring.push({ id: 'ongoing-net-shock', timing: { owner: 'controller', point: 'start' }, while: 'trapped', damage: { source: 'formula', formula: e.damage?.formula, type: 'stun', modifiers: 'none' }, source: 'profile.triggeredEffects' });
      d.kinds.push('recurring');
    }
  }
  if (op.ongoingStunWhileTrapped === true && !d.recurring.some((r) => r.while === 'trapped')) d.kinds.push('trapped');

  // --- stun on successful ranged grab (Snare Pistol / Rifle) -----------------------------------------------------------------------------------------
  const snareStun = byId('stun-on-successful-grab');
  if (snareStun?.damage?.formula) d.stunOnGrab = { formula: snareStun.damage.formula, source: 'profile.triggeredEffects', carriedByBaseDamage: true };
  const netStun = effects.find((e) => e?.id === 'grab-on-hit' && e.alsoDealStun?.formula);
  if (netStun) d.stunOnGrab = { formula: netStun.alsoDealStun.formula, source: 'profile.triggeredEffects', carriedByBaseDamage: true };

  // --- Shock Whip: trip substitution / swift shock / weapon lock ---------------------------------------------------------------------------------------
  const trip = byId('trip-substitution');
  if (trip) d.tripSubstitution = { requiresFeatKey: slug(trip.requiresFeat), replaces: trip.replaces ?? null };
  const shock = byId('grabbed-target-shock');
  if (shock?.damage?.formula) d.shock = { formula: shock.damage.formula, action: shock.action ?? 'swift', per: shock.frequency === 'once-per-turn' ? 'turn' : null, attackRollRequired: shock.attackRollRequired !== false, damageType: asArray(shock.damageType?.types)[0] ?? null };
  if (byId('weapon-locked-while-grabbing')?.effect === 'cannot-attack-other-targets-with-this-weapon') d.lockWeapon = true;

  // --- Adhesive Grenade: per-target restraint check ---------------------------------------------------------------------------------------------------
  const be = op.blastEffect?.structure;
  if (be?.check?.kind === 'grapple' && be.check.against === 'attacker-ranged-attack-roll') {
    d.restraint = { check: 'grapple', against: 'attacker-ranged-attack-roll', comparison: be.check.comparison, onFailure: { status: be.onFailure?.status, durationRounds: Number(be.onFailure?.durationRounds) }, furtherCheck: be.afterBreakingFree?.furtherCheck === true, attackerIsGrappling: false };
    d.kinds.push('restraint');
  }

  // --- Tactical Tractor Beam: grabbed-object model ---------------------------------------------------------------------------------------------------
  const tc = op.tractorControl;
  if (tc && op.maxTargetSize) {
    d.tractor = {
      maxSize: slug(op.maxTargetSize),
      acquisition: { defense: tc.acquisition?.defense ?? null, comparison: tc.acquisition?.comparison ?? null, then: tc.acquisition?.then ?? null },
      maintain: { timing: tc.maintain?.timing ?? null, check: tc.maintain?.check ?? null, onLoss: tc.maintain?.onLoss ?? null },
      move: { squares: Number(tc.move?.squares ?? op.moveGrabbedObjectSquares), direction: tc.move?.direction ?? null },
      hurl: { squares: Number(tc.hurl?.rangeSquares ?? op.hurlGrabbedObjectRangeSquares), defense: tc.hurl?.defense ?? null, comparison: tc.hurl?.comparison ?? null, damageAuthority: tc.hurl?.damageAuthority ?? null },
    };
    d.kinds.push('tractor');
  }

  if (inherited) {
    d.grab = d.grab ?? inherited.grab;
    d.maneuvers.allowed = [...new Set([...d.maneuvers.allowed, ...inherited.maneuvers.allowed])];
    d.maneuvers.prohibited = [...new Set([...d.maneuvers.prohibited, ...inherited.maneuvers.prohibited])];
    for (const r of inherited.escape) if (!d.escape.some((x) => x.method === r.method && x.dc === r.dc)) d.escape.push({ ...r, via: `delegated:${op.treatControlAs.identityKey}` });
    d.delegatedFrom = { identityKey: op.treatControlAs.identityKey, via: op.treatControlAs.via ?? null };
    if (d.grab && !d.kinds.includes('grab')) d.kinds.push('grab');
  }
  if (d.grab && !d.kinds.includes('grab')) d.kinds.push('grab');
  d.kinds = [...new Set(d.kinds)];
  d.recurring = Object.freeze(d.recurring);
  return d.kinds.length || d.entitlement ? Object.freeze(d) : null;
}

/** is a maneuver legal under this control declaration? (prohibited wins; an allowed list means "also with this weapon", never "only") */
export function maneuverLegality(declaration, maneuver) {
  const m = slug(maneuver);
  if (!declaration) return { legal: null };
  if (declaration.maneuvers.prohibited.includes(m)) return { legal: false, reason: `weapon-prohibits-${m}` };
  if (declaration.maneuvers.allowed.includes(m)) return { legal: true, via: 'weapon-allows' };
  return { legal: null };
}

/**
 * Recurring effects due at a turn boundary.
 * @param {object} control        the stored control record (see controlRecord)
 * @param {{actorId:string, point:'start'|'end'}} event   whose turn boundary this is
 * @returns {Array<object>} the recurring specs that fire now (the caller still checks `while` against the live state)
 */
export function dueRecurring(control, { actorId, point } = {}) {
  if (!control || control.ended) return [];
  return asArray(control.recurring).filter((r) => {
    if (r.timing.point !== point) return false;
    const owner = r.timing.owner === 'controller' ? control.controllerId : control.targetId;
    return String(owner) === String(actorId);
  });
}

/** idempotency key of one recurring firing (control + recurring id + the turn boundary it belongs to) */
export const recurringEventId = (control, recurringId, { round, turn, point }) => `${control.id}:${recurringId}:${round}:${turn}:${point}`;

/**
 * The persisted control record. State, controller, target, source weapon provenance, constraints and the cleanup contract.
 * Pure data: stored in the existing grapple-state ActiveEffect flag (`flags.swse.grappleState.control`) -- not a second state store.
 */
export function controlRecord(declaration, { id, controllerId, targetId, state, weapon = null, profileId = null, workflowId = null, extra = {} } = {}) {
  return {
    id, version: 1, state, controllerId, targetId,
    source: { identityKey: declaration?.identityKey ?? null, weaponId: weapon?.id ?? null, weaponUuid: weapon?.uuid ?? null, profileId, workflowId, delegatedFrom: declaration?.delegatedFrom ?? null },
    constraints: { maxBand: declaration?.grab?.maxBand ?? null, maxSizeDelta: declaration?.grab?.maxSizeDelta ?? null, tractorMaxSize: declaration?.tractor?.maxSize ?? null },
    maneuvers: { allowed: [...(declaration?.maneuvers?.allowed ?? [])], prohibited: [...(declaration?.maneuvers?.prohibited ?? [])] },
    escape: (declaration?.escape ?? []).map((r) => ({ ...r })),
    lockWeapon: declaration?.lockWeapon === true,
    ...(declaration?.shock ? { shock: { ...declaration.shock, lastRound: null } } : {}),
    recurring: (declaration?.recurring ?? []).map((r) => ({ ...r })),
    ended: false, endReason: null, createdAt: Date.now(), processed: [],
    ...extra,
  };
}

export const CONTROL_END_REASONS = Object.freeze(['escaped', 'released', 'controller-removed', 'target-removed', 'weapon-removed', 'weapon-unequipped', 'controller-incapacitated', 'size-gate-failed', 'maintenance-failed', 'expired', 'hurled', 'weapon-dropped']);

/** the grab attack penalty: Grabber 0, Entangler -2, otherwise -5 (talents resolved by canonical identity slug, never the display name) */
export const grabAttackPenalty = (abilityKeys) => { const keys = asArray(abilityKeys); return keys.includes('grabber') ? 0 : keys.includes('entangler') ? -2 : -5; };
