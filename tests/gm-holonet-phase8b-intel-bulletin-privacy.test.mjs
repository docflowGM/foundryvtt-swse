import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8B: INTEL -> BULLETIN PRIVATE-DATA /
// PROVENANCE AUDIT.
//
// Prior to this pass, HolonetIntelService.deliverAsBulletin() copied the
// ENTIRE Intel metadata object (gmNotes, fullBody, skillGate, lockbox,
// linked* ids, etc.) onto the newly-created Bulletin record under
// metadata.intel. Every Holonet record lives in one world-scope Foundry
// setting (holonet_records) that is synced in full to every connected
// client, GM and player alike, regardless of what the UI renders -- so
// that copy was reachable by any player client (e.g.
// game.settings.get('foundryvtt-swse','holonet_records') in a browser
// console) the moment a GM published Intel as a Bulletin, independent of
// whether any template ever displayed it.
//
// The Phase 8B authority audit (docs/audits/gm-datapad-ecosystem-redesign.md)
// traced every production reader of Bulletin metadata (GMBulletinSurfaceService,
// gm-datapad.js's _buildBulletinRecordView, HomeSurfaceService, ShellHost's
// action-data helpers, holonet-chat-card.js, holonet-delivery-router.js,
// holonet-projection-router.js) and found NO consumer anywhere that ever
// read metadata.intel back off a Bulletin record. deliverAsSecretNote(),
// the sibling delivery mode in this same file, already used the correct
// minimal pattern (sourceIntelId only, never a full Intel snapshot).
//
// This is a REAL BUG FIX (private-data leak), not an additive design
// contract -- B1's fail-before proof below is a genuine pre-fix failure.

registerFoundryPathLoader();

function makeFakeSocket() {
  const emitted = [];
  return {
    on: () => {},
    emit: (_name, payload) => { emitted.push(payload); },
    emitted
  };
}

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

