import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry, registryData, resolver, stamped, resolve, REGISTRY_PATH } from './helpers/weapon-runtime-fixture.mjs';
import { WeaponAuthorityRegistry, WeaponRuntimeError, resolveSelected, resolveDamageProfile, resolveRange, resolveResource, getProfile, reconcileProfiles, WeaponRuntimeResolver } from '../scripts/items/weapon-runtime/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const throwsCode = (fn, code) => assert.throws(fn, (e) => e instanceof WeaponRuntimeError && e.code === code, `expected ${code}`);

// ---- registry / builder -------------------------------------------------------------------------------------------
assert.equal(registry.size, 203);
assert.equal(registryData.counts.repoPresent, 151);
assert.equal(registryData.counts.repoMissing, 52);
assert.equal(new Set(registryData.identities.map((i) => i.identityKey)).size, 203, 'no duplicate identities');
const b3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-3b-canonical-authority.json'), 'utf8'));
const h4 = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audits/item-weapons-phase-4h-global-semantic-authority.json'), 'utf8'));
assert.deepEqual(b3.identities.map((i) => i.identityKey).sort(), registry.getAll().map((i) => i.identityKey).sort(), '0 missing 3B joins');
assert.deepEqual(h4.records.map((i) => i.identityKey).sort(), registry.getAll().map((i) => i.identityKey).sort(), '0 missing 4H joins');
const out = execFileSync('node', ['tools/build-weapon-runtime-registry.mjs', '--check'], { cwd: ROOT }).toString();
assert.match(out, /registry current/);
assert.ok(Object.isFrozen(registry.getByIdentityKey('weapon-bowcaster')));
assert.throws(() => { 'use strict'; registry.getByIdentityKey('weapon-bowcaster').canonicalName = 'x'; }, TypeError);
assert.equal(registry.getIdentityKeyByProductionId('weapon-bowcaster'), 'weapon-bowcaster');
assert.equal(registry.getIdentityKeyByProductionId('nope'), null);

// duplicate identity / bad index fail closed
throwsCode(() => new WeaponAuthorityRegistry({ identities: [{ identityKey: 'a' }, { identityKey: 'a' }] }), 'registry-invalid');
throwsCode(() => new WeaponAuthorityRegistry({ identities: [{ identityKey: 'a' }], productionIdIndex: { p: 'zz' } }), 'registry-invalid');

// no actor-dependent / owned state in the registry
const text = fs.readFileSync(REGISTRY_PATH, 'utf8');
for (const forbidden of ['"currentAmmo"', '"effectiveProficiency"', '"actorProficiencyRevision"', '"equipped"', '"ammunition":{"type":"","current"']) {
  assert.ok(!text.includes(forbidden), `registry must not contain ${forbidden}`);
}

// ---- all 203 identities resolve canonically, zero heuristics ---------------------------------------------------------
let heuristicHits = 0, incomplete = [];
for (const rec of registry.getAll()) {
  const w = resolve(rec.identityKey);
  assert.equal(w.source, 'canonical');
  heuristicHits += w.heuristics.length + w.diagnostics.heuristics.length;
  assert.ok(w.profiles.length >= 1 && w.profiles.every((p) => p.executable === true));
  assert.ok(w.profiles.some((p) => p.id === w.defaultProfileId));
  assert.equal(w.selection.profileId, w.defaultProfileId, 'no profileId -> canonical default');
  assert.ok(Object.isFrozen(w) && Object.isFrozen(w.profiles) && Object.isFrozen(w.selection));
  const s = resolveSelected(w, { items: [] });
  assert.equal(s.profile.id, w.defaultProfileId);
  assert.ok(s.damage.components.length >= 1);
  if (w.diagnostics.profileDefinitionIncomplete) incomplete.push(rec.identityKey);
}
assert.equal(heuristicHits, 0);
assert.deepEqual(incomplete.sort(), [
  'unmapped::Amphistaff', 'unmapped::Atlatl', 'unmapped::Cesta', 'unmapped::Shock Stick', 'unmapped::Vibrobayonet',
  'weapon-gungan-electropole', 'weapon-plx-2m-portable-missile-launcher',
].sort());

