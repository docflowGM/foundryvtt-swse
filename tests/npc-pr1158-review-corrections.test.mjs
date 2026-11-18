/**
 * PR #1158 independent-review corrections (five blockers).
 *
 * Behavioral regression tests against the REAL ProgressionFinalizer,
 * ProgressionSession, NonheroicStartingFeatsStep, SnapshotManager (+ real
 * SnapshotService restoration), NPC mode adapter and persistence helper. Only the
 * Foundry boundary is faked: the world collection / Actor.create and ActorEngine
 * (the harness's own actor-engine fake, plus a plan-applying engine for the
 * finalizer integration). Nothing here is a live-Foundry result.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window || globalThis;
globalThis.document = globalThis.document || { addEventListener() {}, createElement() { return { style: {}, classList: { add() {} } }; } };
globalThis.localStorage = globalThis.localStorage || { getItem() { return null; }, setItem() {}, removeItem() {} };
class AppV2 { static DEFAULT_OPTIONS = {}; static PARTS = {}; }
globalThis.foundry.applications = {
  api: { ApplicationV2: AppV2, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {}, DocumentSheetV2: class {} },
  sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} }, ux: {}, handlebars: {},
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sys = (rel) => import(`/systems/foundryvtt-swse/${rel}`);
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const persistence = await sys('scripts/apps/progression-framework/shell/progression-actor-persistence.js').catch(() => null);
const model = await sys('scripts/engine/progression/utils/nonheroic-class-model.js');
const npcMode = await sys('scripts/actors/npc/npc-mode-adapter.js');
const { getLevelSplit } = await sys('scripts/actors/derived/level-split.js');
const { ProgressionSession } = await sys('scripts/apps/progression-framework/shell/progression-session.js');
const { seedNonheroicSession } = await sys('scripts/apps/progression-framework/adapters/nonheroic-session-seeder.js');
const { ProgressionFinalizer } = await sys('scripts/apps/progression-framework/shell/progression-finalizer.js');
const { registerProgressionFinalizerForceKnowledgePatch } = await sys('scripts/apps/progression-framework/shell/progression-finalizer-force-knowledge-patch.js');
const { ProgressionContentAuthority } = await sys('scripts/engine/progression/content/progression-content-authority.js');
const { SnapshotManager, STATBLOCK_ORIGIN_KIND } = await sys('scripts/engine/progression/utils/snapshot-manager.js');
const { ActorEngine: FakeEngine } = await sys('scripts/governance/actor-engine/actor-engine.js');
registerProgressionFinalizerForceKnowledgePatch();

// Content documents live in compendia the harness cannot read.
ProgressionContentAuthority.initialize = async () => {};
ProgressionContentAuthority.getFeatDocument = async () => null;
ProgressionContentAuthority.getTalentDocument = async () => null;
ProgressionContentAuthority.getGrantedLanguageEntries = async () => [];

// ---------------------------------------------------------------------------
// Fixtures: fake world, fake NPC documents
// ---------------------------------------------------------------------------
let idSeq = 0;
function makeWorld() {
  const world = new Map();
  globalThis.game.actors = world;
  return world;
}
function makeNpc(data = {}, { persisted = true, world = null } = {}) {
  const actor = {
    id: persisted ? (data.id ?? `npc-${++idSeq}`) : null,
    type: 'npc',
    name: data.name ?? 'Test NPC',
    img: 'x',
    isOwner: true,
    collection: persisted ? {} : null,
    system: clone(data.system ?? { level: 0, credits: 0, attributes: {}, abilities: {}, skills: {} }),
    flags: clone(data.flags ?? {}),
    items: (data.items ?? []).map((i, n) => ({ ...clone(i), _id: i._id ?? i.id ?? `it-${n}`, id: i.id ?? i._id ?? `it-${n}` })),
    effects: [],
    toObject() { return clone({ _id: this.id, type: this.type, name: this.name, img: this.img, system: this.system, flags: this.flags, items: this.items, effects: this.effects }); },
    getFlag(scope, key) { return this.flags?.[scope]?.[key] ?? this.flags?.[key] ?? null; },
  };
  actor.items.filter = Array.prototype.filter.bind(actor.items);
  actor.items.find = Array.prototype.find.bind(actor.items);
  actor.items.some = Array.prototype.some.bind(actor.items);
  if (persisted && world) world.set(actor.id, actor);
  return actor;
}
const hydrate = (doc, world, id) => {
  // Document rebuilt from the stored data the way a world reload would.
  const data = world.get(id).toObject();
  return makeNpc({ ...data, id }, { persisted: true });
};
const classItem = (name, level, { nonheroic = false } = {}) => ({
  id: `c-${name}`, name, type: 'class', system: { level, isNonheroic: nonheroic, classId: name.toLowerCase() },
});
const feat = (name, choice = null) => ({
  id: `feat-${name.toLowerCase().replace(/\W+/g, '-')}`, name, type: 'feat',
  slotType: model.NONHEROIC_STARTING_FEAT_SLOT_TYPE, source: model.NONHEROIC_STARTING_FEAT_SOURCE,
  system: choice ? { selectedChoice: choice } : {},
});
function setPath(target, dotPath, value) {
  const parts = dotPath.split('.'); let node = target;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {}; node = node[parts[i]]; }
  node[parts.at(-1)] = value;
}
/** Plan-applying engine for the finalizer integration (the real ActorEngine is not loadable in Node). */
function planEngine(counter = { calls: 0 }) {
  return {
    counter,
    async applyMutationPlan(actor, plan) {
      counter.calls += 1;
      for (const [p, v] of Object.entries(plan.set || {})) setPath(actor, p, clone(v));
      for (const item of plan.add?.items || []) {
        const id = `new-${++idSeq}`;
        actor.items.push({ ...clone(item), _id: id, id });
      }
    },
    async updateActor() {},
  };
}
async function withEngine(engine, fn) {
  const orig = ProgressionFinalizer._resolveActorEngine;
  ProgressionFinalizer._resolveActorEngine = () => engine;
  try { return await fn(); } finally { ProgressionFinalizer._resolveActorEngine = orig; }
}
async function nonheroicChargenSession(actor) {
  const session = new ProgressionSession({ actor, mode: 'chargen', subtype: 'nonheroic' });
  await seedNonheroicSession(session, actor, 'chargen');
  session.commitSelection('t', 'attributes', { values: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } });
  session.commitSelection('t', 'survey', { characterName: 'Persisted Pete', startingLevel: 1, startingCredits: 100, startingCreditsResolved: true });
  session.commitSelection('t', 'feats', [feat('Skill Focus', 'perception'), feat('Skill Focus', 'stealth'), feat('Armor Proficiency (Light)')], { replace: true });
  return session;
}

