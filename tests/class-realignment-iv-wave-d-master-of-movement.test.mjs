import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  masterOfMovementMax, masterOfMovementRemaining, planMasterOfMovement, spendMasterOfMovement, pruneMasterOfMovement,
  isMasterOfMovementRerollSkill, MASTER_OF_MOVEMENT_KEY, MOM_FLAG_SCOPE, MOM_FLAG_KEY,
} from '../scripts/engine/combat/class-master-of-movement.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const classes = read('packs/classes.db').split(/\r?\n/).filter(Boolean).map(JSON.parse);

const feat = { type: 'feat', name: 'mom', system: { sourceType: 'class-feature', featureKey: MASTER_OF_MOVEMENT_KEY } };
const duelist = (id, level, { keys = true, extra = [] } = {}) => ({
  id, uuid: `Actor.${id}`, name: id, flags: { [MOM_FLAG_SCOPE]: {} },
  items: [{ type: 'class', name: 'Melee Duelist', system: { level } }, ...(keys ? [feat] : []), ...extra],
});
const combat = (id, actors, started = true) => ({ id, started, round: 2, combatants: actors.map((a, i) => ({ id: `c${i}`, actor: a })) });
const engine = () => ({ async updateActorFlags(a, scope, key, value) { a.flags[scope] = { ...(a.flags[scope] || {}), [key]: structuredClone(value) }; },
  async unsetActorFlag(a, scope, key) { delete a.flags[scope]?.[key]; } });

test('class pack: stable key on the five scaling grants, uses = level/2', () => {
  const rows = classes.find(c => c.name === 'Melee Duelist').system.level_progression
    .flatMap(lp => (lp.features || []).filter(f => f.featureKey === MASTER_OF_MOVEMENT_KEY).map(f => [lp.level, f.value]));
  assert.deepEqual(rows, [[2, 1], [4, 2], [6, 3], [8, 4], [10, 5]]);
});
test('max uses are half the Melee Duelist level; keyed Item and class are both required', () => {
  for (let l = 0; l <= 10; l++) assert.equal(masterOfMovementMax(duelist('a', l)), Math.floor(l / 2));
  assert.equal(masterOfMovementMax(duelist('a', 10, { keys: false })), 0);
  const impostor = { id: 'i', items: [feat, { type: 'class', name: 'Soldier', system: { level: 10 } }] };
  assert.equal(masterOfMovementMax(impostor), 0);
});
test('Jump or Acrobatics by REQUESTED skill only; an Athletics request does not qualify', () => {
  assert.deepEqual(['jump', 'Jump', 'acrobatics', 'Acrobatics'].map(isMasterOfMovementRerollSkill), [true, true, true, true]);
  assert.deepEqual(['athletics', 'stealth', 'climb', ''].map(isMasterOfMovementRerollSkill), [false, false, false, false]);
});
test('plan refusals: no choice, wrong skill, Take 10/20, no encounter, not a combatant, out of uses', () => {
  const a = duelist('a', 4); const c = combat('k', [a]);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'jump', combat: c }).ok, true);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'movement', combat: c }).ok, true);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'nope', combat: c }).ok, false);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'stealth', combat: c }).ok, false);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'jump', checkMode: 'take10', combat: c }).ok, false);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'movement', combat: combat('k', [a], false) }).ok, false);
  assert.equal(planMasterOfMovement({ actor: a, choice: 'movement', combat: combat('k', [duelist('other', 4)]) }).ok, false);
  assert.equal(planMasterOfMovement({ actor: duelist('lvl1', 1), choice: 'movement', combat: combat('k', [duelist('lvl1', 1)]) }).ok, false);
});
test('one shared pool: each use is exactly one option, and the pool empties', async () => {
  const a = duelist('a', 4); const c = combat('k', [a]); const e = engine();
  assert.equal(masterOfMovementRemaining(a, c), 2);
  await spendMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'acrobatics', combat: c, deps: { actorEngine: e } });
  assert.equal(masterOfMovementRemaining(a, c), 1);
  await spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: e } });
  assert.equal(masterOfMovementRemaining(a, c), 0);
  await assert.rejects(spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: e } }), /No Master of Movement uses remain/);
});
test('a refused request spends nothing; a failed write spends nothing', async () => {
  const a = duelist('a', 4); const c = combat('k', [a]); const e = engine();
  await assert.rejects(spendMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'stealth', combat: c, deps: { actorEngine: e } }));
  assert.equal(masterOfMovementRemaining(a, c), 2);
  await assert.rejects(spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: { async updateActorFlags() { throw new Error('boom'); } } } }), /boom/);
  assert.equal(masterOfMovementRemaining(a, c), 2);
});
test('refund restores exactly one use, once', async () => {
  const a = duelist('a', 4); const c = combat('k', [a]); const e = engine();
  const receipt = await spendMasterOfMovement({ actor: a, choice: 'reroll', requestedSkillKey: 'jump', combat: c, deps: { actorEngine: e } });
  assert.equal(masterOfMovementRemaining(a, c), 1);
  assert.equal(await receipt.refund(), true);
  assert.equal(masterOfMovementRemaining(a, c), 2);
  assert.equal(await receipt.refund(), false);
  assert.equal(masterOfMovementRemaining(a, c), 2);
});
test('another encounter starts fresh; concurrent spends are serialized; prune clears the combat', async () => {
  const a = duelist('a', 2); const c = combat('k', [a]); const e = engine();
  await spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: e } });
  assert.equal(masterOfMovementRemaining(a, c), 0);
  assert.equal(masterOfMovementRemaining(a, combat('k2', [a])), 1);
  assert.equal(await pruneMasterOfMovement(a, 'k', { actorEngine: e }), true);
  assert.equal(a.flags[MOM_FLAG_SCOPE][MOM_FLAG_KEY], undefined);
  assert.equal(await pruneMasterOfMovement(a, 'k', { actorEngine: e }), false);
  let release; const gate = new Promise(r => { release = r; });
  const slow = { async updateActorFlags(...args) { await gate; return e.updateActorFlags(...args); } };
  const first = spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: slow } });
  await new Promise(r => setTimeout(r, 0));
  await assert.rejects(spendMasterOfMovement({ actor: a, choice: 'movement', combat: c, deps: { actorEngine: e } }), /already being spent/);
  release(); await first;
});
test('wiring (static): reroll spends before the roll and refunds on failure; dialog and hooks reference it', () => {
  const skills = read('scripts/rolls/skills.js');
  assert.ok(skills.indexOf('spendMasterOfMovement({ actor, choice') < skills.indexOf('RollCore.execute({'));
  assert.equal((skills.match(/masterOfMovement\?\.refund\(\)/g) || []).length, 2);
  assert.match(read('scripts/rolls/roll-config.js'), /masterOfMovementReroll: masterOfMovementEligible/);
  assert.match(read('scripts/infrastructure/hooks/combat-hooks.js'), /pruneMasterOfMovement\(actor, combat\.id\)/);
});