// ---- identity resolution: stamp / source id, never name -----------------------------------------------------------
assert.equal(resolver.resolve(stamped('weapon-bowcaster')).identity.via, 'flag-stamp');
const viaSource = { name: 'Totally Different', flags: {}, _stats: { compendiumSource: 'Compendium.foundryvtt-swse.weapons.Item.weapon-bowcaster' }, system: {} };
assert.equal(resolver.resolve(viaSource).identity.identityKey, 'weapon-bowcaster');
assert.equal(resolver.resolve(viaSource).identity.via, 'source-id');
// name alone must never canonicalize
const byNameOnly = { name: 'Bowcaster', flags: {}, system: { description: 'Bowcaster', weaponGroup: 'Exotic' } };
assert.equal(resolver.resolve(byNameOnly).source, 'legacy');
// synthetic stamps cover the 52 repo-missing identities
const missing = registry.getAll().filter((r) => !r.repo.present);
assert.equal(missing.length, 52);
for (const r of missing) assert.equal(resolver.resolve(stamped(r.identityKey)).identity.identityKey, r.identityKey);

// ---- fail-closed errors --------------------------------------------------------------------------------------------
throwsCode(() => resolver.resolve(stamped('weapon-not-in-registry')), 'canonical-registry-entry-missing');
const brokenReg = new WeaponAuthorityRegistry({ identities: [{ identityKey: 'weapon-bowcaster', canonicalStats: {} }] });
throwsCode(() => new WeaponRuntimeResolver(brokenReg).resolve(stamped('weapon-bowcaster')), 'canonical-registry-entry-corrupt');
throwsCode(() => resolve('weapon-bowcaster', { profileId: 'nope' }), 'unknown-profile-id');
throwsCode(() => resolve('weapon-wrist-rocket-launcher', { payloadId: 'nope' }), 'unknown-payload-id');
throwsCode(() => resolve('lightsaber-chassis-retrosaber', { configurationId: 'nope' }), 'unknown-configuration-id');
// selector-only mode is never promoted to an executable profile
throwsCode(() => resolve('unmapped::Amphistaff', { profileId: 'venom-spit' }), 'profile-not-executable');
// explicit valid profile is selected; none -> default
assert.equal(resolve('weapon-massassi-lanvarok', { profileId: 'melee' }).selection.profileId, 'melee');
assert.equal(resolve('weapon-massassi-lanvarok').selection.profileId, 'disc');
// resolveSafe never degrades to legacy
const safe = resolver.resolveSafe(stamped('weapon-not-in-registry'));
assert.equal(safe.source, 'error');
assert.ok(safe.error instanceof WeaponRuntimeError);

// ---- legacy boundary: canonical weapons never touch the legacy adapter ----------------------------------------------
let legacyCalls = 0;
const spyResolver = new WeaponRuntimeResolver(registry, { legacyAdapter: (item) => { legacyCalls++; return { source: 'legacy', item }; } });
for (const rec of registry.getAll()) spyResolver.resolve(stamped(rec.identityKey));
assert.equal(legacyCalls, 0, 'legacy adapter must not run for canonical weapons');
const legacy = spyResolver.resolve({ name: 'Homebrew Blaster', flags: {}, system: {} });
assert.equal(legacyCalls, 1);
const realLegacy = resolver.resolve({ name: 'Homebrew Blaster', flags: {}, system: { weaponCategory: 'ranged', proficiency: 'pistols' } });
assert.equal(realLegacy.source, 'legacy');
assert.ok(realLegacy.heuristics.length > 0);
assert.equal(realLegacy.identity, null);

