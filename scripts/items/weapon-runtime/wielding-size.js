// Phase 5D-I-D-B2 -- effective weapon SIZE, worn / mounted classification, and the held-together rule (pure).
// The canonical record states HOW a weapon's size is treated (it never states the wielder's current choice):
//   tripodEffectiveSize / tripodTreatsAsOneSizeSmallerForWielding   while the weapon is mounted on a tripod, its size for wielding is smaller
//   mayCountAsSmallWhenBeneficial / mayTreatAsSizeWhenBeneficial    the WIELDER may choose to treat it as a smaller size (a choice, never a default)
//   wieldingRules[may-count-as-size].value                          the same fact in the structured wielding rules
//   sizeRule 'two_sizes_smaller_than_wearer'                        a worn item is a fixed number of sizes below its wearer (no choice)
// This module computes the EFFECTIVE size from those declarations and the CURRENT state the owned Item / the attack carries (tripod mounted, size
// choice made), and classifies it against the wielder's size (Core Rulebook p.120, Weapon Sizes: smaller = light, same = one-handed, one larger =
// two-handed, two or more larger = too large to use). The classification is what the weapon REQUIRES; the hands the wielder actually uses stay the
// wielder's explicit choice (owned-state.js resolveWielding). Pure: no mutation, no rolls.
import { SIZE_RANK } from './condition-policy.js';
// the established size-rank vocabulary of the weapon runtime (condition-policy.js SIZE_RANK) -- no second ordering table
const SIZE_NAMES = Object.freeze(Object.keys(SIZE_RANK));
export const sizeIndexOf = (s) => { const k = SIZE_NAMES.find((n) => n.toLowerCase() === String(s ?? '').trim().toLowerCase()); return k === undefined ? -1 : SIZE_RANK[k]; };
const sizeLabel = (i) => SIZE_NAMES.find((n) => SIZE_RANK[n] === i) ?? null;
const NUMBER_WORDS = Object.freeze({ one: 1, two: 2, three: 3 });
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/**
 * The structured size rules of a canonical record, or null when it declares none.
 * @returns {{tripod:{mode:'absolute'|'one-smaller', size:string|null}|null, beneficial:{size:string}|null, belowWearer:number|null, keys:string[]}|null}
 */
export function sizeRulesOf(operation, wieldingRules = [], preparedAttack = null) {
  const op = operation ?? {};
  const keys = [];
  let tripod = null;
  if (typeof op.tripodEffectiveSize === 'string' && sizeIndexOf(op.tripodEffectiveSize) >= 0) { tripod = { mode: 'absolute', size: op.tripodEffectiveSize }; keys.push('tripodEffectiveSize'); }
  else if (op.tripodTreatsAsOneSizeSmallerForWielding === true) { tripod = { mode: 'one-smaller', size: null }; keys.push('tripodTreatsAsOneSizeSmallerForWielding'); }
  let beneficial = null;
  const ruleSize = asArray(wieldingRules).find((r) => r?.effect === 'may-count-as-size' && sizeIndexOf(r.value) >= 0)?.value ?? null;
  if (typeof op.mayTreatAsSizeWhenBeneficial === 'string' && sizeIndexOf(op.mayTreatAsSizeWhenBeneficial) >= 0) { beneficial = { size: op.mayTreatAsSizeWhenBeneficial }; keys.push('mayTreatAsSizeWhenBeneficial'); }
  if (op.mayCountAsSmallWhenBeneficial === true) { beneficial = beneficial ?? { size: ruleSize ?? 'Small' }; keys.push('mayCountAsSmallWhenBeneficial'); }
  if (!beneficial && ruleSize) beneficial = { size: ruleSize };
  let belowWearer = null;
  const m = /^(one|two|three)_sizes?_smaller_than_wearer$/.exec(String(op.sizeRule ?? ''));
  if (m) { belowWearer = NUMBER_WORDS[m[1]]; keys.push('sizeRule'); }
  // a PREPARATION that temporarily changes the size (Heavy Blaster Cannon, Legacy Era Campaign Guide: braced = Large, wielder at least Medium). Structured only.
  let prepared = null;
  const ov = preparedAttack?.temporaryOverrides;
  if (ov && sizeIndexOf(ov.effectiveWeaponSize) >= 0) {
    const minimum = ov.wielderEligibility?.minimumWielderSize;
    prepared = { id: String(preparedAttack.id ?? 'prepare'), size: ov.effectiveWeaponSize, minimumWielderSize: sizeIndexOf(minimum) >= 0 ? minimum : null };
    keys.push('preparedAttack.temporaryOverrides');
  }
  if (!tripod && !beneficial && belowWearer === null && !prepared) return null;
  return Object.freeze({ tripod: tripod && Object.freeze(tripod), beneficial: beneficial && Object.freeze(beneficial), belowWearer, prepared: prepared && Object.freeze(prepared), keys: Object.freeze(keys) });
}

