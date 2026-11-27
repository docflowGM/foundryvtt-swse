/**
 * 3N-PRG Stage C — mannequin parity harness (node shim harness; offline only, nothing here is FOUNDRY_TESTED).
 *
 * MANNEQUIN path : getMannequinProjection(actor, session) — ProgressionFinalizer.dryRun plan applied in memory to an isolated actor-like
 *                  object, then DerivedCalculator.computeAll / hp-accounting / SecondWindRules (scripts/apps/progression-framework/shell/mannequin/).
 * REAL path      : the REAL ProgressionFinalizer.finalize() on a cloned actor, persisting through the REAL ActorEngine.applyMutationPlan
 *                  (real plan stages, real recalcAll/DerivedCalculator) followed by the REAL ActorEngine.recomputeHP (what Foundry's
 *                  hp-recompute hooks trigger), resetSecondWind and applySecondWind. Only the Foundry document gateways
 *                  (updateActor / create|update|deleteEmbeddedDocuments) are in-memory writes on the clone.
 * Fixtures: Level 1 character, same-class level-up (wounded actor, max vs current), multiclass (new base class), prestige entry.
 * Plus: zero persistence while the mannequin is built, partial builds report pending, cache isolation, stale-preview protection.
 */
import test from 'node:test';
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
const SCENARIOS = {
  'Level 1 character (chargen Soldier)': () => {
    const a = chargenActor();
    return { actor: a, state: session(a, 'chargen', { class: classSelection('Soldier'), species: 'Human',
      attributes: { values: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 } },
      feats: [{ name: 'Toughness' }], talents: [{ name: 'Armored Defense' }],
      survey: { characterName: 'New Hero', startingCreditsResolved: true, startingCredits: 1000 } }) };
  },
  'same-class level-up (Soldier 1 -> 2, wounded actor)': () => {
    const a = levelUpActor([['Soldier', 1]], { hp: { max: 31, value: 12 } });
    return { actor: a, state: session(a, 'levelup', { class: classSelection('Soldier'), feats: [{ name: 'Toughness', slotType: 'class' }], survey: { hpGain: 7, hpGainResolved: true } }) };
  },
  'multiclass (Soldier 1 + new Scout level)': () => {
    const a = levelUpActor([['Soldier', 1]]);
    return { actor: a, state: session(a, 'levelup', { class: classSelection('Scout'), talents: [{ name: 'Acute Senses' }], survey: { hpGain: 5, hpGainResolved: true } }) };
  },
  'prestige entry (Soldier 7 -> Elite Trooper 1, ability increases)': () => {
    // Elite Trooper's prerequisites are satisfied by owned items; the REAL finalize() rechecks them (validateFinalProgressionPrerequisites).
    const a = levelUpActor([['Soldier', 7]], { hp: { max: 70, value: 70 }, items: PRESTIGE_PREREQ_ITEMS() });
    return { actor: a, state: session(a, 'levelup', { class: classSelection('Elite Trooper'), talents: [{ name: 'Weapon Specialization' }],
      attributes: { mode: 'levelup-ability-increase', increases: { str: 1, con: 1 }, abilityIncreaseLevel: 8 }, survey: { hpGain: 9, hpGainResolved: true } }) };
  },
};

async function mannequinPhase(actor, state, options = {}) {
  const before = { actor: JSON.stringify(actor), draft: JSON.stringify(state.progressionSession.draftSelections) };
  const cacheKeysBefore = [...DerivedCalculator._computeCache.keys()];
  phase = 'mannequin';
  let projection;
  try { projection = await M.getMannequinProjection(actor, state, options); } finally { phase = 'idle'; }
  assert.deepEqual(writes.filter(w => w.phase === 'mannequin'), [], 'zero persistence while the mannequin is built');
  assert.equal(JSON.stringify(actor), before.actor, 'the source actor is unchanged');
  assert.equal(JSON.stringify(state.progressionSession.draftSelections), before.draft, 'the draft is unchanged');
  assert.deepEqual([...DerivedCalculator._computeCache.keys()], cacheKeysBefore, 'the DerivedCalculator result cache is neither read into nor written by the mannequin');
  return projection;
}

async function realPhase(actor, state) {
  const clone = withDocMethods(JSON.parse(JSON.stringify(actor)));
  clone.toObject = function toObject() { return JSON.parse(JSON.stringify({ _id: this.id, name: this.name, type: this.type, system: this.system, items: this.items, effects: this.effects, flags: this.flags })); };
  const realState = { ...state, actor: clone };
  ProgressionFinalizer._actorEngineOverride = realPathEngine;
  phase = 'real';
  try {
    const res = await ProgressionFinalizer.finalize(realState, clone);
    assert.equal(res.success, true, `real finalize: ${res.error}`);
    const updates = await DerivedCalculator.computeAll(clone, { signature: null });
    applyDerivedSnapshot(clone.system.derived, updates);
    await RealActorEngine.resetSecondWind(clone);
    const maxUses = clone.system.secondWind.max;
    const hp = { max: clone.system.hp.max, value: clone.system.hp.value };
    const derived = structuredClone(clone.system.derived);
    clone.system.hp.value = 0; // spend the use at 0 HP so the full healing amount is observable
    const sw = await RealActorEngine.applySecondWind(clone, { validateCombat: false });
    return { derived, hp, maxUses, healing: sw?.healed ?? sw?.result?.healed ?? null, sw };
  } finally { phase = 'idle'; ProgressionFinalizer._actorEngineOverride = null; }
}

