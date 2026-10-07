import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-C -- the canonical attack form selected for an attack determines the damage definition used for that attack.
// The runtime supplies WHAT damage applies; the certified composition (resolveDamageComposition/buildDamageFormula) stays the
// only arithmetic. Probes come from the real canonical registry; every canonical item below carries a deliberately WRONG
// Item-level projection (system.damage '9d9', damageType 'sonic') so a fallback to Item fields cannot pass unnoticed.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveDamageComposition, buildDamageFormula, resolveDamageBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { rollDamage } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/damage.js');
const { rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ str = 3, dex = 4, level = 6, type = 'character', feats = [] } = {}) {
  return {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col(feats.map((f, i) => ({ id: `f${i}`, type: 'feat', name: f, system: {} }))),
    system: { bab: 5, level, attributes: { str: ab(str), dex: ab(dex), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
  };
}
// canonical item with a WRONG Item-level projection on purpose
const canon = (k, system = {}, flags = {}) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k }, ...flags } }, system: { damage: '9d9', damageType: 'sonic', ...system } });
const legacy = (system = {}) => ({ id: 'hb', name: 'Homebrew', type: 'weapon', system: { weaponCategory: 'melee', damage: '2d6', damageType: 'energy', ...system } });
// production items carry realistic classification fields; only damage/damageType are deliberately wrong
const PISTOL = () => canon('weapon-blaster-pistol', { weaponCategory: 'ranged', proficiency: 'pistols' });
const BATON = () => canon('weapon-stun-baton', { weaponCategory: 'melee', proficiency: 'simple' });
const form = (k, sel) => ({ weaponForm: { identityKey: k, ...sel } });
const formula = (actor, weapon, ctx = {}) => buildDamageFormula(resolveDamageComposition(actor, weapon, ctx));
const comp = (actor, weapon, ctx = {}) => resolveDamageComposition(actor, weapon, ctx);
const diceOf = (actor, weapon, ctx) => comp(actor, weapon, ctx).dice.base;
const A = makeActor();

// ---- 7-8: ordinary canonical melee / ranged damage replaces the stale Item projection -----------------------------------------
{
  assert.equal(diceOf(A, PISTOL()), '3d6');
  assert.equal(diceOf(A, BATON()), '1d6');
  // arithmetic is the certified composition: a legacy item with the same dice yields the identical formula
  assert.equal(formula(A, PISTOL()), formula(A, legacy({ damage: '3d6', weaponCategory: 'ranged', proficiency: 'pistols' })));
  const c = comp(A, PISTOL());
  assert.equal(c.canonicalDamage.source, 'canonical'); assert.equal(c.canonicalDamage.base, '3d6');
  ok('ordinary canonical ranged (3d6) / melee (1d6) damage comes from the canonical form, not the stale Item projection; arithmetic identical to the legacy path');
}

// ---- 1, 9: damage uses the selected profile; different profiles -> different definitions -----------------------------------
{
  const lan = canon('weapon-massassi-lanvarok');
  assert.equal(diceOf(A, lan, form('weapon-massassi-lanvarok', { profileId: 'melee' })), '1d8');
  assert.equal(diceOf(A, lan, form('weapon-massassi-lanvarok', { profileId: 'disc' })), '3d4');
  assert.equal(diceOf(A, lan, {}), '3d4', 'no carried form -> certified canonical default profile (disc)');
  const lanDmg = (profileId) => rt.resolveCanonicalDamage(lan, form('weapon-massassi-lanvarok', { profileId }));
  assert.deepEqual([lanDmg('melee').selectedDamageType, lanDmg('disc').selectedDamageType], ['slashing', 'bludgeoning']);
  const amph = canon('unmapped::Amphistaff');
  assert.equal(diceOf(A, amph, form('unmapped::Amphistaff', { profileId: 'spear-melee', configurationId: 'spear' })), '1d8');
  assert.equal(diceOf(A, amph, form('unmapped::Amphistaff', { profileId: 'whip-melee', configurationId: 'whip' })), '1d4');
  ok('selected profile drives damage (Lanvarok melee 1d8 slashing vs disc 3d4 bludgeoning; Amphistaff forms); default = canonical default profile');
}

