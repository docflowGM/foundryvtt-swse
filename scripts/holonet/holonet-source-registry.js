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
   * Get all registered sources
   */
  static getAll() {
    return Array.from(this.#sources.entries());
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