for (const [name, build] of Object.entries(SCENARIOS)) {
  test(`parity — ${name}`, async () => {
    const { actor, state } = build();
    const p = await mannequinPhase(actor, state);
    assert.equal(p.stale, false);
    assert.equal(p.planSource, 'dryRun', JSON.stringify(p.pending));
    assert.equal(p.complete, true, JSON.stringify(p.pending));
    assert.match(p.mannequinId, /^prg-mannequin:/); assert.notEqual(p.mannequinId, actor.id);
    const r = await realPhase(actor, state);
    assert.equal(p.bab, r.derived.bab, 'BAB');
    assert.deepEqual(p.babProvenance, r.derived.babProvenance, 'BAB provenance');
    assert.deepEqual(p.defenses, { fortitude: r.derived.defenses.fortitude.total, reflex: r.derived.defenses.reflex.total, will: r.derived.defenses.will.total, flatFooted: r.derived.defenses.flatFooted?.total ?? null }, 'defenses');
    assert.equal(p.damageThreshold, r.derived.damageThreshold, 'damage threshold');
    assert.equal(p.grapple, r.derived.grappleBonus, 'grapple');
    assert.equal(p.maxHp, r.hp.max, 'max HP'); assert.equal(p.currentHp, r.hp.value, 'current HP (max and current kept separate)');
    assert.equal(p.secondWind.maxUses, r.maxUses, 'Second Wind uses (ActorEngine.resetSecondWind)');
    assert.equal(p.secondWind.healing, r.healing, 'Second Wind healing (ActorEngine.applySecondWind)');
    for (const v of [p.bab, p.damageThreshold, p.grapple, p.maxHp, ...Object.values(p.defenses)]) assert.equal(Number.isFinite(v), true);
    console.log(`  parity ${name}: ${JSON.stringify({ bab: p.bab, prov: p.babProvenance?.status ?? p.babProvenance, def: p.defenses, dt: p.damageThreshold, grapple: p.grapple, hp: [p.currentHp, p.maxHp], sw: p.secondWind })}`);
  });
}

test('fixture sanity: the scenarios change what they claim to change', async () => {
  const same = await mannequinPhase(...Object.values(SCENARIOS['same-class level-up (Soldier 1 -> 2, wounded actor)']()));
  assert.equal(same.bab, 2); assert.ok(same.maxHp > 31); assert.equal(same.currentHp < same.maxHp, true, 'wounded actor stays wounded');
  const multi = await mannequinPhase(...Object.values(SCENARIOS['multiclass (Soldier 1 + new Scout level)']()));
  assert.equal(multi.bab, 1, 'Soldier 1 + Scout 1 (0) from class progression data');
  const pre = await mannequinPhase(...Object.values(SCENARIOS['prestige entry (Soldier 7 -> Elite Trooper 1, ability increases)']()));
  assert.equal(pre.bab, 8);
});

test('partial level-up: unresolved HP gain and missing required choices report pending, never a default', async () => {
  const a = levelUpActor([['Soldier', 1]]);
  const p = await mannequinPhase(a, session(a, 'levelup', { class: classSelection('Soldier') }));
  assert.equal(p.planSource, 'partial-compile');
  assert.equal(p.complete, false);
  assert.ok(p.pending.some(e => e.part === 'readiness' && /class bonus feat/i.test(e.reason)));
  assert.ok(p.pending.some(e => e.part === 'hpGain'));
  assert.equal(p.maxHp, null); assert.equal(p.currentHp, null); assert.equal(p.secondWind, null);
  assert.equal(p.status.maxHp, 'pending'); assert.equal(p.status.bab, 'provisional');
  assert.equal(p.bab, 2, 'BAB is computed (provisionally) from the class level the plan does carry');
});

test('partial chargen: no class / no attributes -> every dependent value is pending (null)', async () => {
  const a = chargenActor();
  const p = await mannequinPhase(a, session(a, 'chargen', { species: 'Human' }));
  for (const k of ['bab', 'defenses', 'damageThreshold', 'grapple', 'maxHp', 'secondWind']) { assert.equal(p[k], null, k); assert.equal(p.status[k], 'pending', k); }
  assert.ok(p.pending.some(e => e.part === 'class')); assert.ok(p.pending.some(e => e.part === 'attributes'));
  const b = await mannequinPhase(a, session(a, 'chargen', { class: classSelection('Soldier'), species: 'Human', survey: { startingCreditsResolved: true, startingCredits: 500 } }));
  assert.equal(b.bab, 1, 'class alone resolves BAB');
  assert.equal(b.defenses, null, 'defenses wait for the ability scores'); assert.equal(b.maxHp, null);
});

