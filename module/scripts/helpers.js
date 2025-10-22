/**
 * Handlebars Helpers for SWSE System
 * Note: These helpers are also registered in scripts/swse-actor.js
 * This file ensures they're available even if swse-actor.js loads later
 */


// Register Handlebars helpers
Handlebars.registerHelper('upper', function(str) {
    if (typeof str === 'string') {
        return str.toUpperCase();
    }
    return str;
});

Handlebars.registerHelper('lower', function(str) {
    if (typeof str === 'string') {
        return str.toLowerCase();
    }
    return str;
});

Handlebars.registerHelper('capitalize', function(str) {
    if (typeof str === 'string') {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    return str;
});

Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for(let i = 0; i < n; ++i)
        accum += block.fn(i);
    return accum;
});

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

Handlebars.registerHelper('ne', function(a, b) {
    return a !== b;
});

Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
});

Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
});

Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
});

Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
});

Handlebars.registerHelper('and', function() {
    return Array.prototype.every.call(arguments, Boolean);
});

Handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

Handlebars.registerHelper('toUpperCase', function(str) {
    return String(str).toUpperCase();
});
