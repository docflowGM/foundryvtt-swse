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

// --- SummaryStep disagreement (the reported inconsistency): average setting at an auto-max level ---
{
  let SummaryStep = null;
  try { ({ SummaryStep } = await import(new URL('../scripts/apps/progression-framework/steps/summary-step.js', import.meta.url).href)); } catch (e) { console.log('SummaryStep import unavailable under harness:', e.message); }
  if (SummaryStep) {
    rules({ gen: 'average', max: 5 });
    const step = new SummaryStep({ stepId: 'summary', label: 'Summary' });
    const a = actor(); a.system.level = 2; a.system.derived = { attributes: { con: { mod: 2 } } };
    a.items = [{ type: 'class', name: 'Soldier', system: { hitDie: 10 } }];
    await step._checkHPGainResolution({ actor: a, mode: 'levelup', progressionSession: { draftSelections: { class: { name: 'Soldier', system: { hitDie: 10 } } } } });
    assert.equal(step._hpGainState.method, 'maximum', 'level 3 <= maxHPLevels 5 must be maximum even though the method is average');
    assert.equal(step._hpGainState.gain, 12);
    assert.equal(step._hpGainState.autoMax, true);
    rules({ gen: 'average', max: 1 });
    await step._checkHPGainResolution({ actor: a, mode: 'levelup', progressionSession: { draftSelections: { class: { name: 'Soldier', system: { hitDie: 10 } } } } });
    assert.equal(step._hpGainState.method, 'average'); assert.equal(step._hpGainState.gain, 8);
    rules({ gen: 'roll', max: 1 });
    await step._checkHPGainResolution({ actor: a, mode: 'levelup', progressionSession: { draftSelections: { class: { name: 'Soldier', system: { hitDie: 10 } } } } });
    assert.equal(step._hpGainState.needsResolution, true, 'roll at a non-auto level still needs the player');
    assert.equal(step._hpGainState.rules.hpGeneration, 'roll', 'rules are captured for the history record');
    await step.useMaximumHPGain(a, null);
    assert.equal(step._hpGainState.method, 'maximum'); assert.equal(step._hpGainState.playerChoice, true, 'player choosing maximum under Roll is preserved and recorded');
  }
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
