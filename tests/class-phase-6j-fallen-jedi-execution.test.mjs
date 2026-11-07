import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();

const { apexClassLevel, isExplicitLightSideForcePower, resolveFallenJediForcePowerAccess } =
  await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/apex-class-feature-access.js');

const pack = readFileSync(new URL('../packs/classes.db', import.meta.url), 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
const sithApprentice = pack.find(cls => cls.name === 'Sith Apprentice');
assert.ok(sithApprentice, 'canonical Sith Apprentice class must be present');
const classItem = (id = sithApprentice._id, level = 1) =>
  ({ type: 'class', name: 'Sith Apprentice', system: { classId: id, level } });
const actor = (items = [classItem()], score = 12) =>
  ({ items, system: { darkSide: { value: score }, attributes: { wis: { base: 12 } } } });
const power = (tags = [], extra = {}) =>
  ({ type: 'force-power', name: 'Test Power', system: { tags, ...extra } });

test('Fallen Jedi uses actual preserved class pack identity and owned level', () => {
  assert.equal(sithApprentice._id.length, 16);
  assert.equal(apexClassLevel(actor(), 'sith_apprentice'), 1);
  assert.equal(resolveFallenJediForcePowerAccess(actor(), power(['light-side'])).allowed, false);
  assert.equal(resolveFallenJediForcePowerAccess(actor(), power(['light_side'])).reason, 'fallen-jedi-light-side-prohibited');
  assert.equal(resolveFallenJediForcePowerAccess(actor([classItem(sithApprentice._id, 0)]), power(['light-side'])).allowed, true);
});

test('recognizes explicit metadata but not a thematic name or rules prose', () => {
  assert.equal(isExplicitLightSideForcePower(power(['light-side'])), true);
  assert.equal(isExplicitLightSideForcePower(power(['light_side'])), true);
  assert.equal(isExplicitLightSideForcePower(power([], { descriptor: ['Mind-Affecting', 'Light Side'] })), true);
  assert.equal(isExplicitLightSideForcePower(power([], { descriptors: 'Mind-Affecting, [Light Side]' })), true);
  assert.equal(isExplicitLightSideForcePower(power([], { lightSideOption: true })), true);
  assert.equal(isExplicitLightSideForcePower(power(['dark-side'])), false);
  assert.equal(isExplicitLightSideForcePower({ name: 'Light Side Mysticism', system: { summary: 'May use Light Side power' } }), false);
  assert.equal(isExplicitLightSideForcePower(power(['something-light-sided'])), false);
});

test('do not deny non-apprentices, feats, unrelated Sith, or falsely named classes', () => {
  const tagged = power(['light-side']);
  assert.equal(resolveFallenJediForcePowerAccess(actor([]), tagged).allowed, true);
  assert.equal(resolveFallenJediForcePowerAccess(actor([{type:'feat',name:'Sith Apprentice',system:{level:10}}]), tagged).allowed, true);
  assert.equal(resolveFallenJediForcePowerAccess(actor([classItem('noble', 10)]), tagged).allowed, true);
  const sithLord = pack.find(cls => cls.name === 'Sith Lord');
  assert.equal(resolveFallenJediForcePowerAccess(actor([classItem(sithLord._id, 5)]), tagged).allowed, true);
  assert.equal(resolveFallenJediForcePowerAccess(actor(), power(['dark-side'])).allowed, true);
});

test('a lowered DSP does not silently grant a Sith Apprentice access to retained Light Side powers', () => {
  const a = actor([classItem()], 0);
  assert.equal(resolveFallenJediForcePowerAccess(a, power(['light-side'])).allowed, false);
  assert.equal(a.items[0].system.level, 1);
});

test('current force-power catalog carries explicit Light Side tags', () => {
  const list = JSON.parse(readFileSync(new URL('../data/force-powers.json', import.meta.url), 'utf8'));
  const light = list.filter(item => Array.isArray(item.tags) && item.tags.includes('light-side'));
  assert.ok(light.length > 0, 'catalog fixture must cover Light Side power descriptors');
  for (const entry of light) {
    assert.equal(isExplicitLightSideForcePower(power(entry.tags)), true, entry.name);
  }
});

test('both activation and execution reject before any resource, roll or item mutation', () => {
  const source = readFileSync(new URL('../scripts/engine/force/force-executor.js', import.meta.url), 'utf8');
  const first = source.indexOf('static async activateForce(');
  const second = source.indexOf('static async executeForcePower(');
  assert.ok(first >= 0 && second > first);
  const activate = source.slice(first, second);
  const execute = source.slice(second, source.indexOf('static isTelekineticForcePower(', second));
  assert.ok(activate.indexOf('resolveFallenJediForcePowerAccess(actor, power)') >= 0);
  assert.ok(activate.indexOf('resolveFallenJediForcePowerAccess(actor, power)') < activate.indexOf('ActorEngine.updateEmbeddedDocuments('));
  assert.ok(execute.indexOf('resolveFallenJediForcePowerAccess(actor, power)') >= 0);
  assert.ok(execute.indexOf('resolveFallenJediForcePowerAccess(actor, power)') < execute.indexOf('RollCore.execute('));
  assert.ok(execute.indexOf('resolveFallenJediForcePowerAccess(actor, power)') < execute.indexOf('ActorEngine.updateEmbeddedDocuments('));
});
