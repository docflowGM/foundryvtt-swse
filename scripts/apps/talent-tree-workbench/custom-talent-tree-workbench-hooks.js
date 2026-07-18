import { openCustomTalentTreeWorkbench } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-workbench.js';

const HOOK_FLAG = Symbol.for('swse.customTalentTreeWorkbenchHooks.v1');

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id)
    ?? canvas?.tokens?.placeables?.find?.(token => token.id === id || token.document?.id === id || token.actor?.id === id)?.actor
    ?? null;
}

function actorFromElement(element) {
  const actorId = element?.dataset?.actorId || element?.closest?.('[data-swse-actor-id]')?.dataset?.swseActorId || '';
  if (actorId) return actorFromId(actorId);

  const appRoot = element?.closest?.('[data-appid], [data-application-id]');
  const appId = appRoot?.dataset?.appid || appRoot?.dataset?.applicationId || '';
  if (appId && ui?.windows) {
    const app = Object.values(ui.windows).find(win => String(win?.appId ?? win?.id ?? '') === String(appId));
    if (app?.actor?.items) return app.actor;
    if (app?.document?.items) return app.document;
  }

  return canvas?.tokens?.controlled?.[0]?.actor ?? null;
}

export function registerCustomTalentTreeWorkbenchHooks() {
  if (globalThis[HOOK_FLAG]) return false;
  globalThis[HOOK_FLAG] = true;

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('[data-action="create-custom-talent-tree"]');
    if (!button) return;
    if (button.closest?.('.swse-custom-tradition-wizard')) return;

    const actor = actorFromElement(button);
    if (!actor) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    openCustomTalentTreeWorkbench(actor, {
      treeType: 'generic',
      renderSheet: () => actor.sheet?.render?.(false)
    }).catch(err => {
      console.error('[SWSE] Custom talent tree workbench failed', err);
      ui?.notifications?.error?.(`Custom talent tree failed: ${err.message}`);
    });
  }, true);

  globalThis.SWSE ??= {};
  globalThis.SWSE.openCustomTalentTreeWorkbench = openCustomTalentTreeWorkbench;
  return true;
}

export default registerCustomTalentTreeWorkbenchHooks;
