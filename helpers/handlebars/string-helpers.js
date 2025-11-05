export const stringHelpers = {
  upper: (str) => String(str || '').toUpperCase(),
  lower: (str) => String(str || '').toLowerCase(),
  capitalize: (str) => {
    const s = String(str || '');
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },
  toUpperCase: (str) => String(str || '').toUpperCase(),
  truncate: (str, length = 50) => {
    const s = String(str || '');
    return s.length > length ? s.substring(0, length) + '...' : s;
  }
};
