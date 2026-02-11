/**
 * SWSE Discovery System - Main Entry Point
 *
 * Three-layer progressive disclosure:
 * 1. Micro Tooltips (always available)
 * 2. Guided Callouts (first-use hints)
 * 3. First-Launch Feature Tour (opt-in, skippable)
 */

import { DiscoveryUserState } from './user-state.js';
import { TooltipRegistry } from './tooltip-registry.js';
import { CalloutManager } from './callout-manager.js';
import { FeatureTour } from './feature-tour.js';
import { registerDiscoverySettings } from './discovery-settings.js';

const SYSTEM_ID = 'foundryvtt-swse';

export function initializeDiscoverySystem() {
  // Register settings & persistence (must happen during 'init')
  registerDiscoverySettings();
  DiscoveryUserState.registerSetting();
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
  if (game.settings.get(SYSTEM_ID, 'devMode')) {
    console.log('SWSE | Discovery system initialized');
    globalThis.SWSEDiscovery = {
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
    if (!game.settings.get(SYSTEM_ID, 'disableTooltips')) {
      TooltipRegistry.bind(root);
    }
  } catch { /* setting may not be ready */ }

  // Callouts
  try {
    CalloutManager.evaluate(root);
  } catch { /* non-fatal */ }
}

// Re-export for direct imports
export { DiscoveryUserState } from './user-state.js';
export { TooltipRegistry } from './tooltip-registry.js';
export { CalloutManager } from './callout-manager.js';
export { FeatureTour } from './feature-tour.js';
