import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry, registryData, resolve, actor, resolver, stamped } from './helpers/weapon-runtime-fixture.mjs';
import { resolveProficiency, getProfile, WeaponRuntimeError } from '../scripts/items/weapon-runtime/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prof = (key, a, { profileId, ...ctx } = {}) => {
  const w = resolve(key, profileId ? { profileId } : {});
  return resolveProficiency(w, getProfile(w), a, ctx);
};
const exoticFeat = (n) => `Exotic Weapon Proficiency (${n})`;
const none = actor();

// ---- ordinary groups -------------------------------------------------------------------------------------------------
assert.equal(prof('weapon-blaster-pistol', none).proficient, false);
assert.equal(prof('weapon-blaster-pistol', none).penalty, -5);
assert.equal(prof('weapon-blaster-pistol', actor({ feats: ['Weapon Proficiency (Pistols)'] })).proficient, true);
assert.equal(prof('weapon-blaster-pistol', actor({ feats: ['Weapon Proficiency (Rifles)'] })).proficient, false, 'wrong group never substitutes');
assert.equal(prof('weapon-targeting-blaster-rifle', actor({ groups: ['rifles'] })).proficient, true);
assert.equal(prof('weapon-stun-baton', actor({ feats: ['Weapon Proficiency (Simple Weapons)'] })).proficient, true);
assert.equal(prof('lightsaber-chassis-retrosaber', actor({ feats: ['Weapon Proficiency (Lightsabers)'] })).proficient, true);
assert.equal(prof('weapon-plx-2m-portable-missile-launcher', actor({ feats: ['Weapon Proficiency (Heavy Weapons)'] })).proficient, true);
assert.equal(prof('unmapped::Vibroknucklers', actor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)'] })).proficient, true);

// ---- probes: exotic identity is exact -------------------------------------------------------------------------------
const probes = [
  ['Bowcaster', 'weapon-bowcaster', 'Bowcaster'],
  ['Ryyk Blade', 'weapon-wookiee-ryyk-blade', 'Ryyk Blade'],
  ['Atlatl', 'unmapped::Atlatl', 'Atlatl'],
  ['Cesta', 'unmapped::Cesta', 'Cesta'],
  ['Sith Lanvarok', 'weapon-sith-lanvarok', 'Sith Lanvarok'],
  ['Squib Tensor Rifle', 'weapon-squib-tensor-rifle', 'Squib Tensor Rifle'],
  ['Verpine Shatter Gun', 'weapon-verpine-shattergun', 'Verpine Shatter Gun'],
  ["Tehk'la Blade", 'unmapped::Tehkla Blade', "Tehk'la Blade"],
  ["Arg'garok", 'unmapped::Arggarok', "Arg'garok"],
];
const report = [];
for (const [label, key, ident] of probes) {
  const yes = prof(key, actor({ feats: [exoticFeat(ident)] }));
  assert.equal(yes.proficient, true, `${label} with exact feat`);
  assert.equal(yes.route.kind, 'normal-exotic-feat');
  assert.equal(prof(key, none).proficient, false, `${label} unproficient`);
  // broad inference must fail: neither a group feat nor a different exotic feat grants it
  for (const wrong of [exoticFeat('Some Other Weapon'), 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Simple Weapons)']) {
    const sp = ['Bowcaster'].includes(label) ? 'Wookiee' : '';
    const r = prof(key, actor({ feats: [wrong] }));
    assert.equal(r.proficient, false, `${label} must not be granted by "${wrong}"`);
  }
  report.push(`${label}: exact-feat=true, none=false, wrong-feat=false`);
}
// the exotic feat for one weapon never covers another
assert.equal(prof('weapon-bowcaster', actor({ feats: [exoticFeat('Atlatl')] })).proficient, false);

// ---- species / ability routes (profile-specific) -----------------------------------------------------------------------
// Massassi lanvarok: Massassi + advanced melee covers the MELEE profile only
const massassi = actor({ species: 'Massassi', feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
const lanMelee = prof('weapon-massassi-lanvarok', massassi, { profileId: 'melee' });
const lanDisc = prof('weapon-massassi-lanvarok', massassi, { profileId: 'disc' });
assert.equal(lanMelee.proficient, true); assert.equal(lanMelee.route.kind, 'species-override');
assert.equal(lanDisc.proficient, false, 'profile-specific: disc is not flattened to the melee route');
assert.equal(prof('weapon-massassi-lanvarok', actor({ species: 'Human', feats: ['Weapon Proficiency (Advanced Melee Weapons)'] }), { profileId: 'melee' }).proficient, false);
assert.equal(prof('weapon-massassi-lanvarok', actor({ species: 'Massassi' }), { profileId: 'melee' }).proficient, false, 'route still needs the advanced-melee proficiency');
// Kissai: simple weapons covers both lanvarok varieties
const kissai = actor({ species: 'Kissai', feats: ['Weapon Proficiency (Simple Weapons)'] });
assert.equal(prof('weapon-massassi-lanvarok', kissai, { profileId: 'disc' }).proficient, true);
assert.equal(prof('weapon-massassi-lanvarok', kissai, { profileId: 'melee' }).proficient, true);
assert.equal(prof('weapon-sith-lanvarok', kissai).proficient, true);
// Siang Lance: mode-specific + Siang Lance Mastery treat-as-rifle
assert.equal(prof('weapon-siang-lance', none, { profileId: 'ranged' }).proficient, false);
assert.equal(prof('weapon-siang-lance', actor({ feats: [exoticFeat('Siang Lance')] }), { profileId: 'ranged' }).proficient, true);
assert.equal(prof('weapon-siang-lance', actor({ feats: [exoticFeat('Siang Lance')] }), { profileId: 'bayonet-aao' }).proficient, false, 'bayonet needs simple, not the exotic feat');
assert.equal(prof('weapon-siang-lance', actor({ feats: ['Weapon Proficiency (Simple Weapons)'] }), { profileId: 'bayonet-aao' }).proficient, true);
const mastery = prof('weapon-siang-lance', actor({ talents: ['Siang Lance Mastery'], feats: ['Weapon Proficiency (Rifles)'] }), { profileId: 'ranged' });
assert.equal(mastery.proficient, true); assert.equal(mastery.route.kind, 'ability-override'); assert.equal(mastery.route.attackBonus, 1);
assert.equal(prof('weapon-siang-lance', actor({ talents: ['Siang Lance Mastery'] }), { profileId: 'ranged' }).proficient, false, 'treat-as-rifle still needs rifle proficiency');
assert.equal(prof('weapon-siang-lance', actor({ talents: ['Siang Lance Mastery'], feats: ['Weapon Proficiency (Rifles)'] }), { profileId: 'bayonet-aao' }).proficient, false, 'ability route is branch-scoped');
// other species routes
assert.equal(prof('weapon-wookiee-ryyk-blade', actor({ species: 'Wookiee', feats: ['Weapon Proficiency (Advanced Melee Weapons)'] })).proficient, true);
assert.equal(prof('unmapped::Atlatl', actor({ species: 'Gungan', feats: ['Weapon Proficiency (Simple Weapons)'] })).proficient, true);
// Electropole: both profiles advanced-melee (profile-specific data), Gungan simple route
assert.equal(prof('weapon-gungan-electropole', actor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)'] }), { profileId: 'thrown' }).requiredGroup, 'advanced-melee');

// ---- 5B-R: structured Gungan routes on the corrected profiles ---------------------------------------------------------
const gungan = actor({ species: 'Gungan', feats: ['Weapon Proficiency (Simple Weapons)'] });
assert.equal(prof('weapon-gungan-electropole', gungan, { profileId: 'melee' }).proficient, true, 'Electropole melee: Gungan + simple');
assert.equal(prof('weapon-gungan-electropole', gungan, { profileId: 'thrown' }).proficient, true, 'Electropole thrown: Gungan + simple');
assert.equal(prof('weapon-gungan-electropole', actor({ species: 'Gungan' }), { profileId: 'melee' }).proficient, false, 'route still needs Weapon Proficiency (simple weapons)');
assert.equal(prof('weapon-gungan-electropole', actor({ species: 'Human', feats: ['Weapon Proficiency (Simple Weapons)'] }), { profileId: 'melee' }).proficient, false);
for (const key of ['unmapped::Atlatl', 'unmapped::Cesta']) {
  assert.equal(prof(key, gungan, { profileId: 'launcher' }).proficient, true, `${key} launcher Gungan route`);
  assert.equal(prof(key, gungan, { profileId: 'primary' }).proficient, true, `${key} melee Gungan route`);
  assert.equal(prof(key, none, { profileId: 'launcher' }).proficient, false);
  assert.equal(prof(key, actor({ feats: [exoticFeat(key.endsWith('Atlatl') ? 'Atlatl' : 'Cesta')] }), { profileId: 'launcher' }).proficient, true);
}
// Shock Stick: handheld needs advanced melee; mounted waives it when the host rifle is proficient (PROMPT if unknown)
const shockHeld = resolve('unmapped::Shock Stick');
assert.equal(resolveProficiency(shockHeld, getProfile(shockHeld), none).proficient, false);
const shockMounted = resolve('unmapped::Shock Stick', { configurationId: 'mounted-bayonet' });
const sm0 = resolveProficiency(shockMounted, getProfile(shockMounted), none);
assert.equal(sm0.proficient, false); assert.deepEqual(sm0.pending.map((p) => p.promptId), ['host-rifle-proficiency']);
const sm1 = resolveProficiency(shockMounted, getProfile(shockMounted), none, { hostRifleProficient: true });
assert.equal(sm1.proficient, true); assert.equal(sm1.route.kind, 'mounted-host-rifle-proficiency'); assert.equal(sm1.pending.length, 0);
assert.equal(resolveProficiency(shockMounted, getProfile(shockMounted), none, { hostRifleProficient: false }).proficient, false);
assert.equal(resolveProficiency(shockHeld, getProfile(shockHeld), none, { hostRifleProficient: true }).proficient, false, 'waiver applies only while mounted');
// Amphistaff forms keep the exact Exotic identity across every profile
const ampW = resolve('unmapped::Amphistaff', { configurationId: 'spear', profileId: 'spear-thrown' });
assert.equal(resolveProficiency(ampW, getProfile(ampW), actor({ feats: [exoticFeat('Amphistaff')] })).proficient, true);
assert.equal(resolveProficiency(ampW, getProfile(ampW), none).proficient, false);

// ---- explicit integration inputs, system.proficient never drives canonical -----------------------------------------------
assert.equal(prof('weapon-bowcaster', none, { proficiencyIntegrations: { ignoresProficiencyPenalty: true } }).route.kind, 'integration:implant');
assert.equal(prof('weapon-bowcaster', none, { proficiencyIntegrations: { spacehoundVehicleWeapon: true } }).route.kind, 'integration:spacehound');
const flagged = { items: [], system: { proficient: true } };
assert.equal(prof('weapon-bowcaster', flagged).proficient, false, 'system.proficient is legacy-only');
const w = resolver.resolve({ ...stamped('weapon-bowcaster'), system: { proficient: true } });
assert.equal(resolveProficiency(w, getProfile(w), none).proficient, false);

// ---- purity: no actor-dependent state in result lifetime or registry -----------------------------------------------------
const a1 = actor({ feats: [exoticFeat('Bowcaster')] });
assert.equal(prof('weapon-bowcaster', a1).proficient, true);
a1.items.length = 0; // actor changes -> next call must reflect it (nothing cached)
assert.equal(prof('weapon-bowcaster', a1).proficient, false);
assert.ok(!JSON.stringify(registryData).includes('"proficient":'), 'registry stores no per-actor proficiency');
const src = fs.readFileSync(path.join(ROOT, 'scripts/items/weapon-runtime/proficiency-resolver.js'), 'utf8');
assert.ok(!/system\??\.proficient\b/.test(src.replace(/\/\/.*$/gm, '')), 'resolver never reads system.proficient');

// conditional routes are never auto-applied
const sword = prof('weapon-sith-sword', none);
assert.equal(sword.requiredGroup, 'simple');
console.log(report.join('\n'));
console.log('weapon-runtime-proficiency: ok');
