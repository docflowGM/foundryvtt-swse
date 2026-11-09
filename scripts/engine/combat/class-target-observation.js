/**
 * SWSE Core: class "observe an opponent" features.
 *
 *   Familiar Foe     (Bounty Hunter) Core Rulebook p.209
 *   Targeted Suspect (Enforcer)      The Force Unleashed Campaign Guide p.45
 *
 * Printed shape shared by both: a full-round action spent observing one
 * opponent in combat, usable only after that opponent has acted; the bonus is
 * one-half the class level (rounded down) and lasts until the encounter ends.
 * Score (Charlatan, Scum and Villainy p.32) reuses the same lifecycle but has no numeric bonus and no acted gate: its
 * effect is a Deception reroll (keep the better) against the observed target.
 * They differ in WHAT the benefit is:
 *   Familiar Foe     attack rolls AGAINST the opponent and Reflex Defense
 *                    AGAINST attacks MADE BY the opponent.
 *   Targeted Suspect attack rolls AGAINST the opponent and Deception,
 *                    Perception and Persuasion checks.
 *
 * Authorities reused (none is duplicated here):
 *   ownership   an owned class-feature Item keyed by featureKey (granted by the
 *               class pack -> entitlement manifest -> finalizer)
 *   level       the single owned class Item for the printed class
 *   action      ActionEconomyConsumption (full-round, with rollback)
 *   mutation    ActorEngine flag helpers
 *   encounter   Combat document id; records for any other combat never apply
 *
 * The record lives on the OBSERVER, keyed by combat id and target identity.
 * Nothing is written to derived defenses or skills: the bonus is computed per
 * roll from (observer, target, combat), so it cannot leak to another target.
 * Whether the target is truly an "opponent" is confirmed by the player/GM;
 * no line-of-sight or awareness engine is involved.
 */
// ActorEngine and ActionEconomyConsumption are loaded lazily (and injectable) so the pure rules below stay importable offline.
export async function runtimeDeps(deps = {}, { needSpend = true } = {}) {
  const [engineMod, actionMod] = await Promise.all([
    deps.actorEngine ? null : import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'),
    (deps.spend || !needSpend) ? null : import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js'),
  ]);
  return {
    actorEngine: deps.actorEngine ?? engineMod.ActorEngine,
    spend: deps.spend ?? (needSpend ? (...args) => actionMod.ActionEconomyConsumption.spend(...args) : null),
  };
}

export const OBSERVATION_FLAG_SCOPE = 'foundryvtt-swse';
export const OBSERVATION_FLAG_KEY = 'targetObservations';

export const OBSERVATION_FEATURES = Object.freeze({
  'bountyHunter.familiarFoe': Object.freeze({
    label: 'Familiar Foe', className: 'Bounty Hunter', source: 'Core Rulebook p.209',
    attack: true, reflexVsTarget: true, skills: Object.freeze([]), rerollSkills: Object.freeze([]),
    scaling: true, requiresActed: true,
  }),
  'enforcer.targetedSuspect': Object.freeze({
    label: 'Targeted Suspect', className: 'Enforcer', source: 'Force Unleashed Campaign Guide p.45',
    attack: true, reflexVsTarget: false, skills: Object.freeze(['deception', 'perception', 'persuasion']), rerollSkills: Object.freeze([]),
    scaling: true, requiresActed: true,
  }),
  // Score: no numeric bonus and no printed "after the opponent has acted" gate (per the independent print review of
  // Scum and Villainy p.32); a full-round observation enables Deception rerolls against that target, keeping the better result.
  'charlatan.score': Object.freeze({
    label: 'Score', className: 'Charlatan', source: 'Scum and Villainy p.32',
    attack: false, reflexVsTarget: false, skills: Object.freeze([]), rerollSkills: Object.freeze(['deception']),
    scaling: false, requiresActed: false,
  }),
});

const arrayOf = collection => {
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection?.contents)) return collection.contents;
  return collection && typeof collection[Symbol.iterator] === 'function' ? Array.from(collection) : [];
};
const norm = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const gameRef = () => globalThis.game;

/** Stable identity: a synthetic (unlinked) token actor has its own uuid. */
export function observationIdentity(actor) {
  const id = actor?.uuid ?? actor?.id ?? actor?._id ?? null;
  return id ? String(id) : null;
}

/** Class level from the single owned class Item for the printed class; 0 if absent or ambiguous. */
export function observationClassLevel(actor, className) {
  const wanted = norm(className);
  const matches = arrayOf(actor?.items).filter(item => item?.type === 'class'
    && norm(item?.system?.className || item?.system?.class_name || item?.name) === wanted);
  if (matches.length !== 1) return 0;
  const level = Number(matches[0].system?.level);
  return Number.isSafeInteger(level) && level > 0 ? level : 0;
}

export function ownsObservationFeature(actor, featureKey) {
  const owned = arrayOf(actor?.items).filter(item => item?.type === 'feat'
    && item?.system?.sourceType === 'class-feature'
    && item?.system?.featureKey === featureKey);
  return owned.length === 1;
}

