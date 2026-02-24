import { HookInvestigator } from "./sentinel/hook-investigator.js";
/**
 * SWSE Init — placeholder to satisfy Foundry system validation
 */
import { SWSELogger } from './logger.js';
import { GMDroidApprovalDashboard } from '../apps/gm-droid-approval-dashboard.js';
import { registerVehiclePreCreateHooks } from '../actors/vehicle/vehicle-precreate-hooks.js';

Hooks.once('init', () => {
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
// HANDLEBARS RANGE HELPER (IMMEDIATE REGISTRATION)
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
