import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E2B-I3A -- canonical biological anatomy integration. Real packs/species.db -> real SpeciesRegistry normalization ->
// real applySpeciesVariantProfile -> real resolveEffectiveAnatomy. Synthetic fixtures are used only for schema/topology/guard edge cases.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveEffectiveAnatomy, AnatomyInputError, ANATOMY_STATUS, ANATOMY_SOURCE, TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES } =
  await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const codes = (r) => r.issues.map((i) => i.code);
const ALL3 = { canHold: true, canWield: true, canManipulate: true };
const an = (appendages, topologyStatus = 'complete') => ({ schemaVersion: 1, topologyStatus, appendages });
const A = (id, caps = ALL3, extra = {}) => ({ id, kind: 'arm', capabilities: { ...caps }, ...extra });
const CONSTRAINT = { type: 'held-item-load-floor', when: 'held-by-appendage', itemSizeAtLeast: 'Medium', loadCategoryFloor: 'heavy', imposesEncumbered: true };
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const bio = (speciesProfile, extra = {}) => resolveEffectiveAnatomy({ actorType: 'character', speciesProfile, ...extra });

// ---- production publication path --------------------------------------------------------------------------------------------
const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
function effective(variantId) {
  for (const r of recs) {
    const raw = (r.system.variants ?? []).find((v) => v.id === variantId);
    if (!raw) continue;
    const normalized = SpeciesRegistry._normalizeVariants(JSON.parse(JSON.stringify(r.system.variants)), r.name).find((v) => v.id === variantId);
    const s = r.system;
    const base = { id: r._id, name: r.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] };
    return applySpeciesVariantProfile(base, normalized);
  }
  throw new Error(`no such variant ${variantId}`);
}
const ids = (r) => r.appendages.map((a) => a.id);

