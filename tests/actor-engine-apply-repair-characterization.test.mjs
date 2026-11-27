import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// AE characterization (RETAIN_PENDING_PARITY): ActorEngine.applyRepair (called by the repair panel) -- only `removeItem` mutates; acquisition and class
// adjustment proposals are informational and refused; a governance block stops the delete; unknown types throw.
registerFoundryPathLoader();
installFoundryShimGlobals();
const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { PreflightValidator } = await import('/systems/foundryvtt-swse/scripts/governance/enforcement/preflight-validator.js');
const { MissingPrereqsTracker } = await import('/systems/foundryvtt-swse/scripts/governance/integrity/missing-prereqs-tracker.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const l of ['info', 'warn', 'error', 'debug', 'log']) if (SWSELogger[l]) SWSELogger[l] = () => {};

const saved = { del: ActorEngine.deleteEmbeddedDocuments, pf: PreflightValidator.validateBeforeMutation, mp: MissingPrereqsTracker.getMissingPrereqs };
const deletes = []; let outcome = 'allow';
ActorEngine.deleteEmbeddedDocuments = async (a, t, ids, o) => { deletes.push([t, ids, o]); };
PreflightValidator.validateBeforeMutation = async () => ({ outcome, reason: 'because' });
MissingPrereqsTracker.getMissingPrereqs = () => [{ itemId: 'other' }];
try {
  const actor = { name: 'A', items: [] };
  await assert.rejects(() => ActorEngine.applyRepair(null, {}), /no actor/);
  await assert.rejects(() => ActorEngine.applyRepair(actor, null), /without proposal/);
  await assert.rejects(() => ActorEngine.applyRepair(actor, { type: 'bogus' }), /Unknown repair type/);
  const acq = await ActorEngine.applyRepair(actor, { type: 'suggestAcquisition', candidateId: 'c', candidateName: 'C' });
  assert.equal(acq.success, false); assert.equal(acq.suggestion.candidateId, 'c');
  const cls = await ActorEngine.applyRepair(actor, { type: 'classAdjustment', details: { x: 1 } });
  assert.equal(cls.success, false); assert.deepEqual(cls.suggestion.details, { x: 1 });
  assert.equal(deletes.length, 0, 'informational proposals write nothing');
  outcome = 'block';
  const blocked = await ActorEngine.applyRepair(actor, { type: 'removeItem', itemId: 'i1', reason: 'r' });
  assert.equal(blocked.success, false); assert.match(blocked.reason, /blocked by governance/); assert.equal(deletes.length, 0);
  outcome = 'allow';
  const done = await ActorEngine.applyRepair(actor, { type: 'removeItem', itemId: 'i1', reason: 'r' });
  assert.equal(done.success, true); assert.deepEqual(done.result, { deletedItemId: 'i1' });
  assert.deepEqual(deletes[0].slice(0, 2), ['Item', ['i1']]); assert.equal(deletes[0][2].source, 'repair');
  assert.equal(done.itemViolationsResolved, true); assert.equal(done.remainingViolations, 1);
} finally { ActorEngine.deleteEmbeddedDocuments = saved.del; PreflightValidator.validateBeforeMutation = saved.pf; MissingPrereqsTracker.getMissingPrereqs = saved.mp; }
console.log('actor-engine-apply-repair-characterization: ok');
