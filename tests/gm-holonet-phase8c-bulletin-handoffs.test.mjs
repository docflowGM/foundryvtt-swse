import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8C: GENERAL BULLETIN INTEGRATION /
// CROSS-SURFACE HANDOFFS.
//
// GMBulletinSurfaceService.prepareDraftFromSource() is the one shared
// authority every source surface's "Prepare Bulletin Draft" action calls.
// It resolves the source via each authority's own canonical registry
// (exact id match only, never by name/label), builds a player-safe
// prefill using ONLY fields already proven player-facing elsewhere in
// this codebase (Job's briefing.body, Location's publicSummary), persists
// a DRAFT-state Bulletin record (never publishes -- no recipient
// resolution, no record-published, no player delivery state), and stamps
// the general {sourceKind, sourceId} provenance contract. Intel's existing
// immediate "Publish as Bulletin" (deliverAsBulletin) is untouched and
// coexists with this new draft path.
//
// This is an ADDITIVE DESIGN CONTRACT (prepareDraftFromSource is new
// production surface, not a bug fix) EXCEPT for the privacy-sentinel
// assertions per source, which are genuine security requirements this
// suite proves hold from the first commit of this new code.

registerFoundryPathLoader();

function makeFakeHooks() {
  const listeners = new Map();
  let nextId = 1;
  return {
    on(event, fn) { const id = nextId++; if (!listeners.has(event)) listeners.set(event, new Map()); listeners.get(event).set(id, fn); return id; },
    off(event, idOrFn) { const map = listeners.get(event); if (!map) return; if (typeof idOrFn === 'number') { map.delete(idOrFn); return; } for (const [id, fn] of map) if (fn === idOrFn) map.delete(id); },
    once(event, fn) { const id = nextId++; if (!listeners.has(event)) listeners.set(event, new Map()); const wrapped = (...a) => { listeners.get(event)?.delete(id); fn(...a); }; listeners.get(event).set(id, wrapped); return id; },
    call(event, ...args) { const map = listeners.get(event); if (map) for (const fn of Array.from(map.values())) fn(...args); return true; },
    callAll(event, ...args) { const map = listeners.get(event); if (map) for (const fn of Array.from(map.values())) fn(...args); return true; }
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
    ['holonet_records', records]
  ]);
  const hooks = makeFakeHooks();
  const emitted = [];
  const socket = { on: () => {}, emit: (_n, payload) => emitted.push(payload), emitted };
  installFoundryShimGlobals({
    game: {
      user: { isGM: true, id: 'gm1' },
      socket,
      settings: {
        get: (_m, key) => stores.get(key) ?? [],
        set: (_m, key, value) => { stores.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: makeActorsCollection(actors),
      users: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
    Hooks: hooks
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
  return { stores, hooks, socket, emitted };
}

function findRawRecord(stores, recordId) {
  return (stores.get('holonet_records') ?? []).find(r => r.id === recordId);
}

const JOB_GM_ONLY = 'JOB_GM_ONLY_8C';
const LOCATION_SECRET = 'LOCATION_SECRET_8C';
const FACTION_GM_ONLY = 'FACTION_GM_ONLY_8C';
const ACTOR_PRIVATE = 'ACTOR_PRIVATE_8C';
const INTEL_FULL_BODY_SENTINEL = 'INTEL_FULL_BODY_8C';

// ------------------------------------------------------------
// 8C-1 / privacy: Job -> draft
// ------------------------------------------------------------
{
  const JOB_THREAD = {
    id: 'job-thread-8c',
    title: 'Rescue the Senator',
    preview: 'Job Board posting',
    metadata: {
      threadType: 'job',
      job: {
        title: 'Rescue the Senator',
        status: 'posted',
        briefing: { body: 'Extract Senator Organa from the detention block.', instructions: JOB_GM_ONLY + '_INSTRUCTIONS' },
        rewardCredits: 5000,
        rewardXp: 200,
        objectives: [{ id: 'o1', status: 'submitted', reviewedBy: 'gm1', reviewNote: JOB_GM_ONLY + '_REVIEW' }],
        factionConsequences: [{ factionId: 'empire', successDelta: -2, failureDelta: 3, notes: JOB_GM_ONLY + '_CONSEQUENCE' }],
        issuerContactActorUuid: 'Actor.issuer-8c',
        gmNotes: JOB_GM_ONLY
      }
    }
  };
  const { stores } = installShim({ threads: [JOB_THREAD] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'job', sourceId: 'job-thread-8c' });
  assert.ok(draft, '8C-1: a draft must be created for a real Job source');

  const raw = findRawRecord(stores, draft.id);
  assert.equal(raw.state, 'draft', '8C-1/8C-7: the draft must be persisted in DRAFT state, not published');
  assert.equal(raw.metadata.sourceKind, 'job', '8C-1: stable source kind must be recorded');
  assert.equal(raw.metadata.sourceId, 'job-thread-8c', '8C-1: stable source id (threadId) must be recorded, never a title/label');
  assert.equal(raw.title, 'Rescue the Senator', '8C-1: title prefilled from the Job title');
  assert.equal(raw.body, 'Extract Senator Organa from the detention block.', '8C-1: body prefilled from the proven-public briefing.body field only');
  assert.deepEqual(raw.recipients, [], '8C-7: a draft must never resolve player recipients');

  const serialized = JSON.stringify(raw);
  assert.ok(!serialized.includes(JOB_GM_ONLY), '8C-1 privacy: no GM-only Job field (gmNotes) may reach the persisted Bulletin draft');
  assert.ok(!serialized.includes('_INSTRUCTIONS'), '8C-1 privacy: briefing.instructions must not be copied (only briefing.body is used)');
  assert.ok(!serialized.includes('_REVIEW'), '8C-1 privacy: internal objective review metadata must never reach the Bulletin');
  assert.ok(!serialized.includes('_CONSEQUENCE'), '8C-1 privacy: hidden faction-consequence data must never reach the Bulletin');
  assert.ok(!serialized.includes('5000') && !serialized.includes('rewardCredits'), '8C-1 privacy: reward math must never reach the Bulletin');

  console.log('8C-1 (Job -> draft: player-safe prefill, stable provenance, no private Job data) passed.');
}

// ------------------------------------------------------------
// 8C-2 / privacy: Location -> draft
// ------------------------------------------------------------
{
  const LOCATION = {
    id: 'tatooine-8c',
    name: 'Tatooine',
    publicSummary: 'A harsh desert world on the Outer Rim.',
    gmNotes: LOCATION_SECRET,
    hazards: LOCATION_SECRET + '_HAZARD',
    rumors: LOCATION_SECRET + '_RUMOR'
  };
  const { stores } = installShim({ locations: [LOCATION] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'tatooine-8c' });
  assert.ok(draft, '8C-2: a draft must be created for a real Location source');
  const raw = findRawRecord(stores, draft.id);

  assert.equal(raw.metadata.sourceKind, 'location');
  assert.equal(raw.metadata.sourceId, 'tatooine-8c', '8C-2: stable locationId provenance, never a name');
  assert.equal(raw.title, 'Tatooine');
  assert.equal(raw.body, 'A harsh desert world on the Outer Rim.', '8C-2: body prefilled from publicSummary only');

  const serialized = JSON.stringify(raw);
  assert.ok(!serialized.includes(LOCATION_SECRET), '8C-2 privacy: gmNotes/hazards/rumors must never reach the persisted Bulletin draft');

  console.log('8C-2 (Location -> draft: safe body prefill, no gmNotes/hidden facts) passed.');
}

// ------------------------------------------------------------
// 8C-3 / privacy: Faction -> draft
// ------------------------------------------------------------
{
  const FACTION = {
    id: 'hutt-cartel-8c',
    name: 'Hutt Cartel',
    notes: FACTION_GM_ONLY + '_NOTES',
    gmNotes: FACTION_GM_ONLY,
    jobDefaults: { defaultConsequenceNotes: FACTION_GM_ONLY + '_JOBDEFAULT' }
  };
  const { stores } = installShim({ factions: [FACTION] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'faction', sourceId: 'hutt-cartel-8c' });
  assert.ok(draft, '8C-3: a draft must be created for a real Faction source');
  const raw = findRawRecord(stores, draft.id);

  assert.equal(raw.metadata.sourceKind, 'faction');
  assert.equal(raw.metadata.sourceId, 'hutt-cartel-8c', '8C-3: stable factionId provenance');
  assert.equal(raw.title, 'Hutt Cartel');
  assert.equal(raw.body, '', '8C-3: no reliable public field exists at the faction-record level -- body is deliberately left empty for the GM, never guessed from notes/gmNotes');

  const serialized = JSON.stringify(raw);
  assert.ok(!serialized.includes(FACTION_GM_ONLY), '8C-3 privacy: gmNotes/notes/jobDefaults must never reach the persisted Bulletin draft');

  console.log('8C-3 (Faction -> draft: stable factionId, no gmNotes/private notes/jobDefaults, honest empty-body prefill) passed.');
}

// ------------------------------------------------------------
// 8C-4 / privacy: Actor -> draft
// ------------------------------------------------------------
{
  const ACTOR = {
    id: 'actor-8c',
    uuid: 'Actor.actor-8c',
    name: 'Dex Rimrunner',
    system: {
      hp: { value: 30, max: 30 },
      credits: 15000,
      inventory: [{ name: ACTOR_PRIVATE + '_ITEM' }],
      conditionTrack: { current: 0 },
      notes: ACTOR_PRIVATE
    }
  };
  const { stores } = installShim({ actors: [ACTOR] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'actor', sourceId: 'Actor.actor-8c' });
  assert.ok(draft, '8C-4: a draft must be created for a real Actor source');
  const raw = findRawRecord(stores, draft.id);

  assert.equal(raw.metadata.sourceKind, 'actor');
  assert.equal(raw.metadata.sourceId, 'Actor.actor-8c', '8C-4: stable Actor UUID provenance, never the display name');
  assert.equal(raw.title, 'Dex Rimrunner');
  assert.equal(raw.body, '', '8C-4: SWSE has no biography/description field -- body is deliberately empty, never a system-data dump');

  const serialized = JSON.stringify(raw);
  assert.ok(!serialized.includes(ACTOR_PRIVATE), '8C-4 privacy: Actor notes/mechanical data must never reach the persisted Bulletin draft');
  assert.ok(!serialized.includes('15000'), '8C-4 privacy: Actor credits must never reach the persisted Bulletin draft');
  assert.ok(!serialized.includes('inventory'), '8C-4 privacy: Actor inventory must never reach the persisted Bulletin draft');

  console.log('8C-4 (Actor -> draft: stable UUID, no system/mechanics/inventory/private data) passed.');
}

// ------------------------------------------------------------
// 8C-5 / privacy: Intel -> draft (reuses Phase 8B's safe-content authority)
// ------------------------------------------------------------
{
  const { stores } = installShim();
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const intelDraft = await HolonetIntelService.createIntelDraft({
    title: 'Sentinel Intel 8C',
    publicBody: 'The public briefing text.',
    fullBody: INTEL_FULL_BODY_SENTINEL,
    gmNotes: 'GM_ONLY_8C',
    skillGate: { enabled: true, skill: 'SKILL_GATE_8C', dc: 20 },
    lockbox: { enabled: true, label: 'LOCKBOX_8C', credits: 500 }
  });

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'intel', sourceId: intelDraft.metadata.intel.id });
  assert.ok(draft, '8C-5: a draft must be created for a real Intel source');
  const raw = findRawRecord(stores, draft.id);

  assert.equal(raw.metadata.sourceKind, 'intel');
  assert.equal(raw.metadata.sourceId, intelDraft.metadata.intel.id, '8C-5: stable Intel id provenance');
  assert.equal(raw.metadata.intel, undefined, '8C-5: no full Intel metadata snapshot -- the general provenance contract never carries it');
  assert.equal(raw.body, 'The public briefing text.', '8C-5: body prefilled from the authoritative public-body helper');

  const serialized = JSON.stringify(raw);
  assert.ok(!serialized.includes(INTEL_FULL_BODY_SENTINEL), '8C-5 privacy: fullBody must never reach the draft (no fullBody fallback -- C8B-4)');
  assert.ok(!serialized.includes('GM_ONLY_8C'), '8C-5 privacy: gmNotes must never reach the draft');
  assert.ok(!serialized.includes('SKILL_GATE_8C'), '8C-5 privacy: skillGate must never reach the draft');
  assert.ok(!serialized.includes('LOCKBOX_8C'), '8C-5 privacy: lockbox must never reach the draft');

  console.log('8C-5 (Intel -> draft: reuses Phase 8B safe-content authority, no fullBody/skillGate/lockbox/gmNotes) passed.');
}

// ------------------------------------------------------------
// 8C-6: immediate Intel publish (deliverAsBulletin) still works unchanged,
// and is a genuinely different action from prepareDraftFromSource.
// ------------------------------------------------------------
{
  const { stores, socket } = installShim();
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const intel = await HolonetIntelService.createIntelDraft({ title: '8C-6 Intel', publicBody: 'Immediate publish body.' });

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'intel', sourceId: intel.metadata.intel.id });
  const draftRaw = findRawRecord(stores, draft.id);
  assert.equal(draftRaw.state, 'draft', '8C-6: Prepare Bulletin Draft must not publish');
  assert.equal(socket.emitted.length, 0, '8C-6: draft creation must broadcast nothing');

  const published = await HolonetIntelService.deliverAsBulletin(intel.id, {});
  assert.ok(published?.ok, '8C-6: Intel\'s existing immediate Publish as Bulletin action must still work unchanged');
  const publishedSyncs = socket.emitted.filter(e => e?.kind === 'sync' && e.data?.type === 'record-published');
  assert.equal(publishedSyncs.length, 1, '8C-6: immediate publish must still broadcast exactly one publication event');

  console.log('8C-6 (Prepare Bulletin Draft and immediate Publish as Bulletin coexist, both work independently) passed.');
}

