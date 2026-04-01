/**
 * sentinel-categories.js — Report categorization and classification
 *
 * Defines all report categories, subcodes, and severities.
 * Used by all Sentinel layers to classify their findings.
 */

export const SENTINEL_CATEGORIES = {
  /**
   * ApplicationV2 contract violations
   * Missing super(), lifecycle timing, DOM mutation outside _renderHTML
   */
  APPV2_CONTRACT: {
    code: 'APPV2_CONTRACT',
    label: 'ApplicationV2 Governance',
    severity: 'WARN',
    subcodes: {
      MISSING_SUPER: 'Missing super() in constructor/method',
      LIFECYCLE_VIOLATION: 'Lifecycle method used incorrectly',
      DOM_OUTSIDE_RENDER: 'DOM mutation outside _renderHTML lifecycle',
      INVALID_EXTENSION: 'Not extending BaseSWSEAppV2',
      RENDER_TIMING: 'DOM manipulation at wrong render phase'
    }
  },

  /**
   * Tab/tabGroup mismatches, panel binding failures
   */
  TABS: {
    code: 'TABS',
    label: 'Tab System',
    severity: 'WARN',
    subcodes: {
      TABGROUP_MISMATCH: 'Tab definition missing from tabGroups',
      SELECTOR_INVALID: 'Tab selector doesn\'t match template',
      BINDING_FAILURE: 'Tab click binding not working',
      DUPLICATE_ID: 'Duplicate tab IDs',
      MISSING_CONTENT: 'Tab panel has no content'
    }
  },

  /**
   * Partial hydration — missing context keys, partial includes, empty panels
   */
  PARTIAL_HYDRATION: {
    code: 'PARTIAL_HYDRATION',
    label: 'Sheet Hydration',
    severity: 'WARN',
    subcodes: {
      EMPTY_PANEL: 'Panel rendered without content',
      MISSING_CONTEXT: 'Context key missing from _prepareContext()',
      MISSING_PARTIAL: 'Partial include not found in template',
      MISSING_ARRAY: 'Array field undefined (e.g., skills, inventory)',
      INCOMPLETE_DATA: 'Partial data loaded, sheet incomplete'
    }
  },

  /**
   * Template integrity — unclosed helpers, duplicate IDs, case mismatches
   */
  TEMPLATE_INTEGRITY: {
    code: 'TEMPLATE_INTEGRITY',
    label: 'Template Integrity',
    severity: 'ERROR',
    subcodes: {
      UNCLOSED_BLOCK: 'Unclosed block helper ({{#if/each/with}})',
      DUPLICATE_ID: 'Duplicate element IDs in template',
      CASE_SENSITIVITY: 'Partial name has wrong case',
      MISSING_FILE: 'Referenced partial file doesn\'t exist',
      SYNTAX_ERROR: 'Handlebars syntax error'
    }
  },

  /**
   * Roll governance — bypassed engine, unhydrated roll cards
   */
  ROLL_PIPELINE: {
    code: 'ROLL_PIPELINE',
    label: 'Roll Governance',
    severity: 'ERROR',
    subcodes: {
      ENGINE_BYPASS: 'Roll bypassed SWSEChat/engine',
      MISSING_FLAGS: 'Roll missing SWSE governance flags',
      MISSING_ASYNC: 'Roll not evaluated with async: true',
      DIRECT_TO_MESSAGE: 'Direct roll.toMessage() call (use SWSEChat)',
      MISSING_METADATA: 'Roll missing metadata (source, modifiers)'
    }
  },

  /**
   * Persistence — field updates not saving, wrong form paths
   */
  PERSISTENCE: {
    code: 'PERSISTENCE',
    label: 'Data Persistence',
    severity: 'ERROR',
    subcodes: {
      UPDATE_FAILED: 'actor.update() failed or not routed through engine',  // @mutation-exception: Governance audit/test code
      WRONG_PATH: 'Form field path doesn\'t match schema',
      NOT_SAVED: 'Changes made but not persisted',
      STALE_DATA: 'Sheet showing stale data after update'
    }
  },

  /**
   * Position stability — window jump, setPosition misuse
   */
  POSITION_STABILITY: {
    code: 'POSITION_STABILITY',
    label: 'Window Position',
    severity: 'INFO',
    subcodes: {
      WINDOW_JUMP: 'Window repositioned unexpectedly',
      SETPOSITION_MISUSE: 'setPosition() called outside proper context',
      OFFSCREEN: 'Window positioned offscreen or unreachable'
    }
  },

  /**
   * Atomicity — multi-update bursts, update loops
   */
  ATOMICITY: {
    code: 'ATOMICITY',
    label: 'Update Atomicity',
    severity: 'WARN',
    subcodes: {
      UPDATE_BURST: '3+ updates in 500ms window',
      UPDATE_LOOP: 'Same field updated multiple times',
      NON_ATOMIC: 'Updates not consolidated into single action'
    }
  },

  /**
   * Store/pack system issues
   */
  STORE_MALL_COP: {
    code: 'STORE_MALL_COP',
    label: 'Store System',
    severity: 'WARN',
    subcodes: {
      PACK_MISSING: 'Store pack unavailable or empty',
      INDEX_AS_DOC: 'Using pack index as document (should use doc)',
      CARD_MISSING_FIELDS: 'Item card missing required fields',
      PURCHASE_GOVERNANCE: 'Purchase not validated through engine',
      CACHE_STALE: 'Store cache out of sync with data'
    }
  }
};

/**
 * Get category config by code
 */
export function getCategoryConfig(categoryCode) {
  for (const config of Object.values(SENTINEL_CATEGORIES)) {
    if (config.code === categoryCode) {
      return config;
    }
  }
  return null;
}

/**
 * Get all categories sorted by name
 */
export function getAllCategories() {
  return Object.values(SENTINEL_CATEGORIES)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Validate category + subcode combination
 */
export function validateCategoryAndSubcode(categoryCode, subcode) {
  const config = getCategoryConfig(categoryCode);
  if (!config) return { valid: false, error: `Unknown category: ${categoryCode}` };
  if (subcode && !config.subcodes[subcode]) {
    return { valid: false, error: `Unknown subcode for ${categoryCode}: ${subcode}` };
  }
  return { valid: true };
}
