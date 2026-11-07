import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyClassPackProtectedState } from '../tools/lib/class-pack-protected-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const classes = read('packs/classes.db').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byName = name => {
  const matches = classes.filter(c => c.name === name);
  assert.equal(matches.length, 1);
  return matches[0].system.level_progression;
};
const occurrences = (className, filter) => byName(className).flatMap(row =>
  row.features.filter(filter).map(feature => ({ level: row.level, feature })));

test('Crime Lord Command Cover is granted once at 2 while every level retains its regular talent choice', () => {
  const matches = occurrences('Crime Lord', f => /Command Cover/i.test(f.name));
  assert.equal(matches.length, 1);
  assert.equal(matches[0].level, 2);
  assert.equal(matches[0].feature.featureKey, 'crimeLord.commandCover');
  assert.equal(matches[0].feature.scaling.maximum, 5);
  for(const row of byName('Crime Lord'))assert.equal(row.features.filter(f => f.type === 'talent_choice').length, 1);
});

test('Force Disciple Prophet is a first-level class feature, not five separately granted features', () => {
  const prophet = occurrences('Force Disciple', f => f.name === 'Prophet');
  assert.equal(prophet.length, 1);
  assert.equal(prophet[0].level, 1);
  assert.equal(prophet[0].feature.type, 'class_feature');
  for(const level of [2,3,4,5]) {
    const row = byName('Force Disciple').find(row => row.level === level);
    assert.equal(row.features.filter(f => f.type === 'force_secret_choice').length, 1);
  }
});

test('Infiltrator Unarmed Stun at 2, 6 and 10 has canonical extra-dice counts and printed labels', () => {
  const hits = occurrences('Infiltrator', f => f.featureKey === 'infiltrator.unarmedStun');
  assert.deepEqual(hits.map(h => [h.level, h.feature.name, h.feature.value, h.feature.unit]),
    [[2,'Unarmed Stun (+1 die)',1,'extra-damage-dice'],
     [6,'Unarmed Stun (+2 dice)',2,'extra-damage-dice'],
     [10,'Unarmed Stun (+3 dice)',3,'extra-damage-dice']]);
});

test('Master Privateer printed feature is Piracy; existing catalog ID remains stable', () => {
  const piracy = occurrences('Master Privateer', f => f.name === 'Piracy');
  assert.equal(piracy.length, 1);
  assert.equal(piracy[0].level, 1);
  assert.equal(piracy[0].feature.type, 'class_feature');
  assert.equal(occurrences('Master Privateer', f => f.name === 'Lure of Piracy').length, 0);
  const catalog = JSON.parse(read('data/class-features.json'));
  const def = catalog.abilities.filter(a => a.id === 'cf.masterPrivateer.lure-of-piracy');
  assert.equal(def.length, 1);
  assert.equal(def[0].name, 'Piracy');
});

test('Enforcer Resources is unlocked once at level 1 while the per-level allowance is represented separately', () => {
  const hits = occurrences('Enforcer', f => f.name === 'Resources');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].level, 1);
  assert.equal(hits[0].feature.featureKey, 'enforcer.resources');
  assert.equal(hits[0].feature.progression.grantEachClassLevel, true);
  assert.equal(hits[0].feature.progression.creditsPerHeroicLevel, 2000);
  assert.equal(hits[0].feature.progression.carryDeferredValue, true);
  for(const lvl of [1,3,5,7,9]) {
    const row = byName('Enforcer').find(r => r.level === lvl);
    assert.equal(row.features.filter(f => f.type === 'talent_choice').length, 1);
  }
});

test('all ten approved class progression records and the other 30 are protected from drift', () => {
  const guard = verifyClassPackProtectedState(root);
  assert.equal(guard.ok, true, guard.failures.join('; '));
  const baseline = JSON.parse(read('data/audits/class-mechanics-protected-baseline.json'));
  assert.equal(Object.keys(baseline.approvedProgressionExceptions).length, 10); // +Bounty Hunter (Familiar Foe), +Assassin (Mark), +Charlatan (Score) featureKeys
  assert.equal(classes.length, 37);
});