// ===========================================================================
// BLOCKER 1 — new NPCs become genuine world actors
// ===========================================================================
test('B1: the persistence helper exists and classifies transient vs world actors', () => {
  assert.ok(persistence, 'progression-actor-persistence.js must exist');
  const world = makeWorld();
  const draft = makeNpc({}, { persisted: false });
  const saved = makeNpc({}, { world });
  assert.equal(persistence.isTransientProgressionActor(draft), true, 'no id => transient');
  assert.equal(persistence.isTransientProgressionActor(saved), false);
  const unsavedWithId = { ...draft, id: 'ghost', collection: null };
  assert.equal(persistence.isTransientProgressionActor(unsavedWithId), true, 'id but not in the world collection => transient');
  assert.equal(persistence.isTransientProgressionActor({ ...saved, isToken: true, collection: null }), false, 'unlinked token actors are not drafts');
  assert.equal(persistence.isTransientProgressionActor(null), false);
});

test('B1: abandoned drafts are never persisted; materialization creates exactly one world actor, once', async () => {
  const world = makeWorld();
  const draft = makeNpc({ system: { level: 0, npcProfile: { kind: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } } }, { persisted: false });
  assert.equal(world.size, 0, 'launching/abandoning a draft writes nothing');

  let createCalls = 0;
  const createActor = async (data) => {
    createCalls += 1;
    assert.equal(data._id, undefined, 'Foundry assigns the persistent id');
    const doc = makeNpc({ ...data, id: `world-${++idSeq}` }, { persisted: true, world });
    return doc;
  };
  const first = await persistence.materializeTransientProgressionActor(draft, { createActor });
  assert.equal(first.created, true);
  assert.ok(first.actor.id);
  assert.equal(world.size, 1);

  const again = await persistence.materializeTransientProgressionActor(first.actor, { createActor });
  assert.equal(again.created, false, 'already persisted: no second actor');
  assert.equal(again.actor, first.actor);
  assert.equal(createCalls, 1);
  assert.equal(world.size, 1);

  await assert.rejects(() => persistence.materializeTransientProgressionActor(draft, { createActor: async () => ({}) }), /no persistent actor/);
  assert.equal(await persistence.discardMaterializedProgressionActor(first.actor, { deleteActor: async (a) => world.delete(a.id) }), true);
  assert.equal(world.size, 0);
});

test('B1: the finalizer refuses to apply a plan to an unsaved draft (fail closed)', async () => {
  const world = makeWorld();
  const draft = makeNpc({}, { persisted: false });
  const session = await nonheroicChargenSession(draft);
  const engine = planEngine();
  const res = await withEngine(engine, () => ProgressionFinalizer.finalize({ mode: 'chargen', actor: draft, progressionSession: session, sessionId: 's' }, draft));
  assert.equal(res.success, false);
  assert.match(res.error, /persisted world actor/);
  assert.equal(engine.counter.calls, 0, 'no mutation was attempted');
  assert.equal(world.size, 0);
});

test('B1 integration: draft -> materialize -> finalize -> world reload has id, Nonheroic class, scoped feats, name and profile authority', async () => {
  const world = makeWorld();
  const draft = makeNpc({ name: 'New NPC', system: { level: 0, credits: 0, attributes: {}, abilities: {}, skills: {}, npcProfile: { kind: 'nonheroic', legalProfile: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } } }, { persisted: false });
  const session = await nonheroicChargenSession(draft);
  assert.equal(world.size, 0, 'nothing persisted while drafting');

  const { actor, created } = await persistence.materializeTransientProgressionActor(draft, {
    createActor: async (data) => makeNpc({ ...data, id: `world-${++idSeq}` }, { persisted: true, world }),
  });
  assert.equal(created, true);
  session.actorId = actor.id;
  const engine = planEngine();
  const res = await withEngine(engine, () => ProgressionFinalizer.finalize({ mode: 'chargen', actor, progressionSession: session, sessionId: 'sess-int' }, actor));
  assert.equal(res.success, true, res.error);

  // Reload from the world collection by id (a fresh document built from stored data).
  const reloaded = hydrate(actor, world, actor.id);
  assert.equal(world.size, 1);
  assert.equal(reloaded.type, 'npc');
  assert.equal(reloaded.name, 'Persisted Pete');
  const cls = reloaded.items.find((i) => i.type === 'class');
  assert.ok(cls, 'embedded class record persisted');
  assert.equal(cls.system.isNonheroic, true);
  assert.equal(cls.system.level, 1);
  const feats = reloaded.items.filter((i) => i.type === 'feat');
  assert.equal(feats.length, 3);
  assert.deepEqual(feats.filter((f) => f.name === 'Skill Focus').map((f) => f.system.selectedChoice).sort(), ['perception', 'stealth']);
  const state = npcMode.getNpcProfileState(reloaded);
  assert.equal(state.kind, 'nonheroic');
  assert.equal(state.sourceAuthority, 'progression');
  assert.equal(state.identityConflicts.length, 0);
  assert.equal(npcMode.resolveNpcCalculationMode(reloaded), 'progression');
  assert.deepEqual(getLevelSplit(reloaded), { heroicLevel: 0, nonheroicLevel: 1, totalLevel: 1 });
  assert.equal(reloaded.system.progression.chargenComplete, true);

  // Repeated finalization neither duplicates the actor nor re-grants items.
  const second = await persistence.materializeTransientProgressionActor(actor);
  assert.equal(second.created, false);
  const before = reloaded.items.length;
  await withEngine(planEngine(), () => ProgressionFinalizer.finalize({ mode: 'chargen', actor, progressionSession: session, sessionId: 'sess-int' }, actor));
  assert.equal(world.size, 1, 'still exactly one world actor');
  assert.equal(world.get(actor.id).items.length, before, 'no double-granted class/feats');
});

