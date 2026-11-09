import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate audit W7 (section 5): peripheral attack/damage entrypoints. A reachable initiator must never build a canonical
// weapon's damage from the Item-level `system.damage` field. SWSECombat (window.SWSECombat / macros) and CombatUIAdapter.rollDamageUI are
// reachable only through globals/imports, not the sheet; for canonical weapons they redirect to the sheet's own entry points (SWSERoll).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = { combat: null, user: { targets: new Set(), isGM: true }, settings: { get: () => false } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { SWSECombat, isCanonicalHintedWeapon } = await import('/systems/foundryvtt-swse/scripts/combat/systems/enhanced-combat-system.js');
const { SWSERoll } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js');
const { CombatEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/CombatEngine.js');
const { CombatUIAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/combat/ui/CombatUIAdapter.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

const canon = (k, damage = '9d9') => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage, damageType: 'sonic' } });
const legacy = { id: 'hb', name: 'Homebrew', type: 'weapon', flags: {}, system: { damage: '2d6', weaponCategory: 'ranged' } };
const attacker = { id: 'a1', name: 'A', type: 'character', items: [], getRollData: () => ({}), system: {} };

test('W7: canonical vs legacy classification used by the redirect', () => {
  assert.equal(isCanonicalHintedWeapon(canon('weapon-blaster-pistol')), true);
  assert.equal(isCanonicalHintedWeapon(canon('weapon-does-not-exist')), true, 'a canonical hint that no longer resolves reaches the canonical gate, never a legacy fallback');
  assert.equal(isCanonicalHintedWeapon(legacy), false);
});

test('W7: SWSECombat.rollDamage / CombatUIAdapter.rollDamageUI route a canonical weapon to SWSERoll.rollDamage, not the Item damage field', async () => {
  const calls = [];
  const orig = SWSERoll.rollDamage;
  SWSERoll.rollDamage = async (actor, weapon, options) => { calls.push({ weaponId: weapon.id, options }); return { total: 7, swseDamageFormula: '3d6+2' }; };
  const safe = globalThis.SWSE; let legacyRolled = false;
  globalThis.SWSE = { ...(safe ?? {}), RollEngine: { safeRoll: async () => { legacyRolled = true; return { total: 99 }; } } };
  try {
    const w = canon('weapon-blaster-pistol');
    const a = await SWSECombat.rollDamage(attacker, w, { id: 't1' }, {});
    assert.equal(calls.length, 1); assert.equal(a.canonical, true); assert.equal(a.formula, '3d6+2'); assert.equal(legacyRolled, false);
    const b = await CombatUIAdapter.rollDamageUI(attacker, w, { id: 't1' }, {});
    assert.equal(calls.length, 2); assert.equal(b.canonical, true); assert.equal(legacyRolled, false);
  } finally { SWSERoll.rollDamage = orig; globalThis.SWSE = safe; }
});

test('W7: SWSECombat.rollAttack routes a canonical weapon to SWSERoll.rollAttack and never reaches CombatEngine.resolveAttack', async () => {
  const origA = SWSERoll.rollAttack, origE = CombatEngine.resolveAttack; const seen = [];
  SWSERoll.rollAttack = async (actor, weapon, options) => { seen.push({ weaponId: weapon.id, target: options.target?.id }); return { ok: true }; };
  CombatEngine.resolveAttack = async () => { throw new Error('legacy CombatEngine.resolveAttack must not run for a canonical weapon'); };
  try {
    const r = await SWSECombat.rollAttack(attacker, canon('weapon-blaster-pistol'), { id: 't1' }, {});
    assert.deepEqual(r, { ok: true }); assert.deepEqual(seen, [{ weaponId: 'w-weapon-blaster-pistol', target: 't1' }]);
  } finally { SWSERoll.rollAttack = origA; CombatEngine.resolveAttack = origE; }
});

test('W7 tripwire: only the audited legacy/custom adapters build a damage formula from the Item-level damage field', () => {
  // each approved site is a legacy/custom branch (canonical weapons are redirected or branch earlier); a NEW site must be reviewed and added here
  const APPROVED = new Set([
    'scripts/combat/systems/enhanced-combat-system.js',   // legacy branch below the canonical redirect
    'scripts/engine/combat/ui/CombatUIAdapter.js',        // legacy branch below the canonical redirect
    'scripts/engine/combat/CombatEngine.js',              // reached only via SWSECombat.rollAttack, which redirects canonical weapons first
    'scripts/combat/rolls/enhanced-rolls.js',             // Burst Fire branch is the `else` of `if (isCanonical)`
    'scripts/engine/rules/modules/core/damage-rule.js',   // rules-module tree: no importer outside engine/rules/modules (static); not removed without runtime proof
  ]);
  const re = /system\??\.damage\s*\?\?\s*['"]1d6['"]|combat\??\.damage\??\.dice\s*\?\?\s*['"]1d6['"]/;
  const found = [];
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js') && re.test(fs.readFileSync(p, 'utf8'))) found.push(path.relative(root, p)); } };
  walk(path.join(root, 'scripts'));
  const unapproved = found.filter((f) => !APPROVED.has(f));
  assert.deepEqual(unapproved, [], `new production Item-level damage formula builder(s): ${unapproved.join(', ')}`);
});
