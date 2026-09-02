import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8A: EXACTLY-ONCE HOLONET
// PUBLICATION / SOCKET SYNCHRONIZATION.
//
// Proves the real bugs found by independent review of the transport
// layer and their fixes:
//
//   D1. GM-direct HolonetEngine.publish() never broadcast a remote
//       record-published sync at all (skipSocket was checked only for
//       the non-GM relay gate, never forwarded into the GM-side path).
//   D2. HolonetSocketService's publish-record request handler manually
//       manufactured its OWN success sync after calling the engine,
//       instead of letting the engine's own (now-fixed) sync be the one
//       and only post-commit publication signal.
//   D3. HolonetEngine._persistRecord() awaited HolonetStorage
//       .saveRecord()'s boolean result but discarded it — a rejected
//       storage write could still be announced as a successful publish.
//   D5. HolonetIntelService.deliverAsBulletin() manually replicated the
//       engine's publish/persist/sync pipeline instead of using it,
//       producing a second independent record-published announcement.
//
// These are BUG FIXES to real transport defects, not additive design
// contracts — each fail-before proof is a real pre-fix failure.

registerFoundryPathLoader();

function makeFakeSocket() {
  let handler = null;
  const emitted = [];
  return {
    on: (_name, fn) => { handler = fn; },
    emit: (_name, payload) => { emitted.push(payload); },
    emitted,
    async deliver(payload) { if (handler) await handler(payload); }
  };
}

// The default foundry-shim's Hooks is a set of no-op stubs (documented as
// covering only the small surface prior test suites needed). This suite
// is the first to need REAL hook registration/dispatch, so it installs a
// minimal working implementation.
function makeFakeHooks() {
  const listeners = new Map();
  let nextId = 1;
  return {
    on(event, fn) {
      const id = nextId++;
      if (!listeners.has(event)) listeners.set(event, new Map());
      listeners.get(event).set(id, fn);
      return id;
    },
    off(event, idOrFn) {
      const map = listeners.get(event);
      if (!map) return;
      if (typeof idOrFn === 'number') { map.delete(idOrFn); return; }
      for (const [id, fn] of map) if (fn === idOrFn) map.delete(id);
    },
    once(event, fn) {
      const id = nextId++;
      if (!listeners.has(event)) listeners.set(event, new Map());
      const wrapped = (...args) => { listeners.get(event)?.delete(id); fn(...args); };
      listeners.get(event).set(id, wrapped);
      return id;
    },
    call(event, ...args) {
      const map = listeners.get(event);
      if (map) for (const fn of Array.from(map.values())) fn(...args);
      return true;
    },
    callAll(event, ...args) {
      const map = listeners.get(event);
      if (map) for (const fn of Array.from(map.values())) fn(...args);
      return true;
    }
  };
}

const socket = makeFakeSocket();
const hooks = makeFakeHooks();

