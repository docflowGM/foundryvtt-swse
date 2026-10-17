import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2B-I1 -- species anatomy schema v1 foundation. Synthetic fixtures only; the pack is read only to prove that exactly the seven E2B-I2 authorized variants declare anatomy. It exercises the real validator, the real SpeciesRegistry
// normalizers and the real publication-snapshot projection.
registerFoundryPathLoader();
installFoundryShimGlobals();

const schema = await import('/systems/foundryvtt-swse/scripts/species/species-anatomy-schema-v1.js');
const { validateSpeciesAnatomyV1, readOptionalSpeciesAnatomy, declaresSpeciesAnatomy, SpeciesAnatomySchemaError, SPECIES_ANATOMY_ERROR_CODES, HELD_ITEM_LOAD_FLOOR_V1 } = schema;
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile, listMissingSnapshotFields } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };
const throwsCode = (fn, code, msg) => assert.throws(fn, (e) => e instanceof SpeciesAnatomySchemaError && e.code === code, msg ?? code);

const ALL = { canHold: true, canWield: true, canManipulate: true };
const arm = (id, over = {}) => ({ id, kind: 'arm', capabilities: { ...ALL }, ...over });
const anatomy = (over = {}) => ({ schemaVersion: 1, topologyStatus: 'complete', appendages: [arm('natural-arm-1'), arm('natural-arm-2')], ...over });
const TAIL_CONSTRAINT = { ...HELD_ITEM_LOAD_FLOOR_V1 };
const tail = () => ({ id: 'tail-1', kind: 'prehensile-tail', capabilities: { canHold: true, canWield: false, canManipulate: null }, constraints: [{ ...TAIL_CONSTRAINT }] });

// ---------------------------------------------------------------------------------------------------------------- schema validation
{
  const two = validateSpeciesAnatomyV1(anatomy());
  assert.equal(two.appendages.length, 2);
  assert.deepEqual(two.appendages[0].capabilities, ALL);
  const four = validateSpeciesAnatomyV1(anatomy({ appendages: ['a', 'b', 'c', 'd'].map((x) => arm(x)) }));
  assert.deepEqual(four.appendages.map((a) => a.id), ['a', 'b', 'c', 'd']);
  const none = validateSpeciesAnatomyV1(anatomy({ appendages: [] }));
  assert.equal(none.topologyStatus, 'complete');
  assert.deepEqual(none.appendages, [], 'an explicitly verified empty set is valid and distinct from absent anatomy');
  const unknown = validateSpeciesAnatomyV1(anatomy({ appendages: [{ id: 'g', kind: 'grasping-tentacle', capabilities: { canHold: true, canWield: null, canManipulate: null } }] }));
  assert.deepEqual(unknown.appendages[0].capabilities, { canHold: true, canWield: null, canManipulate: null }, 'unknown stays null');
  const withTail = validateSpeciesAnatomyV1(anatomy({ appendages: [arm('arm-1'), arm('arm-2'), tail()] }));
  assert.deepEqual(withTail.appendages[2].constraints, [TAIL_CONSTRAINT]);
  assert.equal(withTail.appendages[2].capabilities.canWield, false);
  const partial = validateSpeciesAnatomyV1(anatomy({ topologyStatus: 'partial', appendages: [arm('arm-1')] }));
  assert.equal(partial.topologyStatus, 'partial');
  const unresolved = validateSpeciesAnatomyV1({ schemaVersion: 1, topologyStatus: 'unresolved', appendages: [] });
  assert.deepEqual(unresolved.appendages, []);
  ok('valid declarations: two-arm, four-arm, zero-manipulator, unknown capabilities, restricted tail, partial and unresolved topology');
}