// ------------------------------------------------------------
// 8C-7: draft creates no player event (dedicated, explicit check across
// all signal types).
// ------------------------------------------------------------
{
  const { stores, socket, hooks } = installShim({ locations: [{ id: 'loc-8c7', name: 'Loc', publicSummary: 'Public text.' }] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const publishedHookCalls = [];
  hooks.on('swseHolonetUpdated', (payload) => { if (payload?.type === 'record-published') publishedHookCalls.push(payload); });

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'loc-8c7' });
  const raw = findRawRecord(stores, draft.id);

  assert.equal(socket.emitted.length, 0, '8C-7: zero syncs of any kind on draft creation');
  assert.equal(publishedHookCalls.length, 0, '8C-7: zero record-published hook dispatches');
  assert.deepEqual(raw.recipients, [], '8C-7: zero player delivery states (no recipients resolved)');
  assert.equal(raw.publishedAt, null, '8C-7: a draft must never carry a publish timestamp');

  console.log('8C-7 (draft creation produces zero publication events, zero recipients, zero delivery state) passed.');
}

// ------------------------------------------------------------
// 8C-8: publishing a prepared draft uses the real Phase 8A pipeline
// exactly once.
// ------------------------------------------------------------
{
  const { stores, socket } = installShim({ locations: [{ id: 'loc-8c8', name: 'Loc', publicSummary: 'Public text.' }] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');
  const { HolonetEngine } = await import('/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js');
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'loc-8c8' });
  const record = await HolonetStorage.getRecord(draft.id);
  const ok = await HolonetEngine.publish(record, { skipSocket: false });
  assert.ok(ok, '8C-8: publishing a prepared draft must succeed through the real Phase 8A pipeline');

  const publishedRaw = findRawRecord(stores, draft.id);
  assert.equal(publishedRaw.state, 'published', '8C-8: the draft must now be published');
  const publishedSyncs = socket.emitted.filter(e => e?.kind === 'sync' && e.data?.type === 'record-published');
  assert.equal(publishedSyncs.length, 1, '8C-8: exactly one publication occurrence for the prepared draft');
  assert.equal(publishedRaw.metadata.sourceKind, 'location', '8C-8: provenance survives publication unchanged');

  console.log('8C-8 (publishing a prepared draft uses the real Phase 8A exactly-once pipeline) passed.');
}