{
  const r = bio(effective('codru-ji-leg-2c-03'));
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED); assert.equal(r.source, ANATOMY_SOURCE.SPECIES_ANATOMY); assert.equal(r.defaultApplied, false);
  assert.equal(r.topologyStatus, 'complete'); assert.deepEqual(ids(r), ['arm-1', 'arm-2', 'arm-3', 'arm-4']);
  assert.ok(r.appendages.every((a) => a.kind === 'arm' && a.capabilities.canHold && a.capabilities.canWield && a.capabilities.canManipulate));
  assert.ok(!r.appendages.some((a) => 'attackCount' in a || 'attacks' in a) && !('attacks' in r));
  ok('Codru-Ji (production path): four verified arms, resolved, no default, no attack data');
}
for (const vid of ['ryn-sv-2f-06', 'trianii-gaw-2i-06']) {
  const r = bio(effective(vid));
  assert.equal(r.status, ANATOMY_STATUS.PARTIAL, `${vid} partial: tail manipulation unknown`);
  assert.deepEqual(ids(r), ['arm-1', 'arm-2', 'tail-1']);
  const tail = r.appendages[2];
  assert.deepEqual(tail.capabilities, { canHold: true, canWield: false, canManipulate: null });
  assert.deepEqual(tail.constraints, [CONSTRAINT], 'typed holding constraint preserved exactly and not evaluated');
  assert.ok(r.issues.some((i) => i.code === 'capability-unknown' && i.details.id === 'tail-1' && i.details.unknown.join() === 'canManipulate'));
  assert.equal(r.defaultApplied, false);
}
{
  const ryn = bio(effective('ryn-sv-2f-06')); const tri = bio(effective('trianii-gaw-2i-06'));
  assert.notEqual(ryn.appendages[2].constraints, tri.appendages[2].constraints, 'no shared constraint object between publications');
  ok('Ryn and Trianii: two arms + tail, exact typed constraint preserved, partial because tail manipulation is unknown; independently sourced');
}
{
  const r = bio(effective('krevaaki-ur-2b-04'));
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED); assert.deepEqual(ids(r), ['dominant-tentacle-1', 'dominant-tentacle-2']);
  assert.equal(r.appendages.length, 2, 'two dominant manipulators, not eight hands');
  ok('Krevaaki UR-2B-04: two dominant manipulators (not eight hands), resolved');
}
{
  const r = bio(effective('killik-ur-2b-12'));
  assert.equal(r.status, ANATOMY_STATUS.RESOLVED); assert.deepEqual(ids(r), ['arm-1', 'arm-2', 'arm-3', 'arm-4']);
  assert.ok(!r.appendages.some((a) => 'attackCount' in a || 'attacks' in a));
  ok('Killik: four manipulators, resolved, no generated attacks');
}
{
  const r = bio(effective('dug-cw-2h-01'));
  assert.equal(r.status, ANATOMY_STATUS.PARTIAL); assert.deepEqual(ids(r), ['lower-limb-1', 'lower-limb-2']);
  assert.ok(r.appendages.every((a) => a.kind === 'lower-limb' && a.capabilities.canWield === null && a.capabilities.canHold === true && a.capabilities.canManipulate === true));
  assert.ok(codes(r).includes('capability-unknown'));
  ok('Dug: two lower-limb manipulators; unresolved wield capability yields partial');
}
{
  const r = bio(effective('lugubraa-ur-2b-13'));
  assert.equal(r.status, ANATOMY_STATUS.PARTIAL); assert.deepEqual(ids(r), ['forward-limb-1', 'forward-limb-2']);
  assert.ok(r.appendages.every((a) => a.kind === 'grasping-tentacle' && a.capabilities.canHold === true && a.capabilities.canWield === null && a.capabilities.canManipulate === null));
  ok('Lugubraa: two grasping appendages; unknown capabilities remain null; partial');
}
{
  const jatm = effective('krevaaki-jatm-2j-04');
  assert.equal(jatm.anatomy, undefined, 'no anatomy inherited from the Unknown Regions Krevaaki profile');
  const r = bio(jatm);
  assert.equal(r.status, ANATOMY_STATUS.UNRESOLVED); assert.equal(r.defaultApplied, false); assert.deepEqual(r.appendages, []);
  const iss = r.issues.find((i) => i.code === 'anatomy-exception-unresolved');
  assert.equal(iss.details.variantId, 'krevaaki-jatm-2j-04'); assert.equal(iss.details.sourceProfileId, 'JATM-2J-04');
  ok('Krevaaki Jedi Academy: no inherited anatomy; fails closed (unresolved, no default, no appendages)');
}

// ---- topology -----------------------------------------------------------------------------------------------------------------
{
  const complete = bio({ anatomy: an([A('a'), A('b')]) });
  assert.equal(complete.status, ANATOMY_STATUS.RESOLVED); assert.equal(complete.topologyStatus, 'complete');
  const withNull = bio({ anatomy: an([A('a', { canHold: true, canWield: null, canManipulate: true })]) });
  assert.equal(withNull.status, ANATOMY_STATUS.PARTIAL); assert.ok(codes(withNull).includes('capability-unknown'));
  const knownFalse = bio({ anatomy: an([A('a', { canHold: true, canWield: false, canManipulate: true })]) });
  assert.equal(knownFalse.status, ANATOMY_STATUS.RESOLVED, 'known false is not uncertainty');
  const zero = bio({ anatomy: an([]) });
  assert.equal(zero.status, ANATOMY_STATUS.RESOLVED); assert.deepEqual(zero.appendages, []); assert.equal(zero.defaultApplied, false); assert.equal(zero.source, ANATOMY_SOURCE.SPECIES_ANATOMY);
  const partialTopo = bio({ anatomy: an([A('a')], 'partial') });
  assert.equal(partialTopo.status, ANATOMY_STATUS.PARTIAL); assert.deepEqual(ids(partialTopo), ['a']); assert.ok(codes(partialTopo).includes('anatomy-topology-partial'));
  const unresolvedTopo = bio({ anatomy: an([], 'unresolved') });
  assert.equal(unresolvedTopo.status, ANATOMY_STATUS.UNRESOLVED); assert.deepEqual(unresolvedTopo.appendages, []); assert.equal(unresolvedTopo.defaultApplied, false);
  assert.ok(codes(unresolvedTopo).includes('anatomy-topology-unresolved'));
  ok('topology: complete resolves, null capability -> partial, known false stays resolved, zero manipulators gets no default, partial/unresolved topology never resolve');
}

