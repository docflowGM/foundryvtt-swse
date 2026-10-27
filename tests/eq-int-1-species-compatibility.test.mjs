/**
 * EQ-INT-1 — species compatibility characterization for integrating the equipment foundation (through c63d798).
 *
 * The foundation adds optional canonical `anatomy` to seven species variants in packs/species.db and teaches
 * SpeciesRegistry / applySpeciesVariantProfile to carry (and validate) it. This test pins everything ELSE about
 * species behaviour to the pre-integration baseline captured from `main` @ 48d1da1 (fixture below), so the
 * integration can only ever ADD anatomy at the approved locations:
 *
 *   A. Pack records: same 161 ids, same order; every record is byte-identical to the baseline once anatomy is removed.
 *   B. Registry normalization (SpeciesRegistry._normalizeEntry) of every record: identical to baseline without anatomy.
 *   C. Variant collapse (SpeciesRegistry._dedupeAndCollapseVariants): identical visible species and variant ids.
 *   D. Every resolved variant profile (applySpeciesVariantProfile): identical to baseline without anatomy; nothing throws.
 *   E. Existing actors: the variant object chargen persists (system/flags.speciesVariant) is identical to baseline
 *      without anatomy, and actorUsesResolvedSnapshot gives the same answer for every baseline-persisted variant.
 *   F. Anatomy appears ONLY at the seven approved (species, variant) locations — never on a base entry or any other variant.
 *
 * Real production code under test; no mocks beyond the shared Foundry shim. Level: offline (not FOUNDRY_TESTED).
 * Regenerate the baseline only deliberately:  node tests/eq-int-1-species-compatibility.test.mjs --write-baseline
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();

const ROOT = new URL('..', import.meta.url);
const FIXTURE = new URL('./fixtures/eq-int-1-species-baseline.json', import.meta.url);

const { applySpeciesVariantProfile, actorUsesResolvedSnapshot } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const level of ['log', 'info', 'warn', 'debug']) if (SWSELogger?.[level]) SWSELogger[level] = () => {};

/** The only (species id, variant id) pairs the equipment foundation may give anatomy (E2B-I2 checkpoint §1). */
export const APPROVED_ANATOMY = Object.freeze([
  'species-codru-ji:codru-ji-leg-2c-03',
  'species-dug:dug-cw-2h-01',
  'species-killik:killik-ur-2b-12',
  'species-krevaaki:krevaaki-ur-2b-04',
  'species-lugubraa:lugubraa-ur-2b-13',
  'species-ryn:ryn-sv-2f-06',
  'species-trianii:trianii-gaw-2i-06',
]);

const stable = (v) => {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
const sha = (v) => createHash('sha256').update(typeof v === 'string' ? v : stable(v)).digest('hex');
/** Deep copy with every `anatomy` key removed (the one field the integration is allowed to add). */
const withoutAnatomy = (v) => {
  if (Array.isArray(v)) return v.map(withoutAnatomy);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'anatomy').map(([k, x]) => [k, withoutAnatomy(x)]));
  return v;
};
const rawWithoutAnatomy = (rec) => {
  const c = JSON.parse(JSON.stringify(rec));
  if (c.system) delete c.system.anatomy;
  for (const v of c.system?.variants ?? []) delete v.anatomy;
  return JSON.stringify(c);
};

const lines = readFileSync(new URL('packs/species.db', ROOT), 'utf8').split('\n').filter(Boolean);
const records = lines.map((l) => JSON.parse(l));
const asDoc = (r) => ({ ...r, id: r._id, uuid: `Compendium.foundryvtt-swse.species.${r._id}`, pack: 'foundryvtt-swse.species' });

function observe() {
  const out = { ids: records.map((r) => r._id), pack: {}, normalized: {}, collapsed: null, profiles: {}, persisted: {}, snapshotFlag: {} };
  const entries = [];
  for (const r of records) {
    out.pack[r._id] = sha(rawWithoutAnatomy(r));
    const entry = SpeciesRegistry._normalizeEntry(asDoc(r));
    entries.push(entry);
    out.normalized[r._id] = sha(withoutAnatomy(entry));
    for (const variant of entry.variants ?? []) {
      const key = `${r._id}:${variant.id}`;
      let profile;
      try { profile = sha(withoutAnatomy(applySpeciesVariantProfile(entry, variant))); } catch (e) { profile = `THROWS:${e?.name}:${e?.message}`; }
      out.profiles[key] = profile;
      // what chargen persists on the actor (apply-canonical-species-to-actor: flags/system.speciesVariant = selected variant)
      out.persisted[key] = sha(withoutAnatomy(variant));
      out.snapshotFlag[key] = actorUsesResolvedSnapshot({ system: { speciesVariant: variant } });
    }
  }
  const collapsed = SpeciesRegistry._dedupeAndCollapseVariants(entries);
  out.collapsed = sha(collapsed.map((e) => withoutAnatomy({ id: e.id, name: e.name, variants: (e.variants ?? []).map((v) => v.id) })));
  return { out, entries };
}

const { out: now, entries } = observe();

if (process.argv.includes('--write-baseline')) {
  writeFileSync(FIXTURE, `${JSON.stringify({ capturedFrom: process.env.EQ_INT_1_BASELINE_REF ?? 'unknown', ...now }, null, 2)}\n`);
  console.log(`wrote ${FIXTURE.pathname}`);
  process.exit(0);
}

const base = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
}
const sameMap = (label, a, b) => {
  const diff = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
  assert.deepEqual(diff, [], `${label} differs from the baseline for: ${diff.slice(0, 8).join(', ')}`);
};

