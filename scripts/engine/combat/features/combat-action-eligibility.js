/**
 * Combat action eligibility -- WHO MAY HAVE / USE an action, kept separate from WHETHER they can use it right now.
 *
 *   discovery   the action exists in a catalog (compendium, feat catalog)            -> never an entitlement by itself
 *   eligibility the actor has earned / may legitimately perform it                   -> this module
 *   availability economy, resources, conditions, context (spent Standard, etc.)      -> the existing action-economy / grapple authorities
 *
 * PURE: no Foundry globals, nothing is written, nothing is spent. It composes the existing authorities and invents none:
 *   owned feat / talent items            actor.items (the Ability Engine's items; the feat/talent resolver already emits cards only for owned items)
 *   Droid rules                          resolveDroidRulesProfile (follower / NPC droids included; contradictory evidence fails closed)
 *   installed hardware                   authorizeDroidComponentOperation (the installation ledger)
 *   resolved feat/talent choices         the same `selectedChoice` predicate the resolver uses
 *
 * Origins (set by the sheet where each row is registered):
 *   catalog      a combat-action catalog row. Entitlements are read ONLY from its structured fields (`requirements`, `requiredContext`, `restriction`).
 *   ability      a card exposed by an owned feat / talent item
 *   actor-item   an actor-owned `combat-action` item (species / actor special abilities)
 *   combined     a synthetic card for a cross-feat interaction (the resolver emits it only when the actor owns the feats)
 *   component    an action granted by installed Droid hardware
 *
 * Fail closed: a structured requirement this module does not recognise makes the action UNRESOLVED (never executable), and it is reported.
 */
import { resolveDroidRulesProfile } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-rules-profile.js';
import { featIs } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/ability-selector.js';
import { authorizeDroidComponentOperation } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-component-operation-gate.js';

export const ELIGIBILITY_STATE = Object.freeze({ UNLOCKED: 'unlocked', LOCKED: 'locked', UNRESOLVED: 'unresolved' });
export const ENTITLEMENT = Object.freeze({
  GENERAL: 'general', FEAT: 'feat', TALENT: 'talent', SPECIES: 'species', DROID_RULES: 'droid-rules',
  COMPONENT: 'component', SKILL_TRAINING: 'skill-training', CHOICE: 'choice'
});

const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const compact = (v) => norm(v).replace(/ /g, '');
const arr = (v) => (Array.isArray(v) ? v : (v === undefined || v === null || v === '' ? [] : [v]));
const itemsOf = (actor) => { try { return Array.from(actor?.items ?? []); } catch { return []; } };

/**
 * Parse ONE structured requirement string into an entitlement, a context precondition, or nothing it can decide.
 *   "<Name> feat" / "<Name> talent"   -> an owned feat / talent
 *   "Droids only"                     -> Droid rules
 *   "Trained in <Skill>"              -> skill training
 *   "... (already) Grappled/Pinned"   -> a TARGET/STATE precondition: context, handled at use time by the grapple authority, not an entitlement
 * @returns {{kind:'feat'|'talent'|'droid-rules'|'skill-training'|'context'|'unknown', name?:string, text:string}}
 */
export function parseRequirementText(text) {
  const t = String(text ?? '').trim();
  let m;
  if ((m = /^(.+?)\s+feat$/i.exec(t))) return { kind: 'feat', name: m[1].trim(), text: t };
  if ((m = /^(.+?)\s+talent$/i.exec(t))) return { kind: 'talent', name: m[1].trim(), text: t };
  if (/^droids?\s+only$/i.test(t)) return { kind: 'droid-rules', text: t };
  if ((m = /^trained\s+in\s+(.+)$/i.exec(t))) return { kind: 'skill-training', name: m[1].trim(), text: t };
  if (/\b(already\s+)?(grappled|pinned)\b/i.test(t) && /\b(is|are|must|both|target)\b/i.test(t)) return { kind: 'context', text: t };
  return { kind: 'unknown', text: t };
}

