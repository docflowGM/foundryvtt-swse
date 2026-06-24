/**
 * SWSE Canvas Tool Registrations
 *
 * Foundry V13 scene controls can route custom buttons through native tool
 * selection before invoking button handlers. We register normal host tools and
 * also install a narrow capture fallback so GM datapad buttons remain launchers
 * instead of becoming broken selectable tools.
 */

import { sceneControlRegistry } from "/systems/foundryvtt-swse/scripts/scene-controls/api.js";
import { GMDatapad } from "/systems/foundryvtt-swse/scripts/apps/gm-datapad.js";
let gmDatapadApp = null;
let clickFallbackInstalled = false;

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
    gmDatapadApp = GMDatapad.open('home') ?? gmDatapadApp;
  } catch (error) {
    console.error('[SWSE Scene Controls] Failed to open GM Datapad', error);
    ui?.notifications?.error?.(`Failed to open GM Datapad: ${error.message}`);
  }
}


function targetText(el) {
  if (!el) return '';
  const parts = [
    el.dataset?.tool,
    el.dataset?.action,
    el.dataset?.control,
    el.dataset?.tooltip,
    el.getAttribute?.('aria-label'),
    el.getAttribute?.('title'),
    el.textContent,
    el.className
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function resolveSceneControlFallback(target) {
  const el = target?.closest?.('button, [role="button"], .control-tool, .scene-control, [data-tool], [data-action], [data-control], li');
  const haystack = targetText(el);
  if (!haystack) return null;

  if (haystack.includes('swse-gm-datapad') || haystack.includes('gm datapad') || haystack.includes('swse datapad')) return openGMDatapad;
  return null;
}

function installSceneControlClickFallback() {
  if (clickFallbackInstalled) return;
  clickFallbackInstalled = true;

  document.addEventListener('click', (event) => {
    const handler = resolveSceneControlFallback(event.target);
    if (!handler) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    handler(event);
  }, true);

  globalThis.SWSE ??= {};
  globalThis.SWSE.debug ??= {};
  globalThis.SWSE.debug.openGMDatapad = () => GMDatapad.open('home');
  globalThis.SWSE.debug.openGMDatapadStore = () => GMDatapad.open('store');
}

export function registerSWSECanvasTools() {
  installSceneControlClickFallback();

  sceneControlRegistry.registerHostTool('tokens', 'swse-gm-datapad', {
    title: 'GM Datapad',
    icon: 'swse-scene-control swse-scene-control-datapad',
    button: true,
    visible: () => isGM(),
    enabled: () => isGM(),
    onChange: openGMDatapad,
    onClick: openGMDatapad,
    order: -100
  });

}

export default registerSWSECanvasTools;
