/**
 * SSOT Priority 3: finalization SETTLEMENT failure-injection and idempotency, with a credit delta in the plan. Real ProgressionFinalizer.finalize + real
 * ActorEngine stage application on an in-memory clone (offline; nothing here is FOUNDRY_TESTED). Pins how the finalizer reports each failure class and that
 * a retry after a clean compensation grants the credit once, while a re-finalize after success changes nothing. Ordered writes + compensating recovery are
 * NOT an atomic transaction; the outcomes below are the honest ones (committed / compensated / indeterminate).
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm' }, settings: { get: () => undefined, set: () => {} } } });
globalThis.window = globalThis;
globalThis.location ??= { hostname: 'offline-harness' };
globalThis.document ??= { addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {} } }) };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
class AppV2 { static DEFAULT_OPTIONS = {}; static PARTS = {}; }
globalThis.foundry.applications = { api: { ApplicationV2: AppV2, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {}, DocumentSheetV2: class {} }, sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} }, ux: {}, handlebars: {} };
globalThis.ChatMessage = { create: async () => { throw new Error('ChatMessage.create'); } };
// Foundry fills a created Item's system from template.json (e.g. a class item's `level: 1`). game.model is that resolved default table.
{
  const fs = await import('node:fs');
  const tpl = JSON.parse(fs.readFileSync(new URL('../template.json', import.meta.url), 'utf8'));
  const resolve = (section) => Object.fromEntries((section.types ?? []).map((type) => {
    const own = { ...(section[type] ?? {}) }; const names = own.templates ?? []; delete own.templates;
    return [type, Object.assign({}, ...names.map(n => structuredClone(section.templates?.[n] ?? {})), structuredClone(own))];
  }));
  game.model = { Item: resolve(tpl.Item), Actor: resolve(tpl.Actor) };
}
const itemDefaults = (doc) => { const d = game.model.Item[doc.type]; if (!d) return doc; const merge = (a, b) => { const o = structuredClone(a); for (const [k, v] of Object.entries(b ?? {})) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? merge(o[k], v) : structuredClone(v); return o; }; return { ...doc, system: merge(d, doc.system ?? {}) }; };

const { character, item } = await import('./helpers/recon-fixture.mjs'); // seeds ClassesDB from packs/classes.db
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
const { ProgressionSession } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-session.js');
const { ProgressionContentAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js');
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
const { applyDerivedSnapshot } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-generation.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { ActorEngine: HarnessActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'); // the canonical import the finalizer resolves (shim fake)
const { ActorEngine: RealActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const M = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mannequin/mannequin-builder.js');

ProgressionContentAuthority.initialize = async () => {}; // compendium indexes need a live world; class data comes from ClassesDB (packs/classes.db)

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Persistence traps: every write surface records the phase it was called in. The mannequin phase must record nothing.
// ---------------------------------------------------------------------------------------------------------------------------------------------
let phase = 'idle';
const writes = [];
const record = (surface) => { writes.push({ phase, surface }); };
const trapObject = (obj, label, names = Object.keys(obj).filter(k => typeof obj[k] === 'function')) => {
  for (const name of names) {
    const original = obj[name];
    obj[name] = function trapped(...args) { record(`${label}.${name}`); return original?.apply(this, args); };
  }
};
trapObject(HarnessActorEngine, 'HarnessActorEngine');
trapObject(SnapshotManager, 'SnapshotManager', Object.getOwnPropertyNames(SnapshotManager).filter(k => typeof SnapshotManager[k] === 'function'));
globalThis.Actor.create = async () => record('Actor.create');
globalThis.Item.create = async () => record('Item.create');
const origChat = globalThis.ChatMessage.create; globalThis.ChatMessage.create = async (...a) => { record('ChatMessage.create'); return origChat(...a); };
const origSettingsSet = game.settings.set; game.settings.set = (...a) => { record('game.settings.set'); return origSettingsSet(...a); };
const origActorsSet = game.actors.set.bind(game.actors); game.actors.set = (...a) => { record('game.actors.set'); return origActorsSet(...a); };
const origLsSet = localStorage.setItem; localStorage.setItem = (...a) => { record('localStorage.setItem'); return origLsSet(...a); };
for (const hookFn of ['call', 'callAll']) { const o = Hooks[hookFn]; Hooks[hookFn] = (name, ...a) => { if (/swse|progression|level/i.test(String(name))) record(`Hooks.${hookFn}:${name}`); return o(name, ...a); }; }

// REAL ActorEngine: only the Foundry document gateways are replaced by in-memory writes on the target clone (recorded per phase).
const setPath = (o, p, v) => { const k = String(p).split('.'); let n = o; for (const x of k.slice(0, -1)) n = (n[x] && typeof n[x] === 'object') ? n[x] : (n[x] = {}); const last = k.at(-1); if (last.startsWith('-=')) delete n[last.slice(2)]; else n[last] = structuredClone(v); };
const flat = (d, p = '', out = {}) => { for (const [k, v] of Object.entries(d ?? {})) { const path = p ? `${p}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) flat(v, path, out); else out[path] = v; } return out; };
let realSeq = 0;
Object.assign(RealActorEngine, {
  async updateActor(actor, data) { record('RealActorEngine.updateActor'); for (const [k, v] of Object.entries(flat(data))) setPath(actor, k, v); return actor; },
  async createEmbeddedDocuments(actor, name, docs) { record('RealActorEngine.createEmbeddedDocuments'); const key = name === 'ActiveEffect' ? 'effects' : 'items'; return docs.map(d => { const c = structuredClone(key === 'items' ? itemDefaults(d) : d); c._id = c.id = `real-${++realSeq}`; actor[key].push(c); return c; }); },
  async updateEmbeddedDocuments(actor, name, ups) { record('RealActorEngine.updateEmbeddedDocuments'); for (const u of ups) { const it = actor.items.find(i => (i._id ?? i.id) === (u._id ?? u.id)); if (it) for (const [k, v] of Object.entries(flat(u))) if (k !== '_id' && k !== 'id') setPath(it, k, v); } return actor.items; },
  async deleteEmbeddedDocuments(actor, name, ids) { record('RealActorEngine.deleteEmbeddedDocuments'); actor.items = actor.items.filter(i => !ids.includes(i._id ?? i.id)); return []; },
});
const realPathEngine = {
  async applyMutationPlan(actor, plan, options) {
    // transactional:false only because the snapshot capture needs Foundry documents; the stage order and recalcAll are the real ones.
    await RealActorEngine.applyMutationPlan(actor, plan, { ...options, transactional: false });
    await RealActorEngine.recomputeHP(actor); // Foundry's hp-recompute hooks fire this after class / level / HP-feat changes
  },
  updateActor: (...a) => RealActorEngine.updateActor(...a),
  updateActorFlags: async (actor, scope, key, value) => setPath(actor, `flags.${scope}.${key}`, value),
};

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------------------------------------------------------
const classSelection = (name) => { const c = [...ClassesDB.classes.values()].find(x => x.name === name); assert.ok(c, `class ${name} in packs/classes.db`); return { id: c.id, name: c.name, system: c.system ?? {} }; };
const abilities = (b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, { base: v, racial: 0, enhancement: 0, temp: 0 }]));
const withDocMethods = (actor) => {
  actor.collection = {}; actor.effects = actor.effects ?? [];
  for (const m of ['update', 'delete', 'setFlag', 'unsetFlag', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments']) {
    Object.defineProperty(actor, m, { value: async () => record(`sourceActor.${m}`), enumerable: false, configurable: true });
  }
  return actor;
};
function levelUpActor(classes, { hp = { max: 30, value: 30 }, attrs = { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 }, items = [] } = {}) {
  const a = character({ classes, items });
  a.system.attributes = abilities(attrs);
  a.system.hp = { ...hp };
  a.system.size = 'medium';
  a.system.secondWind = { uses: 1, max: 1 };
  return withDocMethods(a);
}
function chargenActor() {
  return withDocMethods({ id: 'pc-new', name: 'New Hero', type: 'character', img: 'icons/svg/mystery-man.svg', _stats: { modifiedTime: 1 }, items: [], flags: {},
    system: { level: 0, credits: 0, size: 'medium', hp: { max: 1, value: 1 }, secondWind: { uses: 1, max: 1 } } });
}
function session(actor, mode, draft) {
  const s = new ProgressionSession({ actor, mode, subtype: 'actor' });
  s.draftSelections = { ...s.draftSelections, ...draft };
  return { mode, actor, progressionSession: s, sessionId: `S-${mode}` };
}
const PRESTIGE_PREREQ_ITEMS = () => [
  item('feat', 'Martial Arts I', {}), item('feat', 'Point-Blank Shot', {}),
  item('talent', 'Armored Defense', { talent_tree: 'Armor Specialist' }),
];

const { canDiscardMaterializedActor } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-actor-persistence.js');
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};

const scenario = () => {
  const a = levelUpActor([['Soldier', 1]], { hp: { max: 31, value: 12 } });
  a.system.credits = 500;
  return { actor: a, state: session(a, 'levelup', { class: classSelection('Soldier'), feats: [{ name: 'Toughness', slotType: 'class' }], survey: { hpGain: 7, hpGainResolved: true, creditDelta: 2000 } }) };
};
const cloneOf = (actor) => {
  const c = withDocMethods(JSON.parse(JSON.stringify(actor)));
  c.toObject = function toObject() { return JSON.parse(JSON.stringify({ _id: this.id, name: this.name, type: this.type, system: this.system, items: this.items, effects: this.effects, flags: this.flags })); };
  return c;
};
// engine whose applyMutationPlan fails in a chosen way (after applying the plan to the clone, to model a write that landed)
const engineWith = (mode, calls) => ({
  ...realPathEngine,
  async applyMutationPlan(actor, plan, options) {
    calls.push(mode);
    if (mode === 'ok') return realPathEngine.applyMutationPlan(actor, plan, options);
    const snapshot = JSON.parse(JSON.stringify({ system: actor.system, items: actor.items, flags: actor.flags })); // the pre-plan state a real rollback restores
    await realPathEngine.applyMutationPlan(actor, plan, options);     // the write landed
    const err = new Error(`write failed (${mode})`);
    if (mode === 'compensated') { actor.system = snapshot.system; actor.items = snapshot.items; actor.flags = snapshot.flags; err.rollback = { outcome: 'FAILED_COMPENSATED' }; } // whole-actor restore, as SnapshotManager does
    if (mode === 'unverified') err.rollback = { outcome: 'FAILED_UNVERIFIED' };
    throw err;
  },
});
const run = async (actor, state, mode, calls = []) => {
  ProgressionFinalizer._actorEngineOverride = engineWith(mode, calls);
  try { return await ProgressionFinalizer.finalize({ ...state, actor }, actor); } finally { ProgressionFinalizer._actorEngineOverride = null; }
};

const { actor: src, state } = scenario();
// 1. clean compensation: success false, rollbackOutcome FAILED_COMPENSATED, the draft lifecycle may discard, the wallet is back
{
  const a = cloneOf(src); const r = await run(a, state, 'compensated');
  assert.equal(r.success, false); assert.equal(r.rollbackOutcome, 'FAILED_COMPENSATED'); assert.notEqual(r.indeterminate, true);
  assert.equal(a.system.credits, 500, 'the credit delta that landed was compensated');
  assert.equal(canDiscardMaterializedActor(r), true);
  // 2. RETRY after the compensation: the credit delta is granted exactly once
  const calls = []; const r2 = await run(a, state, 'ok', calls);
  assert.equal(r2.success, true, r2.error); assert.equal(a.system.credits, 2500, '500 + the 2,000 delta, once');
  // 3. re-finalizing the completed session changes nothing (no second grant, nothing applied)
  const calls3 = []; const r3 = await run(a, state, 'ok', calls3);
  assert.equal(r3.success, false); assert.equal(r3.alreadyFinalized, true); assert.equal(calls3.length, 0, 'applyMutationPlan not even called'); assert.equal(a.system.credits, 2500);
  assert.equal(canDiscardMaterializedActor(r3), false, 'a completed session is never discarded');
}
// 4. unverified rollback: indeterminate + partialMutationPossible, never retryable as an ordinary failure, actor kept
{
  const a = cloneOf(src); const r = await run(a, state, 'unverified');
  assert.equal(r.success, false); assert.equal(r.rollbackOutcome, 'FAILED_UNVERIFIED'); assert.equal(r.indeterminate, true); assert.equal(r.partialMutationPossible, true);
  assert.match(r.error, /rollback could not be verified/); assert.equal(canDiscardMaterializedActor(r), false);
}
// 5. a plan failure with no rollback evidence is a pre-apply refusal: a plain failure, nothing flagged committed
{
  const a = cloneOf(src);
  ProgressionFinalizer._actorEngineOverride = { ...realPathEngine, async applyMutationPlan() { throw new Error('plan rejected before any write'); } };
  let r; try { r = await ProgressionFinalizer.finalize({ ...state, actor: a }, a); } finally { ProgressionFinalizer._actorEngineOverride = null; }
  assert.equal(r.success, false); assert.equal(r.rollbackOutcome, undefined); assert.notEqual(r.committed, true); assert.equal(a.system.credits, 500);
}
// 6. the compiled plan is deterministic: same draft, same credit write, no clock-dependent difference in the credit field
{
  const plans = [];
  for (let i = 0; i < 2; i += 1) {
    const a = cloneOf(src); ProgressionFinalizer._actorEngineOverride = { ...realPathEngine, async applyMutationPlan(actor, plan) { plans.push(plan); throw Object.assign(new Error('stop'), { rollback: { outcome: 'FAILED_COMPENSATED' } }); } };
    try { await ProgressionFinalizer.finalize({ ...state, actor: a }, a); } finally { ProgressionFinalizer._actorEngineOverride = null; }
  }
  const credit = (p) => (p.set ?? p)['system.credits'];
  assert.equal(credit(plans[0]), 2500); assert.equal(credit(plans[1]), 2500);
}
process.stdout.write('progression-finalize-settlement-failure-injection: ok\n');
