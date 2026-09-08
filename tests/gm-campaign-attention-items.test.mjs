import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 6: proves GMCampaignContextService
// .attentionItems() aggregates real actionable items — at minimum Job,
// Trade, Approval, Actor/recovery, Location (Phase 6AL) — each carrying
// stable target identity a caller can hand straight to
// GMCampaignTargetService.resolve()/GMDatapad.navigateToSurface().
//
// PURE ADDITIVE DESIGN CONTRACT — attentionItems() did not exist before
// this phase.

registerFoundryPathLoader();

const FLAG_SCOPE = 'foundryvtt-swse';
const PARTY_FLAG = 'gmPartyMember';
const ATLAS_FLAG = 'atlasLocationState';

function fakeActor({ id, name, type = 'character', hp = 10, hpMax = 10, isDroid = false, droidSystems = null, leadDiscoveries = [] }) {
  const flags = { [PARTY_FLAG]: true, [ATLAS_FLAG]: { leadDiscoveries } };
  return {
    id, name, type,
    system: { hp: { value: hp, max: hpMax }, isDroid, droidSystems },
    getFlag: (_scope, key) => flags[key],
    setFlag: async (_scope, key, value) => { flags[key] = value; return value; },
    isOwner: true
  };
}

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [] } = {}) {
  const stores = new Map([
    ['gmLocationRegistry', locations],
    ['gmFactionRegistry', factions],
    ['holonet_threads', threads],
    ['holonet_records', records],
    ['pendingCustomPurchases', []]
  ]);
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_module, key) => stores.get(key),
        set: (_module, key, value) => { stores.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: makeActorsCollection(actors),
      users: makeActorsCollection([]),
      scenes: new Map(),
      combat: null
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const LOCATION = { id: 'tatooine', name: 'Tatooine' };

const JOB_REVIEW_THREAD = {
  id: 'job-review-1', title: 'Rescue the Senator',
  metadata: { threadType: 'job', job: { title: 'Rescue the Senator', status: 'inProgress', objectives: [{ id: 'o1', status: 'submitted' }] } }
};
const JOB_PAYOUT_THREAD = {
  id: 'job-payout-1', title: 'Smuggler\'s Run',
  metadata: { threadType: 'job', job: { title: 'Smuggler\'s Run', status: 'complete', objectives: [] } }
};
const FAILED_TRADE_RECORD = {
  id: 'trade-record-1', threadId: 'trade-thread-1', state: 'active',
  metadata: { creditTransfer: { status: 'failed', amount: 500, fromActorId: 'han', toActorId: 'lando', failureReason: 'Ledger mismatch' } }
};
// CORRECTION 1: attentionItems() now reuses GMCombatRecoveryService's real
// needsAttention legality (wounded/downed/CT/etc.), not GMHealingTrigger
// eligibility — so this fixture must be genuinely wounded (hp below max),
// not merely "alive," to produce a recovery attention item.
const WOUNDED_ACTOR = fakeActor({ id: 'chewie', name: 'Chewbacca', hp: 8, hpMax: 12 });
const DROID_ACTOR = { id: 'r2d2', name: 'R2-D2', system: { droidSystems: { stateMode: 'PENDING' } }, getFlag: () => undefined };

// --- attentionItems() surfaces at least one of each required domain -------
{
  installShim({
    locations: [LOCATION],
    threads: [JOB_REVIEW_THREAD, JOB_PAYOUT_THREAD],
    records: [FAILED_TRADE_RECORD],
    actors: [WOUNDED_ACTOR, DROID_ACTOR]
  });
  const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
  const items = await GMCampaignContextService.attentionItems();

  const jobReview = items.find(item => item.kind === 'job-review');
  assert.ok(jobReview, 'a Job with a submitted objective must produce a job-review attention item');
  assert.deepEqual(jobReview.target, { kind: 'job', id: 'job-review-1' });

  const jobPayout = items.find(item => item.kind === 'job-payout');
  assert.ok(jobPayout, 'a complete Job must produce a job-payout attention item');
  assert.deepEqual(jobPayout.target, { kind: 'job', id: 'job-payout-1' });

  const tradeFailed = items.find(item => item.kind === 'trade-failed');
  assert.ok(tradeFailed, 'a failed credit transfer must produce a trade-failed attention item');
  assert.deepEqual(tradeFailed.target, { kind: 'trade', id: 'trade-record-1' });
  assert.equal(tradeFailed.severity, 'critical');

  const droidApproval = items.find(item => item.id === 'approval:droid:r2d2');
  assert.ok(droidApproval, 'a PENDING droid must produce an approval attention item');
  assert.deepEqual(droidApproval.target, { kind: 'approval', id: 'droid:r2d2' });

  const recovery = items.find(item => item.kind === 'recovery' && item.target?.id === 'chewie');
  assert.ok(recovery, 'a healing-eligible party actor must produce a recovery attention item');
  // Phase 7 addendum H: recovery is the one Home attention item that
  // migrates from the generic {kind:'actor'} (open-the-sheet) target to
  // {kind:'workspace-actor'} (select this Actor in Workspace's Recovery
  // operations card). No other attention item's target kind changes.
  assert.equal(recovery.target.kind, 'workspace-actor');

  // Ordering: critical items must sort before warning/info items.
  const severities = items.map(item => item.severity);
  const firstWarnIdx = severities.indexOf('warning');
  const lastCritIdx = severities.lastIndexOf('critical');
  if (firstWarnIdx !== -1 && lastCritIdx !== -1) {
    assert.ok(lastCritIdx < firstWarnIdx, 'critical items must be sorted before warning items');
  }
}

// --- an empty campaign produces an empty, non-throwing queue --------------
{
  installShim({});
  const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
  const items = await GMCampaignContextService.attentionItems();
  assert.deepEqual(items, []);
}

// --- CORRECTION 11: a real per-domain failure must be logged via the
// existing SWSELogger, not silently swallowed — while a domain that
// legitimately has nothing to report must never log a spurious warning.
{
  installShim({ locations: [LOCATION], threads: [JOB_REVIEW_THREAD] });
  const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
  const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');

  const warnCalls = [];
  const originalWarn = SWSELogger.warn;
  SWSELogger.warn = (...args) => warnCalls.push(args);
  const originalGetAllThreads = HolonetStorage.getAllThreads;
  HolonetStorage.getAllThreads = async () => { throw new Error('simulated Job Board authority failure'); };

  try {
    const items = await GMCampaignContextService.attentionItems();
    assert.ok(warnCalls.some(args => String(args[0] || '').includes('Job Board')), 'a genuine caught exception in the Job Board domain must be logged via SWSELogger.warn, not silently swallowed');
    // The rest of the queue must still be usable — one domain failing must
    // never crash attentionItems() as a whole (Phase 6AQ).
    assert.ok(Array.isArray(items));
  } finally {
    HolonetStorage.getAllThreads = originalGetAllThreads;
    SWSELogger.warn = originalWarn;
  }
}

{
  // A domain with legitimately nothing to report (no failed trades, no
  // pending approvals, etc.) must never log a spurious warning — logging
  // is reserved for actual caught exceptions.
  installShim({});
  const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
  const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
  const warnCalls = [];
  const originalWarn = SWSELogger.warn;
  SWSELogger.warn = (...args) => warnCalls.push(args);
  try {
    await GMCampaignContextService.attentionItems();
    assert.deepEqual(warnCalls, [], 'an empty-but-healthy campaign must never log a warning — only a genuine caught exception should');
  } finally {
    SWSELogger.warn = originalWarn;
  }
}

console.log('GMCampaignContextService.attentionItems() passed (Job review/payout, Trade failure, Approval, Recovery all produce real target identity; empty campaign yields an empty queue; critical items sort first; a real per-domain failure is logged via SWSELogger.warn and never crashes the whole queue; a healthy empty campaign never logs spuriously).');