{
  const bad = (raw, code, msg) => throwsCode(() => validateSpeciesAnatomyV1(raw), code, msg ?? JSON.stringify(raw).slice(0, 80));
  bad(anatomy({ schemaVersion: 2 }), 'INVALID_SCHEMA_VERSION');
  bad(anatomy({ schemaVersion: '1' }), 'INVALID_SCHEMA_VERSION');
  const noVersion = anatomy(); delete noVersion.schemaVersion; bad(noVersion, 'INVALID_SCHEMA_VERSION');
  bad(anatomy({ topologyStatus: 'finished' }), 'INVALID_TOPOLOGY_STATUS');
  bad(anatomy({ appendages: {} }), 'INVALID_APPENDAGES');
  bad(anatomy({ appendages: 'two arms' }), 'INVALID_APPENDAGES');
  bad(anatomy({ appendages: [arm('x'), arm('x')] }), 'DUPLICATE_APPENDAGE_ID');
  bad(anatomy({ appendages: [{ kind: 'arm', capabilities: { ...ALL } }] }), 'INVALID_APPENDAGE_ID');
  bad(anatomy({ appendages: [arm('  ')] }), 'INVALID_APPENDAGE_ID');
  bad(anatomy({ appendages: [{ id: 'a', capabilities: { ...ALL } }] }), 'INVALID_APPENDAGE_KIND');
  bad(anatomy({ appendages: [null] }), 'INVALID_APPENDAGE');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm' }] }), 'INVALID_CAPABILITIES');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: 'all' }] }), 'INVALID_CAPABILITIES');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: true, canWield: true } }] }), 'MISSING_CAPABILITY', 'a missing capability is not defaulted to anything');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: true, canWield: true, canManipulate: undefined } }] }), 'MISSING_CAPABILITY');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: 'yes', canWield: true, canManipulate: true } }] }), 'INVALID_CAPABILITY');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: { canHold: 1, canWield: true, canManipulate: true } }] }), 'INVALID_CAPABILITY');
  bad(anatomy({ appendages: [{ id: 'a', kind: 'arm', capabilities: { ...ALL, canFly: true } }] }), 'UNKNOWN_FIELD');
  bad(anatomy({ topologyStatus: 'partial', appendages: [] }), 'PARTIAL_TOPOLOGY_REQUIRES_APPENDAGE');
  bad(anatomy({ topologyStatus: 'unresolved', appendages: [arm('a')] }), 'UNRESOLVED_TOPOLOGY_HAS_APPENDAGES');
  for (const raw of [null, 'anatomy', 7, true, [], [anatomy()]]) bad(raw, 'INVALID_ANATOMY_TYPE', `non-object ${JSON.stringify(raw)}`);
  assert.ok(SPECIES_ANATOMY_ERROR_CODES.length >= 18);
  ok('malformed declarations: version, topology, appendages, ids, kinds, capabilities (missing / non-boolean / extra), partial and unresolved rules, non-objects');
}

{
  const withC = (c) => anatomy({ appendages: [{ ...tail(), constraints: c }] });
  const bad = (c, code) => throwsCode(() => validateSpeciesAnatomyV1(withC(c)), code, `${code} ${JSON.stringify(c).slice(0, 70)}`);
  bad('x', 'INVALID_CONSTRAINTS');
  bad([null], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, type: 'weight-limit' }], 'UNSUPPORTED_CONSTRAINT_TYPE');
  bad([{ ...TAIL_CONSTRAINT, type: undefined }], 'UNSUPPORTED_CONSTRAINT_TYPE');
  const noWhen = { ...TAIL_CONSTRAINT }; delete noWhen.when; bad([noWhen], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, when: 'always' }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, itemSizeAtLeast: 'Large' }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, itemSizeAtLeast: 'medium' }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, loadCategoryFloor: 'light' }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, imposesEncumbered: false }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, imposesEncumbered: 'true' }], 'INVALID_CONSTRAINT');
  bad([{ ...TAIL_CONSTRAINT, description: 'Medium or larger items make a Ryn encumbered' }], 'UNKNOWN_FIELD');
  bad([{ ...TAIL_CONSTRAINT, maxWeight: 10 }], 'UNKNOWN_FIELD');
  assert.equal(validateSpeciesAnatomyV1(withC([])).appendages[0].constraints.length, 0, 'an empty constraint list is valid');
  ok('typed holding restriction: only the approved held-item-load-floor values; unsupported types, missing / wrong / prose fields rejected');
}

{
  const forbidden = ['functionalState', 'disabled', 'missing', 'damaged', 'injury', 'occupied', 'assignedItem', 'ready', 'attackCount', 'extraAttacks', 'attackBonus', 'combat', 'modifiers', 'multipleAttackPenalty'];
  for (const key of forbidden) {
    throwsCode(() => validateSpeciesAnatomyV1(anatomy({ appendages: [arm('a', { [key]: key === 'functionalState' ? 'disabled' : true })] })), 'FORBIDDEN_FIELD', `appendage.${key}`);
    throwsCode(() => validateSpeciesAnatomyV1({ ...anatomy(), [key]: true }), 'FORBIDDEN_FIELD', `anatomy.${key}`);
  }
  throwsCode(() => validateSpeciesAnatomyV1(anatomy({ notes: 'x' })), 'UNKNOWN_FIELD');
  ok('per-actor functional / damage state, occupancy, readiness, attack entitlements and combat modifiers are rejected from canonical anatomy');
}