/** Structured requirement strings of a catalog row. `requirements` is authoritative (unknown text there is UNRESOLVED); `requiredContext` and `restriction` only contribute the entitlement forms above. */
export function catalogRequirementsOf(row = {}) {
  const out = [];
  const seen = new Set();
  const push = (entry, strict) => { const k = `${entry.kind}|${norm(entry.name ?? entry.text)}`; if (seen.has(k)) return; seen.add(k); out.push({ ...entry, strict }); };
  for (const text of arr(row.requirements)) if (typeof text === 'string' && text.trim()) push(parseRequirementText(text), true);
  for (const text of arr(row.requiredContext)) {
    if (typeof text !== 'string') continue;
    const p = parseRequirementText(text);
    if (p.kind === 'feat' || p.kind === 'talent' || p.kind === 'droid-rules' || p.kind === 'skill-training') push(p, false);
  }
  if (typeof row.restriction === 'string' && row.restriction.trim()) {
    const p = parseRequirementText(row.restriction);
    if (p.kind === 'droid-rules') push(p, false);
  }
  return out;
}

/**
 * Does the actor own this feat/talent? IDENTITY-FIRST, the same rule the grapple and multi-attack authorities use (`featIs`): an owned ability with a
 * canonical identity is the ability its identity says, so a same-named item carrying a different identity never impersonates it; the display name is
 * the fallback only for an item with no canonical identity. A disabled ability is not owned for this purpose.
 */
const matchesOwned = (actor, type, name) => itemsOf(actor).some((item) => String(item?.type ?? '').toLowerCase() === type
  && item?.system?.disabled !== true && featIs(item, norm(name).replace(/ /g, '-')));

function trainedIn(actor, skillName) {
  const skills = actor?.system?.skills;
  if (!skills || typeof skills !== 'object') return null;
  const want = compact(skillName);
  for (const [key, rec] of Object.entries(skills)) {
    if (compact(key) === want || compact(rec?.label ?? rec?.name) === want) return rec?.trained === true;
  }
  return null; // no such skill record: the evidence does not exist
}

const result = (state, extra = {}) => ({ state, entitlement: [], basis: [], missing: [], unresolved: [], reason: '', ...extra });
const hasChoice = (item) => {
  const c = item?.system?.selectedChoice ?? item?.system?.selectedChoices;
  if (Array.isArray(c)) return c.length > 0;
  if (c && typeof c === 'object') return Object.keys(c).length > 0;
  return c !== undefined && c !== null && String(c).trim() !== '';
};
const ownedItem = (actor, id) => (id ? (itemsOf(actor).find((i) => String(i?.id ?? i?._id) === String(id)) ?? null) : null);

/** structured droid-only evidence on an owned feat/talent card: the card/rule's own `requiresDroid` (never the display name) */
function cardRequiresDroid(item, row) {
  if (row?.ruleData?.requiresDroid === true || row?.requiresDroid === true) return true;
  const meta = item?.system?.abilityMeta ?? {};
  const wanted = norm(row?.sourceActionId);
  for (const rule of [...arr(meta.rules), ...arr(meta.actionRules)]) {
    if (rule?.requiresDroid === true && wanted && norm(rule.actionKey ?? rule.id) === wanted) return true;
  }
  return false;
}

/**
 * @param {object} actor
 * @param {object} row   a registered combat action row (carries `origin`)
 * @param {{droidProfile?:Function, authorizeComponent?:Function}} [deps]
 * @returns {{state:string, entitlement:string[], basis:string[], missing:string[], unresolved:string[], reason:string, execution:{allowed:boolean, reason:string}}}
 */