test('B1: the shell wires materialize-before-flush and discard-on-definite-failure; the finalizer guards unsaved actors', () => {
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.match(shell, /isTransientProgressionActor\(this\.actor\)/);
  assert.ok(shell.indexOf('materializeTransientProgressionActor(transientActor)') < shell.indexOf('SessionStorage.flushSession(this.actor'), 'world actor exists before the durability flush');
  assert.match(shell, /discardMaterializedProgressionActor\(materializedDraft\.persisted\)/);
  assert.match(shell, /canDiscardMaterializedActor\(finalizeResult\)/, 'cleanup is decided from the finalizer result (never after committed/indeterminate outcomes)');
  assert.match(fin, /persisted world actor/);
});

// ===========================================================================
// BLOCKER 2 — statblock authority cannot be bypassed
// ===========================================================================
const statblockNpc = (extra = {}) => makeNpc({
  system: { level: 5, hp: { value: 33, max: 33 }, npcProfile: { sourceAuthority: 'statblock', ...(extra.profile || {}) }, ...(extra.system || {}) },
  flags: { swse: { import: { raw: { hp: 33 } } } },
  items: extra.items || [],
});

test('B2: direct progression with subtype heroic/nonheroic is blocked for statblock-controlled NPCs', () => {
  for (const subtype of ['heroic', 'nonheroic']) {
    const plain = statblockNpc();
    const g = npcMode.evaluateNpcProgressionGuard(plain, { subtype });
    assert.equal(g.blocked, true, `${subtype} on a plain imported statblock`);
    assert.equal(g.reason, 'statblock-conversion-required');

    // profile DECLARES the identity, authority is still statblock
    const declared = statblockNpc({ profile: { kind: subtype, legalProfile: subtype } });
    assert.equal(npcMode.getNpcProfileState(declared).kind, subtype);
    const g2 = npcMode.evaluateNpcProgressionGuard(declared, { subtype });
    assert.equal(g2.blocked, true, `declared ${subtype} + statblock authority`);

    // explicit stored calculationMode wins outright
    const calc = makeNpc({ system: { level: 3, npcProfile: { kind: subtype, mode: 'progression', sourceAuthority: 'progression', calculationMode: 'statblock' } }, items: [classItem('Soldier', 3)] });
    assert.equal(npcMode.evaluateNpcProgressionGuard(calc, { subtype }).blocked, true, `explicit calculationMode statblock (${subtype})`);
  }
});

test('B2: contradictory identity and the heroic->nonheroic transition are blocked regardless of the requested subtype', () => {
  const conflict = makeNpc({ system: { level: 3, npcProfile: { kind: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } }, items: [classItem('Soldier', 3)] });
  const g = npcMode.evaluateNpcProgressionGuard(conflict, { subtype: 'heroic' });
  assert.equal(g.blocked, true);
  assert.equal(g.reason, 'identity-conflict');
  const heroic = makeNpc({ system: { level: 2, npcProfile: { kind: 'heroic', mode: 'progression', sourceAuthority: 'progression' } }, items: [classItem('Soldier', 2)] });
  assert.equal(npcMode.evaluateNpcProgressionGuard(heroic, { subtype: 'nonheroic' }).reason, 'transition-not-allowed');
  assert.equal(npcMode.evaluateNpcProgressionGuard(heroic, { subtype: 'heroic' }).blocked, false);
});

test('B2: only an authorized, snapshot-backed conversion for the matching target passes the guard', () => {
  const a = statblockNpc();
  const conv = { target: 'heroic', originSnapshot: 123 };
  assert.equal(npcMode.evaluateNpcProgressionGuard(a, { subtype: 'heroic', conversion: conv, originSnapshotExists: true }).blocked, false);
  assert.equal(npcMode.evaluateNpcProgressionGuard(a, { subtype: 'heroic', conversion: conv, originSnapshotExists: false }).blocked, true, 'no real origin snapshot');
  assert.equal(npcMode.evaluateNpcProgressionGuard(a, { subtype: 'nonheroic', conversion: conv, originSnapshotExists: true }).blocked, true, 'token for a different target');
  assert.equal(npcMode.evaluateNpcProgressionGuard(a, { subtype: 'heroic', conversion: { target: 'bogus', originSnapshot: 1 }, originSnapshotExists: true }).blocked, true);
});

test('B2: dependents and blank drafts are not caught by the statblock guard', () => {
  const minion = makeNpc({ system: { level: 3, isMinion: true, npcProfile: { kind: 'minion', mode: 'owner-sync', owner: { actorId: 'o' } } } });
  assert.equal(npcMode.evaluateNpcProgressionGuard(minion, { subtype: 'nonheroic' }).blocked, false);
  const blank = makeNpc({ system: { level: 0 } });
  assert.equal(npcMode.evaluateNpcProgressionGuard(blank, { subtype: 'nonheroic' }).blocked, false);
  assert.equal(npcMode.evaluateNpcProgressionGuard(makeNpc({}, { persisted: false }), { subtype: 'heroic' }).blocked, false);
});

test('B2: the finalizer independently refuses a statblock NPC (defense in depth behind launchProgression)', async () => {
  const world = makeWorld();
  const actor = makeNpc({ system: { level: 5, hp: { value: 33, max: 33 }, npcProfile: { sourceAuthority: 'statblock', kind: 'nonheroic' } }, flags: { swse: { import: { raw: { hp: 33 } } } } }, { world });
  const session = new ProgressionSession({ actor, mode: 'levelup', subtype: 'nonheroic' });
  const engine = planEngine();
  const res = await withEngine(engine, () => ProgressionFinalizer.finalize({ mode: 'levelup', actor, progressionSession: session, sessionId: 's' }, actor));
  assert.equal(res.success, false);
  assert.match(res.error, /NPC progression blocked \(statblock-conversion-required\)/);
  assert.equal(engine.counter.calls, 0);
  assert.equal(actor.system.hp.max, 33, 'published HP untouched');
  assert.equal(actor.system.npcProfile.sourceAuthority, 'statblock');
});

