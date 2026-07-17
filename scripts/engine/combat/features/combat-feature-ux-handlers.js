import { COMBAT_FEATURE_ACTIONS } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-contract.js';
import {
  toggleCombatFeatureFavorite,
  toggleCombatFeaturesCompactMode
} from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-preferences-service.js';

/**
 * Combat Feature UX Handlers
 *
 * Phase 10 user-experience actions: favorites, compact mode, and detail modal.
 * These handlers do not roll dice or compute combat math.
 */

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function featureDataFromElement(element) {
  const label = element?.dataset?.featureLabel || element?.querySelector?.('strong')?.textContent?.trim() || element?.dataset?.featureId || 'Combat Feature';
  return {
    id: element?.dataset?.featureId || '',
    label,
    summary: element?.dataset?.featureSummary || element?.getAttribute?.('title') || '',
    sourceName: element?.dataset?.sourceName || '',
    sourceItemId: element?.dataset?.sourceItemId || '',
    automationStatus: element?.dataset?.automationStatus || '',
    readiness: element?.dataset?.readiness || '',
    actionCost: element?.dataset?.actionCost || '',
    triggerLabel: element?.dataset?.triggerLabel || '',
    responseWindow: element?.dataset?.responseWindow || '',
    appliesTo: element?.dataset?.appliesTo || '',
    automationHint: element?.dataset?.automationHint || ''
  };
}

function itemFromAnyActor(itemId, actor = null) {
  if (!itemId) return null;
  if (actor?.items?.get?.(itemId)) return actor.items.get(itemId);
  for (const candidate of game?.actors ?? []) {
    const item = candidate?.items?.get?.(itemId);
    if (item) return item;
  }
  return null;
}

function detailHtml(data) {
  const rows = [
    ['Feature ID', data.id],
    ['Source', data.sourceName],
    ['Action / Timing', data.actionCost],
    ['Readiness', data.readiness],
    ['Automation', data.automationStatus],
    ['Trigger', data.triggerLabel],
    ['Response Window', data.responseWindow],
    ['Applies To', data.appliesTo]
  ].filter(([, value]) => value);

  return `
    <div class="swse-combat-feature-detail-dialog">
      <p>${escapeHtml(data.summary || 'No summary is available for this combat feature yet.')}</p>
      ${data.automationHint ? `<p><strong>Automation:</strong> ${escapeHtml(data.automationHint)}</p>` : ''}
      <dl>
        ${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}
      </dl>
    </div>
  `;
}

export async function showCombatFeatureDetails({ actor, element } = {}) {
  const data = featureDataFromElement(element);
  const item = itemFromAnyActor(data.sourceItemId, actor);

  if (globalThis.Dialog?.confirm) {
    const openSource = await Dialog.confirm({
      title: data.label,
      content: detailHtml(data),
      yes: () => true,
      no: () => false,
      defaultYes: false,
      buttons: {
        yes: { icon: '<i class="fas fa-book"></i>', label: item ? 'Open Source' : 'Close' },
        no: { icon: '<i class="fas fa-times"></i>', label: item ? 'Close' : 'Dismiss' }
      }
    });
    if (openSource && item?.sheet?.render) item.sheet.render(true);
    return;
  }

  ui?.notifications?.info?.(`${data.label}: ${data.summary || 'No summary is available.'}`);
}

export async function handleCombatFeatureUxAction({ action, actor, element } = {}) {
  switch (action) {
    case COMBAT_FEATURE_ACTIONS.VIEW_DETAILS:
      await showCombatFeatureDetails({ actor, element });
      return true;
    case COMBAT_FEATURE_ACTIONS.TOGGLE_FAVORITE:
      await toggleCombatFeatureFavorite(actor, element?.dataset?.featureId || '');
      return true;
    case COMBAT_FEATURE_ACTIONS.TOGGLE_COMPACT:
      await toggleCombatFeaturesCompactMode(actor);
      return true;
    default:
      return false;
  }
}