export function evaluateCombatActionEligibility(actor, row = {}, deps = {}) {
  const profileOf = deps.droidProfile ?? resolveDroidRulesProfile;
  const authorize = deps.authorizeComponent ?? authorizeDroidComponentOperation;
  const origin = String(row.origin ?? '');
  const finish = (r) => {
    const state = r.state;
    r.execution = state === ELIGIBILITY_STATE.UNLOCKED && !r.blockedExecution
      ? { allowed: true, reason: '' }
      : { allowed: false, reason: r.reason || (state === ELIGIBILITY_STATE.UNRESOLVED ? 'Eligibility is not established for this action.' : 'This actor has not unlocked this action.') };
    delete r.blockedExecution;
    return r;
  };

  if (origin === 'ability' || origin === 'actor-item') {
    const item = ownedItem(actor, row.itemId ?? row.sourceItemId);
    if (!item) return finish(result(ELIGIBILITY_STATE.LOCKED, { missing: [`${row.sourceName || 'source'} is not owned`], reason: `${row.sourceName || 'The granting feat/talent'} is not owned by this actor.` }));
    const type = String(item.type ?? '').toLowerCase();
    const kind = origin === 'actor-item' ? ENTITLEMENT.SPECIES : (type === 'talent' ? ENTITLEMENT.TALENT : ENTITLEMENT.FEAT);
    const r = result(ELIGIBILITY_STATE.UNLOCKED, { entitlement: [kind], basis: [`owned ${origin === 'actor-item' ? 'ability' : type}: ${item.name}`] });
    if (cardRequiresDroid(item, row) && !profileOf(actor).droidRules.isDroid) {
      r.state = ELIGIBILITY_STATE.LOCKED; r.missing.push('Droid rules'); r.reason = 'This action requires the actor to follow Droid rules.';
      return finish(r);
    }
    if (row.requiresSelectedChoice === true && !hasChoice(item)) {
      r.entitlement.push(ENTITLEMENT.CHOICE); r.blockedExecution = true; r.unresolved.push('selected choice');
      r.reason = 'This ability requires a selected choice from chargen/level-up before it can be used.';
    }
    return finish(r);
  }

  if (origin === 'combined') {
    // the resolver emits a combined card only when the actor owns every feat in the combination; execution re-derives it live
    return finish(result(ELIGIBILITY_STATE.UNLOCKED, { entitlement: [ENTITLEMENT.FEAT], basis: ['combined feat interaction (all feats owned)'] }));
  }

  if (origin === 'component') {
    const auth = authorize(actor, row.componentRef ?? {});
    if (auth.ok) return finish(result(ELIGIBILITY_STATE.UNLOCKED, { entitlement: [ENTITLEMENT.COMPONENT], basis: ['installed and operable hardware'] }));
    const unresolved = auth.status === 'UNRESOLVED';
    return finish(result(unresolved ? ELIGIBILITY_STATE.UNRESOLVED : ELIGIBILITY_STATE.LOCKED, { missing: ['operable installed component'], unresolved: unresolved ? [auth.reason || 'installation unresolved'] : [], reason: auth.reason || 'The granting component is not installed and operable.' }));
  }

  if (origin === 'catalog') {
    const reqs = catalogRequirementsOf(row);
    const r = result(ELIGIBILITY_STATE.UNLOCKED, { entitlement: [], basis: [] });
    const droid = reqs.some((q) => q.kind === 'droid-rules') ? profileOf(actor).droidRules.isDroid : null;
    for (const q of reqs) {
      if (q.kind === 'context') continue;
      if (q.kind === 'feat' || q.kind === 'talent') {
        r.entitlement.push(q.kind);
        if (matchesOwned(actor, q.kind, q.name)) r.basis.push(`owned ${q.kind}: ${q.name}`);
        else r.missing.push(`${q.name} ${q.kind}`);
      } else if (q.kind === 'droid-rules') {
        r.entitlement.push(ENTITLEMENT.DROID_RULES);
        if (droid) r.basis.push('follows Droid rules'); else r.missing.push('Droid rules');
      } else if (q.kind === 'skill-training') {
        r.entitlement.push(ENTITLEMENT.SKILL_TRAINING);
        const t = trainedIn(actor, q.name);
        if (t === true) r.basis.push(`trained in ${q.name}`);
        else if (t === false) r.missing.push(`Trained in ${q.name}`);
        else r.unresolved.push(q.text);
      } else if (q.strict) {
        r.unresolved.push(q.text); // an unrecognised STRUCTURED requirement: fail closed and report
      }
    }
    if (!r.entitlement.length && !r.unresolved.length) { r.entitlement.push(ENTITLEMENT.GENERAL); r.basis.push('general combat action'); }
    if (r.missing.length) { r.state = ELIGIBILITY_STATE.LOCKED; r.reason = `Requires ${r.missing.join(', ')}.`; }
    else if (r.unresolved.length) { r.state = ELIGIBILITY_STATE.UNRESOLVED; r.reason = `Eligibility not established: ${r.unresolved.join('; ')}.`; }
    return finish(r);
  }

  // an unknown origin has no evidence of entitlement
  return finish(result(ELIGIBILITY_STATE.UNRESOLVED, { unresolved: ['unknown action origin'], reason: 'Eligibility is not established for this action.' }));
}

