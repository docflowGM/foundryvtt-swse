// ============================================
// FILE: module/module/helpers/handlebars-module/helpers.js
// Handlebars template module/helpers for SWSE
// ============================================

export function registerHandlebarsHelpers() {
  console.log("SWSE | Registering Handlebars module/helpers...");

  // ============================================
  // TEXT FORMATTING
  // ============================================
  
  Handlebars.registerHelper('uppercase', function(str) {
    if (!str) return '';
    return String(str).toUpperCase();
  });

  Handlebars.registerHelper('lowercase', function(str) {
    if (!str) return '';
    return String(str).toLowerCase();
  });

  Handlebars.registerHelper('capitalize', function(str) {
    if (!str) return '';
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
  });

  Handlebars.registerHelper('titlecase', function(str) {
    if (!str) return '';
    return String(str).replace(/\w\S*/g, txt => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  });

  // ============================================
  // MATH & NUMBERS
  // ============================================
  
  Handlebars.registerHelper('add', function(a, b) {
    return Number(a || 0) + Number(b || 0);
  });

  Handlebars.registerHelper('subtract', function(a, b) {
    return Number(a || 0) - Number(b || 0);
  });

  Handlebars.registerHelper('multiply', function(a, b) {
    return Number(a || 0) * Number(b || 0);
  });

  Handlebars.registerHelper('divide', function(a, b) {
    if (b === 0) return 0;
    return Number(a || 0) / Number(b || 1);
  });

  Handlebars.registerHelper('abs', function(num) {
    return Math.abs(Number(num || 0));
  });

  Handlebars.registerHelper('floor', function(num) {
    return Math.floor(Number(num || 0));
  });

  Handlebars.registerHelper('ceil', function(num) {
    return Math.ceil(Number(num || 0));
  });

  Handlebars.registerHelper('round', function(num) {
    return Math.round(Number(num || 0));
  });

  // ============================================
  // COMPARISONS
  // ============================================
  
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('ne', function(a, b) {
    return a !== b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper('and', function() {
    return Array.prototype.slice.call(arguments, 0, -1).every(Boolean);
  });

  Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  Handlebars.registerHelper('not', function(value) {
    return !value;
  });

  // ============================================
  // ARRAY & OBJECT HELPERS
  // ============================================
  
  Handlebars.registerHelper('times', function(n, block) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += block.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper('length', function(array) {
    if (!array) return 0;
    return array.length || 0;
  });

  // ============================================
  // SWSE-SPECIFIC HELPERS
  // ============================================
  
  Handlebars.registerHelper('signedNumber', function(num) {
    const n = Number(num || 0);
    return n >= 0 ? `+${n}` : String(n);
  });

  Handlebars.registerHelper('abilityMod', function(score) {
    const s = Number(score || 10);
    return Math.floor((s - 10) / 2);
  });

  Handlebars.registerHelper('abilityModSigned', function(score) {
    const s = Number(score || 10);
    const mod = Math.floor((s - 10) / 2);
    return mod >= 0 ? `+${mod}` : String(mod);
  });

  // ============================================
  // DEBUGGING
  // ============================================
  
  Handlebars.registerHelper('debug', function(value) {
    console.log('Handlebars Debug:', value);
    return '';
  });

  Handlebars.registerHelper('json', function(value) {
    return JSON.stringify(value, null, 2);
  });

  console.log("SWSE | ✓ Handlebars module/helpers registered");
}
