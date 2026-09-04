import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 7 addendum I: audits whether
// Workspace's "Assign Job" action (_openJobWizardForActor(), which stuffs
// assignedActorId/assignedActorUuid/assignedActorName into a pendingJobDraft)
// survives into canonical Job storage, or is prefill-only.
//
// THIS IS A PURE AUDIT/AUTHORITY-BOUNDARY TEST, NOT A BUG FIX. Nothing
// here changes behavior — it locks in, as an executable regression guard,
// the traced finding that assignedActorId/assignedActorUuid/assignedActorName
// are dropped between the Workspace draft and the real
// HolonetMessengerService.createJobPosting() call: they are read nowhere
// in the contract-wizard's FormData submit handler
// (GMJobBoardSurfaceController._wireCreateForms), never rendered as a form
// field in jobs.hbs, and createJobPosting()'s own parameter list has no
// such field. Per the addendum's option B: Workspace's Assign Job action
// is documented as a Job PREFILL only (title/briefing/instructions text) —
// it must never be presented as though a persistent Actor<->Job
// assignment relationship exists, because none does. If a future change
// threads a stable assigned-Actor identity through Job creation, this
// test's failure is the intended signal to update this audit finding
// (and GMCampaignContextService.forJob()) rather than an accidental break.

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const workspaceController = await read('scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js');
const jobBoardController = await read('scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js');
const messengerService = await read('scripts/holonet/subsystems/holonet-messenger-service.js');
const jobsTemplate = await read('templates/apps/gm-datapad/surfaces/jobs.hbs');

// --- Workspace really does draft these three fields (the origin) ---------
assert.match(workspaceController, /assignedActorId: actor\.id,/, 'sanity: Workspace must still draft assignedActorId (confirming what this audit is tracing)');
assert.match(workspaceController, /assignedActorUuid: actor\.uuid/, 'sanity: Workspace must still draft assignedActorUuid');
assert.match(workspaceController, /assignedActorName: actor\.name,/, 'sanity: Workspace must still draft assignedActorName');

// --- the contract wizard's create-form submit handler never reads them ---
const createFormsSection = jobBoardController.slice(jobBoardController.indexOf('_wireCreateForms'), jobBoardController.indexOf('_wireDistributionForms'));
assert.doesNotMatch(createFormsSection, /assignedActorId/, 'the Job contract create-form submit handler must not read assignedActorId — if it did, the field would actually be threading through, and this audit finding would be stale');
assert.doesNotMatch(createFormsSection, /assignedActorUuid/, 'the Job contract create-form submit handler must not read assignedActorUuid');
assert.doesNotMatch(createFormsSection, /assignedActorName/, 'the Job contract create-form submit handler must not read assignedActorName');

// --- the wizard template never even renders them as a form field ---------
assert.doesNotMatch(jobsTemplate, /assignedActorId/, 'jobs.hbs must not render assignedActorId as a form field — the Workspace draft value never reaches the DOM');
assert.doesNotMatch(jobsTemplate, /assignedActorUuid/);
assert.doesNotMatch(jobsTemplate, /assignedActorName/);

// --- HolonetMessengerService.createJobPosting()'s own parameter list -----
const createJobPostingSignature = messengerService.slice(
  messengerService.indexOf('static async createJobPosting('),
  messengerService.indexOf('static async createJobPosting(') + 800
);
assert.doesNotMatch(createJobPostingSignature, /assignedActorId/, 'createJobPosting() has no assignedActorId parameter — the value cannot survive into canonical Job storage even if a future caller tried to pass it positionally');
assert.doesNotMatch(createJobPostingSignature, /assignedActorUuid/);
assert.doesNotMatch(createJobPostingSignature, /assignedActorName/);

console.log('Assign Job persistence audit passed (assignedActorId/assignedActorUuid/assignedActorName are drafted by Workspace but read by no form, rendered by no template field, and accepted by no createJobPosting() parameter — Assign Job is a title/briefing/instructions PREFILL only; no persistent Actor<->Job assignment relationship is claimed anywhere in this codebase).');
