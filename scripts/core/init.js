import { HookInvestigator } from "/systems/foundryvtt-swse/scripts/governance/sentinel/hook-investigator.js";
/**
 * SWSE Init — placeholder to satisfy Foundry system validation
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { GMDroidApprovalDashboard } from "/systems/foundryvtt-swse/scripts/apps/gm-droid-approval-dashboard.js";
import { registerVehiclePreCreateHooks } from "/systems/foundryvtt-swse/scripts/actors/vehicle/vehicle-precreate-hooks.js";
import { initSidebarSentinelTrace } from "/systems/foundryvtt-swse/scripts/core/sidebar-sentinel-trace.js";
import { initSidebarIconComparison } from "/systems/foundryvtt-swse/scripts/core/sidebar-icon-comparison.js";
import { initSidebarIconClassAudit } from "/systems/foundryvtt-swse/scripts/core/sidebar-icon-class-audit.js";

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
    console.log('[SWSE] Sidebar diagnostics initialized successfully');
  } catch (err) {
    console.error('[SWSE] Failed to initialize sidebar diagnostics:', err);
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

// Phase 4: Register GM Droid Approval Dashboard
Hooks.once('ready', () => {
  // Add a button to the GM sidebar for droid approval
  if (game.user.isGM) {
    const btn = document.createElement('button');
    btn.id = 'gm-droid-approval-btn';
    btn.className = 'gm-droid-approval-button';
    btn.innerHTML = '<i class="fa-solid fa-clipboard-check"></i> Droid Approvals';
    btn.title = 'Review and approve pending custom droids';
    btn.addEventListener('click', () => GMDroidApprovalDashboard.open());

    // Add to GM tools section if it exists, otherwise add to a custom location
    const sceneTools = document.querySelector('#scene-tools');
    if (sceneTools) {
      sceneTools.appendChild(btn);
    }
  }
});


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
