/**
 * TI4-C0 / G11 — FollowerCreator.updateFollowerFromMutation() must not claim a rollback it did not verify.
 *
 * Production methods under test, unmodified: FollowerCreator.updateFollowerFromMutation / updateFollowerForOwnerLevel and
 * FollowerShell._applyFollowerMutation. Only FollowerCreator._applyFollowerProgressionMaterial (the materialization stage whose failure triggers
 * the rollback) is injected. The rollback authority is the REAL ActorEngine rollback certification (restoreSnapshotVerified /
 * captureRecoverySnapshot) over the REAL SnapshotService; the document mutators SnapshotService calls are the Foundry shim's fake ActorEngine
 * operating on a plain-object follower. Level: L1 (offline, single client). No Foundry runtime, cross-client or durable-recovery claim.
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, appendChild() {} }), addEventListener() {}, body: {}, head: { appendChild() {} }, querySelector: () => null, querySelectorAll: () => [] };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const { ActorEngine: RealEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { ActorEngine: FakeEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
const { FollowerCreator } = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
const { FollowerShell } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/follower-shell.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/core/logger.js');

/* ---- logging capture ---- */
const logLines = [];
for (const lg of [swseLogger, SWSELogger]) for (const level of ['log', 'info', 'warn', 'error', 'debug']) { if (lg[level]) lg[level] = (...a) => { logLines.push({ level, msg: String(a[0]) }); }; }
const rolledBackClaims = () => logLines.filter((l) => /rolled back (follower )?to its pre-update snapshot/i.test(l.msg));

/* ---- harness ---- */
const clone = (v) => JSON.parse(JSON.stringify(v));
const savedFake = { restoreFromSnapshot: FakeEngine.restoreFromSnapshot };
const savedReal = { restoreFromSnapshot: RealEngine.restoreFromSnapshot };
const savedMaterial = FollowerCreator._applyFollowerProgressionMaterial;
const savedGame = globalThis.game;
// The shim's fake ActorEngine does not implement the new rollback-certification entry points; delegate them to the REAL implementation so the real
// certification logic (and the real SnapshotService behind RealEngine.restoreFromSnapshot) is what FollowerCreator exercises.
for (const name of ['captureRecoverySnapshot', 'restoreSnapshotVerified', '_validateRecoverySnapshot']) {
  if (typeof RealEngine[name] === 'function') FakeEngine[name] = (...a) => RealEngine[name](...a);
}
const PROTECTED = 'foundryvtt-swse';

function mkFollower() {
  const f = {
    id: 'follower1', name: 'Old Name', img: 'f.png', type: 'npc',
    system: { level: 2, race: 'Human', credits: 10, progression: {} },
    flags: { swse: { follower: { ownerId: 'owner1', templateType: 'aggressive' } }, [PROTECTED]: { snapshots: [{ id: 'ring-1' }] } },
    ownership: { default: 0 }, prototypeToken: { name: 'Old Name' },
    items: [{ _id: 'feat1', name: 'Weapon Proficiency (Simple Weapons)', type: 'feat', system: {}, flags: {} }],
    effects: [],
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() { return clone({ _id: f.id, name: f.name, img: f.img, type: f.type, system: f.system, flags: f.flags, ownership: f.ownership, prototypeToken: f.prototypeToken, items: f.items, effects: f.effects }); }
  };
  return f;
}
const mutation = () => ({
  ownerActorId: 'owner1', speciesName: 'Human', templateType: 'aggressive', persistentChoices: { droidConfig: null },
  followerState: { abilities: { str: { base: 10 } }, hp: { max: 20, value: 20 }, baseAttackBonus: 3 }, targetHeroicLevel: 5
});
const view = (f) => { const { toObject, getFlag, ...r } = f; return clone(r); };

