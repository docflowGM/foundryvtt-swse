/**
 * GM Datapad Scene Control
 *
 * Adds a GM-only canvas Scene Controls launcher for the consolidated GM Datapad.
 * Uses the existing GMDatapad ApplicationV2 as the single authority; this file is
 * only the access point.
 */

import { GMDatapad } from "/systems/foundryvtt-swse/scripts/apps/gm-datapad.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const CONTROL_GROUP = 'token';
const TOOL_NAME = 'swse-gm-datapad';

let gmDatapadInstance = null;
let registered = false;

/**
 * Register the GM Datapad button in Foundry's canvas Scene Controls.
 * Safe for both Foundry's array and object hook payload shapes.
 */
export function registerGMDatapadSceneControl() {
  if (registered) return;
  registered = true;

  Hooks.on('getSceneControlButtons', (controls) => {
    if (!game.user?.isGM) return;

    const tokenControls = getOrCreateControlGroup(controls, CONTROL_GROUP, {
      name: CONTROL_GROUP,
      title: 'Token Controls',
      icon: 'fas fa-circle-dot',
      layer: 'TokenLayer',
      visible: true,
      tools: []
    });

    if (!tokenControls) {
      SWSELogger.warn('[GM Datapad Scene Control] Could not resolve token control group.');
      return;
    }

    if (!Array.isArray(tokenControls.tools)) tokenControls.tools = [];
    if (tokenControls.tools.some((tool) => tool?.name === TOOL_NAME)) return;

    tokenControls.tools.push({
      name: TOOL_NAME,
      title: 'GM Datapad',
      icon: 'swse-aurebesh-i-control',
      button: true,
      visible: true,
      onClick: openGMDatapadFromSceneControl
    });
  });
}

/**
 * Open or focus the singleton GM Datapad instance.
 */
export function openGMDatapadFromSceneControl() {
  if (!game.user?.isGM) {
    ui?.notifications?.warn?.('Only GMs can access the GM Datapad.');
    return null;
  }

  try {
    if (gmDatapadInstance?.rendered) {
      gmDatapadInstance.bringToFront?.();
      return gmDatapadInstance;
    }

    gmDatapadInstance = new GMDatapad();
    gmDatapadInstance.render(true);
    return gmDatapadInstance;
  } catch (err) {
    SWSELogger.error('[GM Datapad Scene Control] Error opening GM Datapad:', err);
    ui?.notifications?.error?.(`Failed to open GM Datapad: ${err.message}`);
    return null;
  }
}

function getOrCreateControlGroup(controls, name, fallback) {
  if (Array.isArray(controls)) {
    let group = controls.find((control) => control?.name === name);
    if (!group) {
      group = structuredCloneSafe(fallback);
      controls.push(group);
    }
    return group;
  }

  if (controls && typeof controls === 'object') {
    let group = controls[name] ?? Object.values(controls).find((control) => control?.name === name);
    if (!group) {
      group = structuredCloneSafe(fallback);
      controls[name] = group;
    }
    return group;
  }

  return null;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return foundry.utils?.deepClone?.(value) ?? foundry.utils?.duplicate?.(value) ?? JSON.parse(JSON.stringify(value));
}

export default registerGMDatapadSceneControl;