test('B2: launchProgression runs the guard before it trusts options.subtype', () => {
  const src = read('scripts/apps/progression-framework/progression-entry.js');
  assert.ok(src.indexOf('evaluateNpcProgressionGuard(actor, {') < src.indexOf('_resolveNpcProgressionSubtype(actor, options)'), 'guard precedes subtype resolution');
  assert.match(src, /statblockConversion: options\.statblockConversion|options\.statblockConversion \|\| null/);
});

// ===========================================================================
// BLOCKER 3 — Revert to Statblock targets the ORIGINAL statblock; conversion is transactional
// ===========================================================================
async function convertedNpcFixture() {
  const world = makeWorld();
  const actor = makeNpc({
    id: 'sb-1', name: 'Imported Trooper',
    system: {
      level: 2, hp: { value: 33, max: 33 },
      defenses: { reflex: { total: 17 }, fortitude: { total: 15 }, will: { total: 12 } },
      bab: 4, attacks: [{ name: 'Blaster Rifle', bonus: 6 }],
      npcProfile: { kind: 'heroic', legalProfile: 'heroic', mode: 'play', sourceAuthority: 'statblock' },
    },
    flags: { swse: { import: { raw: { hp: 33 } } } },
    items: [classItem('Soldier', 2)],
  }, { world });
  return { world, actor };
}

test('B3: Revert to Statblock restores the exact original; ordinary undo restores a different (post-conversion) state', async () => {
  const { actor } = await convertedNpcFixture();
  const pristine = clone({ system: actor.system, items: actor.items, name: actor.name });

  // 1. conversion authorized: origin snapshot taken, NOTHING about authority written yet.
  const origin = await SnapshotManager.createSnapshot(actor, 'Original statblock', { kind: STATBLOCK_ORIGIN_KIND });
  assert.equal(origin.kind, STATBLOCK_ORIGIN_KIND);
  assert.deepEqual(actor.system, pristine.system, 'authorizing a conversion changes no persistent authority');
  assert.equal(SnapshotManager.hasStatblockOriginSnapshot(actor, origin.timestamp), true);

  // 2. the level-up plan commits authority + new level atomically (the finalizer's patch).
  const patch = npcMode.buildNpcProfileReconciliationPatch(actor, {
    addedClassItems: [], conversion: { target: 'heroic', originSnapshot: origin.timestamp }, userId: 'gm',
  });
  await FakeEngine.applyMutationPlan(actor, { set: { ...patch, 'system.level': 3, 'system.hp.max': 41, 'system.bab': 5 }, update: { items: [{ _id: 'c-Soldier', 'system.level': 3 }] } });
  assert.equal(actor.system.npcProfile.sourceAuthority, 'progression');
  assert.equal(actor.system.npcProfile.calculationMode, 'progression');
  assert.equal(actor.system.npcProfile.legalReview.statblockConversion.originSnapshot, origin.timestamp);
  assert.equal(SnapshotManager.getStatblockOriginSnapshot(actor).timestamp, origin.timestamp);

  // 3. a later, ordinary pre-level snapshot (post-conversion authority) must NOT be what "Revert to Statblock" restores.
  await new Promise((r) => setTimeout(r, 3));
  const later = await SnapshotManager.createSnapshot(actor, 'Before Heroic Level-Up to 4');
  assert.notEqual(SnapshotManager.getLatestSnapshot(actor).timestamp, origin.timestamp, 'latest snapshot != conversion origin');
  assert.equal(SnapshotManager.getLatestSnapshot(actor).timestamp, later.timestamp);
  await FakeEngine.applyMutationPlan(actor, { set: { 'system.level': 4, 'system.hp.max': 49 } });

  // 4. Revert to Statblock = exact original (HP, defenses, BAB, attacks, class items, mode, authority).
  assert.equal(await SnapshotManager.revertToStatblockOrigin(actor), true);
  assert.deepEqual(actor.system, pristine.system);
  assert.deepEqual(actor.items.map((i) => [i.name, i.system.level]), pristine.items.map((i) => [i.name, i.system.level]));
  assert.equal(actor.system.hp.max, 33);
  assert.equal(actor.system.bab, 4);
  assert.deepEqual(actor.system.attacks, [{ name: 'Blaster Rifle', bonus: 6 }]);
  assert.deepEqual(actor.system.defenses, pristine.system.defenses);
  assert.equal(actor.system.npcProfile.mode, 'play');
  assert.equal(actor.system.npcProfile.sourceAuthority, 'statblock');
  assert.equal(actor.system.npcProfile.legalReview, undefined, 'conversion record gone with the restored statblock');
  assert.equal(SnapshotManager.getStatblockOriginSnapshot(actor), null, 'no stale origin reference after revert');
  assert.equal(npcMode.resolveNpcCalculationMode(actor), 'statblock');
});

test('B3: ordinary undo (latest snapshot) is a different action from statblock reversion', async () => {
  const { actor } = await convertedNpcFixture();
  const origin = await SnapshotManager.createSnapshot(actor, 'Original statblock', { kind: STATBLOCK_ORIGIN_KIND });
  await FakeEngine.applyMutationPlan(actor, { set: { ...npcMode.buildNpcProfileReconciliationPatch(actor, { conversion: { target: 'heroic', originSnapshot: origin.timestamp } }), 'system.level': 3, 'system.hp.max': 41 } });
  await new Promise((r) => setTimeout(r, 3));
  await SnapshotManager.createSnapshot(actor, 'Before Heroic Level-Up to 4');
  await FakeEngine.applyMutationPlan(actor, { set: { 'system.level': 4, 'system.hp.max': 49 } });
  assert.equal(await SnapshotManager.revertToLatestSnapshot(actor), true);
  assert.equal(actor.system.level, 3, 'undo returns to the post-conversion level-3 state');
  assert.equal(actor.system.hp.max, 41);
  assert.equal(actor.system.npcProfile.sourceAuthority, 'progression', 'undo does not revert authority');
});