/** Installs one scenario. `stage` runs inside the injected materialization stage (damage), then the stage throws unless `succeed`. */
function install({ stage, succeed = false, restore } = {}) {
  resetFakeActorEngine();
  logLines.length = 0;
  const calls = { material: 0 };
  const injected = new Error('materialization failed');
  FollowerCreator._applyFollowerProgressionMaterial = async (owner, follower) => {
    calls.material++;
    if (stage) await stage(follower);
    if (!succeed) throw injected;
    return { feats: [], trainedSkills: [], languages: [] };
  };
  FakeEngine.restoreFromSnapshot = (actor, snap, opts) => SnapshotService.restoreFromSnapshot(actor, snap, opts);
  RealEngine.restoreFromSnapshot = restore ?? ((actor, snap, opts) => SnapshotService.restoreFromSnapshot(actor, snap, opts));
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => (id === 'owner1' ? { id: 'owner1', name: 'Owner', flags: {}, system: {} } : undefined) } };
  return { calls, injected };
}
function restoreAll() {
  FollowerCreator._applyFollowerProgressionMaterial = savedMaterial;
  FakeEngine.restoreFromSnapshot = savedFake.restoreFromSnapshot;
  RealEngine.restoreFromSnapshot = savedReal.restoreFromSnapshot;
  globalThis.game = savedGame;
}
const writeCalls = () => fakeActorEngineCallLog.filter((c) => ['updateActor', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments'].includes(c.method));
/** Mid-update damage on the follower: stage-local writes plus a flag key the failed update newly introduced. */
const damage = (f) => {
  f.system.level = 5; f.system.credits = 0; f.system.progression.followerTemplate = 'aggressive'; f.system.added = 'x';
  f.flags['foundryvtt-swse'].isDroid = true; f.flags.swse.follower.templateType = 'defensive';
  f.items.push({ _id: 'featNew', name: 'New Feat', type: 'feat', system: {}, flags: {} });
};
async function run(follower, mut = mutation(), report = {}) {
  const returned = await FollowerCreator.updateFollowerFromMutation(follower, mut, { report });
  return { returned, report };
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---------------------------------------------------------------------------------------------- */
/* restoration verdicts                                                                            */
/* ---------------------------------------------------------------------------------------------- */
await check('restore {success:false} (no throw) → false, INDETERMINATE, original error kept, NO "rolled back" claim', async () => {
  const f = mkFollower();
  const s = install({ stage: damage, restore: async () => ({ success: false, exact: false, code: 'SNAPSHOT_ITEM_RESTORE_FAILED', failedStep: 'items', partialMutation: true, error: 'item restore refused' }) });
  const { returned, report } = await run(f);
  assert.equal(rolledBackClaims().length, 0, 'no successful-rollback log line (the defect: HEAD logs one whenever the calls merely resolve)');
  assert.equal(returned, false);
  assert.equal(report.outcome, 'INDETERMINATE');
  assert.equal(report.error, s.injected, 'the SAME original error object is reported');
  assert.equal(report.partialMutationPossible, true);
  assert.equal(report.rollback.target.verdict, 'FAILED');
  assert.equal(report.rollback.target.code, 'SNAPSHOT_ITEM_RESTORE_FAILED');
  assert.equal(rolledBackClaims().length, 0, 'no successful-rollback log line');
});

await check('restore {success:true, exact:false} → INDETERMINATE (inexact is not verified)', async () => {
  install({ stage: damage, restore: async () => ({ success: true, exact: false, verification: { rootMatched: true, itemsMatched: true, effectsMatched: true } }) });
  const { returned, report } = await run(mkFollower());
  assert.equal(rolledBackClaims().length, 0, 'inexact restore must not be logged as a rollback');
  assert.equal(returned, false);
  assert.equal(report.outcome, 'INDETERMINATE');
  assert.equal(report.rollback.target.verdict, 'INEXACT');
});

await check('restore THROWS → INDETERMINATE; original error and the restore error are both kept', async () => {
  const s = install({ stage: damage, restore: async () => { throw new Error('restore boom'); } });
  const { returned, report } = await run(mkFollower());
  assert.equal(returned, false);
  assert.equal(report.outcome, 'INDETERMINATE');
  assert.equal(report.error, s.injected);
  assert.equal(report.rollback.target.verdict, 'THREW');
  assert.equal(report.rollback.target.restoreError, 'restore boom');
  assert.equal(rolledBackClaims().length, 0);
});

for (const [label, value] of [['undefined', undefined], ['null', null], ['a string', 'ok'], ['{}', {}], ['an array', []]]) {
  await check(`restore returns MALFORMED evidence (${label}) → INDETERMINATE`, async () => {
    install({ stage: damage, restore: async () => value });
    const { report } = await run(mkFollower());
    assert.equal(report.outcome, 'INDETERMINATE');
    assert.equal(report.rollback.target.verdict, 'MALFORMED');
    assert.equal(rolledBackClaims().length, 0);
  });
}

await check('exact:true without positive verification evidence (an unverified leg) → INDETERMINATE', async () => {
  install({ stage: damage, restore: async () => ({ success: true, exact: true }) });
  const { report } = await run(mkFollower());
  assert.equal(report.outcome, 'INDETERMINATE');
  assert.equal(report.rollback.target.verdict, 'INEXACT');
  assert.equal(rolledBackClaims().length, 0);
});

/* ---------------------------------------------------------------------------------------------- */
/* genuine verified compensation                                                                    */
/* ---------------------------------------------------------------------------------------------- */
await check('genuine, exactly restored follower (system, flags incl. a newly introduced key, Items) → false + FAILED_COMPENSATED', async () => {
  const f = mkFollower(); const before = view(f);
  const s = install({ stage: damage });
  const { returned, report } = await run(f);
  assert.equal(returned, false, 'the boolean contract is unchanged');
  assert.equal(report.outcome, 'FAILED_COMPENSATED');
  assert.equal(report.error, s.injected);
  assert.equal(report.partialMutationPossible, undefined);
  assert.equal(report.rollback.level, 'L1');
  assert.deepEqual(view(f), before, 'every restored field is back; the flag key the failed update introduced is gone');
  assert.equal(f.flags['foundryvtt-swse'].isDroid, undefined);
  assert.equal(rolledBackClaims().length, 1, 'a rollback claim is logged only for a verified restoration');
});

await check('no separate flag-restoration write: the verified restore is the single authority, and protected flag paths are not overwritten', async () => {
  const f = mkFollower();
  install({ stage: (fol) => { damage(fol); fol.flags[PROTECTED].snapshots = [{ id: 'ring-1' }, { id: 'ring-2' }]; } });
  const { report } = await run(f);
  assert.ok(!fakeActorEngineCallLog.some((c) => /rollback\.flags/.test(c.options?.source ?? '')), 'no second flag write');
  assert.deepEqual(f.flags[PROTECTED].snapshots, [{ id: 'ring-1' }, { id: 'ring-2' }], 'the protected snapshot-history flag is left to its own authority');
  assert.equal(report.outcome, 'FAILED_COMPENSATED');
});

await check('failure before the first mutation (malformed mutation) → no mutation is applied and the result is a verified no-op', async () => {
  const f = mkFollower(); const before = view(f);
  install();
  const { returned, report } = await run(f, null);
  assert.equal(returned, false);
  assert.equal(report.outcome, 'FAILED_COMPENSATED');
  assert.ok(report.error instanceof TypeError || report.error instanceof Error);
  assert.deepEqual(view(f), before);
});

await check('a snapshot that cannot support recovery REFUSES the update before any write', async () => {
  const f = mkFollower(); delete f.items[0]._id;
  const s = install({ stage: damage });
  const { returned, report } = await run(f);
  assert.equal(s.calls.material, 0, 'nothing was attempted');
  assert.equal(writeCalls().length, 0);
  assert.equal(returned, false);
  assert.equal(report.outcome, 'REFUSED');
  assert.equal(rolledBackClaims().length, 0);
});

await check('original mutation error object is preserved when the FIRST write (core state) fails', async () => {
  const f = mkFollower();
  install({ succeed: true });
  const boom = new Error('core-state write refused');
  const real = FakeEngine.updateActor;
  FakeEngine.updateActor = async (a, d, o) => { if (/updateFromMutation\.progression/.test(o?.source ?? '')) throw boom; return real.call(FakeEngine, a, d, o); };
  try {
    const { returned, report } = await run(f);
    assert.equal(returned, false);
    assert.equal(report.error, boom);
    assert.equal(report.outcome, 'FAILED_COMPENSATED');
  } finally { FakeEngine.updateActor = real; }
});

/* ---------------------------------------------------------------------------------------------- */
/* unchanged success; no retry; callers                                                              */
/* ---------------------------------------------------------------------------------------------- */
await check('successful follower update is unchanged: true, COMMITTED, no restore, one materialization', async () => {
  const f = mkFollower();
  const s = install({ succeed: true });
  let restores = 0; RealEngine.restoreFromSnapshot = async () => { restores++; return { success: true, exact: true }; };
  const { returned, report } = await run(f);
  assert.equal(returned, true);
  assert.equal(report.outcome, 'COMMITTED');
  assert.equal(restores, 0);
  assert.equal(s.calls.material, 1);
  assert.equal(f.system.level, 5);
});

await check('calling without an options/report argument keeps the plain boolean contract', async () => {
  install({ stage: damage });
  const returned = await FollowerCreator.updateFollowerFromMutation(mkFollower(), mutation());
  assert.equal(returned, false);
});

await check('no automatic retry after an indeterminate outcome: materialization, core write and restore each run once', async () => {
  const f = mkFollower();
  const s = install({ stage: damage, restore: async () => ({ success: false, exact: false }) });
  let restores = 0; const orig = RealEngine.restoreFromSnapshot; RealEngine.restoreFromSnapshot = async (...a) => { restores++; return orig(...a); };
  await run(f);
  assert.equal(s.calls.material, 1);
  assert.equal(fakeActorEngineCallLog.filter((c) => c.method === 'updateActor' && /progression$/.test(c.options?.source ?? '')).length, 1);
  assert.equal(restores, 1);
});

await check('FollowerShell: an indeterminate update is surfaced (not a plain failure) with evidence; a compensated one stays plain', async () => {
  const shellCtx = { ownerActor: { id: 'owner1' } };
  const f = mkFollower();
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => (id === 'follower1' ? f : (id === 'owner1' ? { id: 'owner1', flags: {}, system: {} } : undefined)) } };
  const m = { ...mutation(), operation: 'update', existingFollowerId: 'follower1' };
  install({ stage: damage, restore: async () => ({ success: true, exact: false }) });
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => (id === 'follower1' ? f : (id === 'owner1' ? { id: 'owner1', flags: {}, system: {} } : undefined)) } };
  const bad = await FollowerShell.prototype._applyFollowerMutation.call(shellCtx, m);
  assert.equal(bad.success, false);
  assert.equal(bad.indeterminate, true);
  assert.equal(bad.rollbackOutcome, 'INDETERMINATE');
  assert.equal(bad.partialMutationPossible, true);
  assert.match(bad.error, /could not be verified/);
  restoreAll();

  const f2 = mkFollower();
  install({ stage: damage });
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => (id === 'follower1' ? f2 : (id === 'owner1' ? { id: 'owner1', flags: {}, system: {} } : undefined)) } };
  const ok = await FollowerShell.prototype._applyFollowerMutation.call(shellCtx, m);
  assert.equal(ok.success, false);
  assert.equal(ok.indeterminate, undefined);
  assert.equal(ok.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(ok.error, 'Failed to update follower');
});