// ---- schema authority / malformed ---------------------------------------------------------------------------------------------
{
  const bad = (anatomy, code, schemaCode) => assert.throws(() => bio({ anatomy }), (e) => e instanceof AnatomyInputError && e.code === code && (!schemaCode || (e.schemaCode === schemaCode && typeof e.schemaPath === 'string')), `${code}/${schemaCode}`);
  bad({ appendages: [A('a')] }, 'INVALID_ANATOMY', 'INVALID_SCHEMA_VERSION');
  bad('arms', 'INVALID_ANATOMY', 'INVALID_ANATOMY_TYPE');
  bad(an([A('a'), A('a')]), 'INVALID_ANATOMY', 'DUPLICATE_APPENDAGE_ID');
  bad(an([{ id: 'a', kind: 'arm', capabilities: { canHold: true, canWield: true } }]), 'INVALID_ANATOMY', 'MISSING_CAPABILITY');
  bad(an([A('a', { canHold: true, canWield: 'yes', canManipulate: true })]), 'INVALID_CAPABILITY', 'INVALID_CAPABILITY');
  bad(an([A('a', ALL3, { functionalState: 'disabled' })]), 'INVALID_ANATOMY', 'FORBIDDEN_FIELD');
  bad(an([A('a', ALL3, { restrictions: ['x'] })]), 'INVALID_ANATOMY', 'UNKNOWN_FIELD');
  bad(an([A('a')], 'weird'), 'INVALID_ANATOMY', 'INVALID_TOPOLOGY_STATUS');
  bad({ ...an([]), extra: 1 }, 'INVALID_ANATOMY', 'UNKNOWN_FIELD');
  bad(null, 'INVALID_ANATOMY', 'INVALID_ANATOMY_TYPE'); // a supplied null is a malformed declaration, never absent anatomy
  assert.equal(bio({ anatomy: undefined }).source, ANATOMY_SOURCE.DEFAULT, 'undefined is absent');
  ok('malformed anatomy throws AnatomyInputError retaining schemaCode/schemaPath (duplicate ids, missing capabilities, forbidden per-actor state, bad version/topology); never defaulted');
}

// ---- constraints, overrides, determinism --------------------------------------------------------------------------------------
{
  const input = deepFreeze({ speciesProfile: { anatomy: an([A('t', { canHold: true, canWield: false, canManipulate: null }, { constraints: [CONSTRAINT] }), A('x')]) }, functionalOverrides: { t: 'disabled', ghost: 'missing', x: 'functional' } });
  const before = JSON.stringify(input);
  const r1 = bio(input.speciesProfile, { functionalOverrides: input.functionalOverrides });
  const r2 = bio(input.speciesProfile, { functionalOverrides: input.functionalOverrides });
  assert.equal(JSON.stringify(input), before, 'inputs unchanged'); assert.equal(JSON.stringify(r1), JSON.stringify(r2));
  assert.deepEqual(r1.appendages[0].constraints, [CONSTRAINT]);
  assert.notEqual(r1.appendages[0].constraints[0], input.speciesProfile.anatomy.appendages[0].constraints[0], 'constraints are copies');
  assert.ok(Object.isFrozen(r1) && Object.isFrozen(r1.appendages[0].constraints) && Object.isFrozen(r1.appendages[0].constraints[0]));
  assert.equal(r1.appendages[0].functionalState, 'disabled'); assert.equal(r1.appendages[0].functionalStateSource, 'override');
  assert.equal(r1.appendages[1].functionalState, 'functional');
  assert.ok(codes(r1).includes('override-unknown-appendage'));
  assert.ok(!r1.appendages.some((a) => a.id === 'ghost'), 'unknown override ids are reported, never materialized');
  assert.ok(!('functionalState' in input.speciesProfile.anatomy.appendages[0]), 'overrides never touch canonical anatomy');
  const mutableIn = { anatomy: an([A('m', ALL3, { constraints: [{ ...CONSTRAINT }] })]) };
  const snap = JSON.stringify(mutableIn); bio(mutableIn);
  assert.equal(JSON.stringify(mutableIn), snap); assert.ok(!Object.isFrozen(mutableIn.anatomy) && !Object.isFrozen(mutableIn.anatomy.appendages[0]));
  ok('constraints retained verbatim, not evaluated; overrides restrict separately; caller data neither mutated nor frozen; output frozen and deterministic');
}

