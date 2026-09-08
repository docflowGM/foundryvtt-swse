import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 6 CORRECTION PASS (Correction 9):
// proves a custom-purchase approval's SELECTION identity survives another
// request being added/removed/reordered before the destination Approvals
// VM builds — an array index alone cannot do this, since the record that
// was "index 1" a moment ago may now be a different record entirely.
//
// BUG-CATEGORY regression proof: pre-correction, GMCampaignContextService
// .attentionItems() and GMApprovalsSurfaceService both addressed a custom
// approval purely by array index (`custom:<index>`). A Home attention item
// built for request B (index 1) would, after request A (index 0)
// disappeared, silently resolve to whatever now occupies index 1 — B
// itself, now shifted to index 0, would no longer match.

registerFoundryPathLoader();

function installShim() {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: { contents: [], get: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() },
      users: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
}

function fakeHost(storeApprovals) {
  return {
    pendingDroids: [],
    storeApprovals,
    approvalEditMode: false,
    approvalDenyMode: false,
    selectedApprovalKey: null,
    async _loadPendingDroids() { /* no droid fixtures needed for this test */ },
    async _loadStorePendingApprovals() { /* storeApprovals is already seeded directly */ }
  };
}

const { GMApprovalsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalsSurfaceService.js');

const REQUEST_A = { id: 'pending_droid_aaa', type: 'droid', draftActorId: '', ownerActorId: '', costCredits: 500, draftData: { name: 'Droid A' } };
const REQUEST_B = { id: 'pending_droid_bbb', type: 'droid', draftActorId: '', ownerActorId: '', costCredits: 900, draftData: { name: 'Droid B' } };

// --- stableKey is exposed and index-independent ----------------------------
{
  installShim();
  const host = fakeHost([REQUEST_A, REQUEST_B]);
  const vm = await GMApprovalsSurfaceService.buildViewModel(host);
  const rowA = vm.approvalRequests.find(r => r.title === 'Droid A');
  const rowB = vm.approvalRequests.find(r => r.title === 'Droid B');
  assert.equal(rowA.key, 'custom:0');
  assert.equal(rowA.stableKey, 'custom-id:pending_droid_aaa');
  assert.equal(rowB.key, 'custom:1');
  assert.equal(rowB.stableKey, 'custom-id:pending_droid_bbb');
}

// --- THE ACTUAL BUG: select B via its stable id, then A disappears from
// the queue (reorder) before the next VM build — B must still be selected,
// never whatever now occupies its old index.
{
  installShim();
  const host = fakeHost([REQUEST_A, REQUEST_B]);
  // Simulate Home navigating with the STABLE key GMCampaignContextService
  // .attentionItems() now builds for a record with a real id.
  host.selectedApprovalKey = 'custom-id:pending_droid_bbb';
  let vm = await GMApprovalsSurfaceService.buildViewModel(host);
  assert.equal(vm.selectedApproval.title, 'Droid B', 'selecting by stableKey must resolve the real record, not fall back to the first request');
  assert.equal(vm.selectedApproval.key, 'custom:1', 'the resolved request must still carry its own current index-based key for the mutation buttons');

  // Request A is approved/removed by another client — B shifts to index 0.
  host.storeApprovals = [REQUEST_B];
  vm = await GMApprovalsSurfaceService.buildViewModel(host);
  assert.equal(vm.selectedApproval.title, 'Droid B', 'B must remain selected after A disappears and the array reindexes — an index-only selection would have silently pointed at whatever is now index 1 (nothing) or fallen back to the first request');
  assert.equal(vm.selectedApproval.key, 'custom:0', 'mutation buttons must pick up the fresh current index for B after reindexing');
}

// --- a legacy record with no persistent id still selects by the old
// index-based key (backward compatibility, never rewritten at render time)
{
  installShim();
  const legacyRequest = { type: 'vehicle', draftActorId: '', ownerActorId: '', costCredits: 200, draftData: { name: 'Legacy Ship' } };
  const host = fakeHost([legacyRequest]);
  host.selectedApprovalKey = 'custom:0';
  const vm = await GMApprovalsSurfaceService.buildViewModel(host);
  assert.equal(vm.selectedApproval.title, 'Legacy Ship');
  assert.equal(vm.selectedApproval.stableKey, '', 'a record with no persistent id must never fabricate one');
}

console.log('Approvals stable target identity passed (stableKey exposed for records with a real persistent id; selection by stableKey survives another request disappearing/reindexing; legacy id-less records still select by the old index key; mutation buttons always read the fresh current index).');
