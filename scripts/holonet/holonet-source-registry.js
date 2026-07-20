/**
 * Holonet Source Registry
 *
 * Registers and manages source families and adapters
 */

import { SOURCE_FAMILY } from './contracts/enums.js';

export class HolonetSourceRegistry {
  static #sources = new Map();
  static #initializedAdapters = new WeakSet();
  static #initializationPromises = new WeakMap();

  /**
   * Register a source family adapter
   */
  static register(sourceFamily, adapter) {
    this.#sources.set(sourceFamily, adapter);
    console.log(`[Holonet] Registered source: ${sourceFamily}`);
  }

  /**
   * Get source adapter
   */
  static get(sourceFamily) {
    return this.#sources.get(sourceFamily) ?? null;
  }

  /**
   * Check if source is registered
   */
  static has(sourceFamily) {
    return this.#sources.has(sourceFamily);
  }

  /**
   * Get all registered sources as [sourceFamily, adapter] pairs.
   * @returns {[string, Object][]}
   */
  static getAll() {
    return Array.from(this.#sources.entries());
  }

  /**
   * Iterate registered sources as [sourceFamily, adapter] pairs.
   * Mirrors Map.entries() so callers can use for...of.
   * @returns {IterableIterator<[string, Object]>}
   */
  static entries() {
    return this.#sources.entries();
  }

  /**
   * Return normalized metadata for a registered source adapter.
   * Safe to call on unregistered families — returns null.
   *
   * The adapter may optionally expose any of these static fields:
   *   sourceFamily, categoryId, label, defaultSender, defaultAudience,
   *   defaultIntent, defaultSurfaces
   *
   * @param {string} sourceFamily
   * @returns {Object|null}
   */
  static getMeta(sourceFamily) {
    const adapter = this.get(sourceFamily);
    if (!adapter) return null;
    return {
      sourceFamily:    adapter.sourceFamily    ?? sourceFamily,
      categoryId:      adapter.categoryId      ?? null,
      label:           adapter.label           ?? sourceFamily,
      defaultSender:   adapter.defaultSender   ?? null,
      defaultAudience: adapter.defaultAudience ?? null,
      defaultIntent:   adapter.defaultIntent   ?? null,
      defaultSurfaces: Array.isArray(adapter.defaultSurfaces) ? adapter.defaultSurfaces : [],
      hasInitialize:   typeof adapter.initialize   === 'function',
      hasCreateRecord: typeof adapter.createRecord === 'function',
      hasShouldEmit:   typeof adapter.shouldEmit   === 'function'
    };
  }

  /**
   * Initialize one adapter exactly once, even when the same adapter class is
   * registered under several source-family aliases or initializeAll() is called
   * more than once. Failed initialization is not cached and may be retried.
   *
   * @param {Object|Function} adapter
   * @returns {Promise<void>}
   */
  static async #initializeAdapter(adapter) {
    if (typeof adapter?.initialize !== 'function') return;
    if (this.#initializedAdapters.has(adapter)) return;

    let pending = this.#initializationPromises.get(adapter);
    if (!pending) {
      pending = Promise.resolve()
        .then(() => adapter.initialize())
        .then(() => {
          this.#initializedAdapters.add(adapter);
        })
        .finally(() => {
          this.#initializationPromises.delete(adapter);
        });
      this.#initializationPromises.set(adapter, pending);
    }

    await pending;
  }

  /**
   * Initialize every unique registered source adapter once.
   * Several Holonet source families intentionally alias the same adapter class
   * (for example system/training/workbench/faction/games). Initializing by map
   * entry caused duplicate hooks and repeated startup logging.
   */
  static async initializeAll() {
    for (const adapter of this.#sources.values()) {
      await this.#initializeAdapter(adapter);
    }
  }
}
