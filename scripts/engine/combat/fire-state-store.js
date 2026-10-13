// Phase 5D-G -- owned fire state + combat clock for canonical weapons.
// Pure rules live in items/weapon-runtime/fire-state.js; this module is the boundary to the live world:
//   clock  : the active Foundry combat (round) -- nothing is invented when there is none
//   state  : flags.swse.fireState on the OWNED weapon Item, written through ActorEngine (never in the registry, never cached here)
//   spend  : preparation/reset actions go through the existing ActionEconomyConsumption (with rollback)
// Legacy/custom weapons and canonical forms with no temporal constraint pass straight through: nothing is read or written.
import { evaluateReadiness, stateAfterFire, stateAfterReload, evaluatePrime, statePrimed, evaluateBrace } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/fire-state.js";
import { resolveAttackShapeFor, resolveAttackWeaponRuntime, resolveCanonicalAttackProficiency, shapeOfWeapon } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-consumer.js";
import { hostEligibility } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/host-mount.js";
import { resolveEffectiveWieldingSize, resolveHeldGroup, sizeStateOf, sizeIndexOf } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/wielding-size.js";
import { powerSourceStatus, powerSourceLabel, POWER_SOURCE_STATES } from "/systems/foundryvtt-swse/scripts/items/weapon-runtime/power-source.js";
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
    // Phase 5D-I-D-B2: two or more identical weapons the player established as held together in one hand use the record's grouped damage profile -- only for a
    // proficient wielder and only when the default melee form is the one selected (an explicit thrown / other profile is the player's choice and stays)
    else if (shape.heldTogetherProfileId && heldTogetherActive(actor, weapon)) wanted = shape.heldTogetherProfileId;
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

const heldDeps = { shapeOf: (w) => { try { return shapeOfWeapon(w, {}); } catch { return null; } }, proficient: (w, a) => { try { return resolveCanonicalAttackProficiency(resolveAttackWeaponRuntime(w, {}), a).proficient === true; } catch { return false; } } };
/** The held-together group of an owned weapon as it stands NOW (proficiency, ownership, equipped, off-hand designation, other groups all re-checked). */
export function heldGroupOf(actor, weapon, idsOverride = null) { return resolveHeldGroup(actor, weapon, heldDeps, idsOverride); }
const heldTogetherActive = (actor, weapon) => heldGroupOf(actor, weapon).count >= 2;

/**
 * Phase 5D-I-D-F: the weapon's power-source requirement. Always a note (the player sees what the weapon needs); a BLOCKER only when the
 * player has explicitly confirmed the source is missing -- an unconfirmed (unknown) source never blocks and nothing is consumed.
 */
function powerSourceReadiness(shape, state, rollOptions) {
  const req = shape?.powerSource ?? null;
  if (!req) return { blockers: [], notes: [], status: null };
  const status = powerSourceStatus(state, rollOptions);
  const label = powerSourceLabel(req);
  const note = status.state === 'installed' ? `requires ${label} (confirmed installed)` : status.state === 'missing' ? `requires ${label} (confirmed missing)` : `requires ${label} (not confirmed installed)`;
  const blockers = status.state === 'missing' ? [{ family: 'power-source', reason: 'power-source-missing', requirement: req }] : [];
  return { blockers, notes: [{ family: 'power-source', note }], status: { ...status, requirement: req, label } };
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
  const power = powerSourceReadiness(shape, state, rollOptions);
  // Phase 5D-I-D-B1: mounted-form legality is enforced HERE, in the attack path, not only in setConfiguration. Selecting the mount configuration (by an
  // explicit attack option or the owned state) requires a recorded, still-owned, still-eligible host; a recorded host that no longer exists blocks too.
  power.blockers.push(...mountBlockers(actor, weapon, shape, state));
  // Ammunition fired only from a grenade launcher (Electronet) is never attacked with directly: it is loaded into a launcher (delegated attack)
  if (shape.requiresHostLauncher) power.blockers.push({ family: 'launcher', reason: 'requires-grenade-launcher' });
  power.notes.push(...wieldingNotes(actor, weapon, shape, state, rollOptions));
  const prepActions = [...rangePreparationActions(shape, rollOptions), ...stunSwitchActions(shape, state), ...owned.actions];
  if (!shape.temporal.length) {
    const blockers = [...owned.blockers, ...power.blockers];
    return { applies: prepActions.length > 0 || blockers.length > 0, ready: blockers.length === 0, blockers, requiredActions: prepActions, notes: power.notes, powerSource: power.status, clock: null };
  }
  const r = evaluateReadiness(shape.temporal, state, clock, context(actor, rollOptions));
  const blockers = [...(r.blockers ?? []), ...owned.blockers, ...power.blockers];
  return { applies: true, ...r, ready: blockers.length === 0, blockers, requiredActions: [...(r.requiredActions ?? []), ...prepActions], notes: [...(r.notes ?? []), ...power.notes], powerSource: power.status, clock };
}

