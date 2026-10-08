import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-D -- the canonical attack form selected in 5D-B/retained by 5D-C also determines range semantics and ammunition cost.
// Canonical runtime = WHAT (range facet / units of resource); existing getRangePenalty + AmmoSystem = HOW. Preview never mutates;
// one mutation point (AmmoSystem.spendForWorkflow) spends exactly once; invalid canonical selections spend nothing.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
const notes = { error: [], warn: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: () => {}, error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.game = globalThis.game ?? {};
let tracking = true;
globalThis.game.settings = { get: (_sys, key) => (key === 'trackBlasterCharges' ? tracking : undefined) };

const { resolveAttackBonus, resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { getRangePenalty } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');
const { computeFinalAttackComposition, rollAttack } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const { buildRollConfigModel, buildAttackFormPanel } = await import('/systems/foundryvtt-swse/scripts/rolls/roll-config.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const ser = await import('/systems/foundryvtt-swse/scripts/engine/combat/workflow/combat-context-serializer.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry, resolver } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ feats = [], type = 'character' } = {}) {
  return {
    id: 'a1', name: 'Tester', type, flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
    items: col(feats.map((f, i) => ({ id: `f${i}`, type: 'feat', name: f, system: {} }))),
    system: { bab: 5, level: 6, attributes: { str: ab(3), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
  };
}
// canonical item with realistic classification, a counter pool, and deliberately STALE Item-level range/damage fields
const PROF = ['Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)', 'Weapon Proficiency (Advanced Melee Weapons)', 'Weapon Proficiency (Heavy Weapons)'];
const A = () => makeActor({ feats: PROF });
let updates = 0;
function canon(k, { pool = null, system = {}, flags = {} } = {}) {
  const w = { id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k }, ...flags } },
    system: { damage: '9d9', damageType: 'sonic', weaponCategory: 'ranged', ...system } };
  if (pool) {
    w.system.ammunition = { type: pool.type ?? 'power-pack', current: pool.current, max: pool.max ?? Math.max(pool.current, 10) };
    w.update = async (patch) => { updates += 1; w.system.ammunition.current = patch['system.ammunition.current']; };
  }
  return w;
}
const legacy = (system = {}, pool = null) => { const w = { id: 'hb', name: 'Homebrew', type: 'weapon', system: { weaponCategory: 'ranged', proficiency: 'pistols', damage: '3d6', ...system } }; if (pool) { w.system.ammunition = { type: 'power-pack', current: pool, max: 20 }; w.update = async (p) => { updates += 1; w.system.ammunition.current = p['system.ammunition.current']; }; } return w; };
const sel = (k, o) => ({ weaponForm: { identityKey: k, ...o } });
const sandbox = async (fn) => {
  const calls = [];
  const origSafe = RollEngine.safeRoll, origPost = SWSEChat.postRoll;
  RollEngine.safeRoll = async (f) => { calls.push(f); return { total: 15, formula: f, dice: [{ results: [{ result: 12 }] }] }; };
  SWSEChat.postRoll = async (p) => { calls.postedCards = [...(calls.postedCards ?? []), p]; return {}; };
  try { return await fn(calls); } finally { RollEngine.safeRoll = origSafe; SWSEChat.postRoll = origPost; }
};
const attack = (actor, w, o = {}) => sandbox(() => rollAttack(actor, w, { suppressChat: true, ...o }));

