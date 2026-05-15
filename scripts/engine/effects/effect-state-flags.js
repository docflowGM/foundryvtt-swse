/**
 * Effect State Flags
 *
 * Read-only helper for normalizing ActiveEffect metadata.
 * Supports both 'foundryvtt-swse' (canonical) and 'swse' (legacy) namespaces.
 * Does not write metadata in this phase.
 */

/**
 * Safely read a flag from both canonical and legacy namespaces.
 * Priority: canonical ('foundryvtt-swse') → legacy ('swse')
 * @param {ActiveEffect} effect - The ActiveEffect
 * @param {string} key - Flag key
 * @returns {*} Flag value or undefined
 */
function getSwseFlagFromEffect(effect, key) {
  const canonical = effect?.flags?.['foundryvtt-swse']?.[key];
  if (canonical !== undefined) return canonical;
  return effect?.flags?.swse?.[key];
}

/**
 * Normalize severity values to card severity constants.
 * @param {string} severity - Raw severity value
 * @returns {string} One of: danger, warning, info, positive
 */
function normalizeSeverity(severity) {
  const valid = ["danger", "warning", "info", "positive"];
  if (typeof severity === "string" && valid.includes(severity.toLowerCase())) {
    return severity.toLowerCase();
  }
  return "info";
}

/**
 * Ensure details is always an array of strings.
 * @param {*} details - Raw details value
 * @returns {Array} Array of strings
 */
function normalizeDetailsArray(details) {
  if (Array.isArray(details)) {
    return details.filter(Boolean).map(d => String(d ?? "").trim()).filter(Boolean);
  }
  if (typeof details === "string" && details.trim()) {
    return [details.trim()];
  }
  return [];
}

/**
 * Ensure tags is always an array of strings.
 * @param {*} tags - Raw tags value
 * @returns {Array} Array of strings
 */
function normalizeTagsArray(tags) {
  if (Array.isArray(tags)) {
    return tags.filter(Boolean).map(t => String(t ?? "").trim()).filter(Boolean);
  }
  if (typeof tags === "string" && tags.trim()) {
    return [tags.trim()];
  }
  return [];
}

/**
 * Convert Force Power metadata into normalized effect state.
 * @param {Object} forcePowerMeta - forcePowerEffect flag data
 * @returns {Object|null} Normalized metadata or null
 */
function normalizeForcePowerEffect(forcePowerMeta) {
  if (!forcePowerMeta || typeof forcePowerMeta !== "object") {
    return null;
  }

  const { powerName, powerItemId, rollTotal } = forcePowerMeta;

  if (!powerName) return null;

  const details = [];
  if (rollTotal !== undefined && rollTotal !== null) {
    details.push(`Roll total: ${rollTotal}`);
  }

  return {
    family: "forcePower",
    effectType: "forcePower",
    severity: "info",
    sourceType: "forcePower",
    sourceName: powerName,
    summary: `Active Force power effect (${powerName}).`,
    details,
    icon: null,
    tags: ["force", "force-power"],
    durationLabel: null,
    removable: false,
    removableBy: null,
    raw: forcePowerMeta
  };
}

export class EffectStateFlags {
  /**
   * Read and normalize metadata from an ActiveEffect.
   * Returns null if no metadata is found.
   * @param {ActiveEffect} effect - The ActiveEffect
   * @returns {Object|null} Normalized metadata or null
   */
  static read(effect) {
    if (!effect) return null;

    // Try effectState first (reserved for future metadata writes)
    const effectState = getSwseFlagFromEffect(effect, "effectState");
    if (effectState && typeof effectState === "object") {
      return this.normalize(effectState, effect);
    }

    // Try Force Power metadata
    const forcePowerEffect = getSwseFlagFromEffect(effect, "forcePowerEffect");
    if (forcePowerEffect && typeof forcePowerEffect === "object") {
      return this.fromForcePowerEffect(forcePowerEffect);
    }

    // No recognized metadata
    return null;
  }

  /**
   * Normalize raw metadata into standard shape.
   * Defensive: missing/malformed fields return sensible defaults.
   * @param {Object} raw - Raw metadata object
   * @param {ActiveEffect} effect - The ActiveEffect (for fallback context)
   * @param {Object} options - Normalization options
   * @returns {Object} Normalized metadata
   */
  static normalize(raw, effect, options = {}) {
    if (!raw || typeof raw !== "object") {
      return null;
    }

    const {
      family = null,
      effectType = null,
      severity = "info",
      sourceType = null,
      sourceName = null,
      summary = null,
      details = [],
      icon = null,
      tags = [],
      durationLabel = null,
      removable = false,
      removableBy = null
    } = raw;

    return {
      family,
      effectType,
      severity: normalizeSeverity(severity),
      sourceType,
      sourceName,
      summary: typeof summary === "string" ? summary.trim() : null,
      details: normalizeDetailsArray(details),
      icon,
      tags: normalizeTagsArray(tags),
      durationLabel: typeof durationLabel === "string" ? durationLabel.trim() : null,
      removable: !!removable,
      removableBy,
      raw
    };
  }

  /**
   * Convert Force Power effect metadata into normalized state.
   * @param {Object} forcePowerMeta - forcePowerEffect flag data
   * @returns {Object|null} Normalized metadata or null
   */
  static fromForcePowerEffect(forcePowerMeta) {
    return normalizeForcePowerEffect(forcePowerMeta);
  }

  /**
   * Utility: check if effect has any recognized metadata.
   * @param {ActiveEffect} effect - The ActiveEffect
   * @returns {boolean} True if metadata exists
   */
  static hasMetadata(effect) {
    if (!effect) return false;
    const effectState = getSwseFlagFromEffect(effect, "effectState");
    if (effectState && typeof effectState === "object") return true;
    const forcePowerEffect = getSwseFlagFromEffect(effect, "forcePowerEffect");
    if (forcePowerEffect && typeof forcePowerEffect === "object") return true;
    return false;
  }
}

export default EffectStateFlags;