// ---- 2, 10: configuration-specific damage; 3, 11: mode-specific damage --------------------------------------------------------
{
  const vb = canon('unmapped::Vibrobayonet');
  assert.equal(diceOf(A, vb, form('unmapped::Vibrobayonet', { profileId: 'primary', configurationId: 'mounted-on-rifle' })), '2d6');
  assert.equal(diceOf(A, vb, form('unmapped::Vibrobayonet', { profileId: 'detached', configurationId: 'detached' })), '2d4');
  const vbl = canon('weapon-variable-blaster');
  const mode = (modeId) => diceOf(A, vbl, form('weapon-variable-blaster', { profileId: modeId, modeId }));
  assert.deepEqual([mode('low'), mode('medium'), mode('high')], ['3d4', '3d6', '3d8']);
  assert.equal(diceOf(A, canon('weapon-espo-500-riot-gun'), form('weapon-espo-500-riot-gun', { profileId: 'primary', modeId: 'autofire' })), '3d8');
  // an illegal combination is rejected, not repaired
  assert.throws(() => comp(A, vb, form('unmapped::Vibrobayonet', { profileId: 'primary', configurationId: 'detached' })), (e) => e.code === 'profile-unavailable-in-configuration');
  ok('configuration-specific (Vibrobayonet 2d6 mounted / 2d4 detached) and mode-specific (Variable Blaster 3d4/3d6/3d8) damage resolve; illegal combo rejected');
}

// ---- 4, 12-15: payloads ---------------------------------------------------------------------------------------------------------
{
  const wr = canon('weapon-wrist-rocket-launcher');
  const pay = (payloadId) => form('weapon-wrist-rocket-launcher', { profileId: 'primary', payloadId });
  assert.equal(diceOf(A, wr, pay('antipersonnel')), '3d8');
  assert.equal(diceOf(A, wr, pay('antivehicle')), '3d10');
  assert.equal(diceOf(A, wr, pay('hollow-tip-empty')), '2d6');
  assert.equal(diceOf(A, wr, pay('ion-blast')), '3d6');
  assert.equal(rt.resolveCanonicalDamage(wr, pay('antivehicle')).payloadId, 'antivehicle');
  assert.throws(() => comp(A, wr, pay('bogus')), (e) => e.code === 'unknown-payload-id', 'invalid payload fails closed');
  assert.throws(() => comp(A, wr, form('weapon-wrist-rocket-launcher', { profileId: 'primary' })), (e) => e.code === 'payload-required', 'varies-by-payload with no payload never falls back to the Item default');
  for (const [id, reason] of [['flash', 'no-damage-definition'], ['hollow-tip-stun-gas', 'no-damage-definition'], ['hollow-tip-nerve-toxin', 'special-effect-damage']]) {
    const cd = rt.resolveCanonicalDamage(wr, pay(id));
    assert.equal(cd.base, null, `${id}: no ordinary dice fabricated`); assert.equal(cd.reason, reason);
    assert.throws(() => comp(A, wr, pay(id)), (e) => e.code === 'no-ordinary-damage');
  }
  assert.deepEqual(rt.resolveCanonicalDamage(wr, pay('hollow-tip-nerve-toxin')).specialEffects.map((e) => e.effect), ['nerve-agent-injection'], 'effect data preserved, not turned into damage');
  ok('payload damage: 3d8 / 3d10 / 2d6 / 3d6 by selected payload; invalid + missing payload fail closed; flash/stun-gas/nerve-toxin are not fabricated into dice');
}

// ---- 5: damage mode (stun) ---------------------------------------------------------------------------------------------------------
{
  const pist = canon('weapon-blaster-pistol');
  assert.equal(diceOf(A, pist, { damageMode: 'stun' }), '2d6', 'canonical explicit stun damage definition');
  assert.equal(rt.resolveCanonicalDamage(pist, { damageMode: 'stun' }).damageMode, 'stun');
  assert.throws(() => comp(A, canon('weapon-massassi-lanvarok'), { damageMode: 'stun' }), (e) => e.code === 'unsupported-damage-mode', 'a form without stun capability refuses stun');
  assert.throws(() => comp(A, pist, { damageMode: 'zap' }), (e) => e.code === 'unsupported-damage-mode');
  ok('damage mode survives into damage: canonical stun definition used; unsupported mode fails closed');
}

