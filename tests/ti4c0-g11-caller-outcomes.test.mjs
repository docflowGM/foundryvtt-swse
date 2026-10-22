/**
 * TI4-C0 / G11 review correction 1 — callers of FollowerCreator.updateFollowerFromMutation() must respect its outcome.
 *
 * Real callers under test (unmodified production functions): transferOrphanFollower() (follower-orphan-transfer-hotfix.js) and
 * repairExistingFollowers() (follower-species-repair-hook.js). The injected seam is FollowerCreator.updateFollowerFromMutation itself
 * (its own verdicts are covered by tests/ti4c0-g11-follower-rollback.test.mjs) plus FollowerCreator._linkFollowerToOwner, so we can observe
 * whether the caller continues after a failed update. Level: L1 (offline). No Foundry runtime, cross-client or durable-recovery claim.
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
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const notes = { info: [], warn: [], error: [] };
globalThis.ui = { notifications: { info: (m) => notes.info.push(String(m)), warn: (m) => notes.warn.push(String(m)), error: (m) => notes.error.push(String(m)) } };

const { FollowerCreator } = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
const transferMod = await import('/systems/foundryvtt-swse/scripts/patches/follower-orphan-transfer-hotfix.js');
const repairMod = await import('/systems/foundryvtt-swse/scripts/patches/follower-species-repair-hook.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
const { SpeciesRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js');
const { transferOrphanFollower } = transferMod;
const repairExistingFollowers = repairMod.repairExistingFollowers;

const logs = [];
for (const level of ['log', 'info', 'warn', 'error', 'debug']) swseLogger[level] = (...a) => { logs.push({ level, msg: String(a[0]), data: a[1] }); };
const TEMPLATES = JSON.parse(await readFile(new URL('../data/follower-templates.json', import.meta.url), 'utf8'));
const saved = {
  templates: FollowerCreator.getFollowerTemplates,
  update: FollowerCreator.updateFollowerFromMutation, link: FollowerCreator._linkFollowerToOwner, game: globalThis.game, init: SpeciesRegistry.initialize
};
const clone = (v) => JSON.parse(JSON.stringify(v));

function mkOwner(id = 'newOwner') {
  const flags = { 'foundryvtt-swse': {} };
  const o = { id, name: 'New Owner', type: 'character', flags, system: { ownedActors: [] }, setFlagCalls: [],
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    async setFlag(scope, key, value) { this.setFlagCalls.push(key); this.flags[scope] = { ...(this.flags[scope] || {}), [key]: value }; } };
  return o;
}
function mkOrphan() {
  return { id: 'orphan1', name: 'Orphan', type: 'npc', img: 'o.png',
    system: { isFollower: true, race: 'Human', level: 2, npcProfile: { kind: 'follower', owner: { actorId: null, orphaned: true } },
      progression: { followerTemplate: 'aggressive', followerChoices: { speciesName: 'Human' }, isFollower: true } },
    flags: { swse: { follower: { isFollower: true, orphaned: true, templateType: 'aggressive', ownerId: null } } }, ownership: {},
    getFlag() { return undefined; } };
}
const slot = { id: 'slot1', talentName: 'Armored Defense', talentItemId: 'tal1', talentTreeId: 'tree1', dependentKind: 'follower' };

/** Installs a scenario: what the follower update does, and records caller behaviour. */
function install({ updateReturns, report, throwsFromUpdate } = {}) {
  resetFakeActorEngineAll();
  logs.length = 0; notes.info.length = 0; notes.warn.length = 0; notes.error.length = 0;
  const calls = { update: 0, link: 0 };
  FollowerCreator.updateFollowerFromMutation = async (follower, mutation, options = {}) => {
    calls.update++; calls.lastOptions = options;
    if (throwsFromUpdate) throw throwsFromUpdate;
    if (options?.report && report) Object.assign(options.report, report);
    return updateReturns;
  };
  FollowerCreator._linkFollowerToOwner = async () => { calls.link++; };
  FollowerCreator.getFollowerTemplates = async () => TEMPLATES;
  const follower = mkOrphan(); const newOwner = mkOwner();
  globalThis.game = { ...(saved.game ?? {}), user: { isGM: true }, users: [], actors: Object.assign([follower, newOwner], { get: (id) => [follower, newOwner].find((a) => a.id === id) }) };
  return { calls, follower, newOwner };
}
function resetFakeActorEngineAll() { resetFakeActorEngine(); }
function restoreAll() { FollowerCreator.getFollowerTemplates = saved.templates; FollowerCreator.updateFollowerFromMutation = saved.update; FollowerCreator._linkFollowerToOwner = saved.link; globalThis.game = saved.game; SpeciesRegistry.initialize = saved.init; }
const successClaims = () => [...notes.info.filter((m) => /is now assigned/i.test(m)), ...logs.filter((l) => /Reassigned follower/i.test(l.msg))];
const attempt = async (follower, newOwner) => { try { return { value: await transferOrphanFollower(follower, newOwner, slot) }; } catch (error) { return { error }; } };

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---------------------------------------------------------------------------------------------- */
/* orphan transfer                                                                                  */
/* ---------------------------------------------------------------------------------------------- */
const originalErr = new Error('materialization failed');
const indeterminateReport = { outcome: 'INDETERMINATE', error: originalErr, partialMutationPossible: true, rollback: { level: 'L1', target: { verdict: 'INEXACT' } } };
const compensatedReport = { outcome: 'FAILED_COMPENSATED', error: originalErr, rollback: { level: 'L1', target: { verdict: 'EXACT' } } };

