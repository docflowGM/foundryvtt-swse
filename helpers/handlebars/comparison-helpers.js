export const comparisonHelpers = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  lt: (a, b) => Number(a) < Number(b),
  lte: (a, b) => Number(a) <= Number(b),
  gt: (a, b) => Number(a) > Number(b),
  gte: (a, b) => Number(a) >= Number(b),
  and: (...args) => args.slice(0, -1).every(Boolean),
  or: (...args) => args.slice(0, -1).some(Boolean),
  not: (value) => !value,
  includes: (array, value) => Array.isArray(array) && array.includes(value),
  checked: (value) => value ? 'checked' : ''
};
