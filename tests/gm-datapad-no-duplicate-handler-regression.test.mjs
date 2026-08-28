import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

// GM Datapad recovery — duplicate-handler / retired-compatibility regression.
//
// Before this pass, the GM Job Board had two independent handlers racing for
// every [data-job-status-action]/[data-job-transition-action] click:
//
//   1. GMControllerCompatibilityService._repairJobStatusContract patched
//      controller._wireStatusButtons (the real controller's own method was
//      shadowed by an instance-property monkeypatch) to call the public
//      HolonetMessengerService.threadAction()/transitionJobStatus() API.
//   2. GMInteractionRepairService._bindJobStatusRepair bound a ROOT-level,
//      CAPTURE-phase listener that always ran first (capture fires top-down
//      regardless of registration order) and called stopImmediatePropagation(),
//      so (1) — and the real controller's own listener underneath it — never
//      ran. It called the private HolonetMessengerService._gmTransitionJobStatus()
//      directly, bypassing the public API entirely.
//
// GMFactionRelationshipSurfaceController._mutate also called
// mutateShellOnly(operation, reason) — an argument-order bug that passed a
// function where mutateShellOnly's `host` parameter belongs and a string
// where its `mutation` function belongs, so every faction-surface mutation
// silently returned undefined without ever running.
//
// Both defects are fixed directly in the owning controller now, so
// GMControllerCompatibilityService has zero remaining patches and was
// deleted. These assertions pin the fix and must fail if either the deleted
// file or either handler collision reappears.

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

// 1. The compatibility patch service is gone, not just unused.
{
  assert.equal(
    existsSync(new URL('scripts/ui/shell/gm/GMControllerCompatibilityService.js', root)),
    false,
    'GMControllerCompatibilityService.js should have been deleted once its three patches were migrated or proven obsolete'
  );

  const registry = await read('scripts/ui/shell/gm/controllers/GMSurfaceControllerRegistry.js');
  assert.doesNotMatch(registry, /GMControllerCompatibilityService/, 'the surface controller registry must not reference the retired compatibility service');
}

// 2. The interaction-repair service no longer intercepts job status clicks
// at the root in the capture phase. Its remaining guardrails (checkbox
// feedback, modal bounds, viewport stabilization, Intel wizard hydration)
// are still-justified interim repairs documented in the recovery audit, not
// a second handler for a click a real controller already owns.
{
  const repair = await read('scripts/ui/shell/gm/GMInteractionRepairService.js');
  assert.doesNotMatch(repair, /_bindJobStatusRepair/, 'GMInteractionRepairService must not define a job-status repair handler');
  assert.doesNotMatch(repair, /_gmTransitionJobStatus/, 'GMInteractionRepairService must not call the private job-status transition API directly');
  assert.doesNotMatch(repair, /stopImmediatePropagation/, 'GMInteractionRepairService must not use stopImmediatePropagation to win a race against a real controller handler');
}

// 3. The Job Board controller's own _wireStatusButtons is the sole
// authoritative handler and calls the supported public API.
{
  const jobs = await read('scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js');
  const wireStatusButtonsMatches = jobs.match(/_wireStatusButtons\s*\(/g) ?? [];
  assert.equal(wireStatusButtonsMatches.length, 2, 'expected exactly one _wireStatusButtons definition and one call site in the real controller');
  assert.match(jobs, /HolonetMessengerService\.transitionJobStatus\(/, 'the real controller must call the supported public transitionJobStatus API');
}

// 4. GMFactionRelationshipSurfaceController._mutate calls mutateShellOnly
// with the host as the first argument (the real signature), not
// (operation, reason).
{
  const factions = await read('scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');
  assert.match(factions, /mutateShellOnly\(this\.host, operation, \{ reason, surfaceId: 'factions' \}\)/, 'GMFactionRelationshipSurfaceController._mutate must call mutateShellOnly(host, mutation, options)');
  assert.doesNotMatch(factions, /mutateShellOnly\(operation, reason\)/, 'GMFactionRelationshipSurfaceController._mutate must not pass (operation, reason) — mutateShellOnly\'s real signature is (host, mutation, options)');
}

// 5. The Dossier's live [data-gm-faction-action] contract is wired directly
// by the real controller (not only by a compatibility patch that no longer
// exists), and the controller no longer listens for the old, template-dead
// data-gm-faction-delete/-job/-intel attributes.
{
  const factions = await read('scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');
  assert.match(factions, /data-gm-faction-action/, 'the real Faction controller must wire the current data-gm-faction-action contract');
  assert.doesNotMatch(factions, /data-gm-faction-delete\]|data-gm-faction-job\]|data-gm-faction-intel\]/, 'the real Faction controller must not still target the retired data-gm-faction-delete/-job/-intel attributes');
}

console.log('GM Datapad duplicate-handler regression guards passed.');
