export const comparisonHelpers = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  and: (...args) => args.slice(0, -1).every(Boolean),
  or: (...args) => args.slice(0, -1).some(Boolean),
  not: (value) => !value
};