async function writeState(actor, weapon, state, { strict = false } = {}) {
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
    // combat-state writes are best-effort (the attack still resolved); mount / unmount are strict and report the failure
    if (strict) throw err;
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
  // committed: every spend was really recorded by the action economy (false for the established out-of-combat no-op)
  return { ok: true, paid, committed: spends.length > 0 && spends.every((s) => s?.committed === true), rollback: async () => { for (const s of [...spends].reverse()) await s.rollback?.(); } };
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

async function persistOwned(actor, weapon, patch, { strict = false } = {}) {
  const next = patchOwnedState(readFireState(weapon), patch);
  await writeState(actor, weapon, next, { strict });
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

/**
 * Player-confirmed power-source state ('installed' | 'missing' | null = unconfirmed). Owned state; the source states no action for it.
 * Only 'missing' ever blocks an attack, and only because the player said so (unknown is not false).
 */
export async function setPowerSourceState(actor, weapon, powerSource) {
  if (powerSource !== null && !POWER_SOURCE_STATES.includes(powerSource)) return { ok: false, reason: 'invalid-power-source-state' };
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return { ok: false, reason: 'not-canonical' }; }
  if (shape.source !== 'canonical' || !shape.powerSource) return { ok: false, reason: 'no-power-source-requirement' };
  return { ok: true, state: await persistOwned(actor, weapon, { powerSource }) };
}

/**
 * Phase 5D-I-D-F: a weapon whose published reload is performed by a SECOND CREW MEMBER (operation.secondCrewReloadAction, E-Web missile
 * launcher: "a Move action by a second crew member") is reloaded by that crew member: the action is charged to THEM, not the gunner, and
 * the reload itself is the existing ammunition authority (AmmoSystem.reloadWeapon, which clears the awaiting-reload state).
 * The crew member is only ever SUPPLIED (an Actor other than the gunner); none is inferred. Nothing is spent when the weapon is already
 * loaded, when no distinct crew member is supplied, or when their action cannot be paid; a reload that then fails gives the action back.
 */
export async function reloadBySecondCrew(gunner, weapon, crewActor, { source = 'second-crew-reload' } = {}) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return { ok: false, reason: 'not-canonical' }; }
  const action = shape.source === 'canonical' ? String(shape.operation?.secondCrewReloadAction ?? '').toLowerCase() : '';
  if (!action) return { ok: false, reason: 'no-second-crew-reload' };
  const owner = weapon?.actor ?? gunner;
  if (!crewActor?.id || crewActor.id === owner?.id || crewActor.id === gunner?.id) return { ok: false, reason: 'second-crew-required' };
  // The action economy treats an actor outside the active combat as an out-of-combat no-op, so a gunner in combat could otherwise pick an
  // unrelated actor and reload for free. While the gunner is in an active combat the crew member must be a combatant of the SAME combat and
  // their Move must really be recorded; with no combat for the gunner the established out-of-combat policy (no action economy) applies.
  const combat = globalThis.game?.combat ?? null;
  const inCombat = (a) => !!combat && Array.from(combat.combatants ?? []).some((c) => c?.actor?.id === a?.id || c?.actorId === a?.id);
  const combatApplies = inCombat(owner) || inCombat(gunner);
  if (combatApplies && !inCombat(crewActor)) return { ok: false, reason: 'crew-not-in-combat' };
  const { AmmoSystem } = await import("/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js");
  // numerical ammunition is only touched when the optional tracking rule is on AND the weapon has a pool; otherwise the reload only clears the awaiting-reload state
  const tracked = AmmoSystem.isTrackingEnabled() && AmmoSystem.weaponUsesAmmunition(weapon);
  const pool = weapon?.system?.ammunition ?? {};
  const awaiting = readFireState(weapon)?.needsReload === true;
  if (!awaiting && !(tracked && Number(pool.current) < Number(pool.max))) return { ok: false, reason: 'already-loaded' };
  const spend = await spendRequiredActions(crewActor, [{ action, count: 1, family: 'second-crew-reload', reason: 'reload by second crew member' }], { weaponName: weapon?.name, source });
  if (!spend.ok) return { ok: false, reason: 'crew-action-unavailable' };
  if (combatApplies && spend.committed !== true) { await spend.rollback(); return { ok: false, reason: 'crew-action-not-committed' }; }
  let reload;
  try {
    if (tracked) reload = await AmmoSystem.reloadWeapon(owner, weapon);
    else { await clearReload(owner, weapon); reload = { success: true, reloadAmount: 0, message: `${weapon?.name ?? 'Weapon'} reloaded` }; }
  } catch (err) { reload = { success: false, message: String(err?.message ?? err) }; }
  if (reload?.success === false) { await spend.rollback(); return { ok: false, reason: 'reload-failed', message: reload.message }; }
  return { ok: true, reload, action, chargedTo: { id: crewActor.id, name: crewActor.name ?? null }, gunnerId: owner?.id ?? null };
}

