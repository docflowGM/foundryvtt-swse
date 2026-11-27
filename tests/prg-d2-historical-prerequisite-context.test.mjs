import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-PRG D2: the historical prerequisite context (recovery slots) is built from RECONSTRUCTED class levels and the canonical BABCalculator; unknown history
// is UNRESOLVED (never the live actor's BAB), later-acquired and provenance-less items are never credited, canonical identity (not the name) decides
// duplicates, and a failed build never falls back to the live actor. Each block fails on the pre-D2 adapter (proportional BAB / current class items /
// name-based dedupe / assumed-known items / live-actor fallback).
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null };
globalThis.fetch = async () => ({ ok: false, json: async () => { throw new Error('x'); } });
globalThis.game = { ...(globalThis.game ?? {}), packs: { get: () => ({}) } };
const say = (m) => process.stdout.write(`  ok  ${m}\n`);

const { BABCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/bab-calculator.js');
const { PrereqAdapter } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/prereq-adapter.js');
const { PrerequisiteChecker } = await import('/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js');
const table = (f) => Array.from({ length: 20 }, (_, i) => ({ level: i + 1, bab: f(i + 1) }));
const CLASSES = { Soldier: { levelProgression: table((l) => l) }, Scoundrel: { levelProgression: table((l) => Math.floor(l * 0.75)) }, Nonheroic: { isNonheroic: true }, RateOnly: { babProgression: 'slow' } };
BABCalculator._getClassDataLoader = async () => ({ getClassData: async (name) => CLASSES[name] ?? null });

const cls = (name, level) => ({ id: `c-${name}`, type: 'class', name, system: { classId: name.toLowerCase(), level }, flags: {} });
const hist = (...rows) => rows.map(([characterLevel, className, classLevel]) => ({ characterLevel, classId: className.toLowerCase(), className, classLevel }));
const actor = (items, progression = {}, level = null) => ({ id: 'a1', name: 'A', type: 'character', flags: {}, items, system: { level: level ?? items.filter((i) => i.type === 'class').reduce((s, i) => s + i.system.level, 0), bab: 99, progression } });
const ctx = (a, level, opts = {}) => PrereqAdapter.buildHistoricalEvaluationContext(a, { characterLevel: level }, opts);
const babUnmet = (c, min) => PrerequisiteChecker._checkBabCondition({ type: 'bab', min }, c, {});

// 1. MULTICLASS: Soldier 4 then Scoundrel 4 (BAB 4 + 3 = 7 now). At character level 4 the actor was Soldier 4 => BAB 4, not 7 and not floor(7/8*4)=3.
{
  const a = actor([cls('Soldier', 4), cls('Scoundrel', 4)], { classLevelHistory: hist([2, 'Soldier', 2], [3, 'Soldier', 3], [4, 'Soldier', 4], [5, 'Scoundrel', 2], [6, 'Scoundrel', 3], [7, 'Scoundrel', 4], [8, 'Scoundrel', 4]) });
  // the ledger above deliberately repeats classLevel; only the class and character level matter
  const c = await ctx(a, 4);
  assert.equal(c.system.progression.historicalBab.resolved, true);
  assert.equal(c.system.progression.historicalBab.value, 4, 'BAB at level 4 comes from BABCalculator over the reconstructed levels');
  assert.equal(babUnmet(c, 4).met, true); assert.equal(babUnmet(c, 5).met, false, 'the current BAB of 7 never leaks into level 4');
  assert.deepEqual(c.items.filter((i) => i.type === 'class').map((i) => [i.name, i.system.level]), [['Soldier', 4]], 'a class taken later is absent');
  const c6 = await ctx(a, 6);
  assert.equal(c6.system.progression.historicalBab.value, 4 + 1, 'Soldier 4 + Scoundrel 2 (floor(1.5)=1)');
  const now = await ctx(a, 8);
  assert.equal(now.system.progression.historicalBab.value, 7, 'the present state uses the actual class items');
  say('multiclass BAB reconstructed from class history via BABCalculator');
}
// 2. NONHEROIC: Nonheroic 4 then Soldier 2. At level 3 the actor was Nonheroic 3 => nonheroic table BAB 2 (not the current 3+2).
{
  const a = actor([cls('Nonheroic', 4), cls('Soldier', 2)], { classLevelHistory: hist([2, 'Nonheroic', 2], [3, 'Nonheroic', 3], [4, 'Nonheroic', 4], [5, 'Soldier', 1], [6, 'Soldier', 2]) });
  const c = await ctx(a, 3);
  assert.equal(c.system.progression.historicalBab.value, 2);
  assert.equal(babUnmet(c, 3).met, false); assert.equal(babUnmet(c, 2).met, true);
  say('Nonheroic BAB at an earlier level');
}
// 3. UNKNOWN HISTORY: no ledger for an earlier level => UNRESOLVED, never the current BAB, never a proportional estimate.
{
  const a = actor([cls('Soldier', 6)]);
  const c = await ctx(a, 3);
  assert.equal(c.system.progression.historicalBab.resolved, false);
  const r = babUnmet(c, 1);
  assert.equal(r.met, false); assert.equal(r.unresolved, true); assert.match(r.message, /could not be determined/);
  // a ledger that does not account for the class levels is also unresolved
  const bad = actor([cls('Soldier', 3), cls('Scoundrel', 1)], { classLevelHistory: hist([2, 'Soldier', 2], [3, 'Soldier', 3]) });
  assert.equal((await ctx(bad, 2)).system.progression.historicalBab.resolved, false);
  // class progression data that is only estimated is not a certified BAB
  const est = actor([cls('RateOnly', 2)], { classLevelHistory: hist([2, 'RateOnly', 2]) });
  assert.equal((await ctx(est, 1)).system.progression.historicalBab.resolved, false);
  assert.equal(PrereqAdapter._estimateHistoricalBab, undefined, 'the proportional estimator is gone');
  say('unreconstructable or estimated history is UNRESOLVED');
}
// 4. SAME-NAME TALENTS: a draft talent with a different canonical identity is not "already owned" because the name matches.
{
  const A = 'Compendium.foundryvtt-swse.talents.Item.aaaaaaaaaaaaaaaa', B = 'Compendium.foundryvtt-swse.talents.Item.bbbbbbbbbbbbbbbb';
  const owned = { id: 't1', type: 'talent', name: 'Seize the Moment', flags: { core: { sourceId: A } }, system: {} };
  const sameNameOtherIdentity = PrereqAdapter._appendHistoricalDraftItems([owned], { talents: [{ id: 'd1', name: 'Seize the Moment', sourceUuid: B }] }, 5);
  assert.equal(sameNameOtherIdentity.length, 2, 'same name, different canonical identity: both kept');
  assert.equal(PrereqAdapter._canonicalIdentity('talent', sameNameOtherIdentity[1]), B, 'the draft item keeps its canonical identity');
  const sameIdentity = PrereqAdapter._appendHistoricalDraftItems([owned], { talents: [{ id: 'd2', name: 'Renamed', sourceUuid: A }] }, 5);
  assert.equal(sameIdentity.length, 1, 'same canonical identity under another name is a duplicate');
  const noIdentity = PrereqAdapter._appendHistoricalDraftItems([{ id: 'x', type: 'talent', name: 'Foo', system: {} }], { talents: [{ id: 'y', name: 'Foo' }] }, 5);
  assert.equal(noIdentity.length, 2, 'without canonical identity on either side a matching name alone is not a duplicate');
  say('identity, not display name, decides duplicates');
}
// 5. ACQUISITION TIME: later-acquired and provenance-less items are not credited for an earlier level; the present is evaluated with everything.
{
  const feat = (id, level) => ({ id, type: 'feat', name: id, flags: level ? { swse: { progression: { characterLevel: level } } } : {}, system: {} });
  const a = actor([cls('Soldier', 6), feat('early', 2), feat('late', 5), feat('legacy', 0)], { classLevelHistory: hist([2, 'Soldier', 2], [3, 'Soldier', 3], [4, 'Soldier', 4], [5, 'Soldier', 5], [6, 'Soldier', 6]) });
  const c = await ctx(a, 3);
  assert.deepEqual(c.items.filter((i) => i.type === 'feat').map((i) => i.name), ['early'], 'only the feat acquired by level 3 is credited');
  assert.deepEqual(c.system.progression.historicalUnresolvedItems.map((i) => i.name), ['legacy'], 'the provenance-less feat is reported, not assumed known');
  const present = await ctx(a, 6);
  assert.deepEqual(present.items.filter((i) => i.type === 'feat').map((i) => i.name).sort(), ['early', 'late', 'legacy']);
  // the unmet result names what could not be credited
  const r = PrerequisiteChecker.checkFeatPrerequisites(c, { name: 'Needs Legacy', system: { prerequisitesStructured: { type: 'all', conditions: [{ type: 'feat', name: 'legacy' }] } } });
  assert.equal(r.met, false); assert.deepEqual(r.details.historicalUnresolvedItems.map((i) => i.name), ['legacy']);
  say('acquisition-time legality');
}
// 6. EVALUATION ERRORS never fall back to the live actor and are never "met".
{
  const exploding = { id: 'a2', name: 'Boom', type: 'character', flags: {}, system: { level: 4, bab: 50 }, get items() { throw new Error('items unavailable'); } };
  const c = await ctx(exploding, 2);
  assert.notEqual(c, exploding, 'not the live actor');
  assert.match(c.system.progression.historicalContextError, /items unavailable/);
  const r = PrerequisiteChecker.checkTalentPrerequisites(c, { name: 'Anything', system: { prerequisites: '' } });
  assert.equal(r.met, false); assert.equal(r.unresolved, true); assert.match(r.missing[0], /could not be evaluated/);
  assert.equal(PrerequisiteChecker.checkFeatPrerequisites(c, { name: 'Free Feat', system: {} }).met, false, 'even a prerequisite-free item is not declared eligible by a broken context');
  say('a failed context build is an explicit unresolved result');
}
// 7. The retired projected-context builder is gone.
assert.equal(PrereqAdapter.buildEvaluationContext, undefined);
process.stdout.write('prg-d2-historical-prerequisite-context: ok\n');
