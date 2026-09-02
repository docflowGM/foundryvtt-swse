import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 7 INDEPENDENT REVIEW CORRECTION
// PASS (Workspace/Actor Context Integrity). Proves the 6 corrections
// identified by independent review of the Phase 7 head
// (e6b988dfab37bba91f442f5a4559decc904ff9e6):
//
//   1. Recovery "eligible" (GMHealingTrigger) is not "needs attention" —
//      Home/forActor() must reuse GMCombatRecoveryService's own real
//      recovery legality instead.
//   2. Workspace must read the canonical Actor CT field
//      (system.conditionTrack.current), not a stale/legacy fallback first.
//   3. Faction's "Open in Workspace" must be gated on a real WORLD Actor,
//      never advertised for a Compendium-only Contact link.
//   4. Workspace's Organization Role navigation must preserve the exact
//      Faction Contact focus (focusedContactId), not degrade to a
//      generic Faction target.
//   5. Trade's empty-state copy must not claim "recent" activity was
//      checked when only active/approval/failed queues are read.
//
// These are BUG FIXES to real semantic drift Phase 7's own work
// introduced, not additive design contracts — the git-stash fail-before
// proof for each is a real pre-correction failure, not a missing-feature
// crash.

registerFoundryPathLoader();

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

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

function organicActor({ id, name, hp = 20, hpMax = 20, ctCurrent = 0, ctPersistent = false, swUses = 1, swMax = 1, inParty = true }) {
  const flags = { gmPartyMember: inParty };
  return {
    id, name, type: 'character', uuid: `Actor.${id}`,
    system: { hp: { value: hp, max: hpMax }, conditionTrack: { current: ctCurrent, persistent: ctPersistent }, secondWind: { uses: swUses, max: swMax } },
    effects: [], flags: {},
    getFlag: (_scope, key) => flags[key],
    setFlag: async (_scope, key, value) => { flags[key] = value; return value; },
    isOwner: true
  };
}

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
const { GMCombatRecoveryService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js');
const { GMWorkspaceSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMWorkspaceSurfaceService.js');
const { GMCampaignTargetService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignTargetService.js');

// ============================================================
// CORRECTION 1 — recovery eligible != needs attention
// ============================================================

// --- a fully healthy, unimpaired PC produces ZERO recovery attention ------
{
  const HEALTHY = organicActor({ id: 'healthy-1', name: 'Healthy PC' });
  installShim({ actors: [HEALTHY] });
  const items = await GMCampaignContextService.attentionItems();
  assert.equal(items.find(item => item.kind === 'recovery'), undefined, 'a full-HP, unimpaired, non-spent-Second-Wind character must never produce a Home recovery attention item merely because GMHealingTrigger calls it "eligible"');
}

// --- a wounded PC produces a recovery attention item, target workspace-actor
{
  const WOUNDED = organicActor({ id: 'wounded-1', name: 'Wounded PC', hp: 5, hpMax: 20 });
  installShim({ actors: [WOUNDED] });
  const items = await GMCampaignContextService.attentionItems();
  const recovery = items.find(item => item.kind === 'recovery');
  assert.ok(recovery, 'a genuinely wounded PC must produce a recovery attention item');
  assert.deepEqual(recovery.target, { kind: 'workspace-actor', id: 'wounded-1', uuid: 'Actor.wounded-1' });
}

// --- a CT-impaired but full-HP PC still produces recovery attention -------
{
  const CT_IMPAIRED = organicActor({ id: 'ct-1', name: 'CT Impaired PC', ctCurrent: 2 });
  installShim({ actors: [CT_IMPAIRED] });
  const items = await GMCampaignContextService.attentionItems();
  assert.ok(items.find(item => item.kind === 'recovery'), 'a full-HP PC with a Condition Track impairment must still produce a recovery attention item — needsAttention is not HP-only');
}

// --- Droid/Vehicle attention wording never claims organic-rest eligibility
{
  const DOWNED_DROID = { id: 'droid-1', name: 'HK-Unit', type: 'droid', uuid: 'Actor.droid-1', system: { hp: { value: 0, max: 20 }, isDroid: true }, effects: [], flags: {}, getFlag: () => undefined };
  installShim({ actors: [DOWNED_DROID] });
  const items = await GMCampaignContextService.attentionItems();
  const recovery = items.find(item => item.kind === 'recovery');
  assert.ok(recovery, 'a downed Droid must still produce a recovery/repair attention item');
  assert.doesNotMatch(recovery.detail, /eligible for natural healing/i, 'a Droid/Vehicle attention item must never use organic-rest wording');
  assert.match(recovery.detail, /repair/i, 'a Droid/Vehicle attention item must use truthful repair/condition wording');
}

// --- forActor().operations.recovery.needsAttention agrees EXACTLY with
// the real GMCombatRecoveryService.buildActorCard(actor).needsAttention.
{
  const WOUNDED = organicActor({ id: 'wounded-2', name: 'Wounded PC 2', hp: 5, hpMax: 20 });
  const HEALTHY = organicActor({ id: 'healthy-2', name: 'Healthy PC 2' });
  installShim({ actors: [WOUNDED, HEALTHY] });
  for (const actor of [WOUNDED, HEALTHY]) {
    const context = await GMCampaignContextService.forActor(actor);
    const realCard = GMCombatRecoveryService.buildActorCard(actor);
    assert.equal(context.operations.recovery.needsAttention, realCard.needsAttention, `forActor(${actor.id}).operations.recovery.needsAttention must agree exactly with the real recovery authority`);
  }
}

console.log('Correction 1 (recovery eligible != needs attention) passed.');

// ============================================================
// CORRECTION 2 — canonical Condition Track field
// ============================================================
{
  const CT2 = organicActor({ id: 'ct-canon-1', name: 'CT Canon PC', ctCurrent: 2 });
  installShim({ actors: [CT2] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: 'ct-canon-1' }) });
  assert.equal(vm.selection.identity.conditionTrack, 2, 'Workspace must read the canonical system.conditionTrack.current field');
  assert.equal(vm.selection.identity.conditionLabel, 'CT 2');
}

// --- canonical current wins over a stale conflicting legacy `value` field -
{
  const CT_LEGACY_CONFLICT = organicActor({ id: 'ct-legacy-1', name: 'CT Legacy Conflict PC', ctCurrent: 3 });
  CT_LEGACY_CONFLICT.system.conditionTrack.value = 0; // stale legacy field, must lose to .current
  installShim({ actors: [CT_LEGACY_CONFLICT] });
  const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: 'ct-legacy-1' }) });
  assert.equal(vm.selection.identity.conditionTrack, 3, 'canonical conditionTrack.current must win over a conflicting legacy conditionTrack.value');
}

