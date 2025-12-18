/**
 * Handlebars helpers for the level-up UI
 * Following the SWSE helper group pattern
 */

export const levelupHelpers = {
  /**
   * Equality comparison helper
   * Usage: {{#if (eq a b)}}...{{/if}}
   */
  eq: (a, b) => a === b,

  /**
   * JSON stringification helper
   * Usage: {{json object}}
   */
  json: (v) => JSON.stringify(v, null, 2),

  /**
   * Not equal comparison helper
   * Usage: {{#if (ne a b)}}...{{/if}}
   */
  ne: (a, b) => a !== b
};

export default levelupHelpers;
