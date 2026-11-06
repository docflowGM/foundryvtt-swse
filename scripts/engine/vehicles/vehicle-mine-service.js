/**
 * Space mines at runtime (Starships of the Galaxy, Space Mines; the rules and what is NOT automated are in domain/vehicle-space-mine.js).
 *
 *  deploy      GM client (a Scene write): legal placement first (the launcher is the deploying ship's own, the ship has a token ON this scene,
 *              the encounter is not character scale), then the station operator's swift action (ActionEconomyConsumption, paid by the operator exactly as the
 *              autofire switch), ONE unit from the launcher's ledger (VehicleAmmunitionService: atomic, refunded on failure), then the mine is
 *              recorded in the deploying ship's current square on the Scene (vehicle-scene-state.js is the only Scene writer).
 *  detonate    a command mine costs its gunner a standard action (printed), paid first and rolled back if the mine was already claimed; the mine
 *              record is CLAIMED under the scene lock and removed by key (a discrete resource cannot detonate twice, even from two triggers); then each starship in the square takes an area attack
 *              against its Reflex Defense (full on a hit, half on a miss; a natural 1 keeps the engine's no-damage rule) through the shared roll,
 *              damage-packet and ActorEngine.applyDamage pipeline -- no separate damage code.
 *  onTokenMoved a token entering a mine's square sets off a proximity mine unless the ship's actor is IFF-exempt.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { buildDamagePacket, finalizeDamagePacketForTarget, buildDamageApplyOptions } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { CAPITAL_SHIP_TARGETING_PENALTY, sizeRank } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-capital-penalty.js";
import { MINE_FLAG, MINE_TYPES, MINE_REASONS, MINE_STEALTH_BONUS, buildMine, isValidMine, squareOfToken, tokenOccupies, mineDamageFormula, moveEntersSquare } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-space-mine.js";
import { readSceneMap, putSceneRecord, deleteSceneRecord, withSceneLock, tokenOnScene, isResponsibleGM, sceneGridSize } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-scene-state.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { resolveEncounterScale, ENCOUNTER_SCALE } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-encounter-scale.js";
import { resolveVehicleCrewActor } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-actor-authority.js";
import { resolveOperatorPayer } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-fire-mode-service.js";

const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const isGM = user => user?.isGM === true;
export const readMines = scene => readSceneMap(scene, MINE_FLAG, isValidMine);
const reflexOf = a => Number(a?.system?.derived?.defenses?.reflex?.total ?? a?.system?.defenses?.reflex?.total);

export async function deploy({ vehicle, weapon, scene = globalThis.canvas?.scene ?? null, detonation = 'proximity', iffExempt = [], user = globalThis.game?.user ?? null } = {}) {
  const a = resolveVehicleWeaponAuthority(weapon);
  if (!a?.ok || !a.mine || !MINE_TYPES[a.mine]) return refuse(MINE_REASONS.NOT_A_MINE_LAUNCHER);
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  if (!scene?.id) return refuse(MINE_REASONS.NO_SCENE);
  // legal placement: the deploying ship's OWN launcher, the ship's token on THIS scene, a mode the rules print, and not a character-scale encounter
  if (vehicle?.type !== 'vehicle' || !Array.from(vehicle.items ?? []).some(i => i?.id === weapon?.id)) return refuse(MINE_REASONS.NOT_OWN_LAUNCHER);
  if (!['proximity', 'command'].includes(detonation)) return refuse(MINE_REASONS.MODE_INVALID);
  if (resolveEncounterScale({ attacker: vehicle, combat: globalThis.game?.combat ?? null }).scale === ENCOUNTER_SCALE.CHARACTER) return refuse(MINE_REASONS.NOT_STARSHIP_SCALE);
  const square = squareOfToken(tokenOnScene(vehicle, scene), sceneGridSize(scene));
  if (!square) return refuse(MINE_REASONS.NO_POSITION);
  const can = await VehicleAmmunitionService.canLaunch(vehicle, weapon);
  if (!can.ok) return refuse(can.reason);
  const who = await resolveOperatorPayer(vehicle, a);
  if (who.reason) return refuse(who.reason);
  // V-P6C-15: the mine's Stealth check (1d20 + 5), rolled ONCE here and kept with the mine -- never rerolled per observer
  const stealth = await RollEngine.safeRoll(`1d20 + ${MINE_STEALTH_BONUS}`);
  const stealthD20 = stealth?.dice?.[0]?.results?.[0]?.result ?? null;
  if (!Number.isFinite(Number(stealth?.total)) || stealthD20 === null) return refuse(MINE_REASONS.NOTICE_ROLL_FAILED);
  const spend = await ActionEconomyConsumption.spend(who.payer, 'swift', { actionName: 'Deploy space mine', source: weapon.name });
  if (spend?.allowed === false) return refuse(MINE_REASONS.ACTION_UNAVAILABLE);
  const id = globalThis.foundry?.utils?.randomID?.() ?? `mine-${Date.now()}`;
  let ammo = null;
  try {
    ammo = await VehicleAmmunitionService.spendLaunch(vehicle, weapon, { attackId: id });
    if (!ammo.ok) { await spend?.rollback?.(); return refuse(ammo.reason); }
    const mine = buildMine({ id, sceneId: scene.id, vehicleId: vehicle.id, weaponId: weapon.id, type: a.mine, square, detonation, iffExempt, by: user?.id ?? null, detection: { dc: Number(stealth.total), d20: stealthD20 } });
    await withSceneLock(scene, MINE_FLAG, () => putSceneRecord(scene, MINE_FLAG, mine));
    return { ok: true, mine, paidBy: who.payer?.id ?? null };
  } catch (err) {
    if (ammo?.ok) await VehicleAmmunitionService.refundLaunch(ammo);
    await spend?.rollback?.();
    throw err;
  }
}

/** Remove the record under the scene lock and return it, or null when it is already gone (another trigger claimed it first). */
const claimMine = (scene, mineId, { requireCommand = false } = {}) => withSceneLock(scene, MINE_FLAG, async () => {
  const mine = readMines(scene).find(m => m.id === mineId);
  if (!mine || (requireCommand && mine.detonation !== 'command')) return null;
  await deleteSceneRecord(scene, MINE_FLAG, mineId);
  return mine;
});

