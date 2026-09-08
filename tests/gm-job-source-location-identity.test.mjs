import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// GM Datapad ecosystem redesign — Phase 4: proves the real gap found during
// the Job authority/creation-path audit (4B/4K) and its fix — a Job
// created from a Location (LocationJobBridgeService.buildDraftFromLocation)
// carried a draft.location, but nothing between wizard prefill and
// HolonetMessengerService.createJobPosting()/_gmCreateJobPosting() ever
// persisted it onto the created Job: the contract wizard's create-form had
// no field for it, and the job metadata object built in
// _gmCreateJobPosting() had no field to store it in. A Job made from a
// Location silently lost that relationship the moment it was created.
//
// BUG-CATEGORY regression proof (a real defect, not a from-scratch design
// contract): this exact executed assertion — HolonetMessengerService
// ._normalizeJobSourceLocation() existing and normalizing a real
// {locationId, locationName} pair — fails against the pre-Phase-4 source
// (the method does not exist at all) and passes after. The full
// createJobPosting()/_gmCreateJobPosting() call chain is not exercised
// end-to-end here (it triggers live thread-creation/messaging side effects
// this repo's Node harness does not shim); the static source-wiring
// assertions below instead pin that every hop between the wizard's hidden
// fields and this normalization method is actually connected, matching
// this codebase's established pattern (e.g.
// tests/gm-surface-render-seams.test.mjs) for proving a call chain that
// cannot be instantiated end-to-end under Node.

registerFoundryPathLoader();

const { HolonetMessengerService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js');

// --- 1: the real normalization method, executed ---------------------------
{
  const normalized = HolonetMessengerService._normalizeJobSourceLocation({ locationId: 'mos-eisley', locationName: 'Mos Eisley' });
  assert.deepEqual(normalized, { locationId: 'mos-eisley', locationName: 'Mos Eisley' });
}

// --- 2: no real locationId -> null, never a fabricated relationship ------
{
  assert.equal(HolonetMessengerService._normalizeJobSourceLocation(null), null);
  assert.equal(HolonetMessengerService._normalizeJobSourceLocation({}), null);
  assert.equal(HolonetMessengerService._normalizeJobSourceLocation({ locationName: 'Nowhere' }), null, 'a name with no id must not be treated as a real relationship');
}

// --- 3: accepts the {id, name} shape too (LocationJobBridgeService's own
// draft.location field uses id/name, not locationId/locationName) ---------
{
  const normalized = HolonetMessengerService._normalizeJobSourceLocation({ id: 'nal-hutta', name: 'Nal Hutta' });
  assert.deepEqual(normalized, { locationId: 'nal-hutta', locationName: 'Nal Hutta' });
}

console.log('HolonetMessengerService._normalizeJobSourceLocation() contract passed.');

// --- Static wiring proof: every hop from the wizard's hidden fields to
// this normalization method is actually connected. -------------------------
const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

{
  const template = await read('templates/apps/gm-datapad/surfaces/jobs/contract-wizard.hbs');
  assert.match(template, /name="sourceLocationId" value="\{\{jobBoard\.creation\.prefill\.location\.id\}\}"/, 'the wizard must prefill sourceLocationId from the real Location-sourced draft');
  assert.match(template, /name="sourceLocationName" value="\{\{jobBoard\.creation\.prefill\.location\.name\}\}"/);
}

{
  const controller = await read('scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js');
  assert.match(controller, /const sourceLocationId = text\('sourceLocationId'\);/, 'the create-form submit handler must read the new hidden field');
  assert.match(controller, /const sourceLocation = sourceLocationId \? \{ locationId: sourceLocationId, locationName: text\('sourceLocationName'\) \} : null;/);
  assert.match(controller, /sourceLocation,\s*\n\s*objectives,/, 'sourceLocation must actually be passed into the createJobPosting() call');
  assert.match(controller, /'sourceLocationId', 'sourceLocationName'/, 'sourceLocationId/Name must be cleared when the prefill is discarded, like every other prefill field');
}

{
  const service = await read('scripts/holonet/subsystems/holonet-messenger-service.js');
  assert.match(service, /static async createJobPosting\(\{[^}]*sourceLocation = null[^}]*\}\)/, 'createJobPosting() must accept sourceLocation');
  assert.match(service, /static async _gmCreateJobPosting\(\{[^}]*sourceLocation = null[^}]*\}[^)]*\)/, '_gmCreateJobPosting() must accept sourceLocation');
  assert.match(service, /sourceLocation: normalizedSourceLocation,/, 'the created job metadata object must actually store the normalized sourceLocation');
  assert.match(service, /sourceLocation: clone\.sourceLocation \|\| null,/, 'duplicateArchivedAsDraft (repost/clone) must preserve an existing Job\'s sourceLocation');
}

console.log('Job source-Location creation-path wiring passed (wizard prefill -> controller submit -> HolonetMessengerService, end to end).');
