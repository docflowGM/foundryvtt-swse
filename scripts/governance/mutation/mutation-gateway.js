// scripts/governance/mutation/mutation-gateway.js
//
// ============================================================
// FUTURE SCAFFOLD — UNWIRED
// ============================================================
// Status:       NOT imported by any runtime file.
// Do not import this file yet.
// ActorEngine is the live mutation gateway today.
//
// Purpose:
//   Documents the intended long-term split of ActorEngine's
//   orchestration responsibilities into a dedicated gateway/
//   router/executor pipeline. No behavior lives here yet.
//   Runtime migration requires a dedicated phase + parity tests.
//
// Relationship to C3.3:
//   C3.3 extracted live diagnostics and soft guardrails into
//   MutationBoundaryService. This skeleton documents where those
//   services plug into the eventual full pipeline.
// ============================================================

// ============================================================
// INTENDED FUTURE ARCHITECTURE
// ============================================================
//
//   Player / sheet / progression / combat request
//       ↓
//   ActorEngine  (public facade — stays public forever)
//       ↓
//   MutationGateway  (opens the mutation case-file; coordinates pipeline)
//       ↓  ↓  ↓
//   MutationNormalizationService  (payload normalization — live in C3.2)
//   MutationBoundaryService       (diagnostics + guardrails — live in C3.3)
//   [future] MutationValidator    (deep semantic validation)
//       ↓
//   MutationRouter  (chooses execution route based on operation type)
//       ↓
//   Executor(s)  (perform the approved Foundry document update)
//       ↓
//   Post-mutation stabilizer
//       (recalcAll / _refreshOpenActorApps — stays in ActorEngine)
//
// ============================================================

// ============================================================
// INTENDED preparedMutation shape
// ============================================================
//
//   {
//     operationCategory,    // string — from MutationBoundaryService.classifyOperationIntent
//     normalizedData,       // Object — from MutationNormalizationService.normalizePayload
//     flatData,             // Object — flattenObject(normalizedData)
//     warnings,             // string[] — normalization + boundary warnings
//     guardrailActions,     // Object — redirects and warn-only keys from Phase 3
//     route,                // string — from MutationRouter.resolveRoute
//     meta,                 // Object — forwarded options.meta
//     source,               // string — forwarded options.source
//     traceId,              // string — mutation depth trace identifier
//   }
//
// ============================================================

/**
 * MutationGateway
 *
 * FUTURE SCAFFOLD — not wired into runtime code.
 *
 * Intended responsibility: Open and coordinate the mutation case-file for a
 * single actor update request. Runs the payload pipeline (normalize →
 * classify → audit → guardrail) and hands the prepared mutation to
 * MutationRouter for execution.
 *
 * ActorEngine delegates to this after its own pre-checks (in-flight guard,
 * loop detection, migration guard). ActorEngine remains the public facade.
 */
export class MutationGateway {

  /**
   * Prepare an actor update: normalize, classify, audit, apply guardrails.
   * Returns a prepared mutation case-file ready for MutationRouter.
   *
   * Intended inputs:  actor, updateData, options
   * Intended outputs: preparedMutation (see shape above)
   *
   * @param {Actor}  actor
   * @param {Object} updateData
   * @param {Object} options
   * @returns {Object} preparedMutation
   */
  static prepareActorUpdate(actor, updateData, options = {}) {
    throw new Error('MutationGateway.prepareActorUpdate is future scaffolding and is not wired.');
  }

  /**
   * Execute a prepared mutation via MutationRouter.
   * Applies the approved Foundry document update and triggers recalc.
   *
   * Intended inputs:  actor, preparedMutation, options
   * Intended outputs: Foundry update result
   *
   * @param {Actor}  actor
   * @param {Object} preparedMutation
   * @param {Object} options
   * @returns {Promise<Object>} Foundry update result
   */
  static async executeActorUpdate(actor, preparedMutation, options = {}) {
    throw new Error('MutationGateway.executeActorUpdate is future scaffolding and is not wired.');
  }

  /**
   * Prepare an embedded document update.
   * Runs embedded-specific diagnostics (auditEmbeddedItemBoundaries) and
   * P0.1 type-stripping before handing to MutationRouter.
   *
   * @param {Actor}    actor
   * @param {string}   embeddedName
   * @param {Object[]} updates
   * @param {Object}   options
   * @returns {Object} preparedMutation
   */
  static prepareEmbeddedUpdate(actor, embeddedName, updates, options = {}) {
    throw new Error('MutationGateway.prepareEmbeddedUpdate is future scaffolding and is not wired.');
  }

  /**
   * Execute a prepared embedded document mutation.
   *
   * @param {Actor}  actor
   * @param {Object} preparedMutation
   * @param {Object} options
   * @returns {Promise<Object>} Foundry update result
   */
  static async executeEmbeddedUpdate(actor, preparedMutation, options = {}) {
    throw new Error('MutationGateway.executeEmbeddedUpdate is future scaffolding and is not wired.');
  }
}