// =====================================================================================================================
// ALL-203 CENSUS (derived audit artifact from canonical runtime authority; not a new SSOT)
// =====================================================================================================================
const census = { identities: 0, forms: 0, refusedForms: [], range: {}, resource: {}, payloadWeapons: 0, modeForms: 0, configForms: 0, ammoDependentDamage: [], nonUnitCost: [], configCostVaries: 0 };
{
  const bump = (m, k) => { m[k] = (m[k] ?? 0) + 1; };
  for (const rec of registry.getAll()) {
    census.identities += 1;
    const base = resolver.resolveIdentity(rec.identityKey);
    const item = canon(rec.identityKey);
    // refused: profiles whose branch contradicts their own range mode
    for (const p of base.profiles) { try { rt.resolveCanonicalRange(base, p); } catch (e) { census.refusedForms.push(`${rec.identityKey}/${p.id}:${e.code}`); } }
    const info = rt.buildAttackForms(item);
    if (info.payloads.length) census.payloadWeapons += 1;
    const costsByProfile = {};
    for (const f of info.forms) {
      census.forms += 1;
      const runtime = rt.resolveAttackWeaponRuntime(item, { ...rt.attackFormSelection(f), ...(info.payloads.length ? { payloadId: info.payloads[0].value } : {}) });
      bump(census.range, runtime.range.status);
      const c = rt.resolveAttackResourceCost(runtime);
      bump(census.resource, `${c.status}${c.status === 'cost' ? (c.units === 1 ? ':1' : ':n>1') : ''}`);
      if (c.status === 'cost' && c.units !== 1) census.nonUnitCost.push(`${rec.identityKey}/${f.profileId}${f.modeId ? '#' + f.modeId : ''}=${c.units}`);
      if (f.modeId) census.modeForms += 1;
      if (f.configurationId) { census.configForms += 1; (costsByProfile[f.profileId] ??= new Set()).add(`${c.status}:${c.units}`); }
      const d = rt.resolveCanonicalDamage(item, { weaponForm: { identityKey: rec.identityKey, ...rt.attackFormSelection(f), ...(info.payloads.length ? { payloadId: info.payloads[0].value } : {}) } });
      if (d.status === 'deferred' && d.reason === 'loaded-ammo-identity-unavailable') census.ammoDependentDamage.push(`${rec.identityKey}/${f.profileId}`);
    }
    for (const set of Object.values(costsByProfile)) if (set.size > 1) census.configCostVaries += 1;
  }
  assert.equal(census.identities, 203);
  assert.deepEqual(census.refusedForms, [], 'no canonical profile contradicts its own range mode (Darkstick/Static Pike thrown were corrected by the source-proven 5D-D amendment)');
  assert.ok(census.forms > 200);
  console.log('     census:', JSON.stringify({ forms: census.forms, range: census.range, resource: census.resource, payloadWeapons: census.payloadWeapons, modeForms: census.modeForms, configForms: census.configForms, nonUnitCost: census.nonUnitCost, ammoDependentDamage: census.ammoDependentDamage, configCostVaries: census.configCostVaries, refused: census.refusedForms }));
  ok('all-203 census: every offered form resolves a range facet + resource class; no canonical profile contradicts its range mode; ammo-dependent damage + non-unit costs enumerated');
}

