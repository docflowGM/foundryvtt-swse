/**
 * Custom roll right-sidebar launcher.
 *
 * Uses Foundry's AppV2 header-controls hook for the Chat sidebar app instead of
 * mutating #sidebar/#sidebar-tabs directly.
 */

import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { CustomRollDialog } from "/systems/foundryvtt-swse/scripts/apps/custom-roll/custom-roll-dialog.js";

function isChatSidebarApp(app) {
  const name = String(app?.constructor?.name ?? '');
  const id = String(app?.id ?? app?.options?.id ?? '');
  const tab = String(app?.tabName ?? app?.options?.tabName ?? app?.category ?? '');

  return name === 'ChatLog'
    || name === 'ChatMessages'
    || id === 'chat'
    || tab === 'chat';
}

export function registerCustomRollSidebarControl() {
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    if (!isChatSidebarApp(app) || !Array.isArray(controls)) return;
    if (controls.some(control => control?.action === 'swse-custom-roll')) return;

    controls.unshift({
      action: 'swse-custom-roll',
      icon: 'fa-solid fa-dice-d20',
      label: 'Custom Roll',
      visible: true,
      handler: () => CustomRollDialog.open()
    });
  }, {
    id: 'swse-custom-roll-sidebar-control',
    priority: 0,
    description: 'Adds the SWSE Custom Roll launcher to the Chat sidebar header controls.',
    category: 'ui'
  });
}

export default registerCustomRollSidebarControl;
