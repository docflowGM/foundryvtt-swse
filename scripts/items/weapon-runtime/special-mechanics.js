// Phase 5D-E -- canonical single-attack special-mechanic consumption.
// The canonical runtime is the RULE SELECTOR: it says which structured special mechanics the selected attack form carries,
// when they fire, and whether each is automatic, needs a player/GM answer, or is deferred. Execution stays with the
// existing systems (damage composition, DamagePacket/Apply Damage, CombatTargetEffectAdapter -> ActorEngine, the modifier
// pipeline). This module is PURE: no actor/item mutation, no chat, no dice. Classification is by STRUCTURE (field names and
// enumerated values of the canonical schema) -- never by weapon name and never by description text.
//
// Policy vocabulary
//   AUTO            fully structured and observable -> executed through an existing system without asking
//   PROMPT          executable once someone supplies a fact the runtime cannot observe; the answer is stored in the workflow
//                   context / message and never re-asked
//   DEFER           executable in principle but needs a subsystem owned by a later phase (grapple, multi-attack, turn-start
//                   persistence, ...); the form still resolves, the mechanic is surfaced, nothing is fabricated
//   DISPLAY_ONLY    purely informational (no mechanical effect on this single attack)
//   VALIDATION_ONLY constrains legality (firing limits) -- checked, never "executed"

import { policyFor, evaluateCondition, conditionContextKeys, SIZE_RANK } from './condition-policy.js';
import { controlDeclarationOf } from './control-rules.js';
import { getSharedWeaponAuthorityRegistry } from './weapon-authority-registry.js';

export const POLICY = Object.freeze({ AUTO: 'AUTO', PROMPT: 'PROMPT', DEFER: 'DEFER', DISPLAY_ONLY: 'DISPLAY_ONLY', VALIDATION_ONLY: 'VALIDATION_ONLY' });

export const TIMING = Object.freeze({
  ON_ATTACK: 'on-attack', ON_HIT: 'on-hit', ON_MISS: 'on-miss', ON_DAMAGE_ROLL: 'on-damage-roll', ON_CRITICAL: 'on-critical',
  AFTER_DAMAGE: 'after-damage', AFTER_MITIGATION: 'after-mitigation', TURN_START: 'turn-start', TURN_END: 'turn-end', CONTINUOUS: 'continuous',
  // Phase 5D-I-C-A: outcome / persistent-effect timings (no ambiguous generic "after")
  AFTER_THRESHOLD: 'after-threshold', TIME_DELAY: 'time-delay', UNTIL_CURED: 'until-cured',
  // Phase 5D-I-C-C: the defender's reaction roll (Block / Deflect) -- a different moment from this weapon's own attack
  ON_REACTION: 'on-reaction',
});

/** family id -> default policy/timing/description. The census and the runtime share this single table. */
export const FAMILIES = Object.freeze({
  'damage-multiplier':        { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL, note: 'multiplies the weapon base damage dice through the existing damage composition' },
  'critical-die-replace':     { policy: POLICY.AUTO,     timing: TIMING.ON_CRITICAL,    note: 'critical hit replaces the base die size (composition base)' },
  'critical-bonus-damage':    { policy: POLICY.AUTO,     timing: TIMING.ON_CRITICAL,    note: 'critical hit adds a formula after the critical multiplier (composition critical bonus)' },
  'damage-rider':             { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL, note: 'separately rolled typed damage component applied in the same damage event' },
  'dr-ignore':                { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL, note: 'form ignores damage reduction: the packet component is tagged bypass-dr and the existing DR resolver honors it' },
  'dr-conditional':           { policy: POLICY.PROMPT,   timing: TIMING.ON_ATTACK,      note: 'DR is ignored only under a stated condition the runtime cannot observe; answered once and stored' },
  'native-stun':              { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'form deals stun damage by default (damage mode)' },
  'ct-rider':                 { policy: POLICY.AUTO,     timing: TIMING.AFTER_DAMAGE,   note: 'condition-track shift executed at Apply Damage through CombatTargetEffectAdapter' },
  'ct-overwhelming-stun':     { policy: POLICY.AUTO,     timing: TIMING.AFTER_DAMAGE,   note: 'stun damage >= current HP shifts the condition track (existing CT infrastructure)' },
  'attack-modifier-auto':     { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'conditional attack modifier whose condition is observable from the actor/target' },
  'attack-modifier-prompt':   { policy: POLICY.PROMPT,   timing: TIMING.ON_ATTACK,      note: 'conditional attack modifier whose condition is not observable; answered once and stored' },
  'ct-rider-prompt':          { policy: POLICY.PROMPT,   timing: TIMING.AFTER_DAMAGE,   note: 'condition-track rider whose trigger cannot be evaluated automatically; answered once and stored' },
  'multi-attack-interaction': { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'attack modifier that applies while Double/Triple Attack, Rapid Shot or Rapid Strike is in use (Phase 5D-F: consumed at attack time from the active multi-attack shape)' },
  // Phase 5D-I-C-C: profile-level MIRRORS of the weapon's reaction / passive-defense numbers. The numeric authority is the operation field, resolved once by
  // reaction-rules; these mechanics make the mirror classified (and census-verified to agree) instead of an anonymous deferral.
  'reaction-modifier':        { policy: POLICY.AUTO,     timing: TIMING.ON_REACTION,    note: 'modifier to the wielder\'s Use the Force check made with Block / Deflect: consumed by the reaction roll through reaction-rules (operation field = numeric authority)' },
  'passive-defense':          { policy: POLICY.AUTO,     timing: TIMING.CONTINUOUS,     note: 'contextual Reflex Defense penalty of the wielder against adjacent attackers while the persistent setting is in effect: consumed by the attack pipeline\'s target-side defense stage' },
  'defensive-interaction':    { policy: POLICY.DEFER,    timing: TIMING.CONTINUOUS,     note: 'modifies the wielder\'s defenses/Use the Force checks rather than this single attack' },
  // Phase 5D-I-C-B: weapon control is CONSUMED by the existing grapple state machine (GrappleStateEngine / SWSEGrappling) through the declarative control
  // contract (control-rules) and weapon-control-effects; each mechanic carries a `role` (initiate / restraint / tractor / entitled-maneuver are executable
  // records; recurring / shock / weapon-lock / escape / grab-stun / trip-substitution are parts of the control declaration those records carry).
  'grab-grapple':             { policy: POLICY.AUTO,     timing: TIMING.ON_HIT,         note: 'weapon control (grab / grapple / restrain / net / snare / tractor): initiated through the existing grapple state machine; control-bound effects ride on its state' },
  'status-condition':         { policy: POLICY.DEFER,    timing: TIMING.AFTER_DAMAGE,   note: 'status condition (prone/disabled/concealment) with no single existing setter' },
  'persistent-effect':        { policy: POLICY.DEFER,    timing: TIMING.TURN_START,     note: 'delayed/recurring effect resolved at a later turn boundary' },
  'special-action':           { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'replaces the attack with another action (Pin/Trip/Venom Spit) -- refused, not substituted' },
  'payload-effect':           { policy: POLICY.DEFER,    timing: TIMING.ON_HIT,         note: 'effect-only payload (flash/gas/toxin) without complete structure' },
  'prepared-attack':          { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'swift-action preparation / bracing: CONSUMED by the owned fire-state (FireStateStore.primePreparedAttack / previewReadiness, Phase 5D-G / 5D-I-A); classified AUTO so the census stops reporting a superseded deferral' },
  'activation-effect':        { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'activated empowerment (Force Point / swift action) with own cost' },
  // Phase 5D-I-C-C: a weapon-NATIVE recovery rule (Darkstick: a thrown attack that exceeds Reflex by 5 or more returns to the wielder's hand). Not a feat, not a reaction.
  'return-recovery':          { policy: POLICY.AUTO,     timing: TIMING.ON_HIT,         note: 'weapon-native return on an attack margin over the target defense (thrown form only): a recovery record applied through the rider stage; nothing is removed from the owned weapon' },
  'firing-constraint':        { policy: POLICY.VALIDATION_ONLY, timing: TIMING.ON_ATTACK, note: 'limits shots per round/reload; checked against the existing multi-attack/ammo rules (Phase 5D-F)' },
  'conditional-damage':       { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL, note: 'weapon-declared damage term that applies under a structural attack fact (point-blank range / adjacent target); composed once in the existing damage composition' },
  'attack-resolution':        { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'selected form defense (reflex/fortitude/will) -- already consumed through targetContext.defenseType' },
  'display-note':             { policy: POLICY.DISPLAY_ONLY, timing: TIMING.CONTINUOUS, note: 'informational statement with no effect on resolving the single attack (e.g. concealed shot origin)' },
  // Phase 5D-I-C-A: attack-outcome / threshold / status / persistent-effect families (executed at Apply Damage by the existing pipeline)
  'threshold-adjustment':     { policy: POLICY.AUTO,     timing: TIMING.AFTER_MITIGATION, note: 'the attack lowers/raises the target\'s EFFECTIVE damage threshold for this damage event only (stored threshold untouched)' },
  'bonus-damage-rider':       { policy: POLICY.AUTO,     timing: TIMING.AFTER_THRESHOLD,  note: 'separate immediate damage event dealt after the triggering damage proves its threshold / condition-track result; never re-triggers riders' },
  'target-class-damage':      { policy: POLICY.AUTO,     timing: TIMING.AFTER_DAMAGE,     note: 'per-target damage scaling by structural target class (droid / vehicle / device / object vs organic) at packet finalization; composes with the existing area hit / miss / Evasion path' },
  'status-effect':            { policy: POLICY.AUTO,     timing: TIMING.AFTER_DAMAGE,     note: 'status / timed effect created on the target through ActorEngine.createActiveEffects with weapon provenance and a turn-owner lifecycle' },
  'delayed-damage':           { policy: POLICY.AUTO,     timing: TIMING.TIME_DELAY,       note: 'one delayed damage instance queued through the existing RecurringDamageEngine (start of the target\'s next turn)' },
  'persistent-poison':        { policy: POLICY.AUTO,     timing: TIMING.UNTIL_CURED,      note: 'persistent secondary-attack toxin run by the existing PoisonEngine (instance, recurrence, treatment, termination)' },
  'poison-delivery':          { policy: POLICY.AUTO,     timing: TIMING.AFTER_DAMAGE,     note: 'a poison coating selected on the owned weapon is delivered by PoisonEngine only when the attack deals damage; the weapon capability alone creates no poison' },
  'payload-delegation':       { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL,   note: 'payload rules come from the loaded canonical grenade (delegateLoadedPayload); the launcher applies only its own adjustment' },
  'unclassified':             { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'structured mechanic with no recognized family; surfaced, never silently dropped' },
});

