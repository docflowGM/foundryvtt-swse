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
