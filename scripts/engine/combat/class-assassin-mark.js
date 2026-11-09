/**
 * SWSE Core: Assassin — Mark (Scum and Villainy p.30, per the independent print review).
 *
 *   - At the start of the encounter the Assassin selects one visible target (the mark). No action cost is printed.
 *   - Damage bonus against the mark = one-half Assassin class level (rounded down), added to normal damage.
 *     It sits inside the same flat damage total the critical multiplier doubles "as normal".
 *   - When the mark drops to 0 hit points the Assassin may transfer it to another visible target as a free action.
 *
 * NOT IMPLEMENTED (blocked, see docs/audits/class-realignment-iv-wave-c.md): the swift-action "sacrifice the bonus to make the
 * target flat-footed against your next attack" option. Attack resolution has no per-attack flat-footed Reflex seam, and
 * partially applying the sacrifice (losing the mark without the flat-footed effect) would be misleading, so the whole option
 * is withheld rather than approximated. No separate "extra damage vs flat-footed" bonus is printed and none is invented.
 *
 * Visibility is confirmed by the player/GM; no line-of-sight engine is involved. The mark lives on the Assassin keyed by
 * combat id, so another or ended encounter never applies. The bonus is computed per roll; nothing is written to derived data.
 */
import { observationIdentity, observationClassLevel, ownsObservationFeature, runtimeDeps, soleTargetedActor, confirmTargetDialog } from './class-target-observation.js';

export const MARK_FEATURE_KEY = 'assassin.mark';
export const MARK_FLAG_SCOPE = 'foundryvtt-swse';
export const MARK_FLAG_KEY = 'assassinMark';

const arrayOf = c => Array.isArray(c) ? c : Array.isArray(c?.contents) ? c.contents : (c && typeof c[Symbol.iterator] === 'function' ? Array.from(c) : []);
const gameRef = () => globalThis.game;

/** One-half Assassin class level, only for the single owned, keyed feature. */
export function markBonusFor(actor) {
  if (!ownsObservationFeature(actor, MARK_FEATURE_KEY)) return 0;
  return Math.floor(observationClassLevel(actor, 'Assassin') / 2);
}