await check('updateFollowerForOwnerLevel keeps its boolean contract on an indeterminate update (never true, no retry)', async () => {
  const f = mkFollower(); f.system.isFollower = true; f.system.progression.followerTemplate = 'aggressive';
  const s = install({ stage: damage, restore: async () => ({ success: true, exact: false }) });
  const owner = { id: 'owner1', name: 'Owner', flags: {}, system: {}, items: [] };
  let out;
  try { out = await FollowerCreator.updateFollowerForOwnerLevel(owner, f); } catch (e) { out = `threw: ${e.message}`; }
  // derivation may be unavailable under the shim; the contract under test is "never reports success" and "materialization is not retried"
  assert.notEqual(out, true);
  assert.ok(s.calls.material <= 1);
});

await check('the species-materialization hotfix wrapper forwards the options/report argument', async () => {
  const src = await readFile(new URL('../scripts/patches/follower-species-materialization-hotfix.js', import.meta.url), 'utf8');
  assert.match(src, /patchedUpdateFollowerFromMutation\(follower, mutation, \.\.\.rest\)/);
  assert.match(src, /originalUpdate\(follower, mutation, \.\.\.rest\)/);
});

await check('declared rollback scope is the follower Actor: _applyFollowerProgressionMaterial never writes the owner or other documents', async () => {
  const src = await readFile(new URL('../scripts/apps/follower-creator.js', import.meta.url), 'utf8');
  const start = src.indexOf('static async _applyFollowerProgressionMaterial(');
  const end = src.indexOf('static async _applyDefenseBonuses', start);
  const body = src.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.ok(!/ActorEngine\.\w+\(\s*owner\b/.test(body), 'no ActorEngine write targets the owner');
  assert.ok(!/\bowner\.(update|setFlag|unsetFlag|createEmbedded|updateEmbedded|deleteEmbedded)/.test(body), 'no direct owner mutation');
  assert.ok(!/\b(Actor|Item|Journal)\.(create|update|delete)/.test(body), 'no world-document creation');
  for (const helper of ['_addFeatByName', '_trainSkill', '_upsertFixedProfileNaturalWeapons']) {
    const hs = src.indexOf(`static async ${helper}(`);
    const he = src.indexOf('\n    static ', hs + 10);
    const hb = src.slice(hs, he);
    assert.ok(!/ActorEngine\.\w+\(\s*owner\b/.test(hb), `${helper} does not write the owner`);
  }
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G11 follower rollback: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
