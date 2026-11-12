import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// HP house-rule authority: the rules active when a level is EARNED determine its HP; the recorded result is what the
// character keeps. Real production modules; only the setting readers (ProgressionRules.*) are overridden per case.
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window ??= globalThis; globalThis.window.location ??= { hostname: 'test' };
globalThis.document ??= { addEventListener() {}, createElement: () => ({}) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (b) => b } };

const { ProgressionRules } = await import('/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js');
const { HPGeneratorEngine } = await import(new URL('../scripts/engine/HP/HPGeneratorEngine.js', import.meta.url).href);
const { ProgressionEconomyPlanBuilder } = await import(new URL('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js', import.meta.url).href);
const { ProgressionMetadataPlanBuilder } = await import(new URL('../scripts/apps/progression-framework/shell/mutation/progression-metadata-plan-builder.js', import.meta.url).href);
const { planHpRecompute, auditHp } = await import(new URL('../scripts/engine/HP/hp-accounting.js', import.meta.url).href);

function rules({ gen = 'average', max = 1, recovery = 'none' } = {}) {
  ProgressionRules.getHPGeneration = () => gen;
  ProgressionRules.getMaxHPLevels = () => max;
  ProgressionRules.getLevelUpHpRecoveryMode = () => recovery;
}
const actor = (over = {}) => ({
  id: 'a', type: 'character', name: 'T',
  system: { level: 4, attributes: { con: { base: 14, racial: 0, enhancement: 0, temp: 0, mod: 2 } }, hp: { value: 30, max: 40 }, progression: {} },
  items: [], ...over,
});

// --- precedence: automatic-maximum levels override the selected method (all four methods) ---
for (const gen of ['roll', 'average', 'maximum', 'average_minimum']) {
  rules({ gen, max: 3 });
  assert.deepEqual(HPGeneratorEngine.resolveMethod({ newLevel: 3 }), { method: 'maximum', autoMax: true }, `${gen}: level<=maxHPLevels is max`);
  assert.deepEqual(HPGeneratorEngine.resolveMethod({ newLevel: 4 }), { method: gen, autoMax: false });
  // the engine agrees with the resolver
  assert.equal(HPGeneratorEngine.calculateHPGain(actor(), 3, 10), 12, `${gen}: auto-max gain = d10 + CON`);
}
rules({ gen: 'average', max: 1 });
assert.equal(HPGeneratorEngine.calculateHPGain(actor(), 4, 10), 8, 'average d10 = 6, +2 CON');
rules({ gen: 'maximum', max: 1 });
assert.equal(HPGeneratorEngine.calculateHPGain(actor(), 4, 8), 10);
rules({ gen: 'roll', max: 0 });
for (let i = 0; i < 50; i++) { const g = HPGeneratorEngine.calculateHPGain(actor(), 4, 6); assert.ok(g >= 3 && g <= 8); }
rules({ gen: 'average_minimum', max: 0 });
for (let i = 0; i < 50; i++) { const g = HPGeneratorEngine.calculateHPGain(actor(), 4, 10); assert.ok(g >= 8 && g <= 12, 'floor = average (6)+2'); }
// droid: no CON; minimum gain 1
rules({ gen: 'maximum', max: 0 });
const droid = actor({ type: 'droid' }); droid.system.attributes.con.mod = 5;
assert.equal(HPGeneratorEngine.calculateHPGain(droid, 4, 8), 8);
const weak = actor(); weak.system.attributes.con.mod = -5;
assert.equal(HPGeneratorEngine.calculateHPGain(weak, 4, 4), 1, 'minimum gain of 1');

