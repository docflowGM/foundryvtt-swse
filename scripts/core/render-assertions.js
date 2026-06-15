/**
 * Render Assertions System
 *
 * Provides fail-fast checks for AppV2 sheet rendering
 * Catches silent failures before they become UI ghosts
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
   * Best-effort path finder for values that structuredClone cannot copy.
   * This keeps AppV2 failures actionable instead of only reporting the
   * browser's generic "Window/function could not be cloned" message.
   */
  static findFirstNonSerializablePath(value, path = 'context', seen = new WeakSet()) {
    if (value == null) return null;

    const type = typeof value;
    if (type === 'function') return { path, reason: 'function', preview: value.name || 'anonymous function' };
    if (type === 'symbol') return { path, reason: 'symbol', preview: String(value) };
    if (type === 'bigint' || type === 'string' || type === 'number' || type === 'boolean') return null;

    if (type !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    try {
      structuredClone(value);
      return null;
    } catch (cloneError) {
      if (typeof Window !== 'undefined' && value instanceof Window) return { path, reason: 'Window', preview: 'Window' };
      if (typeof Document !== 'undefined' && value instanceof Document) return { path, reason: 'Document', preview: 'Document' };
      if (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) return { path, reason: 'HTMLElement', preview: value.tagName || 'HTMLElement' };
      if (typeof Node !== 'undefined' && value instanceof Node) return { path, reason: 'Node', preview: value.nodeName || 'Node' };
      if (typeof AbortController !== 'undefined' && value instanceof AbortController) return { path, reason: 'AbortController', preview: 'AbortController' };
      if (typeof AbortSignal !== 'undefined' && value instanceof AbortSignal) return { path, reason: 'AbortSignal', preview: 'AbortSignal' };

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) {
          const child = this.findFirstNonSerializablePath(value[i], `${path}[${i}]`, seen);
          if (child) return child;
        }
        return { path, reason: cloneError?.message || 'array clone failed', preview: 'Array' };
      }

      if (value instanceof Map) {
        let index = 0;
        for (const [key, entry] of value.entries()) {
          const child = this.findFirstNonSerializablePath(entry, `${path}.<Map:${String(key) || index}>`, seen);
          if (child) return child;
          index += 1;
        }
        return { path, reason: cloneError?.message || 'map clone failed', preview: 'Map' };
      }

      if (value instanceof Set) {
        let index = 0;
        for (const entry of value.values()) {
          const child = this.findFirstNonSerializablePath(entry, `${path}.<Set:${index}>`, seen);
          if (child) return child;
          index += 1;
        }
        return { path, reason: cloneError?.message || 'set clone failed', preview: 'Set' };
      }

      for (const key of Object.keys(value)) {
        let childValue;
        try {
          childValue = value[key];
        } catch (accessError) {
          return { path: `${path}.${key}`, reason: `getter failed: ${accessError?.message || accessError}`, preview: key };
        }
        const child = this.findFirstNonSerializablePath(childValue, `${path}.${key}`, seen);
        if (child) return child;
      }

      return {
        path,
        reason: cloneError?.message || 'object clone failed',
        preview: value?.constructor?.name || 'Object'
      };
    }
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
      const firstBadPath = this.findFirstNonSerializablePath(context);
      const pathHint = firstBadPath
        ? ` First non-cloneable path: ${firstBadPath.path} (${firstBadPath.reason}${firstBadPath.preview ? `: ${firstBadPath.preview}` : ''}).`
        : '';
      const msg = `[${componentName}] Context failed serialization check (contains non-cloneable objects): ${error.message}.${pathHint}`;
      swseLogger.error(msg, { firstBadPath });
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
