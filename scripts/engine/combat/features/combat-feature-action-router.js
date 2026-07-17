import { handleCombatFeatureAction } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-handlers.js';
import { handleCombatFeatureUxAction } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-ux-handlers.js';

/**
 * Combat Feature Action Router
 *
 * Permanent Phase 4/10 router. It resolves the clicked panel element and actor,
 * then dispatches to UX handlers or named feature handlers. Feature behavior
 * belongs in `combat-feature-handlers.js`; UX behavior belongs in
 * `combat-feature-ux-handlers.js`.
 */

const ROUTER_FLAG = Symbol.for('swse.combatFeatureActionRouter.v3');
let registered = false;

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

async function routeCombatFeatureAction(element) {
  const action = element?.dataset?.action || '';
  const actor = actorFromElement(element);
  if (!actor) {
    ui?.notifications?.warn?.('Could not resolve actor for this combat feature. Reopen the sheet and try again.');
    return;
  }

  const handledUx = await handleCombatFeatureUxAction({ action, actor, element });
  if (handledUx) return;
  return handleCombatFeatureAction({ action, actor, element });
}

function installCombatFeatureRouter() {
  if (globalThis[ROUTER_FLAG]) return false;
  globalThis[ROUTER_FLAG] = true;
  document.addEventListener('click', event => {
    const element = event.target?.closest?.('[data-combat-features-panel] [data-action]');
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    routeCombatFeatureAction(element).catch(err => {
      console.error('[SWSE] Combat feature action failed', err);
      ui?.notifications?.error?.(`Combat feature failed: ${err.message}`);
    });
  }, true);
  return true;
}

export function registerCombatFeatureActionRouter() {
  if (registered) return false;
  registered = true;
  return installCombatFeatureRouter();
}

export default registerCombatFeatureActionRouter;
