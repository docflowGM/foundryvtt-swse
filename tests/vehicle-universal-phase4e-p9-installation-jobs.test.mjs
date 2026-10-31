import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import * as J from '../scripts/domain/vehicles/vehicle-installation-jobs.js';

installSystemsResolver(); installFoundryStubs();
const { VehicleInstallationService: S } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('../scripts/engine/progression/utils/snapshot-manager.js');

const actors = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const rules = { resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveUninstallRefund: () => null, allowEpShortfall: false, resolveNonstandard: () => ({ nonstandard: false, basis: 'FIXTURE' }) };
const row = (over = {}) => ({ id: 'fx', name: 'Fixture Plating', category: 'Defense', emplacementPoints: 2, cost: 1000, costType: 'flat',
  availability: 'Licensed', sizeRestriction: null, certification: { status: 'MECHANIC_SPECIFIED', book: 'B', page: 1 }, ...over });
const catalog = new Map([['fx', row()], ['fx2', row({ id: 'fx2' })], ['fx3', row({ id: 'fx3' })]]);

let src, vehicle, owner, log;
function world({ gm = false, credits = 10000, failAsset = false } = {}) {
  src = structuredClone(actors.find(a => a.system.vehicleSourceEntryKey === XW));
  src.system.ownedByActorId = 'owner1';
  vehicle = { ...src, id: 'veh1', name: 'Red Five', isOwner: true, toObject() { return structuredClone(src); } };
  owner = { id: 'owner1', name: 'Wedge', isOwner: true, system: { credits }, flags: {}, toObject() { return { system: this.system }; }, getFlag: () => [] };
  globalThis.game = { user: { id: gm ? 'gm1' : 'u1', isGM: gm }, actors: { get: id => ({ owner1: owner, veh1: vehicle })[id], contents: [] }, users: new Map() };
  log = { applied: [], restores: 0 };
  ActorEngine.applyMutationPlan = async (actor, plan) => {
    if (actor.id === 'veh1' && failAsset) throw new Error('asset write failed');
    if (actor.id === 'veh1') for (const [k, v] of Object.entries(plan.set ?? {})) {
      const m = /^flags\.swse\.(.+)$/.exec(k); if (m) src.flags.swse[m[1]] = structuredClone(v);
    }
    if (plan.set?.['system.credits'] !== undefined) actor.system.credits = plan.set['system.credits'];
    log.applied.push(actor.id);
  };
  const snaps = new Map();
  SnapshotManager.createSnapshot = async actor => { const t = snaps.size + 1; snaps.set(`${actor.id}:${t}`, { credits: actor.system?.credits, flags: structuredClone(src.flags) }); return { timestamp: t }; };
  SnapshotManager.restoreSnapshot = async (actor, ts) => { log.restores++; const s = snaps.get(`${actor.id}:${ts}`); if (s && actor.id === 'owner1') actor.system.credits = s.credits; if (s && actor.id === 'veh1') src.flags = s.flags; return true; };
  S.rules = rules;
}
const installer = { system: { skills: { mechanics: { total: 5 } } } };
const rollTo = (job, total) => () => total - 5 - (job.attempts.at(-1).bonus ?? 0);
const jobs = () => J.readJobs(src.flags, XW).jobs;
const ledger = () => L.readCertifiedInstallations(src.flags, XW).entries;
const asGM = gm => { globalThis.game.user.isGM = gm; globalThis.game.user.id = gm ? 'gm1' : 'u1'; };

test('start: first attempt charged once, EP reserved (not installed), nothing in the ledger', async () => {
  world();
  const r = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.equal(owner.system.credits, 9000);
  assert.equal(ledger().length, 0);
  assert.equal(jobs().length, 1);
  assert.equal(J.reservedEpFromJobs(jobs()), 2);
  const d = J.describeJob(jobs()[0]);
  assert.equal(d.status, 'AWAITING_CHECK'); assert.equal(d.creditsPaid, 1000); assert.equal(d.dc, 22); assert.equal(d.epReserved, 2);
});

test('reserved EP protects against conflicting purchases', async () => {
  world();
  assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog })).success, true);
  assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx2', catalog })).success, true);
  const third = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx3', catalog });
  assert.equal(third.success, false);
  assert.ok(third.reasons.includes('EP_EXCEEDED'), third.reasons.join());
  assert.equal(owner.system.credits, 8000, 'the refused attempt is not charged');
});