// ---- RANGE ----------------------------------------------------------------------------------------------------------------------
{
  const baton = canon('weapon-stun-baton', { system: { weaponCategory: 'melee', rangePenalty: -7 } });
  const rt0 = rt.resolveAttackWeaponRuntime(baton, {});
  assert.equal(getRangePenalty(baton, { weaponRuntime: rt0, rangeBand: 'long' }), 0, 'canonical melee form: no ranged penalty, stale Item rangePenalty ignored');
  assert.equal(rt0.range.status, 'melee');
  assert.equal(getRangePenalty(legacy({ rangePenalty: -7 }), { rangeBand: 'long' }), -7, 'legacy keeps Item-level range data');
  assert.equal(getRangePenalty(legacy(), { rangeBand: 'short' }), -2); assert.equal(getRangePenalty(legacy(), { rangeBand: 'long' }), -10);
  ok('canonical melee form: 0 (stale Item range ignored); legacy weapon unchanged');

  const pistol = canon('weapon-blaster-pistol', { system: { rangePenalty: 0 } });
  const pr = rt.resolveAttackWeaponRuntime(pistol, {});
  const pen = (band) => getRangePenalty(pistol, { weaponRuntime: pr, rangeBand: band });
  assert.deepEqual([pen('pointBlank'), pen('short'), pen('medium'), pen('long')], [0, -2, -5, -10], 'canonical band table; stale Item rangePenalty:0 cannot erase it');
  assert.equal(pr.range.status, 'banded'); assert.equal(pr.range.family, 'pistols');
  assert.equal(getRangePenalty(pistol, { weaponRuntime: pr, rangeBand: 'medium', rangePenalty: -1 }), -1, 'explicit caller penalty still wins');
  // a canonical profile whose short band is overridden (Accurate-style) -- found in the registry, not hard-coded by name
  const over = registry.getAll().flatMap((r) => resolver.resolveIdentity(r.identityKey).profiles.filter((p) => p.definition.range?.qualityEffects?.shortPenaltyOverride === 0 && p.definition.range?.mode === 'ranged').map((p) => [r.identityKey, p.id]))[0];
  assert.ok(over, 'registry contains a short-penalty override profile');
  const orw = canon(over[0]); const orr = rt.resolveAttackWeaponRuntime(orw, { ...rt.attackFormSelection(rt.buildAttackForms(orw).forms.find((f) => f.profileId === over[1])) });
  assert.equal(getRangePenalty(orw, { weaponRuntime: orr, rangeBand: 'short' }), 0, 'canonical shortPenaltyOverride honored (generic table would say -2)');
  assert.equal(getRangePenalty(orw, { weaponRuntime: orr, rangeBand: 'medium' }), -5);
  ok('canonical ranged form uses the canonical band table incl. short-penalty override; Item rangePenalty cannot override');

  // cross-profile (Electropole): the selected profile decides
  const pole = canon('weapon-gungan-electropole', { system: { weaponCategory: 'melee', proficiency: 'advanced' } });
  const att = A();
  const atkAt = (profileId, band) => resolveAttackBonus(att, pole, null, { profileId, rangeBand: band });
  assert.equal(atkAt('melee', 'medium').components['Range Penalty'], undefined, 'melee profile never receives ranged penalties');
  assert.equal(atkAt('thrown', 'medium').components['Range Penalty'], -5);
  assert.equal(atkAt('thrown', 'medium').weaponRuntime.range.status, 'banded');
  ok('cross-branch weapon: range behavior follows the selected profile (melee 0, thrown -5 at medium)');

  // preview == roll: same composition seam, same facet; invalid band fails closed (before any cost)
  const prev = await computeFinalAttackComposition(att, pole, { profileId: 'thrown', rangeBand: 'medium' });
  const roll = await computeFinalAttackComposition(att, pole, { ...rt.attackFormSelection(rt.findAttackForm(rt.buildAttackForms(pole).forms, 'thrown')), rangeBand: 'medium' });
  assert.equal(prev.atkBonus, roll.atkBonus); assert.equal(prev.attackBonusResolution.weaponRuntime.range.status, roll.attackBonusResolution.weaponRuntime.range.status);
  assert.equal(prev.attackBonusResolution.components['Range Penalty'], -5, 'applied exactly once');
  const noLong = registry.getAll().flatMap((r) => resolver.resolveIdentity(r.identityKey).profiles.filter((p) => p.definition.range?.qualityEffects?.longAllowed === false && p.definition.range?.mode === 'ranged').map((p) => [r.identityKey, p.id]))[0];
  const nlw = canon(noLong[0]); const nlSel = rt.attackFormSelection(rt.buildAttackForms(nlw).forms.find((f) => f.profileId === noLong[1]));
  assert.equal((await computeFinalAttackComposition(att, nlw, { ...nlSel, rangeBand: 'medium' })).ok, true);
  const bad = await computeFinalAttackComposition(att, nlw, { ...nlSel, rangeBand: 'long' });
  assert.equal(bad.ok, false); assert.equal(bad.weaponRuntimeError.code, 'range-band-not-allowed');
  const m = await buildRollConfigModel({ actor: att, rollType: 'attack', weapon: nlw, ...nlSel });
  assert.ok(!m.allowedRangeBands.includes('long'), 'dialog never offers a band the canonical form forbids');
  ok('preview and roll resolve the same range facet; a band the form forbids fails closed and is not offered');

  // stale Item-level range data cannot override; pending facets keep the existing arithmetic
  const bow = canon('weapon-bowcaster'); const bowRt = rt.resolveAttackWeaponRuntime(bow, {});
  assert.equal(bowRt.range.status, 'pending');
  assert.equal(getRangePenalty(bow, { weaponRuntime: bowRt, rangeBand: 'short' }), -2, 'unresolved canonical range keeps the generic band arithmetic (nothing invented)');
  // the consistency guard still refuses a contradictory profile (synthetic: a thrown-weapons ranged block on a melee-branch profile)
  const axe = resolver.resolveIdentity('unmapped::Axe', null, { profileId: 'thrown' });
  const axeThrown = axe.profiles.find((p) => p.id === 'thrown');
  assert.doesNotThrow(() => rt.resolveCanonicalRange(axe, axeThrown));
  assert.throws(() => rt.resolveCanonicalRange(axe, { ...axeThrown, branch: 'melee' }), (e) => e.code === 'range-branch-mismatch');
  // the formerly contradictory records (Darkstick / Static Pike thrown) are now consistent, usable ranged forms
  for (const k of ['unmapped::Darkstick', 'unmapped::Static Pike']) assert.ok(rt.buildAttackForms(canon(k)).forms.some((f) => f.profileId === 'thrown' && f.branch === 'ranged'), k);
  ok('pending range facets keep generic arithmetic; the consistency guard still refuses a contradictory profile; corrected Darkstick/Static Pike thrown forms are offered');
}

