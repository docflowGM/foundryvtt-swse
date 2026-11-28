import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
const { VehicleCrewAssignmentService: S } = await import('../scripts/engine/crew/vehicle-crew-assignment-service.js');
const mk = (id, name) => ({ id, uuid: `Actor.${id}`, name, type: 'character', documentName: 'Actor', system: {}, compendium: null, isOwner: true, pack: null });
const pilot = mk('p1', 'Miraj'), droid = { ...mk('d1', 'R2'), type: 'droid' };
globalThis.game.actors = { has: () => true, get: () => null };
let vehicle = { type: 'vehicle', system: { crewPositions: {}, ownedActors: [], relationships: [], weapons: [] }, items: [] };
const apply = (u) => { for (const [k, v] of Object.entries(u)) { const parts = k.split('.').slice(1); let o = vehicle.system; parts.slice(0, -1).forEach(x => o = (o[x] ??= {})); o[parts.at(-1)] = v; } };
const assign = (station, actor, opts) => { const u = S.buildAssignmentUpdate(vehicle, station, actor, opts); assert(u, `assignable ${station}`); apply(u); };
assign('pilot', pilot); assign('commander', pilot); assign('copilot', droid); assign('engineer', droid); assign('shields', droid);
const cp = vehicle.system.crewPositions;
assert.equal(cp.pilot?.uuid, 'Actor.p1'); assert.equal(cp.commander?.uuid, 'Actor.p1', 'one actor, several roles (level 1)');
assert.equal(cp.copilot?.uuid, 'Actor.d1'); assert.equal(cp.engineer?.uuid, 'Actor.d1'); assert.equal(cp.shields?.uuid, 'Actor.d1');
// a second, different actor replaces exactly one role and leaves the first actor's others alone
assign('commander', droid);
assert.equal(vehicle.system.crewPositions.commander.uuid, 'Actor.d1'); assert.equal(vehicle.system.crewPositions.pilot.uuid, 'Actor.p1');
// explicit Move-to-Role keeps the old single-station semantic
assign('engineer', pilot, { move: true });
assert.equal(vehicle.system.crewPositions.pilot, null, 'move clears prior stations');
assert.equal(vehicle.system.crewPositions.engineer.uuid, 'Actor.p1');
// mirrors keep one entry per (actor, station)
const mirror = vehicle.system.ownedActors.filter(e => (e.uuid || e.id) && String(e.uuid || e.id).includes('d1'));
assert(mirror.length >= 2, 'droid mirrored for each held role');
console.log('vehicle crew multi-role: ok');

// VC-03: one gunner-position count for the service and the sheet
const { countGunnerRoleWeapons } = await import('../scripts/actors/vehicle/gunner-positions.js');
const v3 = { type: 'vehicle', system: { weapons: [{ name: 'A', crewRole: 'pilot' }, { name: 'B' }, { name: 'C' }], crewPositions: {} }, items: [] };
assert.equal(countGunnerRoleWeapons(v3), 2, '1 pilot weapon + 2 gunner weapons = 2 gunner positions');
const keys = S.resolveStations(v3).stations.map(x => x.storageKey);
assert(keys.includes('gunner') && keys.includes('gunner-2') && !keys.includes('gunner-3'), keys.join());
// VC-04: strict combat evidence accepts a real gunner-2 and refuses gunner-99
const { resolveVehicleCrewStationEvidence } = await import('../scripts/domain/vehicles/vehicle-crew-station-evidence.js');
const veh = { id: 'V', type: 'vehicle', items: new Map(), system: { crewQuality: 'normal', crewPositions: {}, weapons: [{ name: 'W2', operatorStation: 'gunner-2' }, { name: 'W9', operatorStation: 'gunner-99' }] } };
const abstract = { ok: true, domain: 'vehicle-abstract-crew', normalizedContext: { vehicleActor: veh, crewQuality: 'normal' } };
const ev = (i) => resolveVehicleCrewStationEvidence({ vehicle: veh, weapon: { id: `system-weapons-${i}`, name: veh.system.weapons[i].name, system: {} }, domainResolution: abstract });
const bad = await ev(1); assert.equal(bad.crewStationResolved, false, 'gunner-99 refused'); assert.equal(bad.reason, 'WEAPON_OPERATOR_STATION_UNRESOLVED');
// veh has two gunner-role weapons => gunner and gunner-2 exist
const okEv = await ev(0); assert.equal(okEv.crewStationResolved, true, okEv.reason); assert.equal(okEv.stationKey, 'gunner-2');
console.log('vc-03/04: ok');
