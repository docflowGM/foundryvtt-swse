// Phase 5D-G -- owned fire state + combat clock for canonical weapons.
// Pure rules live in items/weapon-runtime/fire-state.js; this module is the boundary to the live world:
//   clock  : the active Foundry combat (round) -- nothing is invented when there is none
//   state  : flags.swse.fireState on the OWNED weapon Item, written through ActorEngine (never in the registry, never cached here)
//   spend  : preparation/reset actions go through the existing ActionEconomyConsumption (with rollback)
// Legacy/custom weapons and canonical forms with no temporal constraint pass straight through: nothing is read or written.
import { evaluateReadiness, stateAfterFire, stateAfterReload, evaluatePrime, statePrimed, evaluateBrace } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/fire-state.js";
import { resolveAttackShapeFor, resolveAttackWeaponRuntime, shapeOfWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";
import { currentMachineState, machineTransitionAllowed, machineAfterTransition, evaluateUsage, recordUsage, usageKey, crewRegulationFor, crewRegulationRecord, patchOwnedState } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/owned-state.js";
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
 * Phase 5D-I-A: switching a persistent stun setting costs its published action (Shockboxing Gloves: swift) -- once. While the setting is
 * already in effect (the last attack with this weapon used this form) the next stun attack is free. Only the switch TO the costly form is
 * priced; the source states no cost for switching back, so none is invented.
 */
function stunSwitchActions(shape, state) {
  const ss = shape?.stunSetting;
  if (!ss?.persistent || (state?.settingProfile ?? ss.baselineProfileId) === shape.profileId) return [];
  return [{ action: ss.action, count: 1, family: 'stun-switch', reason: 'stun-setting-switch' }];
}

/**
 * Phase 5D-I-A: the structured actions of an ASSERTED range preparation (operation.rangeStepReductionPreparation, E-Web missile launcher):
 * the player toggled the `preparedRangeReduction` option for this attack, so its published actions are paid before the shot.
 */
function rangePreparationActions(shape, rollOptions = {}) {
  const rp = shape?.rangePreparation;
  const on = rollOptions?.combatOptions?.preparedRangeReduction ?? rollOptions?.attackOptions?.preparedRangeReduction;
  if (!rp?.complete || !on || on === '0') return [];
  return rp.requiredActions.flatMap((a) => Array.from({ length: a.count }, () => ({ action: a.action, count: 1, family: 'range-preparation', reason: 'range-preparation' })));
}

const worldTimeNow = () => { const t = Number(globalThis.game?.time?.worldTime); return Number.isFinite(t) ? t : null; };

/**
 * Phase 5D-I-B: owned-state transitions the selected form implies, as ACTIONS to pay before the attack plus the BLOCKERS that make it illegal.
 *   configuration  the attack names a configuration other than the owned one (Amphistaff quarterstaff -> whip): its published transitionAction
 *   state machine  the selected profile is a state of the weapon's certified machine (Retrosaber overcharge): legal only along a declared,
 *                  unlocked transition; the action is the profile's own activation action
 *   usage limit    a profile limited per period (Venom Spit once per 24 standard hours) is refused while the ledger says it is used
 * Pure reads of the owned record + the combat clock; nothing is written here.
 */
function ownedStateStep(shape, state, clock) {
  const actions = [], blockers = [];
  const cfg = shape.configuration;
  if (cfg?.id && cfg.usable === false) blockers.push({ reason: 'configuration-not-usable', configurationId: cfg.id });
  if (cfg?.id && cfg.transitionAction && (state?.configurationId ?? cfg.defaultId) !== cfg.id) {
    actions.push({ action: cfg.transitionAction, count: 1, family: 'configuration-switch', reason: `configuration:${cfg.id}` });
  }
  const sm = shape.machine;
  if (sm && asArrayOf(sm.states).includes(shape.profileId)) {
    const cur = currentMachineState(sm, state?.machine, clock).state;
    if (cur !== shape.profileId) {
      const t = machineTransitionAllowed(sm, cur, shape.profileId);
      if (!t.allowed) blockers.push({ reason: 'state-machine', from: cur, to: shape.profileId, detail: t.reason });
      else {
        const act = asArrayOf(shape.requirements).find((r) => r?.type === 'action');
        if (act) actions.push({ action: act.action, count: 1, family: 'state-transition', reason: `state:${shape.profileId}` });
      }
    }
  }
  for (const req of asArrayOf(shape.requirements).filter((r) => r?.type === 'usage-limit')) {
    const u = evaluateUsage(req, state?.usage?.[usageKey(shape.profileId, req)], { worldTime: worldTimeNow() });
    if (!u.available) blockers.push({ reason: 'usage-exhausted', detail: u.reason, usedAt: u.usedAt ?? null, resetsAt: u.resetsAt ?? null, per: req.per });
  }
  return { actions, blockers };
}
const asArrayOf = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/**
 * Phase 5D-I-B: the selection the OWNED weapon is currently in, for an attack that did not name one (the weapon remembers its state):
 *   configuration -> owned configurationId (when it is still a configuration of the weapon)
 *   profile       -> the machine state now in effect (Retrosaber), else the persistent setting in effect (Dual-Phase extended blade, stun setting)
 * Anything the caller specified wins; a stale or impossible owned value is ignored, never an error.
 */
export function applyOwnedSelection(actor, weapon, rollOptions = {}) {
  const state = readFireState(weapon);
  if (!state || !weapon) return rollOptions;
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return rollOptions; }
  if (shape.source !== 'canonical') return rollOptions;
  const patch = {};
  if (rollOptions.configurationId === undefined && rollOptions.weaponForm?.configurationId === undefined && typeof state.configurationId === 'string' && shape.configuration.ids.includes(state.configurationId)) patch.configurationId = state.configurationId;
  const named = rollOptions.profileId !== undefined || rollOptions.weaponForm?.profileId !== undefined;
  if (!named) {
    let wanted = null;
    if (shape.machine) wanted = currentMachineState(shape.machine, state.machine, currentClock(actor)).state;
    else if (typeof state.settingProfile === 'string') wanted = state.settingProfile;
    if (wanted) patch.profileId = wanted;
  }
  if (!Object.keys(patch).length) return rollOptions;
  // only a combination that actually resolves is applied
  for (const attempt of [patch, { ...patch, profileId: undefined }, { ...patch, configurationId: undefined }]) {
    const clean = Object.fromEntries(Object.entries(attempt).filter(([, v]) => v !== undefined));
    if (!Object.keys(clean).length) continue;
    try { if (resolveAttackWeaponRuntime(weapon, { ...rollOptions, ...clean }).source === 'canonical') return { ...rollOptions, ...clean }; } catch { /* try the smaller patch */ }
  }
  return rollOptions;
}