test('B3: conversion-origin snapshots survive the 10-snapshot trim; a plain NPC has no origin to revert to', async () => {
  const { actor } = await convertedNpcFixture();
  assert.equal(await SnapshotManager.revertToStatblockOrigin(actor), false, 'nothing recorded -> no revert, nothing changed');
  const origin = await SnapshotManager.createSnapshot(actor, 'origin', { kind: STATBLOCK_ORIGIN_KIND });
  await FakeEngine.applyMutationPlan(actor, { set: { 'system.npcProfile.legalReview.statblockConversion': { originSnapshot: origin.timestamp } } });
  for (let i = 0; i < 14; i += 1) { await new Promise((r) => setTimeout(r, 2)); await SnapshotManager.createSnapshot(actor, `ordinary ${i}`); }
  const history = SnapshotManager.getSnapshots(actor);
  assert.ok(history.length <= 10);
  assert.ok(history.some((s) => s.kind === STATBLOCK_ORIGIN_KIND && s.timestamp === origin.timestamp), 'origin retained');
});

test('B3: cancelling or failing a conversion leaves authority untouched (authority is written only inside the finalized plan)', async () => {
  const src = read('scripts/apps/levelup/npc-levelup-entry.js');
  assert.doesNotMatch(src, /ActorEngine\.updateActor/, 'the entry no longer writes authority');
  assert.doesNotMatch(src, /'system\.npcProfile\.sourceAuthority': 'progression'/);
  assert.match(src, /STATBLOCK_ORIGIN_KIND/);
  assert.match(src, /statblockConversion: auth\.conversion/);
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.match(fin, /conversion: sessionState\.progressionSession\?\.statblockConversion/);

  // Real finalize on a statblock NPC with a FAILING plan: authority unchanged.
  const world = makeWorld();
  const actor = makeNpc({ system: { level: 2, hp: { value: 33, max: 33 }, npcProfile: { kind: 'heroic', mode: 'play', sourceAuthority: 'statblock' } }, flags: { swse: { import: { raw: { hp: 33 } } } }, items: [classItem('Soldier', 2)] }, { world });
  const origin = await SnapshotManager.createSnapshot(actor, 'origin', { kind: STATBLOCK_ORIGIN_KIND });
  const session = new ProgressionSession({ actor, mode: 'levelup', subtype: 'heroic', statblockConversion: { target: 'heroic', originSnapshot: origin.timestamp } });
  const res = await withEngine({ async applyMutationPlan() { throw new Error('boom'); }, async updateActor() {} }, () => ProgressionFinalizer.finalize({ mode: 'levelup', actor, progressionSession: session, sessionId: 's' }, actor));
  assert.equal(res.success, false);
  assert.doesNotMatch(String(res.error), /NPC progression blocked/, 'the conversion token passed the guard');
  assert.equal(actor.system.npcProfile.sourceAuthority, 'statblock', 'failed/cancelled conversion changed nothing');
  assert.equal(actor.system.npcProfile.mode, 'play');
});

// ===========================================================================
// BLOCKER 4 — multiclass progression reconciles NPC identity
// ===========================================================================
test('B4: Nonheroic 3 -> Soldier 1 -> Soldier 2 -> reopen level-up: identity reconciles with no false conflict, levels stay separate', async () => {
  const world = makeWorld();
  const actor = makeNpc({
    system: { level: 3, npcProfile: { kind: 'nonheroic', legalProfile: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } },
    items: [classItem('Nonheroic', 3, { nonheroic: true })],
  }, { world });
  assert.equal(npcMode.getNpcProfileState(actor).identityConflicts.length, 0, 'Nonheroic 3 is consistent');

  // --- Nonheroic 3 -> Soldier 1: the plan's class add + the reconciliation patch commit together.
  const soldier1 = { type: 'class', name: 'Soldier', system: { level: 1, classId: 'soldier', isNonheroic: false } };
  const patch1 = npcMode.buildNpcProfileReconciliationPatch(actor, { addedClassItems: [soldier1] });
  assert.deepEqual(patch1, { 'system.npcProfile.kind': 'heroic', 'system.npcProfile.legalProfile': 'heroic' });
  // Without the patch (the reviewed defect) the next advancement would be blocked:
  const naive = makeNpc({ system: clone(actor.system), items: [...actor.items.map(clone), { ...soldier1, id: 'c-Soldier', _id: 'c-Soldier' }] });
  assert.equal(npcMode.getNpcProfileState(naive).identityConflicts.length, 1, 'stored nonheroic + a Soldier class record = false conflict without reconciliation');
  assert.equal(npcMode.evaluateNpcProgressionGuard(naive, { subtype: 'heroic' }).reason, 'identity-conflict');

  await FakeEngine.applyMutationPlan(actor, { set: { ...patch1, 'system.level': 4 }, add: { items: [soldier1] } });
  let split = getLevelSplit(actor);
  assert.deepEqual(split, { heroicLevel: 1, nonheroicLevel: 3, totalLevel: 4 });
  let state = npcMode.getNpcProfileState(actor);
  assert.equal(state.kind, 'heroic');
  assert.equal(state.identityConflicts.length, 0);
  assert.equal(npcMode.evaluateNpcProgressionGuard(actor, { subtype: 'heroic' }).blocked, false);

  // --- Soldier 1 -> Soldier 2: existing class level update, identity already reconciled.
  const patch2 = npcMode.buildNpcProfileReconciliationPatch(actor, { addedClassItems: [] });
  assert.deepEqual(patch2, {}, 'nothing to reconcile on a class level update');
  const soldierId = actor.items.find((i) => i.name === 'Soldier')._id;
  await FakeEngine.applyMutationPlan(actor, { set: { 'system.level': 5 }, update: { items: [{ _id: soldierId, 'system.level': 2 }] } });
  split = getLevelSplit(actor);
  assert.deepEqual(split, { heroicLevel: 2, nonheroicLevel: 3, totalLevel: 5 });

  // --- Reopen NPC level-up: same policy the dialog uses.
  state = npcMode.getNpcProfileState(actor);
  assert.equal(state.identityConflicts.length, 0);
  assert.equal(npcMode.evaluateNpcProgressionGuard(actor, { subtype: 'heroic' }).blocked, false, 'Soldier 3 is reachable');
  assert.equal(model.evaluateNonheroicTransition({ heroicLevel: split.heroicLevel, nonheroicLevel: split.nonheroicLevel, target: 'heroic' }).allowed, true);
  assert.equal(model.evaluateNonheroicTransition({ heroicLevel: split.heroicLevel, nonheroicLevel: split.nonheroicLevel, target: 'nonheroic' }).allowed, false);
  // survives reload
  const reloaded = hydrate(actor, world, actor.id);
  assert.deepEqual(getLevelSplit(reloaded), { heroicLevel: 2, nonheroicLevel: 3, totalLevel: 5 });
  assert.equal(npcMode.getNpcProfileState(reloaded).identityConflicts.length, 0);
});

