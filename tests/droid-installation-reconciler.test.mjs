import assert from 'node:assert/strict';
import { diagnoseDroidInstallationDrift, DROID_INSTALLATION_DRIFT_ISSUE } from '../scripts/domain/droids/droid-installation-reconciler.js';

// Phase 2 — Droid Authority Consolidation. Before this phase, removing a
// droid system through the Upgrade Workshop deleted the
// system.installedSystems ledger key but never touched a matching embedded
// Item, so the Item became the new highest-precedence source once the
// ledger entry was gone and kept reporting the component as installed and
// active. diagnoseDroidInstallationDrift() flags exactly that shape on a
// resolver result so a GM/dev tool can decide whether to repair it. It is
// pure (fixture-driven here) so it can run under plain Node the same way
// the Phase 1 resolver tests do.

function component(overrides) {
  return {
    canonicalId: 'heuristic-processor',
    sources: [],
    ...overrides
  };
}

// A component with no installedLedger source at all, but an active
// embedded Item, is flagged as orphaned drift.
{
  const resolution = {
    components: [
      component({
        sources: [{ kind: 'embeddedItem', itemId: 'itemAbc', active: true }]
      })
    ]
  };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM);
  assert.equal(issues[0].canonicalId, 'heuristic-processor');
  assert.deepEqual(issues[0].itemIds, ['itemAbc']);
}

// A component backed by an installedLedger source (even if it also has an
// embedded Item source) is NOT flagged — this is the normal, reconciled
// shape, not drift.
{
  const resolution = {
    components: [
      component({
        sources: [
          { kind: 'installedLedger', active: true },
          { kind: 'embeddedItem', itemId: 'itemAbc', active: true }
        ]
      })
    ]
  };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 0);
}

// A component whose only embedded-Item source is inactive is not flagged —
// there is no mechanically-active drift to repair.
{
  const resolution = {
    components: [
      component({
        sources: [{ kind: 'embeddedItem', itemId: 'itemAbc', active: false }]
      })
    ]
  };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 0);
}

// A component whose only source is a droidSystems record (no ledger, no
// Item) is not flagged — this is the ordinary, unproblematic shape for a
// droid built entirely through chargen/follower creation, which
// intentionally never populates installedSystems.
{
  const resolution = {
    components: [
      component({
        sources: [{ kind: 'droidSystemsRecord', active: true }]
      })
    ]
  };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 0);
}

// Multiple embedded Item sources for the same orphaned component all get
// collected into one issue's itemIds.
{
  const resolution = {
    components: [
      component({
        sources: [
          { kind: 'embeddedItem', itemId: 'itemA', active: true },
          { kind: 'embeddedItem', itemId: 'itemB', active: true }
        ]
      })
    ]
  };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0].itemIds.sort(), ['itemA', 'itemB']);
}

// Diagnosis performs no mutation and is safe to call repeatedly.
{
  const resolution = {
    components: [component({ sources: [{ kind: 'embeddedItem', itemId: 'itemAbc', active: true }] })]
  };
  const before = JSON.parse(JSON.stringify(resolution));
  diagnoseDroidInstallationDrift(resolution);
  diagnoseDroidInstallationDrift(resolution);
  assert.deepEqual(resolution, before);
}

console.log('Droid installation drift diagnosis guards passed.');
