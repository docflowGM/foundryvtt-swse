/**
 * DroidFactory — Pure Droid Creation
 *
 * PHASE 7: Droid creation factory (mirrors VehicleFactory)
 *
 * Responsibilities:
 * - Build MutationPlan for droid creation
 * - Never mutate actor
 * - Never assign ownership
 * - Never determine placement
 * - Convert droid actor → V2-compliant MutationPlan
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidNormalizer } from "/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-normalizer.js";
import { StockDroidImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/stock-droid-importer-engine.js";

function deepClone(value) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  } catch (_err) { /* no-op */ }
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export class DroidFactory {
  /**
   * Build MutationPlan for droid creation
   * @param {Object} buildSpec - Droid build specification
   * @param {Object} buildSpec.droidActor - Droid actor or data
   * @param {string} buildSpec.name - Optional name override
   * @returns {Object} MutationPlan with CREATE bucket
   */
  static buildMutationPlan(buildSpec) {
    if (!buildSpec || !buildSpec.droidActor) {
      throw new Error('DroidFactory: buildSpec with droidActor required');
    }

    const tempId = this._generateTemporaryId('droid');
    const droidData = this._buildDroidActorData(buildSpec);

    swseLogger.debug('DroidFactory: Built MutationPlan', {
      tempId,
      name: droidData.name
    });

    return {
      create: {
        actors: [{
          type: 'droid',
          temporaryId: tempId,
          data: droidData
        }]
      }
    };
  }

  /**
   * Build canonical V2 droid actor data
   * @private
   */
  static _buildDroidActorData(buildSpec) {
    const actor = buildSpec.droidActor;
    const source = actor?.doc || actor?.actor || actor;
    const actorObj = source?.toObject ? source.toObject(false) : deepClone(source || {});
    const actorSystem = actorObj.system || actor?.system || {};

    if (this._looksLikeStockDroidSource(actorObj, actor)) {
      try {
        const normalized = StockDroidNormalizer.normalizeStockDroidRecord(actorObj);
        const droidData = StockDroidImporterEngine.buildActorDataFromNormalized(normalized, {
          name: buildSpec.name || actorObj.name || actor?.name
        });
        return this._stripDocumentIds(droidData);
      } catch (err) {
        swseLogger.warn('DroidFactory: Stock droid normalization failed; falling back to source clone', {
          name: actorObj.name || actor?.name,
          error: err?.message || err
        });
      }
    }

    // Preserve full custom droid fidelity from the compendium/world actor: items,
    // effects, prototype token, flags, and all system fields. Stock droids flow
    // through StockDroidImporterEngine above so legacy published statblocks become
    // live actor fields instead of schema-default husks.
    const droidData = {
      ...actorObj,
      type: 'droid',
      name: buildSpec.name || actorObj.name || actor?.name || 'Unnamed Droid',
      img: actorObj.img || actor?.img || 'icons/svg/amulet.svg',
      system: {
        ...actorSystem,
        level: actorSystem.level || 1,
        credits: 0,
        reflexDefense: actorSystem.reflexDefense ?? 10,
        fortitudeDefense: actorSystem.fortitudeDefense ?? 10,
        baseAttackBonus: actorSystem.baseAttackBonus ?? 0
      }
    };

    return this._stripDocumentIds(droidData);
  }

  /**
   * Detect stock droid records from the SWSE droids pack or its store listings.
   * Published stock droids use several legacy statblock fields that must be
   * normalized before actor creation.
   * @private
   */
  static _looksLikeStockDroidSource(actorObj = {}, actor = {}) {
    const system = actorObj.system || actor?.system || {};
    const id = String(actorObj._id || actorObj.id || actor?.rawId || actor?.id || '');
    const pack = String(actorObj.__storeSource?.pack || actor?.sourcePack || actor?.pack || '');
    if ((actorObj.type || actor?.type) !== 'droid') return false;
    return Boolean(
      pack === 'foundryvtt-swse.droids'
      || id.startsWith('npc-')
      || system.HP !== undefined
      || system.baseStats?.abilities
      || system.reflexDefense !== undefined
      || system.fortitudeDefense !== undefined
      || system.willDefense !== undefined
      || system.droidSystemText
      || actorObj.flags?.swse?.droidSystemText
    );
  }

  /**
   * Strip actor/document ids before CREATE mutations.
   * @private
   */
  static _stripDocumentIds(droidData = {}) {
    const clone = deepClone(droidData) || {};
    delete clone._id;
    delete clone.id;
    return clone;
  }

  /**
   * Generate temporary ID for later resolution
   * @private
   */
  static _generateTemporaryId(prefix) {
    return `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
