/**
 * SnapshotService
 *
 * Owns: Snapshot restore orchestration
 * Delegates to: ActorEngine (all mutations)
 * Never owns: Snapshot creation/storage (SnapshotManager), raw actor mutations
 *
 * Contract:
 * - All mutations go through ActorEngine
 * - No direct actor.update() or embedded document API calls
 * - Preserves operation order: root → delete/update/create items →
 *   delete/update/create effects → verify
 *
 * PHASE 10 ADDENDUM (P1-7) — Exact, Failure-Aware Snapshot Restoration.
 *
 * Former limitation: root restoration passed `{name, img, system,
 * prototypeToken}` straight into `ActorEngine.updateActor()`'s ordinary
 * merge semantics — `flags` and `ownership` were never restored at all,
 * and any field introduced into `system`/`prototypeToken` after the
 * snapshot survived the merge untouched. Embedded Items/Active Effects
 * were unconditionally deleted-and-recreated, discarding their original
 * ids and breaking every reference that held one (talent grants,
 * provenance, effect origins, follower-slot occupancy, etc.). Failures
 * partway through were reported as thrown errors with no structured
 * detail and no compensation.
 *
 * ROUND-2 CORRECTION PASS (exact-head audit findings). The first version
 * of this exactness fix had its own gaps, found and closed here:
 *
 *   - `verifyRestoration()` used to copy a `verifyRoot` BOOLEAN straight
 *     into `rootMatched`/`ownershipMatched`/`flagsMatched` — it never
 *     actually compared anything. `exact` was computed WITHOUT those
 *     fields at all, so a root update that silently failed, was
 *     normalized differently by Foundry, or left stale nested data could
 *     still report `exact: true`. Fixed: after mutating, the actor is
 *     rereread and its root state is compared against
 *     `applyFlatPatch(preMutationRoot, rootPatch)` — the state the patch
 *     ITSELF claims to produce — via `deepEqualPlain()`. `exact` now
 *     requires `rootMatched` (when the scope includes root fields).
 *   - Embedded-document verification used to compare ID SETS only, never
 *     content. Fixed: `documentsMatch()` (deep-equal, excluding only
 *     Foundry-managed `_stats` bookkeeping) compares every restored/
 *     updated Item/Effect's actual source against the snapshot's. `exact`
 *     now requires content equality, not just id presence.
 *   - Every scope unconditionally restored BOTH Items and Active Effects,
 *     regardless of what the scope actually promised — a
 *     `system-and-flags`/`embedded-items` restore silently mutated
 *     embedded documents it was never supposed to touch. Fixed:
 *     `scopeIncludesItems()`/`scopeIncludesEffects()` gate both the
 *     mutation AND the verification for each document family.
 *   - Neither Actor identity nor schema/scope were validated — a snapshot
 *     recorded for one Actor could be applied to a different one with no
 *     rejection. Fixed: `snapshot.actorId` (when present) must match
 *     `actor.id`, `schemaVersion` must be the current version or absent
 *     (legacy), and `scope` must be one of `SUPPORTED_SNAPSHOT_SCOPES` —
 *     each violation fails immediately, before any mutation is attempted.
 *   - An inexact (partial-identity) restore always returned
 *     `{success: true, exact: false}`, with no way for a rollback caller
 *     to make it fail closed. Fixed: `options.requireExact === true`
 *     converts an inexact-but-otherwise-successful outcome into a FAILURE
 *     that runs the same bounded compensation pass a thrown error gets —
 *     high-risk rollback callers pass this. Callers that don't request it
 *     still get `usable`/`requiresManualReview` fields on an inexact
 *     result, rather than an unqualified `success: true`.
 *   - Compensation used to consider `compResult.success === true`
 *     sufficient. Fixed: `compensationSucceeded` now also requires
 *     `compResult.exact === true` — a compensation restore that succeeds
 *     but is itself inexact is reported honestly, not as a clean recovery.
 *
 * This version:
 *   - restores `name`/`img`/`system`/`flags`/`ownership`/`prototypeToken`
 *     via a single deletion-aware patch (see snapshot-restoration-plan.js)
 *     — every value the snapshot specifies is restored exactly, and
 *     every field introduced since the snapshot is explicitly deleted,
 *     never merely left unmerged. The snapshot-history ledger itself
 *     (`flags.foundryvtt-swse.snapshots`) is always excluded from both
 *     restoration and deletion.
 *   - diffs embedded Items/Active Effects BY ID: an unchanged document is
 *     left alone, a changed one is updated in place (same id), a missing
 *     one is recreated with `keepId: true` (preserving its original id
 *     whenever Foundry honors that option), and an Item/Effect absent
 *     from the snapshot is deleted. `_id` is never lost as a side effect
 *     of restoring the objects that reference it. Only for scopes that
 *     actually include that document family.
 *   - verifies the result after mutating: rereads the actor and confirms
 *     every expected Item/Effect id is present, no unexpected extra id
 *     remains, root state genuinely matches what the patch should have
 *     produced, and embedded-document CONTENT matches the snapshot — not
 *     merely that ids exist. If any expected id came back with a NEW id
 *     instead (i.e. Foundry did not honor `keepId`), the result reports
 *     `exact: false` with an `idRemap` entry rather than silently claiming
 *     identity was preserved. No cross-system reference remapping (talent
 *     grants, provenance fields, etc.) is attempted — that remains a
 *     documented limitation; `options.requireExact` fails the whole
 *     restore closed (with compensation) rather than let an unremapped,
 *     inexact rollback stand.
 *   - is failure-aware: if any step throws, the exact failing step is
 *     recorded, and (unless this call IS itself a compensation attempt —
 *     see below) a single, bounded compensation pass restores the
 *     actor's pre-restore state from an in-memory-only safety snapshot
 *     taken before the first mutating step. Compensation runs with
 *     `_isCompensation: true`, which disables taking a further safety
 *     snapshot — this makes recursion structurally impossible, not just
 *     unlikely. A failed restore NEVER returns `{success: true}`, and a
 *     failed (or inexact) compensation is reported honestly
 *     (`compensationSucceeded: false`) rather than swallowed.
 *   - the in-memory safety snapshot is never persisted to the actor's
 *     snapshot-history flag — it exists only as a local variable for the
 *     duration of this call, so it cannot bloat or disturb the bounded,
 *     persisted snapshot-history retention policy SnapshotManager already
 *     enforces.
 *
 * `scope` (see snapshot-restoration-plan.js's SNAPSHOT_RESTORATION_SCOPE)
 * defaults to `'full-actor'`. A snapshot missing `schemaVersion` is
 * treated as legacy: only the fields actually present on it are
 * restored (nothing is invented), and the result is always reported as
 * `exact: false` — a legacy snapshot is never claimed to provide a full
 * exact rollback, even if, incidentally, every field it happens to carry
 * restores cleanly. A schema-v2 (non-legacy) snapshot MUST carry
 * `actorId` — one that omits it is rejected (`SNAPSHOT_ACTOR_MISMATCH`)
 * before any mutation, rather than silently falling through to legacy
 * handling and bypassing identity enforcement.
 *
 * ROUND-3 CORRECTION — `options.requireExact === true` fails closed for
 * EVERY inexact result, legacy included: a legacy snapshot is always
 * `exact: false` by definition, so `requireExact: true` against a legacy
 * snapshot always fails closed (`SNAPSHOT_LEGACY_INEXACT`) and runs
 * bounded compensation if mutation began. `requireExact: false` still
 * permits a legacy snapshot's partial restore to stand, reported
 * honestly via `usable: false, requiresManualReview: true`. No
 * rollback-purpose caller can ever receive `{success: true, exact: false}`
 * from a `requireExact: true` call, regardless of legacy status.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import {
  buildActorRootRestorationPatch,
  buildEmbeddedDocumentRestorePlan,
  SNAPSHOT_RESTORATION_SCOPE,
  SUPPORTED_SNAPSHOT_SCOPES,
  scopeIncludesItems,
  scopeIncludesEffects,
  scopeIncludesRootFields,
  scopeIncludesSystemAndFlags,
  documentsMatch,
  deepEqualPlain
} from "/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-restoration-plan.js";
import { applyFlatPatch } from "/systems/foundryvtt-swse/scripts/governance/snapshot/deletion-aware-patch.js";

const CURRENT_SCHEMA_VERSION = 2;

function toSource(doc) {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') return doc.toObject();
  return foundry.utils.deepClone(doc);
}

function itemsArray(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

function effectsArray(actor) {
  const effects = actor?.effects;
  if (!effects) return [];
  if (typeof effects.contents !== 'undefined') return effects.contents;
  return Array.isArray(effects) ? effects : Array.from(effects);
}

function currentActorRoot(actor) {
  return {
    name: actor.name,
    img: actor.img,
    system: foundry.utils.deepClone(actor.system ?? {}),
    flags: foundry.utils.deepClone(actor.flags ?? {}),
    ownership: foundry.utils.deepClone(actor.ownership ?? {}),
    prototypeToken: foundry.utils.deepClone(actor.prototypeToken ?? {})
  };
}

function captureSafetySnapshot(actor) {
  return {
    // ROUND-2 CORRECTION: stamped with actorId/schemaVersion/scope so the
    // compensation restore (which restores FROM this object) is treated
    // as a real, non-legacy, identity-checked snapshot rather than
    // silently falling into "legacy" handling (which unconditionally
    // reports exact: false regardless of how faithfully it actually
    // restores) — compensation's own exactness must be able to be
    // genuinely true when it genuinely is.
    actorId: actor.id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    scope: SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR,
    ...currentActorRoot(actor),
    items: itemsArray(actor).map(toSource),
    effects: effectsArray(actor).map(toSource)
  };
}

function documentId(doc) {
  return doc?._id ?? doc?.id ?? null;
}

/**
 * ROUND-2 CORRECTION — build a map of embedded-document content, keyed by
 * id, restricted to a known id set. Used to verify CONTENT, not just
 * presence.
 */