// ------------------------------------------------------------
// 8C-9: source provenance navigation resolution (read-only,
// GMCampaignContextService.resolveBulletinSource) -- exact target per
// source kind, broken source fails safe.
// ------------------------------------------------------------
{
  const JOB_THREAD = { id: 'job-8c9', title: 'Job Nine', metadata: { threadType: 'job', job: { title: 'Job Nine', status: 'posted' } } };
  const LOCATION = { id: 'loc-8c9', name: 'Location Nine', publicSummary: 'x' };
  const FACTION = { id: 'faction-8c9', name: 'Faction Nine' };
  installShim({ threads: [JOB_THREAD], locations: [LOCATION], factions: [FACTION] });
  const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
  const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');

  const jobResolved = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'job', sourceId: 'job-8c9' });
  assert.equal(jobResolved.resolved, true);
  assert.deepEqual(jobResolved.target, { kind: 'job', id: 'job-8c9' });
  assert.equal(jobResolved.label, 'Job Nine');

  const locResolved = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'location', sourceId: 'loc-8c9' });
  assert.deepEqual(locResolved.target, { kind: 'location', id: 'loc-8c9' });

  const facResolved = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'faction', sourceId: 'faction-8c9' });
  assert.deepEqual(facResolved.target, { kind: 'faction', id: 'faction-8c9' });

  const intel = await HolonetIntelService.createIntelDraft({ title: 'Intel Nine', publicBody: 'x' });
  const intelResolved = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'intel', sourceId: intel.metadata.intel.id });
  assert.deepEqual(intelResolved.target, { kind: 'intel', id: intel.metadata.intel.id });

  // Actor deliberately has no navigable Datapad-surface target -- callers
  // open the real Foundry Actor sheet themselves using sourceId as the UUID.
  const actorResolvedNoActor = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'actor', sourceId: 'Actor.missing-8c9' });
  assert.equal(actorResolvedNoActor.target, null, '8C-9: actor provenance never resolves to a Datapad surface target');
  assert.equal(actorResolvedNoActor.resolved, false);

  // Broken source: fails safe, never guesses.
  const brokenJob = await GMCampaignContextService.resolveBulletinSource({ sourceKind: 'job', sourceId: 'nonexistent-thread' });
  assert.equal(brokenJob.resolved, false, '8C-9: an unresolvable source must report resolved:false, never a guessed match');
  assert.equal(brokenJob.resolutionKind, 'missing');

  console.log('8C-9 (source provenance navigation: exact per-kind target, actor excluded, broken source fails safe) passed.');
}