/**
 * Effective size for wielding. `state` = { mounted?:boolean, treatAs?:string }. A choice is honoured only when it names exactly the size the record
 * allows; an unknown / forged value is ignored, and no rule engages without its state. When several rules engage the SMALLEST result applies.
 * @returns {{index:number, size:string|null, via:'base'|'tripod'|'prepared'|'beneficial-choice'|'below-wearer', engaged:string[]}}
 */
export function effectiveSizeOf(rules, baseSize, { wielderSize = null, mounted = undefined, treatAs = null, prepared = false } = {}) {
  const baseIdx = sizeIndexOf(baseSize);
  const wielderIdx = sizeIndexOf(wielderSize);
  let best = { index: baseIdx, via: 'base' };
  const engaged = [];
  const consider = (index, via) => { if (index < 0) return; engaged.push(via); if (best.index < 0 || index < best.index) best = { index, via }; };
  if (rules?.belowWearer && wielderIdx >= 0) consider(Math.max(0, wielderIdx - rules.belowWearer), 'below-wearer');
  if (rules?.tripod && mounted === true) {
    if (rules.tripod.mode === 'absolute') consider(sizeIndexOf(rules.tripod.size), 'tripod');
    else if (baseIdx >= 0) consider(baseIdx - 1, 'tripod');
  }
  if (rules?.prepared && prepared === true) consider(sizeIndexOf(rules.prepared.size), 'prepared');
  if (rules?.beneficial && treatAs && sizeIndexOf(treatAs) === sizeIndexOf(rules.beneficial.size)) consider(sizeIndexOf(rules.beneficial.size), 'beneficial-choice');
  return Object.freeze({ index: best.index, size: sizeLabel(best.index), via: best.via, engaged: Object.freeze(engaged) });
}

/** Core Rulebook p.120: the classification of a weapon of size index `eff` for a wielder of size index `wielder`. */
export function classifySize(eff, wielder) {
  if (!(eff >= 0) || !(wielder >= 0)) return null;
  const d = eff - wielder;
  return d < 0 ? 'light' : d === 0 ? 'one-handed' : d === 1 ? 'two-handed' : 'too-large';
}

/**
 * The shared effective-size resolver (no mutation, no rolls, no dialogs).
 * @param {object} shape  an attack shape (needs .size, .sizeRules)
 * @param {string} actorSize  the wielder's size
 * @param {{tripodMounted?:boolean, beneficialSizeChoice?:string}} state  tripodMounted undefined = not established
 * @returns {{baseSize:string|null, effectiveSize:string|null, actorSize:string|null, sizeDelta:number|null, classification:'light'|'one-handed'|'two-handed'|'too-large'|null,
 *   requiredHands:2|null, source:'base'|'tripod'|'beneficial-choice'|'below-wearer', legal:boolean|null, pending:string|null, reason?:string}}
 *   legal false = definitely too large; legal null = depends on a tripod state that is not established (unknown is neither true nor false)
 */
