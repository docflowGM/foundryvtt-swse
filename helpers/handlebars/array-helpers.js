export const arrayHelpers = {
  first: (array) => Array.isArray(array) ? array[0] : undefined,
  last: (array) => Array.isArray(array) ? array[array.length - 1] : undefined,
  length: (array) => Array.isArray(array) ? array.length : 0,
  join: (array, separator = ', ') => Array.isArray(array) ? array.join(separator) : '',
  contains: (array, value) => Array.isArray(array) && array.includes(value),
  isEmpty: (array) => !Array.isArray(array) || array.length === 0,
  sort: (array, key) => {
    if (!Array.isArray(array)) {return [];}
    return [...array].sort((a, b) => {
      const aVal = key ? a[key] : a;
      const bVal = key ? b[key] : b;
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  },
  find: (array, key, value) => {
    if (!Array.isArray(array)) {return undefined;}
    // If only two arguments, treat as (array, value)
    if (value === undefined) {
      return array.find(item => item === key);
    }
    // Three arguments: (array, key, value) - find by property
    return array.find(item => item && item[key] === value);
  },
  /**
   * Filter extra skill uses based on training status.
   * Shows all uses except "Trained Only" items when the skill is not trained.
   * @param {Array} extraUses - Array of skill use objects with 'name' property
   * @param {boolean} isTrained - Whether the skill is trained
   * @returns {Array} Filtered array of skill uses
   */
  filterExtraUsesByTraining: (extraUses, isTrained) => {
    if (!Array.isArray(extraUses)) {return [];}
    if (isTrained) {return extraUses;}
    return extraUses.filter(use => {
      const trainedOnly = Boolean(use?.trainedOnly);
      if (trainedOnly) {return false;}
      const name = String(use?.name ?? use?.label ?? '');
      return !/trained only/i.test(name) && !/\(trained\)/i.test(name);
    });
  },

  /**
   * Convert object entries to array format compatible with Handlebars
   * Usage: {{#each (objectEntries object) as |entry|}}
   * Access: {{entry.key}} and {{entry.value}}
   *
   * Converts {a: 1, b: 2} into [{key: 'a', value: 1}, {key: 'b', value: 2}]
   * @param {Object} obj - Object to convert
   * @returns {Array} Array of {key, value} objects
   */
  objectEntries: (obj) => {
    if (!obj || typeof obj !== 'object') {return [];}
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value,
      0: key,    // Also support array notation for backwards compatibility
      1: value
    }));
  }
};
