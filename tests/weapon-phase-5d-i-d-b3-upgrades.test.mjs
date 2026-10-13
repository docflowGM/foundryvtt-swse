import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-B3 -- weapon-side upgrade compatibility (upgradeRestrictions, surveillanceTaggerCompatible / Compatibility, redirectionCrystalCompatibility).
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
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (l) => { step += 1; console.log(`  [${step}] ${l} OK`); };
let uid = 0;
const gun = (identityKey, extra = {}) => ({ id: `w${++uid}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey } } }, system: { category: 'blaster', weaponCategory: 'ranged', weight: 4, ...extra } });
const wf = new CustomizationWorkflow();
const eng = wf.eligibilityEngine;

// 1. The sniper rifle refuses the rapid recycler; the same upgrade is allowed on another blaster.
{
  const sniper = gun('weapon-sniper-blaster-rifle');
  const other = gun('weapon-darter');
  const r = eng.canInstallUpgrade(sniper, 'rapid_recycler');
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'weapon_restriction:rapid_recycler');
  assert.notEqual(eng.canInstallUpgrade(other, 'rapid_recycler').reason, 'weapon_restriction:rapid_recycler');
  const listed = eng.getEligibleUpgrades(sniper).find((u) => u.key === 'rapid_recycler');
  assert.ok(listed && listed.allowed === false, 'listed, refused, with a reason');
  ok('upgradeRestrictions: rapid recycler refused on the Sniper Blaster Rifle by canonical identity (key-normalized), allowed elsewhere');
}

// 2. An unrelated upgrade is untouched, and a legacy / unresolvable weapon declares nothing (unknown is not a refusal).
{
  const sniper = gun('weapon-sniper-blaster-rifle');
  assert.equal(eng.canInstallUpgrade(sniper, 'bipod').reason === undefined || !String(eng.canInstallUpgrade(sniper, 'bipod').reason).startsWith('weapon_'), true);
  const homebrew = { id: 'hb', name: 'Sniper Blaster Rifle', type: 'weapon', flags: {}, system: { category: 'blaster', weaponCategory: 'ranged', weight: 4 } };
  assert.equal(compat.canonicalOperationOfItem(homebrew), null);
  assert.ok(!String(eng.canInstallUpgrade(homebrew, 'rapid_recycler').reason ?? '').startsWith('weapon_'));
  ok('only the listed key is refused; a same-named legacy weapon is not guessed at');
}

// 3. Payload capability: an upgrade that declares requiresWeaponCapability is accepted only by a weapon whose record says so.
{
  UPGRADE_CATALOG.__test_tagger = { key: '__test_tagger', name: 'Test Tagger', category: 'weapon', cost: 0, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requiresWeaponCapability: 'surveillance-tagger', affectedAreas: [] };
  try {
    const darter = gun('weapon-darter');
    const sniper = gun('weapon-sniper-blaster-rifle');
    assert.equal(eng.canInstallUpgrade(darter, '__test_tagger').allowed, true);
    const refused = eng.canInstallUpgrade(sniper, '__test_tagger');
    assert.equal(refused.allowed, false);
    assert.equal(refused.reason, 'weapon_incompatible:surveillance-tagger');
  } finally { delete UPGRADE_CATALOG.__test_tagger; }
  ok('surveillanceTaggerCompatible: a tagger-requiring upgrade is accepted by the Darter and refused by a weapon that does not declare it');
}

// 4. Pure module contract.
{
  assert.equal(compat.normalizeUpgradeKey('Rapid Recycler'), 'rapid_recycler');
  assert.equal(compat.normalizeUpgradeKey('rapid-recycler'), 'rapid_recycler');
  assert.deepEqual([...compat.upgradeRestrictionsOf({ upgradeRestrictions: ['rapid-recycler'] })], ['rapid_recycler']);
  assert.equal(compat.upgradeRestrictionsOf(null).size, 0);
  assert.equal(compat.weaponUpgradeAllowance({}, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, false);
  assert.equal(compat.weaponUpgradeAllowance({ surveillanceTaggerCompatible: true }, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, true);
  assert.equal(compat.weaponUpgradeAllowance({ surveillanceTaggerCompatible: false }, 'x', { requiresWeaponCapability: 'surveillance-tagger' }).ok, false);
  ok('pure helpers: key normalization, empty defaults, capability acceptance requires an explicit true');
}

// 5. The service path refuses before any cost or write.
{
  const { UpgradeService } = await import('/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js');
  const sniper = gun('weapon-sniper-blaster-rifle');
  sniper.isEmbedded = true;
  let writes = 0;
  const actor = { id: 'a', type: 'character', items: { get: (id) => (id === sniper.id ? sniper : null), contents: [sniper] }, system: { credits: 99999 }, update: async () => { writes += 1; } };
  await assert.rejects(() => UpgradeService.applyUpgrade({ actor, itemId: sniper.id, upgradeId: 'rapid_recycler' }), /not allowed: weapon_restriction:rapid_recycler/);
  assert.equal(writes, 0);
  ok('UpgradeService.applyUpgrade refuses the restricted upgrade before any write or cost');
}
console.log(`weapon-phase-5d-i-d-b3-upgrades: ${step} checks OK`);
