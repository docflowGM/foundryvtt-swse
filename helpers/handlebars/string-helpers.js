/**
 * String helpers for Handlebars
 */
export const stringHelpers = {
  uppercase: (str) => str ? String(str).toUpperCase() : '',
  lowercase: (str) => str ? String(str).toLowerCase() : '',
  capitalize: (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  truncate: (str, length = 50) => {
    if (!str || typeof str !== 'string') return str;
    return str.length > length ? str.substring(0, length) + '...' : str;
  }
};
