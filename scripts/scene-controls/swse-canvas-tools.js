/**
 * SWSE Canvas Tool Registrations
 *
 * All SWSE left-canvas Scene Controls belong here and are registered through
 * SceneControlRegistry. No direct getSceneControlButtons hooks and no DOM mutation.
 */

import { sceneControlRegistry } from "/systems/foundryvtt-swse/scripts/scene-controls/api.js";
import { GMDatapad } from "/systems/foundryvtt-swse/scripts/apps/gm-datapad.js";
import { GMDroidApprovalDashboard } from "/systems/foundryvtt-swse/scripts/apps/gm-droid-approval-dashboard.js";
import { toggleActionPalette, ensureActionPaletteApp } from "/systems/foundryvtt-swse/scripts/ui/action-palette/init.js";

let gmDatapadApp = null;

function selectedTokenExists() {
  return (globalThis.canvas?.tokens?.controlled?.length ?? 0) > 0;
}

function isGM() {
  return Boolean(globalThis.game?.user?.isGM);
}

function openGMDatapad() {
  if (!isGM()) {
    ui?.notifications?.warn?.('Only GMs can access the GM Datapad.');
    return;
  }

  try {
    if (!gmDatapadApp || gmDatapadApp.closing) gmDatapadApp = new GMDatapad();
    gmDatapadApp.render(true);
    gmDatapadApp.bringToFront?.();
  } catch (error) {
    console.error('[SWSE Scene Controls] Failed to open GM Datapad', error);
    ui?.notifications?.error?.(`Failed to open GM Datapad: ${error.message}`);
  }
}

function openDroidApprovals() {
  if (!isGM()) {
    ui?.notifications?.warn?.('Only GMs can access droid approvals.');
    return;
  }

  try {
    GMDroidApprovalDashboard.open();
  } catch (error) {
    console.error('[SWSE Scene Controls] Failed to open droid approvals', error);
    ui?.notifications?.error?.(`Failed to open droid approvals: ${error.message}`);
  }
}

function openActionPalette() {
  try {
    ensureActionPaletteApp();
    toggleActionPalette();
  } catch (error) {
    console.error('[SWSE Scene Controls] Failed to open Action Palette', error);
    ui?.notifications?.error?.(`Failed to open Action Palette: ${error.message}`);
  }
}

export function registerSWSECanvasTools() {
  sceneControlRegistry.registerGroup('swse-datapad', {
    title: 'SWSE Datapad',
    icon: 'swse-scene-control swse-scene-control-aurebesh-i',
    layer: 'TokenLayer',
    visible: () => isGM()
  });

  sceneControlRegistry.registerTool('swse-datapad', 'gm-datapad', {
    title: 'GM Datapad',
    icon: 'swse-scene-control swse-scene-control-aurebesh-i',
    button: true,
    visible: () => isGM(),
    enabled: () => isGM(),
    onClick: openGMDatapad,
    order: 0
  });

  sceneControlRegistry.registerHostTool('token', 'actionPalette', {
    title: 'Action Palette',
    icon: 'swse-scene-control swse-scene-control-action-palette',
    button: true,
    visible: true,
    enabled: () => selectedTokenExists(),
    onClick: openActionPalette,
    order: 90
  });

  sceneControlRegistry.registerHostTool('token', 'gm-droid-approvals', {
    title: 'Droid Approvals',
    icon: 'swse-scene-control swse-scene-control-approval',
    button: true,
    visible: () => isGM(),
    enabled: () => isGM(),
    onClick: openDroidApprovals,
    order: 100
  });
}

export default registerSWSECanvasTools;
