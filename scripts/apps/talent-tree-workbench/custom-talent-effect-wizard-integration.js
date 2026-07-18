import { SWSEItemSheet } from '/systems/foundryvtt-swse/scripts/items/swse-item-sheet.js';

/**
 * Custom Talent Effect Wizard Integration
 *
 * Attaches the existing item Effect Wizard to player/GM-created custom talents
 * without creating a second effect builder. The integration injects a compact
 * custom-talent mechanics panel into the item Effects tab and can auto-open the
 * guided wizard for brand-new custom talent nodes created from the custom talent
 * tree workbench.
 */

const PATCH_FLAG = Symbol.for('swse.customTalentEffectWizardIntegration.v1');
const STYLE_ID = 'swse-custom-talent-effect-wizard-integration-styles';
const AUTO_OPEN_PRESENTED_FLAG = 'customTalentEffectWizardPresented';
const AUTO_OPEN_REQUEST_FLAG = 'openCustomTalentEffectWizard';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .swse-custom-talent-effect-bridge {
      margin: 0 0 12px;
      padding: 12px 14px;
      border: 1px solid rgba(172, 130, 255, 0.34);
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(172, 130, 255, 0.12), rgba(0, 170, 255, 0.07));
      box-shadow: inset 0 0 20px rgba(172, 130, 255, 0.06);
    }
    .swse-custom-talent-effect-bridge__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .swse-custom-talent-effect-bridge__head strong {
      display: block;
      color: var(--swse-force-picker-text-light, #b5daff);
      font-family: var(--swse-font-orbit, Orbitron, system-ui, sans-serif);
      font-size: 13px;
    }
    .swse-custom-talent-effect-bridge__head small,
    .swse-custom-talent-effect-bridge__note {
      display: block;
      color: var(--swse-force-picker-text-secondary, #6a9dcd);
      font-size: 11px;
      line-height: 1.4;
      margin-top: 3px;
    }
    .swse-custom-talent-effect-bridge__badge {
      flex: 0 0 auto;
      border: 1px solid rgba(172, 130, 255, 0.45);
      border-radius: 999px;
      padding: 4px 8px;
      color: #d7c2ff;
      background: rgba(172, 130, 255, 0.10);
      font-family: var(--swse-font-mono, ui-monospace, monospace);
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .swse-custom-talent-effect-bridge__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
  `;
  document.head.appendChild(style);
}

function isCustomTalentItem(item) {
  return item?.type === 'talent' && (
    item?.system?.isCustom === true
    || !!item?.system?.customTreeId
    || !!item?.system?.talentTreeId && String(item?.system?.source || '').toLowerCase().includes('custom')
  );
}

function effectWizardButton(root, mode = 'basic') {
  const wanted = String(mode || 'basic').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
  return root?.querySelector?.(`[data-effect-wizard-open="${wanted}"]`)
    || root?.querySelector?.('[data-effect-wizard-open="basic"]')
    || root?.querySelector?.('[data-effect-wizard-open]')
    || null;
}

function clickEffectsTab(root) {
  const tab = root?.querySelector?.('.item-editor__tab[data-tab="effects"], [data-tab="effects"].item-editor__tab');
  tab?.click?.();
}

async function openEffectWizardForSheet(sheet, { mode = 'basic', notify = false } = {}) {
  const root = sheet?.element;
  if (!root) return false;
  clickEffectsTab(root);
  await new Promise(resolve => window.setTimeout(resolve, 0));
  const button = effectWizardButton(root, mode);
  if (!button || button.disabled) {
    if (notify) ui?.notifications?.warn?.('Open the item in Edit mode before changing custom talent effects.');
    return false;
  }
  button.click();
  return true;
}

function shouldAutoOpenWizard(sheet) {
  const item = sheet?.item;
  if (!isCustomTalentItem(item)) return false;
  if (sheet?.options?.openCustomTalentEffectWizard === true || sheet?.options?.openEffectWizardOnRender === true) return true;
  if (item?.getFlag?.('foundryvtt-swse', AUTO_OPEN_REQUEST_FLAG)) return true;
  const presented = item?.getFlag?.('foundryvtt-swse', AUTO_OPEN_PRESENTED_FLAG);
  if (presented) return false;
  const source = String(item?.system?.source || '').toLowerCase();
  const fromWorkbench = source.includes('custom talent tree workbench') || !!item?.system?.customTreeId;
  const hasEffects = Array.from(item?.effects ?? []).length > 0;
  return fromWorkbench && !hasEffects;
}

async function markAutoOpenConsumed(item) {
  try {
    if (item?.unsetFlag && item.getFlag?.('foundryvtt-swse', AUTO_OPEN_REQUEST_FLAG)) {
      await item.unsetFlag('foundryvtt-swse', AUTO_OPEN_REQUEST_FLAG);
    }
    if (item?.setFlag) await item.setFlag('foundryvtt-swse', AUTO_OPEN_PRESENTED_FLAG, true);
  } catch (err) {
    console.warn('[SWSE] Failed to mark custom talent effect wizard auto-open consumed', err);
  }
}

function injectCustomTalentEffectPanel(sheet) {
  const root = sheet?.element;
  const item = sheet?.item;
  if (!root || !isCustomTalentItem(item)) return;
  if (root.querySelector('[data-custom-talent-effect-bridge]')) return;

  ensureStyles();
  const effectsTab = root.querySelector('.swse-entity-dialog__effects-tab[data-tab="effects"]')
    || root.querySelector('[data-tab="effects"]');
  if (!effectsTab) return;

  const host = effectsTab.querySelector('.swse-entity-dialog__effect-command-deck') || effectsTab.firstElementChild;
  const treeName = item.system?.talentTree || item.system?.tree || 'Custom Talent Tree';
  const approval = item.system?.approvalStatus || (item.system?.gmApproved === false ? 'pending' : 'approved');
  const panel = document.createElement('section');
  panel.className = 'swse-custom-talent-effect-bridge';
  panel.dataset.customTalentEffectBridge = 'true';
  panel.innerHTML = `
    <div class="swse-custom-talent-effect-bridge__head">
      <div>
        <strong>Custom Talent Mechanics</strong>
        <small>${treeName} · use the normal SWSE Effect Wizard to define this talent's automation.</small>
      </div>
      <span class="swse-custom-talent-effect-bridge__badge">${approval}</span>
    </div>
    <div class="swse-custom-talent-effect-bridge__actions">
      <button type="button" class="swse-btn swse-btn--primary" data-custom-talent-effect-wizard="basic">Open Guided Effect Wizard</button>
      <button type="button" class="swse-btn" data-custom-talent-effect-wizard="advanced">Open Advanced Raw Wizard</button>
    </div>
    <small class="swse-custom-talent-effect-bridge__note">Effects stay on this custom talent item and are reviewed through the same item effect pipeline as feats, talents, gear, and Force powers.</small>
  `;
  if (host) effectsTab.insertBefore(panel, host);
  else effectsTab.prepend(panel);

  panel.querySelectorAll('[data-custom-talent-effect-wizard]').forEach(button => {
    button.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await openEffectWizardForSheet(sheet, { mode: button.dataset.customTalentEffectWizard || 'basic', notify: true });
    });
  });
}

async function maybeAutoOpenCustomTalentWizard(sheet) {
  if (!shouldAutoOpenWizard(sheet)) return;
  await markAutoOpenConsumed(sheet.item);
  window.setTimeout(async () => {
    const opened = await openEffectWizardForSheet(sheet, { mode: 'basic', notify: false });
    if (opened) ui?.notifications?.info?.('Opened the Effect Wizard for this new custom talent.');
  }, 75);
}

export async function openCustomTalentEffectWizard(item, { mode = 'basic' } = {}) {
  if (!item?.sheet) return false;
  item.sheet.options ??= {};
  item.sheet.options.openCustomTalentEffectWizard = true;
  await item.sheet.render(true);
  window.setTimeout(() => openEffectWizardForSheet(item.sheet, { mode, notify: true }), 75);
  return true;
}

export function registerCustomTalentEffectWizardIntegration() {
  if (globalThis[PATCH_FLAG]) return false;
  globalThis[PATCH_FLAG] = true;

  const originalOnRender = SWSEItemSheet.prototype._onRender;
  SWSEItemSheet.prototype._onRender = function customTalentEffectWizardOnRender(context, options) {
    const result = originalOnRender.call(this, context, options);
    try {
      injectCustomTalentEffectPanel(this);
      maybeAutoOpenCustomTalentWizard(this);
    } catch (err) {
      console.warn('[SWSE] Custom talent effect wizard integration failed', err);
    }
    return result;
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.openCustomTalentEffectWizard = openCustomTalentEffectWizard;
  return true;
}

export default registerCustomTalentEffectWizardIntegration;