// ---- profile reconciliation / seven incomplete identities -------------------------------------------------------
for (const key of registryData.profileDefinitionIncompleteIdentities) {
  const w = resolve(key);
  assert.equal(w.diagnostics.profileDefinitionIncomplete, true);
  assert.ok(w.diagnostics.unmatchedPhase4HModes.length > 0);
  for (const m of w.diagnostics.unmatchedPhase4HModes) {
    assert.equal(m.selectorOnlyMode, true); assert.equal(m.profileDefinitionIncomplete, true); assert.equal(m.executable, false);
    assert.ok(!w.profiles.some((p) => p.id === m.mode), 'selector-only mode never appears as an executable profile');
  }
}
assert.deepEqual([...resolve('unmapped::Amphistaff').diagnostics.selectorOnlyModes].sort(), ['spear', 'venom-spit', 'whip']);
assert.deepEqual(resolve('unmapped::Atlatl').diagnostics.selectorOnlyModes, ['launcher']);
assert.deepEqual(resolve('unmapped::Cesta').diagnostics.selectorOnlyModes, ['launcher']);
assert.equal(resolve('unmapped::Amphistaff').profiles.length, 1);
// the registry (frozen authorities) is not synthesizing profiles
assert.equal(registry.getByIdentityKey('unmapped::Amphistaff').canonicalStats.attackProfiles.length, 1);
assert.equal(reconcileProfiles([{ id: 'a', schemaFamily: { branch: 'melee' } }], [{ mode: 'x' }, { mode: 'y' }]).status, 'PROFILE_DEFINITION_INCOMPLETE');

// ---- profile family coverage (ordinary, hybrid, double, multi-profile, payload, stun) ---------------------------------
const all = registry.getAll();
const ordinaryMelee = all.find((r) => r.canonicalStats.attackProfiles.length === 1 && r.canonicalStats.attackProfiles[0].schemaFamily.branch === 'melee');
const ordinaryRanged = all.find((r) => r.canonicalStats.attackProfiles.length === 1 && r.canonicalStats.attackProfiles[0].schemaFamily.branch === 'ranged');
assert.equal(resolve(ordinaryMelee.identityKey).profiles[0].branch, 'melee');
assert.equal(resolve(ordinaryRanged.identityKey).profiles[0].branch, 'ranged');
// thrown hybrids: profile-specific branch
const lan = resolve('weapon-massassi-lanvarok');
assert.deepEqual(lan.profiles.map((p) => `${p.id}:${p.branch}`), ['disc:ranged', 'melee:melee']);
assert.deepEqual(resolve('weapon-siang-lance').profiles.map((p) => `${p.id}:${p.branch}`), ['ranged:ranged', 'bayonet-aao:melee']);
assert.deepEqual(resolve('weapon-gungan-electropole').profiles.map((p) => `${p.id}:${p.branch}`), ['melee:melee', 'thrown:ranged']);
// double weapon
assert.deepEqual(resolve('unmapped::Zhaboka').profiles.map((p) => p.id), ['end1', 'end2']);
// multi-profile hybrid (state machine)
assert.deepEqual(resolve('lightsaber-chassis-retrosaber').profiles.map((p) => p.id), ['normal', 'overcharge', 'burnout']);
assert.equal(resolve('lightsaber-chassis-retrosaber', { configurationId: 'overcharge' }).selection.configurationId, 'overcharge');
// payload launchers
const wr = resolve('weapon-wrist-rocket-launcher', { payloadId: 'antipersonnel' });
assert.equal(wr.selection.payloadId, 'antipersonnel');
const wrDmg = resolveDamageProfile(wr, getProfile(wr), {});
assert.equal(wrDmg.components[0].kind, 'payload');
assert.equal(wrDmg.components[0].damage.formula, '3d8');
assert.equal(resolveDamageProfile(resolve('weapon-wrist-rocket-launcher'), getProfile(resolve('weapon-wrist-rocket-launcher')), {}).components[0].requiresPayload, true);
assert.ok(resolve('weapon-concealed-dart-launcher').payloads.length >= 0);
// stun-capable / native-stun-only / alternate-defense
const stunSetting = all.find((r) => r.canonicalStats.attackProfiles[0].stun.capability === 'setting');
const sw = resolve(stunSetting.identityKey);
assert.equal(resolveDamageProfile(sw, getProfile(sw), { damageMode: 'stun' }).damageMode, 'stun');
const nativeOnly = resolve('weapon-stun-pistol');
assert.equal(getProfile(nativeOnly).definition.stun.capability, 'native-stun');
const noStun = resolve('weapon-bowcaster');
throwsCode(() => resolveDamageProfile(noStun, getProfile(noStun), { damageMode: 'stun' }), 'unsupported-damage-mode');
const altDef = all.find((r) => r.canonicalStats.attackProfiles.some((p) => p.attackResolution?.defense && p.attackResolution.defense !== 'reflex'));
assert.ok(altDef, 'alternate-defense profile exists in authority');
assert.notEqual(getProfile(resolve(altDef.identityKey), altDef.canonicalStats.attackProfiles.find((p) => p.attackResolution.defense !== 'reflex').id).definition.attackResolution.defense, 'reflex');