{
  const raw = deepFreeze(anatomy({ appendages: [arm('a'), tail()] }));
  const json = JSON.stringify(raw);
  const a = validateSpeciesAnatomyV1(raw);
  const b = validateSpeciesAnatomyV1(raw);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(raw), json, 'input untouched');
  const owned = new Set(collect(raw));
  for (const o of collect(a)) assert.ok(!owned.has(o), 'no shared references with the input');
  assert.ok(collect(a).every((o) => Object.isFrozen(o)), 'the copy is deeply frozen');
  const live = anatomy({ appendages: [arm('a')] });
  const c = validateSpeciesAnatomyV1(live);
  live.appendages[0].capabilities.canHold = false; live.appendages.push(arm('late'));
  assert.equal(c.appendages[0].capabilities.canHold, true);
  assert.equal(c.appendages.length, 1);
  for (const o of collect(live)) assert.equal(Object.isFrozen(o), false, 'caller-owned objects are never frozen');
  ok('deterministic, independent, deeply frozen copies; caller data unchanged, unfrozen and unshared');
}

{
  assert.equal(declaresSpeciesAnatomy({}), false);
  assert.equal(declaresSpeciesAnatomy({ anatomy: undefined }), false);
  assert.equal(declaresSpeciesAnatomy({ anatomy: null }), true);
  assert.equal(readOptionalSpeciesAnatomy({ name: 'x' }), undefined, 'absent anatomy is valid');
  assert.equal(readOptionalSpeciesAnatomy(undefined), undefined);
  throwsCode(() => readOptionalSpeciesAnatomy({ anatomy: null }), 'INVALID_ANATOMY_TYPE', 'null masquerading as a declaration is malformed');
  throwsCode(() => readOptionalSpeciesAnatomy({ anatomy: {} }), 'INVALID_SCHEMA_VERSION');
  assert.equal(readOptionalSpeciesAnatomy({ anatomy: anatomy() }).topologyStatus, 'complete');
  const inherited = Object.create({ anatomy: anatomy() });
  assert.equal(readOptionalSpeciesAnatomy(inherited), undefined, 'only an own property counts, never a prototype');
  ok('absent anatomy is valid; null / empty / malformed supplied values are declarations and fail');
}

// ------------------------------------------------------------------------------------------------------- registry + publication pipeline
const snapshotVariant = (over = {}) => ({
  id: 'x-b', label: 'Book B', source: 'Book B', completeSnapshot: true, sourceProfileId: 'B-1', size: 'Medium', speed: 6, movement: { walk: 6 },
  abilities: '+2 Dex', abilityMods: { str: 0, dex: 2, con: 0, int: 0, wis: 0, cha: 0 }, abilityChoice: null, skillBonuses: [], special: [],
  languages: ['Basic'], naturalWeapons: [], traits: [], description: 'b', ...over,
});
const baseProfile = (over = {}) => ({
  id: 'species-x', uuid: null, name: 'X', type: 'species', category: 'humanoid', tags: ['t'], pack: 'p', canonicalName: 'X', source: 'Book A',
  size: 'Medium', speed: 6, movement: { walk: 6 }, abilityScores: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, abilityChoice: null,
  rawAbilities: '', skillBonuses: [], abilities: [], canonicalTraits: [], naturalWeapons: [], primitive: false, suppressedClassProficiencies: [],
  noConstitution: false, retainsConstitution: false, languages: ['Basic'], supplementaryTraits: null, description: 'base', variants: [], ...over,
});

