import { executeCombatFeatureMultiattack, getMultiattackSpec } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-handlers.js';
import { canonicalCombatFeatureKey } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-classifier.js';

/**
 * Legacy Combat Action Bridge
 *
 * Phase 6 bridge that intercepts legacy Double Attack / Triple Attack combat
 * action rows before the transitional hotfix can run its duplicate handler. This
 * keeps old sheet rows usable while making the permanent combat-feature handler
 * the single multiattack execution path.
 */

const LEGACY_MULTIATTACK_BRIDGE_FLAG = Symbol.for('swse.combatFeatureLegacyMultiattackBridge.v1');
let registered = false;

function compact(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '');
}

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

function legacyCombatRowFromElement(element) {
  if (element?.closest?.('[data-combat-features-panel]')) return null;
  return element?.closest?.('.combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat') ?? null;
}

function featureIdFromLegacyRow(row, element) {
  const text = [
    row?.dataset?.actionId,
    row?.dataset?.actionKey,
    row?.dataset?.swseCanonicalActionKey,
    row?.querySelector?.('.action-name')?.textContent,
    element?.title,
    element?.textContent
  ].join(' ');
  const key = compact(text);
  if (key.includes('tripleattack')) return 'triple-attack';
  if (key.includes('doubleattack')) return 'double-attack';
  return null;
}

function installLegacyMultiattackBridge() {
  if (globalThis[LEGACY_MULTIATTACK_BRIDGE_FLAG]) return false;
  globalThis[LEGACY_MULTIATTACK_BRIDGE_FLAG] = true;

  document.addEventListener('click', event => {
    const element = event.target?.closest?.('[data-action="swse-v2-use-action"], .combat-action-row, .swse-combat-action-card, .action-row, .swse-concept-action-row--combat');
    const row = legacyCombatRowFromElement(element);
    if (!row) return;

    const featureId = featureIdFromLegacyRow(row, element);
    if (!featureId || !getMultiattackSpec(canonicalCombatFeatureKey(featureId))) return;

    const actor = actorFromElement(row) ?? actorFromElement(element);
    if (!actor) {
      ui?.notifications?.warn?.('Could not resolve actor for multiattack. Reopen the sheet and try again.');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    executeCombatFeatureMultiattack({ actor, element: row, featureId }).catch(err => {
      console.error('[SWSE] Legacy multiattack bridge failed', err);
      ui?.notifications?.error?.(`Multiattack failed: ${err.message}`);
    });
  }, true);

  return true;
}

export function registerCombatFeatureLegacyActionBridge() {
  if (registered) return false;
  registered = true;
  return installLegacyMultiattackBridge();
}

export default registerCombatFeatureLegacyActionBridge;