function installShim() {
  const stores = new Map([
    ['holonet_records', []],
    ['holonet_threads', []]
  ]);
  const hooks = makeFakeHooks();
  const socket = makeFakeSocket();
  installFoundryShimGlobals({
    game: {
      user: { isGM: true, id: 'gm1' },
      socket,
      settings: {
        get: (_module, key) => stores.get(key) ?? [],
        set: (_module, key, value) => { stores.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: [],
      users: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
    Hooks: hooks
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
  return { stores, hooks, socket };
}

const SENTINEL_GM_NOTES = 'GM_ONLY_DO_NOT_EXPOSE_8B';
const SENTINEL_FULL_BODY = 'UNRELEASED_INTEL_BODY_8B';
const SENTINEL_LOCKBOX = 'LOCKBOX_SECRET_8B';
const SENTINEL_SKILL_GATE = 'SKILL_GATE_SECRET_8B';
const PUBLIC_BODY = 'The public briefing: nothing sensitive here.';

async function createSentinelIntel(HolonetIntelService) {
  return HolonetIntelService.createIntelDraft({
    title: 'Sentinel Intel',
    summary: 'Sentinel summary',
    publicBody: PUBLIC_BODY,
    fullBody: SENTINEL_FULL_BODY,
    gmNotes: SENTINEL_GM_NOTES,
    skillGate: { enabled: true, skill: SENTINEL_SKILL_GATE, dc: 20 },
    lockbox: { enabled: true, label: SENTINEL_LOCKBOX, credits: 500 },
    linkedFactionId: 'faction-8b',
    linkedContactId: 'contact-8b',
    linkedJobThreadId: 'job-8b',
    linkedActorUuid: 'Actor.actor-8b',
    linkedSceneUuid: 'Scene.scene-8b'
  });
}

function findRawRecord(stores, recordId) {
  return (stores.get('holonet_records') ?? []).find(r => r.id === recordId);
}

// --- B1/B3/B4/B5 + fail-before proof: the persisted Bulletin must carry
// only player-safe body + minimal provenance, never the private Intel
// snapshot. ---------------------------------------------------------------
{
  const { stores } = installShim();
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const draft = await createSentinelIntel(HolonetIntelService);
  assert.ok(draft, 'sentinel Intel draft must be created');

  const result = await HolonetIntelService.deliverAsBulletin(draft.id, {});
  assert.ok(result?.ok, 'deliverAsBulletin() must report success for a valid GM-authored Intel record');

  const bulletinRaw = findRawRecord(stores, result.result.recordId);
  assert.ok(bulletinRaw, 'the Bulletin record must actually be persisted to storage');
  const serialized = JSON.stringify(bulletinRaw);

  // B5: minimal provenance survives.
  assert.equal(bulletinRaw.metadata?.sourceIntelId, draft.metadata.intel.id, 'sourceIntelId provenance must be present on the persisted Bulletin');
  assert.equal(bulletinRaw.metadata?.intelDelivery, true, 'intelDelivery workflow marker must be present on the persisted Bulletin');

  // B2: the player-safe body is what actually got persisted as record.body.
  assert.equal(bulletinRaw.body, PUBLIC_BODY, 'the persisted Bulletin body must be the player-safe publicBody, not the private fullBody');

  // B1/B3/B4: no private Intel snapshot, and none of its private fields,
  // anywhere in the actual PERSISTED object -- not just the rendered HTML.
  assert.equal(bulletinRaw.metadata?.intel, undefined, 'the full Intel metadata snapshot must not be persisted onto a new Bulletin record');
  assert.ok(!serialized.includes(SENTINEL_GM_NOTES), 'gmNotes must never reach the persisted Bulletin record');
  assert.ok(!serialized.includes(SENTINEL_FULL_BODY), 'the private fullBody must never reach the persisted Bulletin record');
  assert.ok(!serialized.includes(SENTINEL_LOCKBOX), 'lockbox secrets must never reach the persisted Bulletin record');
  assert.ok(!serialized.includes(SENTINEL_SKILL_GATE), 'skill-gate internals must never reach the persisted Bulletin record');

  // Source/authority test: exactly one canonical provenance edge --
  // sourceIntelId -- no flattened linked* ids copied onto the Bulletin.
  for (const leaked of ['linkedFactionId', 'linkedContactId', 'linkedJobThreadId', 'linkedActorUuid', 'linkedSceneUuid']) {
    assert.equal(bulletinRaw.metadata?.[leaked], undefined, `${leaked} must not be flattened onto the Bulletin -- resolve via sourceIntelId -> Intel instead`);
  }

  console.log('B1/B2/B3/B4/B5 (persisted Bulletin carries only player-safe body + minimal provenance, no private Intel snapshot) passed.');
}

// --- B1 fail-before proof (git-stash isolated) ----------------------------
// Proven separately via `git stash` against holonet-intel-service.js in the
// Phase 8B correction workflow: reverting the fix reproduces every sentinel
// string appearing in the persisted Bulletin's serialized record (this is
// documented in the audit doc's fail-before/pass-after section rather than
// re-run automatically here, matching this project's established
// convention of a manual git-stash proof performed once per fix and
// recorded in the audit trail).

// --- B6: audience/projections/transport unaffected ------------------------
{
  const { stores, socket } = installShim();
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const draft = await HolonetIntelService.createIntelDraft({ title: 'Audience Check', publicBody: 'Body' });
  const result = await HolonetIntelService.deliverAsBulletin(draft.id, {});
  const bulletinRaw = findRawRecord(stores, result.result.recordId);

  assert.equal(bulletinRaw.audience?.type, 'gm_only', 'default gm-only Intel visibility must still resolve to the same audience type as before Phase 8B');
  assert.equal(bulletinRaw.projections?.length, 2, 'the HOME_FEED and GM_DATAPAD_BULLETIN projections must still both be present');
  const surfaceTypes = bulletinRaw.projections.map(p => p.surfaceType).sort();
  assert.deepEqual(surfaceTypes, ['gm_datapad_bulletin', 'home_feed'].sort(), 'projection surface types must be unchanged');

  // B11 (transport regression): exactly one publication sync, no manual
  // Intel-authored emitSync -- Phase 8A's exactly-once contract still holds.
  const publishedSyncs = socket.emitted.filter(e => e?.kind === 'sync' && e.data?.type === 'record-published');
  assert.equal(publishedSyncs.length, 1, 'Intel->Bulletin delivery must still produce exactly one record-published sync (Phase 8A contract)');
  assert.equal(publishedSyncs[0].data.recordId, bulletinRaw.id, 'the one sync must correlate to the Bulletin that was actually persisted');

  console.log('B6/B11 (audience/projections unchanged, exactly-once transport contract preserved) passed.');
}

// --- B7: successful publication updates Intel release/delivery state
// exactly once ------------------------------------------------------------
{
  const { stores } = installShim();
  const { HolonetIntelService, INTEL_STATUS, INTEL_PERSISTENCE } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const draft = await HolonetIntelService.createIntelDraft({ title: 'Release State Check', publicBody: 'Body' });
  const before = (stores.get('holonet_records') ?? []).length;
  const result = await HolonetIntelService.deliverAsBulletin(draft.id, {});
  const after = (stores.get('holonet_records') ?? []).length;

  assert.equal(after, before + 1, 'delivery must add exactly one new record (the Bulletin) -- the Intel record is updated in place, not duplicated');
  assert.equal(result.record.metadata.intel.status, INTEL_STATUS.RELEASED, 'the Intel record itself must be marked released exactly once');
  assert.equal(result.record.metadata.intel.persistence, INTEL_PERSISTENCE.BULLETIN, 'Intel persistence mode must reflect the bulletin delivery');
  assert.equal(result.record.metadata.intel.delivery.history[0].mode, 'bulletin', 'delivery history must record exactly one bulletin delivery entry');
  assert.equal(result.record.metadata.intel.delivery.history.length, 1, 'exactly one delivery history entry must be recorded for this one publication');

  console.log('B7 (Intel release/delivery state updated exactly once on success) passed.');
}

// --- B8: Bulletin persistence failure must block Intel release and
// publication entirely -----------------------------------------------------
{
  const { stores, socket } = installShim();
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');

  const draft = await createSentinelIntel(HolonetIntelService);
  const before = (stores.get('holonet_records') ?? []).length;

  const originalSaveRecord = HolonetStorage.saveRecord;
  HolonetStorage.saveRecord = async () => false;
  try {
    const result = await HolonetIntelService.deliverAsBulletin(draft.id, {});
    assert.equal(result, null, 'deliverAsBulletin() must report failure (null) when the Bulletin storage write does not succeed');
  } finally {
    HolonetStorage.saveRecord = originalSaveRecord;
  }

  const after = (stores.get('holonet_records') ?? []).length;
  assert.equal(after, before, 'a failed Bulletin write must not add any record to storage');
  assert.equal(socket.emitted.length, 0, 'a failed Bulletin write must never broadcast a publication sync');

  // The original Intel record must still show its pre-delivery state --
  // never marked released/delivered off of a publication that never
  // actually persisted.
  const intelRaw = findRawRecord(stores, draft.id);
  assert.notEqual(intelRaw.metadata.intel.status, 'released', 'Intel must not be marked released when the Bulletin write failed');

  console.log('B8 (Bulletin persistence failure blocks Intel release and publication entirely) passed.');
}

// --- B9: legacy Bulletin records (with the old embedded full-Intel-
// metadata copy) remain readable and do not break storage/round-trip -------
{
  const { stores } = installShim();
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
  const { isBulletinRecord } = await import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-boundaries.js');

  const legacyRaw = {
    id: 'legacy-bulletin-8b',
    type: 'event',
    intent: 'bulletin-message',
    sender: { systemLabel: 'GM Bulletin' },
    audience: { type: 'gm-only' },
    recipients: [],
    title: 'Legacy Intel Bulletin',
    body: PUBLIC_BODY,
    metadata: {
      category: 'intel',
      sourceIntelId: 'legacy-intel-1',
      intelDelivery: true,
      // The old, now-removed full-copy shape -- must not crash any reader.
      intel: { id: 'legacy-intel-1', title: 'Legacy Intel', gmNotes: SENTINEL_GM_NOTES, fullBody: SENTINEL_FULL_BODY }
    },
    state: 'published',
    publishedAt: new Date().toISOString(),
    sourceFamily: 'bulletin',
    sourceId: 'legacy-intel-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deliveryStates: {},
    projections: [{ surfaceType: 'home_feed', recordId: 'legacy-bulletin-8b', isPinned: false }],
    threadId: null,
    parentRecordId: null,
    threadContext: null
  };
  stores.set('holonet_records', [legacyRaw]);

  const hydrated = await HolonetStorage.getRecord('legacy-bulletin-8b');
  assert.ok(hydrated, 'a legacy record with the old embedded full-Intel-metadata copy must still hydrate without error');
  assert.equal(isBulletinRecord(hydrated), true, 'a legacy Intel-derived Bulletin must still be recognized as a Bulletin record');
  assert.equal(hydrated.body, PUBLIC_BODY, 'a legacy record\'s player-safe body must still read correctly');
  assert.equal(hydrated.metadata.sourceIntelId, 'legacy-intel-1', 'a legacy record\'s sourceIntelId provenance must still read correctly');

  const all = await HolonetStorage.getAllRecords();
  assert.equal(all.length, 1, 'getAllRecords() must not choke on a legacy record carrying the old embedded metadata shape');

  console.log('B9 (legacy Intel-derived Bulletin records remain readable, no destructive migration performed) passed.');
}

// --- B10: new minimal-provenance records surface correctly alongside
// legacy ones (no migration required) --------------------------------------
{
  const { stores } = installShim();
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
  const { isBulletinRecord } = await import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-boundaries.js');

  const draft = await HolonetIntelService.createIntelDraft({ title: 'New Format', publicBody: 'New format body' });
  const result = await HolonetIntelService.deliverAsBulletin(draft.id, {});
  const hydrated = await HolonetStorage.getRecord(result.result.recordId);

  assert.ok(hydrated, 'a new minimal-provenance Bulletin must hydrate without error');
  assert.equal(isBulletinRecord(hydrated), true, 'a new minimal-provenance Bulletin must still be recognized as a Bulletin record');
  assert.equal(hydrated.metadata.intel, undefined, 'a new record must never carry the full Intel snapshot');
  assert.equal(hydrated.metadata.sourceIntelId, draft.metadata.intel.id, 'a new record must carry sourceIntelId provenance');

  console.log('B10 (new minimal-provenance Bulletin records surface correctly, no migration required) passed.');
}

console.log('PHASE 8B Intel->Bulletin privacy/provenance suite passed.');
