import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

registerFoundryPathLoader();

// GM Datapad ecosystem redesign — Phase 7 addendum G/O.5/O.6:
// GMCampaignTargetService.workspaceActor()/{kind:'workspace-actor'} is a
// genuinely distinct destination from {kind:'actor'} (which stays
// unsupported here on purpose — every existing surface opens the real
// Foundry Actor sheet for that kind, never a Datapad selection).
//
// PURE ADDITIVE DESIGN CONTRACT — workspaceActor()/{kind:'workspace-actor'}
// did not exist before this phase.

const { GMCampaignTargetService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignTargetService.js');

// --- workspaceActor() returns the real navigateToSurface() contract ------
{
  const target = GMCampaignTargetService.workspaceActor('chewie');
  assert.deepEqual(target, { surfaceId: 'workspace', statePatch: { selectedActorId: 'chewie' } });
}

// --- resolve({kind:'workspace-actor', id}) maps to the same target -------
{
  const target = GMCampaignTargetService.resolve({ kind: 'workspace-actor', id: 'chewie' });
  assert.deepEqual(target, { surfaceId: 'workspace', statePatch: { selectedActorId: 'chewie' } });
}

// --- {kind:'actor'} semantics are UNCHANGED by this addition — it must
// remain unsupported by the target translator (every existing surface
// opens the real Foundry sheet for it directly, never through resolve()).
{
  const target = GMCampaignTargetService.resolve({ kind: 'actor', id: 'chewie' });
  assert.equal(target, null, '{kind:"actor"} must remain unsupported by GMCampaignTargetService.resolve() — Phase 7 must not redefine what "actor" means');
}

// --- a missing id still yields null for the new kind too, matching every
// other kind's existing missing-id guard.
{
  assert.equal(GMCampaignTargetService.resolve({ kind: 'workspace-actor', id: '' }), null);
  assert.equal(GMCampaignTargetService.resolve({ kind: 'workspace-actor' }), null);
}

console.log('GMCampaignTargetService workspace-actor target passed (workspaceActor()/resolve("workspace-actor") select the Workspace surface via statePatch.selectedActorId; {kind:"actor"} remains unsupported and unchanged).');