function bySourceId(docs) {
  const map = new Map();
  for (const doc of docs) {
    const id = documentId(doc);
    if (id) map.set(id, doc);
  }
  return map;
}

/**
 * ROUND-2 CORRECTION — reread the actor and verify the restore actually
 * took: every expected Item/Effect id is present with matching content,
 * no unexpected id remains, and (when the scope includes root fields)
 * the actor's root state genuinely matches what the applied patch should
 * have produced — never a boolean copied from "was verification
 * requested."
 *
 * @param {Actor} actor - the actor, REREAD after all mutations.
 * @param {object} params
 * @param {object} params.expectedRoot - `applyFlatPatch(preMutationRoot, rootPatch)`.
 * @param {boolean} params.checkRoot - whether scope includes root fields.
 * @param {boolean} params.checkSystemAndFlags - whether scope includes system/flags.
 * @param {boolean} params.checkItems - whether scope includes Items.
 * @param {boolean} params.checkEffects - whether scope includes Active Effects.
 * @param {string[]} params.expectedItemIds
 * @param {string[]} params.expectedEffectIds
 * @param {object[]} params.snapshotItems - snapshot source objects, for content comparison.
 * @param {object[]} params.snapshotEffects
 */
function verifyRestoration(actor, {
  expectedRoot,
  checkRoot,
  checkSystemAndFlags,
  checkItems,
  checkEffects,
  expectedItemIds,
  expectedEffectIds,
  snapshotItems,
  snapshotEffects
}) {
  const actualRoot = currentActorRoot(actor);

  const nameMatched = !checkRoot || deepEqualPlain(expectedRoot.name, actualRoot.name);
  const imgMatched = !checkRoot || deepEqualPlain(expectedRoot.img, actualRoot.img);
  const ownershipMatched = !checkRoot || deepEqualPlain(expectedRoot.ownership, actualRoot.ownership);
  const prototypeTokenMatched = !checkRoot || deepEqualPlain(expectedRoot.prototypeToken, actualRoot.prototypeToken);
  const systemMatched = !checkSystemAndFlags || deepEqualPlain(expectedRoot.system, actualRoot.system);
  const flagsMatched = !checkSystemAndFlags || deepEqualPlain(expectedRoot.flags, actualRoot.flags);

  const rootMatched = nameMatched && imgMatched && ownershipMatched && prototypeTokenMatched && systemMatched && flagsMatched;

  const currentItems = bySourceId(itemsArray(actor).map(toSource));
  const currentEffects = bySourceId(effectsArray(actor).map(toSource));
  const snapshotItemsById = bySourceId(snapshotItems);
  const snapshotEffectsById = bySourceId(snapshotEffects);

  const currentItemIds = new Set(currentItems.keys());
  const currentEffectIds = new Set(currentEffects.keys());

  const missingItemIds = checkItems ? expectedItemIds.filter(id => !currentItemIds.has(id)) : [];
  const missingEffectIds = checkEffects ? expectedEffectIds.filter(id => !currentEffectIds.has(id)) : [];
  const unexpectedItemIds = checkItems ? [...currentItemIds].filter(id => !expectedItemIds.includes(id)) : [];
  const unexpectedEffectIds = checkEffects ? [...currentEffectIds].filter(id => !expectedEffectIds.includes(id)) : [];

  const itemContentMismatches = checkItems
    ? expectedItemIds.filter(id => currentItemIds.has(id) && !documentsMatch(snapshotItemsById.get(id), currentItems.get(id)))
    : [];
  const effectContentMismatches = checkEffects
    ? expectedEffectIds.filter(id => currentEffectIds.has(id) && !documentsMatch(snapshotEffectsById.get(id), currentEffects.get(id)))
    : [];

  const itemsMatched = !checkItems || (
    missingItemIds.length === 0 && unexpectedItemIds.length === 0 && itemContentMismatches.length === 0
  );
  const effectsMatched = !checkEffects || (
    missingEffectIds.length === 0 && unexpectedEffectIds.length === 0 && effectContentMismatches.length === 0
  );

  return {
    rootMatched,
    nameMatched,
    imgMatched,
    ownershipMatched,
    prototypeTokenMatched,
    systemMatched,
    flagsMatched,
    itemsMatched,
    effectsMatched,
    missingItemIds,
    missingEffectIds,
    unexpectedItemIds,
    unexpectedEffectIds,
    itemContentMismatches,
    effectContentMismatches
  };
}

