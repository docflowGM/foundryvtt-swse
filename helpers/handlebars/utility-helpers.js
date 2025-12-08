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
  }
};
