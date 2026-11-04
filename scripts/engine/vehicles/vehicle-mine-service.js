/**
 * Space mines at runtime (Starships of the Galaxy, Space Mines; the rules and what is NOT automated are in domain/vehicle-space-mine.js).
 *
 *  deploy      GM client (a Scene write): the station operator's swift action (ActionEconomyConsumption, paid by the operator exactly as the
 *              autofire switch), ONE unit from the launcher's ledger (VehicleAmmunitionService: atomic, refunded on failure), then the mine is
 *              recorded in the deploying ship's current square on the Scene (vehicle-scene-state.js is the only Scene writer).
 *  detonate    the mine record is removed FIRST (a discrete resource cannot detonate twice); then each starship in the square takes an area attack
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
import { MINE_FLAG, MINE_TYPES, MINE_REASONS, buildMine, isValidMine, squareOfToken, tokenOccupies, mineDamageFormula } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-space-mine.js";
import { readSceneMap, writeSceneMap, sceneGridSize } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-scene-state.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { resolveOperatorPayer } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-fire-mode-service.js";

const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const isGM = user => user?.isGM === true;
export const readMines = scene => readSceneMap(scene, MINE_FLAG, isValidMine);
const reflexOf = a => Number(a?.system?.derived?.defenses?.reflex?.total ?? a?.system?.defenses?.reflex?.total);
const tokenOf = (actor, scene) => { const t = Array.from(actor?.getActiveTokens?.() ?? []); return t.find(x => (x?.document?.parent?.id ?? x?.scene?.id) === scene?.id) ?? t[0] ?? null; };

export async function deploy({ vehicle, weapon, scene = globalThis.canvas?.scene ?? null, detonation = 'proximity', iffExempt = [], user = globalThis.game?.user ?? null } = {}) {
  const a = resolveVehicleWeaponAuthority(weapon);
  if (!a?.ok || !a.mine || !MINE_TYPES[a.mine]) return refuse(MINE_REASONS.NOT_A_MINE_LAUNCHER);
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  if (!scene?.id) return refuse(MINE_REASONS.NO_SCENE);
  const square = squareOfToken(tokenOf(vehicle, scene), sceneGridSize(scene));
  if (!square) return refuse(MINE_REASONS.NO_POSITION);
  const can = await VehicleAmmunitionService.canLaunch(vehicle, weapon);
  if (!can.ok) return refuse(can.reason);
  const who = await resolveOperatorPayer(vehicle, a);
  if (who.reason) return refuse(who.reason);
  const spend = await ActionEconomyConsumption.spend(who.payer, 'swift', { actionName: 'Deploy space mine', source: weapon.name });
  if (spend?.allowed === false) return refuse(MINE_REASONS.ACTION_UNAVAILABLE);
  const id = globalThis.foundry?.utils?.randomID?.() ?? `mine-${Date.now()}`;
  let ammo = null;
  try {
    ammo = await VehicleAmmunitionService.spendLaunch(vehicle, weapon, { attackId: id });
    if (!ammo.ok) { await spend?.rollback?.(); return refuse(ammo.reason); }
    const mine = buildMine({ id, sceneId: scene.id, vehicleId: vehicle.id, weaponId: weapon.id, type: a.mine, square, detonation, iffExempt, by: user?.id ?? null });
    await writeSceneMap(scene, MINE_FLAG, [...readMines(scene), mine]);
    return { ok: true, mine, paidBy: who.payer?.id ?? null };
  } catch (err) {
    if (ammo?.ok) await VehicleAmmunitionService.refundLaunch(ammo);
    await spend?.rollback?.();
    throw err;
  }
}

/** Detonate one mine: remove it first (once), then resolve its area attack against every starship in its square. */
export async function detonate({ scene, mineId, user = globalThis.game?.user ?? null, command = false } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  const mines = readMines(scene), mine = mines.find(m => m.id === mineId);
  if (!mine) return refuse(MINE_REASONS.NOT_FOUND);
  if (command && mine.detonation !== 'command') return refuse(MINE_REASONS.NOT_COMMAND);
  await writeSceneMap(scene, MINE_FLAG, mines.filter(m => m.id !== mineId));           // a discrete resource: gone before it can resolve twice
  const spec = MINE_TYPES[mine.type], formula = mineDamageFormula(mine.type), g = sceneGridSize(scene);
  const results = [];
  for (const tok of Array.from(scene.tokens ?? [])) {
    const target = tok?.actor;
    if (!target || target.type !== 'vehicle' || !tokenOccupies(tok, g, mine.square)) continue;
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
  return { ok: true, mine, results };
}

/** A token has moved: a proximity mine in the square it now occupies detonates unless the ship is IFF-exempt. */
export async function onTokenMoved({ scene, tokenDoc, user = globalThis.game?.user ?? null } = {}) {
  const actor = tokenDoc?.actor;
  if (!isGM(user) || actor?.type !== 'vehicle' || !scene?.id) return [];
  const fired = [];
  for (const m of readMines(scene)) {
    if (m.detonation !== 'proximity' || m.iffExempt.includes(actor.id) || !tokenOccupies(tokenDoc, sceneGridSize(scene), m.square)) continue;
    const r = await detonate({ scene, mineId: m.id, user });
    if (r.ok) fired.push(r);
  }
  return fired;
}

export async function removeMine({ scene, mineId, user = globalThis.game?.user ?? null } = {}) {
  if (!isGM(user)) return refuse(MINE_REASONS.GM_ONLY);
  const mines = readMines(scene);
  if (!mines.some(m => m.id === mineId)) return refuse(MINE_REASONS.NOT_FOUND);
  await writeSceneMap(scene, MINE_FLAG, mines.filter(m => m.id !== mineId));
  return { ok: true };
}