/**
 * Phase 5D-I-C-A: the OWNER of every mechanic that is still DEFER (the census reports deferrals by owner; none is an unowned defect).
 *   I-C-B grab / grapple / restrain / net / snare / Pin / Trip / hurled objects     I-C-C Block / Deflect / reaction / defense interactions / return-on-reaction
 *   I-D   stealth & sensing consumption, weapon-object durability, activation empowerment with its own cost
 * A per-mechanic-id entry wins over the per-family one.
 */
export const DEFER_OWNER_BY_FAMILY = Object.freeze({
  'defensive-interaction': 'I-C-C', 'special-action': 'I-C-B', 'status-condition': 'I-D', 'activation-effect': 'I-D',
});
export const DEFER_OWNER_BY_ID = Object.freeze({
  'lingering-gas-concealment': 'I-D',   // the cloud is canonical structure; visibility / Stealth consumption is the sensing subsystem
  'fragile-disable-on-damage': 'I-D',   // "if the WEAPON takes any damage" is weapon-object durability, not a target outcome
});

const CT_HIT_TRIGGERS = new Set(['successful-hit', 'on-hit', 'hit']);
const CT_DEFENSE_TRIGGER = 'damage-dealt-and-attack-roll-equals-or-exceeds-defense';
const CT_BOTH_DEFENSE_TRIGGER = 'attack-roll-equals-or-exceeds-both-defenses';
const MULTI_ATTACK_RE = /double attack|triple attack|rapid (shot|strike)|multi-?shot|autofire/i;
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const mech = (family, id, extra = {}) => Object.freeze({ family, id, policy: FAMILIES[family].policy, timing: FAMILIES[family].timing, ...extra });

// "N steps" token of a structured duration ("until-end-of-attacker-next-turn" -> {owner:'attacker', through:'end-of-next-turn'})
function durationOwner(token) {
  const m = /^until-(start|end)-of-(attacker|target)-next-turn$/.exec(String(token ?? ''));
  return m ? { owner: m[2], through: `${m[1]}-of-next-turn` } : null;
}

/**
 * Phase 5D-I-C-A: structured outcome effects of a profile's triggeredEffects (status / delayed damage / persistent poison / poison delivery / gas CT
 * hit). Every branch keys on an ENUMERATED effect id or structured field of the canonical schema -- never a weapon name or description text.
 * Returns null when the entry is not an outcome effect (the older classification continues).
 */
function classifyOutcomeEffect(e, id, src, operation) {
  const eff = typeof e.effect === 'string' ? e.effect : null;
  const trigger = e.trigger ?? null;
  // area attack that moves the target on the condition track (Gas Grenade): a miss has no effect; Evasion lowers the shift; atmospheric protection is immune
  if (e.effect && typeof e.effect === 'object' && Number.isFinite(Number(e.effect.conditionTrackSteps)) && trigger === 'area-attack-hit') {
    const steps = Number(e.effect.conditionTrackSteps);
    const ev = Number(e.evasionEffect?.conditionTrackSteps);
    return mech('ct-rider', id, { source: src, trigger, steps: Math.abs(steps), direction: steps < 0 ? 'down' : 'up', persistent: false, defenses: [], requiresDamage: false, regardlessOfDamage: true,
      ...(Number.isFinite(ev) ? { evasionSteps: Math.abs(ev) } : {}), ...(typeof e.immunity === 'string' ? { immunity: e.immunity } : {}), data: e });
  }
  if (eff === 'target-knocked-prone' && trigger === 'successful-hit') {
    return mech('status-effect', id, { source: src, trigger, attackCondition: 'hit', status: 'prone', data: e });
  }
  if (eff === 'total-concealment-against-affected-creature' && trigger === 'area-attack-resolution') {
    const d = durationOwner(e.duration);
    if (d) return mech('status-effect', id, { source: src, trigger, attackCondition: 'hit', status: 'total-concealment-against-bearer', duration: d, immunity: e.blindCreaturesImmune === true ? 'blind-creatures' : null, data: e });
  }
  if (e.timing === 'start-of-target-next-turn' && trigger === 'attack-roll-equals-or-exceeds-both-defenses' && typeof e.damage?.formula === 'string' && asArray(e.defenses).length) {
    return mech('delayed-damage', id, { source: src, trigger, defenses: asArray(e.defenses).map(String), formula: e.damage.formula, qualifiers: asArray(e.damageType?.qualifiers).map(String), data: e });
  }
  if (e.effectType === 'persistent-secondary-attack' && e.persistentCondition === true) {
    return mech('persistent-poison', id, { source: src, trigger, data: e });
  }
  if (eff === 'deliver-loaded-toxin' && trigger === 'successful-damage-with-poison-carrying-dart') {
    return mech('poison-delivery', id, { source: src, trigger, requiresDamage: operation?.poisonDeliveryRequiresDamage === true, data: e });
  }
  return null;
}