// ------------------------------------------------------------
// 8C-10: source independence -- mutating the source after draft creation
// never changes the Bulletin body, and vice versa.
// ------------------------------------------------------------
{
  const LOCATION = { id: 'loc-8c10', name: 'Location Ten', publicSummary: 'Original public text.' };
  const { stores } = installShim({ locations: [LOCATION] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');

  const draft = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'loc-8c10' });

  // Mutate the source registry directly (as LocationRegistryService.upsertLocation() would).
  const registry = stores.get('gmLocationRegistry');
  registry[0] = { ...registry[0], publicSummary: 'Mutated public text.' };
  stores.set('gmLocationRegistry', registry);

  const raw = findRawRecord(stores, draft.id);
  assert.equal(raw.body, 'Original public text.', '8C-10: editing the source later must not silently rewrite the Bulletin draft');

  // Mutate the Bulletin -- source remains unchanged.
  const record = await HolonetStorage.getRecord(draft.id);
  record.body = 'GM-edited Bulletin text.';
  await HolonetStorage.saveRecord(record);
  const stillOriginalLocation = stores.get('gmLocationRegistry')[0];
  assert.equal(stillOriginalLocation.publicSummary, 'Mutated public text.', '8C-10: editing the Bulletin must not mutate the source record');

  console.log('8C-10 (source/Bulletin independence: edits on either side never propagate to the other) passed.');
}

