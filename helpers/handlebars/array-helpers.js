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
    // If trained, show all uses; otherwise filter out "Trained Only" items
    if (isTrained) {return extraUses;}
    return extraUses.filter(use => !use?.name?.includes('Trained Only'));
  }
};