/**
 * Phase 5D-I-C-B: the CONTROL role of a triggered effect, from enumerated ids / effects / triggers of the canonical schema (never names or prose).
 *   initiate           the weapon may grab / grapple on a hit (executable record)
 *   entitled-maneuver  Pin / Trip made with the weapon without owning the feat (executable record)
 *   trip-substitution  a Trip the weapon substitutes for its optional grab (declaration part)
 *   recurring | shock | weapon-lock | escape | grab-stun   declaration parts bound to the held target
 */
function controlRoleOf(e) {
  const eff = typeof e.effect === 'string' ? e.effect : '';
  const id = String(e.id ?? '');
  if (eff === 'resolve-as-pin-feat-without-feat') return { role: 'entitled-maneuver', maneuver: 'pin' };
  if (eff === 'resolve-as-trip-feat-without-feat') return { role: 'entitled-maneuver', maneuver: 'trip' };
  if (id === 'trip-substitution' && e.replaces === 'optional-grab-on-hit') return { role: 'trip-substitution' };
  if (eff === 'may-initiate-grab-or-grapple' || eff === 'target-grabbed' || id === 'optional-grab-on-hit') return { role: 'initiate' };
  if (id === 'grabbed-target-shock') return { role: 'shock' };
  if (id === 'weapon-locked-while-grabbing' || eff === 'cannot-attack-other-targets-with-this-weapon') return { role: 'weapon-lock' };
  if (id === 'ongoing-net-shock' || eff === 'repeat-weapon-base-damage-and-move-condition-track' || (eff === 'damage' && /target-ends-turn-grabbed-or-grappled/.test(String(e.trigger ?? '')))) return { role: 'recurring' };
  if (id === 'stun-on-successful-grab') return { role: 'grab-stun' };
  if (id === 'escape-options' || eff === 'snare-escape-options') return { role: 'escape' };
  return null;
}

