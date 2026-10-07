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
