#!/usr/bin/env node
/**
 * Phase 2 smoke test — character weapon damage packet runtime wiring.
 *
 * Exercises the real `enhanceWeaponDamagePacket` (the function
 * damage-packet-builder.js calls for every weapon-backed packet — see
 * `buildDamagePacket()` in scripts/engine/combat/damage-packet-builder.js)
 * against synthetic v1-shaped base packets and real weapon fixtures, seeded
 * from the actual Phase 1 profile data files. Uses a tiny module-resolver
 * loader (tools/lib/foundry-module-resolver.mjs) so the Foundry-style
 * absolute import specifiers resolve under plain node — the builder and its
 * only dependencies (damage-profile-registry.js, damage-type-rules.js) are
 * dependency-free, so no Foundry runtime is required.
 *
 * Run: node tools/weapon-damage-packet-smoke-test.mjs
 */
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.SWSE_REPO_ROOT = ROOT;
register(pathToFileURL(join(ROOT, 'tools', 'lib', 'foundry-module-resolver.mjs')).href, pathToFileURL(ROOT + '/').href);

const { enhanceWeaponDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/builders/weapon-damage-packet-builder.js');
const { damageProfileRegistry, DAMAGE_PROFILE_DATA_FILES } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-profile-registry.js');

for (const file of DAMAGE_PROFILE_DATA_FILES) {
  damageProfileRegistry.registerProfileData(JSON.parse(readFileSync(join(ROOT, file), 'utf8')));
}

// --- fixtures --------------------------------------------------------------

function weapon(overrides = {}) {
  return { id: overrides.id ?? 'weapon-id', name: overrides.name ?? 'Test Weapon', system: { properties: [], ...overrides.system }, ...overrides };
}

const blasterPistol = weapon({ id: 'w-blaster', name: 'Blaster Pistol', system: { damage: '3d6', damageType: 'energy' } });
const slugthrower = weapon({ id: 'w-slug', name: 'Slugthrower Pistol', system: { damage: '2d6', damageType: 'kinetic', properties: ['Projectile'] } });
const lightsaber = weapon({ id: 'w-saber', name: 'Lightsaber', system: { damage: '2d8', damageType: 'energy', properties: ['Lightsaber'] } });
const netWeapon = weapon({ id: 'w-net', name: 'Net', system: { damage: '-', damageType: '', properties: [] } });
const fragGrenade = weapon({ id: 'w-grenade', name: 'Concussion Grenade', system: { damage: '8d6', damageType: 'kinetic', category: 'grenade' } });
// Snare Rifle is on the Phase 1 character-weapon manualRequired list
// (docs/audits/generated/damage-profile-audit.md) — a real audited example,
// unlike "Harpoon Gun" which is a *vehicle* weapon, not a character one.
const manualRequiredWeapon = weapon({ id: 'w-manual', name: 'Snare Rifle', system: { damage: 'Special', damageType: '', properties: [] } });

// v1-shaped base packet, as buildBaseDamagePacket() in damage-packet-builder.js
// produces it (minimal fields relevant to the builder under test).
function basePacket({ amount = 18, type = 'normal', tags = [], components = null, disposition = {}, flags = {} } = {}) {
  return {
    schema: 'swse.damage.packet.v1',
    amount,
    rawAmount: amount,
    type,
    originalType: type,
    damageTypes: [type],
    originalDamageTypes: [type],
    tags,
    components: components ?? [{ key: 'base-damage', label: 'Base damage', rawAmount: amount, amount, type, damageTypes: [type], originalDamageTypes: [type], tags: [] }],
    disposition: { damageAllowed: true, multiplier: 1, hit: true, ...disposition },
    flags: { areaAttack: false, autofire: false, burstFire: false, ...flags },
    options: { damageComponents: components ?? [] }
  };
}

let passed = 0;
function check(label, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${label}`);
  } catch (err) {
    console.error(`FAIL - ${label}\n  ${err.message}`);
    process.exitCode = 1;
  }
}

// --- 1. Blaster pistol: type energy, tag weapon, not legacy -----------------
check('blaster pistol: energy + weapon tag, not legacy', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'energy' }), { weapon: blasterPistol });
  assert.equal(packet.type, 'energy');
  assert.ok(packet.tags.includes('weapon'));
  assert.ok(!packet.tags.includes('legacy'));
  assert.equal(packet.schema, 'swse.damage.packet.v2');
  assert.equal(packet.delivery, 'weapon');
});

// --- 2. Slugthrower: type kinetic, tag weapon -------------------------------
check('slugthrower: kinetic + weapon tag', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'kinetic' }), { weapon: slugthrower });
  assert.equal(packet.type, 'kinetic');
  assert.ok(packet.tags.includes('weapon'));
});

// --- 3. Lightsaber: energy, weapon+lightsaber tags, DR-bypass tag reaches
//        the component (mitigation's own tag-based bypass check then applies)
check('lightsaber: energy, tags include weapon+lightsaber, tag reaches component', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'energy' }), { weapon: lightsaber });
  assert.equal(packet.type, 'energy');
  assert.ok(packet.tags.includes('weapon'));
  assert.ok(packet.tags.includes('lightsaber'));
  assert.ok(packet.components[0].tags.includes('lightsaber'), 'component must carry the lightsaber tag for damage-reduction-resolver bypass check');
  // Type stays energy (not a separate "lightsaber" type) — resistance/immunity
  // matching against energy is unaffected; only DR bypass is tag-driven.
  assert.equal(packet.components[0].type, 'energy');
});

// --- 4. Ion override: weapon default energy, workflow/options ion wins -----
check('ion override: resolved type ion beats weapon default energy', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'ion' }), { weapon: blasterPistol, options: { damageType: 'ion', ion: true } });
  assert.equal(packet.type, 'ion');
  assert.ok(packet.tags.includes('ion'), `expected 'ion' tag, got ${JSON.stringify(packet.tags)}`);
  assert.ok(!packet.tags.some(t => t.includes(',')), 'no tag may be a comma-joined collapse of multiple tags');
  // Item itself is not mutated.
  assert.equal(blasterPistol.system.damageType, 'energy');
});

// --- 5. Stun override: weapon default energy, workflow/options stun wins ---
check('stun override: resolved type stun beats weapon default energy', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'stun' }), { weapon: blasterPistol, options: { damageType: 'stun', stun: true } });
  assert.equal(packet.type, 'stun');
  assert.equal(blasterPistol.system.damageType, 'energy');
});

// --- 5b. Grenade: profile tags (grenade/explosive/area) must survive intact,
//         not collapse into one garbled comma-joined string.
check('grenade: multi-tag profile flattens into separate tags, not a joined string', () => {
  const packet = enhanceWeaponDamagePacket(basePacket({ type: 'kinetic' }), { weapon: fragGrenade });
  assert.ok(packet.tags.includes('grenade'), `expected 'grenade' tag, got ${JSON.stringify(packet.tags)}`);
  assert.ok(packet.tags.includes('explosive'));
  assert.ok(packet.tags.includes('area'));
  assert.ok(!packet.tags.some(t => t.includes(',')), 'no tag may be a comma-joined collapse of multiple tags');
});

// --- 6. Legacy numeric damage: no weapon -> compatibility wrapper unchanged -
check('legacy numeric damage (no weapon): passthrough unchanged', () => {
  const legacy = basePacket({ type: 'normal', tags: ['legacy'] });
  const packet = enhanceWeaponDamagePacket(legacy, { weapon: null });
  assert.equal(packet, legacy, 'must return the same v1 packet object untouched when no weapon is present');
  assert.equal(packet.schema, 'swse.damage.packet.v1');
});

// --- 7. manualRequired/special weapon: does not crash, falls back safely ---
check('net (manualRequired-by-name, no dice): falls back to v1 packet unchanged', () => {
  const input = basePacket({ type: 'normal' });
  const packet = enhanceWeaponDamagePacket(input, { weapon: netWeapon });
  assert.equal(packet, input);
  assert.equal(packet.schema, 'swse.damage.packet.v1');
});

check('snare rifle (audited manualRequired, "Special" damage string): does not crash, falls back safely', () => {
  const input = basePacket({ type: 'normal' });
  assert.doesNotThrow(() => enhanceWeaponDamagePacket(input, { weapon: manualRequiredWeapon }));
  const packet = enhanceWeaponDamagePacket(input, { weapon: manualRequiredWeapon });
  assert.equal(packet, input, 'manualRequired-by-name weapons must fall back to the unchanged v1 packet regardless of packet amount');
});

// --- 8. Profile gate: only verified profiles can drive output --------------
check('profile gate: manualRequired/inferred registry entries are never wireable', () => {
  assert.equal(damageProfileRegistry.getWireable('vehicleWeapon', 'blaster-cannon-heavy'), null, 'vehicle weapons must stay unwired this phase');
  assert.ok(damageProfileRegistry.getWireable('weapon', 'lightsaber'), 'the curated lightsaber profile must be verified and wireable');
});

// --- 9. rollAndApplyDamage smoking gun: buildDamagePacket must not collapse -
//        weapon-backed damage into { type: "normal", tags: ["legacy"] }.
//        (enhanceWeaponDamagePacket is exactly the hook buildDamagePacket()
//        calls before finalizeDamagePacketForTarget(); this asserts the
//        contract it must uphold for every wireable weapon.)
check('rollAndApplyDamage smoking gun: known weapon never collapses to legacy normal', () => {
  const rolledPacket = basePacket({ type: 'energy' }); // as buildBaseDamagePacket would produce for a known weapon
  const packet = enhanceWeaponDamagePacket(rolledPacket, { weapon: blasterPistol });
  assert.notEqual(packet.type, 'normal');
  assert.ok(!packet.tags.includes('legacy'));
  assert.equal(packet.sourceName, 'Blaster Pistol');
  assert.equal(packet.weaponId ?? packet.sourceId, 'w-blaster');
});

console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error('\nSmoke test FAILED.');
} else {
  console.log('Smoke test passed.');
}
