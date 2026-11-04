/**
 * Shared harness for the weapon-ecosystem integration tests: a source-backed vehicle (X-wing or a Colossal (frigate)) owned by a wallet
 * actor, with the REAL install / ammunition services and TransactionEngine, in-memory ActorEngine writes, square-grid tokens, and forced d20s.
 */
import { buildUniversalVehiclePackSources } from '../../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './systems-resolver.mjs';
import { installFoundryStubs } from './foundry-stubs.mjs';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

installSystemsResolver(); installFoundryStubs();
export const { VehicleInstallationService: S } = await import('../../scripts/engine/vehicles/vehicle-installation-service.js');
export const { VehicleAmmunitionService, readAftermarketLedgers } = await import('../../scripts/engine/vehicles/vehicle-ammunition-service.js');
export const { ActorEngine } = await import('../../scripts/governance/actor-engine/actor-engine.js');
export const { SnapshotManager } = await import('../../scripts/engine/progression/utils/snapshot-manager.js');
export const { rollAttack } = await import('../../scripts/combat/rolls/attacks.js');
export const { RollEngine } = await import('../../scripts/engine/roll-engine.js');
export const { SWSEChat } = await import('../../scripts/chat/swse-chat.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
export const catalogRow = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
export const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
export const HULLS = { fighter: 'core-incom-t-65b-x-wing-starfighter', frigate: 'cw-c-9979-landing-craft' };
class Items extends Map {
  [Symbol.iterator]() { return this.values(); }
  get contents() { return [...this.values()]; }
  filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); }
}
export const rules = { resolveEpBudget: () => ({ state: 'known', total: 60 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
export const GM_MOUNT = { mountKey: 'turret-1', arc: 'omni', operatorRole: 'pilot', reason: 'hardpoint fitted at the yard' };
export const tokenAt = (x, y = 0, w, h) => ({ center: { x, y }, document: { rotation: 0, ...(w ? { width: w } : {}), ...(h ? { height: h } : {}) } });
let src, vehicle, owner, items, seq = 0, attackerToken = tokenAt(0, 0);
export const setGrid = (size = 100, over = {}) => { globalThis.canvas = { grid: { size, type: 1 }, scene: { id: 's1', grid: { size, distance: 5, units: 'ft', type: 1 }, ...over } }; return size; };
export function world({ hull = 'fighter', credits = 500000 } = {}) {
  setGrid(100); attackerToken = tokenAt(0, 0);
  src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === HULLS[hull]));
  src.system.ownedByActorId = 'owner1';
  items = new Items();
  vehicle = { ...src, id: 'veh1', name: 'Test hull', isOwner: true, items, getActiveTokens: () => [attackerToken], getRollData: () => ({}), toObject() { return structuredClone(src); } };
  owner = { id: 'owner1', name: 'Owner', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: this.system }; }, getFlag: () => [] };
  Object.assign(globalThis.game, { user: Object.assign(globalThis.game.user ?? {}, { id: 'gm1', isGM: true }), actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map(), combat: null });
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1') for (const [k, v] of Object.entries(plan.set ?? {})) { const m = /^flags\.swse\.(.+)$/.exec(k); if (m) src.flags.swse[m[1]] = structuredClone(v); }
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
  };
  const snaps = new Map();
  SnapshotManager.createSnapshot = async actor => { const t = snaps.size + 1; snaps.set(`${actor.id}:${t}`, { credits: actor.system?.credits }); return { timestamp: t }; };
  SnapshotManager.restoreSnapshot = async () => true;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const d of data) { const id = 'i' + (++seq); items.set(id, { id, ...structuredClone(d), actor: vehicle }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) items.delete(id); };
  ActorEngine.updateActor = async (actor, data) => {
    for (const [path, value] of Object.entries(data)) {
      const parts = path.split('.'); let o = actor;
      for (const k of parts.slice(0, -1)) o = (o[k] ??= {});
      const last = parts.at(-1); o[last.startsWith('==') ? last.slice(2) : last] = structuredClone(value);
    }
  };
  S.rules = rules;
}
export const catalogOf = id => new Map([[id, catalogRow(id)]]);
export async function install(id) {
  const r = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: id, catalog: catalogOf(id), reason: 'refit', mount: GM_MOUNT });
  assert.equal(r.success, true, JSON.stringify(r));
  return [...items.values()].filter(i => i.flags?.swse?.vehicleInstalledWeapon).at(-1);
}
export const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
globalThis.game.settings = globalThis.game.settings ?? { get: () => undefined };
const realPost = SWSEChat.postRoll; SWSEChat.postRoll = async () => ({ id: 'm' });
export const targetAt = (squares, { type = 'vehicle', size = 'medium', w, h, reflex = 15 } = {}) => ({ id: 'tgt', type, items: [], system: { size, defenses: { reflex: { total: reflex } } }, getActiveTokens: () => [tokenAt(squares * 100, 0, w, h)] });
export async function withD20(d20, fn) {
  const r0 = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); const total = d20 + b; return { total, formula, dice: [{ results: [{ result: d20 }] }], toJSON() { return { total, formula }; } }; };
  try { return await fn(); } finally { RollEngine.safeRoll = r0; }
}
export const shoot = (w, target, extra = {}) => withD20(15, async () => { log.length = 0; return rollAttack(vehicle, w, { abstractCrewQuality: 'normal', target, ...extra }); });
export const shootD20 = (d20, w, target, extra = {}) => withD20(d20, async () => { log.length = 0; return rollAttack(vehicle, w, { abstractCrewQuality: 'normal', target, ...extra }); });
export const rangeEntry = r => r.componentLedger.filter(e => e.id === 'range');


export const state = () => ({ src, vehicle, owner, items });
export const setAttackerToken = t => { attackerToken = t; };
export const restoreChat = () => { SWSEChat.postRoll = realPost; };
