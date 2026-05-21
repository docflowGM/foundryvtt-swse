// scripts/governance/mutation/mutation-router.js
//
// ============================================================
// FUTURE SCAFFOLD — UNWIRED
// ============================================================
// Status:       NOT imported by any runtime file.
// Do not import this file yet.
// ActorEngine is the live mutation gateway today.
//
// Purpose:
//   Documents the intended route-dispatch layer that sits between
//   MutationGateway (which prepares the case-file) and the
//   Executor(s) (which perform Foundry document updates).
//   No behavior lives here yet.
// ============================================================

// ============================================================
// INTENDED ROUTES
// ============================================================
//
//   actor-update                 — standard ActorEngine.updateActor path
//   embedded-document-create     — actor.createEmbeddedDocuments
//   embedded-document-update     — actor.updateEmbeddedDocuments
//   embedded-document-delete     — actor.deleteEmbeddedDocuments
//   snapshot-restore             — SnapshotService.restoreFromSnapshot
//   progression-commit           — applyProgression / applyDelta atomic path
//   derived-rebuild              — recalcAll (DerivedCalculator + ModifierEngine)
//
// Route is resolved from operationCategory + embeddedName in the
// preparedMutation case-file produced by MutationGateway.
//
// ============================================================

/**
 * MutationRouter
 *
 * FUTURE SCAFFOLD — not wired into runtime code.
 *
 * Intended responsibility: Inspect the prepared mutation case-file and
 * dispatch to the appropriate Executor. Enforces that each route is
 * handled by exactly one Executor and that no route falls through silently.
 */
export class MutationRouter {

  /**
   * All known routes. Defined here so callers can reference by name
   * rather than using raw strings.
   */
  static ROUTES = Object.freeze({
    ACTOR_UPDATE:                'actor-update',
    EMBEDDED_DOCUMENT_CREATE:    'embedded-document-create',
    EMBEDDED_DOCUMENT_UPDATE:    'embedded-document-update',
    EMBEDDED_DOCUMENT_DELETE:    'embedded-document-delete',
    SNAPSHOT_RESTORE:            'snapshot-restore',
    PROGRESSION_COMMIT:          'progression-commit',
    DERIVED_REBUILD:             'derived-rebuild',
  });

  /**
   * Resolve the execution route from a prepared mutation case-file.
   *
   * Intended inputs:  preparedMutation (from MutationGateway)
   * Intended outputs: route string (one of MutationRouter.ROUTES)
   *
   * @param {Object} preparedMutation
   * @returns {string} route
   */
  static resolveRoute(preparedMutation) {
    throw new Error('MutationRouter.resolveRoute is future scaffolding and is not wired.');
  }

  /**
   * Dispatch a prepared mutation to the correct Executor.
   *
   * Intended inputs:  actor, preparedMutation
   * Intended outputs: Foundry update result
   *
   * @param {Actor}  actor
   * @param {Object} preparedMutation
   * @param {Object} options
   * @returns {Promise<Object>} Foundry update result
   */
  static async dispatch(actor, preparedMutation, options = {}) {
    throw new Error('MutationRouter.dispatch is future scaffolding and is not wired.');
  }
}
