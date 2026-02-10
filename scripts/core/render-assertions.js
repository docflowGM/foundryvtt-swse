/**
 * Render Assertions System
 *
 * Provides fail-fast checks for AppV2 sheet rendering
 * Catches silent failures before they become UI ghosts
 */

import { swseLogger } from '../utils/logger.js';

export class RenderAssertions {
  /**
   * Verify sheet render completed successfully
   * Call this at the end of _onRender()
   */
  static assertRenderComplete(app, componentName) {
    if (!app || !app.element || !(app.element instanceof HTMLElement)) {
      const msg = `[${componentName}] Render failed: element is not an HTMLElement`;
      swseLogger.error(msg);
      throw new Error(msg);
    }

    // Check for content
    if (!app.element.innerHTML || app.element.innerHTML.trim().length === 0) {
      const msg = `[${componentName}] Render completed but element is empty (no content rendered)`;
      swseLogger.error(msg);
      throw new Error(msg);
    }

    swseLogger.log(`✓ [${componentName}] Character Sheet Rendered Successfully (AppV2)`);
  }

  /**
   * Verify partial render completed
   * Use when rendering sub-components
   */
  static assertPartialComplete(selector, partialName) {
    if (!selector) {
      const msg = `[${partialName}] Selector validation failed: null or empty`;
      swseLogger.warn(msg);
      return false;
    }

    if (!(selector instanceof HTMLElement)) {
      const msg = `[${partialName}] Partial target is not an HTMLElement`;
      swseLogger.warn(msg);
      return false;
    }

    if (!selector.innerHTML || selector.innerHTML.trim().length === 0) {
      const msg = `[${partialName}] Partial rendered but target is empty`;
      swseLogger.warn(msg);
      return false;
    }

    swseLogger.debug(`✓ [${partialName}] Partial render complete`);
    return true;
  }

  /**
   * Assert critical DOM elements exist after render
   * Throws if any required elements are missing
   */
  static assertDOMElements(root, requiredSelectors, componentName) {
    if (!(root instanceof HTMLElement)) {
      throw new Error(`[${componentName}] Root is not an HTMLElement`);
    }

    const missing = [];
    for (const selector of requiredSelectors) {
      if (!root.querySelector(selector)) {
        missing.push(selector);
      }
    }

    if (missing.length > 0) {
      const msg = `[${componentName}] Missing required DOM elements: ${missing.join(', ')}`;
      swseLogger.error(msg);
      throw new Error(msg);
    }

    swseLogger.debug(`✓ [${componentName}] All required DOM elements present`);
  }

  /**
   * Assert context is serializable (AppV2 requirement)
   */
  static assertContextSerializable(context, componentName) {
    try {
      structuredClone(context);
      swseLogger.debug(`✓ [${componentName}] Context is serializable`);
      return true;
    } catch (error) {
      const msg = `[${componentName}] Context failed serialization check (contains non-cloneable objects): ${error.message}`;
      swseLogger.error(msg);
      throw new Error(msg);
    }
  }

  /**
   * Assert actor data is valid
   */
  static assertActorValid(actor, componentName) {
    if (!actor || !actor.id) {
      throw new Error(`[${componentName}] Actor missing or invalid`);
    }

    if (!actor.system) {
      throw new Error(`[${componentName}] Actor missing system data`);
    }

    swseLogger.debug(`✓ [${componentName}] Actor validation passed`);
  }

  /**
   * Log render checkpoint (timing / debugging)
   */
  static logCheckpoint(componentName, phase, metadata = {}) {
    const timestamp = new Date().toISOString();
    swseLogger.debug(`[${componentName}] ${phase} @ ${timestamp}`, metadata);
  }
}
