import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// E3-A1 -- read-only species equipment-permission projection. Positive certification uses the REAL Codru-Ji publication profile
// (packs/species.db -> registry normalization -> applySpeciesVariantProfile); negative and malformed cases use synthetic fixtures.
registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveSpeciesEquipmentPermissions, SPECIES_PERMISSION_STATUS: S } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/species-equipment-permissions.js');
const { resolveEffectiveAnatomy } = await import('/systems/foundryvtt-swse/scripts/engine/equipment/anatomy-resolver.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const deepFreeze = (v) => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); Object.values(v).forEach(deepFreeze); } return v; };
const collect = (o, acc = []) => { if (o && typeof o === 'object') { acc.push(o); Object.values(o).forEach((v) => collect(v, acc)); } return acc; };

const recs = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
function effective(variantId) {
  for (const d of recs) {
    const v = (d.system.variants ?? []).find((x) => x.id === variantId);
    if (!v) continue;
    const s = d.system;
    const nv = SpeciesRegistry._normalizeVariants(JSON.parse(JSON.stringify(s.variants)), d.name).find((x) => x.id === variantId);
    return applySpeciesVariantProfile({ id: d._id, name: d.name, type: 'species', category: 'species', tags: s.tags, pack: 'species', canonicalName: s.canonicalName, variants: s.variants, speed: s.speed, size: s.size, abilityScores: {}, skillBonuses: [], abilities: [], canonicalTraits: s.canonicalTraits, languages: [], naturalWeapons: [] }, nv);
  }
  throw new Error(variantId);
}
// synthetic effective Codru-Ji profile, valid unless overridden
const codru = (over = {}) => ({
  name: 'Codru-Ji', selectedVariantId: 'codru-ji-leg-2c-03',
  selectedVariant: { id: 'codru-ji-leg-2c-03', sourceProfileId: 'LEG-2C-03', completeSnapshot: true },
  canonicalTraits: [{ id: 'extra-arms', name: 'Extra Arms' }], ...over,
});
const sel = (over) => ({ ...codru().selectedVariant, ...over });
const noGrant = (p) => { const r = resolveSpeciesEquipmentPermissions(p); assert.deepEqual(r.permissions, []); assert.notEqual(r.status, S.VERIFIED); return r; };

// 1-3
const realCodru = effective('codru-ji-leg-2c-03');
const real = resolveSpeciesEquipmentPermissions(realCodru);
assert.equal(real.status, S.VERIFIED); assert.equal(real.permissions.length, 1); assert.deepEqual(real.issues, []);
ok('1: the real Codru-Ji complete snapshot produces the explicit permission');
const [perm] = real.permissions;
assert.equal(perm.id, 'codru-ji-extra-arms');
assert.equal(perm.maxSimultaneouslyHeldItemsOrWeapons, 4);
assert.equal(perm.maxSimultaneousTwoHandedWeapons, 2);
assert.equal(perm.additionalAttacksGrantedByThisTrait, 0);
assert.deepEqual(perm.source, { book: 'Legacy Era Campaign Guide', printedPage: 13, reviewCase: 'E2B-RD-01' });
ok('2: projected values match E2B-RD-01 (hold four, wield two two-handed weapons, no additional attacks)');
assert.deepEqual(perm.provenance, { variantId: 'codru-ji-leg-2c-03', sourceProfileId: 'LEG-2C-03', traitId: 'extra-arms' });
ok('3: variant, source-profile and trait ids are preserved as provenance');

// 4
{
  const before = JSON.stringify(realCodru);
  const a = resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: realCodru });
  resolveSpeciesEquipmentPermissions(realCodru);
  assert.equal(JSON.stringify(realCodru), before);
  assert.deepEqual(a.appendages.map((x) => x.id), ['arm-1', 'arm-2', 'arm-3', 'arm-4']); assert.equal(a.status, 'resolved');
  assert.ok(!('permissions' in a) && !JSON.stringify(a).includes('codru-ji-extra-arms'), 'anatomy carries no permission data');
  ok('4: the real Codru-Ji anatomy remains four arms; the projection does not modify the profile or anatomy');
}

