import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2B-I2 -- certification of the seven source-reviewed species anatomy declarations (E2B-S1 cases E2B-RD-01..08).
// Reads the REAL packs/species.db and uses the REAL schema validator, SpeciesRegistry normalizers and publication-snapshot projection.
// MANIFEST below is a test-local certification manifest, not a runtime registry. Nothing here parses rules text.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { validateSpeciesAnatomyV1, declaresSpeciesAnatomy, HELD_ITEM_LOAD_FLOOR_V1 } = await import('/systems/foundryvtt-swse/scripts/species/species-anatomy-schema-v1.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);

// sha256 of packs/species.db as it stood at E2B-I1 (HEAD e9d1bdd), before any anatomy was added
const PRE_MIGRATION_PACK_SHA256 = 'c66cc1b791ec39e58a8c1c7e1c78e51151e7a44c74faed4bc2af89ecffe184b5';

const ALL = { canHold: true, canWield: true, canManipulate: true };
const arm = (id) => ({ id, kind: 'arm', capabilities: { ...ALL } });
const tail = () => ({ id: 'tail-1', kind: 'prehensile-tail', capabilities: { canHold: true, canWield: false, canManipulate: null }, constraints: [{ ...HELD_ITEM_LOAD_FLOOR_V1 }] });
const expect = (appendages) => ({ schemaVersion: 1, topologyStatus: 'complete', appendages });

const MANIFEST = {
  'codru-ji-leg-2c-03': { species: 'Codru-Ji', id: 'species-codru-ji', profile: 'LEG-2C-03', anatomy: expect([1, 2, 3, 4].map((i) => arm(`arm-${i}`))) },
  'ryn-sv-2f-06': { species: 'Ryn', id: 'species-ryn', profile: 'SV-2F-06', anatomy: expect([arm('arm-1'), arm('arm-2'), tail()]) },
  'trianii-gaw-2i-06': { species: 'Trianii', id: 'species-trianii', profile: 'GAW-2I-06', anatomy: expect([arm('arm-1'), arm('arm-2'), tail()]) },
  'krevaaki-ur-2b-04': { species: 'Krevaaki', id: 'species-krevaaki', profile: 'UR-2B-04', anatomy: expect([1, 2].map((i) => ({ id: `dominant-tentacle-${i}`, kind: 'dominant-tentacle', capabilities: { ...ALL } }))) },
  'killik-ur-2b-12': { species: 'Killik', id: 'species-killik', profile: 'UR-2B-12', anatomy: expect([1, 2, 3, 4].map((i) => arm(`arm-${i}`))) },
  'dug-cw-2h-01': { species: 'Dug', id: 'species-dug', profile: 'CW-2H-01', anatomy: expect([1, 2].map((i) => ({ id: `lower-limb-${i}`, kind: 'lower-limb', capabilities: { canHold: true, canWield: null, canManipulate: true } }))) },
  'lugubraa-ur-2b-13': { species: 'Lugubraa', id: 'species-lugubraa', profile: 'UR-2B-13', anatomy: expect([1, 2].map((i) => ({ id: `forward-limb-${i}`, kind: 'grasping-tentacle', capabilities: { canHold: true, canWield: null, canManipulate: null } }))) }
};
const IDS = Object.keys(MANIFEST);

const packText = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8');
const recs = packText.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const find = (vid) => { for (const r of recs) for (const v of r.system.variants ?? []) if (v.id === vid) return { r, v }; return null; };
const baseOf = (r) => { const s = r.system; return { id: r._id, name: r.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] }; };

// 1 + 12 + 13 -- exactly the seven variants declare anatomy; no base record or other variant does
{
  const declared = [];
  for (const r of recs) {
    assert.ok(!declaresSpeciesAnatomy(r.system), `base ${r.name} declares no anatomy`);
    for (const v of r.system.variants ?? []) if (declaresSpeciesAnatomy(v)) declared.push(v.id);
  }
  assert.deepEqual(declared.sort(), [...IDS].sort());
  ok('exactly the seven authorized publication profiles declare anatomy; no base species and no other variant does');
}

// 2-3 -- identity, complete-snapshot status, schema validity
for (const vid of IDS) {
  const m = MANIFEST[vid]; const hit = find(vid);
  assert.ok(hit, `${vid} exists`);
  assert.equal(hit.r._id, m.id); assert.equal(hit.r.name, m.species);
  assert.equal(hit.v.sourceProfileId, m.profile); assert.equal(hit.v.completeSnapshot, true);
  const validated = validateSpeciesAnatomyV1(hit.v.anatomy);
  assert.deepEqual(JSON.parse(JSON.stringify(validated)), JSON.parse(JSON.stringify(hit.v.anatomy)), 'validation neither adds nor drops fields');
}
ok('each target keeps its record id, name, sourceProfileId and complete-snapshot status, and its anatomy validates under schema v1');

// 4-7 -- counts, ids, capabilities, constraints: the stored declaration equals the certified one exactly
for (const vid of IDS) {
  const a = find(vid).v.anatomy; const m = MANIFEST[vid].anatomy;
  assert.equal(a.appendages.length, m.appendages.length, `${vid} appendage count`);
  assert.equal(new Set(a.appendages.map((x) => x.id)).size, a.appendages.length, `${vid} ids distinct`);
  assert.deepEqual(a, m, `${vid} matches the certified declaration exactly`);
}
ok('appendage counts, stable distinct ids, kinds, capabilities and constraints match the certified cases exactly (key-for-key)');
for (const vid of ['ryn-sv-2f-06', 'trianii-gaw-2i-06']) {
  const t = find(vid).v.anatomy.appendages.find((x) => x.id === 'tail-1');
  assert.deepEqual(t.constraints, [{ type: 'held-item-load-floor', when: 'held-by-appendage', itemSizeAtLeast: 'Medium', loadCategoryFloor: 'heavy', imposesEncumbered: true }]);
  assert.deepEqual(t.capabilities, { canHold: true, canWield: false, canManipulate: null });
}
assert.notEqual(find('ryn-sv-2f-06').v.anatomy.appendages[2].constraints, find('trianii-gaw-2i-06').v.anatomy.appendages[2].constraints);
ok('Ryn and Trianii each store the exact typed holding constraint independently (no shared inheritance); holding is not prohibited');

