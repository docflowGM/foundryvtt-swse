import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROGRESSION_RULES } from '../scripts/engine/progression/data/progression-data.js';
import { CORE_CLASS_SKILL_AUTHORITY } from '../tools/lib/core-class-skills-authority.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbLines = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const skills = dbLines('packs/skills.db');
const skillNameById = new Map(skills.map(s => [s._id, s.name]));
const classes = dbLines('packs/classes.db');

for (const [className, expected] of Object.entries(CORE_CLASS_SKILL_AUTHORITY)) {
  test(`${className}: Core Rulebook skill entitlement matches primary source`, () => {
    const found = classes.filter(c => c.name === className && c.system.base_class === true);
    assert.equal(found.length, 1, 'one authoritative base class required');
    const cls = found[0];
    assert.equal(cls.system.trainedSkills, expected.trainedSkills);
    assert.deepEqual(cls.system.class_skills.map(ref => skillNameById.get(ref) ?? ref), expected.classSkills);
    assert.equal(new Set(cls.system.class_skills).size, cls.system.class_skills.length);
    assert.equal(PROGRESSION_RULES.classes[className].classSkills, undefined, 'no duplicate skills map');
    assert.equal(PROGRESSION_RULES.classes[className].skillPoints, undefined, 'no duplicate trained count');
  });
}

test('Jedi Shadow Stealth is not a free Jedi class skill', () => {
  const jedi = classes.find(cls => cls.name === 'Jedi');
  const names = jedi.system.class_skills.map(ref => skillNameById.get(ref) ?? ref);
  for (const nonJediSkill of ['Stealth', 'Climb', 'Jump', 'Mechanics', 'Persuasion', 'Swim']) {
    assert.ok(!names.includes(nonJediSkill), `Jedi must not grant ${nonJediSkill}`);
  }
  assert.ok(names.includes('Use the Force'));
  const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/archetypes.json'), 'utf8'));
  const route = ssot.archetypes.jedi_shadow.mechanics.backgrounds.foundationRouteAnalysis.jedi;
  assert.ok(route.missingSignatureSkills.includes('stealth'));
});

test('all class identities preserved: 5 heroic and 32 prestige', () => {
  assert.equal(classes.length, 37);
  assert.equal(classes.filter(c => c.system.base_class === true).length, 5);
  assert.equal(classes.filter(c => c.system.base_class === false).length, 32);
  assert.equal(new Set(classes.map(c => c._id)).size, 37);
});