// ---- guard coverage ---------------------------------------------------------------------------------------------------------
{
  const G = TEMPORARY_FAIL_CLOSED_PUBLICATION_IDENTITIES;
  assert.equal(G.variantIds.length, 8); assert.equal(G.sourceProfileIds.length, 8);
  G.variantIds.forEach((vid, i) => {
    const sel = { selectedVariantId: vid, selectedVariant: { id: vid, sourceProfileId: G.sourceProfileIds[i] } };
    const closed = bio({ name: 'Anything', ...sel });
    assert.equal(closed.status, ANATOMY_STATUS.UNRESOLVED, vid); assert.equal(closed.defaultApplied, false); assert.deepEqual(closed.appendages, []);
    assert.ok(codes(closed).includes('anatomy-exception-unresolved'));
    const used = bio({ ...sel, anatomy: an([A('z')]) });
    assert.equal(used.source, ANATOMY_SOURCE.SPECIES_ANATOMY); assert.deepEqual(ids(used), ['z']);
  });
  assert.equal(bio({ selectedVariant: { sourceProfileId: 'SV-2F-06' } }).status, ANATOMY_STATUS.UNRESOLVED, 'source profile id alone fails closed');
  ok('every recognized publication (7 certified + Jedi Academy Krevaaki) fails closed without anatomy and uses valid anatomy when present');

  for (const sel of [
    { name: 'Ryn', selectedVariantId: 'ryn-sv-2f-06-x', selectedVariant: { id: 'ryn-sv-2f-06-x', sourceProfileId: 'SV-2F-060' } },
    { selectedVariantId: 'RYN-SV-2F-06', selectedVariant: { id: 'RYN-SV-2F-06', sourceProfileId: 'sv-2f-06' } },
    { name: 'Codru-Ji', canonicalName: 'Codru-Ji', description: 'ryn-sv-2f-06 LEG-2C-03' },
  ]) {
    const r = bio(sel);
    assert.equal(r.source, ANATOMY_SOURCE.DEFAULT); assert.equal(r.status, ANATOMY_STATUS.RESOLVED); assert.ok(!codes(r).includes('anatomy-exception-unresolved'));
  }
  for (const t of ['extra-arms-x', 'Extra-Arms', 'prehensile-tail2', 'tail']) {
    assert.equal(bio({ canonicalTraits: [{ id: t }] }).source, ANATOMY_SOURCE.DEFAULT, `lookalike trait ${t}`);
  }
  for (const t of ['extra-arms', 'prehensile-tail']) assert.equal(bio({ canonicalTraits: [{ id: t }] }).status, ANATOMY_STATUS.UNRESOLVED);
  ok('lookalike publication identities, display names, prose and lookalike trait ids do not match; exact trait guards still fail closed');

  const ordinary = bio({ name: 'Synthetic Ordinary', canonicalTraits: [{ id: 'low-light-vision' }] });
  assert.equal(ordinary.status, ANATOMY_STATUS.RESOLVED); assert.equal(ordinary.defaultApplied, true); assert.deepEqual(ids(ordinary), ['natural-arm-1', 'natural-arm-2']);
  const none = resolveEffectiveAnatomy({ actorType: 'character' });
  assert.notEqual(none.status, ANATOMY_STATUS.RESOLVED); assert.ok(codes(none).includes('species-profile-not-provided'));
  ok('ordinary species keeps the standard two-arm fallback; a missing effective species profile is never fully resolved');
}

console.log(`equipment-e2b-i3a-biological-integration: ${n} checks passed`);