function installShim({ isGM = true } = {}) {
  installFoundryShimGlobals({
    game: {
      user: { isGM, id: isGM ? 'gm1' : 'player1' },
      socket,
      settings: {
        get: () => [],
        set: () => Promise.resolve(),
        settings: { has: () => true },
        register: () => {}
      },
      actors: [],
      users: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
    Hooks: hooks
  });
  globalThis.foundry.utils.randomID = () => `evt-${Math.random().toString(36).slice(2, 10)}`;
}

installShim({ isGM: true });

const { HolonetSocketService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js');
HolonetSocketService.initialize();

const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
const { HolonetRecord } = await import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-record.js');
const { RECORD_TYPE, SOURCE_FAMILY } = await import('/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js');

function fixtureRecord(id) {
  return new HolonetRecord({
    id,
    type: RECORD_TYPE.EVENT,
    sourceFamily: SOURCE_FAMILY.BULLETIN,
    recipients: [],
    projections: [{ surfaceType: 'home_feed', recordId: id }]
  });
}

function countHooks(type) {
  const calls = [];
  const id = Hooks.on(type, (...args) => calls.push(args));
  return { calls, off: () => Hooks.off(type, id) };
}

// ============================================================
// M1 — GM direct publication broadcasts exactly once
// ============================================================
{
  installShim({ isGM: true });
  let saveCallCount = 0;
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => { saveCallCount++; return true; };

  const typed = countHooks('swseHolonet:recordPublished');
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;

  try {
    const record = fixtureRecord('m1-record');
    const ok = await HolonetEngine.publish(record, { skipSocket: false });
    assert.equal(ok, true, 'a successful GM direct publish must return true');
    assert.equal(saveCallCount, 1, 'HolonetStorage.saveRecord must be called exactly once');
    assert.equal(typed.calls.length, 1, 'the typed swseHolonet:recordPublished local hook must fire exactly once');
    assert.equal(legacy.calls.length, 1, 'the legacy swseHolonetUpdated local hook must fire exactly once');
    assert.equal(socket.emitted.length, 1, 'GM direct publish must broadcast exactly ONE remote record-published sync -- this is the primary Phase 8A bug: previously GM-direct publish never broadcast anything at all');
    const sent = socket.emitted[0];
    assert.equal(sent.kind, 'sync');
    assert.equal(sent.data.type, 'record-published');
    assert.equal(sent.data.recordId, 'm1-record');
    assert.ok(sent.data.publicationEventId, 'the sync envelope must carry a publicationEventId identifying this publication OCCURRENCE');
  } finally {
    typed.off(); legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M1 (GM direct publication exactly-once broadcast) passed.');

// ============================================================
// M2 — a storage failure must announce NOTHING
// ============================================================
{
  installShim({ isGM: true });
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => false;

  const typed = countHooks('swseHolonet:recordPublished');
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;

  try {
    const record = fixtureRecord('m2-record');
    const ok = await HolonetEngine.publish(record, { skipSocket: false });
    assert.equal(ok, false, 'publish() must report false when storage rejects the write');
    assert.equal(typed.calls.length, 0, 'a failed storage write must never fire the local recordPublished hook');
    assert.equal(legacy.calls.length, 0, 'a failed storage write must never fire the legacy swseHolonetUpdated hook');
    assert.equal(socket.emitted.length, 0, 'a failed storage write must never broadcast a remote record-published sync');
  } finally {
    typed.off(); legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M2 (storage failure announces nothing) passed.');

// ============================================================
// M3/M4 — exactly-once delivery: origin loopback + duplicate remote
// redelivery of the SAME publicationEventId must never double-dispatch.
// ============================================================
{
  installShim({ isGM: true });
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => true;

  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;

  try {
    const record = fixtureRecord('m3-record');
    await HolonetEngine.publish(record, { skipSocket: false });
    assert.equal(socket.emitted.length, 1);
    const sentPayload = socket.emitted[0];

    // Simulate the transport echoing the SAME sync back to this exact
    // client (origin loopback) -- must not redispatch.
    await socket.deliver(sentPayload);
    assert.equal(legacy.calls.length, 1, 'an echoed sync carrying the same publicationEventId this client already emitted must NOT redispatch local hooks a second time');

    // Simulate a duplicate remote redelivery of the exact same sync a
    // second time (e.g. a network-level retry) -- still must not
    // redispatch.
    await socket.deliver(sentPayload);
    assert.equal(legacy.calls.length, 1, 'a duplicate delivery of the same publicationEventId must never cause a second dispatch');
  } finally {
    legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M3/M4 (origin-loopback and duplicate-remote-delivery dedup) passed.');

// --- a REMOTE receiver that has genuinely never seen this event id
// dispatches it normally exactly once ---------------------------------
{
  installShim({ isGM: true });
  const legacy = countHooks('swseHolonetUpdated');
  try {
    const inboundPayload = { event: 'holonet', kind: 'sync', data: { type: 'record-published', publicationEventId: 'remote-event-1', recordId: 'remote-record-1', recipientIds: [] } };
    await socket.deliver(inboundPayload);
    assert.equal(legacy.calls.length, 1, 'a genuinely new remote publicationEventId must dispatch exactly once');
    await socket.deliver(inboundPayload);
    assert.equal(legacy.calls.length, 1, 'redelivering that same remote event id again must not dispatch a second time');
  } finally {
    legacy.off();
  }
}
console.log('Remote receiver dedup (first delivery dispatches once, redelivery is a no-op) passed.');

// ============================================================
// M5 — a legitimate republish of the SAME record is two DISTINCT
// occurrences, each dispatched once -- never deduped by recordId.
// ============================================================
{
  installShim({ isGM: true });
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => true;
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;
  try {
    const record = fixtureRecord('m5-record');
    await HolonetEngine.publish(record, { skipSocket: false });
    await HolonetEngine.publish(record, { skipSocket: false });
    assert.equal(socket.emitted.length, 2, 'republishing the same record twice must broadcast twice');
    const [first, second] = socket.emitted;
    assert.notEqual(first.data.publicationEventId, second.data.publicationEventId, 'each publication occurrence must carry a DISTINCT publicationEventId, never deduped by the shared recordId');
    assert.equal(first.data.recordId, second.data.recordId, 'sanity: both occurrences really do reference the same record');
    assert.equal(legacy.calls.length, 2, 'both legitimate occurrences must dispatch a local hook');
  } finally {
    legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M5 (legitimate republish is two distinct occurrences, never recordId-deduped) passed.');

// ============================================================
// M6 — player-originated publish request: GM persistence once,
// post-commit sync once, requestId/requesterId preserved, no extra
// manual SocketService publication sync.
// ============================================================
{
  installShim({ isGM: true }); // this simulated process is the GM relay target
  let saveCallCount = 0;
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => { saveCallCount++; return true; };
  socket.emitted.length = 0;

  try {
    const record = fixtureRecord('m6-record');
    await socket.deliver({
      event: 'holonet', kind: 'request', action: 'publish-record',
      data: { record: record.toJSON(), requestId: 'req-42' },
      requesterId: 'player-7', requestId: 'req-42'
    });
    assert.equal(saveCallCount, 1, 'the GM-authoritative persistence path must run exactly once for a player-originated request');
    assert.equal(socket.emitted.length, 1, 'exactly one post-commit sync must be broadcast -- never a second manual one from the socket handler');
    const sent = socket.emitted[0].data;
    assert.equal(sent.type, 'record-published');
    assert.equal(sent.requestId, 'req-42', 'the correlating requestId must survive into the broadcast envelope');
    assert.equal(sent.requesterId, 'player-7', 'the requesterId must survive into the broadcast envelope');
  } finally {
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M6 (player-originated publish request: single GM persistence, single correlated sync) passed.');

// ============================================================
// M7 — suppressLocalHook:true still broadcasts remote sync
// ============================================================
{
  installShim({ isGM: true });
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => true;
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;
  try {
    const record = fixtureRecord('m7-record');
    const ok = await HolonetEngine.publish(record, { skipSocket: false, suppressLocalHook: true });
    assert.equal(ok, true);
    assert.equal(legacy.calls.length, 0, 'suppressLocalHook:true must suppress the authoritative local hook');
    assert.equal(socket.emitted.length, 1, 'suppressLocalHook:true must NOT suppress the remote sync -- these are independent concerns');
  } finally {
    legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M7 (suppressLocalHook suppresses only the local hook, not remote sync) passed.');

// ============================================================
// M8 — skipSocket:true on a GM-direct publish never broadcasts, even
// though the local hook still fires (pinning the flag's real semantics
// after Phase 8A gave it a second meaning on the GM-side path).
// ============================================================
{
  installShim({ isGM: true });
  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => true;
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;
  try {
    const record = fixtureRecord('m8-record');
    const ok = await HolonetEngine.publish(record, { skipSocket: true });
    assert.equal(ok, true);
    assert.equal(legacy.calls.length, 1, 'skipSocket:true must still fire the local hook');
    assert.equal(socket.emitted.length, 0, 'skipSocket:true must never broadcast a remote sync');
  } finally {
    legacy.off();
    HolonetStorage.saveRecord = originalSaveRecord;
  }
}
console.log('M8 (skipSocket:true never broadcasts, local hook still fires) passed.');

// --- Messenger's bare emitPreparedRecordPublished(message) call (no
// options) must remain completely unaffected -- it must still never
// broadcast a remote sync, matching its pre-Phase-8A behavior exactly.
{
  installShim({ isGM: true });
  const legacy = countHooks('swseHolonetUpdated');
  socket.emitted.length = 0;
  try {
    const message = fixtureRecord('messenger-bare-call');
    const publicationEventId = HolonetEngine.emitPreparedRecordPublished(message);
    assert.ok(publicationEventId, 'emitPreparedRecordPublished must still return a real id');
    assert.equal(legacy.calls.length, 1, 'the bare call (Messenger\'s exact call shape) must still fire the local hook');
    assert.equal(socket.emitted.length, 0, 'the bare call (no options) must default to skipSocket:true, matching Messenger\'s pre-existing behavior exactly -- Phase 8A must not turn this into a duplicate remote-sync source for threaded messages');
  } finally {
    legacy.off();
  }
}
console.log('Messenger bare emitPreparedRecordPublished() call remains unaffected (skipSocket defaults true) passed.');

// ============================================================
// M9/M10 — Intel->Bulletin transport migration + publication-signal
// inventory (static source proof; HolonetIntelService's full dependency
// stack is impractical to stand up in this harness for an executed
// integration test -- this matches the established codebase pattern for
// hard-to-instantiate paths).
// ============================================================
{
  const root = new URL('../', import.meta.url);
  const read = (rel) => readFile(new URL(rel, root), 'utf8');
  const intelSource = await read('scripts/holonet/subsystems/holonet-intel-service.js');
  const socketServiceSource = await read('scripts/holonet/subsystems/holonet-socket-service.js');
  const engineSource = await read('scripts/holonet/holonet-engine.js');

  // D5: deliverAsBulletin() no longer manually manufactures its own
  // record-published sync -- it routes through the central pipeline.
  const deliverAsBulletinBody = intelSource.slice(intelSource.indexOf('static async deliverAsBulletin'), intelSource.indexOf('static async releaseToDossier'));
  assert.doesNotMatch(deliverAsBulletinBody, /HolonetSocketService\.emitSync\(\{\s*type:\s*'record-published'/, 'deliverAsBulletin() must no longer manually emit its own record-published sync -- D5');
  assert.match(deliverAsBulletinBody, /HolonetEngine\.prepareRecordForPublish\(bulletin\)/, 'deliverAsBulletin() must route publish-lifecycle/recipients/projections through the central HolonetEngine pipeline');
  assert.match(deliverAsBulletinBody, /HolonetEngine\.emitPreparedRecordPublished\(bulletin,/, 'deliverAsBulletin() must let the central pipeline own the post-commit publication event');
  assert.match(deliverAsBulletinBody, /if \(!saved\) return null;/, 'deliverAsBulletin() must still fail safe (return null) if the storage write does not succeed');
  // Explicitly unchanged this pass, per the Phase 8A scope boundary:
  assert.match(intelSource, /sourceIntelId: intel\.id,\s*\n\s*intelDelivery: true,\s*\n\s*\[INTEL_METADATA_KEY\]: intel/, 'the full Intel metadata copy and sourceIntelId/intelDelivery fields must remain byte-for-byte unchanged in Phase 8A -- that content audit is Phase 8B, not this pass');

  // D2: the socket service's publish-record handler no longer manually
  // re-emits its own success sync after calling the engine.
  const publishRecordCaseBody = socketServiceSource.slice(socketServiceSource.indexOf("case 'publish-record'"), socketServiceSource.indexOf("case 'mark-read'"));
  assert.doesNotMatch(publishRecordCaseBody, /this\.emitSync\(\{\s*type:\s*'record-published'/, 'the publish-record socket handler must no longer manually emit its own record-published sync -- D2');
  assert.match(publishRecordCaseBody, /HolonetEngine\.publish\(record, \{ skipSocket: false/, 'the publish-record socket handler must let HolonetEngine.publish() own the post-commit sync');

  // M10: inventory every literal producer of type:'record-published' —
  // it must be exactly the one call site inside HolonetEngine
  // (via HolonetBus.sync), nothing else in the Holonet subtree.
  const holonetDir = new URL('scripts/holonet/', root);
  async function collectRecordPublishedProducers(dirUrl) {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(dirUrl, { withFileTypes: true });
    const hits = [];
    for (const entry of entries) {
      const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl);
      if (entry.isDirectory()) {
        hits.push(...await collectRecordPublishedProducers(entryUrl));
      } else if (entry.name.endsWith('.js')) {
        const text = await readFile(entryUrl, 'utf8');
        const matches = [...text.matchAll(/(emitSync\(\{[^}]*type:\s*'record-published'|HolonetBus\.sync\('record-published')/g)];
        if (matches.length) hits.push({ file: entryUrl.pathname, count: matches.length });
      }
    }
    return hits;
  }
  const producers = await collectRecordPublishedProducers(holonetDir);
  assert.equal(producers.length, 1, `exactly one file may literally produce a record-published sync; found: ${JSON.stringify(producers)}`);
  assert.ok(producers[0].file.endsWith('holonet-engine.js'), 'the sole record-published producer must be HolonetEngine itself (via HolonetBus.sync), not a domain service reimplementing the transport');
  assert.match(engineSource, /HolonetBus\.sync\('record-published'/, 'sanity: HolonetEngine really is the one producer found above');
}
console.log('M9/M10 (Intel->Bulletin transport migration + publication-signal inventory) passed.');

console.log('PHASE 8A exactly-once Holonet publication/socket synchronization suite passed.');