// ---- RESOURCE: costs --------------------------------------------------------------------------------------------------------------
{
  // resource-free melee weapon attacks normally
  const baton = canon('weapon-stun-baton', { system: { weaponCategory: 'melee' } });
  updates = 0;
  assert.ok(await attack(A(), baton)); assert.equal(updates, 0);
  // preview / recompute / rerender consume zero
  const pistol = () => canon('weapon-blaster-pistol', { pool: { current: 10, max: 100 }, system: { proficiency: 'pistols' } });
  const w = pistol();
  updates = 0;
  for (let i = 0; i < 3; i += 1) { await computeFinalAttackComposition(A(), w, {}); await buildRollConfigModel({ actor: A(), rollType: 'attack', weapon: w }); AmmoSystem.resolveAmmoCost({ weapon: w, options: { canonicalAmmoUnits: 1 } }); }
  assert.equal(updates, 0); assert.equal(w.system.ammunition.current, 10);
  ok('resource-free melee attacks normally; preview/recompute/rerender consume zero');

  // successful attack consumes exactly once
  assert.ok(await attack(A(), w)); assert.equal(updates, 1, 'exactly one mutation'); assert.equal(w.system.ammunition.current, 9);

  // non-default canonical costs (representative non-1 values present in the canonical data)
  const vb = (current) => canon('weapon-variable-blaster', { pool: { current, max: 500 }, system: { proficiency: 'pistols' } });
  const mode = (id) => ({ profileId: id, modeId: id });
  for (const [id, cost] of [['low', 1], ['medium', 5], ['high', 10]]) {
    const v = vb(100); updates = 0;
    assert.ok(await attack(A(), v, mode(id))); assert.equal(v.system.ammunition.current, 100 - cost, `Variable Blaster ${id} costs ${cost}`); assert.equal(updates, 1);
  }
  const dbc = canon('weapon-double-barreled-blaster-carbine', { pool: { current: 20, max: 50 }, system: { proficiency: 'rifles' } });
  assert.ok(await attack(A(), dbc, { profileId: 'double-shot', modeId: 'double-shot' })); assert.equal(dbc.system.ammunition.current, 18, 'double-shot spends 2 (shotsPerAttack)');
  const blue = canon('weapon-bluebolt-blaster-pistol', { pool: { current: 20, max: 50 }, system: { proficiency: 'pistols' } });
  assert.ok(await attack(A(), blue, { damageMode: 'stun' })); assert.equal(blue.system.ammunition.current, 18, 'stun consumes stunUnits (2)');
  assert.ok(await attack(A(), blue, {})); assert.equal(blue.system.ammunition.current, 17, 'normal attack consumes 1');
  ok('mode/profile-specific units spend exactly: Variable Blaster 1/5/10, double-shot 2, Bluebolt stun 2');

  // melee form of a ranged weapon spends nothing; its ranged form spends the default
  const lance = () => canon('weapon-siang-lance', { pool: { current: 10, max: 10 }, system: { proficiency: 'exotic' } });
  const lA = makeActor({ feats: [{ name: 'Weapon Proficiency', flags: { swse: { choices: { weaponProficiency: { group: 'exotic', weaponIdentity: 'weapon-siang-lance' } } } } }, ...PROF.map((n) => n)].map((f) => (typeof f === 'string' ? f : f.name)) });
  const l1 = lance(); updates = 0; assert.ok(await attack(lA, l1, { profileId: 'bayonet-aao', attackOfOpportunity: true })); // 5D-I-B: the bayonet profile is the attack-of-opportunity choice (its structured choice requirement)
  void 0; assert.equal(updates, 0, 'bayonet (melee) form spends no ammunition');
  const l2 = lance(); assert.ok(await attack(lA, l2, { profileId: 'ranged' })); assert.equal(l2.system.ammunition.current, 9);
  ok('melee form of a ranged weapon spends 0; ranged form spends the existing default');

  // facet classes: untracked secondary resource and pending (non-numeric) cost
  const hv = rt.resolveAttackWeaponRuntime(canon('weapon-heavy-variable-blaster'), { profileId: 'ascension', modeId: 'ascension' });
  assert.deepEqual([rt.resolveAttackResourceCost(hv).status, rt.resolveAttackResourceCost(hv).resourceId], ['untracked', 'syntherope-lengths']);
  const rot = rt.resolveAttackWeaponRuntime(canon('weapon-rotary-blaster-cannon'), { profileId: 'autofire' });
  assert.equal(rt.resolveAttackResourceCost(rot).status, 'pending', 'non-numeric canonical cost is not invented');
  ok('secondary-resource cost is untracked (never debited from the wrong pool); non-numeric cost stays pending');
}

