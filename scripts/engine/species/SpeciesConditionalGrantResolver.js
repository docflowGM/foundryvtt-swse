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
const GRANT_KEY_LEGACY = 'LEGACY_UNKEYED_GRANT';
const GRANT_KEY_UNESTABLISHED = 'SPECIES_GRANT_KEY_UNESTABLISHED';
const _running = new Set();
const _rerun = new Set();

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

  /**
   * item-deleted counterpart: an independently owned copy that was satisfying an entitlement may be gone, in which
   * case the species grant must supply it. Species-keyed deletions never re-trigger (nothing is tracked for them).
   */
  static onItemDeleted(item) {
    const actor = item?.parent;
    if (!actor || item.type !== 'feat') return null;
    if (!(actor.flags?.swse?.deferredSpeciesBonusFeats ?? []).some((g) => g.satisfiedByIndependentFeat)) return null;
    return this.reconcile(actor).catch((err) => {
      SWSELogger.warn(`[SpeciesGrants] Reconciliation error for ${actor?.name}:`, err);
    });
  }

  /**
   * Register the feat-item hooks with the host `Hooks` (called by actor-hooks; the same function is exercised by tests
   * with a stand-in that fires handlers asynchronously, like Foundry).
   */
  static registerHooks(hooks) {
    hooks.on('createItem', (item) => {
      if (item?.type !== 'feat' || !item.parent) return;
      setTimeout(() => SpeciesConditionalGrantResolver.onItemCreated(item), 0);
    });
    hooks.on('deleteItem', (item) => {
      if (item?.type !== 'feat' || !item.parent) return;
      setTimeout(() => SpeciesConditionalGrantResolver.onItemDeleted(item), 0);
    });
  }

  static async reconcile(actor) {
    if (!actor?.id) return;
    // Serialize per actor: a request that arrives while a pass is running is not lost, it triggers exactly one more pass
    // (the writes of a pass fire the same hooks, so passes must never nest).
    if (_running.has(actor.id)) { _rerun.add(actor.id); return; }
    _running.add(actor.id);
    try {
      do {
        _rerun.delete(actor.id);
        await this._reconcile(actor);
      } while (_rerun.has(actor.id));
    } finally {
      _running.delete(actor.id);
      _rerun.delete(actor.id);
    }
  }

  static async _reconcile(actor) {
    const deferred = actor.flags?.swse?.deferredSpeciesBonusFeats;
    if (!Array.isArray(deferred) || deferred.length === 0) return;

    const actorSystem = actor.system || {};
    const currentKey = actor.flags?.swse?.speciesGrantManifest?.grantKey ?? null;
    const grantable = [];
    const stillDeferred = [];
    let changed = false;

    for (const grant of deferred) {
      // The grant must belong to the actor's CURRENT species grant. A different key is stale and dropped; an unkeyed
      // (legacy) entry or a missing current key cannot be attributed, so it fails closed and waits for reconciliation
      // (re-applying the species rewrites the list with keys).
      if (grant.grantKey && currentKey && grant.grantKey !== currentKey) { changed = true; continue; }
      if (!grant.grantKey || !currentKey) {
        const reason = !grant.grantKey ? GRANT_KEY_LEGACY : GRANT_KEY_UNESTABLISHED;
        SWSELogger.warn(`[SpeciesConditionalGrantResolver] "${grant.name}" for ${actor.name} not granted: ${reason}`);
        stillDeferred.push(grant.pendingReason === reason ? grant : { ...grant, pendingReason: reason });
        if (grant.pendingReason !== reason) changed = true;
        continue;
      }
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

    const feats = Array.from(actor.items || []).filter((i) => i.type === 'feat');
    const lower = (v) => String(v || '').toLowerCase();

    await ProgressionContentAuthority.initialize?.();

    const itemsToCreate = [];
    for (const grant of grantable) {
      const name = grant.name;
      if (!name) continue;
      const copies = feats.filter((i) => lower(i.name) === lower(name));
      // Already supplied by this species grant: satisfied, nothing left to track.
      if (copies.some((i) => i.flags?.swse?.speciesGrantKey === currentKey)) { changed = true; continue; }
      // An independently owned copy satisfies the feat for now (no duplicate is created), but the species
      // entitlement stays tracked: if that copy is later removed, the species grant supplies it.
      if (copies.length) {
        if (!grant.satisfiedByIndependentFeat) changed = true;
        stillDeferred.push({ ...grant, satisfiedByIndependentFeat: true });
        continue;
      }

      // Fail closed: never substitute a minimal feat item for a canonical record that cannot be resolved.
      const resolvedDoc = await ProgressionContentAuthority.getFeatDocument({ name, id: name });
      const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
      if (!resolvedData) {
        SWSELogger.warn(`[SpeciesConditionalGrantResolver] Feat "${name}" could not be resolved; grant for ${actor.name} stays pending`, { species: grant.species ?? null });
        stillDeferred.push({ ...grant, requirements: grant.requirements || [], pendingReason: FEAT_DOCUMENT_UNRESOLVED, satisfiedByIndependentFeat: false });
        if (grant.pendingReason !== FEAT_DOCUMENT_UNRESOLVED) changed = true;
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
          speciesGrantKey: grant.grantKey,
          grantedViaReconciliation: true,
        },
      }, { inplace: false, recursive: true });
      itemsToCreate.push(baseItem);
      changed = true;

      SWSELogger.log(`[SpeciesConditionalGrantResolver] Granting deferred species feat: ${name} for ${actor.name}`);
    }

    if (itemsToCreate.length > 0) {
      await globalThis.SWSE.ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
    }
    if (!changed) return;

    // Persist the updated list. If this write fails after items were created, the next pass finds them by grant key
    // and clears the entry, so nothing is granted twice.
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      'flags.swse.deferredSpeciesBonusFeats': stillDeferred.length > 0 ? stillDeferred : [],
    }, { meta: { guardKey: 'species-conditional-reconciliation' } });
  }
}