// 5-10: evidence gaps
{
  const r5 = noGrant(codru({ canonicalTraits: [{ id: 'skilled-grappler' }] }));
  assert.equal(r5.status, S.INCOMPLETE); assert.ok(r5.issues.some((i) => i.code === 'required-trait-missing'));
  ok('5: a missing extra-arms trait prevents a grant (recognized publication, blocked)');
  const r6 = noGrant(codru({ selectedVariant: { id: 'codru-ji-leg-2c-03', completeSnapshot: true } }));
  assert.equal(r6.status, S.INCOMPLETE); assert.ok(r6.issues.some((i) => i.code === 'source-profile-id-missing'));
  ok('6: a missing source-profile identity prevents a grant');
  const r7 = noGrant(codru({ selectedVariantId: 'codru-ji-other', selectedVariant: sel({ id: 'codru-ji-other' }) }));
  assert.equal(r7.status, S.INCOMPLETE);
  const r7b = noGrant(codru({ selectedVariantId: 'codru-ji-other', selectedVariant: sel({ id: 'codru-ji-other', sourceProfileId: 'OTHER-1' }) }));
  assert.equal(r7b.status, S.NONE);
  ok('7: a wrong publication variant prevents a grant (claiming the profile id is blocked; claiming nothing matches nothing)');
  const r8 = noGrant(codru({ selectedVariantId: 'codru-ji-leg-2c-03', selectedVariant: sel({ id: 'ryn-sv-2f-06' }) }));
  assert.equal(r8.status, S.INCOMPLETE); assert.ok(r8.issues.some((i) => i.code === 'selected-variant-identity-conflict'));
  const r8b = noGrant(codru({ selectedVariantId: 'ryn-sv-2f-06' }));
  assert.ok(r8b.issues.some((i) => i.code === 'selected-variant-identity-conflict'));
  ok('8: conflicting selected-variant ids prevent a grant');
  assert.equal(noGrant({ name: 'Codru-Ji', canonicalName: 'Codru-Ji', canonicalTraits: [{ id: 'extra-arms' }] }).status, S.NONE);
  assert.equal(noGrant({ name: 'Codru-Ji' }).status, S.NONE);
  ok('9: name-only (and name + trait) matching does not grant permission');
  assert.equal(noGrant({ name: 'Other', description: 'Four arms allow holding as many as four items; codru-ji-leg-2c-03 LEG-2C-03', canonicalTraits: [{ id: 'x', description: 'wield two two-handed weapons', name: 'Extra Arms' }] }).status, S.NONE);
  assert.equal(noGrant(codru({ canonicalTraits: [{ id: 'other', name: 'Extra Arms', description: 'Four arms allow holding four items' }] })).status, S.INCOMPLETE);
  ok('10: trait prose or trait name alone never grants permission');
  const r10b = noGrant(codru({ selectedVariant: { id: 'codru-ji-leg-2c-03', sourceProfileId: 'LEG-2C-03' } }));
  assert.ok(r10b.issues.some((i) => i.code === 'complete-snapshot-not-established'));
}

