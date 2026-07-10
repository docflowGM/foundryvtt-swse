// scripts/governance/mutation/mutation-boundary-service.js
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

/**
 * MutationBoundaryService
 *
 * Semantic diagnostics and soft guardrails for actor update payloads.
 * Extracted from ActorEngine as part of refactor C3.3.
 *
 * Contract:
 * - Never calls actor.update() or any ActorEngine method.
 * - Never mutates actor data.
 * - May return a transformed flat payload (Phase 3 guardrail only).
 * - All warnings are preserved exactly as they were in ActorEngine.
 * - All redirects are preserved exactly as they were in ActorEngine.
 */
export const MutationBoundaryService = {

  /**
   * Classify the intended operation category for semantic boundary diagnostics.
   * Not authoritative — reduces false-positive noise in audit logs.
   *
   * Categories:
   *   migration-repair        — migration, world repair, schema repair
   *   progression-commit      — level-up, finalization, skill commit
   *   derived-rebuild         — DerivedCalculator cycle
   *   canonical-normalization — shape normalization passes
   *   live-ui-update          — narrow dot-path update from sheet interaction
   *   unknown                 — unclassified; highest suspicion weight
   *
   * @param {Object} updateData
   * @param {Object} options
   * @param {Actor}  actor
   * @returns {string} operationCategory
   */
  classifyOperationIntent(updateData, options, actor) {
    // -----------------------------------------------------------------------
    // Source-based classification: reduces false-positive noise in audit logs.
    // These are warning-only diagnostics. Source classification is NOT hard
    // operation-mode validation — it exists solely to identify known-safe broad
    // payloads before future enforcement phases add real restrictions.
    //
    // Confirmed real source strings in the codebase (audit: 2025-05-20):
    //   migration-repair:        meta.origin==='migration', 'repair'
    //   progression-commit:      'ActorEngine.applyProgression', 'progression',
    //                            'progression-finalized', 'progression-attribute-step',
    //                            'ProgressionFinalizer.finalize', 'levelup-finalizer',
    //                            'chargen-finalizer', 'chargen-finalization',
    //                            'finalize-integration'
    //   canonical-normalization: 'ActorEngine.apply:adoption',
    //                            'CharacterGenerationEngine.apply',
    //                            'chargen-init.imported-droid',
    //                            'vehicle-handler.canonical-seed'
    //   progression-commit:     (also) 'FollowerCreator.updateFromMutation.progression'
    //   derived-rebuild:         options.isDerivedCalculatorCall===true,
    //                            actor._isDerivedCalcCycle===true
    // -----------------------------------------------------------------------
    const source = options?.source ?? options?.meta?.source ?? '';
    const guardKey = options?.meta?.guardKey ?? '';
    const metaOrigin = options?.meta?.origin ?? '';

    if (metaOrigin === 'migration' || /migration|repair/i.test(source)) return 'migration-repair';
    if (
      source === 'ActorEngine.applyProgression' ||
      /progression|finali/i.test(source) ||
      guardKey.includes('progression')
    ) return 'progression-commit';
    if (options?.isDerivedCalculatorCall === true || actor?._isDerivedCalcCycle === true) return 'derived-rebuild';
    // adoption: ActorEngine.apply() system replacement (internal).
    // chargen: CharacterGenerationEngine initial shape setup and chargen-init imports.
    if (/canonical|normali|adoption|chargen/i.test(source)) return 'canonical-normalization';

    // Narrow leaf-path updates are typical live UI interactions — not suspicious
    const flat = foundry.utils.flattenObject(updateData ?? {});
    const keys = Object.keys(flat);
    if (keys.length <= 4 && keys.every(k => (k.match(/\./g) ?? []).length >= 2)) return 'live-ui-update';

    return 'unknown';
  },

  /**
   * Audit actor update payloads for semantic boundary violations.
   *
   * Detects dangerous-but-currently-approved payload patterns that should be
   * understood before any hard rejection is added in later phases.
   *
   * Warning-only — does not alter updateData, does not block updates. This
   * service never throws; it is the evidence layer. Strict-mode ENFORCEMENT
   * (throwing) is the caller's job — ActorEngine reads the returned findings and
   * decides, so the service stays pure and independently testable.
   *
   * Long-term invariant: This is the evidence collection layer.
   *
   * @param {Object} updateData     - Original (pre-normalization) update payload
   * @param {Object} flatData       - Flattened update payload
   * @param {Actor}  actor
   * @param {string} operationCategory
   * @param {Object} options
   * @returns {Array<{key:string, reason:string, count?:number, examples?:string[], keyCount?:number}>}
   *          The suspicious findings (empty array if none). Returned so the
   *          caller can apply strict-mode enforcement to high-confidence cases.
   */
  auditSemanticBoundaries(updateData, flatData, actor, operationCategory, options) {
    // Broad-safe contexts: migration, progression, canonical normalization, derived rebuild
    // These legitimately write broad payloads and should not generate noise.
    const isBroadSafe = [
      'migration-repair',
      'progression-commit',
      'canonical-normalization',
      'derived-rebuild'
    ].includes(operationCategory);

    const suspicious = [];
    const flatKeys = Object.keys(flatData);
    const keyCount = flatKeys.length;

    // 1. Full `system` replacement — nested updateData.system object
    //    Typical in adoption, migration, or sheet form submissions capturing entire system.
    if (
      updateData?.system &&
      typeof updateData.system === 'object' &&
      !Array.isArray(updateData.system) &&
      !isBroadSafe
    ) {
      suspicious.push({ key: 'system', reason: 'full-system-replacement' });
    }

    // 2. Broad domain replacement via pre-flattened exact-domain key
    //    e.g. caller passed {'system.skills': { ... }} instead of leaf paths
    const broadDomainKeys = ['system.skills', 'system.defenses', 'system.attributes', 'system.abilities'];
    for (const dk of broadDomainKeys) {
      if (Object.prototype.hasOwnProperty.call(flatData, dk) && typeof flatData[dk] === 'object') {
        suspicious.push({ key: dk, reason: 'broad-domain-key-replacement' });
      }
    }

    // 3. system.abilities writes — intended as a read-only compat mirror of system.attributes.
    //    Writes here may indicate a caller that bypassed the canonical write path.
    //    Note: current normalization still routes through system.abilities; this flag
    //    tracks frequency so the canonical path decision can be made in a later phase.
    if (!isBroadSafe) {
      const abilitiesWrites = flatKeys.filter(k => k.startsWith('system.abilities.'));
      if (abilitiesWrites.length > 0) {
        suspicious.push({
          key: 'system.abilities.*',
          reason: 'write-to-abilities-mirror-path',
          count: abilitiesWrites.length,
          examples: abilitiesWrites.slice(0, 4)
        });
      }
    }

    // 4. system.derived writes from outside a derived-calc cycle.
    //    _validateDerivedWriteAuthority() already handles enforcement; this adds
    //    structured payload context alongside it.
    if (!actor._isDerivedCalcCycle && !options?.isDerivedCalculatorCall) {
      const derivedWrites = flatKeys.filter(k => k.startsWith('system.derived.'));
      if (derivedWrites.length > 0) {
        suspicious.push({
          key: 'system.derived.*',
          reason: 'derived-write-outside-calc-cycle',
          count: derivedWrites.length,
          examples: derivedWrites.slice(0, 4)
        });
      }
    }

    // 5. Broad payload with many flattened keys from an unclassified caller.
    //    Threshold chosen to be above typical progression packets (~15 keys).
    const BROAD_THRESHOLD = 25;
    if (keyCount > BROAD_THRESHOLD && !isBroadSafe) {
      suspicious.push({ key: `(${keyCount} flat keys)`, reason: 'broad-payload-unclassified-caller', keyCount });
    }

    if (suspicious.length === 0) return []; // Nothing suspicious — stay silent

    SWSELogger.warn('[ActorEngine:P1] Semantic boundary audit: suspicious payload', {
      actorId: actor?.id,
      actorName: actor?.name,
      actorType: actor?.type,
      source: options?.source ?? options?.meta?.source ?? null,
      operationCategory,
      flatKeyCount: keyCount,
      suspicious,
      // Phase 1: diagnostic. Phase 2: caller may reject high-confidence cases
      // (full-system-replacement, broad-domain-key-replacement) in strict mode.
      allowed: true
    });

    return suspicious;
  },

  /**
   * Audit embedded Item update payloads for semantic boundary violations.
   *
   * Detects: missing _id, broad system replacement on items.
   * Type-mutation detection is handled by the P0.1 backstop above this call.
   *
   * Warning-only. No payload changes here — called before P0.1 stripping.
   *
   * Long-term invariant: Item type mutation must never reach the document layer.
   * system.* replacement on embedded items may indicate a view-model leak.
   *
   * @param {Object[]} updates
   * @param {Actor}    actor
   * @param {Object}   options
   */
  auditEmbeddedItemBoundaries(updates, actor, options) {
    for (const update of updates) {
      const itemId = update._id ?? update.id;

      // Missing _id — required for embedded document updates
      if (!itemId) {
        SWSELogger.warn('[ActorEngine:P1] Embedded Item update is missing _id', {
          actorId: actor?.id,
          actorName: actor?.name,
          source: options?.source ?? null,
          updateKeys: Object.keys(update).slice(0, 8)
        });
        continue;
      }

      // Broad system object replacement on an existing item.
      // Narrow dot-path updates (system.quantity, system.equipped) are expected;
      // passing the entire system object risks clobbering fields the caller didn't intend.
      if (update.system && typeof update.system === 'object' && !Array.isArray(update.system)) {
        const systemKeyCount = Object.keys(update.system).length;
        const BROAD_ITEM_THRESHOLD = 6;
        if (systemKeyCount > BROAD_ITEM_THRESHOLD) {
          SWSELogger.warn('[ActorEngine:P1] Embedded Item update contains broad system replacement', {
            actorId: actor?.id,
            actorName: actor?.name,
            itemId,
            itemName: actor?.items?.get?.(itemId)?.name,
            systemKeyCount,
            systemKeys: Object.keys(update.system).slice(0, 8),
            source: options?.source ?? null,
            allowed: true
          });
        }
      }
    }
  },

  /**
   * Apply Phase 3 guardrails to the flattened payload before it crosses
   * the Foundry document update boundary.
   *
   * Phase 1/2: identified suspicious payloads (warning-only, no changes).
   * Phase 3: corrects paths we know are wrong for live/unknown callers.
   * Future phases: will enforce broad replacement rules after runtime validation.
   *
   * Currently enforced (auto-corrected):
   *   system.abilities.{key}.base → system.attributes.{key}.base  (live/unknown callers)
   *
   * Warning-only (not corrected yet):
   *   system.abilities.{key}.mod / .modifier / .total             (no safe 1:1 mapping)
   *   system.derived.* outside calc cycle                         (may break derived flows)
   *   broad system / domain replacements                          (may be legitimate)
   *
   * Broad-safe contexts (migration-repair, progression-commit, canonical-normalization,
   * derived-rebuild) bypass all Phase 3 guardrails — they own their payload shape.
   *
   * @param {Object} flatData          - Flattened update payload (from flattenObject)
   * @param {string} operationCategory - From classifyOperationIntent
   * @param {Actor}  actor
   * @param {Object} options
   * @returns {Object} Potentially modified flat payload (new object if changes; same ref if none)
   */
  applyPhase3Guardrails(flatData, operationCategory, actor, options) {
    // Broad-safe contexts own their payload shape — skip all guardrails.
    if (['migration-repair', 'progression-commit', 'canonical-normalization', 'derived-rebuild'].includes(operationCategory)) {
      return flatData;
    }
    return this._guardrailAbilitiesMirrorWrites(flatData, operationCategory, actor, options);
  },

  /**
   * Redirect system.abilities.{key}.base → system.attributes.{key}.base.
   *
   * system.abilities is a read-only compatibility mirror of system.attributes.
   * system.attributes is the canonical persisted ability-score storage.
   *
   * Only the .base subfield is redirected — it has a known 1:1 canonical equivalent.
   * Other subfields (.mod, .modifier, .total) are warning-only: blindly redirecting
   * them could clobber derived state managed by DerivedCalculator.
   *
   * Note: by the time this runs, _normalizeAbilityPathsForContract has already
   * converted any .value → .base within system.abilities, so only .base appears here.
   *
   * @param {Object} flatData
   * @param {string} operationCategory
   * @param {Actor}  actor
   * @param {Object} options
   * @returns {Object} New flat payload object with redirects applied
   * @private
   */
  _guardrailAbilitiesMirrorWrites(flatData, operationCategory, actor, options) {
    const ABILITY_KEYS = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha']);
    const abilitiesKeys = Object.keys(flatData).filter(k => k.startsWith('system.abilities.'));
    if (abilitiesKeys.length === 0) return flatData; // Fast path: nothing to redirect

    const redirects = [];
    const warnOnly = [];
    const result = { ...flatData };

    for (const key of abilitiesKeys) {
      const match = key.match(/^system\.abilities\.([a-z]+)\.(.+)$/);
      if (!match) continue;
      const [, abilityKey, subfield] = match;
      if (!ABILITY_KEYS.has(abilityKey)) continue;

      if (subfield === 'base') {
        // Safe redirect: canonical 1:1 equivalent exists.
        const canonical = `system.attributes.${abilityKey}.base`;
        const mirrorValue = result[key];
        if (Object.prototype.hasOwnProperty.call(result, canonical)) {
          // Canonical path already present in the same payload — canonical wins.
          // Do not overwrite an explicit system.attributes write with a mirror value.
          delete result[key];
          redirects.push(`${key} CONFLICT — canonical wins (${canonical}=${result[canonical]}, mirror=${mirrorValue} dropped)`);
        } else {
          result[canonical] = mirrorValue;
          delete result[key];
          redirects.push(`${key} → ${canonical}`);
        }
      } else {
        // .mod, .modifier, .total, or unknown subfield — warn but do not redirect.
        // These are derived/computed values; writing them to system.attributes.*
        // would have different semantics and could corrupt derived state.
        warnOnly.push(key);
      }
    }

    if (redirects.length > 0 || warnOnly.length > 0) {
      SWSELogger.warn('[ActorEngine:P3] system.abilities mirror write intercepted', {
        actorId: actor?.id,
        actorName: actor?.name,
        operationCategory,
        redirected: redirects,
        warnOnly,
        source: options?.source ?? null,
        action: redirects.length > 0 ? 'redirected-to-attributes' : 'warn-only'
      });
    }

    return result;
  }
};
