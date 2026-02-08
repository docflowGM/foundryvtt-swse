/**
 * Scene control initialization via getSceneControlButtons hook
 * Foundry v13 native - registers all SWSE scene controls
 */

import { sceneControlRegistry } from './api.js';
import { getCurrentPhase, SWSE_PHASES } from '../state/phase.js';

/**
 * Initialize SWSE scene controls
 * Call this once during system init
 */
export function initializeSceneControls() {
  // Register control groups
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

  // Register Force tools
  sceneControlRegistry.registerTool('force', 'force-push', {
    title: 'Force Push',
    icon: 'fa-solid fa-hand-paper',
    onClick: () => console.log('Force Push activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-move', {
    title: 'Force Move',
    icon: 'fa-solid fa-arrow-up',
    onClick: () => console.log('Force Move activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-sense', {
    title: 'Force Sense',
    icon: 'fa-solid fa-eye',
    onClick: () => console.log('Force Sense activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _hasSelectedToken()
  });

  // Register Tech tools
  sceneControlRegistry.registerTool('tech', 'slice', {
    title: 'Slice Terminal',
    icon: 'fa-solid fa-lock-open',
    onClick: () => console.log('Slice activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('tech', 'deploy-gadget', {
    title: 'Deploy Gadget',
    icon: 'fa-solid fa-cube',
    onClick: () => console.log('Deploy Gadget activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _hasSelectedToken()
  });

  // Register Combat tools (combat phase only)
  sceneControlRegistry.registerTool('combat', 'aim', {
    title: 'Aim',
    icon: 'fa-solid fa-bullseye',
    onClick: () => console.log('Aim activated'),
    visible: () => _isPhase(SWSE_PHASES.COMBAT),
    enabled: () => _isPhase(SWSE_PHASES.COMBAT) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('combat', 'full-attack', {
    title: 'Full Attack',
    icon: 'fa-solid fa-burst',
    onClick: () => console.log('Full Attack activated'),
    visible: () => _isPhase(SWSE_PHASES.COMBAT),
    enabled: () => _isPhase(SWSE_PHASES.COMBAT) && _hasSelectedToken()
  });

  // Hook into getSceneControlButtons to inject controls
  Hooks.on('getSceneControlButtons', (controls) => {
    const swseControls = sceneControlRegistry.getControls();
    controls.push(...swseControls);
  });
}

/**
 * Helper: Check if phase matches
 */
function _isPhase(phase) {
  return getCurrentPhase() === phase;
}

/**
 * Helper: Check if a token is selected
 */
function _hasSelectedToken() {
  return canvas?.tokens?.controlled?.length > 0;
}