{
  const decl = anatomy({ appendages: ['a', 'b', 'c', 'd'].map((x) => arm(x)) });
  const [v] = SpeciesRegistry._normalizeVariants([snapshotVariant({ anatomy: decl })]);
  assert.deepEqual(v.anatomy, decl);
  assert.notEqual(v.anatomy, decl, 'the registry keeps its own copy');
  assert.ok(Object.isFrozen(v.anatomy), 'immutable, so exposure cannot corrupt registry state');
  const [plain] = SpeciesRegistry._normalizeVariants([snapshotVariant()]);
  assert.equal('anatomy' in plain, false, 'no anatomy is manufactured for ordinary variants');
  const [legacy] = SpeciesRegistry._normalizeVariants([{ id: 'l', label: 'L', anatomy: anatomy() }]);
  assert.equal(legacy.anatomy.topologyStatus, 'complete', 'a legacy variant keeps anatomy it declares itself');
  throwsCode(() => SpeciesRegistry._normalizeVariants([snapshotVariant({ anatomy: { schemaVersion: 1 } })]), 'INVALID_TOPOLOGY_STATUS');
  throwsCode(() => SpeciesRegistry._normalizeVariants([snapshotVariant({ anatomy: null })]), 'INVALID_ANATOMY_TYPE');
  // existing identity / trait / grant fields unchanged
  const [again] = SpeciesRegistry._normalizeVariants([snapshotVariant({ anatomy: decl, traits: [{ id: 't1', name: 'T1', description: 'd' }], naturalWeapons: [{ name: 'Bite' }] })]);
  assert.equal(again.id, 'x-b'); assert.equal(again.sourceProfileId, 'B-1'); assert.deepEqual(again.traits.map((t) => t.id), ['t1']); assert.deepEqual(again.naturalWeapons, [{ name: 'Bite' }]);
  ok('SpeciesRegistry._normalizeVariants preserves validated variant anatomy (frozen copy), manufactures none, rejects malformed declarations, leaves other fields unchanged');
}

{
  const doc = (system) => ({ name: 'Anatomy Test', _id: 'species-anatomy-test', id: 'species-anatomy-test', pack: 'foundryvtt-swse.species', system: { size: 'Medium', speed: 6, abilities: '', languages: [], ...system } });
  const decl = anatomy({ appendages: [arm('arm-1'), arm('arm-2'), tail()] });
  const withA = SpeciesRegistry._normalizeEntry(doc({ anatomy: decl }));
  assert.deepEqual(withA.anatomy, decl);
  assert.ok(Object.isFrozen(withA.anatomy) && withA.anatomy !== decl);
  const without = SpeciesRegistry._normalizeEntry(doc({}));
  assert.equal('anatomy' in without, false, 'ordinary species records are unchanged');
  throwsCode(() => SpeciesRegistry._normalizeEntry(doc({ anatomy: { schemaVersion: 1, topologyStatus: 'complete' } })), 'INVALID_APPENDAGES');
  const both = SpeciesRegistry._normalizeEntry(doc({ anatomy: decl, variants: [snapshotVariant({ anatomy: anatomy({ appendages: [arm('only')] }) })] }));
  assert.equal(both.anatomy.appendages.length, 3);
  assert.equal(both.variants[0].anatomy.appendages.length, 1, 'base and variant anatomy are kept separately');
  // the registry's collapse helper carries a converted entry's own anatomy and nothing from the base
  const conv = SpeciesRegistry._variantFromEntry({ name: 'Anatomy Test (Alt)', anatomy: anatomy({ appendages: [arm('alt')] }) }, 'Alt');
  assert.equal(conv.anatomy.appendages[0].id, 'alt');
  assert.equal('anatomy' in SpeciesRegistry._variantFromEntry({ name: 'No Anatomy' }, 'N'), false);
  ok('SpeciesRegistry._normalizeEntry preserves base anatomy, keeps variant anatomy separate, manufactures none and rejects malformed declarations; the variant-conversion helper keeps only its own anatomy');
}

