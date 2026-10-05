import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { items: [] } });

const REGISTRY_URL = pathToFileURL(path.join(ROOT, 'scripts/engine/archetype/archetype-registry.js')).href;
const jsonOf = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const SSOT = jsonOf('data/archetypes.json');

/** Fresh registry module instance per scenario (it holds static state). */
async function freshRegistry(tag, { ssot = 'ok' } = {}) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.endsWith('/data/class-archetypes.json')) return { ok: true, status: 200, json: async () => jsonOf('data/class-archetypes.json') };
    if (u.endsWith('/data/archetypes.json')) {
      if (ssot === 'ok') return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(SSOT)) };
      if (ssot === '404') return { ok: false, status: 404, json: async () => ({}) };
      if (ssot === 'throw') throw new Error('network down');
      if (ssot === 'invalid') return { ok: true, status: 200, json: async () => ({ _meta: { schemaVersion: 2 }, archetypes: { x: { id: 'x' } } }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const { ArchetypeRegistry } = await import(`${REGISTRY_URL}?case=${tag}`);
  await ArchetypeRegistry.initialize();
  return ArchetypeRegistry;
}

const legacySnapshot = (R) => JSON.stringify({
  all: R.getAll(),
  byJedi: R.getByClass('jedi'),
  count: R.getStats().count,
  classes: R.getStats().classes
});

test('SSOT lane: loads 297 class-independent records, parents and specializations', async () => {
  const R = await freshRegistry('load');
  assert.equal(R.isSSOTLoaded(), true);
  assert.equal(R.getAllArchetypes().length, 297);
  assert.equal(R.getParents().length, 97);
  assert.equal(R.getSpecializations().length, 200);
  assert.equal(R.getSSOTMeta().recordCount, 297);
  assert.equal(R.getStats().ssot.count, 297);
});

test('SSOT lane: lookup by stable id is class-independent and frozen', async () => {
  const R = await freshRegistry('lookup');
  const shadow = R.getArchetype('jedi_shadow');
  assert.equal(shadow.name, 'Jedi Shadow');
  assert.ok(!('baseClassId' in shadow));
  assert.ok(Object.isFrozen(shadow) && Object.isFrozen(shadow.mechanics.classes));
  assert.equal(R.getArchetype('does_not_exist'), null);
  assert.deepEqual(shadow.mechanics.classes.foundation, ['jedi', 'scout']); // multi-class route, one identity
});

test('SSOT lane: parent/child relationships are organizational and consistent', async () => {
  const R = await freshRegistry('tree');
  assert.equal(R.getParent('jedi_shadow').id, 'jedi_sentinel');
  assert.equal(R.getParent('jedi_sentinel'), null);
  assert.ok(R.getChildren('jedi_sentinel').some((c) => c.id === 'jedi_shadow'));
  const kids = R.getParents().flatMap((p) => R.getChildren(p.id));
  assert.equal(kids.length, 200);
  assert.equal(new Set(kids.map((k) => k.id)).size, 200);
});

test('SSOT lane: route filtering by foundation/prestige/apex class', async () => {
  const R = await freshRegistry('route');
  const viaJedi = R.getByClassRoute('jedi', 'foundation').map((r) => r.id);
  assert.ok(viaJedi.includes('jedi_shadow'));
  assert.ok(R.getByClassRoute('scout', 'foundation').some((r) => r.id === 'jedi_shadow'));
  assert.ok(R.getByClassRoute('jedi_master', 'apex').some((r) => r.id === 'jedi_shadow'));
  assert.ok(!R.getByClassRoute('jedi', 'apex').some((r) => r.id === 'jedi_shadow'));
  assert.deepEqual(R.getByClassRoute(''), []);
  assert.ok(R.getByClassRoute('jedi').length >= viaJedi.length);
});

test('SSOT lane: output is deterministic across fresh loads', async () => {
  const A = await freshRegistry('det-a');
  const B = await freshRegistry('det-b');
  assert.equal(JSON.stringify(A.getAllArchetypes()), JSON.stringify(B.getAllArchetypes()));
  assert.deepEqual(A.getExactRefs('jedi_shadow'), B.getExactRefs('jedi_shadow'));
});

test('exact refs: getExactRefs mirrors typed data; resolveExactRefs is exact and reports unchecked domains', async () => {
  const R = await freshRegistry('refs');
  const refs = R.getExactRefs('jedi_shadow');
  assert.ok(refs.skills.includes('stealth'));
  assert.ok(refs.forcePowers.includes('pass-the-blade'));
  const out = await R.resolveExactRefs('jedi_shadow', {
    forcePowers: (id) => id === 'pass-the-blade',
    skills: (id) => id === 'stealth'
  });
  assert.equal(out.forcePowers.checked, true);
  assert.deepEqual(out.forcePowers.resolved, ['pass-the-blade']);
  assert.ok(out.forcePowers.unresolved.length > 0);
  assert.equal(out.feats.checked, false);       // no adapter -> never silently "resolved"
  assert.deepEqual(out.feats.resolved, []);
  assert.equal(await R.resolveExactRefs('nope', {}), null);
});

test('compat: legacy lane is byte-identical with and without the SSOT lane', async () => {
  const withSSOT = await freshRegistry('legacy-on');
  const without = await freshRegistry('legacy-off', { ssot: '404' });
  assert.equal(legacySnapshot(withSSOT), legacySnapshot(without));
  assert.equal(withSSOT.getAll().length, without.getAll().length);
  assert.ok(withSSOT.getAll().length > 0);
  // SSOT ids never leak into the legacy lane that live consumers iterate.
  assert.equal(withSSOT.get('jedi_shadow'), null);
  assert.ok(!withSSOT.getAll().some((a) => a.id === 'jedi_shadow'));
});

test('compat: getCompatibilityView carries typed/exact data only and fabricates no biases', async () => {
  const R = await freshRegistry('compat');
  const v = R.getCompatibilityView('jedi_shadow');
  assert.equal(v.ssot, true);
  assert.equal(v.baseClassId, null);
  assert.deepEqual(v.routeClassIds, ['jedi', 'scout']);
  assert.deepEqual(v.prestigeTargets, ['jedi_knight', 'infiltrator', 'jedi_master']);
  assert.deepEqual(v.attributePriority.slice(0, 2), ['dex', 'cha']);
  for (const bias of ['mechanicalBias', 'roleBias', 'attributeBias', 'tagBias']) assert.deepEqual(v[bias], {});
  assert.equal(R.getCompatibilityView('nope'), null);
});

test('graceful failure: unreachable, 404 or invalid SSOT disables only the SSOT lane', async () => {
  const baseline = legacySnapshot(await freshRegistry('gf-base', { ssot: '404' }));
  for (const mode of ['404', 'throw', 'invalid']) {
    const R = await freshRegistry(`gf-${mode}`, { ssot: mode });
    assert.equal(R.isInitialized(), true, mode);
    assert.equal(R.isSSOTLoaded(), false, mode);
    assert.deepEqual(R.getAllArchetypes(), [], mode);
    assert.equal(R.getArchetype('jedi_shadow'), null, mode);
    assert.equal(legacySnapshot(R), baseline, mode);
  }
});

// ── Safety: Phase 12A must not change live scoring ─────────────────────────
const walk = (dir, out = []) => {
  for (const ent of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${ent.name}`;
    if (ent.isDirectory()) walk(rel, out);
    else if (/\.m?js$/.test(ent.name)) out.push(rel);
  }
  return out;
};

test('safety: no scoring/suggestion/mentor/identity code consumes the SSOT lane yet', () => {
  const allowed = new Set([
    'scripts/engine/archetype/archetype-registry.js',
    'scripts/engine/archetype/archetype-ssot-contract.js'
  ]);
  const ssotApi = /data\/archetypes\.json|archetype-ssot-contract|\.(getArchetype|getAllArchetypes|getByClassRoute|getCompatibilityView|resolveExactRefs|getExactRefs|isSSOTLoaded)\(/;
  const offenders = walk('scripts').filter((f) => !allowed.has(f) && ssotApi.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.deepEqual(offenders, []);
});

test('safety: SuggestionScorer still scores from the legacy bias model and has no numeric SSOT weights', () => {
  const scorer = fs.readFileSync(path.join(ROOT, 'scripts/engine/suggestion/SuggestionScorer.js'), 'utf8');
  assert.match(scorer, /mechanicalBias|tagBias|roleBias|attributeBias/);
  assert.doesNotMatch(scorer, /archetypes\.json|getArchetype\(|getAllArchetypes\(/);
});
