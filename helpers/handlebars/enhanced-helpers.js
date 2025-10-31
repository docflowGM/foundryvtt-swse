/**
 * Enhanced Handlebars Helpers for SWSE
 */

export function registerHandlebarsHelpers() {
  // Check if two values are equal
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  // Check if value is greater than
  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });
  
  // Check if value is less than
  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });
  
  // Add two numbers
  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });
  
  // Subtract two numbers
  Handlebars.registerHelper('subtract', function(a, b) {
    return a - b;
  });
  
  // Multiply two numbers
  Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });
  
  // Divide two numbers
  Handlebars.registerHelper('divide', function(a, b) {
    return Math.floor(a / b);
  });
  
  // Format number with optional sign
  Handlebars.registerHelper('numberFormat', function(value, options) {
    const num = parseInt(value) || 0;
    const decimals = options.hash.decimals !== undefined ? options.hash.decimals : 0;
    const sign = options.hash.sign || false;
    
    let result = num.toFixed(decimals);
    
    if (sign && num > 0) {
      result = '+' + result;
    }
    
    return result;
  });
  
  // Check if checkbox should be checked
  Handlebars.registerHelper('checked', function(value) {
    return value ? 'checked' : '';
  });
  
  // Check if option should be selected
  Handlebars.registerHelper('selected', function(value, option) {
    return value === option ? 'selected' : '';
  });
  
  // Capitalize first letter
  Handlebars.registerHelper('capitalize', function(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  
  // Lowercase string
  Handlebars.registerHelper('lowercase', function(str) {
    if (!str) return '';
    return str.toLowerCase();
  });
  
  // Uppercase string
  Handlebars.registerHelper('uppercase', function(str) {
    if (!str) return '';
    return str.toUpperCase();
  });
  
  // Times loop helper
  Handlebars.registerHelper('times', function(n, block) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += block.fn(i);
    }
    return result;
  });
  
  console.log('SWSE | Enhanced Handlebars helpers registered');
}
