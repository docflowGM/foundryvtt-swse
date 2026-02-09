/**
 * Canvas UI Manager — DISABLED
 * This file previously corrupted Foundry's canvas UI.
 */

export class CanvasUIManager {
  static init() {
    console.warn('SWSE: CanvasUIManager disabled for canvas stability');
  }

  static initialize() {
    // Backwards-compat shim for older init code
    return this.init();
  }
}