// --- SummaryStep (MANDATORY import: a load failure fails this test, assertions never skip) ---
const { SummaryStep } = await import(new URL('../scripts/apps/progression-framework/steps/summary-step.js', import.meta.url).href);
assert.equal(typeof SummaryStep, 'function', 'the real production SummaryStep must load');
{
  const sel = (hitDie = 10, name = 'Soldier') => ({ draftSelections: { class: { name, system: { hitDie } } } });
  const lvl2 = () => { const a = actor(); a.system.level = 2; a.system.derived = { attributes: { con: { mod: 2 } } }; a.items = [{ type: 'class', name: 'Soldier', system: { hitDie: 10 } }]; return a; };
  const check = (step, a, hitDie = 10, name = 'Soldier') => step._checkHPGainResolution({ actor: a, mode: 'levelup', progressionSession: sel(hitDie, name) });
  const newStep = () => new SummaryStep({ stepId: 'summary', label: 'Summary' });

  rules({ gen: 'average', max: 5 });
  let step = newStep(); const a = lvl2();
  await check(step, a);
  assert.equal(step._hpGainState.method, 'maximum', 'level 3 <= maxHPLevels 5 must be maximum even though the method is average');
  assert.equal(step._hpGainState.gain, 12); assert.equal(step._hpGainState.autoMax, true);
  rules({ gen: 'average', max: 1 });
  await check(step, a);
  assert.equal(step._hpGainState.method, 'average'); assert.equal(step._hpGainState.gain, 8);
  rules({ gen: 'roll', max: 1 });
  await check(step, a);
  assert.equal(step._hpGainState.needsResolution, true, 'roll at a non-auto level still needs the player');
  assert.equal(step._hpGainState.rules.hpGeneration, 'roll', 'rules are captured for the history record');
  await step.useMaximumHPGain(a, null);
  assert.equal(step._hpGainState.method, 'maximum'); assert.equal(step._hpGainState.playerChoice, true, 'player choosing maximum under Roll is preserved and recorded');

  // HP-F4: a pending player resolution is only valid for the context it was made in
  const resolved = async (mutate, hitDie = 10, name = 'Soldier') => {
    rules({ gen: 'roll', max: 1 });
    const st = newStep(); const ac = lvl2();
    await check(st, ac); await st.useMaximumHPGain(ac, null);
    assert.equal(st._hpGainState.resolved, true);
    const sameContext = st._hpGainState.contextKey;
    mutate(ac);
    await check(st, ac, hitDie, name);
    return { st, sameContext };
  };
  let r = await resolved(() => {});
  assert.equal(r.st._hpGainState.resolved, true, 'unchanged context keeps the player resolution');
  assert.equal(r.st._hpGainState.playerChoice, true);
  r = await resolved(() => rules({ gen: 'average_minimum', max: 1 }));
  assert.equal(r.st._hpGainState.resolved, false, 'generation method changed: the old result is discarded');
  assert.equal(r.st._hpGainState.playerChoice, undefined); assert.equal(r.st._hpGainState.rules.hpGeneration, 'average_minimum');
  r = await resolved(() => rules({ gen: 'roll', max: 3 }));
  assert.equal(r.st._hpGainState.autoMax, true, 'threshold moved over this level: automatic maximum, no stale roll'); assert.equal(r.st._hpGainState.method, 'maximum');
  assert.equal(r.st._hpGainState.playerChoice, undefined);
  r = await resolved(() => {}, 8);
  assert.equal(r.st._hpGainState.resolved, false, 'hit die changed (class change)');
  r = await resolved((ac) => { ac.system.derived.attributes.con.mod = 3; });
  assert.equal(r.st._hpGainState.resolved, false, 'CON modifier changed');
  r = await resolved((ac) => { ac.system.level = 3; });
  assert.equal(r.st._hpGainState.resolved, false, 'character level changed');
  r = await resolved(() => {}, 10, 'Scout');
  assert.equal(r.st._hpGainState.resolved, false, 'selected class changed');
  // a recovery-mode change is not a generation input: the player roll survives
  rules({ gen: 'roll', max: 1, recovery: 'none' });
  const st2 = newStep(); const a2 = lvl2(); await check(st2, a2); await st2.useMaximumHPGain(a2, null);
  rules({ gen: 'roll', max: 1, recovery: 'refillToMax' }); await check(st2, a2);
  assert.equal(st2._hpGainState.resolved, true);
}

// --- current HP recovery modes (live level-up builder), independent of max generation ---
{
  const survey = { hpGain: 8, hpGainMethod: 'average', hpGainFormula: '1d10 +2' };
  const sel = { survey, class: { name: 'Soldier', system: { hitDie: 10 } } };
  const run = (mode) => { rules({ gen: 'average', max: 1, recovery: mode });
    return ProgressionEconomyPlanBuilder.buildLevelUpSet({ actor: actor(), selections: sel, sessionState: { targetLevel: 5, progressionSession: { targetLevel: 5, draftSelections: sel } }, planSet: { 'system.level': 5 } }); };
  let set = run('none');     assert.equal(set['system.hp.max'], 48); assert.equal(set['system.hp.value'], 30, 'none preserves current HP');
  set = run('refillToMax');  assert.equal(set['system.hp.value'], 48);
  set = run('increaseCurrentByMaxGain'); assert.equal(set['system.hp.value'], 38);
  assert.equal(set['system.progression.hpLedger'].level, 5, 'live path writes the ledger');
  assert.equal(set['system.progression.hpLedger'].conMod, 2);
  assert.equal(set['system.progression.lastHpGain'].recoveryMode, 'increaseCurrentByMaxGain');
}

