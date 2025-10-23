/**
 * SWSE Handlebars Helpers
 * Registers custom helpers for use in system templates.
 */

export function registerHandlebarsHelpers() {
  // ---- Debug helper ----
  Handlebars.registerHelper("log", function (...args) {
    console.log("Handlebars log:", ...args);
  });

  // ---- String helpers ----
  Handlebars.registerHelper("uppercase", str => (str ?? "").toString().toUpperCase());
  Handlebars.registerHelper("lowercase", str => (str ?? "").toString().toLowerCase());
  Handlebars.registerHelper("upper", str => (str ?? "").toString().toUpperCase());
  Handlebars.registerHelper("toUpperCase", str => (str ?? "").toString().toUpperCase());
  Handlebars.registerHelper("capitalize", str => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // ---- Boolean/checkbox helpers ----
  Handlebars.registerHelper("checked", value => value ? "checked" : "");

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
  Handlebars.registerHelper("keys", obj => (obj ? Object.keys(obj) : []));
  Handlebars.registerHelper("array", function () {
    return Array.prototype.slice.call(arguments, 0, -1);
  });

  // ---- Array contains helper ----
  Handlebars.registerHelper("includes", (array, value) => {
    return Array.isArray(array) && array.includes(value);
  });

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

  // ---- SWSE-specific helpers ----
  Handlebars.registerHelper("getCrewName", id => {
    const actor = game.actors.get(id) || canvas.tokens.get(id)?.actor;
    return actor ? actor.name : "";
  });

  Handlebars.registerHelper("calculateDamageThreshold", actor => {
    if (!actor?.system) return 0;

    const fortitude = actor.system.defenses?.fortitude?.total ?? 10;
    const size = actor.system.size ?? "medium";

    const sizeMods = {
      tiny: -5,
      small: 0,
      medium: 0,
      large: 5,
      huge: 10,
      gargantuan: 20,
      colossal: 50
    };

    const sizeMod = sizeMods[size.toLowerCase()] ?? 0;

    const hasFeat = actor.items?.some(
      i => i.type === "feat" && i.name?.toLowerCase() === "improved damage threshold"
    );

    const featBonus = hasFeat ? 5 : 0;
    return fortitude + sizeMod + featBonus;
  });

  Handlebars.registerHelper("getSkillMod", (skill, abilities, level, conditionTrack) => {
    if (!skill || !abilities) return 0;

    const abilMod = abilities[skill.ability]?.mod || 0;
    const trained = skill.trained ? 5 : 0;
    const focus = skill.focus ? 1 : 0;
    const halfLevel = Math.floor((level || 1) / 2);
    const conditionPenalty = getConditionPenalty(conditionTrack);

    return abilMod + trained + focus + halfLevel + conditionPenalty;
  });

  function getConditionPenalty(track) {
    const penalties = {
      normal: 0,
      "-1": -1,
      "-2": -2,
      "-5": -5,
      "-10": -10,
      helpless: -100
    };
    return penalties[track] || 0;
  }

  console.log("SWSE | Handlebars helpers registered");

  // Editor helper for rich text fields
  Handlebars.registerHelper('editor', function(content, options) {
    // Foundry provides this in v10+, but we include a fallback
    return new Handlebars.SafeString(content || '');
  });

  // Number formatting helper
  Handlebars.registerHelper('numberFormat', function(value, options) {
    const num = parseFloat(value) || 0;
    const decimals = options.hash.decimals || 0;
    const sign = options.hash.sign || false;
    
    let result = num.toFixed(decimals);
    if (sign && num >= 0) result = '+' + result;
    return result;
  });
}

// Auto-register helpers on load
registerHandlebarsHelpers();