// 8-11
{
  for (const vid of ['codru-ji-leg-2c-03', 'killik-ur-2b-12']) {
    const a = find(vid).v.anatomy;
    assert.equal(a.appendages.length, 4);
    assert.ok(a.appendages.every((x) => x.kind === 'arm'));
    assert.deepEqual(Object.keys(a).sort(), ['appendages', 'schemaVersion', 'topologyStatus'], 'no combat entitlements at anatomy level');
    assert.ok(a.appendages.every((x) => Object.keys(x).sort().join() === 'capabilities,id,kind'), 'no combat entitlements per appendage');
  }
  ok('Codru-Ji and Killik have four arm manipulators each, with no combat or attack entitlements inserted into anatomy');
  const k = find('krevaaki-ur-2b-04').v.anatomy;
  assert.deepEqual(k.appendages.map((x) => x.id), ['dominant-tentacle-1', 'dominant-tentacle-2']);
  ok('Krevaaki (UR-2B-04) has only its two dominant-tentacle equipment manipulators');
  assert.ok(find('dug-cw-2h-01').v.anatomy.appendages.every((x) => x.kind === 'lower-limb'));
  ok('Dug manipulators are identified as lower limbs');
  assert.ok(find('lugubraa-ur-2b-13').v.anatomy.appendages.every((x) => x.capabilities.canWield === null && x.capabilities.canManipulate === null && x.capabilities.canHold === true));
  ok('Lugubraa wielding and manipulation remain null (unknown)');
}

// 12-14, 20 -- everything else is byte-identical: removing the seven anatomy keys reproduces the pre-migration pack exactly
{
  const stripped = packText.split('\n').map((l) => {
    if (!l) return l; const d = JSON.parse(l); let ch = false;
    for (const v of d.system.variants ?? []) if (IDS.includes(v.id)) { delete v.anatomy; ch = true; }
    return ch ? JSON.stringify(d) : l;
  }).join('\n');
  assert.equal(createHash('sha256').update(stripped).digest('hex'), PRE_MIGRATION_PACK_SHA256, 'pack minus the seven anatomy keys equals the pre-migration pack');
  const jatm = find('krevaaki-jatm-2j-04').v;
  assert.equal(declaresSpeciesAnatomy(jatm), false);
  assert.equal(find('krevaaki-ur-2b-04').r.system.variants.length, find('krevaaki-jatm-2j-04').r.system.variants.length);
  ok('removing the seven anatomy keys reproduces the pre-migration pack byte-for-byte: traits, natural weapons, languages, abilities, identities and every other variant (incl. krevaaki-jatm-2j-04) are unchanged');
}

// 15-18 -- registry normalization, snapshot projection, isolation, immutability
{
  for (const vid of IDS) {
    const { r, v } = find(vid);
    const [norm] = SpeciesRegistry._normalizeVariants([JSON.parse(JSON.stringify(v))], r.name) ?? [];
    assert.ok(norm, `${vid} normalizes`);
    assert.deepEqual(JSON.parse(JSON.stringify(norm.anatomy)), MANIFEST[vid].anatomy, `${vid} registry-normalized anatomy`);
  }
  ok('registry normalization preserves each profile\'s exact anatomy');
  for (const vid of IDS) {
    const { r, v } = find(vid);
    const p = applySpeciesVariantProfile(baseOf(r), v);
    assert.deepEqual(JSON.parse(JSON.stringify(p.anatomy)), MANIFEST[vid].anatomy);
    assert.ok(Object.isFrozen(p.anatomy) && Object.isFrozen(p.anatomy.appendages[0]) && Object.isFrozen(p.anatomy.appendages[0].capabilities));
    assert.notEqual(p.anatomy, v.anatomy, 'independently owned copy');
    assert.throws(() => { 'use strict'; p.anatomy.appendages.push({}); }, TypeError);
  }
  ok('applySpeciesVariantProfile preserves the selected publication anatomy as an immutable, independently owned copy');
  const kr = find('krevaaki-ur-2b-04').r;
  for (const other of kr.system.variants.filter((x) => x.id !== 'krevaaki-ur-2b-04')) {
    const p = applySpeciesVariantProfile(baseOf(kr), other);
    assert.equal(p.anatomy, undefined, `${other.id} does not inherit another publication's anatomy`);
  }
  assert.equal(applySpeciesVariantProfile(baseOf(kr), find('krevaaki-jatm-2j-04').v).anatomy, undefined);
  ok('selecting an unrelated Krevaaki publication (incl. krevaaki-jatm-2j-04) inherits no anatomy');
}

// 19 -- the certification fails if a certified profile loses its anatomy
{
  const { v } = find('ryn-sv-2f-06');
  const without = { ...v }; delete without.anatomy;
  assert.equal(declaresSpeciesAnatomy(without), false);
  assert.throws(() => { for (const vid of IDS) { const x = vid === 'ryn-sv-2f-06' ? without : find(vid).v; assert.ok(declaresSpeciesAnatomy(x), `${vid} must declare anatomy`); } });
  ok('a certified profile with missing anatomy fails the certification check');
}

console.log(`species-anatomy-profile-certification: ${n} checks passed`);
