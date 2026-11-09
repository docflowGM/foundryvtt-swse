/**
 * SWSE Core: Melee Duelist — Master of Movement (Knights of the Old Republic Campaign Guide, Melee Duelist).
 *
 * "A number of times per encounter equal to half your melee duelist level, you can either ignore the movement penalty for moving
 *  through difficult terrain or over low objects on a single move action, or reroll a single Jump or Acrobatics check, taking the
 *  better result."
 *
 * One shared per-encounter use pool (floor(Melee Duelist level / 2)); each use is exactly one of the two options.
 *   reroll    Jump or Acrobatics: the check rolls two d20s and keeps the better (the same 2d20kh1 primitive Master Saboteur and
 *             Score use). The use is committed before the roll and refunded if the roll fails.
 *   movement  Spends a use and returns a receipt. The terrain/obstacle judgement and the move itself stay with the GM and
 *             Foundry's own movement tools; no pathfinding or terrain engine is involved.
 * Uses live on the actor keyed by combat id (another or ended encounter never applies) and are written through ActorEngine.
 * Under Athletics consolidation the check is matched by the skill the player REQUESTED (Jump or Acrobatics); a generic Athletics
 * request does not qualify (fail closed).
 */
import { observationClassLevel, ownsObservationFeature, runtimeDeps } from './class-target-observation.js';

export const MASTER_OF_MOVEMENT_KEY = 'meleeDuelist.masterOfMovement';
export const MOM_FLAG_SCOPE = 'foundryvtt-swse';
export const MOM_FLAG_KEY = 'masterOfMovementUses';
export const MOM_REROLL_SKILLS = Object.freeze(['jump', 'acrobatics']);

const gameRef = () => globalThis.game;
const norm = v => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function masterOfMovementMax(actor) {
  if (!ownsObservationFeature(actor, MASTER_OF_MOVEMENT_KEY)) return 0;
  return Math.floor(observationClassLevel(actor, 'Melee Duelist') / 2);
}
export function isMasterOfMovementRerollSkill(requestedSkillKey) { return MOM_REROLL_SKILLS.includes(norm(requestedSkillKey)); }

function readStore(actor) {
  const raw = actor?.flags?.[MOM_FLAG_SCOPE]?.[MOM_FLAG_KEY] ?? actor?.getFlag?.(MOM_FLAG_SCOPE, MOM_FLAG_KEY);
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
const startedCombatId = combat => { const c = combat ?? gameRef()?.combat; return c?.started === true ? c.id : null; };
const inCombat = (combat, actor) => Array.from(combat?.combatants ?? []).some(c => c?.actor && (c.actor.uuid ?? c.actor.id) === (actor.uuid ?? actor.id));

/** Uses left this encounter; 0 outside a started encounter the actor is part of. */
export function masterOfMovementRemaining(actor, combat = null) {
  const id = startedCombatId(combat);
  const live = combat ?? gameRef()?.combat;
  if (!id || !actor || !inCombat(live, actor)) return 0;
  const used = Number(readStore(actor)[id]);
  return Math.max(0, masterOfMovementMax(actor) - (Number.isSafeInteger(used) && used > 0 ? used : 0));
}

/** Pure validation. choice: 'movement' | 'reroll'; reroll also needs the requested skill and a rolled (not Take 10/20) check. */
export function planMasterOfMovement({ actor, choice, requestedSkillKey = null, checkMode = 'roll', combat = null } = {}) {
  const errors = [];
  if (!['movement', 'reroll'].includes(choice)) errors.push('Choose movement or reroll');
  if (!actor || !ownsObservationFeature(actor, MASTER_OF_MOVEMENT_KEY)) errors.push('Master of Movement is not owned as a granted class feature');
  else if (masterOfMovementMax(actor) < 1) errors.push('Master of Movement grants no uses at the current Melee Duelist class level');
  if (errors.length === 0 && masterOfMovementRemaining(actor, combat) < 1) errors.push('No Master of Movement uses remain this encounter');
  if (choice === 'reroll') {
    if (!isMasterOfMovementRerollSkill(requestedSkillKey)) errors.push('Master of Movement rerolls only a Jump or Acrobatics check');
    if (String(checkMode || 'roll').toLowerCase() !== 'roll') errors.push('Master of Movement rerolls a rolled check, not Take 10 or Take 20');
  }
  return { ok: errors.length === 0, errors };
}

const locks = new Set();
async function writeUsed(actor, combatId, used, deps) {
  const { actorEngine } = await runtimeDeps(deps, { needSpend: false });
  await actorEngine.updateActorFlags(actor, MOM_FLAG_SCOPE, MOM_FLAG_KEY, { ...readStore(actor), [combatId]: used }, { meta: { origin: MASTER_OF_MOVEMENT_KEY } });
}

/**
 * Spend one use. Returns a receipt whose refund() restores it (idempotent). Never spends when the plan is refused.
 */
export async function spendMasterOfMovement({ actor, choice, requestedSkillKey = null, checkMode = 'roll', combat = gameRef()?.combat, deps = {} } = {}) {
  const plan = planMasterOfMovement({ actor, choice, requestedSkillKey, checkMode, combat });
  if (!plan.ok) throw new Error(plan.errors.join('; '));
  const key = actor.uuid ?? actor.id;
  if (locks.has(key)) throw new Error('A Master of Movement use is already being spent for this actor');
  locks.add(key);
  try {
    const combatId = combat.id;
    const before = Number(readStore(actor)[combatId]) || 0;
    await writeUsed(actor, combatId, before + 1, deps);
    let refunded = false;
    return {
      success: true, choice, encounterId: combatId, remaining: masterOfMovementRemaining(actor, combat),
      refund: async () => {
        if (refunded) return false;
        refunded = true;
        await writeUsed(actor, combatId, Math.max(0, (Number(readStore(actor)[combatId]) || 0) - 1), deps);
        return true;
      },
    };
  } finally { locks.delete(key); }
}

export async function pruneMasterOfMovement(actor, combatId, deps = {}) {
  const store = readStore(actor);
  if (!combatId || !(combatId in store)) return false;
  const { actorEngine } = await runtimeDeps(deps, { needSpend: false });
  const next = { ...store };
  delete next[combatId];
  if (Object.keys(next).length) await actorEngine.updateActorFlags(actor, MOM_FLAG_SCOPE, MOM_FLAG_KEY, next, { meta: { origin: 'master-of-movement-prune' } });
  else await actorEngine.unsetActorFlag(actor, MOM_FLAG_SCOPE, MOM_FLAG_KEY, { meta: { origin: 'master-of-movement-prune' } });
  return true;
}

/** Player-facing entry for the movement option: spend a use and tell the table (the GM applies the terrain relief). */
export async function useMasterOfMovementMovement(actor) {
  try {
    const receipt = await spendMasterOfMovement({ actor, choice: 'movement' });
    globalThis.ui?.notifications?.info?.(`${actor.name}: Master of Movement used. Ignore difficult-terrain / low-object movement penalties on one move action (GM adjudicates the terrain). ${receipt.remaining} use(s) left.`);
    return receipt;
  } catch (error) {
    globalThis.ui?.notifications?.warn?.(error.message);
    return null;
  }
}
