/**
 * SVG Layout Debug Utilities - Phase 4.4 Implementation
 * ======================================================
 * Developer tools for debugging SVG panel layouts and safe areas
 *
 * FEATURES:
 * - Grid overlay visualization (10px alignment grid)
 * - Safe area indicators (content layer boundaries)
 * - Overlay element visualization (positioned elements)
 * - Anchor point visualization
 *
 * ACTIVATION:
 * 1. Via CONFIG: CONFIG.SWSE.debug.layoutDebug = true
 * 2. Via console: game.swse.toggleLayoutDebug()
 * 3. Via chat command: /swse-debug-layout
 *
 * @module scripts/debug/layout-debug.js
 */

export class LayoutDebugManager {
  /**
   * Initialize layout debug system
   * Call this during system initialization
   */
  static initialize() {
    // Store reference to debug manager in game object
    game.swse = game.swse || {};
    game.swse.layoutDebug = this;
    game.swse.toggleLayoutDebug = () => this.toggle();

    // Register chat command
    if (window.Hooks) {
      Hooks.on('chatMessage', (chatLog, message, chatData) => {
        if (message.startsWith('/swse-debug-layout')) {
          this.toggle();
          ui.notifications.info(
            `Layout debug mode ${this.isEnabled() ? 'ENABLED' : 'DISABLED'}`
          );
          return false;
        }
      });
    }

    // Apply initial state if enabled
    if (CONFIG.SWSE?.debug?.layoutDebug) {
      this.enable();
    }
  }

  /**
   * Enable layout debug mode
   */
  static enable() {
    CONFIG.SWSE.debug.layoutDebug = true;
    this._updateUI();
    console.log('%cSWSE Layout Debug Mode: ENABLED', 'color: #00ff88; font-weight: bold; font-size: 14px');
    this._logDebugInfo();
  }

  /**
   * Disable layout debug mode
   */
  static disable() {
    CONFIG.SWSE.debug.layoutDebug = false;
    this._updateUI();
    console.log('%cSWSE Layout Debug Mode: DISABLED', 'color: #ff6b6b; font-weight: bold; font-size: 14px');
  }

  /**
   * Toggle layout debug mode
   */
  static toggle() {
    if (this.isEnabled()) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Check if layout debug mode is enabled
   * @returns {boolean}
   */
  static isEnabled() {
    return CONFIG.SWSE?.debug?.layoutDebug ?? false;
  }

  /**
   * Update UI with debug-layout class
   * @private
   */
  static _updateUI() {
    // Update all SWSE app elements
    document.querySelectorAll('.swse-app').forEach(app => {
      if (this.isEnabled()) {
        app.classList.add('debug-layout');
      } else {
        app.classList.remove('debug-layout');
      }
    });
  }

  /**
   * Log helpful debug information to console
   * @private
   */
  static _logDebugInfo() {
    console.log('%c═ SWSE Layout Debug Information ═', 'color: #00ff88; font-weight: bold');
    console.log('%c Grid: 10px alignment grid overlaid on all panels', 'color: #9ed0ff');
    console.log('%c Content Areas: Green dashed border shows safe content area', 'color: #00c6ff');
    console.log('%c Overlay Elements: Orange checkered pattern shows positioned element layer', 'color: #ffd66b');
    console.log('%c Anchors: Red dots show positioned element anchor points', 'color: #ff6b6b');
    console.log('%c Frame Layer: Dimmed (50% opacity) - shows SVG artwork boundaries', 'color: #b5daff');
    console.log('%c\n Usage: game.swse.toggleLayoutDebug() or /swse-debug-layout', 'color: #00ff88; font-style: italic');
  }
}

/**
 * Initialize debug system on load
 */
if (window.Hooks) {
  Hooks.once('ready', () => {
    LayoutDebugManager.initialize();
  });
}