await check('transfer: a failed follower update does NOT continue to _linkFollowerToOwner and announces no reassignment', async () => {
  const s = install({ updateReturns: false, report: indeterminateReport });
  const r = await attempt(s.follower, s.newOwner);
  assert.equal(s.calls.link, 0, '_linkFollowerToOwner must not run after a failed update');
  assert.equal(successClaims().length, 0, 'no success notification or log');
  assert.ok(r.error instanceof Error, 'the transfer fails closed (throws)');
});

await check('transfer: INDETERMINATE is surfaced with its rollback evidence, original error and a GM-inspection message', async () => {
  const s = install({ updateReturns: false, report: indeterminateReport });
  const { error } = await attempt(s.follower, s.newOwner);
  assert.ok(error, 'throws');
  assert.equal(error.transferOutcome, 'INDETERMINATE');
  assert.equal(error.partialMutationPossible, true);
  assert.equal(error.followerUpdate.outcome, 'INDETERMINATE');
  assert.equal(error.followerUpdate.rollback.target.verdict, 'INEXACT');
  assert.equal(error.cause, originalErr, 'the original follower-update error is preserved');
  assert.match(error.message, /may be partially (modified|updated)/i);
  assert.match(error.message, /GM|inspect|check/i);
  assert.ok(notes.error.length >= 1 || notes.warn.length >= 1, 'the GM is notified');
  assert.ok(logs.some((l) => l.level === 'error'), 'logged at error level');
});

await check('transfer: a VERIFIED follower rollback is still a failed transfer — earlier ownership writes are not claimed reversed', async () => {
  const s = install({ updateReturns: false, report: compensatedReport });
  const { error } = await attempt(s.follower, s.newOwner);
  assert.ok(error);
  assert.notEqual(error.transferOutcome, 'FAILED_COMPENSATED', 'the whole transfer is never reported compensated');
  assert.equal(error.transferOutcome, 'INDETERMINATE');
  assert.equal(error.followerUpdate.outcome, 'FAILED_COMPENSATED');
  assert.match(error.message, /not (been )?(reversed|rolled back|undone)|earlier/i);
  assert.ok(s.newOwner.setFlagCalls.length > 0, 'the earlier owner-side writes did happen and are still in place');
  assert.equal(s.calls.link, 0);
  assert.equal(successClaims().length, 0);
});

await check('transfer: no automatic retry (one follower update, one attempt) and the in-flight guard is released', async () => {
  const s = install({ updateReturns: false, report: indeterminateReport });
  await attempt(s.follower, s.newOwner);
  assert.equal(s.calls.update, 1);
  const s2 = install({ updateReturns: true, report: { outcome: 'COMMITTED' } });
  const r2 = await attempt(s2.follower, s2.newOwner);
  assert.equal(r2.value, s2.follower, 'the guard did not stay set');
});

await check('transfer: a follower update that THROWS also stops the transfer before linking (no success claim)', async () => {
  const s = install({ throwsFromUpdate: new Error('update exploded') });
  const r = await attempt(s.follower, s.newOwner);
  assert.equal(s.calls.link, 0);
  assert.equal(successClaims().length, 0);
  assert.ok(r.error);
});

await check('transfer: successful behaviour is unchanged (link runs once, success notice + log, follower returned)', async () => {
  const s = install({ updateReturns: true, report: { outcome: 'COMMITTED' } });
  const r = await attempt(s.follower, s.newOwner);
  assert.equal(r.error, undefined);
  assert.equal(r.value, s.follower);
  assert.equal(s.calls.update, 1);
  assert.equal(s.calls.link, 1);
  assert.equal(notes.info.filter((m) => /is now assigned/i.test(m)).length, 1);
  assert.equal(logs.filter((l) => /Reassigned follower/i.test(l.msg)).length, 1);
});

