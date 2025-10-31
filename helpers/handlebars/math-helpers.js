export const mathHelpers = {
  add: (a, b) => (parseFloat(a) || 0) + (parseFloat(b) || 0),
  subtract: (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0),
  multiply: (a, b) => (parseFloat(a) || 0) * (parseFloat(b) || 0),
  divide: (a, b) => {
    const divisor = parseFloat(b);
    return divisor !== 0 ? (parseFloat(a) || 0) / divisor : 0;
  },
  abs: (num) => Math.abs(parseFloat(num) || 0),
  floor: (num) => Math.floor(parseFloat(num) || 0),
  ceil: (num) => Math.ceil(parseFloat(num) || 0),
  round: (num) => Math.round(parseFloat(num) || 0),
  min: (...args) => Math.min(...args.slice(0, -1).map(n => parseFloat(n) || 0)),
  max: (...args) => Math.max(...args.slice(0, -1).map(n => parseFloat(n) || 0))
};
