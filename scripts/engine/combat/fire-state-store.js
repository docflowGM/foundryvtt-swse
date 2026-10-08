// Phase 5D-G -- owned fire state + combat clock for canonical weapons.
// Pure rules live in items/weapon-runtime/fire-state.js; this module is the boundary to the live world:
//   clock  : the active Foundry combat (round) -- nothing is invented when there is none
//   state  : flags.swse.fireState on the OWNED weapon Item, written through ActorEngine (never in the registry, never cached here)
//   spend  : preparation/reset actions go through the existing ActionEconomyConsumption (with rollback)
// Legacy/custom weapons and canonical forms with no temporal constraint pass straight through: nothing is read or written.
import { evaluateReadiness, stateAfterFire, stateAfterReload } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/fire-state.js";
import { resolveAttackShapeFor } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";

const FLAG_PATH = 'flags.swse.fireState';
const abilityToken = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Active combat clock for this actor, or null (no combat / not started / actor not a combatant). */
export function currentClock(actor, combat = globalThis.game?.combat) {
  if (!combat || combat.started === false || !Number.isFinite(Number(combat.round)) || Number(combat.round) < 1) return null;
  const inCombat = Array.from(combat.combatants ?? []).some((c) => c?.actor?.id === actor?.id || c?.actorId === actor?.id);
  return inCombat ? { combatId: combat.id, round: Number(combat.round) } : null;
}

export const readFireState = (weapon) => weapon?.flags?.swse?.fireState ?? weapon?.getFlag?.('swse', 'fireState') ?? null;

/** Abilities active on this attack, normalized (option ids and the feats that provide them), for ability-triggered resets. */
function triggeredAbilities(actor, rollOptions = {}) {
  const active = rollOptions.combatOptions ?? rollOptions.attackOptions ?? {};
  const out = new Set();
  for (const [id, v] of Object.entries(active)) if (v && v !== '0') out.add(abilityToken(id.replace(/([a-z0-9])([A-Z])/g, '$1-$2')));
  // a feat that has Rapid Shot as a PREREQUISITE counts as "a feat with Rapid Shot as a prerequisite" when its option is active
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== 'feat') continue;
    const prereq = JSON.stringify(item.system?.prerequisites ?? item.system?.prerequisite ?? item.system?.prerequisiteText ?? '').toLowerCase();
    if (!prereq.includes('rapid shot')) continue;
    for (const rule of item.system?.abilityMeta?.rules ?? []) {
      const id = rule?.option ?? rule?.id;
      if (rule?.type === 'ATTACK_OPTION' && id && active[id]) out.add('rapid-shot');
    }
  }
  return [...out];
}

function context(actor, rollOptions) {
  return { wielderSize: actor?.system?.size ?? actor?.system?.details?.size ?? null, triggeredAbilities: triggeredAbilities(actor, rollOptions) };
}

/**
 * Non-mutating readiness of the selected canonical form. Safe for previews. Legacy weapons / unconstrained forms -> always ready.
 * @returns {{applies:boolean, ready:boolean, blockers:Array, requiredActions:Array, notes:Array, clock:object|null}}
 */
export function previewReadiness(actor, weapon, runtime, rollOptions = {}) {
  const shape = resolveAttackShapeFor(runtime, rollOptions);
  if (shape.source !== 'canonical' || !shape.temporal.length) return { applies: false, ready: true, blockers: [], requiredActions: [], notes: [], clock: null };
  const clock = currentClock(actor);
  const r = evaluateReadiness(shape.temporal, readFireState(weapon), clock, context(actor, rollOptions));
  return { applies: true, ...r, clock };
}

async function writeState(actor, weapon, state) {
  if (!weapon) return;
  const owner = weapon.actor ?? actor;
  try {
    if (owner && weapon.id) {
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
      await ActorEngine.updateOwnedItems(owner, [{ _id: weapon.id, [FLAG_PATH]: state }]);
    } else if (typeof weapon.update === 'function') {
      await weapon.update({ [FLAG_PATH]: state });
    }
  } catch (err) {
    console.warn('[SWSE] Could not persist weapon fire state (the attack still resolved).', err);
  }
}

/**
 * Pay the actions the form requires before this shot (preparation / resets) through the existing action economy.
 * Out of combat the economy is a no-op, exactly as for every other action cost. Returns {ok, paid, rollback}.
 */
export async function spendRequiredActions(actor, requiredActions = [], metadata = {}) {
  const spends = [], paid = [];
  for (const req of requiredActions) {
    const res = await ActionEconomyConsumption.spend(actor, req.action, { source: 'fire-state', actionName: `${metadata.weaponName ?? 'Weapon'}: ${req.reason}`, ...metadata }, { notify: true });
    if (res?.allowed === false || res?.permitted === false) {
      for (const s of spends.reverse()) await s.rollback?.();
      return { ok: false, paid: [], failed: req, rollback: async () => {} };
    }
    spends.push(res); paid.push(req);
  }
  return { ok: true, paid, rollback: async () => { for (const s of [...spends].reverse()) await s.rollback?.(); } };
}

/** Record that a shot was fired (after the attack resolved). No-op for unconstrained forms. */
export async function commitFired(actor, weapon, runtime, rollOptions = {}, paid = []) {
  const shape = resolveAttackShapeFor(runtime, rollOptions);
  if (shape.source !== 'canonical' || !shape.temporal.length) return null;
  const next = stateAfterFire(shape.temporal, readFireState(weapon), currentClock(actor), context(actor, rollOptions), paid);
  await writeState(actor, weapon, next);
  // keep the in-memory Item consistent for callers that keep using the same object within this tick
  try { weapon.flags = { ...(weapon.flags ?? {}), swse: { ...(weapon.flags?.swse ?? {}), fireState: next } }; } catch { /* frozen document: world copy updates on the next render */ }
  return next;
}

/** A reload action restored the weapon (called by AmmoSystem.reloadWeapon). */
export async function clearReload(actor, weapon) {
  const state = readFireState(weapon);
  if (!state?.needsReload) return null;
  const next = stateAfterReload(state);
  await writeState(actor, weapon, next);
  try { weapon.flags = { ...(weapon.flags ?? {}), swse: { ...(weapon.flags?.swse ?? {}), fireState: next } }; } catch { /* see commitFired */ }
  return next;
}

export const FireStateStore = Object.freeze({ currentClock, readFireState, previewReadiness, spendRequiredActions, commitFired, clearReload });
export default FireStateStore;