// ---- damage representation (planner E) ----------------------------------------------------------------------------
const andRec = all.find((r) => r.canonicalStats.attackProfiles.some((p) => p.damageType.mode === 'and' && p.damageType.types.length > 1));
const andW = resolve(andRec.identityKey, { profileId: andRec.canonicalStats.attackProfiles.find((p) => p.damageType.mode === 'and' && p.damageType.types.length > 1).id });
const andD = resolveDamageProfile(andW, getProfile(andW), {});
const andBase = andD.components.filter((c) => c.kind === 'base')[0];
assert.ok(andBase.damageTypes.length > 1, 'AND is ONE component carrying all types');
assert.equal(andD.components.filter((c) => c.kind === 'base').length, 1, 'AND never split');
const orRec = all.find((r) => r.canonicalStats.attackProfiles.some((p) => p.damageType.mode === 'or'));
const orP = orRec.canonicalStats.attackProfiles.find((p) => p.damageType.mode === 'or');
const orW = resolve(orRec.identityKey, { profileId: orP.id });
assert.equal(resolveDamageProfile(orW, getProfile(orW), {}).components[0].requiresDamageTypeSelection, true);
assert.equal(resolveDamageProfile(orW, getProfile(orW), { damageType: orP.damageType.types[0] }).components[0].selectedDamageType, orP.damageType.types[0]);
const bowD = resolveDamageProfile(resolve('weapon-bowcaster'), getProfile(resolve('weapon-bowcaster')), {});
assert.equal(bowD.components.length, 1); assert.deepEqual([...bowD.components[0].damageTypes], ['energy', 'piercing'], 'Bowcaster AND = one component, both types');
const singleRec = all.find((r) => { const p = r.canonicalStats.attackProfiles[0]; return p.damageType.mode === 'single' && p.damage.mode === 'dice' && !p.damageComponents.length && r.canonicalStats.attackProfiles.length === 1; });
const single = resolveDamageProfile(resolve(singleRec.identityKey), getProfile(resolve(singleRec.identityKey)), {});
assert.equal(single.components.length, 1); assert.equal(single.components[0].damageTypes.length, 1);
// separate rider only when canonical damageComponents exist (Neuronic Whip)
const whip = resolve('unmapped::Neuronic Whip');
const whipD = resolveDamageProfile(whip, getProfile(whip), {});
assert.ok(whipD.components.some((c) => c.kind === 'profile-component'));
for (const c of whipD.components) assert.equal(typeof c.damage, 'object', 'damage stays structured, never stringified');
// frozen result
assert.ok(Object.isFrozen(single) && Object.isFrozen(single.components));

// ---- range / resource ----------------------------------------------------------------------------------------------
const rg = resolveRange(lan, getProfile(lan, 'disc'));
assert.equal(rg.family, 'thrown-weapons'); assert.equal(rg.inaccurate, true); assert.deepEqual(rg.allowedBands, ['pointBlank', 'short', 'medium']);
assert.equal(resolveRange(lan, getProfile(lan, 'melee')).branch, 'melee');
const arc = all.find((r) => r.identityKey === 'weapon-arc-9965-blaster');
const arcW = resolve(arc.identityKey);
const res = resolveResource(arcW, getProfile(arcW));
assert.equal(res.canonical.capacity, 40);
assert.equal(res.canonical.consumption.autofireUnits, 10, 'Burst/Autofire metadata preserved');
assert.equal(res.owned.ammo.current, null, 'current ammo is owned state, not registry');
assert.equal(resolveRange(resolve('weapon-wrist-rocket-launcher'), getProfile(resolve('weapon-wrist-rocket-launcher'))).resolved, false);
const unresolvedCap = all.find((r) => (r.canonicalStats.resource?.capacityShots ?? r.canonicalStats.ammo?.capacityShots ?? null) === null);
assert.equal(resolveResource(resolve(unresolvedCap.identityKey), getProfile(resolve(unresolvedCap.identityKey))).canonical.capacity, null);
console.log('weapon-runtime-registry-resolver: ok');
