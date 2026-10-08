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

export const POLICY = Object.freeze({ AUTO: 'AUTO', PROMPT: 'PROMPT', DEFER: 'DEFER', DISPLAY_ONLY: 'DISPLAY_ONLY', VALIDATION_ONLY: 'VALIDATION_ONLY' });

export const TIMING = Object.freeze({
  ON_ATTACK: 'on-attack', ON_HIT: 'on-hit', ON_MISS: 'on-miss', ON_DAMAGE_ROLL: 'on-damage-roll', ON_CRITICAL: 'on-critical',
  AFTER_DAMAGE: 'after-damage', AFTER_MITIGATION: 'after-mitigation', TURN_START: 'turn-start', TURN_END: 'turn-end', CONTINUOUS: 'continuous',
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
  'defensive-interaction':    { policy: POLICY.DEFER,    timing: TIMING.CONTINUOUS,     note: 'modifies the wielder\'s defenses/Use the Force checks rather than this single attack' },
  'grab-grapple':             { policy: POLICY.DEFER,    timing: TIMING.ON_HIT,         note: 'grapple/net/snare state machine (existing grapple system; multi-step workflow)' },
  'status-condition':         { policy: POLICY.DEFER,    timing: TIMING.AFTER_DAMAGE,   note: 'status condition (prone/disabled/concealment) with no single existing setter' },
  'persistent-effect':        { policy: POLICY.DEFER,    timing: TIMING.TURN_START,     note: 'delayed/recurring effect resolved at a later turn boundary' },
  'special-action':           { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'replaces the attack with another action (Pin/Trip/Venom Spit) -- refused, not substituted' },
  'payload-effect':           { policy: POLICY.DEFER,    timing: TIMING.ON_HIT,         note: 'effect-only payload (flash/gas/toxin) without complete structure' },
  'prepared-attack':          { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'swift-action preparation/bracing (action economy owner)' },
  'activation-effect':        { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'activated empowerment (Force Point / swift action) with own cost' },
  'return-recovery':          { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'return/recovery threshold with no structured effect or action' },
  'firing-constraint':        { policy: POLICY.VALIDATION_ONLY, timing: TIMING.ON_ATTACK, note: 'limits shots per round/reload; checked against the existing multi-attack/ammo rules (Phase 5D-F)' },
  'conditional-damage':       { policy: POLICY.AUTO,     timing: TIMING.ON_DAMAGE_ROLL, note: 'weapon-declared damage term that applies under a structural attack fact (point-blank range / adjacent target); composed once in the existing damage composition' },
  'attack-resolution':        { policy: POLICY.AUTO,     timing: TIMING.ON_ATTACK,      note: 'selected form defense (reflex/fortitude/will) -- already consumed through targetContext.defenseType' },
  'display-note':             { policy: POLICY.DISPLAY_ONLY, timing: TIMING.CONTINUOUS, note: 'informational statement with no effect on resolving the single attack (e.g. concealed shot origin)' },
  'unclassified':             { policy: POLICY.DEFER,    timing: TIMING.ON_ATTACK,      note: 'structured mechanic with no recognized family; surfaced, never silently dropped' },
});

const CT_HIT_TRIGGERS = new Set(['successful-hit', 'on-hit', 'hit']);
const CT_DEFENSE_TRIGGER = 'damage-dealt-and-attack-roll-equals-or-exceeds-defense';
const CT_BOTH_DEFENSE_TRIGGER = 'attack-roll-equals-or-exceeds-both-defenses';
const MULTI_ATTACK_RE = /double attack|triple attack|rapid (shot|strike)|multi-?shot|autofire/i;
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const mech = (family, id, extra = {}) => Object.freeze({ family, id, policy: FAMILIES[family].policy, timing: FAMILIES[family].timing, ...extra });

