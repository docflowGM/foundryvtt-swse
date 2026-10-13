import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-B3 -- weapon-side upgrade compatibility (upgradeRestrictions, surveillanceTaggerCompatible / Compatibility, redirectionCrystalCompatibility).
// Every weapon below is a PRODUCTION PACK RECORD (real system.category 'weapon', real stamp) under a deliberately WRONG display name.
// The gate lives in UpgradeEligibilityEngine, the path UpgradeService.applyUpgrade and InstallRemoveEngine both use. Weapons are canonical records
// under deliberately WRONG names, so a pass cannot come from a name.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const compat = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/upgrade-compat.js');
const { CustomizationWorkflow } = await import('/systems/foundryvtt-swse/scripts/engine/customization/customization-workflow.js');
const { UPGRADE_CATALOG } = await import('/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js');
const { UpgradeService } = await import('/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);


let step = 0;
const ok = (l) => { step += 1; console.log(`  [${step}] ${l} OK`); };

// ---- production pack records -------------------------------------------------------------------------------------------------------------------
const packs = new Map();
for (const f of fs.readdirSync(new URL('../packs/', import.meta.url)).filter((n) => /^weapons.*\.db$/.test(n))) {
  for (const line of fs.readFileSync(new URL(`../packs/${f}`, import.meta.url), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const d = JSON.parse(line);
    packs.set(d._id, d);
  }
}
const idOf = (identityKey) => Object.entries(registryData.productionIdIndex).find(([, k]) => k === identityKey)[0];
let uid = 0;
const prod = (identityKey, name = 'Zxq Renamed Thing') => {
  const d = packs.get(idOf(identityKey));
  assert.ok(d, `production record for ${identityKey}`);
  return { id: `w${++uid}`, name, type: d.type, flags: JSON.parse(JSON.stringify(d.flags)), system: JSON.parse(JSON.stringify(d.system)) };
};
const wf = new CustomizationWorkflow();
const eng = wf.eligibilityEngine;
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const writes = [];
for (const m of ['updateEmbeddedDocuments', 'applyMutationPlan', 'updateActor']) {
  if (typeof ActorEngine[m] === 'function') { const orig = ActorEngine[m]; ActorEngine[m] = async (...a) => { writes.push(m); return orig.apply(ActorEngine, a); }; }
}
const mkActor = (items, credits = 99999) => {
  const actor = { id: 'a', type: 'character', items: { get: (id) => items.find((i) => i.id === id) ?? null, contents: items }, system: { credits }, update: async () => { writes.push('actor.update'); } };
  for (const i of items) { i.isEmbedded = true; i.update = async () => { writes.push('item.update'); }; }
  return actor;
};
const reason = (r) => String(r.reason ?? '');

// 0. The fixtures really are production shaped: category 'weapon', never 'blaster'.
for (const k of ['weapon-sniper-blaster-rifle', 'weapon-blaster-pistol', 'weapon-darter', 'weapon-vibroblade']) assert.equal(prod(k).system.category, 'weapon', k);

// ---- Blocker 1 -------------------------------------------------------------------------------------------------------------------------------
{
  const sniper = prod('weapon-sniper-blaster-rifle');
  const r = eng.canInstallUpgrade(sniper, 'rapid_recycler');
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'weapon_restriction:rapid_recycler');           // reached: the blaster class now matches, so it is NOT category_mismatch
  const listed = eng.getEligibleUpgrades(sniper).find((u) => u.key === 'rapid_recycler');
  assert.ok(listed && listed.allowed === false && listed.reason === 'weapon_restriction:rapid_recycler', 'listed with the canonical reason');
  ok('1. Sniper Blaster Rifle (real record, category weapon) + Rapid Recycler -> weapon_restriction:rapid_recycler');
}
{
  const pistol = prod('weapon-blaster-pistol');
  const r = eng.canInstallUpgrade(pistol, 'rapid_recycler');
  assert.equal(r.allowed, true, JSON.stringify(r));
  assert.equal(eng.canInstallUpgrade(prod('weapon-sporting-blaster-rifle'), 'rapid_recycler').allowed, true);
  ok('2. ordinary canonical blasters are not blocked by the canonical restriction (Rapid Recycler allowed)');
}
{
  const dart = prod('weapon-darter');
  assert.equal(eng.canInstallUpgrade(dart, 'rapid_recycler').reason, 'category_mismatch');
  assert.equal(eng.canInstallUpgrade(dart, 'bipod').reason, 'category_mismatch');
  assert.equal(eng.canInstallUpgrade(prod('weapon-vibroblade'), 'rapid_recycler').reason, 'category_mismatch');
  assert.equal(eng.canInstallUpgrade(prod('weapon-slugthrower-rifle'), 'rapid_recycler').reason, 'category_mismatch');
  assert.equal(eng.canInstallUpgrade(prod('weapon-bowcaster'), 'rapid_recycler').reason, 'category_mismatch');
  ok('3. non-blaster weapons (dart launcher, vibroblade, slugthrower, bowcaster) stay ineligible for blaster-only upgrades');
}
{
  const a = eng.canInstallUpgrade(prod('weapon-sniper-blaster-rifle', 'Plain Name'), 'rapid_recycler');
  const b = eng.canInstallUpgrade(prod('weapon-sniper-blaster-rifle', 'Blaster Pistol'), 'rapid_recycler');
  const c = eng.canInstallUpgrade(prod('weapon-blaster-pistol', 'Sniper Blaster Rifle'), 'rapid_recycler');
  assert.equal(a.reason, 'weapon_restriction:rapid_recycler'); assert.equal(b.reason, 'weapon_restriction:rapid_recycler');
  assert.equal(c.allowed, true, 'a pistol named like the sniper rifle is not restricted');
  assert.equal(eng.canInstallUpgrade(prod('weapon-darter', 'Blaster Rifle'), 'rapid_recycler').reason, 'category_mismatch');
  ok('4. renaming changes nothing, in either direction');
}
{
  const actorItems = [prod('weapon-sniper-blaster-rifle')];
  const sniper = actorItems[0];
  const actor = mkActor(actorItems);
  writes.length = 0;
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor, itemId: sniper.id, upgradeId: 'rapid_recycler' }), /not allowed: weapon_restriction:rapid_recycler/);
  assert.deepEqual(writes, []);
  assert.equal(actor.system.credits, 99999);
  ok('5. UpgradeService.applyUpgrade rejects the restricted combination before any credit or Item write');
}
{
  const sniper = prod('weapon-sniper-blaster-rifle');
  const actor = mkActor([sniper]);
  writes.length = 0;
  const prev = wf.installRemoveEngine.previewInstall(actor, sniper, 'rapid_recycler');
  assert.equal(prev.success, false); assert.equal(prev.reason, 'weapon_restriction:rapid_recycler');
  const applied = await wf.installRemoveEngine.applyInstall(actor, sniper, 'rapid_recycler', { mechanicsTotal: 99 });
  assert.equal(applied.success, false); assert.equal(applied.reason, 'weapon_restriction:rapid_recycler');
  assert.deepEqual(writes, []);
  const pistol = prod('weapon-blaster-pistol');
  const okPrev = wf.installRemoveEngine.previewInstall(mkActor([pistol]), pistol, 'rapid_recycler');
  assert.equal(okPrev.success, true, JSON.stringify(okPrev.reason));
  ok('6. InstallRemoveEngine.previewInstall and applyInstall enforce the same restriction (no write); a compatible blaster previews fine');
}
{
  const sniper = prod('weapon-sniper-blaster-rifle'); const dart = prod('weapon-darter'); const sword = prod('weapon-vibroblade');
  for (const it of [sniper, dart, sword]) for (const key of ['cheater', 'dual_gear', 'remote_activation']) {
    const r = eng.canInstallUpgrade(it, key);
    assert.notEqual(r.reason, 'category_mismatch', `${key} keeps its published category eligibility`);
    assert.ok(!reason(r).startsWith('weapon_') && !reason(r).startsWith('canonical_'), `${key}: ${r.reason}`);
  }
  assert.equal(eng.canInstallUpgrade({ id: 'x', name: 'Armor', type: 'armor', flags: {}, system: { category: 'armor', armorType: 'light' } }, 'rapid_recycler').reason, 'category_mismatch');
  ok('7. universal upgrades keep their published category eligibility; armor is untouched');
}