/** The weapon's power-source requirement and the player-confirmed state, for presentation (null when the weapon has no requirement). Read-only. */
export function powerSourceOf(weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return null; }
  if (shape.source !== 'canonical' || !shape.powerSource) return null;
  const status = powerSourceStatus(readFireState(weapon), {});
  return { requirement: shape.powerSource, label: powerSourceLabel(shape.powerSource), state: status.state };
}

/** The published reload alternative of a canonical weapon (the second crew member's action). Read-only; legacy weapons declare none. */
export function reloadOptions(weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return { secondCrewAction: null }; }
  const op = shape.source === 'canonical' ? (shape.operation ?? {}) : {};
  return { secondCrewAction: typeof op.secondCrewReloadAction === 'string' && op.secondCrewReloadAction ? op.secondCrewReloadAction.toLowerCase() : null };
}

/** Mounted on a tripod / mount / rifle host (owned state; the source states no action). */
export async function setMounted(actor, weapon, mounted) {
  // Phase 5D-I-D-B2: the tripod / mount state drives the effective wielding size, so only the owning actor can record it
  if (!weapon?.id || ownedItemById(actor, weapon.id) !== weapon) return { ok: false, reason: 'weapon-not-owned' };
  return { ok: true, state: await persistOwned(actor, weapon, { mounted: mounted === true }) };
}

/** The held-together choice a weapon offers (identical weapons held in one hand), or null. candidates = other owned, equipped, non-off-hand sticks of that identity. */
export function heldTogetherOptions(actor, weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return null; }
  if (shape.source !== 'canonical' || !shape.heldTogether) return null;
  const sameWeapon = (i) => { const sh = heldDeps.shapeOf(i); return !!sh && sh.source === 'canonical' && sh.identityKey === shape.identityKey; };
  const free = (i) => i?.type === 'weapon' && i.id !== weapon.id && i.system?.equipped !== false && i.system?.isOffhand !== true && i.system?.slot !== 'offhand';
  const candidates = Array.from(actor?.items ?? []).filter((i) => free(i) && sameWeapon(i)).map((i) => ({ id: i.id, label: i.name }));
  const group = heldGroupOf(actor, weapon);
  return { candidates, max: 1 + candidates.length, current: group.count, memberIds: group.memberIds };
}

/**
 * Establish WHICH identical weapons are held together in one hand with `weapon` (Darkstick): the owned choice names the participating Item ids, and the group
 * is validated against what the actor owns (same identity, equipped, not an off-hand weapon, not in another group) and the wielder's proficiency. An empty
 * list clears it. Owned state; nothing is inferred from the inventory; a rejected write is reported.
 */
export async function setHeldTogether(actor, weapon, memberIds) {
  if (!weapon?.id || ownedItemById(actor, weapon.id) !== weapon) return { ok: false, reason: 'weapon-not-owned' };
  const opt = heldTogetherOptions(actor, weapon);
  if (!opt) return { ok: false, reason: 'not-holdable-together' };
  const ids = Array.from(new Set((Array.isArray(memberIds) ? memberIds : []).map(String)));
  if (ids.length) {
    const g = heldGroupOf(actor, weapon, ids);
    if (!g.ok) return { ok: false, reason: g.reason ?? 'group-invalid' };
  }
  try { return { ok: true, state: await persistOwned(actor, weapon, { heldTogetherIds: ids.length ? ids : null }, { strict: true }) }; }
  catch (err) { console.warn('[SWSE] Could not persist the held-together group.', err); return { ok: false, reason: 'persist-failed' }; }
}