/** The gunner of a command mine: the deploying launcher's operator-station payer (a named gunner pays from their own economy). */
async function commandGunner(mine, vehicle, weapon) {
  const v = vehicle ?? globalThis.game?.actors?.get?.(mine.vehicleId) ?? null;
  if (v && v.id !== mine.vehicleId) return { reason: MINE_REASONS.COMMAND_GUNNER_UNRESOLVED };
  const w = weapon ?? v?.items?.get?.(mine.weaponId) ?? null;
  const a = w ? resolveVehicleWeaponAuthority(w) : null;
  if (!v || !a?.ok) return { reason: MINE_REASONS.COMMAND_GUNNER_UNRESOLVED };
  return resolveOperatorPayer(v, a);
}

/**
 * Detonate one mine: claim it (once), then resolve its area attack against every starship in its square. A COMMAND detonation is a standard
 * action of the gunner (printed), spent before the claim and rolled back when the mine turns out to be gone already.
 */
export async function detonate({ scene, mineId, user = globalThis.game?.user ?? null, command = false, vehicle = null, weapon = null, alsoTargets = [] } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  const found = readMines(scene).find(m => m.id === mineId);
  if (!found) return refuse(MINE_REASONS.NOT_FOUND);
  if (command && found.detonation !== 'command') return refuse(MINE_REASONS.NOT_COMMAND);
  let spend = null, paidBy = null;
  if (command) {
    const who = await commandGunner(found, vehicle, weapon);
    if (who.reason) return refuse(who.reason);
    spend = await ActionEconomyConsumption.spend(who.payer, 'standard', { actionName: 'Detonate space mine', source: found.type });
    if (spend?.allowed === false) return refuse(MINE_REASONS.COMMAND_ACTION_UNAVAILABLE);
    paidBy = who.payer?.id ?? null;
  }
  let mine = null;
  try { mine = await claimMine(scene, mineId, { requireCommand: command }); } catch (err) { await spend?.rollback?.(); throw err; }
  if (!mine) { await spend?.rollback?.(); return refuse(MINE_REASONS.NOT_FOUND); }
  const spec = MINE_TYPES[mine.type], formula = mineDamageFormula(mine.type), g = sceneGridSize(scene);
  const results = [];
  // every ship in the square -- and a ship that ENTERED it on a move that carried it on (alsoTargets): the area attack is made on entry
  const inSquare = Array.from(scene.tokens ?? []).filter(tok => tok?.actor?.type === 'vehicle' && tokenOccupies(tok, g, mine.square)).map(tok => tok.actor);
  const targets = [...inSquare, ...alsoTargets.filter(a => a?.type === 'vehicle' && !inSquare.some(x => x.id === a.id))];
  for (const target of targets) {
    const penalty = spec.capitalWeapon && (sizeRank(target.system?.size) ?? 99) < sizeRank('colossal') ? CAPITAL_SHIP_TARGETING_PENALTY : 0;
    const atk = await RollEngine.safeRoll(`1d20 + ${spec.attack + penalty}`);
    const d20 = atk?.dice?.[0]?.results?.[0]?.result ?? null;
    const out = AttackOutcomeResolver.resolve({ naturalD20: d20, total: atk.total, targetDefense: reflexOf(target), criticalThreshold: 21, critMultiplier: 2 });
    const dmg = await RollEngine.safeRoll(formula);
    const amount = Math.floor(Number(dmg?.total ?? 0) * spec.multiplier);
    const workflowContext = { damage: { hit: out.hit === true, natural1: d20 === 1 }, ruleData: { areaAttack: true, halfDamageOnMiss: true } };
    const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target, weapon: null, amount, options: { damageType: null, hit: out.hit === true }, workflowContext }), target);
    const options = buildDamageApplyOptions(packet);
    const applied = packet.amount > 0 ? await ActorEngine.applyDamage(target, { amount: packet.amount, type: options.damageType, source: `Space mine (${mine.type})`, sourceActor: null, options }) : null;
    results.push({ targetId: target.id, attackTotal: atk.total, hit: out.hit === true, amount: packet.amount, damageToHP: applied?.resolution?.damageToHP ?? 0 });
  }
  return { ok: true, mine, results, paidBy };
}