{
  const decl = anatomy({ appendages: ['a', 'b', 'c', 'd'].map((x) => arm(x)) });
  const baseDecl = anatomy({ appendages: [arm('base-1')] });
  const base = deepFreeze(baseProfile({ anatomy: baseDecl }));
  // 1. valid anatomy on a complete snapshot reaches the effective profile
  const eff = applySpeciesVariantProfile(base, snapshotVariant({ anatomy: decl }));
  assert.deepEqual(eff.anatomy, decl);
  assert.ok(Object.isFrozen(eff.anatomy));
  // 2./3. no anatomy on the snapshot -> none, never the base's
  const plain = applySpeciesVariantProfile(base, snapshotVariant());
  assert.equal('anatomy' in plain, false);
  assert.equal(plain.anatomy, undefined);
  assert.deepEqual(listMissingSnapshotFields(snapshotVariant()), [], 'anatomy stays globally optional');
  // 4. base and variant both declare -> the variant alone
  assert.deepEqual(eff.anatomy.appendages.map((x) => x.id), ['a', 'b', 'c', 'd']);
  // different publication variants of one species retain different anatomy
  const other = applySpeciesVariantProfile(base, snapshotVariant({ id: 'x-c', sourceProfileId: 'C-1', anatomy: anatomy({ appendages: [arm('c-1'), arm('c-2')] }) }));
  assert.deepEqual(other.anatomy.appendages.map((x) => x.id), ['c-1', 'c-2']);
  assert.deepEqual(eff.anatomy.appendages.map((x) => x.id), ['a', 'b', 'c', 'd']);
  // 5. legacy overlay without its own anatomy does not inherit the base's (the historical ...base spread no longer leaks it)
  const legacy = applySpeciesVariantProfile(base, { id: 'legacy', label: 'L', abilityMods: { dex: 2 }, special: [], traits: [], languages: [] });
  assert.equal(legacy.anatomy, undefined);
  assert.equal('anatomy' in legacy, false);
  // 6. an explicitly declared legacy anatomy is preserved from that variant alone
  const legacyOwn = applySpeciesVariantProfile(base, { id: 'legacy2', label: 'L2', abilityMods: { dex: 2 }, special: [], traits: [], languages: [], anatomy: anatomy({ appendages: [arm('own')] }) });
  assert.deepEqual(legacyOwn.anatomy.appendages.map((x) => x.id), ['own']);
  // no variant at all -> the base species' own anatomy (a base selection, not an inheritance)
  assert.deepEqual(applySpeciesVariantProfile(base, null).anatomy.appendages.map((x) => x.id), ['base-1']);
  // 7. malformed declared anatomy fails instead of being ignored
  throwsCode(() => applySpeciesVariantProfile(base, snapshotVariant({ anatomy: { schemaVersion: 2, topologyStatus: 'complete', appendages: [] } })), 'INVALID_SCHEMA_VERSION');
  throwsCode(() => applySpeciesVariantProfile(base, snapshotVariant({ anatomy: null })), 'INVALID_ANATOMY_TYPE');
  throwsCode(() => applySpeciesVariantProfile(base, { id: 'l3', label: 'L3', abilityMods: { dex: 2 }, anatomy: 'four arms' }), 'INVALID_ANATOMY_TYPE');
  // 8. inputs unchanged
  const variant = deepFreeze(snapshotVariant({ anatomy: decl }));
  const vJson = JSON.stringify(variant);
  applySpeciesVariantProfile(base, variant);
  assert.equal(JSON.stringify(variant), vJson);
  assert.deepEqual(base.anatomy.appendages.map((x) => x.id), ['base-1']);
  ok('applySpeciesVariantProfile: selected-variant anatomy only; no base inheritance (complete snapshot or legacy overlay); malformed declarations throw; inputs unchanged');
}

{
  // existing snapshot behaviour is unchanged by the anatomy plumbing
  const base = baseProfile({ canonicalTraits: [{ id: 'darkvision', name: 'Darkvision' }], languages: ['Basic', 'Xish'], supplementaryTraits: { sidecar: true } });
  const e = applySpeciesVariantProfile(base, snapshotVariant());
  assert.deepEqual(e.canonicalTraits, []); assert.deepEqual(e.languages, ['Basic']); assert.equal(e.supplementaryTraits, null);
  assert.equal(e.selectedVariantId, 'x-b'); assert.equal(e.selectedVariant.sourceProfileId, 'B-1'); assert.equal(e.id, 'species-x');
  const overlay = applySpeciesVariantProfile(base, { id: 'legacy', label: 'L', abilityMods: { dex: 2 }, special: [], traits: [], languages: [] });
  assert.deepEqual(overlay.canonicalTraits, base.canonicalTraits);
  assert.ok(overlay.variantFallbackFields.includes('traits'));
  ok('existing complete-snapshot and legacy-overlay behaviour (atomicity, fallback reporting, identity) is unchanged');
}

// ------------------------------------------------------------------------------------------------------------------ production data
{
  const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const declared = [];
  for (const r of recs) {
    assert.ok(!declaresSpeciesAnatomy(r.system), `base record ${r.name} declares no anatomy`);
    for (const v of r.system.variants ?? []) if (declaresSpeciesAnatomy(v)) { declared.push(v.id); validateSpeciesAnatomyV1(v.anatomy); }
  }
  assert.deepEqual(declared.sort(), ['codru-ji-leg-2c-03', 'dug-cw-2h-01', 'killik-ur-2b-12', 'krevaaki-ur-2b-04', 'lugubraa-ur-2b-13', 'ryn-sv-2f-06', 'trianii-gaw-2i-06']);
  ok('exactly the seven E2B-I2 authorized variant identities declare anatomy (all validate); no base record or other variant does');
}

console.log(`species-anatomy-schema-v1: ${n} checks passed`);