/**
 * EXECUTION boundary. Re-derives the action from LIVE actor / catalog data by its key; nothing the caller put in `actionData` (a stale sheet, a macro) is
 * believed. `live` supplies the sources so this stays pure:
 *   live.catalogRow(key)        -> the live catalog row (with structured fields) or null
 *   live.abilityRow(key)        -> the live feat/talent card or null
 *   live.combinedRow(key)       -> the live combined-feat card or null
 * @returns {{allowed:boolean, reason:string, state:string, origin:string|null, eligibility:object|null}}
 */
export function authorizeCombatActionExecution(actor, actionId, live = {}, deps = {}) {
  const key = String(actionId ?? '');
  const refuse = (state, reason, origin = null, eligibility = null) => ({ allowed: false, reason, state, origin, eligibility });
  if (!actor) return refuse(ELIGIBILITY_STATE.UNRESOLVED, 'No actor.');
  if (!key) return refuse(ELIGIBILITY_STATE.UNRESOLVED, 'No action identity.');

  let origin = null; let row = null;
  if (key.startsWith('ability:')) {
    origin = 'ability'; row = live.abilityRow?.(key) ?? null;
    if (!row) return refuse(ELIGIBILITY_STATE.LOCKED, 'This action is no longer granted by an owned feat or talent.', origin);
  } else if (key.startsWith('combined:')) {
    origin = 'combined'; row = live.combinedRow?.(key) ?? null;
    if (!row) return refuse(ELIGIBILITY_STATE.LOCKED, 'This combined-feat action is not granted by the feats this actor owns.', origin);
  } else if (key.startsWith('item:')) {
    origin = 'actor-item';
    const item = ownedItem(actor, key.split(':')[1]);
    if (!item) return refuse(ELIGIBILITY_STATE.LOCKED, 'This ability item is not owned by this actor.', origin);
    row = { itemId: item.id ?? item._id, sourceName: item.name };
  } else {
    origin = 'catalog'; row = live.catalogRow?.(key) ?? null;
    // a key that no live source knows grants nothing and defines no entitlement; the sheet's own lookup is the only other source of truth
    if (!row) return refuse(ELIGIBILITY_STATE.UNRESOLVED, 'This action is not in the combat action catalog or granted by an owned ability.', origin);
  }
  const eligibility = evaluateCombatActionEligibility(actor, { ...row, origin }, deps);
  return eligibility.execution.allowed
    ? { allowed: true, reason: '', state: eligibility.state, origin, eligibility }
    : refuse(eligibility.state, eligibility.execution.reason, origin, eligibility);
}

export default { evaluateCombatActionEligibility, authorizeCombatActionExecution, parseRequirementText, catalogRequirementsOf, ELIGIBILITY_STATE, ENTITLEMENT };