test('the check needs the logged work time unless a GM records it; players never type a total', async () => {
  world();
  await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  const job = jobs()[0];
  const early = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, installerActor: installer, roller: rollTo(job, 99) });
  assert.deepEqual(early.reasons, ['WORK_TIME_INCOMPLETE']);
  const forged = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, total: 99, installerActor: installer, roller: rollTo(job, 1) });
  assert.deepEqual(forged.reasons, ['WORK_TIME_INCOMPLETE'], 'a non-GM total is ignored; the service rolls');
  assert.deepEqual((await S.logWorkDays({ ownerActor: owner, vehicle, jobId: job.jobId, days: 1 })).reasons, ['GM_REQUIRED']);
  asGM(true);
  const days = J.describeJob(jobs()[0]).daysRequired;
  assert.equal((await S.logWorkDays({ ownerActor: owner, vehicle, jobId: job.jobId, days })).success, true);
  assert.equal(J.describeJob(jobs()[0]).remainingDays, 0);
});

async function logAll(jobId) { asGM(true); await S.logWorkDays({ ownerActor: owner, vehicle, jobId, days: J.describeJob(jobs().find(j => j.jobId === jobId)).remainingDays || 0.0001 }); asGM(false); }

test('success: a certified ledger entry is created only now; credits unchanged by the check', async () => {
  world();
  await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  const job = jobs()[0]; await logAll(job.jobId);
  const r = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, installerActor: installer, roller: rollTo(job, 25) });
  assert.equal(r.outcome, 'SUCCESS');
  assert.equal(owner.system.credits, 9000);
  assert.equal(ledger().length, 1);
  assert.equal(ledger()[0].completion.mode, 'MECHANICS_CHECK');
  assert.equal(ledger()[0].executable, false);
  assert.equal(jobs()[0].status, 'COMPLETE');
  assert.equal(J.reservedEpFromJobs(jobs()), 0);
});

test('partial failure keeps the money; retry costs half and gives +5; a later success installs', async () => {
  world();
  await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  const job = jobs()[0]; await logAll(job.jobId);
  const r = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, installerActor: installer, roller: rollTo(job, 15) });
  assert.equal(r.outcome, 'PARTIAL_FAILURE');
  assert.equal(owner.system.credits, 9000, 'no refund');
  assert.equal(ledger().length, 0);
  assert.equal(J.reservedEpFromJobs(jobs()), 2, 'EP stays reserved while a retry is possible');
  const retry = await S.retryJob({ ownerActor: owner, vehicle, jobId: job.jobId });
  assert.equal(retry.success, true);
  assert.equal(owner.system.credits, 8500);
  const j2 = jobs()[0];
  assert.equal(j2.attempts.at(-1).bonus, 5);
  await logAll(job.jobId);
  const ok = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, installerActor: installer, roller: () => 17 }); // 17 + 5 skill + 5 retry = 27
  assert.equal(ok.outcome, 'SUCCESS');
  assert.equal(ledger().length, 1);
});

test('total failure wastes everything; reservation released; restart is a new, fully charged job', async () => {
  world();
  await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  const job = jobs()[0]; await logAll(job.jobId);
  const r = await S.recordCheck({ ownerActor: owner, vehicle, jobId: job.jobId, installerActor: installer, roller: rollTo(job, 5) });
  assert.equal(r.outcome, 'TOTAL_FAILURE');
  assert.equal(owner.system.credits, 9000);
  assert.equal(ledger().length, 0);
  assert.equal(J.reservedEpFromJobs(jobs()), 0);
  assert.deepEqual(J.describeJob(jobs()[0]).wasted, { credits: 1000, days: J.describeJob(jobs()[0]).daysSpent });
  assert.deepEqual((await S.retryJob({ ownerActor: owner, vehicle, jobId: job.jobId })).reasons, ['JOB_NOT_IN_PARTIAL_FAILURE']);
  assert.equal((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog })).success, true);
  assert.equal(owner.system.credits, 8000);
});

