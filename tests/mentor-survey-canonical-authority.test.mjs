// Phase B: canonical Mentor routing and class-pack tree identity authorities used by the mentor surveys.
// Requirement IDs (SV-28, PR-02, L1-03, MC-02) are in 05-TRACEABILITY-MATRIX.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonOf = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const ndjson = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const ROUTES = jsonOf('data/mentor-survey/class-mentor-routes.json');
const REGISTRY = jsonOf('data/dialogue/mentor_registry.json').mentors;
const { MENTOR_PERSONALITIES } = await import(pathToFileURL(path.join(ROOT, 'scripts/mentor/mentor-personalities.js')).href);

// Owner roster (Prestige Q6 handoff section 6; L1 v0.19 section A). Display names must match the registry.
const FOUNDATION_ROSTER = { Jedi: 'Miraj', Noble: 'J0-N1', Scoundrel: "Ol' Salty", Scout: 'Lead', Soldier: 'Breach' };
const PRESTIGE_ROSTER = {
  'Ace Pilot': 'Mayu', 'Bounty Hunter': 'Kex Varon', 'Crime Lord': 'Tío the Hutt', 'Elite Trooper': 'Breach',
  'Force Adept': 'Seeker Vera', 'Force Disciple': 'Riquis', Gunslinger: 'Rajma', 'Jedi Knight': 'Miraj',
  'Jedi Master': 'Miraj', Officer: 'Admiral Korr', 'Sith Apprentice': 'Darth Malbada', 'Sith Lord': 'Darth Miedo',
  'Corporate Agent': 'Marl Skindar', Gladiator: 'Pegar', 'Melee Duelist': 'Blade Master Kharjo', Enforcer: 'Krag the Immovable',
  'Independent Droid': 'Seraphim', Infiltrator: 'Delta', 'Master Privateer': 'The Captain', Medic: 'Kyber',
  Saboteur: 'Spark', Outlaw: 'Rogue', 'Droid Commander': 'General Axiom', 'Military Engineer': 'Chief Engineer Rax',
  Vanguard: 'Shield Captain Theron', 'Martial Arts Master': 'Master Zhen', 'Imperial Knight': 'Dezmin',
  Shaper: 'Shaper Urza', Assassin: 'Delta', Charlatan: 'Silvertongue Sela', Improviser: 'Lucky Jack', Pathfinder: 'Lead',
};

test('SV-28 route table covers exactly 5 foundation and 32 prestige classes', () => {
  assert.equal(Object.keys(ROUTES.foundation).length, 5);
  assert.equal(Object.keys(ROUTES.prestige).length, 32);
  assert.deepEqual(Object.values(ROUTES.foundation).map((r) => r.className).sort(), Object.keys(FOUNDATION_ROSTER).sort());
  assert.deepEqual(Object.values(ROUTES.prestige).map((r) => r.className).sort(), Object.keys(PRESTIGE_ROSTER).sort());
});

test('L1-03/MC-02 foundation Mentors are preserved (Miraj, J0-N1, Ol\' Salty, Lead, Breach)', () => {
  for (const [cls, mentor] of Object.entries(FOUNDATION_ROSTER)) {
    const route = Object.values(ROUTES.foundation).find((r) => r.className === cls);
    assert.equal(REGISTRY[route.mentorRegistryKey]?.display_name, mentor, cls);
  }
});

test('PR-02 all 32 prestige classes resolve to the owner-roster Mentor in the registry', () => {
  for (const [cls, mentor] of Object.entries(PRESTIGE_ROSTER)) {
    const route = Object.values(ROUTES.prestige).find((r) => r.className === cls);
    assert.ok(route, `${cls} has a route`);
    const entry = REGISTRY[route.mentorRegistryKey];
    assert.ok(entry, `${cls}: registry entry "${route.mentorRegistryKey}" exists`);
    assert.equal(entry.display_name, mentor, cls);
  }
});

test('SV-28 Melee Duelist/Kharjo is registered (previously missing) and its dialogue file exists', () => {
  const entry = REGISTRY.kharjo;
  assert.ok(entry, 'kharjo registry entry');
  assert.equal(entry.display_name, 'Blade Master Kharjo');
  assert.ok(fs.existsSync(path.join(ROOT, entry.dialogue_path)), entry.dialogue_path);
  const ids = Object.values(REGISTRY).map((e) => e.mentor_id);
  assert.equal(new Set(ids).size, ids.length, 'mentor_id values are unique');
});

test('SV-28 every routed Mentor has a registry dialogue file and agrees with MENTOR_PERSONALITIES', () => {
  const all = [...Object.values(ROUTES.foundation), ...Object.values(ROUTES.prestige)];
  for (const route of all) {
    const entry = REGISTRY[route.mentorRegistryKey];
    assert.ok(fs.existsSync(path.join(ROOT, entry.dialogue_path)), `${route.className}: ${entry.dialogue_path}`);
    const personality = MENTOR_PERSONALITIES[route.className];
    assert.ok(personality?.key, `${route.className} has a personality key`);
    // personality key and registry key refer to the same person: compare normalized forms
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const registryForms = [route.mentorRegistryKey, entry.display_name, ...(entry.aliases || [])].map(norm);
    const pk = norm(personality.key);
    assert.ok(
      registryForms.some((f) => f === pk || f.includes(pk)),
      `${route.className}: personality "${personality.key}" vs registry "${route.mentorRegistryKey}"`,
    );
  }
});

test('SV-28 unknown class has no route (fail closed, no substituted Mentor)', () => {
  const all = { ...ROUTES.foundation, ...ROUTES.prestige };
  assert.equal(all.not_a_class, undefined);
  assert.equal(all.nonheroic, undefined);
});

// packs/classes.db is a frozen protected baseline (tests/class-pack-protected-guard.test.mjs), so the mentor-survey
// cutover does NOT edit it. Three integrity anomalies are known and documented in
// docs/design/mentor-survey-v2/06-CONTENT-STATUS-AND-BLOCKERS.md. This test is a tripwire: the anomaly set must be
// exactly these three, and the surveys must resolve class trees through talentTreeSourceIds only.
const KNOWN_ANOMALIES = new Set([
  'Assassin|talent_trees|GenoHaradan',
  'Infiltrator|talent_trees|Bothan SpyNet',
  'Independent Droid|talentTreeUuids|9fe73a37-03fa-45fc-a628-fd43cae6bf7f',
]);

test('Phase B: class-pack tree identity anomalies are exactly the three documented ones', () => {
  const trees = new Set(ndjson('packs/talent_trees.db').map((t) => t._id));
  const found = new Set();
  for (const c of ndjson('packs/classes.db')) {
    const s = c.system || {};
    for (const id of s.talent_trees || []) if (!trees.has(id)) found.add(`${c.name}|talent_trees|${id}`);
    for (const id of s.talentTreeSourceIds || []) assert.ok(trees.has(id), `${c.name}: talentTreeSourceIds "${id}" must be a tree _id`);
    for (const u of s.talentTreeUuids || []) {
      const id = u.split('.').pop();
      if (!trees.has(id)) found.add(`${c.name}|talentTreeUuids|${id}`);
    }
  }
  assert.deepEqual([...found].sort(), [...KNOWN_ANOMALIES].sort());
});

test('Phase B: talentTreeSourceIds is the authoritative id list and always resolves', () => {
  const trees = new Set(ndjson('packs/talent_trees.db').map((t) => t._id));
  for (const c of ndjson('packs/classes.db')) {
    const ids = c.system?.talentTreeSourceIds;
    if (ids) assert.ok(ids.every((id) => trees.has(id)), c.name);
  }
});
