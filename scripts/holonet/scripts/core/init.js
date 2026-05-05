import { HookInvestigator } from "/systems/foundryvtt-swse/scripts/governance/sentinel/hook-investigator.js";
/**
 * SWSE Init — placeholder to satisfy Foundry system validation
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { registerVehiclePreCreateHooks } from "/systems/foundryvtt-swse/scripts/actors/vehicle/vehicle-precreate-hooks.js";
import { initSidebarSentinelTrace } from "/systems/foundryvtt-swse/scripts/core/sidebar-sentinel-trace.js";
import { initSidebarIconComparison } from "/systems/foundryvtt-swse/scripts/core/sidebar-icon-comparison.js";
import { initSidebarIconClassAudit } from "/systems/foundryvtt-swse/scripts/core/sidebar-icon-class-audit.js";
import { initSidebarStructureDiagnostics } from "/systems/foundryvtt-swse/scripts/core/sidebar-structure-diagnostics.js";

Hooks.once('init', () => {
  console.log('[SWSE] Init hook fired - starting sidebar diagnostics initialization');
  // Temporary: Initialize surgical sidebar diagnostics for icon disappearance
  try {
    console.log('[SWSE] Calling initSidebarSentinelTrace...');
    initSidebarSentinelTrace();
    console.log('[SWSE] Calling initSidebarIconComparison...');
    initSidebarIconComparison();
    console.log('[SWSE] Calling initSidebarIconClassAudit...');
    initSidebarIconClassAudit();
    console.log('[SWSE] Calling initSidebarStructureDiagnostics...');
    initSidebarStructureDiagnostics();
    console.log('[SWSE] Sidebar diagnostics initialized successfully');
  } catch (err) {
    console.error('[SWSE] Failed to initialize sidebar diagnostics:', err);
  }

  if (!game.settings.settings.has("foundryvtt-swse.maxTemplatesPerItem")) {
    game.settings.register("foundryvtt-swse", "maxTemplatesPerItem", {
      name: "Maximum Templates Per Item",
      hint: "Default maximum number of templates that can be attached to a weapon, armor, or gear item in the customization workbench.",
      scope: "world",
      config: true,
      type: Number,
      range: { min: 1, max: 5, step: 1 },
      default: 1
    });
  }

  // Register Enhanced Massive Damage setting
  if (!game.settings.settings.has("foundryvtt-swse.enableEnhancedMassiveDamage")) {
    game.settings.register("foundryvtt-swse", "enableEnhancedMassiveDamage", {
      name: "Enable Enhanced Massive Damage",
      hint: "Use enhanced massive damage rules.",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
  }

  SWSELogger.log('SWSE system initialized successfully.');
});

// DEPRECATED: GM Droid Approval canvas access is now registered through
// scripts/scene-controls/swse-canvas-tools.js via SceneControlRegistry.
// Do not add direct getSceneControlButtons hooks here.


// Hook Investigator (runtime hook validation)
Hooks.once("init", () => {
  HookInvestigator.initialize();
});

// Register vehicle preCreate hooks
Hooks.once("init", () => {
  registerVehiclePreCreateHooks();
  SWSELogger.log('Vehicle preCreate hooks registered');
});



// ==========================================================
// HANDLEBARS HELPERS (IMMEDIATE REGISTRATION)
// ==========================================================
if (!Handlebars.helpers.range) {
  Handlebars.registerHelper("range", function(start, end) {
    let arr = [];
    for (let i = start; i < end; i++) {
      arr.push(i);
    }
    return arr;
  });
}

// Multiply helper for confidence bar width calculation
if (!Handlebars.helpers.mul) {
  Handlebars.registerHelper("mul", function(a, b) {
    return (a * b);
  });
}

// Round to percentage helper for confidence display
if (!Handlebars.helpers.roundPercent) {
  Handlebars.registerHelper("roundPercent", function(num) {
    return Math.round((num || 0) * 100);
  });
}

// Add helper (used by progression-shell.hbs step counter)
if (!Handlebars.helpers.add) {
  Handlebars.registerHelper("add", function(a, b) {
    return (a ?? 0) + (b ?? 0);
  });
}

// Divide helper for percentage calculations (e.g., point buy progress bar)
if (!Handlebars.helpers.div) {
  Handlebars.registerHelper("div", function(a, b, factor) {
    const divisor = b ?? 1;
    const result = (a ?? 0) / divisor;
    // If a third parameter is provided, multiply by it (for percentage calculations)
    return factor ? result * factor : result;
  });
}

// Count helper for summary/checklist templates
if (!Handlebars.helpers.count) {
  Handlebars.registerHelper("count", function(value) {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    if (typeof value === "string") return value.length;
    return 0;
  });
}