test('GM overrides: need real GM authority and a reason; cost, EP and certification still apply', async () => {
  world();
  assert.deepEqual((await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'fx', catalog, reason: 'x' })).reasons, ['GM_REQUIRED']);
  asGM(true);
  assert.ok((await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'fx', catalog, reason: '  ' })).reasons.includes('GM_OVERRIDE_REASON_REQUIRED'));
  const r = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'fx', catalog, reason: 'downtime handled at the table' });
  assert.equal(r.success, true);
  assert.equal(owner.system.credits, 9000, 'full cost still charged');
  assert.equal(ledger()[0].completion.mode, 'GM_ADJUDICATED');
  assert.equal(ledger()[0].completion.reason, 'downtime handled at the table');
  assert.equal(ledger()[0].completion.userId, 'gm1');
  assert.equal(ledger()[0].executable, false, 'a GM override never authorizes a weapon');
  // EP still enforced for the override
  const ok2 = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'fx2', catalog, reason: 'again' });
  assert.equal(ok2.success, true);
  const over = await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'fx3', catalog, reason: 'third' });
  assert.ok(over.reasons.includes('EP_EXCEEDED'));
  // uncertified rows stay denied, GM or not
  const unc = new Map([['u', row({ id: 'u', certification: { status: 'SOURCE_VERIFIED', book: 'B', page: 1 } })]]);
  assert.ok((await S.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'u', catalog: unc, reason: 'r' })).reasons.includes('MODIFICATION_EFFECT_NOT_IMPLEMENTED'));
});

test('GM can adjudicate an existing job as completed, recorded with a reason, without a second charge', async () => {
  world();
  await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  const id = jobs()[0].jobId;
  assert.deepEqual((await S.gmCompleteJob({ ownerActor: owner, vehicle, jobId: id, reason: 'r' })).reasons, ['GM_REQUIRED']);
  asGM(true);
  assert.ok((await S.gmCompleteJob({ ownerActor: owner, vehicle, jobId: id, reason: '' })).reasons.includes('GM_OVERRIDE_REASON_REQUIRED'));
  assert.equal((await S.gmCompleteJob({ ownerActor: owner, vehicle, jobId: id, reason: 'offscreen work' })).success, true);
  assert.equal(owner.system.credits, 9000);
  assert.equal(ledger()[0].completion.mode, 'GM_ADJUDICATED');
  assert.equal(jobs()[0].completion.mode, 'GM_ADJUDICATED');
});

test('a database failure rolls back: no charge, no job', async () => {
  world({ failAsset: true });
  const r = await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog });
  assert.equal(r.success, false);
  assert.equal(owner.system.credits, 10000);
  assert.equal(jobs().length, 0);
  assert.ok(log.restores > 0);
});

test('ownership, tampering and concurrency', async () => {
  world();
  src.system.ownedByActorId = 'someone-else';
  assert.deepEqual((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog })).reasons, ['OWNER_VEHICLE_NOT_ASSOCIATED']);
  world();
  const [a, b] = await Promise.all([S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx', catalog }), S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx2', catalog })]);
  assert.equal([a, b].filter(r => r.success).length, 1);
  assert.ok([a, b].some(r => r.reasons?.includes('INSTALLATION_IN_PROGRESS')));
  // tamper with a stored job: new work is refused
  src.flags.swse.vehicleInstallationJobs[0].creditsSpent = 1;
  assert.ok((await S.startJob({ ownerActor: owner, vehicle, catalogId: 'fx3', catalog })).reasons.includes('STORE_CONTAINS_UNVERIFIED_ENTRIES'));
  assert.equal(J.readJobs(src.flags, XW).rejected, 1);
});

test('the jobs store is write-guarded like the ledger', () => {
  const p = 'flags.swse.vehicleInstallationJobs';
  assert.equal(L.isLedgerUpdateAllowed('a1', { [p]: [] }), false);
  assert.equal(L.isLedgerUpdateAllowed('a1', { flags: { swse: { vehicleInstallationJobs: [] } } }), false);
  assert.equal(L.isLedgerUpdateAllowed('a1', { 'flags.swse.-=vehicleInstallationJobs': null }), false);
  L.authorizeFlagWrite('a1', 'vehicleInstallationJobs', []);
  assert.equal(L.isLedgerUpdateAllowed('a1', { [p]: [] }), true);
  L.clearLedgerWrite('a1');
  assert.equal(L.isLedgerUpdateAllowed('a1', { [p]: [] }), false);
  assert.equal(L.isLedgerUpdateAllowed('a1', { name: 'x' }), true);
});