function readStore(actor) {
  const raw = actor?.flags?.[MARK_FLAG_SCOPE]?.[MARK_FLAG_KEY] ?? actor?.getFlag?.(MARK_FLAG_SCOPE, MARK_FLAG_KEY);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
const startedCombatId = combat => { const c = combat ?? gameRef()?.combat; return c?.started === true ? c.id : null; };

/** The Assassin's record for this combat (active or lost), or null. */
export function markRecord(actor, combatId) {
  const rec = combatId ? readStore(actor)[combatId] : null;
  return rec && typeof rec === 'object' ? rec : null;
}
/** The active (not lost) mark for this combat, or null. */
export function activeMark(actor, combatId) {
  const rec = markRecord(actor, combatId);
  return rec && rec.lost !== true && rec.targetId ? rec : null;
}

/** Mark damage added to a weapon damage total (pre-critical). Zero unless this exact target is the active mark. */
export function markDamageBonus(attacker, target, combat = null) {
  const combatId = startedCombatId(combat);
  const targetId = observationIdentity(target);
  if (!combatId || !targetId || !attacker) return 0;
  const rec = activeMark(attacker, combatId);
  if (!rec || rec.targetId !== targetId) return 0;
  return markBonusFor(attacker);
}

function combatantFor(combat, actor) {
  const id = observationIdentity(actor);
  return arrayOf(combat?.combatants).find(c => c?.actor && observationIdentity(c.actor) === id) ?? null;
}
const hpOf = actor => Number(actor?.system?.hp?.value);

function commonErrors({ observer, target, combat, confirmedVisible }) {
  const errors = [];
  if (!observer) errors.push('An Assassin is required');
  if (observer && !ownsObservationFeature(observer, MARK_FEATURE_KEY)) errors.push('Mark is not owned as a granted class feature');
  if (observer && markBonusFor(observer) < 1) errors.push('Mark grants no bonus at the current Assassin class level');
  if (!combat?.id || combat.started !== true) errors.push('Mark requires a started encounter');
  const targetId = observationIdentity(target);
  if (!targetId) errors.push('A designated target is required');
  if (targetId && targetId === observationIdentity(observer)) errors.push('An Assassin cannot mark themselves');
  if (confirmedVisible !== true) errors.push('The player or GM must confirm the target is visible');
  if (combat?.started === true) {
    if (observer && !combatantFor(combat, observer)) errors.push('The Assassin is not in this encounter');
    if (target && !combatantFor(combat, target)) errors.push('The target is not in this encounter');
  }
  return errors;
}

/** Pure validation for the initial designation. One mark per encounter, including a lost one. */
export function planMark({ observer, target, combat, confirmedVisible = false, gmAllowsLate = false } = {}) {
  const errors = commonErrors({ observer, target, combat, confirmedVisible });
  if (errors.length === 0) {
    if (markRecord(observer, combat.id)) errors.push('A mark was already chosen this encounter');
    else if (Number(combat.round) > 1 && !(gmAllowsLate === true && gameRef()?.user?.isGM === true)) {
      errors.push('The mark is chosen at the start of the encounter; only a GM may allow it later');
    }
  }
  return errors.length ? { ok: false, errors, record: null }
    : { ok: true, errors: [], record: { targetId: observationIdentity(target), targetName: target?.name ?? '', round: Number(combat.round) || 1, lost: false } };
}

/** Pure validation for transferring the mark after it drops to 0 hit points. */
export function planTransfer({ observer, newTarget, combat, confirmedVisible = false, gmConfirmedDown = false } = {}) {
  const errors = commonErrors({ observer, target: newTarget, combat, confirmedVisible });
  let old = null;
  if (errors.length === 0) {
    old = activeMark(observer, combat.id);
    if (!old) errors.push('There is no active mark to transfer');
    else if (old.targetId === observationIdentity(newTarget)) errors.push('The new target is already the mark');
    else {
      const oldCombatant = arrayOf(combat.combatants).find(c => c?.actor && observationIdentity(c.actor) === old.targetId);
      const down = oldCombatant ? hpOf(oldCombatant.actor) <= 0 : false;
      if (!down && !(gmConfirmedDown === true && gameRef()?.user?.isGM === true)) {
        errors.push('The mark can transfer only after it has dropped to 0 hit points (a GM may confirm this)');
      }
    }
  }
  return errors.length ? { ok: false, errors, record: null }
    : { ok: true, errors: [], record: { targetId: observationIdentity(newTarget), targetName: newTarget?.name ?? '', round: Number(combat.round) || 1, lost: false, transferredFrom: old.targetId } };
}

const locks = new Set();
async function persist(observer, combat, record, deps) {
  const { actorEngine } = await runtimeDeps(deps, { needSpend: false });
  await actorEngine.updateActorFlags(observer, MARK_FLAG_SCOPE, MARK_FLAG_KEY, { ...readStore(observer), [combat.id]: record }, { meta: { origin: MARK_FEATURE_KEY } });
}
async function guarded(observer, work) {
  const key = observationIdentity(observer);
  if (key && locks.has(key)) throw new Error('A Mark change is already in progress for this actor');
  if (key) locks.add(key);
  try { return await work(); } finally { if (key) locks.delete(key); }
}

export async function designateMark({ observer, target, combat = gameRef()?.combat, confirmedVisible = false, gmAllowsLate = false, deps = {} } = {}) {
  return guarded(observer, async () => {
    const plan = planMark({ observer, target, combat, confirmedVisible, gmAllowsLate });
    if (!plan.ok) throw new Error(plan.errors.join('; '));
    await persist(observer, combat, plan.record, deps);
    return { success: true, record: plan.record, encounterId: combat.id };
  });
}

export async function transferMark({ observer, newTarget, combat = gameRef()?.combat, confirmedVisible = false, gmConfirmedDown = false, deps = {} } = {}) {
  return guarded(observer, async () => {
    const plan = planTransfer({ observer, newTarget, combat, confirmedVisible, gmConfirmedDown });
    if (!plan.ok) throw new Error(plan.errors.join('; '));
    await persist(observer, combat, plan.record, deps);
    return { success: true, record: plan.record, encounterId: combat.id };
  });
}

/** Drop this combat's mark record (encounter-end hygiene; reads already ignore other combats). */
export async function pruneMarks(actor, combatId, deps = {}) {
  const store = readStore(actor);
  if (!combatId || !(combatId in store)) return false;
  const { actorEngine } = await runtimeDeps(deps, { needSpend: false });
  const next = { ...store };
  delete next[combatId];
  if (Object.keys(next).length) await actorEngine.updateActorFlags(actor, MARK_FLAG_SCOPE, MARK_FLAG_KEY, next, { meta: { origin: 'assassin-mark-prune' } });
  else await actorEngine.unsetActorFlag(actor, MARK_FLAG_SCOPE, MARK_FLAG_KEY, { meta: { origin: 'assassin-mark-prune' } });
  return true;
}

/** Player-facing entry: mark (or, with {transfer:true}, re-mark) the single currently targeted token after a confirm. */
export async function markTargetedOpponent(observer, { transfer = false } = {}) {
  const target = soleTargetedActor();
  if (!target) { globalThis.ui?.notifications?.warn?.('Mark: target exactly one visible opponent first.'); return null; }
  const ok = await confirmTargetDialog('Mark', `<p>${transfer ? 'Transfer your Mark to' : 'Mark'} <b>${target.name}</b>? You can see this target.</p>`);
  if (ok !== true) return null;
  try {
    return transfer
      ? await transferMark({ observer, newTarget: target, confirmedVisible: true })
      : await designateMark({ observer, target, confirmedVisible: true });
  } catch (error) {
    globalThis.ui?.notifications?.warn?.(error.message);
    return null;
  }
}
