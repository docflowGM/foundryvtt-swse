import { CombatFeatureSheetAdapter } from '/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-feature-sheet-adapter.js';

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/combat-features-panel.hbs';
const STYLE_ID = 'swse-combat-features-panel-renderer-styles';
let registered = false;

function rootFromHtml(html) {
  return html instanceof HTMLElement ? html : html?.[0] ?? html ?? null;
}

function actorFromApp(app) {
  return app?.actor?.items ? app.actor : app?.document?.items ? app.document : null;
}

function ensurePanelStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-combat-features-panel { margin-bottom: 12px; }
    .swse-combat-features-panel .swse-concept-command-chip { display: flex; flex-direction: column; gap: 3px; align-items: center; justify-content: center; min-height: 48px; }
    .swse-combat-features-panel .swse-concept-command-chip strong { font-family: var(--swse-font-display, "Orbitron", sans-serif); font-size: 14px; color: var(--swse-concept-text, #f2fbff); }
    .swse-combat-features-panel .swse-concept-command-chip span { font-size: 9px; color: var(--swse-concept-text-faint, #8fd7ef); letter-spacing: 0.14em; text-transform: uppercase; }
    .swse-combat-feature-section { margin-top: 10px; }
    .swse-combat-feature-toolbar { display: flex; gap: 8px; justify-content: flex-end; align-items: center; margin: 8px 0; }
    .swse-combat-feature-toolbar button,
    .swse-combat-feature-star { border: 1px solid rgba(143, 215, 239, 0.28); background: rgba(9, 20, 32, 0.62); color: var(--swse-concept-text, #f2fbff); border-radius: 8px; cursor: pointer; }
    .swse-combat-feature-toolbar button { padding: 5px 9px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
    .swse-combat-feature-star { width: 26px; height: 26px; flex: 0 0 26px; display: inline-grid; place-items: center; color: rgba(255,255,255,0.72); }
    .swse-combat-feature-star.is-favorite { color: #ffd166; border-color: rgba(255, 209, 102, 0.58); }
    .swse-combat-feature-row { display: flex; align-items: stretch; gap: 6px; }
    .swse-combat-feature-main { flex: 1 1 auto; text-align: left; }
    .swse-combat-feature-button--automated { border-color: rgba(120, 255, 180, 0.28); }
    .swse-combat-feature-button--partial { border-color: rgba(255, 210, 102, 0.30); }
    .swse-combat-feature-button--manual { border-color: rgba(255, 130, 216, 0.28); }
    .swse-combat-feature-button.is-reference-only { opacity: 0.88; }
    .swse-combat-features-panel.is-compact .swse-combat-feature-section--triggered,
    .swse-combat-features-panel.is-compact .swse-combat-feature-section--passive { display: none; }
    .swse-combat-features-panel.is-compact .swse-concept-action-button__copy small { display: none; }
    .swse-combat-features-panel.is-compact .swse-concept-action-lane__rows { gap: 4px; }
    .swse-combat-features-panel .swse-action-lane--favorites .swse-concept-action-lane__header strong { color: #ffd166; }
    .swse-combat-features-panel .swse-action-lane--attack-option .swse-concept-action-lane__header strong { color: color-mix(in srgb, var(--swse-accent-2, #ff6ef4) 78%, white 8%); }
    .swse-combat-features-panel .swse-action-lane--full-round .swse-concept-action-lane__header strong { color: color-mix(in srgb, #ffd166 72%, white 12%); }
    .swse-combat-features-panel .swse-action-lane--active .swse-concept-action-lane__header strong { color: color-mix(in srgb, #8dffbf 72%, white 12%); }
    .swse-combat-features-panel .swse-action-lane--passive .swse-concept-action-button__cost { min-width: 88px; }
    .swse-combat-feature-detail-dialog dl { display: grid; grid-template-columns: max-content 1fr; gap: 5px 12px; margin: 10px 0 0; }
    .swse-combat-feature-detail-dialog dt { font-weight: 700; opacity: 0.78; }
    .swse-combat-feature-detail-dialog dd { margin: 0; }
  `;
  document.head.appendChild(style);
}

async function renderCombatFeaturesPanel(app, html) {
  const actor = actorFromApp(app);
  const root = rootFromHtml(html);
  if (!actor || !root?.querySelector) return;

  const combatRoot = root.querySelector('[data-combat-tab-root]');
  if (!combatRoot) return;

  ensurePanelStyles();
  combatRoot.querySelectorAll('[data-combat-features-panel]').forEach(element => element.remove());

  const combatFeatures = CombatFeatureSheetAdapter.build(actor);
  const content = await renderTemplate(TEMPLATE_PATH, { combatFeatures, actor });
  const wrapper = document.createElement('div');
  wrapper.innerHTML = content;
  const panel = wrapper.firstElementChild;
  if (!panel) return;

  const legacyPanel = combatRoot.querySelector('.swse-concept-panel--combat-actions-compact');
  if (legacyPanel) legacyPanel.insertAdjacentElement('beforebegin', panel);
  else combatRoot.insertAdjacentElement('beforeend', panel);
}

export function registerCombatFeaturesPanelRenderer() {
  if (registered) return false;
  registered = true;
  Hooks.on('renderSWSEV2CharacterSheet', (app, html) => {
    renderCombatFeaturesPanel(app, html).catch(err => {
      console.error('[SWSE] Failed to render Combat Features panel', err);
    });
  });
  return true;
}

export default registerCombatFeaturesPanelRenderer;
