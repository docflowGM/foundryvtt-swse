import { ShellMutationGuard } from '/systems/foundryvtt-swse/scripts/ui/shell/ShellMutationGuard.js';

const PATCH_FLAG = Symbol.for('swse.forceSuiteRenderGuardHotfix.v1');
let registered = false;

function isForceSuiteRuntimeStack() {
  const stack = new Error().stack ?? '';
  return stack.includes('/scripts/engine/force/force-suite-runtime-repairs.js')
    || stack.includes('scripts/engine/force/force-suite-runtime-repairs.js');
}

function patchSheetRender(app) {
  if (!app || typeof app.render !== 'function' || app[PATCH_FLAG]) return;
  const originalRender = app.render;
  app.render = function swseForceSuiteRenderGuardBridge(...args) {
    if (args?.[0] === false && isForceSuiteRuntimeStack()) {
      return ShellMutationGuard.withSurfaceRender(this, () => originalRender.apply(this, args), {
        reason: 'force-suite-runtime-repaint',
        surfaceId: 'force'
      });
    }
    return originalRender.apply(this, args);
  };
  app[PATCH_FLAG] = true;
}

function patchOpenSheets() {
  for (const app of Object.values(ui?.windows ?? {})) {
    if (app?.actor?.type === 'character' || app?.document?.type === 'character') patchSheetRender(app);
  }
}

export function registerForceSuiteRenderGuardHotfix() {
  if (registered) return false;
  registered = true;
  Hooks.on('renderSWSEV2CharacterSheet', patchSheetRender);
  Hooks.on('renderApplicationV2', patchSheetRender);
  Hooks.once('ready', patchOpenSheets);
  return true;
}

export default registerForceSuiteRenderGuardHotfix;