// ---- Surveillance Tagger gate: the REAL Darter (category weapon, not a blaster) -------------------------------------------------------------------
{
  UPGRADE_CATALOG.__test_tagger = { key: '__test_tagger', name: 'Test Tagger', category: 'weapon', cost: 0, slotCost: 0, restriction: 'common', appliesTo: ['weapon'], requiresWeaponCapability: 'surveillance-tagger', affectedAreas: [] };
  try {
    assert.equal(eng.canInstallUpgrade(prod('weapon-darter'), '__test_tagger').allowed, true);
    const refused = eng.canInstallUpgrade(prod('weapon-vibroblade'), '__test_tagger');
    assert.equal(refused.reason, 'weapon_incompatible:surveillance-tagger');
    assert.equal(eng.canInstallUpgrade(prod('weapon-blaster-pistol'), '__test_tagger').reason, 'weapon_incompatible:surveillance-tagger');
  } finally { delete UPGRADE_CATALOG.__test_tagger; }
  ok('8. surveillance-tagger capability: the real Darter accepts a synthetic tagger-requiring upgrade; a vibroblade and a blaster pistol do not (synthetic catalog entry only)');
}

// ---- Blocker 2: canonical authority failures fail closed ---------------------------------------------------------------------------------------
{
  const legacy = { id: 'hb', name: 'Sniper Blaster Rifle', type: 'weapon', flags: {}, system: { category: 'weapon', weaponCategory: 'ranged', weaponType: 'rifles', range: '15 squares', weight: 4 } };
  assert.deepEqual(compat.canonicalWeaponStateOf(legacy), { state: 'legacy' });
  const r = eng.canInstallUpgrade(legacy, 'rapid_recycler');
  assert.ok(!reason(r).startsWith('weapon_') && !reason(r).startsWith('canonical_'), 'no invented canonical restriction for a genuine custom weapon');
  ok('9. genuine legacy / custom weapon: no canonical restriction is invented, no refusal from the canonical gate');
}
{
  const ghost = prod('weapon-sniper-blaster-rifle');
  ghost.flags.swse.canonicalWeapon.identityKey = 'weapon-does-not-exist';
  const r = eng.canInstallUpgrade(ghost, 'cheater');
  assert.equal(r.allowed, false); assert.equal(r.reason, 'canonical_unresolved:identity_unresolvable');
  assert.equal(compat.canonicalWeaponStateOf(ghost).state, 'unresolved');
  ok('10. a stamp naming a nonexistent identity is refused, not treated as legacy');
}
{
  const sniper = prod('weapon-sniper-blaster-rifle'); const pistol = prod('weapon-blaster-pistol');
  rt.resetSharedWeaponAuthorityRegistry();
  try {
    const r = eng.canInstallUpgrade(sniper, 'cheater');
    assert.equal(r.allowed, false); assert.equal(r.reason, 'canonical_unresolved:registry_not_loaded');
    assert.equal(eng.canInstallUpgrade(pistol, 'rapid_recycler').allowed, false);
    // a weapon that declares nothing is still legacy while the registry is down
    assert.equal(compat.canonicalWeaponStateOf({ id: 'l', name: 'x', type: 'weapon', flags: {}, system: {} }).state, 'legacy');
  } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  ok('11. canonically stamped weapon while the shared registry is unavailable: refused (registry restored afterwards)');
}
{
  assert.equal(eng.canInstallUpgrade(prod('weapon-sniper-blaster-rifle'), 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  assert.equal(eng.canInstallUpgrade(prod('weapon-blaster-pistol'), 'rapid_recycler').allowed, true);
  ok('12. normal compatibility resumes once the valid registry is restored');
}
{
  const ghost = prod('weapon-blaster-pistol');
  ghost.flags.swse.canonicalWeapon.identityKey = 'weapon-does-not-exist';
  const actor = mkActor([ghost]);
  writes.length = 0;
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor, itemId: ghost.id, upgradeId: 'cheater' }), /canonical_unresolved|not found or not applicable/);
  const prev = wf.installRemoveEngine.previewInstall(actor, ghost, 'cheater');
  assert.equal(prev.success, false); assert.equal(prev.reason, 'canonical_unresolved:identity_unresolvable');
  const applied = await wf.installRemoveEngine.applyInstall(actor, ghost, 'cheater', { mechanicsTotal: 99 });
  assert.equal(applied.success, false);
  rt.resetSharedWeaponAuthorityRegistry();
  try {
    const s2 = prod('weapon-blaster-pistol');
    const a2 = mkActor([s2]);
    await assert.rejects(() => UpgradeService.applyUpgrade({ actor: a2, itemId: s2.id, upgradeId: 'cheater' }));
    assert.equal((await wf.installRemoveEngine.applyInstall(a2, s2, 'cheater', { mechanicsTotal: 99 })).success, false);
  } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  assert.deepEqual(writes, []);
  assert.equal(actor.system.credits, 99999);
  ok('13. direct service / install entry points charge nothing and write nothing when canonical resolution fails');
}

