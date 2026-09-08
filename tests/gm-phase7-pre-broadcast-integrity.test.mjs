import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 7 PRE-BROADCAST FINAL INTEGRITY
// PASS. Proves the four items closed before Phase 8 (Bulletin/Holonet)
// work begins:
//
//   1. GMFactionRelationshipSurfaceService.locationVm() must use the
//      SAME strict activeForParty===true authority as Locations/
//      GMCampaignContextService — no revealState:'active' fallback.
//   2. Home recovery attention must be COMPUTATIONALLY party-first (only
//      build a recovery card for party candidates), not merely
//      display-filtered after building cards for every managed Actor.
//   3. forActor() must failure-isolate Jobs and Intel independently —
//      a Job Board or Intel storage failure must not blank the rest of
//      the selected Actor's dossier.
//   4. Workspace's no-explicit-selection fallback chain: party -> combat
//      -> scene -> first visible GM Actor. An EXPLICIT broken selection
//      must still fail with a warning, never a silent substitution.
//
// These are BUG FIXES to real remaining defects, not additive design
// contracts — each fail-before proof is a real pre-correction failure.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), filter: (fn) => actorList.filter(fn), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], actors = [] } = {}) {
  const stores = new Map([
    ['gmLocationRegistry', locations],
    ['gmFactionRegistry', factions],
    ['holonet_threads', []],
    ['holonet_records', []],
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

function organicActor({ id, name, hp = 20, hpMax = 20, ctCurrent = 0, inParty = true }) {
  const flags = { gmPartyMember: inParty };
  return {
    id, name, type: 'character', uuid: `Actor.${id}`,
    system: { hp: { value: hp, max: hpMax }, conditionTrack: { current: ctCurrent, persistent: false }, secondWind: { uses: 1, max: 1 } },
    effects: [], flags: {}, isOwner: true,
    getFlag: (_scope, key) => flags[key],
    setFlag: async (_scope, key, value) => { flags[key] = value; return value; }
  };
}

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
const { GMCombatRecoveryService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js');
const { GMFactionRelationshipSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js');
const { GMWorkspaceSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMWorkspaceSurfaceService.js');
const { HolonetStorage } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js');
const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');

// ============================================================
// ITEM 1 — strict party-Location authority in Factions
// ============================================================
{
  const FACTION = { id: 'black-sun', name: 'Black Sun', contacts: [] };
  const LOCATION_NOT_ACTIVE = { id: 'coruscant', name: 'Coruscant', controllingFactionId: 'black-sun', revealState: 'active', activeForParty: false };
  installShim({ factions: [FACTION], locations: [LOCATION_NOT_ACTIVE] });

  const vm = await GMFactionRelationshipSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  const entry = vm.factionManager.registry.find(f => f.id === 'black-sun');
  assert.equal(entry.currentSituation.currentPartyLocationPresence, false, 'revealState:"active" alone must never report "Party In Territory" — that is exactly the false claim Bulletin must not later broadcast to players');
  assert.equal(entry.activeLocationCount, 0);

  const LOCATION_ACTIVE = { id: 'coruscant', name: 'Coruscant', controllingFactionId: 'black-sun', revealState: 'active', activeForParty: true };
  installShim({ factions: [FACTION], locations: [LOCATION_ACTIVE] });
  const vm2 = await GMFactionRelationshipSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  const entry2 = vm2.factionManager.registry.find(f => f.id === 'black-sun');
  assert.equal(entry2.currentSituation.currentPartyLocationPresence, true, 'a genuine activeForParty:true Location must still be correctly reported as positive');
  assert.equal(entry2.activeLocationCount, 1);
}

console.log('Item 1 (strict Faction party-Location authority, no revealState fallback) passed.');

// ============================================================
// ITEM 2 — Home recovery attention is computationally party-first
// ============================================================
{
  const partyActors = Array.from({ length: 4 }, (_, i) => organicActor({ id: `party-${i}`, name: `Party ${i}`, hp: 5, hpMax: 20, inParty: true }));
  const nonPartyActors = Array.from({ length: 50 }, (_, i) => organicActor({ id: `npc-${i}`, name: `NPC ${i}`, hp: 5, hpMax: 20, inParty: false }));
  installShim({ actors: [...partyActors, ...nonPartyActors] });

  let callCount = 0;
  const originalBuildActorCard = GMCombatRecoveryService.buildActorCard;
  GMCombatRecoveryService.buildActorCard = (actor) => { callCount++; return originalBuildActorCard.call(GMCombatRecoveryService, actor); };
  try {
    const items = await GMCampaignContextService.attentionItems();
    assert.equal(callCount, 4, 'with a defined 4-member party, buildActorCard() must be called ONLY for those 4 party candidates while building Home recovery attention -- never for the wider 54-Actor managed roster');
    assert.equal(items.filter(item => item.kind === 'recovery').length, 4, 'all 4 wounded party members must still surface');
  } finally {
    GMCombatRecoveryService.buildActorCard = originalBuildActorCard;
  }
}

// the roster convention was NEVER TOUCHED at all (no actor carries any
// explicit gmPartyMember override): the managed-roster fallback still
// works, and still only builds cards for that (smaller, in this
// fixture) set.
{
  const NO_PARTY_WOUNDED = {
    id: 'no-party-wounded', name: 'No Party Wounded', type: 'character', uuid: 'Actor.no-party-wounded',
    system: { hp: { value: 5, max: 20 }, conditionTrack: { current: 0, persistent: false }, secondWind: { uses: 1, max: 1 } },
    effects: [], flags: {}, isOwner: true,
    getFlag: () => undefined, setFlag: async () => undefined
  };
  installShim({ actors: [NO_PARTY_WOUNDED] });
  const items = await GMCampaignContextService.attentionItems();
  assert.ok(items.find(item => item.kind === 'recovery' && item.target?.id === 'no-party-wounded'), 'with the roster convention never configured at all, the managed-roster fallback must still surface a wounded Actor');
}

// ITEM 1 (new regression): the GM DELIBERATELY configures an EMPTY
// party (a player-linked Actor explicitly excluded via
// gmPartyMember:false) -- this must NOT fall back to the wider managed
// roster. A wounded, unrelated managed NPC must produce NO Home
// recovery attention, and buildActorCard() must never be invoked for it.
{
  const { GMPartyRosterService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js');
  const EXCLUDED_PLAYER_ACTOR = organicActor({ id: 'excluded-player-1', name: 'Explicitly Excluded Player Actor', inParty: false });
  const UNRELATED_WOUNDED_NPC = {
    id: 'unrelated-npc-1', name: 'Unrelated Wounded NPC', type: 'npc', uuid: 'Actor.unrelated-npc-1',
    system: { hp: { value: 5, max: 20 }, conditionTrack: { current: 0, persistent: false }, secondWind: { uses: 1, max: 1 } },
    effects: [], flags: {}, isOwner: true,
    getFlag: () => undefined, setFlag: async () => undefined
  };
  installShim({ actors: [EXCLUDED_PLAYER_ACTOR, UNRELATED_WOUNDED_NPC] });
  // Simulate the player-linked-but-excluded case: a non-GM user whose
  // character is EXCLUDED_PLAYER_ACTOR (player-linked), with that Actor's
  // own gmPartyMember flag explicitly false (an explicit override wins
  // over the player-linked default per GMPartyRosterService.isPartyMember()).
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: (_m, key) => (['gmLocationRegistry', 'gmFactionRegistry', 'pendingCustomPurchases', 'holonet_threads', 'holonet_records'].includes(key) ? [] : []), set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: makeActorsCollection([EXCLUDED_PLAYER_ACTOR, UNRELATED_WOUNDED_NPC]),
      users: makeActorsCollection([{ isGM: false, character: { id: 'excluded-player-1' } }]),
      scenes: new Map(),
      combat: null
    }
  });

  assert.equal(GMPartyRosterService.getPartyActors({ ownedOnly: false }).length, 0, 'sanity: the party really is empty (the sole player-linked Actor was explicitly excluded)');
  assert.equal(GMPartyRosterService.hasExplicitRosterConfiguration(), true, 'sanity: the roster WAS explicitly configured (an explicit override exists), unlike the "never touched" case above');

  let callCount = 0;
  const originalBuildActorCard = GMCombatRecoveryService.buildActorCard;
  GMCombatRecoveryService.buildActorCard = (actor) => { callCount++; return originalBuildActorCard.call(GMCombatRecoveryService, actor); };
  try {
    const items = await GMCampaignContextService.attentionItems();
    assert.equal(items.filter(item => item.kind === 'recovery').length, 0, 'a deliberately emptied party must produce ZERO Home recovery attention items -- it must never silently fall back to the wider managed roster');
    assert.equal(callCount, 0, 'buildActorCard() must not be invoked for the unrelated managed NPC when the party was deliberately emptied, not merely never configured');
  } finally {
    GMCombatRecoveryService.buildActorCard = originalBuildActorCard;
  }
}

console.log('Item 2 (Home recovery attention is computationally party-first, not just display-filtered) passed.');

// ============================================================
// ITEM 3 — forActor() failure-isolates Jobs and Intel independently
// ============================================================
{
  const ACTOR = organicActor({ id: 'iso-actor-1', name: 'Isolation Test PC' });
  installShim({ actors: [ACTOR] });

  const warnCalls = [];
  const originalWarn = SWSELogger.warn;
  SWSELogger.warn = (...args) => warnCalls.push(args);
  const originalGetAllThreads = HolonetStorage.getAllThreads;
  HolonetStorage.getAllThreads = async () => { throw new Error('simulated Job Board storage failure'); };
  try {
    const context = await GMCampaignContextService.forActor(ACTOR);
    assert.equal(context.subject.resolved, true, 'a Job Board failure must not prevent Actor identity from resolving');
    assert.deepEqual(context.relationships.jobs, [], 'a Job Board failure must report an empty (not fabricated) jobs list');
    assert.ok(Array.isArray(context.relationships.intel), 'Intel must still load normally when only Jobs failed');
    assert.ok(context.operations.recovery, 'Recovery must still load normally when only Jobs failed');
    assert.ok(context.operations.trades !== undefined, 'Trade must still load normally when only Jobs failed');
    assert.ok(context.limitations.some(l => /job/i.test(l)), 'a truthful Job-context limitation must be reported');
    assert.ok(warnCalls.some(args => /job board/i.test(String(args[0] || ''))), 'the real caught exception must be logged via SWSELogger.warn');
  } finally {
    HolonetStorage.getAllThreads = originalGetAllThreads;
    SWSELogger.warn = originalWarn;
  }
}

{
  const ACTOR = organicActor({ id: 'iso-actor-2', name: 'Isolation Test PC 2' });
  installShim({ actors: [ACTOR] });

  const warnCalls = [];
  const originalWarn = SWSELogger.warn;
  SWSELogger.warn = (...args) => warnCalls.push(args);
  const originalGetAllIntel = HolonetIntelService.getAllIntel;
  HolonetIntelService.getAllIntel = async () => { throw new Error('simulated Intel storage failure'); };
  try {
    const context = await GMCampaignContextService.forActor(ACTOR);
    assert.equal(context.subject.resolved, true, 'an Intel failure must not prevent Actor identity from resolving');
    assert.deepEqual(context.relationships.intel, [], 'an Intel failure must report an empty (not fabricated) intel list');
    assert.ok(Array.isArray(context.relationships.jobs), 'Jobs must still load normally when only Intel failed');
    assert.ok(context.operations.recovery, 'Recovery must still load normally when only Intel failed');
    assert.ok(context.limitations.some(l => /intel/i.test(l)), 'a truthful Intel-context limitation must be reported');
    assert.ok(warnCalls.some(args => /intel/i.test(String(args[0] || ''))), 'the real caught exception must be logged via SWSELogger.warn');
  } finally {
    HolonetIntelService.getAllIntel = originalGetAllIntel;
    SWSELogger.warn = originalWarn;
  }
}

// a healthy campaign (no forced failure) must never log a spurious
// Job/Intel warning.
{
  const ACTOR = organicActor({ id: 'iso-actor-3', name: 'Isolation Healthy PC' });
  installShim({ actors: [ACTOR] });
  const warnCalls = [];
  const originalWarn = SWSELogger.warn;
  SWSELogger.warn = (...args) => warnCalls.push(args);
  try {
    await GMCampaignContextService.forActor(ACTOR);
    assert.deepEqual(warnCalls, [], 'a healthy forActor() call must never log a spurious warning');
  } finally {
    SWSELogger.warn = originalWarn;
  }
}

console.log('Item 3 (forActor() failure-isolates Jobs and Intel independently) passed.');

// ============================================================
// ITEM 4 — Workspace's no-explicit-selection fallback chain
// ============================================================

// A. no explicit selection, a party exists -> first party Actor.
{
  const PARTY = organicActor({ id: 'fallback-party-1', name: 'Fallback Party PC', inParty: true });
  installShim({ actors: [PARTY] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: '' }) });
  assert.equal(vm.selection.selectedActorId, 'fallback-party-1');
}

// B. no party, a combat Actor exists -> first combat Actor.
{
  const COMBATANT = organicActor({ id: 'fallback-combat-1', name: 'Fallback Combatant', inParty: false });
  installShim({ actors: [COMBATANT] });
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: (_m, key) => (key === 'gmLocationRegistry' || key === 'gmFactionRegistry' || key === 'pendingCustomPurchases' ? [] : (key === 'holonet_threads' || key === 'holonet_records' ? [] : [])), set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: makeActorsCollection([COMBATANT]),
      users: makeActorsCollection([]),
      scenes: new Map(),
      combat: { combatants: [{ actor: COMBATANT }] }
    }
  });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: '' }) });
  assert.equal(vm.selection.selectedActorId, 'fallback-combat-1', 'with no party but an active-combat Actor, Workspace must select the first combat Actor rather than showing "No Actor Selected"');
}

