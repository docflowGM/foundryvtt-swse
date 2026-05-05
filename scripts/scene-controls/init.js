/**
 * Scene control initialization via getSceneControlButtons hook.
 *
 * Foundry v13 native: this is the single SWSE canvas Scene Controls entrypoint.
 */

import { sceneControlRegistry } from "/systems/foundryvtt-swse/scripts/scene-controls/api.js";
import { getCurrentPhase, SWSE_PHASES } from "/systems/foundryvtt-swse/scripts/state/phase.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { registerSWSECanvasTools } from "/systems/foundryvtt-swse/scripts/scene-controls/swse-canvas-tools.js";

let initialized = false;

/**
 * Initialize SWSE scene controls.
 * Call once during system init.
 */
export function initializeSceneControls() {
  if (initialized) return;
  initialized = true;

  registerNarrativeControlPlaceholders();
  registerSWSECanvasTools();
  sceneControlRegistry.installFoundryHook();

  SWSELogger.log('SWSE scene controls registered through SceneControlRegistry.');
}

function registerNarrativeControlPlaceholders() {
  // These existing groups are intentionally preserved as placeholders for future
  // engine-backed Force/tech/combat actions, but they are registered through the
  // central registry so they cannot create duplicate getSceneControlButtons hooks.
  sceneControlRegistry.registerGroup('force', {
    title: 'Force Abilities',
    icon: 'fa-solid fa-burst'
  });

  sceneControlRegistry.registerGroup('tech', {
    title: 'Tech & Gadgets',
    icon: 'fa-solid fa-microchip'
  });

  sceneControlRegistry.registerGroup('combat', {
    title: 'Combat Actions',
    icon: 'fa-solid fa-crosshairs'
  });

  sceneControlRegistry.registerTool('force', 'force-push', {
    title: 'Force Push',
    icon: 'fa-solid fa-hand-paper',
    onClick: () => SWSELogger.debug('Force Push activated'),
    visible: () => hasSelectedToken(),
    enabled: () => isPhase(SWSE_PHASES.NARRATIVE) && hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-move', {
    title: 'Force Move',
    icon: 'fa-solid fa-arrow-up',
    onClick: () => SWSELogger.debug('Force Move activated'),
    visible: () => hasSelectedToken(),
    enabled: () => isPhase(SWSE_PHASES.NARRATIVE) && hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-sense', {
    title: 'Force Sense',
    icon: 'fa-solid fa-eye',
    onClick: () => SWSELogger.debug('Force Sense activated'),
    visible: () => hasSelectedToken(),
    enabled: () => hasSelectedToken()
  });

  sceneControlRegistry.registerTool('tech', 'slice', {
    title: 'Slice Terminal',
    icon: 'fa-solid fa-lock-open',
    onClick: () => SWSELogger.debug('Slice activated'),
    visible: () => hasSelectedToken(),
    enabled: () => isPhase(SWSE_PHASES.NARRATIVE) && hasSelectedToken()
  });

  sceneControlRegistry.registerTool('tech', 'deploy-gadget', {
    title: 'Deploy Gadget',
    icon: 'fa-solid fa-cube',
    onClick: () => SWSELogger.debug('Deploy Gadget activated'),
    visible: () => hasSelectedToken(),
    enabled: () => hasSelectedToken()
  });

  sceneControlRegistry.registerTool('combat', 'aim', {
    title: 'Aim',
    icon: 'fa-solid fa-bullseye',
    onClick: () => SWSELogger.debug('Aim activated'),
    visible: () => isPhase(SWSE_PHASES.COMBAT),
    enabled: () => isPhase(SWSE_PHASES.COMBAT) && hasSelectedToken()
  });

  sceneControlRegistry.registerTool('combat', 'full-attack', {
    title: 'Full Attack',
    icon: 'fa-solid fa-burst',
    onClick: () => SWSELogger.debug('Full Attack activated'),
    visible: () => isPhase(SWSE_PHASES.COMBAT),
    enabled: () => isPhase(SWSE_PHASES.COMBAT) && hasSelectedToken()
  });
}

function isPhase(phase) {
  return getCurrentPhase() === phase;
}

function hasSelectedToken() {
  return (globalThis.canvas?.tokens?.controlled?.length ?? 0) > 0;
}
