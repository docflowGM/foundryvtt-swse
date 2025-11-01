/**
 * Math helpers for Handlebars
 */
export const mathHelpers = {
  add: (a, b) => (parseFloat(a) || 0) + (parseFloat(b) || 0),
  subtract: (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0),
  multiply: (a, b) => (parseFloat(a) || 0) * (parseFloat(b) || 0),
  divide: (a, b) => {
    const divisor = parseFloat(b) || 0;
    return divisor === 0 ? 0 : (parseFloat(a) || 0) / divisor;
  },
  abs: (num) => Math.abs(parseFloat(num) || 0),
  round: (num) => Math.round(parseFloat(num) || 0),
  floor: (num) => Math.floor(parseFloat(num) || 0),
  ceil: (num) => Math.ceil(parseFloat(num) || 0),
  numberFormat: (num, options) => {
    const n = parseFloat(num) || 0;
    const opts = options?.hash || {};
    if (opts.sign && n >= 0) return '+' + n;
    if (opts.decimals !== undefined) return n.toFixed(opts.decimals);
    return String(n);
  }
};
