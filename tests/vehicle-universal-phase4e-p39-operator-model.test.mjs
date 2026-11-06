/**
 * Stock operator model: seats a statblock PRINTS ("pilot or gunner", "pilot/copilot") and printed droid / automated operators are parsed once,
 * never inferred from a name; an automated operator has no crew seat and fires only as an abstract crew.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { actors } from './helpers/vehicle-weapon-world.mjs';
import { parseOperatorText, assessStockWeaponGroups } from '../scripts/domain/vehicles/vehicle-stock-weapon-groups.js';

test('PARSE: printed seats and printed automated operators; anything else is not understood', () => {
  assert.deepEqual(parseOperatorText('pilot'), { stations: ['pilot'], automated: false });
  assert.deepEqual(parseOperatorText('Pilot or gunner'), { stations: ['pilot', 'gunner'], automated: false });
  assert.deepEqual(parseOperatorText('pilot/copilot'), { stations: ['pilot', 'copilot'], automated: false });
  assert.deepEqual(parseOperatorText('co-pilot'), { stations: ['copilot'], automated: false });
  for (const t of ['automated/droid brain', 'droid vessel', 'droid piloting system', 'virtual droid gunner']) assert.equal(parseOperatorText(t).automated, true, t);
  for (const t of ['', 'crew', 'pilot or navigator', 'gunnery officer', 'the droid pilot of a cruiser']) assert.equal(parseOperatorText(t), null, t);
});

test('CORPUS: every group with an alternative or automated operator carries it; none is guessed', () => {
  let alt = 0, auto = 0;
  for (const d of actors) for (const g of assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups) {
    if (g.operatorStations) { alt++; assert.ok(g.operatorStations.length > 1 && g.operatorStations[0] === g.operator, g.groupKey); }
    if (g.automatedOperator) { auto++; assert.equal(g.operator, 'gunner'); assert.equal(g.battery, undefined); }
  }
  assert.ok(alt >= 5 && auto >= 5, `${alt} alternative-seat groups, ${auto} automated`);
});