test('B4: reconciliation leaves dependents, undeclared profiles and consistent profiles alone; the finalizer applies it inside the plan', () => {
  const minion = makeNpc({ system: { level: 3, npcProfile: { kind: 'minion', mode: 'owner-sync' } } });
  assert.deepEqual(npcMode.buildNpcProfileReconciliationPatch(minion, { addedClassItems: [{ type: 'class', name: 'Soldier', system: {} }] }), {});
  const none = makeNpc({ system: { level: 0 } });
  assert.deepEqual(npcMode.buildNpcProfileReconciliationPatch(none, { addedClassItems: [{ type: 'class', name: 'Soldier', system: {} }] }), {}, 'no declared identity: nothing to correct (inferred from class records)');
  const fine = makeNpc({ system: { level: 1, npcProfile: { kind: 'heroic', legalProfile: 'heroic' } }, items: [classItem('Soldier', 1)] });
  assert.deepEqual(npcMode.buildNpcProfileReconciliationPatch(fine, { addedClassItems: [] }), {});
  assert.deepEqual(npcMode.buildNpcProfileReconciliationPatch(makeNpc({}, {}), {}), {} );
  const fin = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  assert.match(fin, /buildNpcProfileReconciliationPatch\(actor, \{\s*addedClassItems: \(add\.items \|\| \[\]\)\.filter\(item => item\?\.type === 'class'\)/);
});

// ===========================================================================
// BLOCKER 5 — starting-feat removal never resurrects deleted picks
// ===========================================================================
test('B5 (before): a one-entry commit WITHOUT replace merges into the old list - the reviewed defect', () => {
  const session = new ProgressionSession({ actor: makeNpc({}), mode: 'chargen', subtype: 'nonheroic' });
  const picks = [feat('Skill Focus', 'perception'), feat('Skill Focus', 'stealth'), feat('Armor Proficiency (Light)')];
  session.commitSelection('s', 'feats', picks);
  session.commitSelection('s', 'feats', [picks[0]]);                       // GM removed two picks, no replace flag
  assert.equal(session.draftSelections.feats.length, 3, 'old behavior: deleted picks survive');
});

test('B5: three -> two -> one -> zero starting picks with a concurrent general feat, repeatable Skill Focus, and session recovery', async () => {
  const { NonheroicStartingFeatsStep } = await sys('scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js');
  const session = new ProgressionSession({ actor: makeNpc({}), mode: 'chargen', subtype: 'nonheroic' });
  const step = new NonheroicStartingFeatsStep({ stepId: 'nonheroic-starting-feats' });
  const shell = { progressionSession: session, committedSelections: new Map(), buildIntent: null, requestRender() {}, actor: makeNpc({}) };
  const general = { id: 'feat-alertness', name: 'Alertness', type: 'feat', slotType: 'heroic', source: 'heroic', system: {} };
  session.commitSelection('general-feat', 'feats', [general]);              // concurrent general-feat step

  const commit = async (picks) => { step._selected = picks; await step._commitSelectedFeats(shell); };
  const names = () => session.draftSelections.feats.map((f) => `${f.name}${f.system?.selectedChoice ? `(${f.system.selectedChoice})` : ''}`).sort();
  const sf1 = feat('Skill Focus', 'perception'); const sf2 = feat('Skill Focus', 'stealth'); const al = feat('Armor Proficiency (Light)');

  await commit([sf1, sf2, al]);
  assert.deepEqual(names(), ['Alertness', 'Armor Proficiency (Light)', 'Skill Focus(perception)', 'Skill Focus(stealth)']);
  await commit([sf1, sf2]);                                                  // 3 -> 2
  assert.deepEqual(names(), ['Alertness', 'Skill Focus(perception)', 'Skill Focus(stealth)']);
  await commit([sf2]);                                                       // 2 -> 1 (the buggy merge case)
  assert.deepEqual(names(), ['Alertness', 'Skill Focus(stealth)'], 'removed Skill Focus(perception) and Armor Proficiency do not come back');
  await commit([]);                                                          // 1 -> 0
  assert.deepEqual(names(), ['Alertness'], 'only the general feat remains');

  // repeatable scopes re-added independently
  await commit([sf1, sf2]);
  assert.deepEqual(names(), ['Alertness', 'Skill Focus(perception)', 'Skill Focus(stealth)']);

  // session recovery: JSON round trip into a fresh session, then the step re-hydrates from it
  const restored = new ProgressionSession({ actor: makeNpc({}), mode: 'chargen', subtype: 'nonheroic' });
  restored.commitSelection('recovery', 'feats', JSON.parse(JSON.stringify(session.draftSelections.feats)), { replace: true });
  const step2 = new NonheroicStartingFeatsStep({ stepId: 'nonheroic-starting-feats' });
  const shell2 = { progressionSession: restored, committedSelections: new Map(), buildIntent: null, requestRender() {}, actor: makeNpc({}), mentor: {} };
  const hydrated = (restored.draftSelections.feats || []).filter((f) => f.slotType === model.NONHEROIC_STARTING_FEAT_SLOT_TYPE);
  assert.equal(hydrated.length, 2);
  step2._selected = hydrated;
  step2._selected = step2._selected.filter((e) => model.getStartingFeatSelectionKey(e) !== model.getStartingFeatSelectionKey(sf1));
  await step2._commitSelectedFeats(shell2);
  assert.deepEqual(restored.draftSelections.feats.map((f) => f.name).sort(), ['Alertness', 'Skill Focus']);
  assert.equal(restored.draftSelections.feats.find((f) => f.name === 'Skill Focus').system.selectedChoice, 'stealth');
});

test('B5: only this step opts into replacement; the global merge for other consumers is unchanged', () => {
  const step = read('scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js');
  assert.match(step, /\{ replace: true \}/);
  const base = read('scripts/apps/progression-framework/steps/step-plugin-base.js');
  assert.match(base, /_commitNormalized\(shell, selectionKey, normalizedValue, options = \{\}\)/);
  const sess = read('scripts/apps/progression-framework/shell/progression-session.js');
  assert.match(sess, /options\.replace === true && Array\.isArray\(normalizedValue\)/);
  assert.match(sess, /_mergeArraySelection\(selectionKey, normalizedValue, \{ stepId \}\)/, 'singleton merge still the default');
  // unrelated consumer: a one-entry commit with no flag still merges
  const session = new ProgressionSession({ actor: makeNpc({}), mode: 'chargen', subtype: 'nonheroic' });
  session.commitSelection('a', 'feats', [{ id: 'f1', name: 'One', type: 'feat' }, { id: 'f2', name: 'Two', type: 'feat' }]);
  session.commitSelection('b', 'feats', [{ id: 'f3', name: 'Three', type: 'feat' }]);
  assert.equal(session.draftSelections.feats.length, 3);
});

// ===========================================================================
// FOLLOW-UP (re-review of d366b9106)
// ===========================================================================

// --- 1. classless / level-0 / metadata-free statblock NPCs are still protected -------------
test('F1: a saved statblock NPC with level 0, no classes, no import data and no pack is guarded for heroic AND nonheroic', () => {
  for (const profile of [
    { sourceAuthority: 'statblock' },
    { mode: 'play' },
    { mode: 'statblock' },
    { calculationMode: 'statblock', sourceAuthority: 'progression', mode: 'progression' },
  ]) {
    const bare = makeNpc({ system: { level: 0, npcProfile: profile } });          // persisted id, nothing else
    assert.ok(bare.id);
    assert.equal(npcMode.npcHasExistingMechanics(bare), false, 'no mechanical history (the previously unguarded shape)');
    assert.equal(npcMode.npcDeclaresStatblockAuthority(bare), true);
    for (const subtype of ['heroic', 'nonheroic']) {
      const g = npcMode.evaluateNpcProgressionGuard(bare, { subtype });
      assert.equal(g.blocked, true, `${JSON.stringify(profile)} + ${subtype}`);
      assert.equal(g.reason, 'statblock-conversion-required');
    }
    // an authorized, snapshot-backed conversion still works for it
    assert.equal(npcMode.evaluateNpcProgressionGuard(bare, { subtype: 'heroic', conversion: { target: 'heroic', originSnapshot: 1 }, originSnapshotExists: true }).blocked, false);
  }
});

test('F1 controls: freshly materialized progression-controlled drafts, undeclared blanks and unsaved drafts are not blocked', () => {
  const fresh = makeNpc({ system: { level: 0, npcProfile: { kind: 'nonheroic', legalProfile: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } } });
  assert.equal(npcMode.npcDeclaresStatblockAuthority(fresh), false);
  for (const subtype of ['heroic', 'nonheroic']) assert.equal(npcMode.evaluateNpcProgressionGuard(fresh, { subtype }).blocked, false, subtype);
  assert.equal(npcMode.evaluateNpcProgressionGuard(makeNpc({ system: { level: 0 } }), { subtype: 'heroic' }).blocked, false, 'persisted blank, no declared authority');
  const unsavedDeclared = makeNpc({ system: { level: 0, npcProfile: { sourceAuthority: 'statblock' } } }, { persisted: false });
  assert.equal(npcMode.evaluateNpcProgressionGuard(unsavedDeclared, { subtype: 'heroic' }).blocked, false, 'unsaved draft has no world authority yet');
  const minion = makeNpc({ system: { level: 0, npcProfile: { kind: 'minion', sourceAuthority: 'statblock', mode: 'owner-sync' } } });
  assert.equal(npcMode.evaluateNpcProgressionGuard(minion, { subtype: 'nonheroic' }).blocked, false, 'dependents keep their own contract');
});

test('F1: the real finalize() also refuses the classless statblock NPC', async () => {
  const world = makeWorld();
  const actor = makeNpc({ system: { level: 0, npcProfile: { sourceAuthority: 'statblock' } } }, { world });
  const session = new ProgressionSession({ actor, mode: 'chargen', subtype: 'nonheroic' });
  const engine = planEngine();
  const res = await withEngine(engine, () => ProgressionFinalizer.finalize({ mode: 'chargen', actor, progressionSession: session, sessionId: 's' }, actor));
  assert.equal(res.success, false);
  assert.match(res.error, /statblock-conversion-required/);
  assert.equal(engine.counter.calls, 0);
});

// --- 2. finalizeSingleStep() enforces the same policy ---------------------------------------
test('F2: finalizeSingleStep refuses statblock-controlled NPCs and never reaches the engine', async () => {
  const world = makeWorld();
  const imported = makeNpc({ system: { level: 3, hp: { value: 20, max: 20 }, npcProfile: { sourceAuthority: 'statblock' } }, flags: { swse: { import: { raw: { hp: 20 } } } } }, { world });
  const classless = makeNpc({ system: { level: 0, npcProfile: { sourceAuthority: 'statblock' } } }, { world });
  for (const actor of [imported, classless]) {
    for (const domain of ['feats', 'talents', 'forcePowers', 'skills']) {
      const session = new ProgressionSession({ actor, mode: 'levelup', subtype: 'heroic' });
      session.commitSelection('t', 'feats', [{ id: 'f1', name: 'Alertness', type: 'feat' }]);
      const engine = planEngine();
      const res = await withEngine(engine, () => ProgressionFinalizer.finalizeSingleStep({ mode: 'levelup', actor, progressionSession: session, steps: [] }, actor, { domain, stepId: domain }));
      assert.equal(res.success, false, `${domain}`);
      assert.match(res.error, /NPC progression blocked \(statblock-conversion-required\)/);
      assert.equal(engine.counter.calls, 0);
    }
  }
  assert.equal(imported.system.hp.max, 20);
  assert.equal(imported.items.length, 0, 'no item was granted');
});

test('F2: single-step still works for authorized and unguarded cases; dependents and the Store droid job are exempt', async () => {
  const world = makeWorld();
  // authorized conversion token (with a real origin snapshot) passes the guard
  const actor = makeNpc({ system: { level: 3, npcProfile: { sourceAuthority: 'statblock' } }, flags: { swse: { import: { raw: { hp: 20 } } } } }, { world });
  const origin = await SnapshotManager.createSnapshot(actor, 'origin', { kind: STATBLOCK_ORIGIN_KIND });
  const authorized = new ProgressionSession({ actor, mode: 'levelup', subtype: 'heroic', statblockConversion: { target: 'heroic', originSnapshot: origin.timestamp } });
  const res = await withEngine(planEngine(), () => ProgressionFinalizer.finalizeSingleStep({ mode: 'levelup', actor, progressionSession: authorized, steps: [] }, actor, { domain: 'feats', stepId: 'general-feat' }));
  assert.doesNotMatch(String(res.error), /NPC progression blocked/, 'authorized conversion passes the guard (it then fails only for the empty pick)');

  // a progression-controlled NPC and a dependent minion are unaffected by the guard
  const progression = makeNpc({ system: { level: 2, npcProfile: { kind: 'heroic', mode: 'progression', sourceAuthority: 'progression' } }, items: [classItem('Soldier', 2)] }, { world });
  const minion = makeNpc({ system: { level: 2, isMinion: true, npcProfile: { kind: 'minion', mode: 'owner-sync', sourceAuthority: 'statblock' } } }, { world });
  for (const a of [progression, minion]) {
    const s = new ProgressionSession({ actor: a, mode: 'levelup', subtype: 'heroic' });
    const r = await withEngine(planEngine(), () => ProgressionFinalizer.finalizeSingleStep({ mode: 'levelup', actor: a, progressionSession: s, steps: [] }, a, { domain: 'feats', stepId: 'general-feat' }));
    assert.doesNotMatch(String(r.error), /NPC progression blocked/);
  }

  // non-NPC actors are untouched, and the Store droid job returns before the guard (it never mutates the actor)
  const src = read('scripts/apps/progression-framework/shell/progression-finalizer.js');
  const single = src.slice(src.indexOf('static async finalizeSingleStep'));
  assert.ok(single.indexOf("domain === 'droidBuilder'") < single.indexOf('_assertNpcProgressionAuthority(sessionState, actor)'));
  assert.match(src, /static _assertNpcProgressionAuthority\(sessionState, actor\)/);
  assert.equal((src.match(/this\._assertNpcProgressionAuthority\(sessionState, actor\)/g) || []).length, 2, 'finalize() and finalizeSingleStep() share one guard');
});

// --- 3. never delete a materialized actor whose plan committed -------------------------------
test('F3: canDiscardMaterializedActor never allows deletion after any committed / indeterminate / unverified outcome', () => {
  const can = persistence.canDiscardMaterializedActor;
  assert.equal(can({ success: true, committed: true }), false);
  assert.equal(can({ success: false, committed: true, error: 'Level-up finalization audit failed' }), false, 'committed but unsuccessful: the reviewed gap');
  assert.equal(can({ success: false, committed: true, audit: { ok: false } }), false);
  assert.equal(can({ success: false, indeterminate: true, partialMutationPossible: true }), false);
  assert.equal(can({ success: false, partialMutationPossible: true }), false);
  assert.equal(can({ success: false, rollbackOutcome: 'FAILED_UNCOMPENSATED' }), false, 'rollback attempted but not verified');
  assert.equal(can(null), false, 'unknown outcome: keep the actor');
  assert.equal(can(undefined), false);
  // definite non-commits
  assert.equal(can({ success: false, error: 'Mutation plan invalid' }), true);
  assert.equal(can({ success: false, error: 'boom', rollbackOutcome: 'FAILED_COMPENSATED' }), true);
});

test('F3: the shell decides cleanup from the finalizer result (committed flag) and discards via the same helper', async () => {
  const shell = read('scripts/apps/progression-framework/shell/progression-shell.js');
  assert.match(shell, /finalizeResult = result;/);
  assert.match(shell, /canDiscardMaterializedActor\(finalizeResult\)/);
  assert.doesNotMatch(shell, /_lastFinalizeIndeterminate/, 'ad-hoc success/indeterminate flags replaced');
  // a real finalizer failure that does not commit is discardable; a real committed:true failure shape is not
  const world = makeWorld();
  const draft = makeNpc({ system: { level: 0, npcProfile: { kind: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } } }, { persisted: false });
  const session = await nonheroicChargenSession(draft);
  const { actor } = await persistence.materializeTransientProgressionActor(draft, { createActor: async (d) => makeNpc({ ...d, id: `world-${++idSeq}` }, { persisted: true, world }) });
  const failing = await withEngine({ async applyMutationPlan() { const e = new Error('boom'); e.rollback = { outcome: 'FAILED_COMPENSATED' }; throw e; }, async updateActor() {} },
    () => ProgressionFinalizer.finalize({ mode: 'chargen', actor, progressionSession: session, sessionId: 'f3' }, actor));
  assert.equal(failing.success, false);
  assert.equal(persistence.canDiscardMaterializedActor(failing), true, 'verified-rolled-back failure: safe to remove the draft actor');
  const unverified = await withEngine({ async applyMutationPlan() { const e = new Error('boom'); e.rollback = { outcome: 'FAILED_UNCOMPENSATED' }; throw e; }, async updateActor() {} },
    () => ProgressionFinalizer.finalize({ mode: 'chargen', actor, progressionSession: session, sessionId: 'f3b' }, actor));
  assert.equal(persistence.canDiscardMaterializedActor(unverified), false, 'unverified rollback: actor kept');
});