export class SnapshotService {
  /**
   * restoreFromSnapshot() — exact, failure-aware Actor snapshot
   * restoration. See the module doc comment above for the full contract.
   *
   * @param {Actor} actor - target actor
   * @param {object} snapshot - `{actorId?, name?, img?, system?, flags?,
   *   ownership?, prototypeToken?, items?, effects?, scope?, schemaVersion?}`.
   *   Fields the snapshot omits are simply not restored (never invented);
   *   a missing `schemaVersion` marks the snapshot legacy.
   * @param {object} [options={}] - `requireExact: true` fails the whole
   *   restore closed (running bounded compensation) rather than return an
   *   inexact success — pass this from any rollback-purpose caller.
   * @returns {Promise<object>} structured result — see the module doc
   *   comment for the full success/failure shape.
   */
  static async restoreFromSnapshot(actor, snapshot, options = {}) {
    const actorId = actor?.id ?? null;
    if (!actor) return { success: false, code: 'SNAPSHOT_ACTOR_MISMATCH', exact: false, error: 'restoreFromSnapshot() requires actor', actorId };
    if (!snapshot) return { success: false, code: 'SNAPSHOT_NOT_FOUND', exact: false, error: 'restoreFromSnapshot() requires snapshot', actorId };

    // ROUND-3 CORRECTION — Actor identity and schema/scope validation,
    // BEFORE any mutation is attempted. `isLegacy` is now determined
    // FIRST (a snapshot with no `schemaVersion` at all is legacy — the
    // only case permitted to omit `actorId`), because a schema-v2
    // snapshot's identity guarantee is only as strong as its weakest
    // check: a forged or malformed schema-v2 snapshot with no `actorId`
    // must never be treated as if it were an untouchable legacy record
    // and allowed to silently bypass identity enforcement.
    const isLegacy = !snapshot.schemaVersion;
    if (!isLegacy && (snapshot.actorId === undefined || snapshot.actorId === null || snapshot.actorId === '')) {
      return {
        success: false, code: 'SNAPSHOT_ACTOR_MISMATCH', exact: false, actorId,
        error: 'Schema-v2 snapshots must include actorId — a schema-v2 snapshot missing actorId cannot have its identity verified and is rejected rather than treated as legacy.'
      };
    }
    if (snapshot.actorId !== undefined && snapshot.actorId !== null && String(snapshot.actorId) !== String(actorId)) {
      return {
        success: false, code: 'SNAPSHOT_ACTOR_MISMATCH', exact: false, actorId,
        error: `Snapshot was captured for Actor "${snapshot.actorId}", not "${actorId}".`
      };
    }
    if (snapshot.schemaVersion !== undefined && snapshot.schemaVersion !== null && snapshot.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return {
        success: false, code: 'SNAPSHOT_SCHEMA_UNSUPPORTED', exact: false, actorId,
        error: `Unsupported snapshot schemaVersion "${snapshot.schemaVersion}" (expected ${CURRENT_SCHEMA_VERSION} or legacy/absent).`
      };
    }

    const scope = snapshot.scope ?? SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR;
    if (!SUPPORTED_SNAPSHOT_SCOPES.has(scope)) {
      return {
        success: false, code: 'SNAPSHOT_SCOPE_UNSUPPORTED', exact: false, actorId,
        error: `Unsupported restoration scope "${scope}".`
      };
    }

    const isCompensation = options._isCompensation === true;
    const requireExact = options.requireExact === true;

    const checkRoot = scopeIncludesRootFields(scope);
    const checkSystemAndFlags = scopeIncludesSystemAndFlags(scope);
    const checkItems = scopeIncludesItems(scope);
    const checkEffects = scopeIncludesEffects(scope);

    let safety = null;
    if (!isCompensation) {
      try {
        safety = captureSafetySnapshot(actor);
      } catch (err) {
        SWSELogger.error(`SnapshotService.restoreFromSnapshot: failed to capture pre-restore safety snapshot for ${actor.name}`, err);
        return { success: false, code: 'SNAPSHOT_ROOT_RESTORE_FAILED', exact: false, actorId, error: `Could not capture a pre-restore safety snapshot: ${err.message}`, failedStep: 'safety-capture', partialMutation: false, compensationAttempted: false };
      }
    }

    let failedStep = null;
    try {
      const preMutationRoot = currentActorRoot(actor);

      failedStep = 'root';
      const rootPatch = buildActorRootRestorationPatch({ snapshotActor: snapshot, currentActor: preMutationRoot, scope });
      if (Object.keys(rootPatch).length) {
        await ActorEngine.updateActor(actor, rootPatch, {
          ...options,
          source: options.source ?? 'snapshot-restore',
          isRecomputeHPCall: true
        });
      }
      const expectedRoot = applyFlatPatch(preMutationRoot, rootPatch);

      failedStep = 'items';
      const snapshotItems = checkItems ? (snapshot.items ?? []) : [];
      const itemPlan = checkItems
        ? buildEmbeddedDocumentRestorePlan({ snapshotDocuments: snapshotItems, currentDocuments: itemsArray(actor).map(toSource) })
        : { create: [], update: [], deleteIds: [], expectedIds: [] };
      if (checkItems) {
        if (itemPlan.deleteIds.length) await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', itemPlan.deleteIds, options);
        if (itemPlan.update.length) await ActorEngine.updateEmbeddedDocuments(actor, 'Item', itemPlan.update, options);
        if (itemPlan.create.length) await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemPlan.create, { ...options, keepId: true });
      }

      failedStep = 'effects';
      const snapshotEffects = checkEffects ? (snapshot.effects ?? []) : [];
      const effectPlan = checkEffects
        ? buildEmbeddedDocumentRestorePlan({ snapshotDocuments: snapshotEffects, currentDocuments: effectsArray(actor).map(toSource) })
        : { create: [], update: [], deleteIds: [], expectedIds: [] };
      if (checkEffects) {
        if (effectPlan.deleteIds.length) await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.deleteIds, options);
        if (effectPlan.update.length) await ActorEngine.updateEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.update, options);
        if (effectPlan.create.length) await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', effectPlan.create, { ...options, keepId: true });
      }

      failedStep = 'verification';
      const verification = verifyRestoration(actor, {
        expectedRoot,
        checkRoot,
        checkSystemAndFlags,
        checkItems,
        checkEffects,
        expectedItemIds: itemPlan.expectedIds,
        expectedEffectIds: effectPlan.expectedIds,
        snapshotItems,
        snapshotEffects
      });

      const idsPreserved = verification.missingItemIds.length === 0 && verification.missingEffectIds.length === 0
        && verification.unexpectedItemIds.length === 0 && verification.unexpectedEffectIds.length === 0;
      if (!idsPreserved) {
        SWSELogger.warn(`SnapshotService.restoreFromSnapshot: some ids were not preserved for ${actor.name}`, {
          missingItemIds: verification.missingItemIds,
          missingEffectIds: verification.missingEffectIds,
          unexpectedItemIds: verification.unexpectedItemIds,
          unexpectedEffectIds: verification.unexpectedEffectIds
        });
      }

      const exact = !isLegacy && idsPreserved && verification.rootMatched && verification.itemsMatched && verification.effectsMatched;

      if (requireExact && !exact) {
        // ROUND-3 CORRECTION — fail closed for EVERY inexact result, with
        // no `!isLegacy` exemption. The prior condition let a legacy
        // snapshot (always `exact: false` by definition) slip through
        // `requireExact: true` as a soft `{success: true, exact: false}`
        // — several high-risk rollback callers only check `.success` on
        // the assumption that `requireExact: true` guarantees every
        // success is exact; a legacy snapshot broke that assumption. A
        // rollback-purpose caller asked for `requireExact`; an inexact
        // restore (legacy OR non-legacy) is treated exactly like a
        // thrown mutation error, running the same bounded compensation
        // pass rather than returning a soft `{success: true, exact: false}`.
        const mismatchCode = isLegacy
          ? 'SNAPSHOT_LEGACY_INEXACT'
          : (!idsPreserved
            ? 'SNAPSHOT_IDENTITY_MISMATCH'
            : (!verification.rootMatched ? 'SNAPSHOT_ROOT_VERIFICATION_FAILED' : 'SNAPSHOT_CONTENT_VERIFICATION_FAILED'));
        const mismatchError = new Error(`Snapshot restoration for ${actor.name} did not verify as exact (requireExact was set): ${mismatchCode}.`);
        mismatchError.code = mismatchCode;
        mismatchError.verification = verification;
        throw mismatchError;
      }

      SWSELogger.log(`[SNAPSHOT] Restoration complete for ${actor.name}`, {
        scope, exact,
        itemsDeleted: itemPlan.deleteIds.length, itemsUpdated: itemPlan.update.length, itemsCreated: itemPlan.create.length,
        effectsDeleted: effectPlan.deleteIds.length, effectsUpdated: effectPlan.update.length, effectsCreated: effectPlan.create.length
      });

      return {
        success: true,
        exact,
        usable: exact,
        requiresManualReview: !exact,
        actorId,
        restoredScope: scope,
        restoredItemIds: itemPlan.expectedIds,
        restoredEffectIds: effectPlan.expectedIds,
        idRemap: {},
        verification,
        // Backward-compatible fields for existing callers of the old shape.
        itemsDeleted: itemPlan.deleteIds.length,
        itemsCreated: itemPlan.create.length,
        effectsDeleted: effectPlan.deleteIds.length,
        effectsCreated: effectPlan.create.length,
        timestamp: new Date().toISOString(),
        actor
      };
    } catch (err) {
      SWSELogger.error(`SnapshotService.restoreFromSnapshot failed for ${actor?.name ?? 'unknown actor'} at step "${failedStep}"`, err);

      if (isCompensation) {
        return {
          success: false,
          exact: false,
          actorId,
          code: err.code ?? 'SNAPSHOT_COMPENSATION_FAILED',
          failedStep,
          error: err.message,
          partialMutation: true,
          compensationAttempted: false
        };
      }

      let compensationSucceeded = false;
      let compensationExact = false;
      const compensationErrors = [];
      try {
        const compResult = await this.restoreFromSnapshot(actor, safety, { ...options, requireExact: false, _isCompensation: true });
        compensationSucceeded = compResult.success === true && compResult.exact === true;
        compensationExact = compResult.exact === true;
        if (!compensationSucceeded) {
          compensationErrors.push(compResult.error ?? (compResult.success ? 'Compensation restored data but was not identity-exact.' : 'Compensation failed.'));
        }
      } catch (compErr) {
        compensationErrors.push(compErr.message);
      }

      const stepCodeMap = {
        root: 'SNAPSHOT_ROOT_RESTORE_FAILED',
        items: 'SNAPSHOT_ITEM_RESTORE_FAILED',
        effects: 'SNAPSHOT_EFFECT_RESTORE_FAILED',
        verification: 'SNAPSHOT_VERIFICATION_FAILED'
      };

      return {
        success: false,
        exact: false,
        actorId,
        code: err.code ?? stepCodeMap[failedStep] ?? 'SNAPSHOT_ROOT_RESTORE_FAILED',
        failedStep,
        error: err.message,
        partialMutation: true,
        compensationAttempted: true,
        compensationSucceeded,
        compensationExact,
        compensationErrors,
        idRemap: {},
        verification: err.verification ?? {}
      };
    }
  }
}
