import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROGRESSION_RULES } from '../scripts/engine/progression/data/progression-data.js';

// Phase 12A: progression-data.js hand-authored Jedi class skills drifted from the
// canonical class data (packs/classes.db) and wrongly listed Stealth, which would make
// archetype route-cost analysis treat a Jedi Shadow's Stealth route as free.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbLines = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const skillNameById = Object.fromEntries(dbLines('packs/skills.db').map((s) => [s._id, s.name]));
const canonicalClassSkills = (className) => {
  const cls = dbLines('packs/classes.db').find((c) => c.name === className && c.system.base_class);
  return cls.system.class_skills.map((id) => skillNameById[id] ?? id);
};
const KNOWLEDGE = ['Bureaucracy', 'Galactic Lore', 'Life Sciences', 'Physical Sciences', 'Social Sciences', 'Tactics', 'Technology'];
const expand = (names) => names.flatMap((n) => (/^Knowledge\(all skills/.test(n) ? KNOWLEDGE.map((k) => `Knowledge (${k})`) : [n]));
const norm = (names) => [...new Set(names.map((n) => n.toLowerCase().replace(/\s+/g, '')))].sort();

test('Jedi class skills equal the canonical class data (Knowledge expanded)', () => {
  assert.deepEqual(norm(PROGRESSION_RULES.classes.Jedi.classSkills), norm(expand(canonicalClassSkills('Jedi'))));
});

test('Jedi class skills no longer include Stealth, Climb, Persuasion or Swim', () => {
  const skills = PROGRESSION_RULES.classes.Jedi.classSkills;
  for (const wrong of ['Stealth', 'Climb', 'Persuasion', 'Swim']) assert.ok(!skills.includes(wrong), wrong);
  assert.ok(skills.includes('Mechanics'));
  assert.ok(skills.includes('Use the Force'));
});

test('Jedi Shadow Stealth route is a bridge, not free (agrees with archetype SSOT)', () => {
  const ssot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/archetypes.json'), 'utf8'));
  const route = ssot.archetypes.jedi_shadow.mechanics.backgrounds.foundationRouteAnalysis.jedi;
  assert.ok(route.missingSignatureSkills.includes('stealth'));
  assert.ok(!PROGRESSION_RULES.classes.Jedi.classSkills.includes('Stealth'));
});

test('known remaining drift in the other four base classes is tracked, not silently fixed', () => {
  // Out of Phase 12A scope (the defect was Jedi-specific and flagged by the audit). If this fails
  // because a list was corrected, update the expectation and the Phase 12A audit follow-ups.
  const diff = (cls) => {
    const prog = norm(PROGRESSION_RULES.classes[cls].classSkills.filter((s) => !s.startsWith('Knowledge')));
    const canon = norm(expand(canonicalClassSkills(cls)).filter((s) => !s.startsWith('Knowledge')));
    return { extra: prog.filter((s) => !canon.includes(s)), missing: canon.filter((s) => !prog.includes(s)) };
  };
  assert.deepEqual(diff('Soldier'), { extra: ['ride', 'survival'], missing: ['treatinjury', 'usecomputer'] });
  assert.deepEqual(diff('Noble'), { extra: [], missing: ['treatinjury', 'usecomputer'] });
  assert.deepEqual(diff('Scout'), { extra: ['acrobatics', 'treatinjury'], missing: ['ride'] });
  assert.deepEqual(diff('Scoundrel'), { extra: ['climb', 'jump', 'swim'], missing: [] });
});