// 11-13
{
  const killik = effective('killik-ur-2b-12');
  const rk = noGrant(killik);
  assert.equal(rk.status, S.NONE);
  assert.equal(resolveEffectiveAnatomy({ actorType: 'character', speciesProfile: killik }).appendages.length, 4, 'four arms alone grant nothing');
  assert.equal(noGrant({ name: 'Killik', selectedVariantId: 'killik-ur-2b-12', selectedVariant: { id: 'killik-ur-2b-12', sourceProfileId: 'UR-2B-12', completeSnapshot: true }, canonicalTraits: [{ id: 'extra-arms' }] }).status, S.NONE);
  ok('11: Killik (four arms, even with an extra-arms trait id) does not inherit Codru-Ji permissions');
  assert.equal(noGrant({ name: 'Near-Human', speciesNearHuman: true, canonicalTraits: [{ id: 'additional-arms' }, { id: 'extra-arms' }], anatomy: { schemaVersion: 1, topologyStatus: 'complete', appendages: [] } }).status, S.NONE);
  ok('12: Near-Human Additional Arms does not inherit them');
  for (const v of ['ryn-sv-2f-06', 'trianii-gaw-2i-06', 'dug-cw-2h-01', 'krevaaki-ur-2b-04', 'lugubraa-ur-2b-13', 'krevaaki-jatm-2j-04']) assert.deepEqual(noGrant(effective(v)).issues, []);
  const ordinary = resolveSpeciesEquipmentPermissions({ name: 'Human', canonicalTraits: [] });
  assert.deepEqual(ordinary, { status: S.NONE, permissions: [], issues: [] });
  assert.ok(!JSON.stringify(ordinary).match(/prohibit|forbid|cannot|deny|disallow/i));
  ok('13: ordinary and other certified species get "no explicit special entitlement" (no prohibition implied)');
}

// 14
{
  const keys = new Set(collect(real).flatMap((o) => (Array.isArray(o) ? [] : Object.keys(o))));
  assert.deepEqual([...keys].sort(), ['additionalAttacksGrantedByThisTrait', 'book', 'id', 'issues', 'maxSimultaneousTwoHandedWeapons', 'maxSimultaneouslyHeldItemsOrWeapons', 'permissions', 'printedPage', 'provenance', 'reviewCase', 'source', 'sourceProfileId', 'status', 'traitId', 'variantId']);
  for (const forbidden of ['handAssignments', 'assignments', 'occupancy', 'occupied', 'readied', 'attacks', 'items', 'slots', 'grip']) assert.ok(!keys.has(forbidden), forbidden);
  ok('14: the result carries only permission data: no hand assignment, attack list, item change or occupancy state');
}

// 15-17
{
  assert.equal(JSON.stringify(resolveSpeciesEquipmentPermissions(effective('codru-ji-leg-2c-03'))), JSON.stringify(real));
  assert.equal(JSON.stringify(resolveSpeciesEquipmentPermissions(codru())), JSON.stringify(resolveSpeciesEquipmentPermissions(codru())));
  ok('15: repeated results are deterministic');
  const blocked = resolveSpeciesEquipmentPermissions(codru({ canonicalTraits: [] }));
  for (const r of [real, blocked, resolveSpeciesEquipmentPermissions({}), resolveSpeciesEquipmentPermissions(null)]) assert.ok(collect(r).every((o) => Object.isFrozen(o)));
  ok('16: returned results are deeply frozen');
  const live = codru(); const before = JSON.stringify(live);
  const out = resolveSpeciesEquipmentPermissions(live);
  assert.equal(JSON.stringify(live), before); assert.ok(collect(live).every((o) => !Object.isFrozen(o)));
  const owned = new Set(collect(live)); assert.ok(collect(out).every((o) => !owned.has(o)));
  const frozenIn = deepFreeze(codru()); assert.equal(resolveSpeciesEquipmentPermissions(frozenIn).status, S.VERIFIED);
  ok('17: inputs are neither changed nor frozen; the result shares no object with them');
}

// 18
{
  for (const bad of [undefined, null, 'Codru-Ji', 7, [], [codru()], {}, codru({ selectedVariant: 'codru-ji-leg-2c-03' }), codru({ selectedVariant: null, selectedVariantId: undefined }), codru({ canonicalTraits: 'extra-arms' }), codru({ canonicalTraits: [null, 7, 'extra-arms'] }), codru({ selectedVariantId: 42, selectedVariant: { id: 42, sourceProfileId: 7, completeSnapshot: 'yes' } })]) {
    const r = resolveSpeciesEquipmentPermissions(bad);
    assert.deepEqual(r.permissions, []); assert.notEqual(r.status, S.VERIFIED);
  }
  ok('18: malformed or missing input never creates a positive entitlement and never throws');
}

console.log(`equipment-e3a1-species-permissions: ${n} checks passed`);