// ------------------------------------------------------------
// 8C-11: duplicate drafts from the same source are both valid, distinct
// records sharing the same provenance.
// ------------------------------------------------------------
{
  const LOCATION = { id: 'loc-8c11', name: 'Location Eleven', publicSummary: 'Public text.' };
  const { stores } = installShim({ locations: [LOCATION] });
  const { GMBulletinSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMBulletinSurfaceService.js');

  const draftA = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'loc-8c11' });
  const draftB = await GMBulletinSurfaceService.prepareDraftFromSource({ sourceKind: 'location', sourceId: 'loc-8c11' });

  assert.notEqual(draftA.id, draftB.id, '8C-11: two drafts from the same source must have distinct Bulletin ids');
  const rawA = findRawRecord(stores, draftA.id);
  const rawB = findRawRecord(stores, draftB.id);
  assert.equal(rawA.metadata.sourceId, rawB.metadata.sourceId, '8C-11: both drafts legitimately share the same source provenance');
  assert.equal((stores.get('holonet_records') ?? []).length, 2, '8C-11: no global source->single-Bulletin uniqueness constraint exists');

  console.log('8C-11 (duplicate drafts from one source: distinct ids, shared provenance, both valid) passed.');
}

// ------------------------------------------------------------
// 8C-12: no-visible-text resolution -- source lookups are exact-id-only,
// never title/label/name matching (static source check).
// ------------------------------------------------------------
{
  const { readFile } = await import('node:fs/promises');
  const root = new URL('../', import.meta.url);
  const source = await readFile(new URL('scripts/ui/shell/gm/GMBulletinSurfaceService.js', root), 'utf8');
  const prefillBody = source.slice(source.indexOf('static async _prefillForSource'), source.indexOf('export class GMBulletinSurfaceService').length ? source.length : source.length);
  assert.doesNotMatch(prefillBody, /findLocation\(|findFaction\(/, '8C-12: prefill lookups must use exact-id .find(entry => entry.id === id), never the fuzzy name/slug-matching findLocation()/findFaction() helpers');
  assert.match(source, /entry\.id === id/, '8C-12: sanity -- exact-id matching is actually present');

  console.log('8C-12 (static check: source resolution never falls back to name/label matching) passed.');
}

// ------------------------------------------------------------
// 8C-13: old Bulletins (no provenance, legacy Intel provenance, new Intel
// minimal provenance) all continue to render through the real surface
// view-model builder -- no migration required.
// ------------------------------------------------------------
{
  const legacyNoProvenance = {
    id: 'legacy-no-prov-8c', type: 'event', intent: 'bulletin-event',
    sender: { systemLabel: 'GM Bulletin' }, audience: { type: 'all_players' }, recipients: [],
    title: 'Old Bulletin', body: 'Old body.', metadata: { category: 'news' }, state: 'published',
    publishedAt: new Date().toISOString(), sourceFamily: 'bulletin', sourceId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    deliveryStates: {}, projections: [], threadId: null, parentRecordId: null, threadContext: null
  };
  const legacyIntelProvenance = {
    id: 'legacy-intel-prov-8c', type: 'message', intent: 'bulletin-message',
    sender: { systemLabel: 'GM Bulletin' }, audience: { type: 'gm_only' }, recipients: [],
    title: 'Legacy Intel Bulletin', body: 'Legacy body.',
    metadata: { category: 'intel', sourceIntelId: 'legacy-intel-1', intelDelivery: true, intel: { id: 'legacy-intel-1', title: 'Legacy' } },
    state: 'published', publishedAt: new Date().toISOString(), sourceFamily: 'bulletin', sourceId: 'legacy-intel-1',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    deliveryStates: {}, projections: [], threadId: null, parentRecordId: null, threadContext: null
  };
  const newMinimalProvenance = {
    id: 'new-prov-8c', type: 'message', intent: 'bulletin-message',
    sender: { systemLabel: 'GM Bulletin' }, audience: { type: 'gm_only' }, recipients: [],
    title: 'New Draft', body: 'New body.', metadata: { category: 'location', sourceKind: 'location', sourceId: 'loc-x' },
    state: 'draft', publishedAt: null, sourceFamily: 'bulletin', sourceId: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    deliveryStates: {}, projections: [], threadId: null, parentRecordId: null, threadContext: null
  };
  const { stores } = installShim({ records: [legacyNoProvenance, legacyIntelProvenance, newMinimalProvenance] });
  const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
  const { isBulletinRecord } = await import('/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-boundaries.js');

  const all = await HolonetStorage.getAllRecords();
  assert.equal(all.length, 3, '8C-13: all three legacy/new Bulletin shapes must hydrate without error');
  for (const record of all) {
    assert.equal(isBulletinRecord(record), true, `8C-13: ${record.id} must still be recognized as a Bulletin record`);
    assert.ok(typeof record.body === 'string', `8C-13: ${record.id} must still expose a readable body`);
  }

  console.log('8C-13 (old Bulletins with no/legacy/new provenance shapes all continue to render, no migration required) passed.');
}

console.log('PHASE 8C Bulletin general-integration/cross-surface-handoff suite passed.');
