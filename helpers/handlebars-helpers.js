/**
 * SWSE Handlebars Helpers
 * Registers custom helpers for use in system templates.
 */

export function registerHandlebarsHelpers() {
  // ---- Debug helper ----
  Handlebars.registerHelper("log", function (...args) {
    console.log("🪶 Handlebars log:", ...args);
  });

  // ---- String helpers ----
  Handlebars.registerHelper("uppercase", str => (str ?? "").toString().toUpperCase());
  Handlebars.registerHelper("lowercase", str => (str ?? "").toString().toLowerCase());
  Handlebars.registerHelper("capitalize", str => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // ---- Math helpers ----
  Handlebars.registerHelper("add", (a, b) => Number(a) + Number(b));
  Handlebars.registerHelper("sub", (a, b) => Number(a) - Number(b));
  Handlebars.registerHelper("mul", (a, b) => Number(a) * Number(b));
  Handlebars.registerHelper("div", (a, b) => (Number(b) ? Number(a) / Number(b) : 0));

  // ---- Comparison helpers ----
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("ne", (a, b) => a !== b);
  Handlebars.registerHelper("gt", (a, b) => a > b);
  Handlebars.registerHelper("lt", (a, b) => a < b);
  Handlebars.registerHelper("gte", (a, b) => a >= b);
  Handlebars.registerHelper("lte", (a, b) => a <= b);

  // ---- Logic helpers ----
  Handlebars.registerHelper("and", (a, b) => a && b);
  Handlebars.registerHelper("or", (a, b) => a || b);
  Handlebars.registerHelper("not", a => !a);

  // ---- List / object helpers ----
  Handlebars.registerHelper("join", (arr, sep) => Array.isArray(arr) ? arr.join(sep ?? ", ") : arr);
  Handlebars.registerHelper("length", arr => (Array.isArray(arr) ? arr.length : 0));
  Handlebars.registerHelper("json", context => JSON.stringify(context, null, 2));

  // ---- Conditional block helper (ifCond) ----
  Handlebars.registerHelper("ifCond", function (v1, operator, v2, options) {
    switch (operator) {
      case "==": return (v1 == v2) ? options.fn(this) : options.inverse(this);
      case "===": return (v1 === v2) ? options.fn(this) : options.inverse(this);
      case "!=": return (v1 != v2) ? options.fn(this) : options.inverse(this);
      case "!==": return (v1 !== v2) ? options.fn(this) : options.inverse(this);
      case "<": return (v1 < v2) ? options.fn(this) : options.inverse(this);
      case "<=": return (v1 <= v2) ? options.fn(this) : options.inverse(this);
      case ">": return (v1 > v2) ? options.fn(this) : options.inverse(this);
      case ">=": return (v1 >= v2) ? options.fn(this) : options.inverse(this);
      case "&&": return (v1 && v2) ? options.fn(this) : options.inverse(this);
      case "||": return (v1 || v2) ? options.fn(this) : options.inverse(this);
      default: return options.inverse(this);
    }
  });

  console.log("✅ SWSE Handlebars helpers registered successfully.");
}