/** Add (or refresh) the pending-entry record of a ship that is about to enter a mine's square. Under the scene lock; one record per ship. */
const patchPending = (scene, mineId, fn) => withSceneLock(scene, MINE_FLAG, async () => {
  const mine = readMines(scene).find(m => m.id === mineId);
  if (!mine) return null;
  const next = { ...mine, pending: { ...(mine.pending ?? {}) } };
  const r = fn(next.pending, mine);
  if (r === false) return null;
  await putSceneRecord(scene, MINE_FLAG, next);
  return next;
});

/**
 * A token has moved (the registry's updateToken, active GM only). For every proximity mine whose square the move ENTERED -- the destination
 * footprint, or any square of the move's recorded path when Foundry's movement data establishes it -- an IFF-exempt ship is ignored, a mine with a
 * detection DC OPENS A PENDING ENTRY (the pilot / system operator may react before the ship enters: attemptNotice, then resolveEntry), and a mine
 * with no stored DC (deployed before V-P6C-15) detonates at once. Nothing detonates before the published reaction opportunity.
 * @returns {Promise<{detonated:object[], pending:object[]}>}
 */
export async function onTokenMoved({ scene, tokenDoc, options = {}, user = globalThis.game?.user ?? null } = {}) {
  const out = { detonated: [], pending: [] };
  const actor = tokenDoc?.actor;
  if (!isResponsibleGM(user) || actor?.type !== 'vehicle' || !scene?.id) return out;
  for (const m of readMines(scene)) {
    if (m.detonation !== 'proximity' || m.iffExempt.includes(actor.id)) continue;
    const move = moveEntersSquare(tokenDoc, options, sceneGridSize(scene), m.square);
    if (!move.entered) continue;
    if (!Number.isFinite(m.detectionDc)) { const r = await detonate({ scene, mineId: m.id, user, alsoTargets: [actor] }); if (r.ok) out.detonated.push(r); continue; }
    const updated = await patchPending(scene, m.id, pend => { if (pend[actor.id]) return false; pend[actor.id] = { actorId: actor.id, tokenId: tokenDoc.id ?? null, atDestination: move.atDestination, passedThrough: move.passedThrough, pathTrusted: move.pathTrusted, noticed: false, attempts: {}, at: Date.now() }; });
    if (updated) { out.pending.push({ mineId: m.id, actorId: actor.id, ...move }); globalThis.ui?.notifications?.warn?.(`${actor.name ?? 'A ship'} is about to enter a mined square: resolve the notice reactions, then resolve the entry on the vehicle sheet.`); }
  }
  return out;
}