// C. no party, no combat, a scene-token Actor exists -> first scene Actor.
{
  const SCENE_ACTOR = organicActor({ id: 'fallback-scene-1', name: 'Fallback Scene Actor', inParty: false });
  const scene = { id: 'scene-1', name: 'Test Scene', active: true, tokens: [{ actor: SCENE_ACTOR, actorId: 'fallback-scene-1', name: 'Token' }] };
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => [], set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: makeActorsCollection([SCENE_ACTOR]),
      users: makeActorsCollection([]),
      scenes: { active: scene, get: () => scene, [Symbol.iterator]: () => [scene][Symbol.iterator]() },
      combat: null
    }
  });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: '' }) });
  assert.equal(vm.selection.selectedActorId, 'fallback-scene-1', 'with no party and no combat but a current-scene Actor, Workspace must select the first scene Actor');
}

// D. only a GM-owned Actor exists (no party/combat/scene) -> first
// visible GM Actor, not an empty dossier.
{
  const GM_ACTOR = organicActor({ id: 'fallback-gm-1', name: 'Fallback GM Actor', inParty: false });
  installShim({ actors: [GM_ACTOR] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: '' }) });
  assert.equal(vm.selection.selectedActorId, 'fallback-gm-1', 'with no party/combat/scene context at all, Workspace must still select the first visible GM-owned Actor rather than showing "No Actor Selected"');
  assert.equal(vm.selection.hasSelection, true);
}

// E. an EXPLICIT broken selection must remain broken -- no automatic
// substitution even though a party/combat/scene/GM Actor exists.
{
  const PARTY = organicActor({ id: 'fallback-party-2', name: 'Fallback Party PC 2', inParty: true });
  installShim({ actors: [PARTY] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: 'deleted-actor-explicit' }) });
  assert.equal(vm.selection.hasSelection, false);
  assert.equal(vm.selection.selectedActorId, 'deleted-actor-explicit', 'an explicit broken selection must be reported as-is, never silently substituted for the party member that exists');
  assert.ok(vm.selection.warning, 'an explicit broken selection must produce a warning, not a silent fallback');
}

console.log('Item 4 (Workspace no-explicit-selection fallback chain: party -> combat -> scene -> GM Actor; explicit broken selection stays broken) passed.');

console.log('PHASE 7 PRE-BROADCAST FINAL INTEGRITY PASS regression suite passed (strict Faction party-Location authority; Home recovery attention computationally party-first; forActor() Job/Intel failure isolation; Workspace contextual fallback chain with broken-explicit-selection honesty preserved).');