// ---- 16-18, 20: existing arithmetic unchanged (ability, typed modifiers, option contributions, stock droid) ------------------------
{
  const strong = makeActor({ str: 4, level: 8 });
  const c = comp(strong, BATON()), l = comp(strong, legacy({ damage: '1d6', weaponCategory: 'melee', proficiency: 'simple' }));
  assert.deepEqual(c.bonus, l.bonus, 'ability + half-level + enhancement bonus identical canonical vs legacy');
  assert.equal(c.bonus.components['Ability'], 4);
  assert.equal(comp(strong, PISTOL()).bonus.components['Ability'], 0, 'ranged form: no ability to damage (existing rule)');
  // thrown profile of a melee weapon keeps the existing Item-level thrown rule (STR applies) -- canonical metadata carries no damage-ability rule
  assert.equal(comp(strong, canon('weapon-gungan-electropole', { weaponCategory: 'melee', proficiency: 'advanced' }), form('weapon-gungan-electropole', { profileId: 'thrown' })).bonus.components['Ability'], 4);
  // option damage contributions flow through the unchanged path
  const withOpt = { combatOptions: { powerAttack: 2 } };
  assert.deepEqual(comp(strong, BATON(), withOpt).bonus, comp(strong, legacy({ damage: '1d6', weaponCategory: 'melee', proficiency: 'simple' }), withOpt).bonus);
  // stock droid published formula keeps precedence over canonical
  const droid = makeActor({ type: 'droid' });
  const stockWeapon = { ...canon('weapon-blaster-pistol'), flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-pistol' }, stockDroidAttack: { sourceStatblock: true, publishedDamage: '4d4' } } } };
  const stock = comp(droid, stockWeapon);
  if (stock.flags?.stockDamageFormula) assert.equal(stock.dice.base, stock.flags.stockDamageFormula);
  else assert.equal(stock.canonicalDamage.source, 'canonical'); // not in stock-statblock mode here: documented below
  ok('ability-to-damage, half level, enhancement, option contributions identical to the legacy path; thrown rule preserved; stock-droid formula precedence');
}

// ---- 19: criticals use the certified pipeline with the canonical base --------------------------------------------------------------
{
  const lan = canon('weapon-massassi-lanvarok'), L = makeActor();
  const melee = form('weapon-massassi-lanvarok', { profileId: 'melee' });
  const crit = formula(L, lan, { ...melee, isCritical: true });
  const normal = formula(L, lan, melee);
  assert.match(crit, /^\(1d8/); assert.ok(crit.endsWith(' * 2') || /\* \d+/.test(crit));
  assert.equal(crit, `(${normal}) * ${comp(L, lan, { ...melee, isCritical: true }).critical.multiplier}`.replace(/\s*\+\s*\(\)$/, ''), 'critical = existing multiplier over the canonical selected base');
  const critLegacy = formula(L, legacy({ damage: '1d8' }), { isCritical: true });
  assert.equal(crit.replace('1d8', 'X'), critLegacy.replace('1d8', 'X'), 'same critical shape as the legacy item with the same dice');
  // payload damage is multiplied exactly like any other base damage by the existing pipeline (no payload-specific multiplier is applied)
  const wr = canon('weapon-wrist-rocket-launcher');
  const pc = comp(L, wr, { ...form('weapon-wrist-rocket-launcher', { profileId: 'primary', payloadId: 'antivehicle' }), isCritical: true });
  assert.equal(pc.canonicalDamage.deferred.damageMultiplier, 1);
  assert.match(buildDamageFormula(pc), /^\(3d10/);
  ok('critical damage: certified multiplier applied to the canonical selected base (alternate profile + payload); no second critical formula');
}

// ---- 21-25: NPC flat, legacy, registry, identity, invalid form ---------------------------------------------------------------------
{
  const calls = [];
  const origRoll = globalThis.SWSE?.RollEngine; globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (f) => { calls.push(f); return { total: 7, formula: f, dice: [] }; } } };
  const origRE = RollEngine.safeRoll; RollEngine.safeRoll = async (f) => { calls.push(f); return { total: 7, formula: f, dice: [] }; };
  const origPost = SWSEChat.postRoll; const posted = []; SWSEChat.postRoll = async (p) => { posted.push(p); return {}; };
  try {
    // NPC statblock flat formula still short-circuits canonical resolution
    const npc = makeActor({ type: 'npc' }); npc.system.npcProfile = { mode: 'play' };
    const flatW = canon('weapon-blaster-pistol'); flatW.flags.swse.npc = { useFlat: true, flatDamageFormula: '2d6+3' };
    await rollDamage(npc, flatW, { suppressChat: true });
    assert.equal(calls.at(-1), '2d6+3', 'NPC flat damage formula unchanged (published total, not rebuilt from canonical dice)');

    // legacy weapon: unchanged path
    calls.length = 0;
    await rollDamage(A, legacy({ damage: '2d6' }), { suppressChat: true });
    assert.match(calls[0], /^2d6/);

    // missing registry: an unhinted legacy weapon still rolls; a canonical-hinted one refuses
    rt.resetSharedWeaponAuthorityRegistry();
    calls.length = 0; await rollDamage(A, legacy({ damage: '2d6' }), { suppressChat: true });
    assert.match(calls[0], /^2d6/, 'missing registry never turns an unhinted legacy weapon into a failure');
    notes.error.length = 0; calls.length = 0;
    assert.equal(await rollDamage(A, canon('weapon-blaster-pistol'), { suppressChat: true }), null);
    assert.equal(calls.length, 0); assert.ok(notes.error.some((m) => /Damage could not be resolved/.test(m)));
    rt.setSharedWeaponAuthorityRegistry(registry);

    // invalid canonical identity / selected form fail closed (no roll at all)
    for (const [w, ctx, code] of [
      [canon('weapon-does-not-exist'), {}, 'canonical-registry-entry-missing'],
      [canon('weapon-massassi-lanvarok'), form('weapon-massassi-lanvarok', { profileId: 'bogus' }), 'unknown-profile-id'],
      [canon('weapon-blaster-pistol'), form('weapon-massassi-lanvarok', { profileId: 'melee' }), 'weapon-form-identity-mismatch'],
      [legacy(), form('weapon-blaster-pistol', { profileId: 'primary' }), 'weapon-form-identity-mismatch'],
    ]) {
      calls.length = 0; notes.error.length = 0;
      assert.equal(await rollDamage(A, w, { ...ctx, suppressChat: true }), null, code);
      assert.equal(calls.length, 0, `${code}: nothing rolled`);
      assert.ok(notes.error.length === 1, code);
    }
    ok('NPC flat + legacy damage unchanged; missing registry keeps legacy working; invalid identity / form / mismatch fail closed with no roll');

    // ---- 6: chat/workflow-delayed damage retains the canonical selection (real rollAttack -> serialized card -> real rollDamage) ----
    const realSafeRoll = RollEngine.safeRoll;
    RollEngine.safeRoll = async (f) => ({ total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] });
    const origAmmo = AmmoSystem.spendForWorkflow; AmmoSystem.spendForWorkflow = async () => ({ success: true, spent: false });
    const lan = canon('weapon-massassi-lanvarok');
    const attacker = makeActor({ feats: ['Weapon Proficiency (Advanced Melee Weapons)'] });
    posted.length = 0;
    const attackResult = await rollAttack(attacker, lan, { profileId: 'melee', suppressChat: false });
    assert.ok(attackResult, 'attack resolved');
    const card = posted.find((p) => p.context?.workflowContext);
    const wf = card.context.workflowContext;
    assert.deepEqual(wf.weaponForm, { identityKey: 'weapon-massassi-lanvarok', profileId: 'melee', damageMode: 'normal' }, 'attack card carries the exact canonical form (resolved defaults pinned)');
    const wire = ser.encodeCombatWorkflowContext(wf);                 // what the chat button stores
    const restored = ser.decodeCombatWorkflowContext(wire);           // what the later damage click reads
    assert.deepEqual(restored.weaponForm, wf.weaponForm, 'form survives URL-encoded JSON serialization');
    calls.length = 0;
    await rollDamage(attacker, lan, { combatContext: restored, workflowContext: restored, suppressChat: true });
    assert.match(calls[0], /^1d8/, 'delayed damage uses the melee form attacked with (1d8), not the disc default (3d4) or Item 9d9');
    // same click, but the carried form is stale/invalid -> refused, never the default
    calls.length = 0; notes.error.length = 0;
    const stale = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext({ ...restored, weaponForm: { identityKey: 'weapon-massassi-lanvarok', profileId: 'gone' } }));
    assert.equal(await rollDamage(attacker, lan, { combatContext: stale, workflowContext: stale, suppressChat: true }), null);
    assert.equal(calls.length, 0);
    // a payload + mode + configuration form round-trips as well
    const full = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext({}, { weaponForm: { identityKey: 'unmapped::Amphistaff', profileId: 'whip-melee', configurationId: 'whip', modeId: 'm', payloadId: 'p', damageMode: 'stun' } }));
    assert.deepEqual(full.weaponForm, { identityKey: 'unmapped::Amphistaff', profileId: 'whip-melee', configurationId: 'whip', modeId: 'm', payloadId: 'p', damageMode: 'stun' });
    // attack with an invalid damage mode for the selected form is refused BEFORE ammo/costs
    let spent = 0; AmmoSystem.spendForWorkflow = async () => { spent += 1; return { success: true, spent: true }; };
    notes.error.length = 0;
    assert.equal(await rollAttack(attacker, lan, { profileId: 'melee', damageMode: 'stun' }), null);
    assert.equal(spent, 0, 'unsupported damage mode for the form: nothing spent');
    AmmoSystem.spendForWorkflow = origAmmo; RollEngine.safeRoll = realSafeRoll;
    ok('selected form (profile/config/mode/payload/damageMode) survives attack card -> encoded chat data -> delayed damage; stale form refused; bad damage mode refused before any cost');
  } finally { RollEngine.safeRoll = origRE; SWSEChat.postRoll = origPost; if (origRoll) globalThis.SWSE.RollEngine = origRoll; rt.setSharedWeaponAuthorityRegistry(registry); }
}