test('level-up that grants ability increases: unallocated increases keep ability-dependent values pending', async () => {
  const a = levelUpActor([['Soldier', 7]], { hp: { max: 70, value: 70 } });
  const p = await mannequinPhase(a, session(a, 'levelup', { class: classSelection('Elite Trooper'), talents: [{ name: 'Weapon Specialization' }], survey: { hpGain: 9, hpGainResolved: true } }));
  assert.ok(p.pending.some(e => e.part === 'abilityIncreases'));
  assert.equal(p.defenses, null); assert.equal(p.grapple, null); assert.equal(p.bab, 8);
});

test('cache isolation: the real actor\'s cached derived result is untouched and the mannequin never shares its key or id', async () => {
  DerivedCalculator.clearCaches();
  const a = levelUpActor([['Soldier', 1]]);
  await DerivedCalculator.computeAll(a);
  const realKey = DerivedCalculator.getActorComputeSignature(a);
  assert.ok(realKey && DerivedCalculator._computeCache.has(realKey));
  const cached = JSON.stringify(DerivedCalculator._computeCache.get(realKey));
  const build = await M.buildMannequin(a, session(a, 'levelup', { class: classSelection('Soldier'), feats: [{ name: 'Toughness', slotType: 'class' }], survey: { hpGain: 7, hpGainResolved: true } }));
  assert.notEqual(build.mannequin.id, a.id);
  assert.equal(build.mannequin._stats, undefined);
  assert.equal(DerivedCalculator.getActorComputeSignature(build.mannequin), null, 'no cache signature for a mannequin');
  await M.projectMannequin(build, { mode: 'levelup', progressionSession: { draftSelections: { class: {} } } });
  assert.equal(JSON.stringify(DerivedCalculator._computeCache.get(realKey)), cached);
  assert.equal([...DerivedCalculator._computeCache.keys()].some(k => k.startsWith(M.MANNEQUIN_ID_PREFIX)), false);
  assert.throws(() => build.mannequin.update({}), M.MannequinPersistenceError);
  assert.throws(() => build.mannequin.createEmbeddedDocuments('Item', []), M.MannequinPersistenceError);
  assert.equal(Object.isFrozen(build.snapshot), true, 'the starting snapshot is immutable');
  assert.equal(a.items.length, 1, 'source actor still has only its class item');
});

test('stale preview: an older build that finishes after a newer request for the same key never returns values', async () => {
  const a = levelUpActor([['Soldier', 1]]);
  const older = session(a, 'levelup', { class: classSelection('Soldier'), feats: [{ name: 'Toughness', slotType: 'class' }], survey: { hpGain: 7, hpGainResolved: true } });
  const newer = session(a, 'levelup', { class: classSelection('Scout'), talents: [{ name: 'Acute Senses' }], survey: { hpGain: 5, hpGainResolved: true } });
  phase = 'mannequin';
  const [p1, p2] = await Promise.all([M.getMannequinProjection(a, older, { previewKey: 'sheet-1' }), M.getMannequinProjection(a, newer, { previewKey: 'sheet-1' })]);
  phase = 'idle';
  assert.deepEqual(writes.filter(w => w.phase === 'mannequin'), []);
  assert.equal(p1.stale, true); assert.equal('bab' in p1, false, 'a stale result carries no values');
  assert.equal(p2.stale, false); assert.equal(p2.bab, 1);
  assert.equal(M.isMannequinPreviewCurrent('sheet-1', p1.token), false); assert.equal(M.isMannequinPreviewCurrent('sheet-1', p2.token), true);
  const [k1, k2] = await Promise.all([M.getMannequinProjection(a, older, { previewKey: 'sheet-A' }), M.getMannequinProjection(a, newer, { previewKey: 'sheet-B' })]);
  assert.equal(k1.stale, false); assert.equal(k2.stale, false, 'different preview keys never cancel each other');
  const again = await M.getMannequinProjection(a, older, { previewKey: 'sheet-1' });
  assert.equal(again.stale, false); assert.equal(again.bab, 2, 'rebuilt from the immutable start each time (no carry-over from the newer draft)');
});

test('the finalizer is unchanged by this stage: dryRun of the same draft twice gives the same plan shape and never applies', async () => {
  const a = levelUpActor([['Soldier', 1]]);
  const st = session(a, 'levelup', { class: classSelection('Soldier'), feats: [{ name: 'Toughness', slotType: 'class' }], survey: { hpGain: 7, hpGainResolved: true } });
  phase = 'mannequin';
  const d1 = await ProgressionFinalizer.dryRun(st, a); const d2 = await ProgressionFinalizer.dryRun(st, a);
  phase = 'idle';
  assert.equal(d1.success, true); assert.deepEqual(Object.keys(d1.plan.set).sort(), Object.keys(d2.plan.set).sort());
  assert.deepEqual(writes.filter(w => w.phase === 'mannequin'), []);
});