function classifyTriggeredEffect(e, index, formRefused, operation = null) {
  const id = e.id ?? `triggered-${index}`;
  const eff = typeof e.effect === 'string' ? e.effect : null;
  const src = `profile.triggeredEffects[${index}]`;
  const outcome = classifyOutcomeEffect(e, id, src, operation);
  if (outcome) return formRefused ? Object.freeze({ ...outcome, effectOnly: true }) : outcome;
  const control = controlRoleOf(e);
  if (control) return mech('grab-grapple', id, { source: src, trigger: e.trigger ?? null, ...control, ...(formRefused ? { effectOnly: true } : {}), data: e });
  if (formRefused && !(eff === 'move-target-condition-track' && (CT_HIT_TRIGGERS.has(e.trigger) || e.trigger === CT_BOTH_DEFENSE_TRIGGER || e.trigger === CT_DEFENSE_TRIGGER))) {
    return mech('special-action', id, { source: src, reason: 'form-has-no-ordinary-damage', trigger: e.trigger ?? null, data: e });
  }
  if (eff === 'move-target-condition-track') {
    const steps = Number(e.steps);
    const t = e.trigger ?? null;
    if (Number.isFinite(steps) && steps !== 0 && (CT_HIT_TRIGGERS.has(t) || t === CT_DEFENSE_TRIGGER || t === CT_BOTH_DEFENSE_TRIGGER)) {
      return mech('ct-rider', id, { source: src, trigger: t, steps: Math.abs(steps), direction: steps < 0 ? 'down' : 'up', persistent: e.persistent === true,
        defenses: t === CT_BOTH_DEFENSE_TRIGGER ? asArray(e.defenses) : t === CT_DEFENSE_TRIGGER && e.defense ? [e.defense] : [],
        requiresDamage: t === CT_DEFENSE_TRIGGER, regardlessOfDamage: e.regardlessOfDamageRoll === true, ...(formRefused ? { effectOnly: true } : {}), data: e });
    }
    return mech('ct-rider-prompt', id, { source: src, trigger: t, data: e });
  }
  if (eff && /pin|trip/.test(eff) && /without-feat/.test(eff)) return mech('special-action', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (eff && /grab|grapple|net|snare/.test(`${eff} ${e.id ?? ''}`)) return mech('grab-grapple', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (/(grabbed|grappled|trapped|snared)/.test(String(e.trigger ?? '')) || /grab|grapple|snare|net/.test(String(e.id ?? ''))) return mech('grab-grapple', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (e.effect && typeof e.effect === 'object') return mech('payload-effect', id, { source: src, trigger: e.trigger ?? null, data: e }); // area/evasion-split effect object: multi-target, later phase
  if (e.trigger === 'weapon-fired' && eff && e.attackRollRequired === false) return mech('display-note', id, { source: src, data: e });
  if (eff && /prone|disabled|concealment/.test(eff)) return mech('status-condition', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (e.timing || e.recurrence || e.persistentCondition === true || /start-of|beginning-of|each-round/.test(String(e.trigger ?? e.frequency ?? ''))) return mech('persistent-effect', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (e.cost || e.action || e.expires || /activation/.test(String(e.trigger ?? ''))) return mech('activation-effect', id, { source: src, trigger: e.trigger ?? null, data: e });
  if (e.effect === 'deliver-loaded-toxin' || e.onHitDamage !== undefined || e.alsoDealStun) return mech('payload-effect', id, { source: src, trigger: e.trigger ?? null, data: e });
  return mech('unclassified', id, { source: src, trigger: e.trigger ?? null, data: e });
}

/** operation key -> structural condition (read against the observed attack context). */
const OPERATION_ATTACK_MODIFIERS = Object.freeze([
  ['singleShotAttackPenalty', Object.freeze({ fireMode: 'single' })],
  ['autofireEquipmentBonus', Object.freeze({ fireMode: 'autofire' })],
  ['unbracedAdditionalAttackPenalty', Object.freeze({ fireMode: 'autofire', braced: false })],
]);

/** operation key -> conditional damage term (the weapon declares it; the damage composition applies it). */
const OPERATION_DAMAGE_TERMS = Object.freeze([
  ['pointBlankDamageEquipmentBonus', (v) => (Number.isFinite(Number(v)) && Number(v) !== 0 ? { kind: 'flat', value: Number(v), bonusType: 'equipment', condition: Object.freeze({ rangeBand: 'pointBlank' }) } : null)],
  ['adjacentBonusDamage', (v) => (/^\d+d\d+$/.test(String(v ?? '')) ? { kind: 'dice', formula: String(v), condition: Object.freeze({ distance: 'adjacent' }) } : null)],
]);

const USE_TOKENS = [[/double attack/i, 'double-attack'], [/triple attack/i, 'triple-attack'], [/rapid shot/i, 'rapid-shot'], [/rapid strike/i, 'rapid-strike']];
/** Multi-attack abilities a conditional modifier names (structured `when.usesAny`, else the enumerated ability names in its condition). */
function multiAttackUses(m) {
  const names = asArray(m.when?.usesAny).length ? asArray(m.when.usesAny) : [typeof m.condition === 'string' ? m.condition : ''];
  const out = new Set();
  for (const n of names) for (const [re, token] of USE_TOKENS) if (re.test(String(n))) out.add(token);
  return [...out];
}

function classifyConditionalModifier(m, index) {
  const id = m.id ?? `conditional-${index}`;
  const src = `profile.conditionalModifiers[${index}]`;
  const condText = typeof m.condition === 'string' ? m.condition : '';
  if (MULTI_ATTACK_RE.test(condText) || m.when?.usesAny) {
    const uses = multiAttackUses(m);
    if (m.target === 'attackRoll' && uses.length && Number.isFinite(Number(m.value))) return mech('multi-attack-interaction', id, { source: src, uses, value: Number(m.value), data: m });
    return mech('defensive-interaction', id, { source: src, data: m, reason: 'multi-attack condition without a resolvable attack modifier' });
  }
  if (m.target === 'attackRoll') {
    const c = m.condition;
    if (c && typeof c === 'object' && typeof c.targetSize === 'string') return mech('attack-modifier-auto', id, { source: src, value: Number(m.value), condition: { targetSize: c.targetSize }, data: m });
    // Phase 5D-I-A: a condition registered in condition-policy is evaluated from the observed attack context at attack time (AUTO when
    // every fact it reads is observed, otherwise the same stored PROMPT as before). `evaluable` records that registration.
    const evaluable = c !== undefined && c !== null && policyFor(c).policy !== 'UNSUPPORTED';
    return mech('attack-modifier-prompt', id, { source: src, value: Number(m.value), question: condText || JSON.stringify(m.condition ?? null), ...(evaluable ? { evaluable: true, conditionValue: c } : {}), data: m });
  }
  // Phase 5D-I-C-C: structured reaction / passive-defense targets of the canonical schema (enumerated target vocabulary, never prose)
  const rx = /^useTheForceCheck\.(Block|Deflect)(\.cumulativePenaltyPerAdditionalCheck)?$/.exec(String(m.target ?? ''));
  if (rx && Number.isFinite(Number(m.value))) return mech('reaction-modifier', id, { source: src, reaction: rx[1].toLowerCase(), value: Number(m.value), cumulative: !!rx[2], replacesDefault: Number.isFinite(Number(m.replacesDefault)) ? Number(m.replacesDefault) : null, data: m });
  if (m.target === 'reflexDefense' && Number.isFinite(Number(m.value)) && /adjacent/.test(String(m.condition ?? ''))) return mech('passive-defense', id, { source: src, defense: 'reflex', value: Number(m.value), against: 'adjacent-attackers', data: m });
  return mech('defensive-interaction', id, { source: src, data: m });
}

/**
 * Extract every structured special mechanic of the selected attack form.
 * @param {object} def          the selected profile's canonical definition (runtime.profile.definition)
 * @param {object} [opts]
 * @param {object} [opts.damageProfile]  resolveDamageProfile() result (carries the payload-resolved multiplier + riders)
 * @param {object} [opts.operation]      weapon-level `operation` block
 * @param {boolean} [opts.formRefused]   the form has no ordinary damage (special action / effect-only payload)
 * @param {string}  [opts.stunCapability]
 */
export function extractSpecialMechanics(def, { damageProfile = null, operation = null, formRefused = false, stunCapability = null, payloadEffects = [], drInteraction = null, abilityInteractions = [], identityKey = null } = {}) {
  const out = [];
  if (!def) return Object.freeze(out);
  const mult = Number(damageProfile?.damageMultiplier ?? def.damageMultiplier ?? 1);
  if (Number.isFinite(mult) && mult !== 1) out.push(mech('damage-multiplier', 'damage-multiplier', { multiplier: mult, source: damageProfile?.payloadId ? 'payload.damageMultiplier' : 'profile.damageMultiplier' }));
  asArray(def.criticalEffects).forEach((c, i) => {
    const id = c.id ?? `critical-${i}`;
    if (c.operation === 'replace-die-size' && Number.isFinite(c.fromDieSize) && Number.isFinite(c.toDieSize)) out.push(mech('critical-die-replace', id, { fromDieSize: c.fromDieSize, toDieSize: c.toDieSize, source: `profile.criticalEffects[${i}]` }));
    else if (c.operation === 'add-damage-after-critical-multiplication' && typeof c.damage?.formula === 'string') out.push(mech('critical-bonus-damage', id, { formula: c.damage.formula, source: `profile.criticalEffects[${i}]` }));
    else out.push(mech('unclassified', id, { source: `profile.criticalEffects[${i}]`, data: c }));
  });
  // riders = profile-owned components after the primary damage component (resolver already filtered them by damage mode)
  for (const c of asArray(damageProfile?.components).slice(1)) {
    if (c.kind !== 'profile-component') continue;
    out.push(mech('damage-rider', c.id, { componentId: c.id, damage: c.damage, damageTypes: [...(c.damageTypes ?? [])], resolution: c.resolution ?? 'normal', source: 'profile.damageComponents' }));
  }
  asArray(def.triggeredEffects).forEach((e, i) => out.push(classifyTriggeredEffect(e, i, formRefused, operation)));
  asArray(def.conditionalModifiers).forEach((m, i) => out.push(classifyConditionalModifier(m, i)));
  const defKey = def.attackResolution?.defense;
  if (defKey === 'fortitude' || defKey === 'will') out.push(mech('attack-resolution', `defense:${defKey}`, { defense: defKey, source: 'profile.attackResolution.defense' }));
  // weapon-declared ability interaction that removes an ability's attack penalty (e.g. Rapid Strike): the weapon declares, the ability applies
  asArray(abilityInteractions).forEach((a, i) => {
    if (a?.relation === 'REMOVE_RAPID_STRIKE_ATTACK_PENALTY') out.push(mech('multi-attack-interaction', `remove-rapid-strike-penalty-${i}`, { source: 'weapon.abilityInteractions', uses: ['rapid-strike'], value: 2, data: a }));
  });
  if (def.firingConstraints) out.push(mech('firing-constraint', 'firing-constraints', { source: 'profile.firingConstraints', data: def.firingConstraints }));
  if (def.preparedAttack) out.push(mech('prepared-attack', def.preparedAttack.id ?? 'prepared-attack', { source: 'profile.preparedAttack', data: def.preparedAttack }));
  if (drInteraction?.mode === 'ignore') out.push(mech('dr-ignore', 'dr-ignore', { source: 'weapon.damageReductionInteraction', exceptions: asArray(drInteraction.exceptions) }));
  else if (drInteraction?.mode === 'conditional') {
    asArray(drInteraction.exceptions).forEach((x, i) => { if (x && typeof x === 'object' && x.effect === 'ignore DR') out.push(mech('dr-conditional', `dr-conditional-${i}`, { source: 'weapon.damageReductionInteraction', question: String(x.condition ?? '') })); });
  }
  if (stunCapability === 'native-stun') out.push(mech('native-stun', 'native-stun', { source: 'profile.stun.capability' }));
  const osr = operation?.overwhelmingStunRule;
  if (osr?.comparePreHalvingStunDamageToCurrentHP && osr.onEqualOrExceed && Number.isFinite(osr.onEqualOrExceed.conditionTrackSteps)) {
    out.push(mech('ct-overwhelming-stun', 'overwhelming-stun', { steps: Math.abs(osr.onEqualOrExceed.conditionTrackSteps), source: 'operation.overwhelmingStunRule' }));
  }
  // Phase 5D-I-C-C: weapon-native return, THROWN form only ("a darkstick can be thrown, and if the attack exceeds Reflex Defense by 5 or more it returns").
  // The melee form of the same weapon never returns; the field is not a feat or a reaction and says nothing about Discblade / Returning Bug (their own rules).
  if (Number.isFinite(operation?.returnOnAttackExceedsReflexBy) && def.range?.mode === 'ranged') {
    out.push(mech('return-recovery', 'return-on-attack-exceeds-reflex', { threshold: operation.returnOnAttackExceedsReflexBy, defense: 'reflex', source: 'operation.returnOnAttackExceedsReflexBy' }));
  }
  // Phase 5D-I-A: weapon-level operation attack modifiers whose condition is a structural fire-state fact (fire mode / braced). Same
  // `attack-modifier-auto` family and attack-time evaluation as every other conditional attack modifier -- no second attack engine.
  for (const [key, condition] of OPERATION_ATTACK_MODIFIERS) {
    const v = Number(operation?.[key]);
    if (operation && Number.isFinite(v) && v !== 0) out.push(mech('attack-modifier-auto', `operation.${key}`, { source: `operation.${key}`, value: v, condition, structural: true }));
  }
  // Phase 5D-I-B: crew regulation (E-Web repeating blaster unregulatedAttackPenalty, Tactical Tractor Beam crewRegulation): the penalty applies unless a
  // second crewman regulated the generator since this initiative count last round. The fact is observed from the owned crew adjudication of the
  // current round, else asked once.
  const crewPenalty = Number(operation?.unregulatedAttackPenalty ?? operation?.crewRegulation?.unregulatedAttackPenalty);
  if (operation && Number.isFinite(crewPenalty) && crewPenalty !== 0) {
    out.push(mech('attack-modifier-auto', 'operation.unregulatedAttackPenalty', { source: operation.unregulatedAttackPenalty !== undefined ? 'operation.unregulatedAttackPenalty' : 'operation.crewRegulation.unregulatedAttackPenalty', value: crewPenalty, condition: Object.freeze({ crewRegulated: false }), structural: true,
      fact: Object.freeze({ key: 'crewRegulated', question: 'Did a second crewman regulate the generator since this initiative count last round? (answer no to apply the unregulated penalty)' }) }));
  }
  // operation.attackPenalty: an inherent penalty of the weapon itself (Entrenching Tool -2). With operation.improvisedWeaponPenaltyReplacement it is
  // the weapon's printed REPLACEMENT for the -5 improvised-weapon penalty (this runtime applies no improvised penalty of its own, so it is the only one).
  const inherentPenalty = Number(operation?.attackPenalty);
  if (operation && Number.isFinite(inherentPenalty) && inherentPenalty !== 0) out.push(mech('attack-modifier-auto', 'operation.attackPenalty', { source: 'operation.attackPenalty', value: inherentPenalty, condition: Object.freeze({}), structural: true, replacesImprovisedPenalty: operation.improvisedWeaponPenaltyReplacement === true }));
  for (const [key, build] of OPERATION_DAMAGE_TERMS) {
    const term = operation ? build(operation[key]) : null;
    if (term) out.push(mech('conditional-damage', `operation.${key}`, { source: `operation.${key}`, ...term }));
  }
  // the weapon-level target-size penalty duplicate (operation.targetSizeAttackPenalty) is NOT re-extracted: the profile's conditionalModifiers already carry it
  for (const [i, p] of asArray(payloadEffects).entries()) {
    if (typeof p === 'string') out.push(mech('display-note', `payload-note-${i}`, { source: 'payload.specialEffects', text: p })); // printed note without structure
    else if (p?.structure?.status === 'blinded' && p.structure.trigger === 'area-attack-hit') out.push(mech('status-effect', `payload:${p.effect}`, { source: 'payload.specialEffects', trigger: p.structure.trigger, attackCondition: 'hit', status: 'blinded', duration: p.structure.duration, data: p }));
    else if (p?.structure?.trigger === 'hit-then-secondary-attack' && Number.isFinite(Number(p.structure.onSecondarySuccess?.conditionTrackSteps))) {
      // the secondary attack bonus is not carried by the corpus (DATA_COMPLETENESS): the secondary result is asked once and stored, never invented
      const steps = Number(p.structure.onSecondarySuccess.conditionTrackSteps);
      out.push(mech('ct-rider-prompt', `payload:${p.effect}`, { source: 'payload.specialEffects', trigger: p.structure.trigger, steps: Math.abs(steps), direction: steps < 0 ? 'down' : 'up', secondaryDefense: p.structure.secondaryDefense ?? null, data: p }));
    }
    else if (p?.effect === 'inherit-selected-grenade-normal-rules') out.push(mech('payload-delegation', 'payload:inherit-selected-grenade-normal-rules', { source: 'payload.specialEffects', data: p }));
    else if (p?.effect === 'damage-dice-adjustment' && Number.isFinite(Number(p.diceCountDelta))) out.push(mech('payload-delegation', 'payload:damage-dice-adjustment', { source: 'payload.specialEffects', diceCountDelta: Number(p.diceCountDelta), data: p }));
    else out.push(mech('payload-effect', p?.effect ?? `payload-${i}`, { source: 'payload.specialEffects', data: p }));
  }
  for (const m of operationOutcomeMechanics(operation)) out.push(m);
  for (const m of operationControlMechanics(operation, def, out, { formRefused, identityKey })) out.push(m);
  // the executable control mechanics all carry the ONE declaration of this form (self-contained, JSON-safe; built from structure only)
  if (out.some((m) => m.family === 'grab-grapple' && !m.declaration)) {
    const declaration = controlDeclarationOf({ identityKey, operation, definition: def }, { resolveIdentity: (key) => getSharedWeaponAuthorityRegistry()?.getByIdentityKey?.(key) ?? null });
    return Object.freeze(out.map((m) => (m.family === 'grab-grapple' && !m.declaration && declaration ? Object.freeze({ ...m, declaration }) : m)));
  }
  return Object.freeze(out);
}

/**
 * Phase 5D-I-C-B: control mechanics declared on the weapon-level `operation` (ranged grab / grapple, attack-treated-as-grab, delegation to Net, the
 * Adhesive Grenade restraint blast, the Tactical Tractor Beam). The executable ones carry the CONTROL DECLARATION (control-rules) so the record is
 * self-contained; a profile triggered effect that already initiates control makes the operation-level initiation redundant (never doubled).
 */
function operationControlMechanics(op, def, existing, { formRefused = false, identityKey = null } = {}) {
  const out = [];
  if (!op || typeof op !== 'object') return out;
  const resolveIdentity = (key) => getSharedWeaponAuthorityRegistry()?.getByIdentityKey?.(key) ?? null;
  const declaration = controlDeclarationOf({ identityKey, operation: op, definition: def }, { resolveIdentity });
  if (!declaration) return out;
  const effectOnly = formRefused ? { effectOnly: true } : {};
  const hasInitiate = existing.some((m) => m.family === 'grab-grapple' && m.role === 'initiate');
  const opInitiates = op.rangedGrabOrGrapple === true || op.canInitiateGrabOrGrappleAtRange === true || op.webbingFunctionsAsNet === true || op.attackTreatedAs === 'grab' || !!op.treatControlAs;
  if (opInitiates && !hasInitiate && declaration.grab) out.push(mech('grab-grapple', 'operation.control', { source: 'operation', role: 'initiate', declaration, ...effectOnly }));
  if (declaration.restraint) out.push(mech('grab-grapple', 'operation.blastEffect', { source: 'operation.blastEffect', role: 'restraint', declaration, ...effectOnly }));
  if (declaration.tractor) out.push(mech('grab-grapple', 'operation.tractorControl', { source: 'operation.tractorControl', role: 'tractor', declaration, ...effectOnly }));
  return out;
}

/** Phase 5D-I-C-A: weapon-level `operation` outcome mechanics. Structured carriers only (the amendment-backfilled `structure` objects); prose is never read. */
function operationOutcomeMechanics(op) {
  const out = [];
  if (!op || typeof op !== 'object') return out;
  const adj = Number(op.damageThresholdAdjustment);
  if (Number.isFinite(adj) && adj !== 0) out.push(mech('threshold-adjustment', 'operation.damageThresholdAdjustment', { source: 'operation.damageThresholdAdjustment', value: adj }));
  const sh = op.embeddedShrapnel;
  if (sh?.structure?.trigger === 'damage-exceeds-threshold-and-moves-target-down-condition-track' && sh.timing === 'immediate' && typeof sh.bonusDamage?.formula === 'string') {
    out.push(mech('bonus-damage-rider', 'operation.embeddedShrapnel', { source: 'operation.embeddedShrapnel', formula: sh.bonusDamage.formula, minimumConditionSteps: Number(sh.structure.minimumConditionSteps) || 1, applyCondition: 'threshold-exceeded-and-condition-track-moved' }));
  }
  const tr = op.targetRules?.structure;
  if (tr?.electronic && tr?.nonCybernetic) out.push(mech('target-class-damage', 'operation.targetRules', { source: 'operation.targetRules', rules: tr }));
  const ctr = op.conditionTrackRider?.structure;
  if (ctr?.trigger === 'target-moved-down-condition-track-by-this-damage' && ctr.status) {
    out.push(mech('status-effect', 'operation.conditionTrackRider', { source: 'operation.conditionTrackRider', trigger: ctr.trigger, attackCondition: 'hit', applyCondition: 'target-moved-down-condition-track', status: ctr.status, duration: ctr.duration }));
  }
  const fr = op.fortitudeRider?.structure;
  if (fr?.trigger === 'hit-and-attack-total-exceeds-defense' && fr.defense && (fr.skillPenalty || Number.isFinite(Number(fr.speedSetSquares)))) {
    out.push(mech('status-effect', 'operation.fortitudeRider', { source: 'operation.fortitudeRider', trigger: fr.trigger, attackCondition: 'hit-and-total-exceeds', defense: String(fr.defense), comparison: fr.comparison ?? 'exceeds',
      status: fr.skillPenalty ? 'skill-penalty' : 'speed-set', skillPenalty: fr.skillPenalty ?? null, speedSetSquares: Number.isFinite(Number(fr.speedSetSquares)) ? Number(fr.speedSetSquares) : null, duration: fr.duration }));
  }
  // "A creature killed, or an object, droid, or vehicle destroyed, by it is disintegrated": a status on the target once Apply Damage PROVES the killed / destroyed
  // state (resolution.dead / resolution.destroyed). Nothing is deleted: the Actor / Token stay, the gameplay state is recorded.
  if (op.disintegratesOnKillOrDestruction === true) {
    out.push(mech('status-effect', 'operation.disintegratesOnKillOrDestruction', { source: 'operation.disintegratesOnKillOrDestruction', trigger: 'target-killed-or-destroyed-by-this-damage', attackCondition: 'hit', applyCondition: 'target-killed-or-destroyed', status: 'disintegrated' }));
  }
  // capability only: the weapon MAY carry a contact poison; a poison is delivered only when one is selected on the owned weapon (PoisonEngine coating) and damage is dealt
  if (op.ammunitionMayCarryContactPoison === true) out.push(mech('poison-delivery', 'operation.ammunitionMayCarryContactPoison', { source: 'operation.ammunitionMayCarryContactPoison', requiresDamage: true, capabilityOnly: true }));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// damage-time shape consumed by the existing composition (pure data)
// ---------------------------------------------------------------------------------------------------------------------

/** What the damage composition needs from the selected form's AUTO damage mechanics. */
export function damageShapeFromMechanics(mechanics) {
  const list = asArray(mechanics);
  const multiplier = list.filter((m) => m.family === 'damage-multiplier').reduce((acc, m) => acc * m.multiplier, 1);
  return Object.freeze({
    baseMultiplier: multiplier,
    criticalDieReplacements: Object.freeze(list.filter((m) => m.family === 'critical-die-replace').map((m) => ({ id: m.id, fromDieSize: m.fromDieSize, toDieSize: m.toDieSize }))),
    criticalBonusFormulas: Object.freeze(list.filter((m) => m.family === 'critical-bonus-damage').map((m) => ({ id: m.id, formula: m.formula }))),
    riders: Object.freeze(list.filter((m) => m.family === 'damage-rider')),
    conditionalDamage: Object.freeze(list.filter((m) => m.family === 'conditional-damage')),
  });
}

/**
 * Phase 5D-I-A: weapon-declared conditional damage terms for ONE damage roll. Pure. A term whose fact was not observed is reported
 * unresolved and NOT applied (never guessed). The adjacent-target fact is the stored attack-stage answer (`answers[term.id]`).
 * @returns {{flat:number, diceTerms:string[], applied:Array, unresolved:Array}}
 */
export function evaluateConditionalDamage(terms, { rangeBand = null, answers = {}, distance = undefined } = {}) {
  const out = { flat: 0, diceTerms: [], applied: [], unresolved: [] };
  for (const t of asArray(terms)) {
    const stored = answers?.[t.id];
    const dist = distance ?? (stored === true ? 'adjacent' : stored === false ? 'not-adjacent' : undefined);
    const r = evaluateStructuralCondition(t.condition, { rangeBand: rangeBand ?? undefined, distance: dist });
    if (r === true) {
      if (t.kind === 'flat') out.flat += t.value; else out.diceTerms.push(t.formula);
      out.applied.push({ id: t.id, kind: t.kind, ...(t.kind === 'flat' ? { value: t.value, bonusType: t.bonusType } : { formula: t.formula }) });
    } else if (r === null) out.unresolved.push({ id: t.id, reason: 'condition-not-observed' });
  }
  return out;
}

/** Replace the base die size of a plain NdM[+k] formula when it equals `fromDieSize` (critical die upgrade). */
export function replaceBaseDieSize(formula, fromDieSize, toDieSize) {
  const m = /^(\d+)d(\d+)(.*)$/.exec(String(formula ?? '').replace(/\s+/g, ''));
  if (!m || Number(m[2]) !== fromDieSize) return formula;
  return `${m[1]}d${toDieSize}${m[3]}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// attack-time evaluation (needs the attack outcome; still pure)
// ---------------------------------------------------------------------------------------------------------------------

const SIZE_ORDER = ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'];
export const sizeIndex = (s) => SIZE_ORDER.indexOf(String(s ?? '').trim().toLowerCase());

/** targetSize condition evaluation. Returns true/false, or null when the size is unknown. */
export function evaluateTargetSizeCondition(condition, targetSize) {
  const t = sizeIndex(targetSize);
  if (t < 0) return null;
  const m = /^(smaller|larger)-than-(\w+)$/i.exec(String(condition?.targetSize ?? ''));
  if (!m) return null;
  const ref = sizeIndex(m[2]);
  if (ref < 0) return null;
  return m[1].toLowerCase() === 'smaller' ? t < ref : t > ref;
}

/**
 * Evaluate the ATTACK-ROLL part of a CT rider's trigger (hit + attack total vs the named defense(s)). Whether damage was
 * actually dealt is decided at Apply Damage (the rider carries `requiresDamage`).
 * @returns {true|false|null} null = cannot be determined (no attack total / unknown defense value)
 */
export function evaluateCtRiderAttackCondition(m, { hit, attackTotal = null, defenses = {} } = {}) {
  if (hit !== true) return hit === false ? false : null;
  if (m.trigger === CT_DEFENSE_TRIGGER || m.trigger === CT_BOTH_DEFENSE_TRIGGER) {
    if (!Number.isFinite(attackTotal) || !m.defenses?.length) return null;
    for (const k of m.defenses) {
      const d = defenses?.[String(k).toLowerCase()];
      if (!Number.isFinite(d)) return null;
      if (!(attackTotal >= d)) return false;
    }
  }
  return true;
}

/** Structural fire-state condition ({fireMode, braced}) against the observed attack context. true/false, or null when a needed fact was not observed. */
export function evaluateStructuralCondition(condition, ctx = {}) {
  let unknown = false;
  for (const [k, want] of Object.entries(condition ?? {})) {
    if (ctx[k] === undefined || ctx[k] === null) { unknown = true; continue; }
    if (ctx[k] !== want) return false;
  }
  return unknown ? null : true;
}

/**
 * A condition REGISTERED in condition-policy, evaluated from the observed attack context. AUTO only when every context fact the condition
 * reads was observed (an unobserved fact is never read as false); otherwise null -> the caller asks the stored PROMPT.
 */
export function evaluateRegisteredCondition(condition, ctx = {}) {
  if (policyFor(condition).policy === 'UNSUPPORTED') return null;
  if (conditionContextKeys(condition).some((k) => ctx[k] === undefined || ctx[k] === null)) return null;
  const r = evaluateCondition(condition, { events: [], ...ctx });
  return r.pending.length || (r.value !== true && r.value !== false) ? null : r.value;
}

/** Size name -> the rank/label vocabulary condition-policy reads ("medium" -> "Medium"). */
export const canonicalSizeName = (s) => { const t = String(s ?? '').trim().toLowerCase(); return Object.keys(SIZE_RANK).find((k) => k.toLowerCase() === t) ?? null; };

/**
 * Attack-stage conditional attack modifiers (before the roll). AUTO when the target's size is observable; otherwise the
 * question is asked ONCE (stored in `answers`, never re-asked) -- and when nobody can answer the mechanic is reported
 * `unresolved` and NOT applied (never guessed).
 * @returns {Promise<{contributions:Array, answers:object, unresolved:Array, drIgnore:boolean}>}
 */
export async function resolveAttackStageModifiers(mechanics, { targetSize = null, answers = {}, activeUses = [], attackContext = {} } = {}) {
  const contributions = [], unresolved = [], out = { ...answers };
  for (const m of asArray(mechanics)) {
    if (m.family === 'multi-attack-interaction') {
      // AUTO from the active multi-attack shape: applies only while one of the abilities it names is actually in use on this attack
      if (asArray(m.uses).some((u) => asArray(activeUses).includes(u))) contributions.push({ id: m.id, value: m.value, how: 'multi-attack-shape' });
      continue;
    }
    if (m.family === 'conditional-damage' && m.condition?.distance !== undefined) {
      // the adjacency of the target is asked ONCE at the attack and stored; the damage composition reads the stored answer
      if (attackContext.distance === undefined && answerFor({ answers: out }, m.id) === undefined) {
        const ans = await askSpecialQuestion({ id: m.id, family: m.family, question: `Is the target adjacent to the attacker? (+${m.formula} damage)` });
        if (ans === true || ans === false) out[m.id] = ans;
      } else if (attackContext.distance !== undefined && answerFor({ answers: out }, m.id) === undefined) out[m.id] = attackContext.distance === m.condition.distance;
      continue;
    }
    if (m.family !== 'attack-modifier-auto' && m.family !== 'attack-modifier-prompt') continue;
    let applies = null, how = 'auto';
    if (m.family === 'attack-modifier-auto' && m.structural) {
      let ctx = attackContext;
      // a structural condition that reads a crew/state FACT (m.fact) asks it once and stores the answer (reusable by any mechanic reading the same fact)
      const fk = m.fact?.key;
      if (fk && ctx[fk] === undefined && evaluateStructuralCondition(m.condition, { ...ctx, [fk]: false }) !== false) {
        let ans = answerFor({ answers: out }, `fact:${fk}`);
        if (ans !== true && ans !== false) { ans = await askSpecialQuestion({ id: `fact:${fk}`, family: 'attack-modifier-auto', question: m.fact.question }); if (ans === true || ans === false) out[`fact:${fk}`] = ans; }
        if (ans === true || ans === false) ctx = { ...ctx, [fk]: ans };
      }
      applies = evaluateStructuralCondition(m.condition, ctx); how = 'fire-state';
    }
    else if (m.family === 'attack-modifier-auto') applies = evaluateTargetSizeCondition(m.condition, targetSize);
    else if (m.evaluable) { applies = evaluateRegisteredCondition(m.conditionValue, attackContext); how = 'condition-policy'; }
    if (applies === null) {
      how = 'answer';
      const prior = answerFor({ answers: out }, m.id);
      if (prior === true || prior === false) applies = prior;
      else {
        const question = m.structural ? `Does this apply to this attack? (${Object.entries(m.condition).map(([k, v]) => `${k}: ${v}`).join(', ')}) ${m.value >= 0 ? '+' : ''}${m.value} attack` : m.family === 'attack-modifier-auto' ? `Does this apply to the target? (${m.condition.targetSize.replace(/-/g, ' ')}) ${m.value >= 0 ? '+' : ''}${m.value} attack` : `Does this apply to this attack? ${m.question} (${m.value >= 0 ? '+' : ''}${m.value} attack)`;
        const ans = await askSpecialQuestion({ id: m.id, family: m.family, question });
        if (ans === true || ans === false) { out[m.id] = ans; applies = ans; }
      }
    }
    if (applies === true && Number.isFinite(m.value)) contributions.push({ id: m.id, value: m.value, how });
    else if (applies === null) unresolved.push({ id: m.id, family: m.family, reason: 'condition-not-observable-and-unanswered' });
  }
  let drIgnore = false;
  for (const m of asArray(mechanics)) {
    if (m.family === 'dr-ignore') drIgnore = true;
    else if (m.family === 'dr-conditional') {
      let ans = answerFor({ answers: out }, m.id);
      if (ans !== true && ans !== false) {
        ans = await askSpecialQuestion({ id: m.id, family: m.family, question: `Does this apply to the target? (${m.question}) -- this attack ignores damage reduction` });
        if (ans === true || ans === false) out[m.id] = ans; else unresolved.push({ id: m.id, family: m.family, reason: 'condition-not-observable-and-unanswered' });
      }
      if (ans === true) drIgnore = true;
    }
  }
  return { contributions, answers: out, unresolved, drIgnore };
}

/**
 * After the attack roll: the apply-time records carried to Apply Damage (self-contained, JSON-safe). Phase 5D-I-C-A adds the outcome kinds
 * (status-effect, bonus-damage, delayed-damage, persistent-poison, poison-delivery, zero-hp-ct-disable); each carries the canonical provenance
 * (identity / profile / payload) it was selected with. `fired` is the ATTACK-time part of the trigger (true / false / null = unobserved);
 * anything that depends on damage actually dealt is the record's `applyCondition` / `requiresDamage`, decided at Apply Damage.
 */
export function evaluateAttackOutcomeSpecials(mechanics, { hit, attackTotal = null, defenses = {}, provenance = null } = {}) {
  const records = [];
  const source = provenance && typeof provenance === 'object' ? { ...(provenance.identityKey ? { identityKey: provenance.identityKey } : {}), ...(provenance.profileId ? { profileId: provenance.profileId } : {}), ...(provenance.payloadId ? { payloadId: provenance.payloadId } : {}) } : null;
  const withSource = (rec) => (source && Object.keys(source).length ? { ...rec, source } : rec);
  const hitFired = hit === true ? true : hit === false ? false : null;
  for (const m of asArray(mechanics)) {
    if (m.family === 'ct-rider') {
      records.push(withSource({ id: m.id, kind: 'ct-rider', steps: m.steps, direction: m.direction, persistent: m.persistent, requiresDamage: m.requiresDamage === true && m.regardlessOfDamage !== true,
        fired: evaluateCtRiderAttackCondition(m, { hit, attackTotal, defenses }), trigger: m.trigger, defenses: [...(m.defenses ?? [])],
        ...(Number.isFinite(m.evasionSteps) || m.immunity ? { payload: { ...(Number.isFinite(m.evasionSteps) ? { evasionSteps: m.evasionSteps } : {}), ...(m.immunity ? { immunity: m.immunity } : {}) } } : {}) }));
    } else if (m.family === 'ct-rider-prompt' && Number.isFinite(m.steps) && m.secondaryDefense !== undefined) {
      // a hit starts a secondary attack the corpus gives no bonus for: its result is asked once at Apply Damage
      records.push(withSource({ id: m.id, kind: 'ct-rider', steps: m.steps, direction: m.direction, requiresDamage: false, fired: hit === false ? false : null, trigger: m.trigger, defenses: [], payload: { secondaryDefense: m.secondaryDefense } }));
    } else if (m.family === 'ct-overwhelming-stun') {
      records.push({ id: m.id, kind: 'overwhelming-stun', steps: m.steps, fired: hitFired, requiresDamage: true });
    } else if (m.family === 'status-effect') {
      let fired = hitFired;
      if (m.attackCondition === 'hit-and-total-exceeds') {
        const d = defenses?.[String(m.defense).toLowerCase()];
        if (hit !== true) fired = hitFired;
        else if (!Number.isFinite(attackTotal) || !Number.isFinite(d)) fired = null;
        else fired = m.comparison === 'equals-or-exceeds' ? attackTotal >= d : attackTotal > d;
      }
      records.push(withSource({ id: m.id, kind: 'status-effect', steps: 0, fired, requiresDamage: false, trigger: m.trigger ?? undefined, ...(m.applyCondition ? { applyCondition: m.applyCondition } : {}),
        payload: { status: m.status, ...(m.duration ? { duration: m.duration } : {}), ...(m.skillPenalty ? { skillPenalty: m.skillPenalty } : {}), ...(Number.isFinite(m.speedSetSquares) ? { speedSetSquares: m.speedSetSquares } : {}), ...(m.immunity ? { immunity: m.immunity } : {}) } }));
    } else if (m.family === 'bonus-damage-rider') {
      records.push(withSource({ id: m.id, kind: 'bonus-damage', steps: 0, fired: hitFired, requiresDamage: true, applyCondition: m.applyCondition, payload: { formula: m.formula, minimumConditionSteps: m.minimumConditionSteps } }));
    } else if (m.family === 'delayed-damage') {
      records.push(withSource({ id: m.id, kind: 'delayed-damage', steps: 0, fired: evaluateCtRiderAttackCondition({ trigger: CT_BOTH_DEFENSE_TRIGGER, defenses: m.defenses }, { hit, attackTotal, defenses }), requiresDamage: false, trigger: m.trigger, defenses: [...(m.defenses ?? [])],
        payload: { formula: m.formula, qualifiers: [...(m.qualifiers ?? [])], timing: m.data?.timing ?? 'start-of-target-next-turn' } }));
    } else if (m.family === 'persistent-poison') {
      records.push(withSource({ id: m.id, kind: 'persistent-poison', steps: 0, fired: hitFired, requiresDamage: false, trigger: m.trigger, payload: { effect: JSON.parse(JSON.stringify(m.data ?? {})) } }));
    } else if (m.family === 'poison-delivery') {
      records.push(withSource({ id: m.id, kind: 'poison-delivery', steps: 0, fired: hitFired, requiresDamage: m.requiresDamage === true, trigger: m.trigger ?? undefined, payload: { capabilityOnly: m.capabilityOnly === true } }));
    } else if (m.family === 'grab-grapple' && ['initiate', 'restraint', 'tractor', 'entitled-maneuver'].includes(m.role)) {
      // Phase 5D-I-C-B: control records. `fired` is the ATTACK-time part of the trigger (a hit); what happens next (size / range gates, the opposed grapple
      // check, state creation) is decided at Apply time by weapon-control-effects through the existing grapple system.
      const declaration = m.declaration ?? null;
      records.push(withSource({ id: m.id, kind: 'weapon-control', role: m.role, steps: 0, fired: m.role === 'restraint' ? true : hitFired, requiresDamage: false, trigger: m.trigger ?? undefined,
        payload: { role: m.role, ...(m.maneuver ? { maneuver: m.maneuver } : {}), ...(declaration ? { declaration: JSON.parse(JSON.stringify(declaration)) } : {}), attackTotal } }));
    } else if (m.family === 'return-recovery') {
      // attack-time margin over the named defense: hit AND total - defense >= threshold (an unobserved total / defense is asked once at Apply)
      const d = defenses?.[String(m.defense ?? 'reflex').toLowerCase()];
      const fired = hit === false ? false : hit !== true ? null : (!Number.isFinite(attackTotal) || !Number.isFinite(d)) ? null : (attackTotal - d) >= m.threshold;
      records.push(withSource({ id: m.id, kind: 'weapon-recovery', steps: 0, fired, requiresDamage: false, trigger: 'attack-exceeds-reflex-by-threshold', payload: { effect: 'returns-to-wielder-hand', threshold: m.threshold, defense: m.defense ?? 'reflex', ...(Number.isFinite(attackTotal) && Number.isFinite(d) ? { margin: attackTotal - d } : {}) } }));
    } else if (m.family === 'target-class-damage') {
      // Evaluated per target at Apply Damage: pre-halving damage that would reduce an electronic-class target to 0 HP -> -5 CT and disabled
      const z = m.rules?.electronic?.zeroHpPreHalving;
      if (z && Number.isFinite(Number(z.conditionTrackSteps))) records.push(withSource({ id: 'operation.targetRules.zero-hp', kind: 'zero-hp-ct-disable', steps: Math.abs(Number(z.conditionTrackSteps)), fired: true, requiresDamage: true, payload: { disabled: z.disabled === true, categories: [...(m.rules.electronic.categories ?? [])] } }));
    }
  }
  return records;
}

/**
 * Phase 5D-I-A: target eligibility of the selected profile's STRUCTURED activation requirements (`type: 'target'` with a registered
 * `requires` condition; `type: 'target-rule'` with a registered `normalDamageWhen` condition). No natural-language parsing, no weapon names.
 * Each requirement is true / false / null (a needed fact was not observed). Only a definite false makes the attack illegal; null is
 * returned with its prompt so the caller can ask ONCE and store the answer.
 * @returns {{legal:boolean, evaluated:Array<{type:string, condition:string, result:boolean|null, prompt?:string}>}}
 */
export function resolveTargetRequirements(requirements, { context = {}, answers = {} } = {}) {
  const evaluated = [];
  for (const r of asArray(requirements)) {
    const type = r?.type;
    const condition = type === 'target' ? r.requires : type === 'target-rule' ? r.normalDamageWhen : null;
    if (typeof condition !== 'string' || (type !== 'target' && type !== 'target-rule')) continue;
    const stored = answers?.[`target-requirement:${condition}`];
    let result = typeof stored === 'boolean' ? stored : evaluateRegisteredCondition(condition, { ...context, answers });
    if (result === null && policyFor(condition).policy === 'UNSUPPORTED') result = null;
    evaluated.push({ type, condition, result, ...(result === null ? { prompt: `target-requirement:${condition}` } : {}) });
  }
  return { legal: !evaluated.some((e) => e.result === false), evaluated };
}

/** Stored-answer lookup: prompts are asked once per (workflow, mechanic id). */
export const answerFor = (special, id) => (special?.answers && Object.prototype.hasOwnProperty.call(special.answers, id) ? special.answers[id] : undefined);

/** The non-default defense the selected form attacks (Fortitude/Will), from the mechanics -- null means the ordinary Reflex Defense. */
export const alternateDefenseOf = (mechanics) => asArray(mechanics).find((m) => m.family === 'attack-resolution')?.defense ?? null;

/** Phase 5D-I-C-A: the attack-specific effective-threshold adjustment (sum of the selected form's threshold-adjustment mechanics; 0 = none). */
export const thresholdAdjustmentOf = (mechanics) => asArray(mechanics).filter((m) => m.family === 'threshold-adjustment').reduce((acc, m) => acc + (Number(m.value) || 0), 0);
/** Phase 5D-I-C-A: the structured per-target-class damage rules of the selected form (EMP Grenade), or null. */
export const targetRulesOf = (mechanics) => asArray(mechanics).find((m) => m.family === 'target-class-damage')?.rules ?? null;
/** Phase 5D-I-C-A: the selected form deals no ordinary damage and acts only through its outcome effects (Venom Spit, Flash Canister, Flash Rocket). */
export const isEffectOnlyForm = (mechanics) => asArray(mechanics).some((m) => m.effectOnly === true);

/** Compact, JSON-safe record of the selected form's mechanics for the workflow context (no definitions, no dice). */
export function summarizeMechanics(mechanics) {
  return asArray(mechanics).map((m) => ({ id: m.id, family: m.family, policy: m.policy, timing: m.timing, ...(m.effectOnly === true ? { effectOnly: true } : {}) }));
}

// ---------------------------------------------------------------------------------------------------------------------
// PROMPT provider (UI-agnostic; the live provider is registered by the chat/dialog layer, tests inject their own)
// ---------------------------------------------------------------------------------------------------------------------
let promptProvider = null;
export function setSpecialPromptProvider(fn) { promptProvider = typeof fn === 'function' ? fn : null; }
/** Ask a yes/no question. No provider => null (unanswered): the caller surfaces the mechanic instead of guessing. */
export async function askSpecialQuestion(question) {
  if (!promptProvider) return null;
  const ans = await promptProvider(question);
  return ans === true || ans === false ? ans : null;
}