/** The size treatment a weapon offers (a size its record lets the WIELDER choose), or null. `current` = the owned choice. */
export function sizeTreatmentOptions(weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return null; }
  if (shape.source !== 'canonical' || !shape.sizeRules?.beneficial) return null;
  const cur = readFireState(weapon)?.sizeTreatment ?? null;
  return { size: shape.sizeRules.beneficial.size, current: cur && sizeIndexOf(cur) === sizeIndexOf(shape.sizeRules.beneficial.size) ? shape.sizeRules.beneficial.size : null };
}

/**
 * The wielder's choice to treat the weapon as a smaller size "whenever beneficial" (Lightfoil: Small). Owned state; `null` clears it. Only the size the
 * record declares is accepted, only on a weapon the actor owns, and a rejected write is reported (nothing is falsely confirmed).
 */
export async function setSizeTreatment(actor, weapon, size) {
  if (!weapon?.id || ownedItemById(actor, weapon.id) !== weapon) return { ok: false, reason: 'weapon-not-owned' };
  const opt = sizeTreatmentOptions(weapon);
  if (!opt) return { ok: false, reason: 'no-size-treatment' };
  if (size !== null && sizeIndexOf(size) !== sizeIndexOf(opt.size)) return { ok: false, reason: 'size-not-allowed' };
  try { return { ok: true, state: await persistOwned(actor, weapon, { sizeTreatment: size === null ? null : opt.size }, { strict: true }) }; }
  catch (err) { console.warn('[SWSE] Could not persist the size treatment.', err); return { ok: false, reason: 'persist-failed' }; }
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
  // Phase 5D-I-D-B1: the configuration that IS "mounted on a host" is entered only through mountOnHost (host validation + the Mechanics check);
  // leaving it (back to standalone) also detaches the weapon from its host.
  if (shape.mountRule?.configurationId && shape.mountRule.configurationId === configurationId) return { ok: false, reason: 'mount-requires-host' };
  if (state?.mountedHostId) return unmountFromHost(actor, weapon);
  if (shape.configuration.transitionAction) {
    const spend = await spendRequiredActions(actor, [{ action: shape.configuration.transitionAction, count: 1, family: 'configuration-switch', reason: `configuration:${configurationId}` }], { weaponName: weapon?.name });
    if (!spend.ok) return { ok: false, reason: 'action-unavailable' };
  }
  return { ok: true, state: await persistOwned(actor, weapon, { configurationId }) };
}

/**
 * Phase 5D-I-D-B2: what the weapon's record says about its size treatment, worn placement and two-handed design -- shown, never decided for the
 * player. The effective size is computed from the CURRENT state (tripod mounted, size treatment chosen); an unchosen "whenever beneficial" is offered, not applied.
 */
function wieldingNotes(actor, weapon, shape, state, rollOptions) {
  const notes = [];
  const personal = actor?.type !== 'vehicle' && rollOptions?.vehicleWeapon !== true;
  if (personal && shape.size) {
    const wielder = actor?.system?.size ?? actor?.system?.details?.size ?? null;
    const sizeState = sizeStateOf(state, rollOptions);
    const sizing = resolveEffectiveWieldingSize(shape, wielder, { tripodMounted: typeof rollOptions?.mounted === 'boolean' ? rollOptions.mounted : (typeof state?.mounted === 'boolean' ? state.mounted : undefined), beneficialSizeChoice: sizeState.treatAs ?? undefined });
    const label = { light: 'a light weapon', 'one-handed': 'one-handed', 'two-handed': 'two-handed (needs both hands)', 'too-large': 'too large to wield' }[sizing.classification];
    if (label) notes.push({ family: 'size', note: `${sizing.effectiveSize} weapon for a ${sizing.actorSize} wielder: ${label}${sizing.source !== 'base' ? ` (${sizing.source === 'tripod' ? 'tripod mounted' : sizing.source === 'below-wearer' ? 'worn' : 'by choice'}; base ${sizing.baseSize ?? 'none'})` : ''}`, effectiveSize: sizing.effectiveSize, classification: sizing.classification, via: sizing.source });
    else if (sizing.pending === 'tripod') notes.push({ family: 'size', note: 'size for wielding depends on whether it is tripod mounted (not established)' });
    if (shape.sizeRules?.beneficial && sizing.source !== 'beneficial-choice') notes.push({ family: 'size', note: `may be treated as ${shape.sizeRules.beneficial.size} whenever beneficial (not chosen)` });
    if (shape.sizeRules?.prepared) notes.push({ family: 'size', note: `treated as ${shape.sizeRules.prepared.size} while ${shape.sizeRules.prepared.id}d (the preparation; wielder ${shape.sizeRules.prepared.minimumWielderSize ?? 'any size'} or larger)` });
    else if (sizing.legal === false) notes.push({ family: 'size', note: 'cannot be wielded by this wielder at this size', blocker: true });
  }
  if (shape.worn?.wearLocation) notes.push({ family: 'worn', note: `worn on the ${shape.worn.wearLocation}`, kind: shape.worn.wearLocation });
  if (shape.designedTwoHanded) notes.push({ family: 'wielding', note: 'designed for two-handed use' });
  if (shape.heldTogether && weapon) {
    const g = heldGroupOf(actor, weapon);
    if (g.count >= 2) notes.push({ family: 'wielding', note: `${g.count} held together in one hand (counts as one weapon)` });
    else if (g.reason) notes.push({ family: 'wielding', note: `the held-together group is not valid (${g.reason}); held singly` });
  }
  return notes;
}