// --- historical record carries evidence and later settings never rewrite earlier results ---
{
  rules({ gen: 'roll', max: 1 });
  const rec = (level, amount, extra = {}) => ({ characterLevel: level, level, amount, method: 'rolled', hitDie: 10, houseRules: { hpGeneration: 'roll', maxHPLevels: 1, levelUpHpRecoveryMode: 'none' }, ...extra });
  const a = actor(); a.system.progression.hpGainHistory = [rec(2, 3), rec(3, 9), rec(4, 5)];
  const survey = { hpGain: 12, hpGainMethod: 'maximum', hpGainFormula: '1d10 +2', hpGainHitDie: 10, hpGainConMod: 2, hpGainAutoMax: false, hpGainPlayerChoice: true, hpGainRules: { hpGeneration: 'maximum', maxHPLevels: 1, levelUpHpRecoveryMode: 'none' } };
  const set = ProgressionMetadataPlanBuilder.buildSet({ actor: a, sessionState: { mode: 'levelup', targetLevel: 5, progressionSession: { targetLevel: 5, sessionId: 's-1', draftSelections: { survey, class: { name: 'Soldier' } } } } });
  const hist = set['system.progression.hpGainHistory'];
  assert.deepEqual(hist.slice(0, 3).map(r => r.amount), [3, 9, 5], 'earlier rolled results untouched when the campaign changes to maximum');
  const last = hist.at(-1);
  assert.equal(last.amount, 12); assert.equal(last.generationMethod, 'maximum'); assert.equal(last.hitDie, 10);
  assert.equal(last.constitutionModifier, 2); assert.equal(last.playerChoice, true);
  assert.equal(last.houseRules.hpGeneration, 'maximum'); assert.equal(last.characterLevel, 5);
  assert.ok(last.timestamp);
  // missing evidence is not fabricated
  const bare = ProgressionMetadataPlanBuilder.buildSet({ actor: actor(), sessionState: { mode: 'levelup', targetLevel: 5, progressionSession: { targetLevel: 5, draftSelections: { survey: { hpGain: 7, hpGainMethod: 'average', hpGainFormula: '1d10 +2' }, class: { name: 'Soldier' } } } } })['system.progression.hpGainHistory'].at(-1);
  assert.equal(bare.houseRules, null); assert.equal(bare.rolledResult, null);
  // HP-F3: absent optional evidence stays null (Number(null) is 0 - must never be stored as a fabricated zero)
  const nul = ProgressionMetadataPlanBuilder.buildSet({ actor: actor(), sessionState: { mode: 'levelup', targetLevel: 5, progressionSession: { targetLevel: 5, draftSelections: { survey: { hpGain: 7, hpGainMethod: 'average', hpGainFormula: null, hpGainHitDie: null, hpGainRolled: null, hpGainConMod: null }, class: { name: 'Soldier' } } } } })['system.progression.hpGainHistory'].at(-1);
  assert.equal(nul.hitDie, null, 'absent hit die is null, not 0'); assert.equal(nul.rolledResult, null, 'absent roll is null, not 0');
  assert.notEqual(nul.constitutionModifier, undefined);
  const zero = ProgressionMetadataPlanBuilder.buildSet({ actor: actor(), sessionState: { mode: 'levelup', targetLevel: 5, progressionSession: { targetLevel: 5, draftSelections: { survey: { hpGain: 7, hpGainMethod: 'rolled', hpGainHitDie: 10, hpGainRolled: 0, hpGainConMod: 0 }, class: { name: 'Soldier' } } } } })['system.progression.hpGainHistory'].at(-1);
  assert.equal(zero.constitutionModifier, 0, 'a genuine 0 modifier is preserved'); assert.equal(zero.hitDie, 10);
}

// --- recompute never applies today's HP house rules or recovery policy ---
{
  rules({ gen: 'maximum', max: 20, recovery: 'refillToMax' });
  const a = actor(); a.items = [{ type: 'class', name: 'Soldier', system: {} }];
  a.system.progression.hpLedger = { conMod: 2, featBonus: 0, bonus: 0, level: 4 };
  assert.equal(planHpRecompute(a).action, 'unchanged', 'changing HP house rules changes nothing already earned');
  a.system.attributes.con.base = 16; a.system.attributes.con.mod = 3;
  const p = planHpRecompute(a); assert.equal(p.delta, 4); assert.equal(p.newMax, 44);
  assert.equal(Object.keys(p).includes('currentHp'), false, 'recompute carries no current-HP policy');
}

// --- reconciliation: legitimate history under different past rules is never an error ---
{
  const a = actor(); a.items = [{ type: 'class', name: 'Soldier', system: {} }];
  assert.equal(auditHp(a).status, 'incomplete', 'no ledger => informational, not an error');
}
console.log('hp-house-rule-authority.test.mjs: all assertions passed');
