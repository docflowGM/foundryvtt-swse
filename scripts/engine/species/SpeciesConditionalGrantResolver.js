// scripts/engine/species/SpeciesConditionalGrantResolver.js
// Evaluates and executes deferred species bonus feat grants after actor mutations.
// Reads flags.swse.deferredSpeciesBonusFeats, evaluates structured requirements
// against live actor state, and creates feat items for newly qualifying grants.

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ProgressionContentAuthority } from "/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js";

/**
 * Evaluate a single structured requirement against the actor's live system data.
 * Returns false for unknown requirement types (safe default: do not grant).
 * @private
 */
function _evaluateRequirement(req, actorSystem) {
  if (req.type === 'skillTrained') {
    return actorSystem.skills?.[req.skill]?.trained === true;
  }
  if (req.type === 'attributeMin') {
    const key = req.attribute;
    if (!key) return false;
    // Prefer post-recalcAll derived total; fall back to summing canonical stored fields.
    const derivedTotal = actorSystem.derived?.attributes?.[key]?.total;
    const total = derivedTotal !== undefined
      ? derivedTotal
      : ((actorSystem.attributes?.[key]?.base ?? 10)
        + (actorSystem.attributes?.[key]?.racial ?? 0)
        + (actorSystem.attributes?.[key]?.enhancement ?? 0)
        + (actorSystem.attributes?.[key]?.temp ?? 0));
    return Number.isFinite(total) && total >= (req.min ?? 0);
  }
  if (req.type === 'baseAttackMin') {
    // system.derived.bab is a scalar written by BABCalculator after recalcAll.
    const bab = actorSystem.derived?.bab;
    return Number.isFinite(bab) && bab >= (req.min ?? 0);
  }
  // Unknown type — leave deferred.
  return false;
}

/**
 * Evaluate all requirements in a grant. All must be met for the grant to execute.
 * @private
 */
function _allRequirementsMet(requirements, actorSystem) {
  if (!Array.isArray(requirements) || requirements.length === 0) return false;
  return requirements.every((req) => _evaluateRequirement(req, actorSystem));
}

export class SpeciesConditionalGrantResolver {
  /**
   * Re-evaluate deferred species bonus feat grants against current actor state.
   * Grants that now qualify are created as feat items via ActorEngine.
   * Grants that do not qualify remain in the deferred list.
   * Freeform-only grants (no structured requirements) remain deferred indefinitely.
   *
   * Safe to call after any ActorEngine mutation completes. Does not fire during
   * prepareDerivedData. Only creates items when requirements are verified.
   */
  static async reconcile(actor) {
    if (!actor?.id) return;

    const deferred = actor.flags?.swse?.deferredSpeciesBonusFeats;
    if (!Array.isArray(deferred) || deferred.length === 0) return;

    const actorSystem = actor.system || {};
    const grantable = [];
    const stillDeferred = [];

    for (const grant of deferred) {
      const requirements = Array.isArray(grant.requirements) ? grant.requirements : [];
      if (requirements.length === 0) {
        // No structured requirements: freeform-only condition, leave indefinitely deferred.
        stillDeferred.push(grant);
        continue;
      }
      if (_allRequirementsMet(requirements, actorSystem)) {
        grantable.push(grant);
      } else {
        stillDeferred.push(grant);
      }
    }

    if (grantable.length === 0) return;

    // Deduplicate: skip feats already on the actor.
    const existingFeatNames = new Set(
      Array.from(actor.items || [])
        .filter((i) => i.type === 'feat')
        .map((i) => String(i.name || '').toLowerCase())
    );

    await ProgressionContentAuthority.initialize?.();

    const itemsToCreate = [];
    for (const grant of grantable) {
      const name = grant.name;
      if (!name || existingFeatNames.has(String(name).toLowerCase())) continue;

      const resolvedDoc = await ProgressionContentAuthority.getFeatDocument({ name, id: name });
      const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
      const baseItem = resolvedData || { name, type: 'feat', system: {} };
      baseItem.name = baseItem.name || name;
      baseItem.type = baseItem.type || 'feat';
      baseItem.system = foundry.utils.mergeObject(baseItem.system || {}, {
        sourceType: 'species',
        locked: true,
        autoGranted: true,
      }, { inplace: false, recursive: true, overwrite: false });
      baseItem.flags = foundry.utils.mergeObject(baseItem.flags || {}, {
        swse: {
          speciesGranted: true,
          sourceSpecies: grant.species || null,
          grantedViaReconciliation: true,
        },
      }, { inplace: false, recursive: true });
      itemsToCreate.push(baseItem);

      SWSELogger.log(`[SpeciesConditionalGrantResolver] Granting deferred species feat: ${name} for ${actor.name}`);
    }

    if (itemsToCreate.length > 0) {
      await globalThis.SWSE.ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
    }

    // Persist updated deferred list (resolved grants removed).
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'flags.swse.deferredSpeciesBonusFeats': stillDeferred.length > 0 ? stillDeferred : [],
    }, { meta: { guardKey: 'species-conditional-reconciliation' } });
  }
}
