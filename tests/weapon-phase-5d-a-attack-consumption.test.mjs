import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-A -- LIVE attack-pipeline consumption of the canonical weapon runtime.
// Proves (through the real resolveAttackBonus() / computeFinalAttackComposition(), not only the pure resolver) that a
// canonical weapon's selected profile supplies the attack branch + dynamic proficiency, that the SWSE -5 nonproficiency
// penalty no longer vanishes for ordinary weapons, that Exotic Weapon Proficiency matches by canonical identity, that
// canonical failures fail closed, and that legacy/homebrew + flat-statblock behavior is unchanged.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { getWeaponAttackAbility } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };

// the fixture builds its registry from the same module graph the shim resolves, so the shared registry is the real one
rt.setSharedWeaponAuthorityRegistry(registry);

const abilityBlock = (mod) => ({ base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 });
const items = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ bab = 5, str = 2, dex = 4, species = '', feats = [], talents = [], type = 'character', groups = [] } = {}) {
  const all = [
    ...feats.map((f, i) => (typeof f === 'string' ? { id: `f${i}`, type: 'feat', name: f, system: {} } : { id: `f${i}`, type: 'feat', system: {}, ...f })),
    ...talents.map((t, i) => ({ id: `t${i}`, type: 'talent', name: t, system: {} })),
  ];
  return {
    id: 'a1', type, flags: {},
    system: { bab, species, weaponProficiencies: groups, attributes: { str: abilityBlock(str), dex: abilityBlock(dex), con: abilityBlock(0), int: abilityBlock(0), wis: abilityBlock(0), cha: abilityBlock(6) }, abilities: {} },
    items: items(all), effects: [], getFlag() { return undefined; },
  };
}
const canon = (identityKey, system = {}) => ({ id: `w-${identityKey}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey } } }, system });
const atk = (actor, weapon, ctx = {}) => resolveAttackBonus(actor, weapon, null, ctx);
const exoticChoice = (identity, name = 'Weapon Proficiency') => ({ name, flags: { swse: { choices: { weaponProficiency: { group: 'exotic', weaponIdentity: identity } } } } });

// ---- 1-3: ordinary canonical weapon: group proficiency / -5 / system.proficient cannot erase it ----------------------------
{
  const pistol = canon('weapon-blaster-pistol');
  const proficient = atk(makeActor({ feats: ['Weapon Proficiency (Pistols)'] }), pistol);
  assert.equal(proficient.components['Proficiency'], undefined);
  assert.equal(proficient.total, 5 + 4, 'BAB 5 + DEX 4, no penalty');
  assert.equal(proficient.weaponRuntime.source, 'canonical');
  assert.equal(proficient.weaponRuntime.proficiency.route.kind, 'normal-group');
  ok('canonical group-proficient weapon: penalty 0, route reported');

  const none = atk(makeActor(), pistol);
  assert.equal(none.components['Proficiency'], -5, 'exactly -5, applied once');
  assert.equal(none.total, 5 + 4 - 5);
  assert.equal(none.weaponRuntime.proficiency.proficient, false);
  ok('canonical nonproficient weapon: exactly -5');

  for (const sys of [{}, { proficient: true }, { proficient: undefined }]) {
    const r = atk(makeActor(), canon('weapon-blaster-pistol', sys));
    assert.equal(r.components['Proficiency'], -5, `system.proficient=${JSON.stringify(sys)} must not erase the canonical -5`);
  }
  assert.equal(atk(makeActor({ feats: ['Weapon Proficiency (Rifles)'] }), pistol).components['Proficiency'], -5, 'wrong group still -5');
  ok('system.proficient missing/default/true does not erase the canonical -5');
}

// ---- 4-5: exact Exotic Weapon Proficiency is canonical-identity based ---------------------------------------------------
{
  const bow = canon('weapon-bowcaster');
  const exact = atk(makeActor({ feats: [exoticChoice('weapon-bowcaster')] }), bow);
  assert.equal(exact.components['Proficiency'], undefined);
  assert.equal(exact.weaponRuntime.proficiency.route.kind, 'normal-exotic-feat');
  assert.equal(exact.weaponRuntime.proficiency.exoticIdentity, 'Bowcaster');
  // the stored identity is authority, never a display name: a feat TITLED for Bowcaster but storing Atlatl's identity does not grant Bowcaster
  const wrong = atk(makeActor({ feats: [exoticChoice('unmapped::Atlatl', 'Exotic Weapon Proficiency (Bowcaster)')] }), bow);
  assert.equal(wrong.components['Proficiency'], -5);
  assert.equal(atk(makeActor({ feats: [exoticChoice('unmapped::Atlatl')] }), bow).components['Proficiency'], -5, 'wrong Exotic Weapon Proficiency stays -5');
  // legacy name-only actor data (pre-5C) still works as a compatibility fallback
  assert.equal(atk(makeActor({ feats: ['Exotic Weapon Proficiency (Bowcaster)'] }), bow).components['Proficiency'], undefined);
  assert.equal(atk(makeActor({ feats: [{ name: 'Weapon Proficiency', flags: { swse: { choices: { weaponProficiency: { group: 'exotic', weapon: 'Bowcaster' } } } } }] }), bow).components['Proficiency'], undefined);
  const ent = rt.extractActorEntitlements(makeActor({ feats: [exoticChoice('weapon-bowcaster', 'Exotic Weapon Proficiency (Bowcaster)')] }));
  assert.ok(ent.exoticIdentities.has('weapon-bowcaster'));
  assert.equal(ent.exotic.size, 0, 'a canonical identity is never converted back into a name');
  ok('exact Exotic proficiency via weaponIdentity; wrong identity stays -5; legacy name fallback intact');
}

// ---- 6: species alternate routes ----------------------------------------------------------------------------------------
{
  const wook = (extra) => makeActor({ species: 'Wookiee', ...extra });
  const bowWook = atk(wook({ feats: ['Weapon Proficiency (Rifles)'] }), canon('weapon-bowcaster'));
  assert.equal(bowWook.components['Proficiency'], undefined);
  assert.equal(bowWook.weaponRuntime.proficiency.route.kind, 'species-override');
  assert.equal(atk(makeActor({ feats: ['Weapon Proficiency (Rifles)'] }), canon('weapon-bowcaster')).components['Proficiency'], -5, 'non-Wookiee gets no species route');
  assert.equal(atk(wook({ feats: ['Weapon Proficiency (Advanced Melee Weapons)'] }), canon('weapon-wookiee-ryyk-blade')).components['Proficiency'], undefined);
  const gungan = makeActor({ species: 'Gungan', feats: ['Weapon Proficiency (Simple Weapons)'] });
  assert.equal(atk(gungan, canon('unmapped::Atlatl')).components['Proficiency'], undefined);
  const pole = atk(gungan, canon('weapon-gungan-electropole'));
  assert.equal(pole.components['Proficiency'], undefined, 'Gungan treats the Electropole as a simple weapon');
  assert.equal(pole.weaponRuntime.proficiency.route.kind, 'species-override');
  assert.equal(atk(makeActor({ feats: ['Weapon Proficiency (Simple Weapons)'] }), canon('weapon-gungan-electropole')).components['Proficiency'], -5, 'non-Gungan: advanced melee still required');
  ok('species alternate routes (Wookiee/Gungan) apply; non-species and wrong-group do not');
}

// ---- 7: profile-specific proficiency (Massassi Lanvarok) ----------------------------------------------------------------
{
  const massassi = makeActor({ species: 'Massassi', feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
  const lan = canon('weapon-massassi-lanvarok');
  const melee = atk(massassi, lan, { profileId: 'melee' });
  const disc = atk(massassi, lan, { profileId: 'disc' });
  assert.equal(melee.components['Proficiency'], undefined, 'Massassi + advanced melee covers the melee profile');
  assert.equal(disc.components['Proficiency'], -5, 'but NOT the disc profile -- never flattened into one rule');
  assert.equal(atk(massassi, lan).weaponRuntime.profileId, 'disc', 'no profileId -> certified canonical default');
  const kissai = makeActor({ species: 'Kissai', feats: ['Weapon Proficiency (Simple Weapons)'] });
  assert.equal(atk(kissai, lan, { profileId: 'melee' }).weaponRuntime.proficiency.route.kind, 'species-override');
  assert.equal(atk(kissai, canon('weapon-sith-lanvarok')).components['Proficiency'], undefined);
  ok('Lanvarok: profile-specific proficiency; Kissai route');
}

// ---- 8: cross-branch profiles: branch + default ability --------------------------------------------------------------
{
  const a = makeActor({ str: 2, dex: 5, feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
  const pole = canon('weapon-gungan-electropole');
  const m = atk(a, pole);
  assert.equal(m.weaponRuntime.branch, 'melee');
  assert.equal(m.components['Ability (STR)'], 2);
  const t = atk(a, pole, { profileId: 'thrown' });
  assert.equal(t.weaponRuntime.branch, 'ranged');
  assert.equal(t.components['Ability (DEX)'], 5, 'selected ranged/thrown profile defaults to DEX');
  assert.equal(t.components['Proficiency'], undefined);
  // a stale melee attackType from the dialog never overrides the selected canonical profile
  assert.equal(atk(a, pole, { profileId: 'thrown', attackType: 'melee' }).components['Ability (DEX)'], 5);
  const lance = canon('weapon-siang-lance');
  const la = makeActor({ str: 2, dex: 5, feats: [exoticChoice('weapon-siang-lance'), 'Weapon Proficiency (Simple Weapons)'] });
  assert.equal(atk(la, lance).weaponRuntime.branch, 'ranged');
  assert.equal(atk(la, lance).components['Ability (DEX)'], 5);
  const bay = atk(la, lance, { profileId: 'bayonet-aao' });
  assert.equal(bay.weaponRuntime.branch, 'melee');
  assert.equal(bay.components['Ability (STR)'], 2);
  // explicit player/data-owned attackAttribute still wins
  assert.equal(atk(a, canon('weapon-gungan-electropole', { attackAttribute: 'cha' }), { profileId: 'thrown' }).components['Ability (CHA)'], 6);
  assert.equal(getWeaponAttackAbility(a, canon('weapon-gungan-electropole'), { weaponRuntime: rt.resolveAttackWeaponRuntime(pole, { profileId: 'thrown' }) }), 'dex');
  ok('cross-branch profiles (Electropole, Siang Lance): branch drives attack type + default ability; explicit ability wins');
}

// ---- 9: legacy / homebrew weapon unchanged -----------------------------------------------------------------------------
{
  const home = (system) => ({ id: 'hb', name: 'Homebrew Zapper', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', ...system } });
  const a = makeActor();
  const dflt = atk(a, home({}));
  assert.equal(dflt.weaponRuntime.source, 'legacy');
  assert.equal(dflt.components['Proficiency'], undefined, 'legacy default: system.proficient !== false is proficient (pre-5D-A behavior)');
  assert.equal(atk(a, home({ proficient: false })).components['Proficiency'], -5);
  assert.equal(atk(makeActor({ feats: ['Weapon Proficiency (Pistols)'] }), home({ proficient: false })).components['Proficiency'], undefined);
  ok('legacy/homebrew weapon keeps the pre-5D-A proficiency path');
}

// ---- 10: canonical failures fail closed ---------------------------------------------------------------------------------
{
  const a = makeActor({ feats: ['Weapon Proficiency (Pistols)'] });
  assert.throws(() => atk(a, canon('weapon-does-not-exist')), (e) => e instanceof rt.WeaponRuntimeError && e.code === 'canonical-registry-entry-missing');
  assert.throws(() => atk(a, canon('weapon-blaster-pistol'), { profileId: 'bogus' }), (e) => e.code === 'unknown-profile-id');
  // a bad-identity weapon whose NAME/category look like a pistol never degrades to legacy heuristics
  const lookalike = { ...canon('weapon-does-not-exist'), name: 'Blaster Pistol', system: { weaponCategory: 'ranged', proficiency: 'pistols', proficient: true } };
  assert.throws(() => atk(a, lookalike), (e) => e instanceof rt.WeaponRuntimeError);
  const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
  const comp = await computeFinalAttackComposition(a, canon('weapon-blaster-pistol'), { profileId: 'bogus' });
  assert.equal(comp.ok, false);
  assert.equal(comp.reason, 'weapon-runtime-error');
  assert.equal(comp.weaponRuntimeError.code, 'unknown-profile-id');
  ok('canonical bad identity/profile: throws / ok:false, never legacy');
}

// ---- 10b: registry load failure never downgrades canonical weapons to legacy --------------------------------------------
{
  rt.resetSharedWeaponAuthorityRegistry();
  const stub = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  await assert.rejects(rt.loadWeaponAuthorityRegistry('x'));
  globalThis.fetch = stub;
  const a = makeActor();
  assert.throws(() => atk(a, canon('weapon-blaster-pistol')), (e) => e.code === 'registry-unavailable');
  const viaSource = { id: 's', name: 'Blaster Pistol', type: 'weapon', _stats: { compendiumSource: 'Compendium.foundryvtt-swse.weapons.Item.weapon-blaster-pistol' }, system: {} };
  assert.throws(() => atk(a, viaSource), (e) => e.code === 'registry-unavailable');
  assert.equal(atk(a, { id: 'hb', name: 'Homebrew', type: 'weapon', system: { proficiency: 'pistols' } }).weaponRuntime.source, 'legacy', 'a custom item without any canonical hint still works');
  rt.setSharedWeaponAuthorityRegistry(registry);
  assert.equal(atk(makeActor(), canon('weapon-blaster-pistol')).weaponRuntime.source, 'canonical');
  ok('registry load failure fails closed for canonical-hinted weapons; custom items unaffected');
}

// ---- 11: stock droid / NPC flat totals unchanged ------------------------------------------------------------------------
{
  const npc = makeActor({ type: 'npc' });
  npc.flags = {}; npc.system.npcProfile = { mode: 'play' };
  const w = canon('weapon-blaster-pistol');
  w.flags.swse.npc = { useFlat: true, flatAttackBonus: 9 };
  const flat = atk(npc, w);
  assert.equal(flat.flags.npcFlat, true);
  assert.equal(flat.components['Proficiency'], undefined, 'published total already assumes proficiency');
  assert.equal(flat.total, 9);
  assert.equal(flat.weaponRuntime.proficiency, null, 'flat-total weapons never evaluate proficiency');
  ok('NPC flat-total canonical weapon: proficiency not layered on the published total');
}

// ---- 12: Implant / Spacehound inputs reach the canonical proficiency resolver; combat-option context unchanged ----------
{
  const w = canon('weapon-blaster-pistol');
  const a = makeActor();
  const withoutExt = atk(a, w);
  const again = atk(a, w);
  assert.equal(again.total, withoutExt.total, 'repeat invocation does not accumulate');
  assert.equal(atk(a, w, { weaponRuntime: rt.resolveAttackWeaponRuntime(w, {}) }).total, withoutExt.total, 'pre-resolved runtime == on-demand runtime (preview/roll parity)');
  // a pre-resolved runtime for a different selection is never reused
  const stale = rt.resolveAttackWeaponRuntime(canon('weapon-gungan-electropole'), {});
  assert.equal(atk(makeActor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)'] }), canon('weapon-gungan-electropole'), { profileId: 'thrown', weaponRuntime: stale }).weaponRuntime.profileId, 'thrown');
  ok('preview/roll parity: pre-resolved runtime equals on-demand; stale runtime is re-resolved');
}

// ---- 13: Spacehound / Implant integration inputs + mutation ordering ------------------------------------------------------
{
  const w = canon('weapon-blaster-pistol', { vehicleWeapon: true });
  const space = atk(makeActor({ talents: ['Spacehound'] }), w);
  assert.equal(space.components['Proficiency'], undefined);
  assert.equal(space.weaponRuntime.proficiency.route.kind, 'integration:spacehound');
  assert.equal(atk(makeActor(), w).components['Proficiency'], -5, 'no Spacehound -> penalty');
  const { ImplantEffectRules } = await import('/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js');
  const orig = ImplantEffectRules.ignoresWeaponProficiencyPenalty;
  ImplantEffectRules.ignoresWeaponProficiencyPenalty = () => true;
  try {
    const imp = atk(makeActor(), canon('weapon-blaster-pistol'));
    assert.equal(imp.components['Proficiency'], undefined);
    assert.equal(imp.weaponRuntime.proficiency.route.kind, 'integration:implant');
  } finally { ImplantEffectRules.ignoresWeaponProficiencyPenalty = orig; }
  ok('Implant/Spacehound reach the canonical resolver as its integration inputs');
}
{
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export async function rollAttack('), src.indexOf('export async function rollDamage('));
  const resolveAt = fn.indexOf('withCanonicalWeaponRuntime(weapon, rollOptions)');
  assert.ok(resolveAt > 0, 'rollAttack resolves the canonical runtime');
  for (const cost of ['CombatOptionResolver.collectAttackModifiers(', 'spendCoreAttackOptionCosts(', 'AmmoSystem.spendForWorkflow(']) {
    assert.ok(resolveAt < fn.indexOf(cost), `canonical resolution must precede ${cost}`);
  }
  ok('rollAttack resolves the canonical weapon/profile before any action-option or ammo cost');
}

console.log(`Phase 5D-A attack consumption: ${step} checks passed.`);