// ---- RESOURCE: validation / ordering / fail closed ----------------------------------------------------------------------------------------
{
  const vbw = (current) => canon('weapon-variable-blaster', { pool: { current, max: 500 }, system: { proficiency: 'pistols' } });
  let v = vbw(3); updates = 0; notes.error.length = 0;
  assert.equal(await attack(A(), v, { profileId: 'high', modeId: 'high' }), null, 'insufficient ammunition for the selected form prevents the attack');
  assert.equal(updates, 0); assert.equal(v.system.ammunition.current, 3); assert.ok(notes.error.some((m) => /needs 7 more rounds \(3\/10\)/.test(m)), "preflight reports the selected form cost (10) against the pool (3)");
  assert.ok(await attack(A(), v, { profileId: 'low', modeId: 'low' }), 'same weapon, cheaper form still fires');
  ok('insufficient ammunition for the selected form prevents the attack and spends nothing');

  // invalid canonical selections spend nothing
  const w = canon('weapon-blaster-pistol', { pool: { current: 10, max: 100 } });
  for (const bad of [{ profileId: 'bogus' }, { payloadId: 'bogus' }, { configurationId: 'bogus' }, { modeId: 'bogus' }, { rangeBand: 'long', profileId: 'bogus' }]) {
    updates = 0; assert.equal(await attack(A(), w, bad), null, JSON.stringify(bad)); assert.equal(updates, 0);
  }
  const nl = registry.getAll().flatMap((r) => resolver.resolveIdentity(r.identityKey).profiles.filter((p) => p.definition.range?.qualityEffects?.longAllowed === false && p.definition.range?.mode === 'ranged').map((p) => [r.identityKey, p.id]))[0];
  const nlw = canon(nl[0], { pool: { current: 10, max: 100 } });
  updates = 0; assert.equal(await attack(A(), nlw, { ...rt.attackFormSelection(rt.buildAttackForms(nlw).forms.find((f) => f.profileId === nl[1])), rangeBand: 'long' }), null); assert.equal(updates, 0, 'forbidden band: nothing spent');
  const lanFail = canon('weapon-wrist-rocket-launcher', { pool: { current: 1, max: 1, type: 'wrist-rockets' } });
  updates = 0; assert.equal(await attack(A(), lanFail, { profileId: 'primary', payloadId: 'not-a-rocket' }), null); assert.equal(updates, 0, 'invalid payload spends nothing');
  ok('invalid profile / payload / configuration / mode / forbidden band: nothing spent');

  // ordering: validation + ammunition preflight precede every cost commit; the single mutation point is spendForWorkflow
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export async function rollAttack('), src.indexOf('export async function rollDamage('));
  const at = (needle) => fn.indexOf(needle);
  assert.ok(at('withCanonicalWeaponRuntime(weapon, rollOptions)') < at('AmmoSystem.preflightAmmunition(') && at('AmmoSystem.preflightAmmunition(') < at('spendCoreAttackOptionCosts(') && at('spendCoreAttackOptionCosts(') < at('AmmoSystem.spendForWorkflow('));
  assert.equal((fn.match(/AmmoSystem\.spendForWorkflow\(/g) ?? []).length, 1, 'one spend call in rollAttack');
  assert.ok(!/consumeAmmunition|setAmmunition/.test(src.slice(src.indexOf('export async function computeFinalAttackComposition('), src.indexOf('function getFightingDefensivelyAttackPenalty'))), 'preview seam has no spend');
  ok('order: canonical resolve -> range/damage-mode validation -> ammo preflight -> action-option costs -> single spend; preview seam cannot spend');

  // autofire / burst protection: canonical units never override the existing burst/autofire rules or an explicit cost
  const aw = canon('weapon-blaster-pistol', { pool: { current: 50, max: 100 } });
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: aw, options: { autofire: true, canonicalAmmoUnits: 1 } }), 10);
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: aw, options: { burstFire: true, canonicalAmmoUnits: 1 } }), 5);
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: aw, options: { ammoCost: 3, canonicalAmmoUnits: 1 } }), 3);
  assert.equal(AmmoSystem.resolveAmmoCost({ weapon: aw, options: {} }), 1, 'no canonical units: the existing rule');
  ok('autofire/burst/explicit-cost rules unchanged (canonical units apply only to ordinary attacks)');

  // legacy weapon: existing behavior
  const hb = legacy({}, 5); updates = 0;
  assert.ok(await attack(A(), hb)); assert.equal(hb.system.ammunition.current, 4); assert.equal(updates, 1);
  tracking = false; const hb2 = legacy({}, 5); updates = 0; assert.ok(await attack(A(), hb2)); assert.equal(updates, 0, 'tracking disabled: nothing spent (house rule off)'); tracking = true;
  ok('legacy/homebrew ranged weapon spends 1 via the existing path; tracking-off spends 0');
}

