/**
 * Array helpers for Handlebars
 */
export const arrayHelpers = {
  length: (array) => Array.isArray(array) ? array.length : 0,
  first: (array) => Array.isArray(array) && array.length > 0 ? array[0] : null,
  last: (array) => {
    return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
  },
  join: (array, separator = ', ') => Array.isArray(array) ? array.join(separator) : ''
};
