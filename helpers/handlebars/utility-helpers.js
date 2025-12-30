import { swseLogger } from '../../scripts/utils/logger.js';
/**
 * Utility helpers for Handlebars
 * NO GAME LOGIC - only display helpers
 */
export const utilityHelpers = {
  localize: (key) => game.i18n.localize(key),
  checked: (value) => value ? 'checked' : '',
  selected: (value, compare) => value === compare ? 'selected' : '',
  json: (obj) => {
    try {
      return JSON.stringify(obj);
    } catch (err) {
      return '{}';
    }
  },
  log: (...args) => {
    swseLogger.log('SWSE Template:', ...args.slice(0, -1));
    return '';
  },

  /**
   * Repeat a block N times
   * Usage: {{#times 5}}...{{/times}}
   * Inside the block, @index gives the 0-based iteration number
   */
  times: function(n, options) {
    let result = '';
    const count = Number(n) || 0;
    for (let i = 0; i < count; i++) {
      // Create a proper data object for Handlebars with @index
      const data = options.data ? Handlebars.createFrame(options.data) : {};
      data.index = i;
      result += options.fn(this, { data });
    }
    return result;
  }
};