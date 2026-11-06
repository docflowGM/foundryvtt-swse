/**
 * Production wiring for the initial droid installation projection (Gate C-3A).
 *
 * Creation is not a Store purchase: nothing here charges credits, quotes, or
 * calls a transaction. It only turns the finalized, already-accounted build
 * into the matching `system.installedSystems` records, inside the creation
 * lifecycle's own mutation (the chargen mutation plan / the follower creation
 * transaction), so the existing atomicity and rollback guarantees apply.
 *
 * A droid still in stock-statblock mode is never seeded: any ledger record
 * un-suppresses a component's modifiers (droid-mode-adapter), which would
 * double-count bonuses already baked into the published totals.
 */
import { getDroidPartDefinition, normalizeDroidPartId } from '/systems/foundryvtt-swse/scripts/data/droid-part-schema.js';
import { resolveDroidComponentSourceReview } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-component-source-review.js';
import { projectInitialInstallation } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-initial-installation.js';
import { resolveFollowerDroidSystems } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-planning.js';
import { isDroidStatblockMode } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';

export class DroidInitialInstallationError extends Error {
  constructor(unresolved) {
    super(`Droid initial installation cannot be committed: ${unresolved.map(u => `${u.id || '(unnamed)'} [${u.field}] - ${u.reason}`).join('; ')}`);
    this.name = 'DroidInitialInstallationError';
    this.code = 'DROID_INITIAL_INSTALLATION_UNRESOLVED';
    this.unresolved = unresolved;
  }
}

/**
 * @param {object} input
 * @param {object|null} input.actor            the actor being finalized (may be null in previews)
 * @param {string} input.seed                  stable per-actor seed
 * @param {object|null} input.droidSystems     finalized build draft
 * @returns {{seeded:boolean, installedSystems:object, droidSystems:object|null, unresolved:object[], skipped:object[], reason?:string}}
 */
export function buildInitialDroidInstallation({ actor = null, seed, droidSystems }) {
  const existingLedger = actor?.system?.installedSystems ?? {};
  if (actor && isDroidStatblockMode(actor)) {
    return {
      seeded: false, installedSystems: { ...existingLedger }, droidSystems: droidSystems ?? null,
      unresolved: [], skipped: [], reason: 'STOCK_STATBLOCK_MODE'
    };
  }
  return projectInitialInstallation({
    seed: String(seed ?? actor?.id ?? 'draft'),
    droidSystems,
    existingLedger,
    getDefinition: (id) => getDroidPartDefinition(id),
    normalizeId: normalizeDroidPartId,
    reviewComponent: (definition, context) => resolveDroidComponentSourceReview(definition?.source ?? definition, context)
  });
}

/** Same as buildInitialDroidInstallation but throws before anything is committed if a selection is unresolved. */
export function requireInitialDroidInstallation(input) {
  const result = buildInitialDroidInstallation(input);
  if (result.unresolved.length) throw new DroidInitialInstallationError(result.unresolved);
  return result;
}

/**
 * Chargen: finalize the build draft AND its ledger in the one mutation plan the
 * subtype adapter returns (ActorEngine applies it). Throws, before the plan is
 * returned, if a selection is unresolved.
 */
export function applyInitialInstallationToPlan(mutationPlan, { actor = null, seed, droidSystems = null } = {}) {
  const installation = requireInitialDroidInstallation({ actor, seed, droidSystems });
  mutationPlan.set['system.droidSystems'] = installation.droidSystems;
  if (installation.seeded) mutationPlan.set['system.installedSystems'] = installation.installedSystems;
  return installation;
}

/**
 * Follower: the follower's finalized droid build plus the ledger it implies,
 * seeded by the follower's own id so the materialize step, the update step,
 * retries and recovery all write identical records. `draft` is the untouched
 * creation-time selection (kept in the progression config); `droidSystems` is
 * the mirror that carries the ledger's identities; `installedSystems` is null
 * when there is nothing new to write.
 */
export function resolveFollowerDroidInstallation(follower, droidConfig = {}) {
  const draft = resolveFollowerDroidSystems(droidConfig);
  const installation = requireInitialDroidInstallation({ actor: follower, seed: follower?.id, droidSystems: draft });
  return {
    draft,
    droidSystems: installation.droidSystems,
    installedSystems: installation.seeded ? installation.installedSystems : null
  };
}