console.log('Correction 2 (canonical Condition Track field) passed.');

// ============================================================
// CORRECTION 3 — Faction "Open in Workspace" world-Actor truthfulness
// ============================================================
{
  const { GMFactionRelationshipSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js');
  const WORLD_ACTOR = { id: 'world-actor-1', name: 'World NPC', uuid: 'Actor.world-actor-1' };
  const FACTION = {
    id: 'black-sun', name: 'Black Sun',
    contacts: [
      { id: 'contact-world', name: 'World Contact', actorId: 'world-actor-1', actorUuid: 'Actor.world-actor-1' },
      { id: 'contact-compendium', name: 'Compendium Contact', actorUuid: 'Compendium.some-pack.Actor.compendium-actor-1' }
    ]
  };
  installShim({ factions: [FACTION], actors: [WORLD_ACTOR] });
  const vm = await GMFactionRelationshipSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  const dossier = vm.factionManager.registry.find(f => f.id === 'black-sun');
  const contacts = dossier?.contacts ?? [];
  const worldContact = contacts.find(c => c.id === 'contact-world');
  const compendiumContact = contacts.find(c => c.id === 'contact-compendium');
  assert.ok(worldContact, 'sanity: the world-Actor-backed contact must be present in the built VM');
  assert.equal(worldContact.hasActorLink, true);
  assert.equal(worldContact.hasWorkspaceActorLink, true, 'a real world Actor link must advertise Open in Workspace');
  assert.equal(worldContact.workspaceActorId, 'world-actor-1');
  // FINAL CORRECTION 4A: this must be an unconditional assertion — the
  // pre-correction test's `if (compendiumContact)` guard meant the test
  // still passed even if the Compendium Contact silently vanished from
  // the VM entirely. The real contract is: it stays present, Open Actor
  // stays available, only Open in Workspace is withheld.
  assert.ok(compendiumContact, 'a Compendium-only Contact must remain present in the VM — it must never be dropped');
  assert.equal(compendiumContact.hasActorLink, true, 'a Compendium-only Contact must still support Open Actor');
  assert.equal(compendiumContact.hasWorkspaceActorLink, false, 'a Compendium-only Contact must NOT advertise Open in Workspace — Workspace selection cannot resolve it');
}

console.log('Correction 3 (Faction Open in Workspace world-Actor truthfulness) passed.');

// ============================================================
// CORRECTION 4 — Organization Role preserves exact Contact focus
// ============================================================
{
  const target = GMCampaignTargetService.factionContact('black-sun', 'contact-vexa');
  assert.deepEqual(target, { surfaceId: 'factions', statePatch: { focusedFactionId: 'black-sun', focusedContactId: 'contact-vexa' } });

  const resolved = GMCampaignTargetService.resolve({ kind: 'faction-contact', id: 'contact-vexa', factionId: 'black-sun' });
  assert.deepEqual(resolved, target);

  // Missing factionId must fail honestly, never silently degrade to a
  // faction-only target.
  assert.equal(GMCampaignTargetService.resolve({ kind: 'faction-contact', id: 'contact-vexa' }), null);

  // Generic faction() target and resolve('faction') are UNCHANGED.
  assert.deepEqual(GMCampaignTargetService.faction('black-sun'), { surfaceId: 'factions', statePatch: { focusedFactionId: 'black-sun' } });
  assert.deepEqual(GMCampaignTargetService.resolve({ kind: 'faction', id: 'black-sun' }), { surfaceId: 'factions', statePatch: { focusedFactionId: 'black-sun' } });
}

console.log('Correction 4 (faction-contact target preserves exact Contact focus) passed.');

// ============================================================
// CORRECTION 5 — Trade empty-state truthfulness (static)
// ============================================================
{
  const template = await read('templates/apps/gm-datapad/surfaces/workspace.hbs');
  assert.match(template, /No active, pending-approval, or failed Trade activity\./, 'the Trade empty state must describe exactly the queues forActor() actually reads');
  assert.doesNotMatch(template, /No active or recent Trade activity\./, 'the pre-correction copy (which falsely implied recentCompleted was checked) must not still be present');
}

console.log('Correction 5 (Trade empty-state truthfulness) passed.');

// ============================================================
// FINAL CORRECTION 1 — per-Actor recovery legality bug
// (GMHealingTrigger.getHealingSummary() is a WHOLE-ROSTER search: with a
// defined party, a non-party world Actor is absent from BOTH
// eligibleActors/ineligibleActors, so the array-membership check
// silently reported eligible:false, ineligible:false for a perfectly
// valid living character. Fixed by using the canonical per-Actor
// predicate GMHealingTrigger.isEligibleForHealing(actor) directly.)
// ============================================================
{
  const { GMHealingTrigger } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js');

  const PARTY_PC = organicActor({ id: 'party-pc-1', name: 'Party PC', inParty: true });
  const NON_PARTY_NPC = organicActor({ id: 'non-party-npc-1', name: 'Non-Party Living NPC', inParty: false });
  NON_PARTY_NPC.type = 'character'; // a living, valid, non-Droid/Vehicle character
  installShim({ actors: [PARTY_PC, NON_PARTY_NPC] });

  for (const actor of [PARTY_PC, NON_PARTY_NPC]) {
    const context = await GMCampaignContextService.forActor(actor);
    const expectedEligible = GMHealingTrigger.isEligibleForHealing(actor);
    // PRE-BROADCAST INTEGRITY PASS item 5: renamed from the ambiguous
    // eligible/ineligible to naturalHealingEligible/naturalHealingIneligible
    // — this specifically means eligibility for GMHealingTrigger's
    // natural-healing workflow, not "can this Actor recover at all"
    // (that broader concept stays on card.restEligible/repairEligible).
    assert.equal(context.operations.recovery.naturalHealingEligible, expectedEligible, `forActor(${actor.id}).operations.recovery.naturalHealingEligible must equal the canonical per-Actor predicate`);
    assert.equal(context.operations.recovery.naturalHealingIneligible, !expectedEligible, `forActor(${actor.id}).operations.recovery.naturalHealingIneligible must be the exact logical complement`);
    assert.notEqual(context.operations.recovery.naturalHealingEligible, false && context.operations.recovery.naturalHealingIneligible === false, 'naturalHealingEligible and naturalHealingIneligible must never BOTH be false for a resolvable Actor');
  }

  // The non-party NPC is the case that was broken pre-correction: with a
  // defined party (PARTY_PC), the old array-membership check would have
  // found NON_PARTY_NPC in neither array.
  const nonPartyContext = await GMCampaignContextService.forActor(NON_PARTY_NPC);
  assert.equal(nonPartyContext.operations.recovery.naturalHealingEligible, true, 'a living, non-Droid/Vehicle, HP>0 character must be eligible regardless of party membership');
  assert.equal(nonPartyContext.operations.recovery.naturalHealingIneligible, false);

  // A Droid must be correctly ineligible via the same direct predicate.
  const DROID = { id: 'droid-elig-1', name: 'Repair Droid', type: 'droid', uuid: 'Actor.droid-elig-1', system: { hp: { value: 10, max: 10 }, isDroid: true }, effects: [], flags: {}, getFlag: () => undefined };
  installShim({ actors: [PARTY_PC, DROID] });
  const droidContext = await GMCampaignContextService.forActor(DROID);
  assert.equal(droidContext.operations.recovery.naturalHealingEligible, false, 'a Droid must never be reported eligible for the natural-healing trigger');
  assert.equal(droidContext.operations.recovery.naturalHealingIneligible, true);
}

console.log('Final Correction 1 (per-Actor recovery legality, party-independent) passed.');

// ============================================================
// FINAL CORRECTION 2 — eliminate the double buildActorCard() call on a
// Workspace selected-Actor render.
// ============================================================
{
  const SELECTED = organicActor({ id: 'selected-once-1', name: 'Selected Once PC' });
  installShim({ actors: [SELECTED] });

  let callCount = 0;
  const originalBuildActorCard = GMCombatRecoveryService.buildActorCard;
  GMCombatRecoveryService.buildActorCard = (actor) => { callCount++; return originalBuildActorCard.call(GMCombatRecoveryService, actor); };
  try {
    const vm = await GMWorkspaceSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedActorId: 'selected-once-1' }) });
    assert.equal(callCount, 1, 'GMCombatRecoveryService.buildActorCard(selectedActor) must be called exactly ONCE per Workspace render — forActor() computes it once and Workspace must consume that same card, never recompute it');
    assert.ok(vm.selection.operations.recovery, 'the Workspace VM must still expose the real recovery card via the single shared computation');
    assert.equal(vm.selection.operations.recovery.id, 'selected-once-1');
  } finally {
    GMCombatRecoveryService.buildActorCard = originalBuildActorCard;
  }
}

