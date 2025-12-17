import { swseLogger } from '../../scripts/utils/logger.js';

/**
 * Math-related Handlebars helpers.
 * These are only for display / template math, not game rules.
 */
export const mathHelpers = {
  add: (a, b) => Number(a ?? 0) + Number(b ?? 0),

  subtract: (a, b) => Number(a ?? 0) - Number(b ?? 0),

  multiply: (a, b) => Number(a ?? 0) * Number(b ?? 0),

  // Alias for multiply
  mult: (a, b) => Number(a ?? 0) * Number(b ?? 0),

  divide: (a, b) => {
    const divisor = Number(b ?? 0);
    if (!divisor) return 0;
    return Number(a ?? 0) / divisor;
  },

  floor: (value) => Math.floor(Number(value ?? 0)),

  ceil: (value) => Math.ceil(Number(value ?? 0)),

  round: (value) => Math.round(Number(value ?? 0)),

  abs: (value) => Math.abs(Number(value ?? 0)),

  min: (...args) => {
    const values = args.slice(0, -1).map(v => Number(v ?? 0));
    return values.length ? Math.min(...values) : 0;
  },

  max: (...args) => {
    const values = args.slice(0, -1).map(v => Number(v ?? 0));
    return values.length ? Math.max(...values) : 0;
  },

  clamp: (value, min, max) => {
    const v = Number(value ?? 0);
    const lo = Number(min ?? 0);
    const hi = Number(max ?? 0);
    return Math.min(hi, Math.max(lo, v));
  },

  average: (...args) => {
    const values = args.slice(0, -1).map(v => Number(v ?? 0));
    if (!values.length) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  },

  /**
   * Coerce a value to a safe numeric value for display.
   * Usage: {{safeNumber system.hp.current 0}}
   */
  safeNumber: (value, defaultValue = 0) => {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return Number(defaultValue ?? 0);
    }
    return num;
  },

  /**
   * Format a number with optional decimals and sign.
   * Usage: {{numberFormat value decimals=1 sign=true}}
   */
  numberFormat: (value, options) => {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      swseLogger.warn('SWSE | numberFormat: Non-numeric value received:', value);
      return '0';
    }

    const opts = (options && options.hash) || {};
    const decimals = Number(opts.decimals ?? 0) || 0;
    const sign = !!opts.sign;

    const formatted = num.toFixed(decimals);
    return sign && num >= 0 ? `+${formatted}` : formatted;
  }
};