export function resolveEffectiveWieldingSize(shape, actorSize, { tripodMounted, beneficialSizeChoice = null, prepared = false } = {}) {
  const rules = shape?.sizeRules ?? null;
  const base = shape?.size ?? null;
  const w = sizeIndexOf(actorSize);
  const at = (tripod) => effectiveSizeOf(rules, base, { wielderSize: actorSize, mounted: tripod, treatAs: beneficialSizeChoice, prepared });
  const pack = (eff, legal = undefined, pending = null, reason = undefined) => {
    const classification = classifySize(eff.index, w);
    const tooLarge = classification === 'too-large';
    // a preparation that changes the size also needs a wielder of at least the stated size (the braced cannon: Medium or larger)
    const minIdx = eff.via === 'prepared' ? sizeIndexOf(rules?.prepared?.minimumWielderSize) : -1;
    const belowMin = minIdx >= 0 && w >= 0 && w < minIdx;
    const verdict = belowMin ? false : (legal === undefined ? !tooLarge : legal);
    return Object.freeze({
      baseSize: base, effectiveSize: eff.size, actorSize: sizeLabel(w) ?? actorSize ?? null,
      sizeDelta: eff.index >= 0 && w >= 0 ? eff.index - w : null, classification,
      requiredHands: classification === 'two-handed' ? 2 : null, source: eff.via,
      legal: verdict, pending,
      ...(verdict === false ? { reason: belowMin ? 'below-minimum-wielder-size' : (reason ?? 'too-large-to-wield') } : {}),
    });
  };
  if (typeof tripodMounted === 'boolean' || !rules?.tripod) return pack(at(tripodMounted === true));
  // a tripod rule exists and whether the weapon is on a tripod is not established: the verdict stands only if both answers agree
  const off = at(false), on = at(true);
  const cOff = classifySize(off.index, w), cOn = classifySize(on.index, w);
  if (cOff === cOn) return pack(off);
  const base0 = pack(off, (cOff === 'too-large' || cOn === 'too-large') ? null : true, 'tripod');
  // both outcomes are exposed so a caller can tell WHETHER the unanswered question matters (a different grip, a different light class) and what each answer implies
  const outcome = (e, c) => Object.freeze({ classification: c, effectiveSize: e.size, requiredHands: c === 'two-handed' ? 2 : null });
  return Object.freeze({ ...base0, requiredHands: null, classification: null, outcomes: Object.freeze({ unmounted: outcome(off, cOff), mounted: outcome(on, cOn) }) });
}

/** The size state a consumer reads for ONE attack / classification: an explicit option wins over the owned state (never a free default). */
export function sizeStateOf(ownedState, context = {}) {
  // tri-state: true / false / undefined (not established) -- an unanswered tripod question is never silently false
  const mounted = typeof context?.mounted === 'boolean' ? context.mounted : (typeof ownedState?.mounted === 'boolean' ? ownedState.mounted : undefined);
  const treatAs = context?.beneficialSizeChoice ?? ownedState?.sizeTreatment ?? null;
  return { mounted, treatAs: typeof treatAs === 'string' ? treatAs : null };
}

/** sizeStateOf() for an owned weapon Item: reads its owned fire state (flags.swse.fireState) and the attack / classification context. */
export function ownedSizeStateOf(weapon, context = {}) {
  let owned = null;
  try { owned = weapon?.flags?.swse?.fireState ?? weapon?.getFlag?.('swse', 'fireState') ?? null; } catch { owned = null; }
  return sizeStateOf(owned, context);
}

/**
 * Worn / mounted-on-the-body classification of a canonical record (wear location: wrist | forearm; 'bracelet/jewelry' is a wrist item). CLASSIFICATION ONLY: the records do not say that a
 * worn weapon occupies, frees or needs a hand, so none of that is decided here.
 * @returns {{kind:'wrist'|'forearm'|null, wearLocation:'wrist'|'forearm'|null, keys:string[], worn:string|null}|null}
 */
export function wornClassOf(operation) {
  const op = operation ?? {};
  const keys = [];
  let kind = null;
  if (op.wornOnWrist === true) { kind = 'wrist'; keys.push('wornOnWrist'); }
  if (op.forearmMounted === true) { kind = kind ?? 'forearm'; keys.push('forearmMounted'); }
  const as = typeof op.wornAs === 'string' && op.wornAs.trim() ? op.wornAs.trim() : null;
  if (as) { if (as.toLowerCase().split('/').map((t) => t.trim()).includes('bracelet')) kind = kind ?? 'wrist'; keys.push('wornAs'); }
  return keys.length ? Object.freeze({ kind, wearLocation: kind, keys: Object.freeze(keys), worn: as }) : null;
}

