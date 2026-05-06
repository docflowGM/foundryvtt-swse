/**
 * Holonet Source Registry
 *
 * Registers and manages source families and adapters
 */

import { SOURCE_FAMILY } from './contracts/enums.js';

export class HolonetSourceRegistry {
  static #sources = new Map();

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
   * Initialize all registered sources
   */
  static async initializeAll() {
    for (const [sourceFamily, adapter] of this.#sources) {
      if (typeof adapter.initialize === 'function') {
        await adapter.initialize();
      }
    }
  }
}