/** One-half the owning class level, rounded down. Zero unless the keyed feature is owned. */
export function observationBonusFor(actor, featureKey) {
  const def = OBSERVATION_FEATURES[featureKey];
  if (!def || def.scaling !== true || !ownsObservationFeature(actor, featureKey)) return 0;
  return Math.floor(observationClassLevel(actor, def.className) / 2);
}

/** The keyed feature is owned and its owning class is present at a level that can use it. */
export function observationFeatureUsable(actor, featureKey) {
  const def = OBSERVATION_FEATURES[featureKey];
  if (!def || !ownsObservationFeature(actor, featureKey)) return false;
  const level = observationClassLevel(actor, def.className);
  return def.scaling === true ? Math.floor(level / 2) >= 1 : level >= 1;
}

function readStore(actor) {
  const raw = actor?.flags?.[OBSERVATION_FLAG_SCOPE]?.[OBSERVATION_FLAG_KEY]
    ?? actor?.getFlag?.(OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

/** Records for ONE combat. Any other combat's records are invisible here. */
export function activeObservations(actor, combatId) {
  if (!combatId) return [];
  const list = readStore(actor)[combatId];
  return Array.isArray(list) ? list.filter(r => r && OBSERVATION_FEATURES[r.featureKey] && r.targetId) : [];
}

function currentCombatId(combat) {
  const live = combat ?? gameRef()?.combat;
  return live?.started === true ? live.id : null;
}

function qualifying(observer, target, combat, predicate) {
  const combatId = currentCombatId(combat);
  const targetId = observationIdentity(target);
  if (!combatId || !targetId || !observer) return [];
  return activeObservations(observer, combatId).filter(r => r.targetId === targetId
    && predicate(OBSERVATION_FEATURES[r.featureKey]) && observationFeatureUsable(observer, r.featureKey));
}

const sumBonus = (observer, records) => records.reduce((n, r) => n + observationBonusFor(observer, r.featureKey), 0);

/** Attack bonus the attacker has against this target (both features). */
export function observedAttackBonus(attacker, target, combat = null) {
  return sumBonus(attacker, qualifying(attacker, target, combat, def => def.attack));
}

/** Reflex bonus the defender has against attacks made BY this attacker (Familiar Foe only). */
export function observedReflexBonus(defender, attacker, combat = null) {
  return sumBonus(defender, qualifying(defender, attacker, combat, def => def.reflexVsTarget));
}

/** Skill bonus against this target (Targeted Suspect only); the caller must have designated the target. */
export function observedSkillBonus(actor, skillKey, target, combat = null) {
  const key = norm(skillKey);
  return sumBonus(actor, qualifying(actor, target, combat, def => def.skills.includes(key)));
}

/** Score: true when a Deception (or other rerollSkills) check against this target keeps the better of two d20s. */
export function observedSkillRerolls(actor, skillKey, target, combat = null) {
  const key = norm(skillKey);
  return qualifying(actor, target, combat, def => def.rerollSkills.includes(key)).length > 0;
}

/** True when the actor has an active observation on this target that applies to the skill (for UI gating). */
export function hasObservedSkillTarget(actor, skillKey, target, combat = null) {
  return observedSkillBonus(actor, skillKey, target, combat) > 0 || observedSkillRerolls(actor, skillKey, target, combat);
}

function combatantFor(combat, actor) {
  const id = observationIdentity(actor);
  return arrayOf(combat?.combatants).find(c => c?.actor && observationIdentity(c.actor) === id) ?? null;
}

/** The target has taken a turn in this combat (initiative order), unless the GM states otherwise. */
export function targetHasActed(combat, target, { gmConfirmedActed = false } = {}) {
  if (gmConfirmedActed === true && gameRef()?.user?.isGM === true) return true;
  const combatant = combatantFor(combat, target);
  if (!combatant || combatant.initiative === null || combatant.initiative === undefined) return false;
  const round = Number(combat?.round);
  if (!Number.isFinite(round) || round < 1) return false;
  if (round > 1) return true;
  const turns = arrayOf(combat?.turns);
  const index = turns.findIndex(c => c?.id === combatant.id);
  return index >= 0 && index < Number(combat?.turn);
}

/** Pure validation. Returns {ok, errors, record}. */
export function planObservation({ observer, featureKey, target, combat, confirmed = false, gmConfirmedActed = false } = {}) {
  const errors = [];
  const def = OBSERVATION_FEATURES[featureKey];
  if (!def) errors.push(`Unknown observation feature: ${featureKey}`);
  if (!observer) errors.push('An observing actor is required');
  if (def && observer && !ownsObservationFeature(observer, featureKey)) errors.push(`${def.label} is not owned as a granted class feature`);
  if (def && observer && !observationFeatureUsable(observer, featureKey)) errors.push(`${def.label} is not usable at the current ${def.className} class level`);
  if (!combat?.id || combat.started !== true) errors.push('Observation requires a started encounter');
  const targetId = observationIdentity(target);
  if (!targetId) errors.push('A designated target is required');
  if (targetId && targetId === observationIdentity(observer)) errors.push('An actor cannot observe itself');
  if (confirmed !== true) errors.push('The player or GM must confirm the designated opponent');
  if (combat?.started === true && observer) {
    const own = combatantFor(combat, observer);
    if (!own) errors.push('The observer is not in this encounter');
    else if (combat.combatant?.id !== own.id) errors.push('The observer can only observe during their own turn');
    if (target && !combatantFor(combat, target)) errors.push('The target is not in this encounter');
    else if (target && def?.requiresActed && !targetHasActed(combat, target, { gmConfirmedActed })) errors.push('The target has not yet acted in this encounter');
  }
  if (errors.length === 0 && activeObservations(observer, combat.id).some(r => r.featureKey === featureKey && r.targetId === targetId)) {
    errors.push(`${def.label} is already active against this target`);
  }
  if (errors.length) return { ok: false, errors, record: null };
  return {
    ok: true, errors: [],
    record: { featureKey, targetId, targetName: target?.name ?? '', round: Number(combat.round) || 1 },
  };
}

const locks = new Set();

/**
 * Activate an observation. Order: validate -> spend full-round action -> persist (ActorEngine).
 * A persistence failure refunds the action. Nothing is written if the action is refused.
 */
export async function activateObservation({ observer, featureKey, target, combat = gameRef()?.combat, confirmed = false, gmConfirmedActed = false, deps = {} } = {}) {
  const lockKey = observationIdentity(observer);
  if (lockKey && locks.has(lockKey)) throw new Error('An observation is already being activated for this actor');
  if (lockKey) locks.add(lockKey);
  try {
    const plan = planObservation({ observer, featureKey, target, combat, confirmed, gmConfirmedActed });
    if (!plan.ok) throw new Error(plan.errors.join('; '));
    const def = OBSERVATION_FEATURES[featureKey];
    const { actorEngine, spend: spendAction } = await runtimeDeps(deps);
    const spend = await spendAction(observer, 'full-round', {
      source: featureKey, actionName: def.label, encounterId: combat.id, targetId: plan.record.targetId,
    }, { notify: true });
    if (!spend?.allowed || spend.noOp === true) throw new Error(`${def.label}: the full-round action could not be spent`);
    try {
      const store = { ...readStore(observer) };
      store[combat.id] = [...activeObservations(observer, combat.id), plan.record];
      await actorEngine.updateActorFlags(observer, OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY, store, { meta: { origin: featureKey } });
    } catch (error) {
      const refunded = await spend.rollback?.();
      const note = spend.committed !== true || refunded === true ? '' : ' (action NOT refunded; GM review)';
      throw new Error(`${def.label} could not be recorded${note}: ${error.message}`);
    }
    return { success: true, record: plan.record, encounterId: combat.id };
  } finally {
    if (lockKey) locks.delete(lockKey);
  }
}

/** Drop this combat's records. Bounded hygiene only: reads already ignore other combats. */
export async function pruneObservations(actor, combatId, deps = {}) {
  const store = readStore(actor);
  if (!combatId || !(combatId in store)) return false;
  const { actorEngine } = await runtimeDeps(deps, { needSpend: false });
  const next = { ...store };
  delete next[combatId];
  if (Object.keys(next).length) await actorEngine.updateActorFlags(actor, OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY, next, { meta: { origin: 'target-observation-prune' } });
  else await actorEngine.unsetActorFlag(actor, OBSERVATION_FLAG_SCOPE, OBSERVATION_FLAG_KEY, { meta: { origin: 'target-observation-prune' } });
  return true;
}

/** The single currently targeted actor (Foundry user targets), or null when zero or several are targeted. */
export function soleTargetedActor(user = gameRef()?.user) {
  const targets = arrayOf(user?.targets);
  return targets.length === 1 ? (targets[0]?.actor ?? null) : null;
}

/**
 * Player-facing entry: observe the single currently targeted token. The confirm dialog is the player/GM
 * statement that the target is an opponent being observed; the "has acted" fact is computed from initiative order.
 */
export async function confirmTargetDialog(title, content) {
  const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js').catch(() => ({}));
  const Dialog = SWSEDialogV2?.confirm ? SWSEDialogV2 : globalThis.foundry?.applications?.api?.DialogV2;
  return Dialog?.confirm ? await Dialog.confirm({ title, content, rejectClose: false }) : false;
}

export async function observeTargetedOpponent(observer, featureKey) {
  const def = OBSERVATION_FEATURES[featureKey];
  const target = soleTargetedActor();
  if (!def) throw new Error(`Unknown observation feature: ${featureKey}`);
  if (!target) {
    globalThis.ui?.notifications?.warn?.(`${def.label}: target exactly one opponent first.`);
    return null;
  }
  const ok = await confirmTargetDialog(def.label, `<p>Spend a full-round action observing <b>${foundryEscape(target.name)}</b> as an opponent?</p>`);
  if (ok !== true) return null;
  try {
    return await activateObservation({ observer, featureKey, target, confirmed: true });
  } catch (error) {
    globalThis.ui?.notifications?.warn?.(error.message);
    return null;
  }
}
const foundryEscape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
