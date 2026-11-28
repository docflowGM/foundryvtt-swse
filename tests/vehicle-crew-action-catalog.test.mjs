import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VEHICLE_CREW_ACTIONS, catalogEntryFor, describeCrewAction, chargeCrewAction } from '../scripts/engine/crew/vehicle-crew-action-catalog.js';

// Every button the router offers is classified; nothing is left to be guessed by the template
const router = readFileSync('scripts/sheets/v2/vehicle-sheet/crew-skill-router.js', 'utf8');
const uses = [...router.matchAll(/use: '([^']+)'/g)].map((m) => m[1]);
assert(uses.length >= 9);
for (const use of uses) assert(VEHICLE_CREW_ACTIONS.some((a) => a.use === use), `catalog covers "${use}"`);
// only printed Core actions carry a cost; roll helpers never do (no invented costs)
for (const a of VEHICLE_CREW_ACTIONS) { if (a.category === 'roll-helper') assert.equal(a.cost, null, a.id); else assert(a.page, `${a.id} cites its printed page`); }
assert.equal(catalogEntryFor('gunner-2', 'Fire Weapon').id, 'gunner.fire-weapon', 'dynamic gunner keys resolve to the base role');
assert.equal(describeCrewAction('copilot', 'Aid Pilot').costLabel, 'Standard action');
assert.equal(describeCrewAction('engineer', 'Repair/Boost').categoryLabel, 'Roll helper');
assert.match(describeCrewAction('engineer', 'Repair/Boost').effectSummary, /not the printed Reroute Power/);
assert.equal(describeCrewAction('shields', 'Recharge Shields').costLabel, '3 swift actions');
assert.equal(describeCrewAction('pilot', 'Nope').category, 'unclassified');

// shared per-actor budget: one actor, several roles, ONE standard action
const budget = new Map();
const spend = async (actor, type) => {
  const left = budget.get(actor.id) ?? 1;
  if (left < 1) return { allowed: false, permitted: false, committed: false };
  budget.set(actor.id, left - 1);
  return { allowed: true, permitted: true, committed: true, rollback: async () => budget.set(actor.id, (budget.get(actor.id) ?? 0) + 1) };
};
const droid = { id: 'r2' };
const aid = catalogEntryFor('copilot', 'Aid Pilot');
let r = await chargeCrewAction(aid, droid, spend);
assert.equal(r.charged, true);
r = await chargeCrewAction(aid, droid, spend);
assert.equal(r.refused, true, 'same actor in another role cannot spend the standard action twice');
assert.equal((await chargeCrewAction(aid, { id: 'other' }, spend)).charged, true, 'a different actor has their own budget');
await (await chargeCrewAction(aid, { id: 'x' }, spend)).handle; // no-op
// rollback gives the action back
const y = { id: 'y' }; const c = await chargeCrewAction(aid, y, spend); await c.handle.rollback(); assert.equal(budget.get('y'), 1);
// roll helpers, pipeline-charged attacks and untracked multi-turn costs are never charged here
for (const [st, use] of [['engineer', 'Repair/Boost'], ['gunner', 'Fire Weapon'], ['shields', 'Recharge Shields'], ['commander', 'Command']]) {
  let called = 0; const res = await chargeCrewAction(catalogEntryFor(st, use), { id: 'z' }, async () => { called++; return {}; });
  assert.equal(called, 0, `${use} not charged`); assert.equal(res.charged, false);
}
// no actor (abstract crew) -> no charge
assert.equal((await chargeCrewAction(aid, null, spend)).charged, false);

// VC-09: unknown crew quality fails closed; recorded quality is kept
const { recordedCrewQuality } = await import('../scripts/sheets/v2/vehicle-sheet/crew-skill-router.js').catch(() => ({}));
if (recordedCrewQuality) {
  assert.equal(recordedCrewQuality({ system: {} }), null); assert.equal(recordedCrewQuality({ system: { crewQuality: 'bogus' } }), null);
  assert.equal(recordedCrewQuality({ system: { crewQuality: 'Skilled' } }), 'skilled');
} else assert.match(router, /export function recordedCrewQuality/);
assert.match(router, /if \(!recordedCrewQuality\(vehicle\)\)/); assert.doesNotMatch(router, /crewQuality \|\| 'normal'\)\.toLowerCase\(\)/);
// wiring
assert.match(router, /chargeCrewAction\(catalogEntry, actor/); assert.match(readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js', 'utf8'), /actionUse: button\.dataset\.use/);
assert.match(readFileSync('templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs', 'utf8'), /action\.categoryLabel/);
console.log('vehicle crew action catalog: ok');