// ---- Round 2: the record is authoritative; every canonical hint counts ------------------------------------------------------------------------
{
  // forged mutable category cannot turn a canonical non-blaster into a blaster
  for (const k of ['weapon-darter', 'weapon-vibroblade']) {
    const forged = prod(k); forged.system.category = 'blaster';
    assert.equal(eng.canInstallUpgrade(forged, 'rapid_recycler').reason, 'category_mismatch', `${k} with forged category blaster`);
    assert.equal(eng.canInstallUpgrade(forged, 'bipod').reason, 'category_mismatch');
  }
  const real = prod('weapon-sniper-blaster-rifle'); assert.equal(real.system.category, 'weapon');
  assert.equal(eng.canInstallUpgrade(real, 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  const forgedSniper = prod('weapon-sniper-blaster-rifle'); forgedSniper.system.category = 'blaster';
  assert.equal(eng.canInstallUpgrade(forgedSniper, 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  // a genuine legacy blaster-category weapon keeps the published category behaviour
  const legacyBlaster = { id: 'lb', name: 'Homebrew', type: 'weapon', flags: {}, system: { category: 'blaster', weaponCategory: 'ranged', weaponType: 'pistols', range: '15 squares' } };
  assert.equal(compat.canonicalWeaponStateOf(legacyBlaster).state, 'legacy');
  assert.notEqual(eng.canInstallUpgrade(legacyBlaster, 'rapid_recycler').reason, 'category_mismatch');
  ok('15. forged system.category cannot override the canonical record (Darter / Vibroblade stay non-blasters); legacy weapons keep category behaviour');
}
{
  const sourceOnly = (identityKey) => { const it = prod(identityKey); it.flags = {}; it._stats = { compendiumSource: `Compendium.foundryvtt-swse.weapons.${idOf(identityKey)}` }; return it; };
  const sniper = sourceOnly('weapon-sniper-blaster-rifle');
  const pistol = sourceOnly('weapon-blaster-pistol');
  const a = mkActor([sniper, pistol]);
  assert.equal(compat.canonicalWeaponStateOf(sniper).state, 'canonical', 'source-id-only resolves through the production-id index');
  assert.equal(eng.canInstallUpgrade(sniper, 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  rt.resetSharedWeaponAuthorityRegistry();
  try {
    assert.deepEqual(compat.canonicalWeaponStateOf(sniper), { state: 'unresolved', reason: 'registry_not_loaded' });
    assert.equal(eng.canInstallUpgrade(sniper, 'cheater').reason, 'canonical_unresolved:registry_not_loaded');
    assert.equal(eng.canInstallUpgrade(pistol, 'rapid_recycler').allowed, false);
    const flagSourceId = prod('weapon-blaster-pistol'); flagSourceId.flags = { core: { sourceId: `Compendium.foundryvtt-swse.weapons.${idOf('weapon-blaster-pistol')}` } };
    assert.equal(compat.canonicalWeaponStateOf(flagSourceId).state, 'unresolved');
    assert.equal(compat.canonicalWeaponStateOf({ id: 'l', name: 'x', type: 'weapon', flags: {}, system: {} }).state, 'legacy');
    writes.length = 0;
    await assert.rejects(() => UpgradeService.applyUpgrade({ actor: a, itemId: sniper.id, upgradeId: 'cheater' }));
    assert.equal((await wf.installRemoveEngine.applyInstall(a, pistol, 'rapid_recycler', { mechanicsTotal: 99 })).success, false);
    assert.deepEqual(writes, []); assert.equal(a.system.credits, 99999);
  } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  assert.equal(compat.canonicalWeaponStateOf(sniper).state, 'canonical');
  assert.equal(eng.canInstallUpgrade(sniper, 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  assert.equal(eng.canInstallUpgrade(pistol, 'rapid_recycler').allowed, true);
  ok('16. source-id-only canonical Items: unresolved when the registry is missing (no cost, no write), resolved and enforced once it is restored');
}
{
  const BLASTERS = [
    "weapon-arc-9965-blaster",
    "weapon-ascension-gun",
    "weapon-assault-blaster-rifle",
    "weapon-aurial-blaster",
    "weapon-blaster-cannon",
    "weapon-blaster-carbine",
    "weapon-blaster-pistol",
    "weapon-blaster-rifle",
    "weapon-bluebolt-blaster-pistol",
    "weapon-bryar-pistol",
    "weapon-commando-special-rifle",
    "weapon-defender-microblaster",
    "weapon-dh-23-blaster-pistol",
    "weapon-dlt-20a-longblaster",
    "weapon-double-barreled-blaster-carbine",
    "weapon-dt-12-heavy-blaster",
    "weapon-e-web-repeating-blaster",
    "weapon-espo-500-riot-gun",
    "weapon-firelance-blaster-rifle",
    "weapon-heavy-assault-blaster",
    "weapon-heavy-blaster-cannon",
    "weapon-heavy-blaster-pistol",
    "weapon-heavy-blaster-rifle",
    "weapon-heavy-repeating-blaster",
    "weapon-heavy-variable-blaster",
    "weapon-hold-out-blaster-pistol",
    "weapon-hunting-blaster-carbine",
    "weapon-ion-carbine",
    "weapon-light-repeating-blaster",
    "weapon-model-434-deathhammer",
    "weapon-repeating-blaster-carbine",
    "weapon-rotary-blaster-cannon",
    "weapon-sg-4-blaster-rifle",
    "weapon-siang-lance",
    "weapon-sidearm-blaster-pistol",
    "weapon-snap-shot-blaster-pistol",
    "weapon-sniper-blaster-rifle",
    "weapon-sporting-blaster-carbine",
    "weapon-sporting-blaster-pistol",
    "weapon-sporting-blaster-rifle",
    "weapon-subrepeating-blaster",
    "weapon-targeting-blaster-rifle",
    "weapon-variable-blaster",
    "weapon-wrist-blaster"
  ];
  const t = (r) => compat.isBlasterFamily(r);
  const found = registryData.identities.filter(t).map((r) => r.identityKey).sort();
  assert.equal(registryData.identities.length, 203);
  assert.deepEqual(found, BLASTERS, 'the family-token blaster set over the current 203-weapon registry is exactly this list');
  for (const k of ['weapon-darter', 'weapon-vibroblade', 'weapon-bowcaster', 'weapon-slugthrower-rifle', 'weapon-ion-rifle', 'weapon-sonic-pistol', 'weapon-bryar-rifle']) assert.ok(!found.includes(k), `${k} is not a catalog blaster`);
  // ranged-energy is grounded in structured properties, not family membership
  for (const r of registryData.identities.filter(t)) assert.equal(compat.isRangedEnergy(r), r.canonicalStats.range.mode === 'ranged' && r.canonicalStats.damageType.types.includes('energy'), r.identityKey);
  const fam = { selectors: { families: ['weapon-family:blaster-pistol'] } };
  assert.equal(compat.isRangedEnergy({ ...fam, canonicalStats: { range: { mode: 'melee' }, damageType: { types: ['energy'] } } }), false);
  assert.equal(compat.isRangedEnergy({ ...fam, canonicalStats: { range: { mode: 'ranged' }, damageType: { types: ['sonic'] } } }), false);
  assert.equal(compat.isRangedEnergy({ ...fam, canonicalStats: { range: { mode: 'ranged' }, damageType: { types: ['energy'] } } }), true);
  assert.notEqual(eng.canInstallUpgrade(prod('weapon-blaster-pistol'), 'ion_charger').reason, 'requires_ranged_energy');
  const legacyRifle = { id: 'lr', name: 'Homebrew', type: 'weapon', flags: {}, system: { category: 'blaster', weaponCategory: 'ranged', weaponType: 'rifles', range: '15 squares' } };
  assert.equal(eng.canInstallUpgrade(legacyRifle, 'ion_charger').reason, 'requires_ranged_energy', 'legacy behaviour unchanged');
  ok('17. family-token blaster set is pinned against the 203-weapon registry; ranged-energy needs ranged + energy damage, not just the family');
}

{
  // integration: a canonical, blaster-classified weapon whose RECORD is not ranged-energy cannot pass through a forged mutable weaponSubtype
  const data = JSON.parse(JSON.stringify(registryData));
  const base = data.identities.find((r) => r.identityKey === 'weapon-blaster-pistol');
  const sonic = JSON.parse(JSON.stringify(base)); sonic.identityKey = 'weapon-test-sonic-blaster';
  sonic.canonicalStats.damageType = { mode: 'single', qualifiers: [], types: ['sonic'] };
  data.identities.push(sonic);
  const synth = new rt.WeaponAuthorityRegistry(data);
  rt.setSharedWeaponAuthorityRegistry(synth);
  try {
    const mk = (identityKey, subtype) => { const it = prod('weapon-blaster-pistol'); it.flags.swse.canonicalWeapon.identityKey = identityKey; it.system.weaponSubtype = subtype; it.system.weaponType = subtype; return it; };
    const forged = mk('weapon-test-sonic-blaster', 'ranged_energy');
    assert.equal(compat.canonicalWeaponStateOf(forged).blaster, true);
    assert.equal(compat.canonicalWeaponStateOf(forged).rangedEnergy, false);
    assert.equal(eng.canInstallUpgrade(forged, 'ion_charger').reason, 'requires_ranged_energy', 'forged weaponSubtype must not satisfy ranged_energy');
    assert.equal(eng.canInstallUpgrade(forged, 'rapid_recycler').allowed, true, 'a plain ranged requirement is unaffected');
    const real = mk('weapon-blaster-pistol', 'melee_generic');
    assert.notEqual(eng.canInstallUpgrade(real, 'ion_charger').reason, 'requires_ranged_energy', 'the record, not the subtype, grants ranged-energy');
  } finally { rt.setSharedWeaponAuthorityRegistry(registry); }
  ok('18. forged weaponSubtype cannot satisfy ranged_energy for a canonical blaster whose record is not energy (and a melee-looking subtype cannot revoke it)');
}

// ---- pure helpers ------------------------------------------------------------------------------------------------------------------------------
{
  assert.equal(compat.normalizeUpgradeKey('Rapid Recycler'), 'rapid_recycler');
  assert.equal(compat.normalizeUpgradeKey('rapid-recycler'), 'rapid_recycler');
  assert.deepEqual([...compat.upgradeRestrictionsOf({ upgradeRestrictions: ['rapid-recycler'] })], ['rapid_recycler']);
  assert.equal(compat.upgradeRestrictionsOf(null).size, 0);
  assert.equal(compat.weaponUpgradeAllowance({}, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, false);
  assert.equal(compat.weaponUpgradeAllowance({ surveillanceTaggerCompatible: true }, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, true);
  assert.equal(compat.weaponUpgradeAllowance({ surveillanceTaggerCompatible: false }, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, false);
  assert.equal(compat.isBlasterFamily({ selectors: { families: ['weapon-family:blaster-pistol'] } }), true);
  assert.equal(compat.isBlasterFamily({ selectors: { families: ['weapon-family:e-web-repeating-blaster'] } }), true);
  assert.equal(compat.isBlasterFamily({ selectors: { families: ['weapon-family:sniper-rifle'] } }), false);
  assert.equal(compat.isBlasterFamily({}), false);
  ok('pure helpers: key normalization, empty defaults, capability acceptance requires an explicit true, blaster family tokens');
}
console.log(`weapon-phase-5d-i-d-b3-upgrades: ${step} checks OK`);