console.log('Final Correction 2 (single buildActorCard() call per Workspace render) passed.');

// ============================================================
// FINAL CORRECTION 3 — Home recovery attention preserves party-first
// scope; it must not silently expand to every managed world Actor when
// a campaign party is defined.
// ============================================================

// A. with a defined party: the party PC gets a Home item, a wounded
//    NON-party NPC does not.
{
  const PARTY_PC = organicActor({ id: 'scope-party-pc', name: 'Scope Party PC', hp: 5, hpMax: 20, inParty: true });
  const NON_PARTY_NPC = organicActor({ id: 'scope-nonparty-npc', name: 'Scope Non-Party NPC', hp: 5, hpMax: 20, inParty: false });
  installShim({ actors: [PARTY_PC, NON_PARTY_NPC] });
  const items = await GMCampaignContextService.attentionItems();
  const recoveryIds = items.filter(item => item.kind === 'recovery').map(item => item.target?.id);
  assert.ok(recoveryIds.includes('scope-party-pc'), 'a wounded DEFINED-party PC must produce a Home recovery item');
  assert.ok(!recoveryIds.includes('scope-nonparty-npc'), 'with a defined party, a wounded NON-party world NPC must NOT flood Home recovery attention — this is a scope decision, not merely the eligible/needsAttention semantic fix');
}

