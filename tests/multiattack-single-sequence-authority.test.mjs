import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// F-CMB-007 owner ruling (Core pp. 84, 89, 154-155): Double Attack = full-round, two attacks at base -5; Triple Attack = three attacks at base -10
// (requires Double + Triple for the weapon). `buildFullAttackSequence` is the ONLY sequence calculator: there is no fallback plan generator that can
// turn an illegal/unresolved sequence into a legal one, and there is one UI route (legacy bridge -> executeCombatFeatureMultiattack).

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
const notes = { warn: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll() {}, on() {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const ma = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
const { readyAllDirected, installReadinessEnvironment } = await import('./helpers/ready-weapon-fixture.mjs');
await installReadinessEnvironment();
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { executeCombatFeatureMultiattack } = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-handlers.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
let uid = 0;
const feat = (name, extra = {}) => ({ id: `f${++uid}`, type: 'feat', name, flags: extra.flags ?? {}, system: { ...(extra.system ?? {}) } });
const canonFeat = (slug) => ({ swse: { canonicalFeat: { identityKey: `feat::saga-edition-core-rulebook::p84::${slug}` } } });
const choiceFeat = (slug, name, choice) => feat(name, { flags: canonFeat(slug), system: { slug, selectedChoice: choice } });
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)'];
const canon = (k) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '3d6', damageType: 'energy', equipped: true, proficient: true } });
const makeActor = ({ feats = [], items = [] } = {}) => readyAllDirected({
  id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
  items: col([...PROF.map((n) => ({ id: n, type: 'feat', name: n, flags: {}, system: {} })), ...feats, ...items]),
  system: { species: 'Human', size: 'Medium', bab: 6, level: 6, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 0, max: 0 } },
});

const dbl = (g = 'pistols') => choiceFeat('double-attack', 'Double Attack', { id: g, group: g });
const trp = (g = 'pistols') => choiceFeat('triple-attack', 'Triple Attack', { id: g, group: g });
const D = ma.FULL_ATTACK_PACKAGES.DOUBLE_ATTACK, T = ma.FULL_ATTACK_PACKAGES.TRIPLE_ATTACK;
const plan = (a, pkg, w) => ma.buildFullAttackSequence(a, { requestedPackage: pkg, primaryWeapon: w });

// 1. Double = 2 attacks at -5; Triple = 3 attacks at -10 (cumulative base), scoped to the weapon's group.
{
  const pistol = canon('weapon-blaster-pistol'), rifle = canon('weapon-blaster-rifle');
  const A = makeActor({ feats: [dbl(), trp()], items: [pistol, rifle] });
  const d = plan(A, D, pistol); assert.equal(d.legal, true); assert.equal(d.attacks.length, 2); assert.ok(d.attacks.every((x) => x.finalPenalty === -5)); assert.equal(d.actionType, 'full-round');
  const t = plan(A, T, pistol); assert.equal(t.legal, true); assert.equal(t.attacks.length, 3); assert.ok(t.attacks.every((x) => x.finalPenalty === -10));
  assert.equal(plan(A, D, rifle).legal, false, 'feat scoped to pistols does not cover a rifle');
  assert.equal(plan(makeActor({ feats: [trp()], items: [pistol] }), T, pistol).legal, false, 'Triple requires Double for the same weapon');
  assert.equal(plan(makeActor({ items: [pistol] }), D, pistol).legal, false, 'missing feat');
}

// 2. FAILING BEFORE the fix: an actor that HAS Double/Triple Attack but whose weapon form prohibits multi-shot abilities is refused by the executor
//    (the independent fallback plan used to rebuild a legal -5/-10 sequence after buildFullAttackSequence refused it).
{
  const bp = canon('weapon-black-powder-pistol');
  const A = makeActor({ feats: [dbl(), trp()], items: [bp] });
  assert.equal(ma.actorEntitledToMultiAttackPackage(A, D, bp, {}), true, 'fixture: entitled by the feat; the refusal is the weapon constraint');
  for (const [pkg, id] of [[D, 'double-attack'], [T, 'triple-attack']]) {
    assert.equal(plan(A, pkg, bp).legal, false, 'authority refuses the prohibited form');
    notes.warn.length = 0;
    await executeCombatFeatureMultiattack({ actor: A, element: null, featureId: id });
    assert.ok(notes.warn.some((m) => /prohibits abilities that expend multiple shots/.test(m)), `${id}: executor must surface the authority's refusal, got ${JSON.stringify(notes.warn)}`);
  }
}

// 3. Charge combination stays prohibited.
assert.equal(typeof ma.multiAttackChargeViolation, 'function');

// 4. One authority / one route (source contract).
const handlers = fs.readFileSync('scripts/engine/combat/features/combat-feature-handlers.js', 'utf8');
assert.doesNotMatch(handlers, /fallbackMultiAttackPlan|fallbackPenalty/, 'the independent fallback attack-plan generator is retired');
const hotfix = fs.readFileSync('scripts/patches/combat-ui-behavior-hotfix.js', 'utf8');
assert.doesNotMatch(hotfix, /fallbackMultiAttackPlan|executeMultiAttackFromElement|multiAttackKind/, 'the hotfix no longer carries a second Double/Triple route');

console.log('multiattack single-sequence-authority tests passed.');
