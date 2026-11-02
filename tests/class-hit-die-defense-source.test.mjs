import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const classes = fs.readFileSync(path.join(root, 'packs/classes.db'), 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
const census = load('data/audits/class-phase-6a-structural-census.json');
const sourceLedger = load('data/audits/class-phase-6b-prestige-source-ledger.json');
const byName = new Map(classes.map(cls => [cls.name, cls]));

const heroic = {
  Jedi: { hitDie: 10, baseHp: 30, defenses: { reflex: 1, fortitude: 1, will: 1 } },
  Noble: { hitDie: 6, baseHp: 18, defenses: { reflex: 1, fortitude: 0, will: 2 } },
  Scoundrel: { hitDie: 6, baseHp: 18, defenses: { reflex: 2, fortitude: 0, will: 1 } },
  Scout: { hitDie: 8, baseHp: 24, defenses: { reflex: 2, fortitude: 1, will: 0 } },
  Soldier: { hitDie: 10, baseHp: 30, defenses: { reflex: 1, fortitude: 2, will: 0 } },
};

test('the five heroic Core starting-HP and class-defense records match printed class tables', () => {
  for (const [name, rules] of Object.entries(heroic)) {
    const cls = byName.get(name);
    assert.ok(cls?.system?.base_class, name);
    assert.equal(cls.system.hitDie, rules.hitDie, name);
    assert.equal(cls.system.base_hp, rules.hitDie * 3, name);
    assert.equal(cls.system.base_hp, rules.baseHp, name);
    assert.deepEqual(cls.system.defenses, rules.defenses, name);
  }
});

test('all 32 prestige hit dice and defense bonuses retain certified printed values', () => {
  assert.equal(sourceLedger.classes.length, 32);
  const prestige = classes.filter(c => c.system.base_class === false);
  assert.equal(prestige.length, 32);
  for (const cert of sourceLedger.classes) {
    assert.equal(cert.sourceReviewed, true, cert.name);
    assert.equal(cert.checks.sourceHitDieMatches, true, cert.name);
    assert.equal(cert.checks.sourceDefensesMatch, true, cert.name);
    const cls = byName.get(cert.name);
    assert.equal(cls?._id, cert.classId, cert.name);
    assert.equal(cls.system.hitDie, cert.source.hitDie, cert.name);
    assert.deepEqual(cls.system.defenses, cert.source.defenses, cert.name);
  }
});

test('the 37 class identities and talent-tree ownership survive mechanics corrections', () => {
  assert.equal(census.classes.length, 37);
  assert.equal(classes.length, 37);
  for (const old of census.classes) {
    const cls = byName.get(old.name);
    assert.ok(cls, old.name);
    assert.equal(cls._id, old.id);
    assert.deepEqual(cls.system.talentTreeSourceIds || [], old.talentTreeSourceIds, old.name);
    assert.deepEqual(cls.system.starting_features || [], old.startingFeatures, old.name);
  }
});

test('multiclass defense bonuses take the highest separate class bonus, not their sum', () => {
  const maxDefenses = names => Object.fromEntries(['fortitude','reflex','will'].map(key =>
    [key, Math.max(0, ...names.map(n => byName.get(n)?.system?.defenses?.[key] ?? 0))]));
  assert.deepEqual(maxDefenses(['Jedi','Noble']), { fortitude: 1, reflex: 1, will: 2 });
  assert.deepEqual(maxDefenses(['Soldier','Scoundrel','Scout']), { fortitude: 2, reflex: 2, will: 1 });
  assert.deepEqual(maxDefenses(['Jedi Knight','Jedi Master','Soldier']), { fortitude: 3, reflex: 3, will: 3 });
  assert.deepEqual(maxDefenses(['Medic','Sith Lord']), { fortitude: 4, reflex: 3, will: 3 });

  const runtime = fs.readFileSync(path.join(root,'scripts/actors/derived/defense-calculator.js'),'utf8');
  assert.match(runtime, /maxBonus\s*=\s*Math\.max\(maxBonus,\s*classBonus\)/);
});

test('starting HP metadata is only an initial heroic-class entitlement, not a multiclass grant', () => {
  for (const [name, rule] of Object.entries(heroic)) {
    const cls = byName.get(name);
    assert.equal(cls.system.base_hp, 3 * cls.system.hitDie, name);
  }
  // The actual progression engine owns later hit-die rolls and HP history.
  // This test intentionally does not reconstruct or overwrite persisted HP.
  const finalizer = fs.readFileSync(path.join(root,'scripts/apps/progression-framework/shell/progression-finalizer.js'),'utf8');
  assert.match(finalizer, /sessionState\.mode === 'chargen'[\s\S]*?_computeStartingHP\(/);
  assert.match(finalizer, /sessionState\.mode === 'levelup'[\s\S]*?hpGain/);
});