check('A. pack: same 161 record ids in the same order; every record identical to the baseline once anatomy is removed', () => {
  assert.equal(now.ids.length, 161);
  assert.deepEqual(now.ids, base.ids);
  sameMap('pack record', now.pack, base.pack);
});
check('B. SpeciesRegistry._normalizeEntry: every normalized species identical to the baseline (anatomy aside)', () => sameMap('normalized entry', now.normalized, base.normalized));
check('C. variant collapse: identical visible species and variant ids', () => assert.equal(now.collapsed, base.collapsed));
check('D. applySpeciesVariantProfile: every resolved variant profile identical to the baseline (anatomy aside); none throws', () => {
  sameMap('resolved profile', now.profiles, base.profiles);
  assert.deepEqual(Object.entries(now.profiles).filter(([, v]) => v.startsWith('THROWS')), []);
});
check('E. existing actors: persisted speciesVariant identical (anatomy aside); actorUsesResolvedSnapshot unchanged for every baseline variant', () => {
  sameMap('persisted speciesVariant', now.persisted, base.persisted);
  assert.deepEqual(now.snapshotFlag, base.snapshotFlag);
});
check('F. anatomy appears only at the seven approved (species, variant) locations — never on a base entry or another variant', () => {
  const found = [];
  for (const r of records) {
    if (r.system && 'anatomy' in r.system) found.push(`${r._id}:<base>`);
    for (const v of r.system?.variants ?? []) if ('anatomy' in v) found.push(`${r._id}:${v.id}`);
  }
  for (const e of entries) {
    if ('anatomy' in e) found.push(`${e.id}:<normalized base>`);
    for (const v of e.variants ?? []) if ('anatomy' in v && !found.includes(`${e.id}:${v.id}`)) found.push(`${e.id}:${v.id}:<normalized only>`);
  }
  const unexpected = found.filter((k) => !APPROVED_ANATOMY.includes(k));
  assert.deepEqual(unexpected, [], `anatomy outside the approved locations: ${unexpected.join(', ')}`);
});

// ---- Post-integration checks (added with the merge of c63d798; they describe the integrated state) ----
const { readOptionalSpeciesAnatomy, SpeciesAnatomySchemaError } = await import('/systems/foundryvtt-swse/scripts/species/species-anatomy-schema-v1.js');
const { readdirSync, statSync } = await import('node:fs');

check('G. exactly the seven approved variants carry anatomy, and every shipped declaration validates (no malformed-anatomy exception)', () => {
  const present = [];
  for (const r of records) for (const v of r.system?.variants ?? []) if ('anatomy' in v) present.push(`${r._id}:${v.id}`);
  assert.deepEqual(present.sort(), [...APPROVED_ANATOMY].sort());
  for (const r of records) {
    assert.doesNotThrow(() => readOptionalSpeciesAnatomy(r.system ?? {}, `${r._id}.anatomy`));
    for (const v of r.system?.variants ?? []) {
      const parsed = readOptionalSpeciesAnatomy(v, `${r._id}:${v.id}.anatomy`);
      assert.equal(parsed !== null && parsed !== undefined, APPROVED_ANATOMY.includes(`${r._id}:${v.id}`));
    }
  }
  // the validator still rejects a malformed declaration (the registry relies on that to fail closed)
  assert.throws(() => readOptionalSpeciesAnatomy({ anatomy: { schemaVersion: 2 } }, 't'), SpeciesAnatomySchemaError);
});

check('H. registry and profile carry the shipped anatomy only for the approved variants; chargen would persist it there and nowhere else', () => {
  for (const e of entries) {
    for (const v of e.variants ?? []) {
      const key = `${e.id}:${v.id}`;
      const profile = applySpeciesVariantProfile(e, v);
      assert.equal('anatomy' in v, APPROVED_ANATOMY.includes(key), `normalized variant ${key}`);
      assert.equal('anatomy' in profile, APPROVED_ANATOMY.includes(key), `resolved profile ${key}`);
    }
  }
});

check('I. no unauthorized runtime consumer: the seven new equipment modules are imported by nothing outside scripts/engine/equipment/, and only the species registry and variant profile use the anatomy schema', () => {
  const NEW = ['anatomy-resolver', 'droid-appendage-projection', 'effective-equipment-posture', 'equipment-capability-resolver', 'equipment-grip-resolver', 'equipment-posture', 'species-equipment-permissions'];
  const SCHEMA_USERS = new Set(['scripts/engine/registries/species-registry.js', 'scripts/species/species-variant-profile.js', 'scripts/engine/equipment/anatomy-resolver.js']);
  const files = [];
  const walk = (rel) => { for (const n of readdirSync(new URL(rel, ROOT))) { const p = `${rel}/${n}`; if (statSync(new URL(p, ROOT)).isDirectory()) walk(p); else if (/\.(m?js)$/.test(n)) files.push(p); } };
  walk('scripts'); files.push('index.js');
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(new URL(f, ROOT), 'utf8');
    if (!f.startsWith('scripts/engine/equipment/')) for (const m of NEW) if (src.includes(`engine/equipment/${m}.js`)) offenders.push(`${f} -> ${m}`);
    if (src.includes('species-anatomy-schema-v1.js') && !SCHEMA_USERS.has(f) && f !== 'scripts/species/species-anatomy-schema-v1.js') offenders.push(`${f} -> species-anatomy-schema-v1`);
  }
  assert.deepEqual(offenders, []);
});

const failed = results.filter((r) => !r.ok);
console.log(`\nEQ-INT-1 species compatibility (baseline ${base.capturedFrom}): ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
