/**
 * SWSE Discovery System - Main Entry Point
 *
 * Three-layer progressive disclosure:
 * 1. Micro Tooltips (always available)
 * 2. Guided Callouts (first-use hints)
 * 3. First-Launch Feature Tour (opt-in, skippable)
 */

import { DiscoveryUserState } from "/systems/foundryvtt-swse/scripts/ui/discovery/user-state.js";
import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";
import { TooltipGlossary } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js";
import { CalloutManager } from "/systems/foundryvtt-swse/scripts/ui/discovery/callout-manager.js";
import { FeatureTour } from "/systems/foundryvtt-swse/scripts/ui/discovery/feature-tour.js";
import { registerDiscoverySettings } from "/systems/foundryvtt-swse/scripts/ui/discovery/discovery-settings.js";
import { DefenseTooltip } from "/systems/foundryvtt-swse/scripts/ui/defense-tooltip.js";
import { WeaponTooltip } from "/systems/foundryvtt-swse/scripts/ui/weapon-tooltip.js";
import { CombatStatsTooltip } from "/systems/foundryvtt-swse/scripts/ui/combat-stats-tooltip.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";

const SYSTEM_ID = 'foundryvtt-swse';

export function initializeDiscoverySystem() {
  // Register settings & persistence (must happen during 'init')
  registerDiscoverySettings();
  DiscoveryUserState.registerSetting();

  // Register breakdown providers with TooltipRegistry
  DefenseTooltip.registerProviders();
  WeaponTooltip.registerProviders();
  CombatStatsTooltip.registerProviders();
}

export function onDiscoveryReady() {
  // Load persisted state
  DiscoveryUserState.load();

  // Hook into AppV2 renders to bind tooltips and evaluate callouts
  Hooks.on('renderApplication', _onAppRender);
  Hooks.on('renderActorSheet', _onAppRender);
  Hooks.on('renderItemSheet', _onAppRender);

  // Global dismiss on scroll / resize
  window.addEventListener('scroll', TooltipRegistry.hide, { passive: true, capture: true });

  // Show first-launch tour (non-blocking)
  setTimeout(() => FeatureTour.show(), 1500);

  // Expose for debugging
  if (SettingsHelper.getBoolean('devMode', false)) {
    console.log('SWSE | Discovery system initialized');
    globalThis.SWSEDiscovery = {
      glossary: TooltipGlossary,
      tooltips: TooltipRegistry,
      callouts: CalloutManager,
      tour: FeatureTour,
      state: DiscoveryUserState
    };
  }
}

/**
 * Hook handler for any rendered application.
 * Binds tooltips and evaluates callouts on the rendered element.
 */
function _onAppRender(app, html) {
  // html may be HTMLElement (AppV2) or legacy wrapper (AppV1)
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!(root instanceof HTMLElement)) {return;}

  // Tooltips
  try {
    if (!SettingsHelper.getBoolean('disableTooltips', false)) {
      TooltipRegistry.bind(root);
    }
  } catch { /* setting may not be ready */ }

  // Callouts
  try {
    CalloutManager.evaluate(root);
  } catch { /* non-fatal */ }
}

// Re-export for direct imports
export { DiscoveryUserState } from "/systems/foundryvtt-swse/scripts/ui/discovery/user-state.js";
export { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";
export { TooltipGlossary } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js";
export { CalloutManager } from "/systems/foundryvtt-swse/scripts/ui/discovery/callout-manager.js";
export { FeatureTour } from "/systems/foundryvtt-swse/scripts/ui/discovery/feature-tour.js";