// ---- PAYLOADS / AMMO-DEPENDENT DAMAGE --------------------------------------------------------------------------------------------------
{
  const wr = (current = 1) => canon('weapon-wrist-rocket-launcher', { pool: { current, max: 1, type: 'wrist-rockets' }, system: { proficiency: 'heavy-weapons' } });
  const payloads = rt.buildAttackForms(wr()).payloads.map((p) => p.value);
  // payload identity is validated and carried; the live ammo model has ONE counter per weapon, so every payload spends from the same canonical resource
  const sources = new Set();
  for (const pid of payloads) {
    const w = wr(); updates = 0;
    const r = await sandbox(async (calls) => {
      const res = await rollAttack(A(), w, { profileId: 'primary', payloadId: pid, suppressChat: false });
      return { res, card: calls.postedCards?.find((c) => c.context?.workflowContext) };
    });
    assert.ok(r.res, pid); assert.equal(w.system.ammunition.current, 0, `${pid}: spends exactly one from the rocket pool`); assert.equal(updates, 1);
    assert.equal(r.card.context.workflowContext.weaponForm.payloadId, pid, 'payload survives into the retained form');
    const rtm = rt.resolveAttackWeaponRuntime(w, { profileId: 'primary', payloadId: pid });
    sources.add(rtm.resolved.canonicalStats.resource.source);
  }
  assert.deepEqual([...sources], ['wrist rockets'], 'canonical data defines one resource (wrist rockets) for every payload: no per-payload inventory identity exists to match');
  ok('payload selection is validated, spends one rocket exactly once, and persists in the retained form (shared single pool documented)');

  const dmg = (pid) => { const w = wr(); const ctx = { weaponForm: { identityKey: 'weapon-wrist-rocket-launcher', profileId: 'primary', payloadId: pid } }; return buildDamageFormula(resolveDamageComposition(A(), w, ctx)).split(' ')[0]; };
  assert.equal(dmg('antipersonnel'), '3d8'); assert.equal(dmg('antivehicle'), '3d10');
  ok('payload damage continues through the retained form (antipersonnel 3d8, antivehicle 3d10)');

  // ammunition-dependent damage that the canonical structure still cannot resolve
  for (const [k, expect] of [['weapon-grenade-launcher', 'loaded-ammo-identity-unavailable'], ['weapon-micro-grenade-launcher', 'loaded-ammo-identity-unavailable']]) {
    const d = rt.resolveCanonicalDamage(canon(k), { weaponForm: { identityKey: k, profileId: 'primary' } });
    assert.equal(d.status, 'deferred'); assert.equal(d.reason, expect, k);
  }
  assert.ok(census.ammoDependentDamage.includes('weapon-grenade-launcher/primary') && census.ammoDependentDamage.includes('weapon-micro-grenade-launcher/primary'));
  ok('Grenade/Micro-Grenade damage stays deferred with an explicit reason: loaded-ammo identity is not represented (documented gap)');
}