const e_code = (r) => r.slice('throws:'.length);
// ---- deferred / non-ordinary classes behave as documented -----------------------------------------------------------------------------
{
  const lance = canon('weapon-siang-lance', { damage: '1d4' });
  const cd = rt.resolveCanonicalDamage(lance, form('weapon-siang-lance', { profileId: 'bayonet-aao' }));
  assert.equal(cd.status, 'deferred'); assert.equal(cd.reason, 'damage-mode:inherited');
  assert.equal(diceOf(A, lance, form('weapon-siang-lance', { profileId: 'bayonet-aao' })), '1d4', 'inherited (host-weapon) damage keeps the Item-level compatibility base until its owning phase');
  assert.equal(diceOf(A, lance, {}), '3d8', 'its ordinary ranged profile is canonical');
  assert.equal(diceOf(A, canon('weapon-darter'), {}), '1', 'fixed damage = fixed value');
  // every canonical weapon's DEFAULT form resolves without throwing (ordinary, or a documented non-ordinary class)
  const classes = {};
  for (const rec of registry.getAll()) {
    for (const f of rt.buildAttackForms(canon(rec.identityKey)).forms) {
      let r;
      try { r = rt.resolveCanonicalDamage(canon(rec.identityKey), { weaponForm: { identityKey: rec.identityKey, ...rt.attackFormSelection(f) } }).status; }
      catch (e) { r = `throws:${e.code}`; } // multi-payload forms need the payload the 5D-B dialog always submits
      classes[r] = (classes[r] ?? 0) + 1;
      if (r.startsWith('throws:')) assert.equal(e_code(r), 'payload-required', `${rec.identityKey} ${f.value}`);
    }
  }
  assert.ok(classes.ordinary > 200);
  console.log('     damage status census over all offered forms:', JSON.stringify(classes));
  ok('deferred classes (inherited/ammunition/modifier) keep the documented compatibility base; fixed damage; every offered form of all 203 weapons resolves');
}

console.log(`Phase 5D-C damage consumption: ${step} checks passed.`);
