/**
 * ProgressionSubtypeAdapterRegistry
 *
 * Central registry for subtype-specific behavior providers.
 *
 * The progression spine is generic and subtype-agnostic.
 * Subtype-specific rules are plugged in through adapters registered here.
 *
 * Phase 1 CORRECTED: Registry now supports both:
 * - INDEPENDENT participants: actor, droid, nonheroic (full progression lifecycle)
 * - DEPENDENT participants: follower (derived from owner, entitlement-driven)
 *
 * Architecture:
 * - One registry, one seam
 * - Adapters are resolved once at session creation
 * - All subtype-specific contributions flow through adapter method calls
 * - No branching or spaghetti in the spine itself
 *
 * Phase 1 rule: Adapters must be structurally wired but logic is deferred.
 */

import { swseLogger } from '../../../utils/logger.js';
import {
  ActorSubtypeAdapter,
  DroidSubtypeAdapter,
  FollowerSubtypeAdapter,
  NonheroicSubtypeAdapter,
} from './default-subtypes.js';
import { BeastSubtypeAdapter } from './beast-subtype-adapter.js';

export class ProgressionSubtypeAdapterRegistry {
  static _instance = null;
  static _adapters = [];

  /**
   * Get singleton registry instance.
   * @returns {ProgressionSubtypeAdapterRegistry}
   */
  static getInstance() {
    if (!this._instance) {
      this._instance = new ProgressionSubtypeAdapterRegistry();
      this._instance._initializeDefaultAdapters();
    }
    return this._instance;
  }

  constructor() {
    this.adapters = [];
  }

  /**
   * Initialize default adapters.
   * Called on first getInstance().
   * @private
   */
  _initializeDefaultAdapters() {
    this.register(new ActorSubtypeAdapter());
    this.register(new DroidSubtypeAdapter());
    this.register(new NonheroicSubtypeAdapter());
    this.register(new BeastSubtypeAdapter());        // Phase 2.7: Beast adapter
    this.register(new FollowerSubtypeAdapter());

    swseLogger.log('[ProgressionSubtypeAdapterRegistry] Default adapters registered', {
      count: this.adapters.length,
      subtypes: this.adapters.map(a => a.subtypeId),
    });
  }

  /**
   * Register a new subtype adapter.
   * @param {ProgressionSubtypeAdapter} adapter
   */
  register(adapter) {
    if (!adapter) {
      swseLogger.warn('[ProgressionSubtypeAdapterRegistry] Attempted to register null adapter');
      return;
    }

    const existing = this.adapters.find(a => a.subtypeId === adapter.subtypeId);
    if (existing) {
      swseLogger.warn(
        `[ProgressionSubtypeAdapterRegistry] Adapter "${adapter.subtypeId}" already registered. Replacing.`
      );
      const idx = this.adapters.indexOf(existing);
      this.adapters[idx] = adapter;
    } else {
      this.adapters.push(adapter);
    }

    swseLogger.debug(
      `[ProgressionSubtypeAdapterRegistry] Registered adapter: ${adapter.subtypeId}`
    );
  }

  /**
   * Resolve an adapter for a given subtype string.
   * @param {string} subtype - e.g., 'actor', 'droid', 'follower', 'nonheroic'
   * @returns {ProgressionSubtypeAdapter | null}
   */
  resolveAdapter(subtype) {
    if (!subtype || typeof subtype !== 'string') {
      swseLogger.warn('[ProgressionSubtypeAdapterRegistry] Invalid subtype string:', subtype);
      return this.adapters[0]; // Fallback to first (actor)
    }

    const adapter = this.adapters.find(a => a.handles(subtype));
    if (!adapter) {
      swseLogger.warn(
        `[ProgressionSubtypeAdapterRegistry] No adapter found for subtype "${subtype}". Using actor fallback.`,
        { availableSubtypes: this.adapters.map(a => a.subtypeId) }
      );
      return this.adapters.find(a => a.subtypeId === 'actor');
    }

    return adapter;
  }

  /**
   * Get all registered subtypes.
   * @returns {Array<string>}
   */
  getRegisteredSubtypes() {
    return this.adapters.map(a => a.subtypeId);
  }

  /**
   * Get all independent participant adapters.
   * @returns {Array<ProgressionSubtypeAdapter>}
   */
  getIndependentAdapters() {
    return this.adapters.filter(a => a.isIndependent);
  }

  /**
   * Get all dependent participant adapters.
   * @returns {Array<ProgressionSubtypeAdapter>}
   */
  getDependentAdapters() {
    return this.adapters.filter(a => a.isDependent);
  }

  /**
   * Debug info for all adapters.
   * @returns {Object}
   */
  debug() {
    return {
      registeredAdapters: this.adapters.map(a => a.debug()),
      independentCount: this.getIndependentAdapters().length,
      dependentCount: this.getDependentAdapters().length,
    };
  }
}
