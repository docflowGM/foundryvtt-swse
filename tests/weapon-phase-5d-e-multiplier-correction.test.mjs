import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-E correction -- weapon damage multiplier staging, critical stacking, Neuronic Whip rider on a critical.
// Sources: Core Rulebook (weapon damage x multiplier; a critical hit deals double damage, no exception for multiplied weapons);
// Legacy Era Campaign Guide (extra weapon damage is applied BEFORE the weapon multiplier, e.g. "(5d10+5)x2");
// Force Unleashed Campaign Guide (Neuronic Whip: normal stun damage plus 1d4 slashing damage).
// Numbers are deterministic: every NdM is replaced by 10, so (10 + 3) x 2 = 26 (never 10 x 2 + 3 = 23) and a critical gives 52.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveDamageComposition, buildDamageFormula, DAMAGE_STAGE } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
const makeActor = ({ level = 1, feats = [] } = {}) => ({
  id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
  items: col(feats.map((f, i) => ({ id: `f${i}`, type: 'feat', name: f.name, system: f.system ?? {} }))),
  system: { bab: 5, level, attributes: { str: ab(0), dex: ab(0), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
});
const canon = (k, system = {}) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', ...system } });
const legacy = (system = {}) => ({ id: 'hb', name: 'Homebrew', type: 'weapon', system: { weaponCategory: 'ranged', damage: '2d6', damageType: 'energy', ...system } });
const form = (k, sel) => ({ weaponForm: { identityKey: k, ...sel } });
const comp = (actor, weapon, ctx = {}) => resolveDamageComposition(actor, weapon, ctx);
const num = (f) => Function(`return (${String(f).replace(/\d+d\d+/g, '10')})`)();
const LCM = 'weapon-light-concussion-missile-launcher';
const lcmForm = form(LCM, { profileId: 'light-concussion-missile' });
const lcm = (system) => canon(LCM, system);
const fml = (actor, weapon, ctx = {}, opts) => buildDamageFormula(comp(actor, weapon, ctx), opts);

// 1: x2, no bonuses
{
  const f = fml(makeActor(), lcm(), lcmForm);
  assert.equal(f, '(4d10) * 2'); assert.equal(num(f), 20);
  ok('x2 weapon with no bonuses multiplies the base damage: (4d10) x 2');
}
// 2: flat weapon-damage bonus BEFORE the multiplier
{
  const f = fml(makeActor(), lcm({ flatDamageBonus: 3 }), lcmForm);
  assert.equal(f, '(4d10 + 3) * 2'); assert.equal(num(f), 26); assert.notEqual(num(f), 23, 'never (dice x 2) + 3');
  ok('flat weapon-damage bonus is applied before x2: (10 + 3) x 2 = 26, not 23');
}
// 3: half heroic level
{
  const A = makeActor({ level: 6 });
  const c = comp(A, lcm(), lcmForm);
  assert.equal(c.bonus.components['½ Level'], 3);
  assert.equal(c.bonus.total, 3);
  const f = buildDamageFormula(c);
  assert.equal(f, '(4d10 + 3) * 2'); assert.equal(num(f), 26);
  assert.equal(c.ledger.find((l) => l.id === 'bonus-½ Level').stage, DAMAGE_STAGE.PRE_WEAPON_MULTIPLIER);
  ok('half heroic level (+3 at level 6) is multiplied with the weapon damage expression: 26');
}
// 4: Weapon Specialization
{
  const A = makeActor({ feats: [{ name: 'Weapon Specialization', system: { selectedChoice: 'heavy weapons' } }] });
  const c = comp(A, lcm({ weaponGroup: 'Heavy Weapons' }), lcmForm);
  assert.equal(c.bonus.components['Scoped Feat'], 2, 'Weapon Specialization +2 resolved by the existing scoped-feat resolver');
  const f = buildDamageFormula(c);
  assert.equal(f, '(4d10 + 2) * 2'); assert.equal(num(f), 24); assert.notEqual(num(f), 22);
  assert.equal(c.ledger.find((l) => l.id === 'bonus-Scoped Feat').stage, DAMAGE_STAGE.PRE_WEAPON_MULTIPLIER);
  ok('Weapon Specialization (+2) is inside the multiplier: (10 + 2) x 2 = 24');
}
// 5: x2 weapon on a critical -> both multipliers
{
  const A = makeActor();
  const f = fml(A, lcm({ flatDamageBonus: 3 }), { ...lcmForm, isCritical: true });
  assert.equal(f, '((4d10 + 3) * 2) * 2'); assert.equal(num(f), 52);
  const f0 = fml(A, lcm(), { ...lcmForm, isCritical: true });
  assert.equal(num(f0), 40, 'no bonus: 10 x 2 x 2');
  const c = comp(A, lcm({ flatDamageBonus: 3 }), { ...lcmForm, isCritical: true });
  assert.equal(c.ledger.find((l) => l.id === 'critical-multiplier').stage, DAMAGE_STAGE.CRITICAL);
  assert.equal(c.ledger.find((l) => l.id === 'weapon-multiplier').stage, DAMAGE_STAGE.WEAPON_MULTIPLIER);
  ok('x2 weapon on a critical applies both multipliers: (10 + 3) x 2 x 2 = 52');
}
// 6: non-multiplier weapon critical = ordinary double
{
  const A = makeActor();
  const pistol = canon('weapon-blaster-pistol', { flatDamageBonus: 3 });
  assert.equal(num(fml(A, pistol, {})), 13);
  const f = fml(A, pistol, { isCritical: true });
  assert.equal(f, '(3d6 + 3) * 2'); assert.equal(num(f), 26);
  ok('a weapon without a multiplier: normal 13, critical (10 + 3) x 2 = 26');
}
// 7, 8, 9: Neuronic Whip rider -- separate, doubled on a critical; AND stays one event
{
  const whip = canon('unmapped::Neuronic Whip');
  const run = async (isCritical) => {
    const rolls = [], posted = [];
    const origPost = SWSEChat.postRoll, origSWSE = globalThis.SWSE;
    globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { rolls.push(f); return { total: num(f), formula: f, dice: [] }; } } };
    SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
    try { await rollDamage(makeActor(), whip, { isCritical }); } finally { SWSEChat.postRoll = origPost; globalThis.SWSE = origSWSE; }
    return { rolls, posted };
  };
  const normal = await run(false);
  assert.equal(normal.posted.length, 2); assert.equal(normal.rolls[1], '1d4');
  const crit = await run(true);
  assert.equal(crit.posted.length, 2, 'still two separate damage cards');
  assert.match(crit.rolls[0], /^\(2d8.*\) \* 2$/, 'stun component doubled'); assert.equal(crit.rolls[1], '(1d4) * 2', 'slashing rider doubled too');
  const [main, rider] = crit.posted;
  assert.equal(rider.flags.swse.damageRider, true); assert.equal(rider.context.damageType, 'slashing'); assert.equal(rider.context.isCritical, true); assert.equal(rider.context.critMultiplier, 2);
  assert.equal(rider.context.workflowContext.attack.damageMode, 'normal', 'rider is not folded into / marked as the stun component');
  assert.ok(main.context.workflowContext.contextTags.includes('stun'));
  assert.equal(num(crit.rolls[0]) % 2, 0); assert.equal(num(crit.rolls[1]), 20, 'numeric: rider 10 x 2');
  ok('Neuronic Whip: slashing rider stays a separate component/card and is doubled with the stun component on a critical');
  const bow = canon('weapon-bowcaster');
  const cd = rt.resolveCanonicalDamage(bow, {});
  assert.deepEqual([...cd.damageTypes], ['energy', 'piercing']); assert.equal(cd.damageShape.riders.length, 0);
  const bowRolls = [], bowPosted = [];
  const origPost = SWSEChat.postRoll, origSWSE = globalThis.SWSE;
  globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { bowRolls.push(f); return { total: 5, formula: f, dice: [] }; } } };
  SWSEChat.postRoll = async (p) => { bowPosted.push(p); return {}; };
  try { await rollDamage(makeActor(), bow, { isCritical: true }); } finally { SWSEChat.postRoll = origPost; globalThis.SWSE = origSWSE; }
  assert.equal(bowPosted.length, 1, 'AND damage types remain ONE damage event, also on a critical');
  ok('AND damage types (energy AND piercing) remain one damage event on a normal and a critical hit');
}
// 10: existing critical replacement / extra-damage rules
{
  const A = makeActor();
  const hab = canon('weapon-heavy-assault-blaster', { flatDamageBonus: 3 });
  const habForm = form('weapon-heavy-assault-blaster', { profileId: 'primary' });
  assert.equal(fml(A, hab, habForm), '3d10 + 3');
  assert.equal(fml(A, hab, { ...habForm, isCritical: true }), '(3d12 + 3) * 2', 'critical die replacement unchanged (die size upgraded, then the critical multiplier)');
  const vs = canon('weapon-verpine-shattergun', { flatDamageBonus: 3 });
  const vsForm = form('weapon-verpine-shattergun', { profileId: 'primary' });
  const fv = fml(A, vs, { ...vsForm, isCritical: true });
  assert.match(fv, /^\(3d10 \+ 3\) \* 2 \+ \(.*1d10.*\)$/, `extra 1d10 after the critical multiplication: ${fv}`);
  ok('critical die replacement and critical extra damage keep their existing order');
}
// 11: legacy/homebrew + invocation-only terms stay post-multiplier
{
  const A = makeActor();
  const l = legacy({ flatDamageBonus: 3 });
  const c = comp(A, l, {});
  assert.equal(buildDamageFormula(c), '2d6 + 3'); assert.equal(c.dice.baseMultiplier, 1);
  assert.equal(buildDamageFormula(comp(A, l, { isCritical: true })), '(2d6 + 3) * 2');
  // Force Point / custom modifier are invocation-only and POST multiplier
  const f = buildDamageFormula(comp(A, lcm({ flatDamageBonus: 3 }), lcmForm), { extraTerms: [5] });
  assert.equal(f, '(4d10 + 3) * 2 + 5'); assert.equal(num(f), 31);
  ok('legacy/homebrew damage unchanged; invocation-only terms (Force Point, custom modifier) are added after the weapon multiplier');
}
console.log(`Phase 5D-E multiplier/critical correction: ${step} checks passed.`);
