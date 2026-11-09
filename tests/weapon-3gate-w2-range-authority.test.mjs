import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate audit W2: C-RNG-01 (stated distance vs supplied band), C-RNG-02 (caller-supplied penalty vs canonical table),
// C-RNG-04 (hard maximum inside a band). Production authorities: attack-consumer.assertAttackFormResolvable / bandForDistance,
// combat-stat-rules.getRangePenalty. Real canonical registry records; no name heuristics.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { getRangePenalty } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

const canon = (k) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', weaponCategory: 'ranged' } });
const actor = { id: 'a1', type: 'character', items: [], flags: {}, system: {} };
const runtimeOf = (k) => rt.resolveAttackWeaponRuntime(canon(k), {});
const check = (k, o) => rt.assertAttackFormResolvable(runtimeOf(k), { actor, ...o });
const refuses = (k, o) => assert.throws(() => check(k, o), (e) => e?.code?.includes?.('RANGE') || /range|out of range/i.test(e?.message ?? ''));

test('C-RNG-01: a permitted band label cannot cancel a stated distance beyond every band', () => {
  refuses('weapon-blaster-pistol', { rangeBand: 'pointBlank', distanceSquares: 999 });
  refuses('weapon-blaster-pistol', { rangeBand: 'long', distanceSquares: 999 });
});

test('C-RNG-01: contradictory distance + band is refused; consistent and single-source selections are accepted', () => {
  refuses('weapon-blaster-pistol', { rangeBand: 'pointBlank', distanceSquares: 30 }); // 30 squares is Short
  refuses('weapon-blaster-pistol', { rangeBand: 'long', distanceSquares: 30 });
  check('weapon-blaster-pistol', { rangeBand: 'short', distanceSquares: 30 });          // consistent
  check('weapon-blaster-pistol', { rangeBand: 'short' });                                 // band only (theater of mind)
  check('weapon-blaster-pistol', { distanceSquares: 30 });                                // distance only
  check('weapon-blaster-pistol', {});                                                     // unknown is not out of range
  check('weapon-blaster-pistol', { rangeBand: 'pointBlank', distanceSquares: 5 });
});

test('C-RNG-04: a hard maximum inside a band rejects the rest of that band (Defender Microblaster: 3 squares in a 0-20 Point Blank band)', () => {
  check('weapon-defender-microblaster', { distanceSquares: 3 });
  refuses('weapon-defender-microblaster', { distanceSquares: 4 });
  refuses('weapon-defender-microblaster', { distanceSquares: 20 });
  refuses('weapon-defender-microblaster', { rangeBand: 'pointBlank', distanceSquares: 10 });
  const runtime = runtimeOf('weapon-defender-microblaster');
  assert.equal(rt.rangeBandForDistance?.(runtime, actor, 4) ?? null, null);
});

test('C-RNG-02: a bare numeric rangePenalty / modifiers.rangePenalty cannot replace the canonical band penalty', () => {
  const pistol = canon('weapon-blaster-pistol');
  const weaponRuntime = rt.resolveAttackWeaponRuntime(pistol, {});
  const pen = (extra) => getRangePenalty(pistol, { weaponRuntime, rangeBand: 'medium', ...extra });
  assert.equal(pen({}), -5);
  assert.equal(pen({ rangePenalty: 0 }), -5, 'supplied 0 must not erase Medium');
  assert.equal(pen({ modifiers: { rangePenalty: 0 } }), -5);
  assert.equal(getRangePenalty(pistol, { weaponRuntime, rangeBand: 'short', rangePenalty: 5 }), -2, 'supplied +5 must not improve Short');
});

test('C-RNG-02: an explicit, reasoned, GM-authorized adjudication still replaces the penalty; a player cannot assert it', () => {
  const pistol = canon('weapon-blaster-pistol');
  const weaponRuntime = rt.resolveAttackWeaponRuntime(pistol, {});
  const ctx = { weaponRuntime, rangeBand: 'medium', rangeAdjudication: { penalty: -1, reason: 'GM: heavy tailwind' } };
  globalThis.game = { user: { isGM: true } };
  assert.equal(getRangePenalty(pistol, ctx), -1);
  assert.equal(getRangePenalty(pistol, { ...ctx, rangeAdjudication: { penalty: -1 } }), -5, 'no reason: not an adjudication');
  globalThis.game = { user: { isGM: false } };
  assert.equal(getRangePenalty(pistol, ctx), -5, 'non-GM attempt is ignored');
  delete globalThis.game;
});

test('C-RNG-02: legacy (non-canonical) weapons keep their existing Item-level / caller penalty behaviour', () => {
  const legacy = { id: 'hb', name: 'Homebrew', type: 'weapon', system: { weaponCategory: 'ranged', rangePenalty: -7 } };
  assert.equal(getRangePenalty(legacy, { rangeBand: 'long' }), -7);
  assert.equal(getRangePenalty(legacy, { rangeBand: 'long', rangePenalty: -1 }), -1);
});