/** Blockers for the mount state of the SELECTED form: the mount configuration needs a valid recorded host; any recorded host must still exist. */
function mountBlockers(actor, weapon, shape, state) {
  const out = [];
  const rule = shape?.mountRule;
  const hostId = state?.mountedHostId ?? null;
  const needsHost = !!(rule?.configurationId && shape.configuration?.id === rule.configurationId);
  // a stale host record only matters while the MOUNTED form is the one being used; standalone use is never blocked by it
  if (!needsHost) return out;
  if (!hostId) { out.push({ family: 'mount', reason: 'mount-host-required' }); return out; }
  const host = ownedItemById(actor, hostId);
  if (!host) { out.push({ family: 'mount', reason: 'mount-host-missing', hostId }); return out; }
  {
    let hs = null;
    try { hs = shapeOfWeapon(host, {}); } catch { /* legacy host */ }
    const elig = hostEligibility(rule, { source: hs?.source ?? null, groupKey: hs?.groupKey ?? null, size: hs?.size ?? null, mountedHostId: readFireState(host)?.mountedHostId ?? null }, { sameItem: host.id === weapon?.id });
    if (!elig.ok) out.push({ family: 'mount', reason: 'mount-host-ineligible', detail: elig.reason, hostId });
  }
  return out;
}

const ownedItemById = (actor, id) => (id ? (actor?.items?.get?.(id) ?? Array.from(actor?.items ?? []).find((i) => i?.id === id) ?? null) : null);

/**
 * Phase 5D-I-D-B1 -- mount `weapon` on `host` (Micro Grenade Launcher / Grenade Launcher on a rifle, Targeting Laser on a Medium or larger weapon).
 *   - the weapon's canonical mount rule says WHAT it mounts on; the host must be an owned CANONICAL weapon of that group / size (identity, never a name)
 *   - the Mechanics check (DC from the record) is rolled through the existing skill-roll authority; a cancelled roll or a failure writes NOTHING
 *   - the minutes the record states are the GM's circumstance: reported as `timeMinutes`, never simulated; no action is stated, none is spent
 *   - already mounted on this same host -> idempotent (no second check)
 * `skillRoller(actor, skill, options)` may be injected; the default is SWSERoll.rollSkill.
 * @returns {{ok:boolean, reason?:string, check?:object, timeMinutes?:number|null, state?:object}}
 */
