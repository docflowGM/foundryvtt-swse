import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCanonicalClassBABAtLevel } from '../scripts/engine/progression/utils/class-bab-table.js';
import { NONHEROIC_CLASS_MODEL } from '../scripts/engine/progression/utils/nonheroic-class-model.js';
import { PROGRESSION_RULES } from '../scripts/engine/progression/data/progression-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const classes = fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const byName = new Map(classes.map(cls => [cls.name, cls]));

const FULL_BAB_CORRECTIONS = [
  'Martial Arts Master', 'Gladiator', 'Melee Duelist', 'Imperial Knight',
  'Officer', 'Sith Apprentice', 'Assassin', 'Droid Commander',
  'Vanguard', 'Master Privateer',
];

const model = name => {
  const cls = byName.get(name);
  assert.ok(cls, `missing class: ${name}`);
  return { name, levelProgression: cls.system.level_progression };
};

test('all 37 canonical class BAB tables are complete, source-rate-consistent, and addressable', () => {
  assert.equal(classes.length, 37);
  assert.equal(byName.size, 37);
  assert.equal(classes.filter(c => c.system.base_class === true).length, 5);
  assert.equal(classes.filter(c => c.system.base_class === false).length, 32);

  for (const cls of classes) {
    const rows = cls.system.level_progression;
    assert.ok(Array.isArray(rows) && rows.length > 0, cls.name);
    assert.ok(['fast', 'medium'].includes(cls.system.babProgression), cls.name);
    const expectedLength = cls.system.base_class ? 20
      : ['Jedi Master', 'Sith Lord', 'Force Disciple'].includes(cls.name) ? 5 : 10;
    assert.equal(rows.length, expectedLength, cls.name);
    for (let level = 1; level <= rows.length; level++) {
      const expectedBAB = cls.system.babProgression === 'fast'
        ? level : Math.floor(level * 0.75);
      assert.equal(rows[level - 1].level, level, `${cls.name} level index`);
      assert.equal(rows[level - 1].bab, expectedBAB, `${cls.name} BAB level ${level}`);
      assert.equal(getCanonicalClassBABAtLevel(model(cls.name), level), expectedBAB);
    }
  }
});

test('all 11 documented mismatches are fixed without altering the printed BAB tables', () => {
  assert.equal(byName.get('Noble').system.babProgression, 'medium');
  assert.equal(getCanonicalClassBABAtLevel(model('Noble'), 20), 15);
  for (const className of FULL_BAB_CORRECTIONS) {
    assert.equal(byName.get(className).system.babProgression, 'fast', className);
    assert.equal(getCanonicalClassBABAtLevel(model(className), 1), 1, className);
    assert.equal(getCanonicalClassBABAtLevel(model(className), 10), 10, className);
  }
  assert.equal(PROGRESSION_RULES.classes.Noble.baseAttackBonus, 'medium');
});

test('multiclass BAB adds final class-specific totals, not one global character-level rate', () => {
  const sum = selections => selections.reduce((total, [name, level]) =>
    total + getCanonicalClassBABAtLevel(model(name), level), 0);
  assert.equal(sum([['Jedi', 3], ['Noble', 2], ['Sith Apprentice', 2]]), 6);
  assert.equal(sum([['Scoundrel', 4], ['Gladiator', 3]]), 6);
  assert.equal(sum([['Scout', 5], ['Officer', 1]]), 4);
  assert.equal(sum([['Soldier', 6], ['Crime Lord', 2]]), 7);
});

test('Nonheroic levels use the separate published 3/4 table, not a fast/medium guess', () => {
  assert.equal(getCanonicalClassBABAtLevel(NONHEROIC_CLASS_MODEL, 1), 0);
  assert.equal(getCanonicalClassBABAtLevel(NONHEROIC_CLASS_MODEL, 7), 5);
  assert.equal(getCanonicalClassBABAtLevel(NONHEROIC_CLASS_MODEL, 20), 15);
});

test('missing authority and illegal level requests fail closed', () => {
  assert.throws(() => getCanonicalClassBABAtLevel(null, 1), /no canonical progression table/);
  assert.throws(() => getCanonicalClassBABAtLevel(model('Sith Lord'), 6), /no canonical BAB row/);
  assert.throws(() => getCanonicalClassBABAtLevel(model('Officer'), 11), /no canonical BAB row/);
  assert.throws(() => getCanonicalClassBABAtLevel(model('Jedi'), 0), /invalid level/);
  assert.throws(() => getCanonicalClassBABAtLevel(model('Noble'), 1.5), /invalid level/);
  assert.throws(() => getCanonicalClassBABAtLevel({name:'Broken',levelProgression:[{level:1}]}, 1), /no canonical BAB row/);
});

test('prestige readiness must use canonical BAB rather than the old Jedi/Soldier-only fallback', () => {
  const source = fs.readFileSync(path.join(ROOT,
    'scripts/engine/progression/engine/tools/prestige-readiness.js'), 'utf8');
  assert.match(source, /getCanonicalClassBABAtLevel\(classModel, level\)/);
  assert.match(source, /ClassesRegistry\.getByName\(className\)/);
  assert.doesNotMatch(source, /fullBABClasses/);
});