await check('transfer: a follower with no template/species skips the update and links, as before', async () => {
  const s = install({ updateReturns: true });
  s.follower.system.progression.followerTemplate = undefined; s.follower.flags.swse.follower.templateType = undefined;
  const r = await attempt(s.follower, s.newOwner);
  assert.equal(s.calls.update, 0);
  assert.equal(s.calls.link, 1);
  assert.equal(r.value, s.follower);
});

/* ---------------------------------------------------------------------------------------------- */
/* species repair                                                                                   */
/* ---------------------------------------------------------------------------------------------- */
function installRepair(outcomes) {
  logs.length = 0; notes.warn.length = 0; notes.error.length = 0;
  const calls = { update: [], optionsSeen: [] };
  const followers = outcomes.map((o, i) => ({ id: `rf${i}`, name: `Follower ${i}`, type: 'npc',
    system: { isFollower: true, race: 'Human', level: 2, npcProfile: { kind: 'follower', owner: { actorId: 'o1' } }, progression: { followerTemplate: 'aggressive', followerChoices: {} } },
    flags: { swse: { follower: { isFollower: true, ownerId: 'o1', templateType: 'aggressive' } } }, getFlag() { return undefined; } }));
  FollowerCreator.updateFollowerFromMutation = async (follower, mutation, options = {}) => {
    calls.update.push(follower.id); calls.optionsSeen.push(options);
    const o = outcomes[followers.indexOf(follower)];
    if (o.throws) throw o.throws;
    if (options?.report && o.report) Object.assign(options.report, o.report);
    return o.returns;
  };
  SpeciesRegistry.initialize = async () => {};
  globalThis.game = { ...(saved.game ?? {}), user: { isGM: true }, actors: Object.assign([...followers], { get: (id) => followers.find((a) => a.id === id) }) };
  return { calls, followers };
}

await check('repair: a failed repair is distinguishable from a successful one (per-follower diagnostics + summary counts)', async () => {
  assert.equal(typeof repairExistingFollowers, 'function', 'repairExistingFollowers is exported for testing');
  const s = installRepair([{ returns: true, report: { outcome: 'COMMITTED' } }, { returns: false, report: compensatedReport }, { returns: false, report: indeterminateReport }]);
  await repairExistingFollowers();
  assert.deepEqual(s.calls.update, ['rf0', 'rf1', 'rf2'], 'every follower is attempted exactly once (no retry)');
  const errs = logs.filter((l) => l.level === 'error' || l.level === 'warn');
  assert.ok(errs.some((l) => /Follower 1|rf1/.test(JSON.stringify(l.data) + l.msg) && /FAILED_COMPENSATED/.test(JSON.stringify(l.data) + l.msg)), 'follower 1 reported as a failed (compensated) repair');
  assert.ok(errs.some((l) => /Follower 2|rf2/.test(JSON.stringify(l.data) + l.msg) && /INDETERMINATE/.test(JSON.stringify(l.data) + l.msg)), 'follower 2 reported as indeterminate');
  assert.ok(!errs.some((l) => /Follower 0|rf0/.test(JSON.stringify(l.data) + l.msg)), 'the successful repair raises no failure diagnostic');
  const summary = logs.find((l) => /repair pass complete/i.test(l.msg));
  assert.ok(summary, 'summary logged');
  assert.equal(summary.data.repaired, 1);
  assert.equal(summary.data.failed, 2);
  assert.equal(summary.data.indeterminate, 1);
  assert.ok(notes.warn.length >= 1, 'the GM is warned about the indeterminate follower');
  assert.ok(s.calls.optionsSeen.every((o) => o && typeof o.report === 'object'), 'the report is requested');
});

await check('repair: a follower update that throws is reported as failed and does not stop or repeat the pass', async () => {
  const s = installRepair([{ throws: new Error('boom') }, { returns: true, report: { outcome: 'COMMITTED' } }]);
  await repairExistingFollowers();
  assert.deepEqual(s.calls.update, ['rf0', 'rf1']);
  const summary = logs.find((l) => /repair pass complete/i.test(l.msg));
  assert.equal(summary.data.repaired, 1);
  assert.equal(summary.data.failed, 1);
});

await check('repair: all-successful pass is unchanged (no failure diagnostics, no GM warning)', async () => {
  const s = installRepair([{ returns: true, report: { outcome: 'COMMITTED' } }, { returns: true, report: { outcome: 'COMMITTED' } }]);
  await repairExistingFollowers();
  assert.equal(logs.filter((l) => l.level === 'error').length, 0);
  assert.equal(notes.warn.length, 0);
  const summary = logs.find((l) => /repair pass complete/i.test(l.msg));
  assert.equal(summary.data.repaired, 2);
  assert.equal(summary.data.failed, 0);
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G11 caller outcomes: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