// ---- config / regressions ------------------------------------------------------------------------------------------------------------
{
  const vb = canon('unmapped::Vibrobayonet', { system: { weaponCategory: 'melee' } });
  const r1 = rt.resolveAttackWeaponRuntime(vb, { profileId: 'primary', configurationId: 'mounted-on-rifle' });
  const r2 = rt.resolveAttackWeaponRuntime(vb, { profileId: 'detached', configurationId: 'detached' });
  assert.equal(r1.range.status, 'melee'); assert.equal(r2.range.status, 'melee');
  assert.equal(rt.resolveAttackResourceCost(r1).status, 'free'); assert.equal(rt.resolveAttackResourceCost(r2).status, 'free');
  assert.equal(census.configCostVaries, 0, 'no canonical weapon varies its resource semantics by configuration within one profile');
  ok('configuration forms resolve their own facets (Vibrobayonet melee/free in both); no canonical weapon has configuration-varying resource cost');

  const att = makeActor({ feats: ['Weapon Proficiency (Pistols)'] });
  const pist = canon('weapon-blaster-pistol', { system: { proficiency: 'pistols' } });
  assert.equal(resolveAttackBonus(makeActor(), pist, null, {}).components['Proficiency'], -5, '5D-A proficiency still dynamic');
  assert.equal(resolveAttackBonus(att, pist, null, {}).components['Proficiency'], undefined);
  const lan = canon('weapon-massassi-lanvarok', { system: { weaponCategory: 'melee' } });
  assert.equal(resolveAttackBonus(att, lan, null, { profileId: 'melee' }).weaponRuntime.profileId, 'melee', '5D-B selected profile');
  const lf = buildDamageFormula(resolveDamageComposition(att, lan, sel('weapon-massassi-lanvarok', { profileId: 'melee' })));
  assert.match(lf, /^1d8/, '5D-C damage form');
  const npc = makeActor({ type: 'npc' }); npc.system.npcProfile = { mode: 'play' };
  const flat = canon('weapon-blaster-pistol', { pool: { current: 5, max: 10 }, flags: { npc: { useFlat: true, flatAttackBonus: 9 } } });
  const flatRes = await computeFinalAttackComposition(npc, flat, { rangeBand: 'short' });
  assert.equal(flatRes.attackBonusResolution.flags.npcFlat, true);
  assert.equal(flatRes.atkBonus, 9 - 2, 'NPC flat total keeps situational range penalty exactly as before');
  const wire = ser.decodeCombatWorkflowContext(ser.encodeCombatWorkflowContext({}, { weaponForm: { identityKey: 'weapon-variable-blaster', profileId: 'high', modeId: 'high' } }));
  assert.deepEqual(wire.weaponForm, { identityKey: 'weapon-variable-blaster', profileId: 'high', modeId: 'high' });
  ok('regressions: 5D-A proficiency, 5D-B profile, 5D-C damage form + serialization, NPC flat total, all intact');
}

// ---- dialog wiring guard (DOM not runnable headless): range chips / legal bands / ammo note follow the selected canonical form ----
{
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../scripts/rolls/roll-config.js', import.meta.url), 'utf8');
  const upd = src.slice(src.indexOf('const update = async () =>'), src.indexOf("shell.querySelectorAll('[data-check-mode]')"));
  assert.match(upd, /syncAttackFormFacets\(form, live\.form\)/);
  assert.match(src, /canonicalRangeBands\(selectedAttackForm\?\.range\)/);
  assert.match(src, /allowedRangeBands/); assert.match(src, /data-rcd-form-range/); assert.match(src, /data-rcd-ammo-note/);
  assert.ok(!/system\.rangePenalty/.test(src.slice(src.indexOf('function canonicalRangeBands'), src.indexOf('function formatBandChip'))), 'canonical chips never read Item range fields');
  ok('dialog wiring: selected form drives range chips, legal bands and the ammunition note; no Item range read for canonical chips');
}

console.log(`Phase 5D-D range/resource consumption: ${step} checks passed.`);