// B. a wounded PARTY Droid may produce truthful repair attention, never
//    organic-rest wording.
{
  const PARTY_PC = organicActor({ id: 'scope-party-pc-2', name: 'Scope Party PC 2', inParty: true });
  const PARTY_DROID = { id: 'scope-party-droid', name: 'Scope Party Droid', type: 'droid', uuid: 'Actor.scope-party-droid', system: { hp: { value: 0, max: 20 }, isDroid: true }, effects: [], flags: { [`foundryvtt-swse`]: { gmPartyMember: true } }, getFlag: (_scope, key) => (key === 'gmPartyMember' ? true : undefined) };
  installShim({ actors: [PARTY_PC, PARTY_DROID] });
  const items = await GMCampaignContextService.attentionItems();
  const droidItem = items.find(item => item.kind === 'recovery' && item.target?.id === 'scope-party-droid');
  assert.ok(droidItem, 'a downed party Droid must still produce a recovery/repair attention item');
  assert.doesNotMatch(droidItem.detail, /eligible for natural healing/i);
  assert.match(droidItem.detail, /repair/i);
}

// C. with NO defined party at all, a wounded managed Actor still
//    produces a Home item (the explicit fallback).
{
  const NO_PARTY_WOUNDED = organicActor({ id: 'scope-no-party-1', name: 'No Party Wounded', hp: 5, hpMax: 20, inParty: false });
  installShim({ actors: [NO_PARTY_WOUNDED] });
  const items = await GMCampaignContextService.attentionItems();
  assert.ok(items.find(item => item.kind === 'recovery' && item.target?.id === 'scope-no-party-1'), 'with no defined campaign party at all, a wounded managed Actor must still surface via the explicit fallback');
}

console.log('Final Correction 3 (Home recovery attention stays party-first, falls back to the managed roster only when no party is defined) passed.');

console.log('PHASE 7 INDEPENDENT REVIEW CORRECTION PASS regression suite passed (recovery eligible != needs attention; canonical Condition Track field; Faction Open-in-Workspace world-Actor truthfulness; Organization Role exact Contact-focus preservation; Trade empty-state truthfulness; per-Actor recovery legality independent of party roster membership; single buildActorCard() call per Workspace render; Home recovery attention stays party-first).');