function classifyTriggeredEffect(e, index, formRefused) {
  const id = e.id ?? `triggered-${index}`;
  const eff = typeof e.effect === 'string' ? e.effect : null;
  const src = `profile.triggeredEffects[${index}]`;
  if (formRefused) return mech('special-action', id, { source: src, reason: 'form-has-no-ordinary-damage', trigger: e.trigger ?? null, data: e });
  if (eff === 'move-target-condition-track') {
    const steps = Number(e.steps);
    const t = e.trigger ?? null;
    if (Number.isFinite(steps) && steps !== 0 && (CT_HIT_TRIGGERS.has(t) || t === CT_DEFENSE_TRIGGER || t === CT_BOTH_DEFENSE_TRIGGER)) {
      return mech('ct-rider', id, { source: src, trigger: t, steps: Math.abs(steps), direction: steps < 0 ? 'down' : 'up', persistent: e.persistent === true,
        defenses: t === CT_BOTH_DEFENSE_TRIGGER ? asArray(e.defenses) : t === CT_DEFENSE_TRIGGER && e.defense ? [e.defense] : [],
        requiresDamage: t === CT_DEFENSE_TRIGGER, regardlessOfDamage: e.regardlessOfDamageRoll === true, data: e });
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
export function extractSpecialMechanics(def, { damageProfile = null, operation = null, formRefused = false, stunCapability = null, payloadEffects = [], drInteraction = null, abilityInteractions = [] } = {}) {
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
  asArray(def.triggeredEffects).forEach((e, i) => out.push(classifyTriggeredEffect(e, i, formRefused)));
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
  if (Number.isFinite(operation?.returnOnAttackExceedsReflexBy)) {
    out.push(mech('return-recovery', 'return-on-attack-exceeds-reflex', { threshold: operation.returnOnAttackExceedsReflexBy, source: 'operation.returnOnAttackExceedsReflexBy',
      completeness: 'threshold is structured but the effect/action (return to hand) is not; recorded as a completeness issue, never invented' }));
  }
  // Phase 5D-I-A: weapon-level operation attack modifiers whose condition is a structural fire-state fact (fire mode / braced). Same
  // `attack-modifier-auto` family and attack-time evaluation as every other conditional attack modifier -- no second attack engine.
  for (const [key, condition] of OPERATION_ATTACK_MODIFIERS) {
    const v = Number(operation?.[key]);
    if (operation && Number.isFinite(v) && v !== 0) out.push(mech('attack-modifier-auto', `operation.${key}`, { source: `operation.${key}`, value: v, condition, structural: true }));
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
    else out.push(mech('payload-effect', p?.effect ?? `payload-${i}`, { source: 'payload.specialEffects', data: p }));
  }
  return Object.freeze(out);
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
    if (m.family === 'attack-modifier-auto' && m.structural) { applies = evaluateStructuralCondition(m.condition, attackContext); how = 'fire-state'; }
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

/** After the attack roll: the CT-rider / overwhelming-stun records carried to Apply Damage (self-contained, JSON-safe). */
export function evaluateAttackOutcomeSpecials(mechanics, { hit, attackTotal = null, defenses = {} } = {}) {
  const records = [];
  for (const m of asArray(mechanics)) {
    if (m.family === 'ct-rider') {
      records.push({ id: m.id, kind: 'ct-rider', steps: m.steps, direction: m.direction, persistent: m.persistent, requiresDamage: m.requiresDamage === true && m.regardlessOfDamage !== true,
        fired: evaluateCtRiderAttackCondition(m, { hit, attackTotal, defenses }), trigger: m.trigger, defenses: [...(m.defenses ?? [])] });
    } else if (m.family === 'ct-overwhelming-stun') {
      records.push({ id: m.id, kind: 'overwhelming-stun', steps: m.steps, fired: hit === true ? true : hit === false ? false : null, requiresDamage: true });
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

/** Compact, JSON-safe record of the selected form's mechanics for the workflow context (no definitions, no dice). */
export function summarizeMechanics(mechanics) {
  return asArray(mechanics).map((m) => ({ id: m.id, family: m.family, policy: m.policy, timing: m.timing }));
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
