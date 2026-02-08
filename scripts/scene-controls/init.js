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
    icon: 'fas fa-burst'
  });

  sceneControlRegistry.registerGroup('tech', {
    title: 'Tech & Gadgets',
    icon: 'fas fa-microchip'
  });

  sceneControlRegistry.registerGroup('combat', {
    title: 'Combat Actions',
    icon: 'fas fa-crosshairs'
  });

  // Register Force tools
  sceneControlRegistry.registerTool('force', 'force-push', {
    title: 'Force Push',
    icon: 'fas fa-hand-paper',
    onClick: () => console.log('Force Push activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-move', {
    title: 'Force Move',
    icon: 'fas fa-arrow-up',
    onClick: () => console.log('Force Move activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('force', 'force-sense', {
    title: 'Force Sense',
    icon: 'fas fa-eye',
    onClick: () => console.log('Force Sense activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _hasSelectedToken()
  });

  // Register Tech tools
  sceneControlRegistry.registerTool('tech', 'slice', {
    title: 'Slice Terminal',
    icon: 'fas fa-lock-open',
    onClick: () => console.log('Slice activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _isPhase(SWSE_PHASES.NARRATIVE) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('tech', 'deploy-gadget', {
    title: 'Deploy Gadget',
    icon: 'fas fa-cube',
    onClick: () => console.log('Deploy Gadget activated'),
    visible: () => _hasSelectedToken(),
    enabled: () => _hasSelectedToken()
  });

  // Register Combat tools (combat phase only)
  sceneControlRegistry.registerTool('combat', 'aim', {
    title: 'Aim',
    icon: 'fas fa-bullseye',
    onClick: () => console.log('Aim activated'),
    visible: () => _isPhase(SWSE_PHASES.COMBAT),
    enabled: () => _isPhase(SWSE_PHASES.COMBAT) && _hasSelectedToken()
  });

  sceneControlRegistry.registerTool('combat', 'full-attack', {
    title: 'Full Attack',
    icon: 'fas fa-burst',
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
