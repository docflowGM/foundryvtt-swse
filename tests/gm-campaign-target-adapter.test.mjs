import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// GM Datapad ecosystem redesign — Phase 6: proves GMCampaignTargetService's
// mapping from a {kind, id} campaign target to the real, already-stable
// per-surface navigateToSurface() selection contract established across
// Phases 2-5 — executed, not just source-string matched.

registerFoundryPathLoader();

const { GMCampaignTargetService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignTargetService.js');

assert.deepEqual(GMCampaignTargetService.location('loc-1'), { surfaceId: 'locations', statePatch: { selectedLocationId: 'loc-1' } });
assert.deepEqual(GMCampaignTargetService.faction('faction-1'), { surfaceId: 'factions', statePatch: { focusedFactionId: 'faction-1' } });
assert.deepEqual(GMCampaignTargetService.job('job-1'), { surfaceId: 'jobs', hostPatch: { selectedJobThreadId: 'job-1' } });
assert.deepEqual(GMCampaignTargetService.intel('intel-1'), { surfaceId: 'intel', statePatch: { selectedRecordId: 'intel-1' } });
assert.deepEqual(GMCampaignTargetService.skillChallenge('challenge-1'), { surfaceId: 'skill-challenges', statePatch: { selectedChallengeId: 'challenge-1' } });
assert.deepEqual(GMCampaignTargetService.trade('record-1'), { surfaceId: 'trade', hostPatch: { selectedTradeRecordId: 'record-1' } });
assert.deepEqual(GMCampaignTargetService.approval('droid:actor1'), { surfaceId: 'approvals', hostPatch: { selectedApprovalKey: 'droid:actor1' } });

// resolve() dispatches by kind, matching each dedicated method exactly.
assert.deepEqual(GMCampaignTargetService.resolve({ kind: 'job', id: 'job-1' }), GMCampaignTargetService.job('job-1'));
assert.deepEqual(GMCampaignTargetService.resolve({ kind: 'faction', id: 'faction-1' }), GMCampaignTargetService.faction('faction-1'));
assert.deepEqual(GMCampaignTargetService.resolve({ kind: 'intel', id: 'intel-1' }), GMCampaignTargetService.intel('intel-1'));
assert.deepEqual(GMCampaignTargetService.resolve({ kind: 'location', id: 'loc-1' }), GMCampaignTargetService.location('loc-1'));

// An actor target and an unknown kind both resolve to null — Actor is
// never a Datapad surface selection (callers open the real sheet), and an
// unrecognized kind must never silently produce a broken navigation call.
assert.equal(GMCampaignTargetService.resolve({ kind: 'actor', id: 'Actor.abc' }), null);
assert.equal(GMCampaignTargetService.resolve({ kind: 'unknown-thing', id: 'x' }), null);
assert.equal(GMCampaignTargetService.resolve({ kind: 'job', id: '' }), null, 'an empty id must never resolve to a navigable target');
assert.equal(GMCampaignTargetService.resolve(null), null);

console.log('GMCampaignTargetService target-adapter mapping passed (every real target kind maps to the exact stable per-surface selection contract; actor/unknown/empty-id never resolve).');
