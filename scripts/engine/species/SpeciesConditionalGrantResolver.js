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
function _evaluateRequirement(req, actorSystem, actor = null) {
  if (req.type === 'featOwned') {
    const wanted = String(req.feat || '').toLowerCase();
    return !!wanted && Array.from(actor?.items || []).some((i) => i.type === 'feat' && String(i.name || '').toLowerCase() === wanted);
  }
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
function _allRequirementsMet(requirements, actorSystem, actor = null) {
  if (!Array.isArray(requirements) || requirements.length === 0) return false;
  return requirements.every((req) => _evaluateRequirement(req, actorSystem, actor));
}

const FEAT_DOCUMENT_UNRESOLVED = 'FEAT_DOCUMENT_UNRESOLVED';
const _running = new Set();

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
  /**
   * createItem hook handler: acquiring a feat can satisfy a deferred "owns feat X" requirement. Items this resolver
   * created itself are ignored (no recursion). Only creation re-evaluates: no revocation semantics are invented for
   * losing a prerequisite (the printed grants say what an owner "gains", not that it is lost again).
   * @returns {Promise<void>|null} the reconciliation promise when one was started
   */
  static onItemCreated(item) {
    const actor = item?.parent;
    if (!actor || item.type !== 'feat') return null;
    if (item.flags?.swse?.grantedViaReconciliation) return null;
    if (!actor.flags?.swse?.deferredSpeciesBonusFeats?.length) return null;
    return this.reconcile(actor).catch((err) => {
      SWSELogger.warn(`[SpeciesGrants] Reconciliation error for ${actor?.name}:`, err);
    });
  }

  static async reconcile(actor) {
    if (!actor?.id) return;
    if (_running.has(actor.id)) return;   // no re-entrant evaluation (the writes below fire the same hooks)
    _running.add(actor.id);
    try {
      await this._reconcile(actor);
    } finally {
      _running.delete(actor.id);
    }
  }

  static async _reconcile(actor) {
    const deferred = actor.flags?.swse?.deferredSpeciesBonusFeats;
    if (!Array.isArray(deferred) || deferred.length === 0) return;

    const actorSystem = actor.system || {};
    const currentKey = actor.flags?.swse?.speciesGrantManifest?.grantKey ?? null;
    const grantable = [];
    const stillDeferred = [];
    let dropped = 0;

    for (const grant of deferred) {
      // A deferred grant belongs to the species grant that recorded it; once the actor's species/variant changed it is stale.
      if (grant.grantKey && currentKey && grant.grantKey !== currentKey) { dropped++; continue; }
      const requirements = Array.isArray(grant.requirements) ? grant.requirements : [];
      if (requirements.length === 0 && grant.pendingReason !== FEAT_DOCUMENT_UNRESOLVED) {
        // No structured requirements: freeform-only condition, leave indefinitely deferred.
        stillDeferred.push(grant);
        continue;
      }
      if (requirements.length === 0 || _allRequirementsMet(requirements, actorSystem, actor)) {
        grantable.push(grant);
      } else {
        stillDeferred.push(grant);
      }
    }

    if (grantable.length === 0) {
      if (dropped) {
        await globalThis.SWSE.ActorEngine.updateActor(actor, { 'flags.swse.deferredSpeciesBonusFeats': stillDeferred }, { meta: { guardKey: 'species-conditional-reconciliation' } });
      }
      return;
    }

    // Deduplicate: skip feats already on the actor (an independently acquired feat of the same name stays independent).
    const existingFeatNames = new Set(
      Array.from(actor.items || [])
        .filter((i) => i.type === 'feat')
        .map((i) => String(i.name || '').toLowerCase())
    );

    await ProgressionContentAuthority.initialize?.();

    const itemsToCreate = [];
    for (const grant of grantable) {
      const name = grant.name;
      if (!name) continue;
      if (existingFeatNames.has(String(name).toLowerCase())) continue;   // satisfied: dropped from the deferred list

      // Fail closed: never substitute a minimal feat item for a canonical record that cannot be resolved.
      const resolvedDoc = await ProgressionContentAuthority.getFeatDocument({ name, id: name });
      const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
      if (!resolvedData) {
        SWSELogger.warn(`[SpeciesConditionalGrantResolver] Feat "${name}" could not be resolved; grant for ${actor.name} stays pending`, { species: grant.species ?? null });
        stillDeferred.push({ ...grant, requirements: grant.requirements || [], pendingReason: FEAT_DOCUMENT_UNRESOLVED });
        continue;
      }
      const baseItem = resolvedData;
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
          // Provenance for species-grant reconciliation: removed when the species/variant that granted it is replaced.
          ...(grant.grantKey ? { speciesGrantKey: grant.grantKey } : {}),
          grantedViaReconciliation: true,
        },
      }, { inplace: false, recursive: true });
      itemsToCreate.push(baseItem);

      SWSELogger.log(`[SpeciesConditionalGrantResolver] Granting deferred species feat: ${name} for ${actor.name}`);
    }

    if (itemsToCreate.length > 0) {
      await globalThis.SWSE.ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
    }

    // Persist updated deferred list (resolved grants removed). If this write fails after the items were created the
    // next pass skips them by name, so nothing is granted twice.
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'flags.swse.deferredSpeciesBonusFeats': stillDeferred.length > 0 ? stillDeferred : [],
    }, { meta: { guardKey: 'species-conditional-reconciliation' } });
  }
}
