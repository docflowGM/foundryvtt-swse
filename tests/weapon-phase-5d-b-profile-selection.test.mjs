import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-B -- player-selectable canonical attack forms + attack-ability provenance.
// Exercises the real roll-config model/panel, computeFinalAttackComposition() (the preview AND roll seam), resolveAttackBonus(),
// and rollAttack()'s pre-spend ordering. Representative weapons are regression probes drawn from the real canonical registry.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { buildRollConfigModel, buildAttackFormPanel } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { computeFinalAttackComposition, rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { getWeaponAttackAbility } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');
const { sanitizeItemSheetUpdate } = await import('/systems/foundryvtt-swse/scripts/items/item-defaults.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const ov = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/attack-ability-override.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { CombatOptionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
// roll-config's escapeHTML() uses a DOM text node; a minimal escaping stand-in is enough for panel-string assertions
globalThis.document = globalThis.document ?? { createElement: () => { let t = ''; return { set textContent(v) { t = String(v); }, get innerHTML() { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); } }; } };

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ bab = 5, str = 2, dex = 4, cha = 6, species = '', feats = [], type = 'character' } = {}) {
  return {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col(feats.map((f, i) => (typeof f === 'string' ? { id: `f${i}`, type: 'feat', name: f, system: {} } : { id: `f${i}`, type: 'feat', system: {}, ...f }))),
    system: { bab, level: 6, species, attributes: { str: ab(str), dex: ab(dex), con: ab(0), int: ab(0), wis: ab(0), cha: ab(cha) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
  };
}
// a production-like canonical item: stamped identity, display name irrelevant, PROJECTED attackAttribute present
const canon = (identityKey, system = {}, flags = {}) => ({ id: `w-${identityKey}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey }, ...flags } }, system });
const exoticChoice = (identity) => ({ name: 'Weapon Proficiency', flags: { swse: { choices: { weaponProficiency: { group: 'exotic', weaponIdentity: identity } } } } });
const model = (weapon, extra = {}, actor = makeActor()) => buildRollConfigModel({ actor, rollType: 'attack', weapon, ...extra });
const selectValues = (html, name) => [...html.matchAll(new RegExp(`<select name="${name}"[^>]*>([\\s\\S]*?)</select>`, 'g'))].flatMap((m) => [...m[1].matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]));

// ---- 1-4: model / selector behavior ------------------------------------------------------------------------------------
{
  const pistol = canon('weapon-blaster-pistol', { attackAttribute: 'dex' });
  const stick = canon('weapon-stun-baton', { attackAttribute: 'str' });
  for (const w of [pistol, stick]) {
    const m = await model(w);
    assert.equal(m.attackForms.length, 1, 'single-profile weapon has exactly one form');
    assert.equal(buildAttackFormPanel(m), '', 'and gains no selector/panel at all');
    assert.ok(!('attackFormError' in m) || m.attackFormError === null);
  }
  assert.equal((await model(pistol)).ranged, true);
  assert.equal((await model(stick)).melee, true);
  ok('single-profile canonical melee + ranged weapons: no attack-form selector, branch from the canonical profile');

  const m = await model(canon('weapon-gungan-electropole', { attackAttribute: 'str' }));
  const html = buildAttackFormPanel(m);
  assert.deepEqual(selectValues(html, 'attackForm'), ['melee', 'thrown'], 'selector values are the canonical profile ids, not labels');
  assert.match(html, /Thrown/, 'labels are display text');
  assert.ok(!selectValues(html, 'attackForm').includes('Thrown'));
  assert.equal(m.crossBranch, true);
  assert.deepEqual(m.attackForms.map((f) => f.branch), ['melee', 'ranged']);
  ok('multi-profile canonical weapon (Electropole): selector offers canonical ids only; cross-branch detected');

  // only LEGAL forms: Vibrobayonet forms are the (profile, configuration) combinations the resolver accepts
  const vb = canon('unmapped::Vibrobayonet');
  const vf = rt.buildAttackForms(vb).forms;
  assert.deepEqual(vf.map((f) => [f.profileId, f.configurationId]), [['primary', 'mounted-on-rifle'], ['detached', 'detached']]);
  for (const f of vf) assert.doesNotThrow(() => rt.resolveAttackWeaponRuntime(vb, rt.attackFormSelection(f)));
  assert.throws(() => rt.resolveAttackWeaponRuntime(vb, { profileId: 'primary', configurationId: 'detached' }), (e) => e.code === 'profile-unavailable-in-configuration');
  // every offered form of EVERY canonical weapon resolves; every weapon has at least one form
  let weapons = 0;
  for (const rec of registry.getAll()) {
    const w = canon(rec.identityKey); const info = rt.buildAttackForms(w); weapons += 1;
    assert.ok(info.forms.length >= 1, `${rec.identityKey} has a form`);
    for (const f of info.forms) assert.doesNotThrow(() => rt.resolveAttackWeaponRuntime(w, rt.attackFormSelection(f)), `${rec.identityKey} ${f.value}`);
  }
  assert.equal(weapons, 203);
  ok('only legal forms appear: Vibrobayonet combos; all 203 canonical weapons offer >=1 form and every offered form resolves');
}

// ---- representative weapons: Amphistaff, mode weapons, configuration weapons, payloads ----------------------------------
{
  const amph = rt.buildAttackForms(canon('unmapped::Amphistaff'));
  assert.deepEqual(amph.forms.map((f) => f.value), ['quarterstaff-end1|quarterstaff', 'quarterstaff-end2|quarterstaff', 'spear-melee|spear', 'spear-thrown|spear', 'whip-melee|whip', 'whip-pin|whip', 'whip-trip|whip', 'venom-spit']);
  assert.equal(amph.forms.find((f) => f.profileId === 'spear-thrown').branch, 'ranged');
  assert.equal(amph.selected.value, 'quarterstaff-end1|quarterstaff');
  const espo = rt.buildAttackForms(canon('weapon-espo-500-riot-gun'));
  assert.deepEqual(espo.forms.map((f) => [f.profileId, f.modeId]), [['primary', 'single-shot'], ['primary', 'autofire']], 'same profile, distinct modes -> mode is the dimension');
  const shock = rt.buildAttackForms(canon('unmapped::Shock Stick'));
  assert.deepEqual(shock.forms.map((f) => f.configurationId), ['handheld', 'mounted-bayonet'], 'configuration is a dimension when no profile pins it');
  const wrist = rt.buildAttackForms(canon('weapon-wrist-rocket-launcher'));
  assert.equal(wrist.forms.length, 1);
  assert.equal(wrist.payloads.length, 7);
  const wm = await model(canon('weapon-wrist-rocket-launcher'));
  assert.ok(buildAttackFormPanel(wm).includes('name="payloadId"'), 'payload selector only where >1 payloads');
  assert.ok(!buildAttackFormPanel(await model(canon('weapon-blaster-pistol'))).includes('payloadId'));
  ok('Amphistaff / Espo (modes) / Shock Stick (configuration) / Wrist Rocket (payloads) expose exactly their legal canonical dimensions');
}

// ---- 5-7: selection threads through preview model and composition; branch drives attack type -----------------------------
{
  const actor = makeActor({ str: 2, dex: 5, feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
  const pole = canon('weapon-gungan-electropole', { attackAttribute: 'str' });
  const mThrown = await model(pole, { profileId: 'thrown' }, actor);
  assert.equal(mThrown.selectedAttackForm.profileId, 'thrown');
  assert.equal(mThrown.ranged, true); assert.equal(mThrown.melee, false);
  assert.equal(mThrown.attackSelection.profileId, 'thrown');
  const comp = await computeFinalAttackComposition(actor, pole, { ...mThrown.attackSelection });
  assert.equal(comp.ok, true);
  assert.equal(comp.attackBonusResolution.weaponRuntime.profileId, 'thrown');
  assert.equal(comp.attackBonusResolution.weaponRuntime.branch, 'ranged');
  assert.equal(comp.atkBonus, mThrown.baseTotal, 'dialog base == composition atkBonus for the same selection (one seam)');
  // submitted-selection shape (what the dialog result carries) == what the preview used
  const submitted = rt.attackFormSelection(rt.findAttackForm(mThrown.attackForms, mThrown.selectedAttackForm.value));
  const roll = await computeFinalAttackComposition(actor, pole, { ...submitted, attackType: 'melee' });
  assert.equal(roll.attackBonusResolution.weaponRuntime.profileId, 'thrown', 'a stale melee attackType never overrides the selected canonical profile');
  assert.equal(roll.atkBonus, comp.atkBonus, 'preview and actual roll agree');
  const mMelee = await model(pole, {}, actor);
  assert.equal(mMelee.selectedAttackForm.profileId, 'melee');
  assert.equal(mMelee.melee, true);
  ok('selected profile reaches preview + composition; preview == roll; profile branch controls attack type');
}

// ---- 8-9, 24: fail closed; nothing spent --------------------------------------------------------------------------------
{
  const actor = makeActor({ feats: ['Weapon Proficiency (Pistols)'] });
  const pistol = canon('weapon-blaster-pistol');
  for (const bad of [{ profileId: 'bogus' }, { configurationId: 'bogus' }, { modeId: 'bogus' }, { payloadId: 'bogus' }]) {
    const c = await computeFinalAttackComposition(actor, pistol, bad);
    assert.equal(c.ok, false, JSON.stringify(bad)); assert.equal(c.reason, 'weapon-runtime-error');
    const mm = await model(pistol, bad, actor);
    assert.ok(mm.attackFormError, 'dialog model captures (does not throw) and does not substitute another profile');
    assert.match(buildAttackFormPanel(mm), /swse-roll-config-note--error/);
  }
  const vb = canon('unmapped::Vibrobayonet');
  assert.equal((await computeFinalAttackComposition(actor, vb, { profileId: 'primary', configurationId: 'detached' })).ok, false, 'illegal profile/configuration combination');
  assert.equal((await computeFinalAttackComposition(actor, vb, { profileId: 'detached', configurationId: 'detached' })).ok, true);
  assert.equal((await computeFinalAttackComposition(actor, canon('weapon-espo-500-riot-gun'), { profileId: 'primary', modeId: 'autofire' })).ok, true);
  assert.equal((await computeFinalAttackComposition(actor, canon('weapon-espo-500-riot-gun'), { modeId: 'low' })).ok, false, 'mode of another weapon');
  ok('invalid profile/configuration/mode/payload and illegal combinations fail closed (never substituted)');

  let spent = 0, collected = 0;
  const origSpend = AmmoSystem.spendForWorkflow, origCollect = CombatOptionResolver.collectAttackModifiers;
  AmmoSystem.spendForWorkflow = async () => { spent += 1; return { success: true, spent: true }; };
  CombatOptionResolver.collectAttackModifiers = function (...a) { collected += 1; return origCollect.apply(this, a); };
  try {
    const errors = [];
    const origErr = globalThis.ui.notifications.error; globalThis.ui.notifications.error = (m) => errors.push(m);
    const r = await rollAttack(actor, pistol, { profileId: 'bogus' });
    globalThis.ui.notifications.error = origErr;
    assert.equal(r, null);
    assert.equal(spent, 0, 'no ammunition spent'); assert.equal(collected, 0, 'resolution rejected before action-option costs / option collection');
    assert.ok(errors.some((e) => /could not be resolved/.test(e)));
  } finally { AmmoSystem.spendForWorkflow = origSpend; CombatOptionResolver.collectAttackModifiers = origCollect; }
  ok('rollAttack with an invalid canonical selection spends no ammo and runs no action-option costs');
}

// ---- 10-15: attack-ability provenance ------------------------------------------------------------------------------------
{
  const a = makeActor({ str: 2, dex: 5, cha: 6, feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
  const abil = (w, ctx = {}) => { const r = resolveAttackBonus(a, w, null, ctx); return Object.keys(r.components).find((k) => k.startsWith('Ability'))?.slice(9, 12).toLowerCase(); };
  // production-like items: the projected value (str for the melee-first Electropole) must not freeze the ability
  const pole = canon('weapon-gungan-electropole', { attackAttribute: 'str' });
  assert.equal(abil(pole), 'str', 'canonical melee default STR'); assert.equal(abil(pole, { profileId: 'melee' }), 'str');
  assert.equal(abil(pole, { profileId: 'thrown' }), 'dex', 'projected STR does not freeze the thrown (ranged) profile');
  assert.equal(abil(canon('weapon-blaster-pistol', { attackAttribute: 'str' })), 'dex', 'canonical ranged default DEX even if projected value is str');
  const lance = canon('weapon-siang-lance', { attackAttribute: 'dex' });
  const lanceA = makeActor({ str: 2, dex: 5, feats: [exoticChoice('weapon-siang-lance'), 'Weapon Proficiency (Simple Weapons)'] });
  const r1 = resolveAttackBonus(lanceA, lance, null, {}), r2 = resolveAttackBonus(lanceA, lance, null, { profileId: 'bayonet-aao' });
  assert.ok('Ability (DEX)' in r1.components); assert.ok('Ability (STR)' in r2.components, 'projected DEX does not freeze the bayonet (melee) profile');
  ok('canonical melee->STR, ranged->DEX, cross-profile weapons switch; projected attackAttribute never freezes the wrong ability');

  // genuine overrides win
  assert.equal(abil(canon('weapon-gungan-electropole', { attackAttribute: 'str' }, { attackAbilityOverride: 'dex' })), 'dex', 'explicit override flag wins on a melee profile');
  assert.equal(abil(canon('weapon-gungan-electropole', { attackAttribute: 'str' }, { attackAbilityOverride: 'cha' }), { profileId: 'thrown' }), 'cha');
  assert.equal(abil(canon('weapon-gungan-electropole', { attackAttribute: 'cha' })), 'cha', 'non-projection value (cha) can only be a player choice -> honored, no flag needed');
  assert.equal(abil(canon('weapon-gungan-electropole', { attackAttribute: 'str' }, { attackAbilityOverride: 'nonsense' })), 'str', 'invalid override ignored');
  ok('genuine explicit player override (flag, or non-projection value) still wins; invalid override ignored');

  // legacy/homebrew compatibility unchanged
  const home = (system) => ({ id: 'hb', name: 'Zapper', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', ...system } });
  assert.equal(abil(home({ attackAttribute: 'dex' })), 'dex', 'legacy: stored attackAttribute is explicit (unchanged)');
  assert.equal(abil(home({})), 'str');
  assert.equal(abil({ ...home({ attackAttribute: 'str' }), flags: { swse: { attackAbilityOverride: 'dex' } } }), 'str', 'legacy path never reads the override');
  assert.equal(getWeaponAttackAbility(a, canon('weapon-gungan-electropole', { attackAttribute: 'str' })), 'str', 'no runtime context: legacy rule');
  ok('legacy/homebrew attackAttribute behavior unchanged');

  // writers: only a CHANGED player edit stamps the override
  assert.deepEqual(ov.attackAbilityOverrideFlagsFor('str', 'dex'), { swse: { attackAbilityOverride: 'dex' } });
  assert.equal(ov.attackAbilityOverrideFlagsFor('str', 'str'), null);
  assert.equal(ov.attackAbilityOverrideFlagsFor('str', 'garbage'), null);
  const item = { type: 'weapon', name: 'Electropole', system: { attackAttribute: 'str', weaponCategory: 'melee' } };
  const changed = sanitizeItemSheetUpdate(item, { system: { attackAttribute: 'dex' } });
  assert.equal(changed.flags?.swse?.attackAbilityOverride, 'dex');
  const unchanged = sanitizeItemSheetUpdate(item, { system: { attackAttribute: 'str' } });
  assert.equal(unchanged.flags?.swse?.attackAbilityOverride, undefined, 'resubmitting the projected value is not an override');
  const merged = sanitizeItemSheetUpdate(item, { system: { attackAttribute: 'cha' }, flags: { other: { x: 1 } } });
  assert.equal(merged.flags.other.x, 1); assert.equal(merged.flags.swse.attackAbilityOverride, 'cha');
  ok('item-editor write path stamps the override only for a changed attack ability (flags merged, not clobbered)');
}

// ---- 16-19: proficiency regressions through the selected profile ----------------------------------------------------------
{
  const bow = canon('weapon-bowcaster');
  assert.equal(resolveAttackBonus(makeActor({ feats: [exoticChoice('weapon-bowcaster')] }), bow).components['Proficiency'], undefined);
  assert.equal(resolveAttackBonus(makeActor({ feats: [exoticChoice('unmapped::Atlatl')] }), bow).components['Proficiency'], -5);
  assert.equal(resolveAttackBonus(makeActor({ species: 'Wookiee', feats: ['Weapon Proficiency (Rifles)'] }), bow).components['Proficiency'], undefined);
  const massassi = makeActor({ species: 'Massassi', feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
  const lan = canon('weapon-massassi-lanvarok');
  assert.equal(resolveAttackBonus(massassi, lan, null, { profileId: 'melee' }).components['Proficiency'], undefined);
  assert.equal(resolveAttackBonus(massassi, lan, null, { profileId: 'disc' }).components['Proficiency'], -5);
  const lm = await model(lan, { profileId: 'melee' }, massassi), ld = await model(lan, { profileId: 'disc' }, massassi);
  assert.ok(lm.baseTotal > ld.baseTotal, 'dialog preview is profile-sensitive for the Lanvarok (melee proficient, disc -5)');
  ok('exact exotic identity, wrong exotic -5, species route, profile-sensitive Lanvarok all hold through the selected profile');
}

// ---- 20-23: existing systems unchanged ------------------------------------------------------------------------------------
{
  const a = makeActor({ feats: ['Weapon Proficiency (Pistols)'] });
  const w = canon('weapon-blaster-pistol');
  const base = resolveAttackBonus(a, w).total;
  assert.equal((await computeFinalAttackComposition(a, w, { profileId: 'primary' })).atkBonus, base, 'explicit default profile == implicit');
  const inv = await computeFinalAttackComposition(a, w, { customModifier: 3, sequencePenalty: -5, rangeBand: 'short', fightingDefensively: true });
  assert.equal(inv.atkBonus, base + 3 - 5 - 2 - 5, 'custom/sequence/range/fighting-defensively invocation terms unchanged');
  const home = { id: 'hb', name: 'Zapper', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols' } };
  assert.equal((await computeFinalAttackComposition(a, home, {})).atkBonus, resolveAttackBonus(a, home).total);
  const npc = makeActor({ type: 'npc' }); npc.system.npcProfile = { mode: 'play' };
  const fw = canon('weapon-blaster-pistol'); fw.flags.swse.npc = { useFlat: true, flatAttackBonus: 9 };
  const flat = await computeFinalAttackComposition(npc, fw, { profileId: 'primary' });
  assert.equal(flat.attackBonusResolution.flags.npcFlat, true); assert.equal(flat.atkBonus, 9);
  assert.equal(flat.attackBonusResolution.weaponRuntime.proficiency, null);
  ok('invocation terms, legacy weapon, and published NPC-flat totals unchanged with selection threaded');
}

// ---- wiring guard: the DOM handlers (not runnable headless) feed preview AND submit from the same live selection ----------
{
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../scripts/rolls/roll-config.js', import.meta.url), 'utf8');
  const upd = src.slice(src.indexOf('const update = async () =>'), src.indexOf('shell.querySelectorAll(\'[data-check-mode]\')'));
  assert.match(upd, /readLiveAttackSelection\(form, model\)/); assert.match(upd, /\.\.\.live\.selection/); assert.match(upd, /syncAttackFormBranch\(/);
  assert.match(upd, /rangeBand: melee \? null/);
  const submit = src.slice(src.indexOf("if (rollType === 'attack') {\n              // Phase 5D-B"), src.indexOf('result.coverBonus ='));
  assert.match(submit, /readLiveAttackSelection\(form, model\)/); assert.match(submit, /Object\.assign\(result, live\.selection\)/);
  assert.match(submit, /computeAttackSituationalContext\(form, liveMelee\)/);
  assert.ok(!/profile\.label|\.label ===|weapon\.name ===/.test(src.slice(src.indexOf('function readLiveAttackSelection'), src.indexOf('function wireRollConfigDialog'))), 'no label/name matching in selection code');
  ok('dialog wiring: preview and submit both read the live canonical selection (ids, branch, payload); no label/name matching');
}

console.log(`Phase 5D-B profile selection: ${step} checks passed.`);