/** GM adjudication when the move carries no trustworthy path: record that a ship entered (or is entering) the mine's square. */
export async function adjudicateEntry({ scene, mineId, actor, user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  if (actor?.type !== 'vehicle') return refuse(MINE_REASONS.NOT_ABOUT_TO_ENTER);
  const m = readMines(scene).find(x => x.id === mineId);
  if (!m) return refuse(MINE_REASONS.NOT_FOUND);
  if (!Number.isFinite(m.detectionDc)) return refuse(MINE_REASONS.NO_DETECTION_DC);
  const updated = await patchPending(scene, mineId, pend => { if (pend[actor.id]) return false; pend[actor.id] = { actorId: actor.id, tokenId: null, atDestination: false, passedThrough: true, pathTrusted: false, noticed: false, attempts: {}, at: Date.now(), adjudicated: true }; });
  return updated ? { ok: true } : refuse(MINE_REASONS.ALREADY_ATTEMPTED);
}

/**
 * The notice reaction of a ship about to enter: the pilot's Perception, or a system operator's Use Computer (using the ship's sensors, the
 * existing sensor-check authority), against the mine's stored DC. One reaction per kind per entry; each spends a reaction through the action
 * economy authority. A success marks the entry noticed (the pilot may then choose another square); a failure leaves the normal trigger.
 * @param {'pilot'|'operator'} kind  the pilot defaults to the crew assignment; the operator is the crew actor the GM names.
 */
// (loaded on demand: the skill roll authorities need the live game; only a notice reaction uses them)
const rollNoticeCheck = async (kind, who, vehicle, user) => {
  if (kind === 'pilot') {
    const { rollSkill } = await import("/systems/foundryvtt-swse/scripts/rolls/skills.js");
    return Number((await rollSkill(who, 'perception', { vehicleContext: { vehicleId: vehicle.id, vehicleName: vehicle.name, purpose: 'notice-space-mine' } }))?.total);
  }
  const { VehicleOperatingContextService } = await import("/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-operating-context-service.js");
  return Number((await VehicleOperatingContextService.rollSensorCheck(vehicle, { crewActor: who, skill: 'useComputer', user }))?.result?.total);
};

export async function attemptNotice({ scene, mineId, vehicle, kind, crewActor = null, user = globalThis.game?.user ?? null, rollNotice = rollNoticeCheck } = {}) {
  if (!['pilot', 'operator'].includes(kind)) return refuse(MINE_REASONS.CREW_REQUIRED);
  const mine = readMines(scene).find(m => m.id === mineId);
  if (!mine) return refuse(MINE_REASONS.NOT_FOUND);
  if (!Number.isFinite(mine.detectionDc)) return refuse(MINE_REASONS.NO_DETECTION_DC);
  const entry = mine.pending?.[vehicle?.id];
  if (!entry) return refuse(MINE_REASONS.NOT_ABOUT_TO_ENTER);
  if (entry.attempts?.[kind]) return refuse(MINE_REASONS.ALREADY_ATTEMPTED);
  let who = crewActor;
  if (!who && kind === 'pilot') { const c = await resolveVehicleCrewActor(vehicle, 'pilot'); who = c.source === 'actor' ? c.actor : null; }
  if (!who || who.type === 'vehicle') return refuse(MINE_REASONS.CREW_REQUIRED);
  if (!(user?.isGM === true || who.isOwner === true)) return refuse(MINE_REASONS.GM_ONLY);
  const reaction = await ActionEconomyConsumption.spend(who, 'reaction', { actionName: kind === 'pilot' ? 'Notice space mine (Perception)' : 'Notice space mine (Use Computer)', source: mine.type });
  if (reaction?.allowed === false) return refuse(MINE_REASONS.REACTION_UNAVAILABLE);
  let total = null;
  try {
    total = await rollNotice(kind, who, vehicle, user);
  } catch (err) { await reaction?.rollback?.(); throw err; }
  if (!Number.isFinite(total)) { await reaction?.rollback?.(); return refuse(MINE_REASONS.NOTICE_ROLL_FAILED); }
  const success = total >= mine.detectionDc;
  const updated = await patchPending(scene, mineId, pend => {
    const e = pend[vehicle.id]; if (!e || e.attempts?.[kind]) return false;
    pend[vehicle.id] = { ...e, noticed: e.noticed || success, attempts: { ...e.attempts, [kind]: { by: who.id, total, success } } };
  });
  if (!updated) { await reaction?.rollback?.(); return refuse(MINE_REASONS.ALREADY_ATTEMPTED); }
  return { ok: true, success, total, dc: mine.detectionDc, kind };
}

/**
 * Settle a pending entry (GM). If the ship noticed the mine AND is not in the square (or never ended there), the mine does not trigger and the entry
 * is cleared; otherwise the normal trigger runs through the atomic claim: the area attack on every ship in the square and on the entering ship.
 * `outcome` lets the GM rule explicitly ('avoided' | 'triggered') when position cannot tell (a crossing without a trusted path).
 */
export async function resolveEntry({ scene, mineId, actor, outcome = 'auto', user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  const mine = readMines(scene).find(m => m.id === mineId);
  if (!mine) return refuse(MINE_REASONS.NOT_FOUND);
  const entry = mine.pending?.[actor?.id];
  if (!entry) return refuse(MINE_REASONS.NO_ENTRY);
  const tok = Array.from(scene.tokens ?? []).find(t => t?.actor?.id === actor.id);
  const stillThere = !!tok && tokenOccupies(tok, sceneGridSize(scene), mine.square);
  const avoided = outcome === 'avoided' || (outcome === 'auto' && entry.noticed === true && !stillThere);
  if (avoided) {
    await patchPending(scene, mineId, pend => { delete pend[actor.id]; });
    return { ok: true, avoided: true };
  }
  const r = await detonate({ scene, mineId, user, alsoTargets: [actor] });
  return r.ok ? { ...r, avoided: false } : r;
}

export async function removeMine({ scene, mineId, user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  return (await claimMine(scene, mineId)) ? { ok: true } : refuse(MINE_REASONS.NOT_FOUND);
}
