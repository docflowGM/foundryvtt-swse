export const mathHelpers = {
  add: (a, b) => Number(a || 0) + Number(b || 0),
  subtract: (a, b) => Number(a || 0) - Number(b || 0),
  multiply: (a, b) => Number(a || 0) * Number(b || 0),
  mult: (a, b) => Number(a || 0) * Number(b || 0), // Alias for multiply
  divide: (a, b) => {
    const divisor = Number(b);
    return divisor !== 0 ? Number(a || 0) / divisor : 0;
  },
  floor: (value) => Math.floor(Number(value || 0)),
  ceil: (value) => Math.ceil(Number(value || 0)),
  round: (value) => Math.round(Number(value || 0)),
  abs: (value) => Math.abs(Number(value || 0)),
  min: (...args) => {
    const values = args.slice(0, -1).map(v => Number(v || 0));
    return Math.min(...values);
  },
  max: (...args) => {
    const values = args.slice(0, -1).map(v => Number(v || 0));
    return Math.max(...values);
  },
  
  numberFormat: (value, options) => {
    // SAFE VERSION - handles non-numeric values gracefully
    const num = Number(value);
    
    // Return '0' for non-numeric values instead of crashing
    if (isNaN(num) || !isFinite(num)) {
      swseLogger.warn('SWSE | numberFormat: Non-numeric value received:', value);
      return '0';
    }
    
    // Get options from hash
    const opts = options?.hash || {};
    const decimals = Number(opts.decimals) || 0;
    const sign = opts.sign || false;
    
    // Format the number
    const formatted = num.toFixed(decimals);
    return sign && num >= 0 ? `+${formatted}` : formatted;
  }
};
