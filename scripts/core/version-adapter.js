/**
 * Foundry Version Adapter - Phase 5 Forward Compatibility
 *
 * Isolates version-specific APIs behind adapters.
 * Makes it easier to support multiple Foundry versions.
 *
 * Usage:
 *   const version = getFoundryVersion();
 *   if (isV13()) { ... }
 *   if (supportsFormApplicationV2()) { ... }
 */

import { log } from "/systems/foundryvtt-swse/scripts/core/foundry-env.js";

/**
 * Get Foundry version as semantic version parts
 * @returns {Object} - { major, minor, patch, full }
 */
export function getFoundryVersion() {
  try {
    const versionString = game?.version || '13.0.0';
    const parts = versionString.split('.');
    return {
      major: parseInt(parts[0]) || 13,
      minor: parseInt(parts[1]) || 0,
      patch: parseInt(parts[2]) || 0,
      full: versionString
    };
  } catch {
    log.warn('Could not parse Foundry version, assuming v13');
    return { major: 13, minor: 0, patch: 0, full: '13.0.0' };
  }
}

/**
 * Check if running on specific Foundry version
 */
export function isV13() {
  return getFoundryVersion().major === 13;
}

export function isV14() {
  return getFoundryVersion().major === 14;
}

export function isV15() {
  return getFoundryVersion().major === 15;
}

export function isV13Plus() {
  const v = getFoundryVersion();
  return v.major >= 13;
}

/**
 * Feature detection for version-specific capabilities
 */
export const VersionFeatures = {
  /**
   * v13+ supports ApplicationV2
   */
  supportsApplicationV2() {
    return isV13Plus();
  },

  /**
   * v13+ supports HandlebarsApplicationMixin
   */
  supportsHandlebarsApplicationMixin() {
    return isV13Plus();
  },

  /**
   * v13+ uses new sheet registration API
   */
  supportsNewSheetRegistration() {
    return isV13Plus();
  },

  /**
   * v13+ has foundry.documents.collections API
   */
  supportsFdyDocumentCollections() {
    return isV13Plus();
  },

  /**
   * Returns FormApplication base class appropriate for version
   * v13: FormApplicationMixin(FormApplication) - returns the class
   * v14+: May change structure
   */
  getFormApplicationBase() {
    if (isV13Plus()) {
      // v13 pattern
      return FormApplicationMixin || FormApplication;
    }
    // Fallback
    return FormApplication;
  },

  /**
   * Get actor creation method appropriate for version
   * v13+: Actor.createDocuments()
   * v12: Actor.create()
   */
  getActorCreationMethod() {
    if (isV13Plus()) {
      return 'createDocuments'; // Use Actor.createDocuments()
    }
    return 'create'; // Fallback to Actor.create()
  }
};

/**
 * Deprecation warnings for v13 code that will break in v14
 * Only logs in dev mode
 */
export function warnDeprecation(message, context = {}) {
  try {
    const debugMode = game?.settings?.get?.('foundryvtt-swse', 'debugMode');
    if (debugMode) {
      log.warn(`[Deprecation] ${message}`, context);
    }
  } catch {
    // Silent fail in non-dev mode
  }
}

/**
 * Log forward compatibility issues found
 * Used during development to prepare for next Foundry version
 */
export function logForwardCompatibilityIssue(file, line, issue) {
  const v = getFoundryVersion();
  log.warn(
    `[Forward Compat] ${issue} (${file}:${line}) - May break in v${v.major + 1}+`
  );
}

/**
 * Register version info and adapters to global scope
 */
export function registerVersionAdapter() {
  if (typeof window !== 'undefined') {
    window.SWSEVersion = {
      getFoundryVersion,
      isV13,
      isV14,
      isV15,
      isV13Plus,
      features: VersionFeatures
    };

    const v = getFoundryVersion();
    log.info(
      `[Version] System initialized on Foundry v${v.major}.${v.minor}.${v.patch}`
    );
  }
}

/**
 * Validate system compatibility with current Foundry version
 */
export function validateSystemCompatibility() {
  const v = getFoundryVersion();
  const v13Required = true;

  if (v13Required && !isV13Plus()) {
    const msg = `System requires Foundry v13+, running v${v.major}`;
    log.error(msg);
    ui?.notifications?.error?.(msg);
    return false;
  }

  if (isV14() || isV15()) {
    log.warn(
      `[Future Version] Running on Foundry v${v.major} - not officially verified`
    );
  }

  return true;
}

/**
 * API compatibility layer - can be extended for future versions
 */
export const CompatibilityAdapter = {
  /**
   * Create actor(s) in a version-agnostic way
   */
  async createActor(actorData, options = {}) {
    if (isV13Plus()) {
      return await Actor.createDocuments(
        Array.isArray(actorData) ? actorData : [actorData],
        options
      );
    }
    // Fallback for v12
    return await Actor.create(actorData, options);
  },

  /**
   * Create embedded document in a version-agnostic way
   */
  async createEmbedded(parent, type, data, options = {}) {
    if (!parent || !type) return null;

    try {
      const method = parent.createEmbeddedDocuments ? 'createEmbeddedDocuments' : 'create';
      const result = await parent[method](type, Array.isArray(data) ? data : [data], options);
      return result;
    } catch (err) {
      log.error(`Failed to create embedded ${type}:`, err.message);
      return null;
    }
  }
};