/**
 * The Darkstick group the player established, validated against what the actor ACTUALLY has right now. The owned choice names the other participating
 * Item ids (`heldTogetherIds`); the group is valid only if the wielder is proficient, every named Item is an owned, equipped weapon of the same canonical
 * identity, none is the primary or designated as an off-hand weapon, none is the primary of a group of its own, and none is claimed by another group.
 * Attack preflight, damage and the dual-wield resolver all read this one result. `deps` = { shapeOf(item), proficient(weapon, actor) } (injected so this stays pure).
 * @returns {{ok:boolean, count:number, memberIds:string[], reason:string|null}}  ok false => the weapon is treated as held singly (count 1)
 */
export function resolveHeldGroup(actor, weapon, { shapeOf, proficient, equipped } = {}, idsOverride = null) {
  const single = (reason) => ({ ok: false, count: 1, memberIds: [], reason });
  let owned = null;
  try { owned = weapon?.flags?.swse?.fireState ?? weapon?.getFlag?.('swse', 'fireState') ?? null; } catch { owned = null; }
  const ids = asArray(idsOverride ?? owned?.heldTogetherIds).map(String).filter(Boolean);
  if (!ids.length) return single(null);
  const shape = shapeOf?.(weapon);
  if (!shape || shape.source !== 'canonical' || !shape.heldTogether) return single('not-holdable-together');
  if (new Set(ids).size !== ids.length || ids.includes(String(weapon?.id))) return single('duplicate-or-self');
  // the primary must BE one of the acting actor's own Items (object identity in the collection -- an id, an equipped flag or a `weapon.actor` pointer prove nothing)
  const items = Array.from(actor?.items ?? []);
  if (!items.some((i) => i === weapon)) return single('primary-not-owned');
  if (!(typeof proficient === 'function' && proficient(weapon, actor) === true)) return single('not-proficient');
  // equipped / readied per the repository's own predicate (isItemEquipped), for the primary and every member; no predicate = nothing is held
  const held = (it) => typeof equipped === 'function' && equipped(it, actor) === true;
  if (!held(weapon)) return single('primary-not-equipped');
  const stateOf = (it) => { try { return it?.flags?.swse?.fireState ?? it?.getFlag?.('swse', 'fireState') ?? null; } catch { return null; } };
  for (const id of ids) {
    const it = items.find((i) => i?.id === id);
    if (!it || it.type !== 'weapon') return single('member-missing');
    const sh = shapeOf(it);
    if (!sh || sh.source !== 'canonical' || sh.identityKey !== shape.identityKey) return single('member-not-same-weapon');
    if (!held(it)) return single('member-not-equipped');
    if (it.system?.isOffhand === true || it.system?.slot === 'offhand') return single('member-is-offhand');
    if (asArray(stateOf(it)?.heldTogetherIds).length) return single('member-has-its-own-group');
    if (items.some((o) => o?.id !== weapon?.id && o?.id !== id && asArray(stateOf(o)?.heldTogetherIds).map(String).includes(id))) return single('member-in-another-group');
  }
  if (weapon?.system?.isOffhand === true || weapon?.system?.slot === 'offhand') return single('primary-is-offhand');
  if (items.some((o) => o?.id !== weapon?.id && asArray(stateOf(o)?.heldTogetherIds).map(String).includes(String(weapon?.id)))) return single('primary-is-member-of-another-group');
  return { ok: true, count: 1 + ids.length, memberIds: ids, reason: null };
}

/** The two-handed design of a record: operation.designedForTwoHandedUse or the structured wieldingRules effect. */
export function designedTwoHandedOf(operation, wieldingRules = []) {
  return operation?.designedForTwoHandedUse === true || asArray(wieldingRules).some((r) => r?.effect === 'designed-for-two-handed-use');
}