/**
 * Non-mutating readiness of the selected canonical form. Safe for previews. Legacy weapons / unconstrained forms -> always ready.
 * @returns {{applies:boolean, ready:boolean, blockers:Array, requiredActions:Array, notes:Array, clock:object|null}}
 */
export function previewReadiness(actor, weapon, runtime, rollOptions = {}) {
  const shape = resolveAttackShapeFor(runtime, rollOptions);
  if (shape.source !== 'canonical') return { applies: false, ready: true, blockers: [], requiredActions: [], notes: [], clock: null };
  const state = readFireState(weapon);
  const clock = currentClock(actor);
  const owned = ownedStateStep(shape, state, clock);
  const prepActions = [...rangePreparationActions(shape, rollOptions), ...stunSwitchActions(shape, state), ...owned.actions];
  if (!shape.temporal.length) return { applies: prepActions.length > 0 || owned.blockers.length > 0, ready: owned.blockers.length === 0, blockers: owned.blockers, requiredActions: prepActions, notes: [], clock: null };
  const r = evaluateReadiness(shape.temporal, state, clock, context(actor, rollOptions));
  const blockers = [...(r.blockers ?? []), ...owned.blockers];
  return { applies: true, ...r, ready: blockers.length === 0, blockers, requiredActions: [...(r.requiredActions ?? []), ...prepActions], clock };
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
  if (shape.source !== 'canonical') return null;
  const state = readFireState(weapon);
  const clock = currentClock(actor);
  // Phase 5D-I-B: owned-state changes this attack made true (the weapon remembers them): the persistent setting in effect, the configuration it
  // is in, the machine position, the hands the player chose, and a recorded use of a usage-limited profile
  const owned = {};
  if (shape.stunSetting?.weaponHasSwitch === true && (state?.settingProfile ?? shape.stunSetting.baselineProfileId) !== shape.profileId) owned.settingProfile = shape.profileId;
  if (shape.configuration?.ids?.length && shape.configuration.id && (state?.configurationId ?? shape.configuration.defaultId) !== shape.configuration.id) owned.configurationId = shape.configuration.id;
  if (shape.machine && clock && asArrayOf(shape.machine.states).includes(shape.profileId) && currentMachineState(shape.machine, state?.machine, clock).state !== shape.profileId) owned.machine = machineAfterTransition(shape.profileId, clock);
  const hands = rollOptions.wieldedHands === 2 || rollOptions.wieldedHands === 'two-handed' ? 'two-handed' : rollOptions.wieldedHands === 1 || rollOptions.wieldedHands === 'one-handed' ? 'one-handed' : null;
  if (hands && state?.wielded !== hands) owned.wielded = hands;
  for (const req of asArrayOf(shape.requirements).filter((r) => r?.type === 'usage-limit')) {
    const key = usageKey(shape.profileId, req);
    owned.usage = { ...(owned.usage ?? state?.usage ?? {}), [key]: recordUsage(req, state?.usage?.[key], { worldTime: worldTimeNow() }) };
  }
  const changed = Object.keys(owned).length > 0;
  if (!shape.temporal.length && !changed) return null;
  // an optional prepared attack that is not currently primed adds no temporal state: an ordinary shot writes nothing
  if (shape.temporal.length && shape.temporal.every((c) => c.family === 'prepared-attack') && !state?.primed && !changed) return null;
  let next = shape.temporal.length ? stateAfterFire(shape.temporal, state, clock, context(actor, rollOptions), paid) : { ...(state ?? {}) };
  next = patchOwnedState(next, owned);
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

/**
 * Player-chosen priming of an optional prepared attack (e.g. a Bryar built-up shot): pays the structured activation action through the
 * action economy, then records `primed` on the owned Item. Needs an active combat (the shot matures at the start of the wielder's next
 * turn). Nothing is written when the action cannot be paid. Returns {ok, reason?, state?}.
 */
export async function primePreparedAttack(actor, weapon, runtime, rollOptions = {}) {
  const shape = resolveAttackShapeFor(runtime, rollOptions);
  if (shape.source !== 'canonical') return { ok: false, reason: 'not-primable' };
  const clock = currentClock(actor);
  const check = evaluatePrime(shape.temporal, readFireState(weapon), clock);
  if (!check.ok) return { ok: false, reason: check.reason };
  const spend = await spendRequiredActions(actor, check.requiredActions, { weaponName: weapon?.name });
  if (!spend.ok) return { ok: false, reason: 'action-unavailable' };
  const next = statePrimed(readFireState(weapon), check.constraint, clock);
  await writeState(actor, weapon, next);
  try { weapon.flags = { ...(weapon.flags ?? {}), swse: { ...(weapon.flags?.swse ?? {}), fireState: next } }; } catch { /* see commitFired */ }
  return { ok: true, state: next };
}

async function persistOwned(actor, weapon, patch) {
  const next = patchOwnedState(readFireState(weapon), patch);
  await writeState(actor, weapon, next);
  try { weapon.flags = { ...(weapon.flags ?? {}), swse: { ...(weapon.flags?.swse ?? {}), fireState: next } }; } catch { /* see commitFired */ }
  return next;
}

/**
 * Owned stock state of a retractable-stock weapon ('extended' | 'retracted'); a form's braceRule and attack-of-opportunity eligibility read it.
 * Core Rulebook, Retractable Stocks: extending or folding the stock is a MOVE ACTION -- paid through the action economy (nothing is written
 * when it cannot be paid). `{ free: true }` records a state that needs no action (setup / GM correction).
 */
export async function setStockState(actor, weapon, stockState, { free = false } = {}) {
  if (stockState !== 'extended' && stockState !== 'retracted') return { ok: false, reason: 'invalid-stock-state' };
  if (!free && readFireState(weapon)?.stock !== stockState) {
    const spend = await spendRequiredActions(actor, [{ action: 'move', count: 1, family: 'stock', reason: `stock:${stockState}` }], { weaponName: weapon?.name });
    if (!spend.ok) return { ok: false, reason: 'action-unavailable' };
  }
  return { ok: true, state: await persistOwned(actor, weapon, { stock: stockState }) };
}

/** The player's current hands choice ('one-handed' | 'two-handed'); no action is stated for it. Weapon constraints still decide legality at attack time. */
export async function setWielding(actor, weapon, hands) {
  if (hands !== 'one-handed' && hands !== 'two-handed') return { ok: false, reason: 'invalid-wielding' };
  return { ok: true, state: await persistOwned(actor, weapon, { wielded: hands }) };
}

/** Mounted on a tripod / mount / rifle host (owned state; the source states no action). */
export async function setMounted(actor, weapon, mounted) {
  return { ok: true, state: await persistOwned(actor, weapon, { mounted: mounted === true }) };
}

/**
 * Switch the weapon to another of its configurations (Amphistaff quarterstaff / spear / whip): pays the configuration's published
 * transitionAction, then records it on the owned Item. Unknown configuration or an unpayable action writes nothing.
 */
export async function setConfiguration(actor, weapon, configurationId) {
  let shape;
  try { shape = shapeOfWeapon(weapon, { configurationId }); } catch { return { ok: false, reason: 'unknown-configuration' }; }
  if (shape.source !== 'canonical' || !shape.configuration.ids.includes(configurationId)) return { ok: false, reason: 'unknown-configuration' };
  const state = readFireState(weapon);
  if ((state?.configurationId ?? shape.configuration.defaultId) === configurationId) return { ok: true, state };
  if (shape.configuration.transitionAction) {
    const spend = await spendRequiredActions(actor, [{ action: shape.configuration.transitionAction, count: 1, family: 'configuration-switch', reason: `configuration:${configurationId}` }], { weaponName: weapon?.name });
    if (!spend.ok) return { ok: false, reason: 'action-unavailable' };
  }
  return { ok: true, state: await persistOwned(actor, weapon, { configurationId }) };
}

/** Canonical identity of the payload loaded into a payload-delegating launcher (validated against the launcher's accepted family by the attack stage). */
export async function setLoadedPayload(actor, weapon, identityKey) {
  return { ok: true, state: await persistOwned(actor, weapon, { loadedIdentityKey: identityKey ?? null }) };
}

/** Crew adjudication for the current combat round (E-Web generator regulation). With no combat there is no round to key it to: not stored. */
export async function recordCrewRegulation(actor, weapon, value) {
  const rec = crewRegulationRecord(value, currentClock(actor));
  if (!rec) return null;
  return persistOwned(actor, weapon, { crew: { ...(readFireState(weapon)?.crew ?? {}), regulation: rec } });
}
export const storedCrewRegulation = (actor, weapon) => crewRegulationFor(readFireState(weapon), currentClock(actor));

/** GM / manual reset of a usage ledger (and the only reset when the world has no campaign clock). */
export async function resetUsage(actor, weapon, key = null) {
  const usage = { ...(readFireState(weapon)?.usage ?? {}) };
  if (key) delete usage[key]; else for (const k of Object.keys(usage)) delete usage[k];
  return persistOwned(actor, weapon, { usage });
}

/** Non-mutating brace legality + the actions bracing costs for the selected autofire form. */
export function previewBrace(weapon, shape, ctx = {}) {
  if (shape?.source !== 'canonical') return { applies: false, legal: true, requiredActions: [] };
  return evaluateBrace(shape.brace, readFireState(weapon), ctx);
}

/** Canonical configuration choices of an owned weapon for UI (read-only): `{canonical, states, defaultId}`; never throws. */
function configurationOptions(item) {
  try {
    const runtime = resolveAttackWeaponRuntime(item, {});
    const states = Array.from(runtime?.resolved?.canonicalStats?.configurationStates ?? runtime?.resolved?.configurationStates ?? []);
    return { canonical: runtime?.source === 'canonical', states, defaultId: runtime?.resolved?.selection?.configurationId ?? states.find((c) => c?.default === true)?.id ?? states[0]?.id ?? null };
  } catch (_err) { return { canonical: false, states: [], defaultId: null }; }
}

export const FireStateStore = Object.freeze({ configurationOptions, currentClock, readFireState, previewReadiness, applyOwnedSelection, spendRequiredActions, commitFired, clearReload, primePreparedAttack, setStockState, setWielding, setMounted, setConfiguration, setLoadedPayload, recordCrewRegulation, storedCrewRegulation, resetUsage, previewBrace });
export default FireStateStore;
