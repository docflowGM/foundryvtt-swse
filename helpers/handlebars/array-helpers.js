export const arrayHelpers = {
  first: (array) => Array.isArray(array) ? array[0] : undefined,
  last: (array) => Array.isArray(array) ? array[array.length - 1] : undefined,
  length: (array) => Array.isArray(array) ? array.length : 0,
  join: (array, separator = ', ') => Array.isArray(array) ? array.join(separator) : '',
  contains: (array, value) => Array.isArray(array) && array.includes(value),
  isEmpty: (array) => !Array.isArray(array) || array.length === 0,
  sort: (array, key) => {
    if (!Array.isArray(array)) return [];
    return [...array].sort((a, b) => {
      const aVal = key ? a[key] : a;
      const bVal = key ? b[key] : b;
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }
};