export async function mountOnHost(actor, weapon, host, { skillRoller = null, showDialog = true } = {}) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return { ok: false, reason: 'not-canonical' }; }
  if (shape.source !== 'canonical' || !shape.mountRule) return { ok: false, reason: 'not-mountable' };
  const rule = shape.mountRule;
  // both participants must belong to the supplied actor (checked before any roll or write)
  if (!weapon?.id || ownedItemById(actor, weapon.id) !== weapon) return { ok: false, reason: 'weapon-not-owned' };
  const owned = ownedItemById(actor, host?.id);
  if (!owned) return { ok: false, reason: 'host-not-owned' };
  let hostShape = null;
  try { hostShape = shapeOfWeapon(owned, {}); } catch { /* a legacy / custom host is refused below */ }
  const elig = hostEligibility(rule, { source: hostShape?.source ?? null, groupKey: hostShape?.groupKey ?? null, size: hostShape?.size ?? null, mountedHostId: readFireState(owned)?.mountedHostId ?? null }, { sameItem: owned.id === weapon?.id });
  if (!elig.ok) return elig;
  const state = readFireState(weapon);
  if (state?.mountedHostId === owned.id) return { ok: true, alreadyMounted: true, state, timeMinutes: rule.check?.timeMinutes ?? null };
  let check = null;
  if (rule.check) {
    let result = null;
    try {
      const roll = skillRoller ?? (async (a, skill, opts) => (await import("/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js")).SWSERoll.rollSkill(a, skill, opts));
      result = await roll(actor, rule.check.skill, { showDialog, sourceType: 'combat.weapon.mount', sourceLabel: `Mount ${weapon?.name ?? 'weapon'} on ${owned.name ?? 'host'}`, skillUse: { key: 'mount-weapon', label: 'Mount weapon' }, useKey: 'mount-weapon' });
    } catch (err) { console.warn('[SWSE] Mount check could not be rolled.', err); }
    if (!result) return { ok: false, reason: 'check-cancelled', dc: rule.check.dc };
    const total = Number(result.total ?? result.roll?.total);
    if (!Number.isFinite(total)) return { ok: false, reason: 'check-cancelled', dc: rule.check.dc };
    check = { skill: rule.check.skill, dc: rule.check.dc, total, success: total >= rule.check.dc };
    if (!check.success) return { ok: false, reason: 'check-failed', check, timeMinutes: rule.check.timeMinutes };
  }
  const patch = { mountedHostId: owned.id, ...(rule.configurationId ? { configurationId: rule.configurationId } : {}) };
  try { return { ok: true, check, timeMinutes: rule.check?.timeMinutes ?? null, state: await persistOwned(actor, weapon, patch, { strict: true }) }; }
  catch (err) { console.warn('[SWSE] Could not persist the mount.', err); return { ok: false, reason: 'persist-failed', check }; }
}

/** Does this weapon declare a mount rule (it can be mounted on a host)? */
export function hasMountRule(weapon) {
  try { const sh = shapeOfWeapon(weapon, {}); return sh.source === 'canonical' && !!sh.mountRule; } catch { return false; }
}

/** The actor's other weapons as candidate hosts for `weapon`, each with its eligibility (for the host picker); [] when the weapon is not mountable. */
export function mountHostOptions(actor, weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return []; }
  if (shape.source !== 'canonical' || !shape.mountRule) return [];
  const mountedOn = readFireState(weapon)?.mountedHostId ?? null;
  return Array.from(actor?.items ?? []).filter((i) => i?.type === 'weapon' && i.id !== weapon.id).map((host) => {
    let hs = null;
    try { hs = shapeOfWeapon(host, {}); } catch { /* legacy host */ }
    const elig = hostEligibility(shape.mountRule, { source: hs?.source ?? null, groupKey: hs?.groupKey ?? null, size: hs?.size ?? null, mountedHostId: readFireState(host)?.mountedHostId ?? null });
    return { id: host.id, name: host.name, eligible: elig.ok, reason: elig.reason ?? null, current: host.id === mountedOn };
  }).filter((o) => o.eligible || o.current);
}

/** Detach a mounted weapon from its host (no check / action is stated); it returns to its default configuration. */
export async function unmountFromHost(actor, weapon) {
  let shape;
  try { shape = shapeOfWeapon(weapon, {}); } catch { return { ok: false, reason: 'not-canonical' }; }
  if (shape.source !== 'canonical' || !shape.mountRule) return { ok: false, reason: 'not-mountable' };
  if (!weapon?.id || ownedItemById(actor, weapon.id) !== weapon) return { ok: false, reason: 'weapon-not-owned' };
  const state = readFireState(weapon);
  if (!state?.mountedHostId) return { ok: true, state };
  try { return { ok: true, state: await persistOwned(actor, weapon, { mountedHostId: null, configurationId: shape.configuration.defaultId ?? null }, { strict: true }) }; }
  catch (err) { console.warn('[SWSE] Could not persist the unmount.', err); return { ok: false, reason: 'persist-failed' }; }
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

export const FireStateStore = Object.freeze({ powerSourceOf, reloadOptions, setPowerSourceState, reloadBySecondCrew, configurationOptions, currentClock, readFireState, previewReadiness, applyOwnedSelection, spendRequiredActions, commitFired, clearReload, primePreparedAttack, setStockState, setWielding, setMounted, sizeTreatmentOptions, setSizeTreatment, heldTogetherOptions, setHeldTogether, heldGroupOf, mountOnHost, unmountFromHost, mountHostOptions, hasMountRule, setConfiguration, setLoadedPayload, recordCrewRegulation, storedCrewRegulation, resetUsage, previewBrace });
export default FireStateStore;
