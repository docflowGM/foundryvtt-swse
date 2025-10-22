// ============================================
// FILE: scripts/helpers/handlebars-helpers.js
// Handlebars Helper Functions
// ============================================

export function registerHandlebarsHelpers() {
  // Helper registration check - ensure Handlebars is available
  if (typeof Handlebars === 'undefined') {
    console.error("SWSE | Handlebars is not defined! Cannot register helpers.");
    return;
  }


    // Uppercase helper
    Handlebars.registerHelper('upper', function(str) {
        if (!str) return '';
        return str.toString().toUpperCase();
    });
    
    // Capitalize helper
    Handlebars.registerHelper('capitalize', function(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    });
    
    // toUpperCase helper (alias)
    Handlebars.registerHelper('toUpperCase', function(str) {
        if (!str) return '';
        return str.toString().toUpperCase();
    });
    
    // Greater than or equal
    Handlebars.registerHelper('gte', function(a, b) {
        return a >= b;
    });
    
    // Equals
    Handlebars.registerHelper('eq', function(a, b) {
        return a === b;
    });
    
    // Includes (array contains)
    Handlebars.registerHelper('includes', function(array, value) {
        if (!Array.isArray(array)) return false;
        return array.includes(value);
    });
    
    // Checked attribute
    Handlebars.registerHelper('checked', function(value) {
        return value ? 'checked' : '';
    });
    
    console.log('SWSE | Handlebars helpers registered');
}
/** ============================================
 * SWSE Added Helper: mathFloor
 * ============================================ */
Handlebars.registerHelper("mathFloor", function(value) {
  return Math.floor(value);
});
