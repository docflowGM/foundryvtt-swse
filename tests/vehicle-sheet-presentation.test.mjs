import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
const { buildVehicleWeaponMountPanel } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js');
const veh = (crewPositions) => ({ type: 'vehicle', isOwner: true, items: [], system: { crewPositions, weapons: [{ name: 'Port Lasers', crewRole: 'gunner', operatorStation: 'gunner' }, { name: 'Starboard Lasers', crewRole: 'gunner', operatorStation: 'gunner-2' }] } });
// UI-02: the operator label comes from the assigned crew, not a hard-coded "Unassigned"
let panel = buildVehicleWeaponMountPanel(veh({ gunner: { name: 'Lead', uuid: 'Actor.l1' }, 'gunner-2': { name: 'Wing', uuid: 'Actor.w1' } }));
assert.deepEqual(panel.mounts.map((m) => m.gunner), ['Lead', 'Wing']);
assert.deepEqual(panel.mounts.map((m) => m.operatorStatus), ['assigned', 'assigned']);
panel = buildVehicleWeaponMountPanel(veh({ gunner: null, 'gunner-2': null }));
assert(panel.mounts.every((m) => m.operatorStatus === 'abstract-crew' && /abstract crew/.test(m.gunner)), 'unassigned station says abstract crew with the station label');
assert(panel.mounts.every((m) => m.operatorOccupantName === null));
// two gunner stations + an unmapped weapon is ambiguous (never a guess): no occupant is displayed for it
const amb = buildVehicleWeaponMountPanel({ ...veh({ gunner: { name: 'Lead' } }), system: { crewPositions: { gunner: { name: 'Lead' } }, weapons: [{ name: 'A', crewRole: 'gunner' }, { name: 'B', crewRole: 'gunner' }] } });
assert(amb.mounts.every((m) => m.operatorStatus === 'ambiguous' && m.gunner === null));
// UI-08: zero percent keeps its bar; non-bar resources do not get one
const src = readFileSync(new URL('../scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', import.meta.url), 'utf8');
assert.match(src, /const hasBar = entry\.bar !== null/);
const hbs = readFileSync(new URL('../templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', import.meta.url), 'utf8');
assert.match(hbs, /\{\{#if resource\.hasBar\}\}/);
assert.doesNotMatch(hbs, /\{\{#if resource\.bar\}\}/);
// UI-09: Import is rendered disabled with an explanation, not disabled after render
assert.match(hbs, /data-action="import-vehicle" disabled aria-disabled="true" title="[^"]+"/);
// UI-07: header copy no longer asserts that no mount anywhere is certified
assert.doesNotMatch(src, /no installed mounts are certified/);
console.log('vehicle sheet presentation: ok');
