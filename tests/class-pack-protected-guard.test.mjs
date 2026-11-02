import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  verifyClassPackProtectedState, classProtectedFingerprint,
  protectedClassRecord,
} from '../tools/lib/class-pack-protected-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = fs.readFileSync(path.join(root,'packs/classes.db'),'utf8')
  .split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest = JSON.parse(fs.readFileSync(path.join(root,'data/audits/class-mechanics-protected-baseline.json'),'utf8'));

test('approved class skills and BAB corrections preserve all 37 frozen protected records', () => {
  const report = verifyClassPackProtectedState(root);
  assert.equal(report.ok, true, report.failures.join('; '));
  assert.equal(docs.length, 37);
  assert.equal(manifest.records.length, 37);
});

test('the guard ignores only the three explicitly approved mechanics fields', () => {
  const original = docs.find(doc => doc.name === 'Jedi');
  const changed = structuredClone(original);
  changed.system.trainedSkills = 99;
  changed.system.class_skills = [];
  changed.system.babProgression = 'medium';
  assert.equal(classProtectedFingerprint(changed), classProtectedFingerprint(original));
  assert.equal(protectedClassRecord(changed).system.base_hp, original.system.base_hp);
});

test('the guard rejects hit die, starting HP, defenses, tree identity, and class-feature mutations', () => {
  const original = docs.find(doc => doc.name === 'Jedi');
  const changes = [
    item => { item.system.hitDie = 12; },
    item => { item.system.base_hp = 99; },
    item => { item.system.defenses.fortitude = 99; },
    item => { item.system.talentTreeSourceIds = []; },
    item => { item.system.level_progression[0].features = []; },
    item => { item._id = 'unapproved-identity-change'; },
  ];
  for(const mutate of changes){
    const modified = structuredClone(original);
    mutate(modified);
    assert.notEqual(classProtectedFingerprint(modified), classProtectedFingerprint(original));
  }
});
