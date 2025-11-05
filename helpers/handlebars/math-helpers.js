export const mathHelpers = {
  add: (a, b) => Number(a || 0) + Number(b || 0),
  subtract: (a, b) => Number(a || 0) - Number(b || 0),
  multiply: (a, b) => Number(a || 0) * Number(b || 0),
  divide: (a, b) => {
    const divisor = Number(b);
    return divisor !== 0 ? Number(a || 0) / divisor : 0;
  },
  floor: (value) => Math.floor(Number(value || 0)),
  ceil: (value) => Math.ceil(Number(value || 0)),
  round: (value) => Math.round(Number(value || 0)),
  abs: (value) => Math.abs(Number(value || 0)),
  min: (...args) => Math.min(...args.map(Number)),
  max: (...args) => Math.max(...args.map(Number)),
  numberFormat: (value, options = {}) => {
    const num = Number(value || 0);
    const { decimals = 0, sign = false } = options.hash || {};
    const formatted = num.toFixed(decimals);
    return sign && num >= 0 ? `+${formatted}` : formatted;
  }
};
