/**
 * Armor Hydration + Defense Hotfix
 *
 * V2 sheet migration guardrails:
 * - The gear Armor Profile must use the same equipped-state semantics as the
 *   inventory rows and must prefer worn armor over equipped energy shields.
 * - The Effect Builder partial must be registered before item sheets try to
 *   render the entity dialog effects tab.
 *
 * Math Integrity Freeze Batch 2A correction (second pass): this file used to
 * ALSO patch DefenseCalculator.calculate() -- first to recompute Reflex/
 * Fortitude from scratch (a shadow defense authority, removed in the first
 * Batch 2A correction), then, after that removal, to mutate
 * item.system.equipped in memory before calling the real calculator, to
 * paper over armor/shield records that mark equipped state via a legacy/
 * alternate field shape. That mutation-based fix created its own ordering
 * bug: DerivedCalculator.computeAll() runs ModifierEngine's modifier
 * collection BEFORE DefenseCalculator.calculate(), so a legacy-equipped
 * item's ACP/skill modifiers were silently omitted on that pass even though
 * Defense math (which ran after the mutation) came out correct -- exactly
 * the kind of order-dependent behavior this freeze exists to eliminate.
 *
 * Fixed properly this time: `isArmorItemEquipped()`
 * (scripts/items/armor-data-resolver.js) is now the single, canonical
 * equipped-state check, called directly by every consumer that needs it
 * (armor-usage-resolver.js, ModifierEngine._getItemModifiers(),
 * DefenseCalculator's own equippedArmor lookup, armor-benefit-simulator.js).
 * No consumer depends on any other subsystem having run first, and no
 * mutation of shared actor/item state is needed anywhere. This file's own
 * `isWornArmor()`/`findEquippedWornArmor()` (used only for the two UI panel
 * patches below, a display concern unrelated to defense/skill math) now
 * delegate to that same shared check instead of maintaining a fourth
 * duplicate copy of the same logic.
 */

import { PanelContextBuilder } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js';
import { RowTransformers } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/RowTransformers.js';
import { isEnergyShieldItem, isArmorItemEquipped } from '/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js';

const EFFECT_BUILDER_PARTIAL = 'systems/foundryvtt-swse/templates/dialogs/entity/parts/effect-builder-wizard.hbs';

let registered = false;
let partialRegistrationStarted = false;
let originalBuildArmorSummaryPanel = null;
let originalBuildInventoryPanel = null;
let effectBuilderFallbackRegistered = false;
let effectBuilderFullTemplateRegistered = false;

function asArray(value) {
  try { return Array.from(value ?? []); }
  catch (_err) { return []; }
}

function getHandlebarsRuntime() {
  return foundry?.applications?.handlebars?.Handlebars
    ?? foundry?.applications?.handlebars?.handlebars
    ?? globalThis.Handlebars
    ?? null;
}

function getLoadTemplatesFunction() {
  return foundry?.applications?.handlebars?.loadTemplates ?? null;
}

function isWornArmor(item = {}) {
  return item?.type === 'armor' && isArmorItemEquipped(item) && !isEnergyShieldItem(item);
}

function findEquippedWornArmor(actorOrItems) {
  const items = actorOrItems?.items ? asArray(actorOrItems.items) : asArray(actorOrItems);
  return items.find(isWornArmor) ?? null;
}

function installPanelArmorPatches() {
  const proto = PanelContextBuilder?.prototype;
  if (!proto) return;

  if (!originalBuildArmorSummaryPanel && typeof proto.buildArmorSummaryPanel === 'function') {
    originalBuildArmorSummaryPanel = proto.buildArmorSummaryPanel;
    proto.buildArmorSummaryPanel = function patchedBuildArmorSummaryPanel(...args) {
      const armor = findEquippedWornArmor(this.actor);
      if (!armor) return originalBuildArmorSummaryPanel.call(this, ...args);
      const panel = {
        equippedArmor: RowTransformers.toArmorSummaryRow(armor),
        canEdit: this.sheet?.isEditable === true,
      };
      try { this._validatePanelContext?.('armorSummaryPanel', panel); } catch (_err) { /* preserve sheet safety */ }
      return panel;
    };
  }

  if (!originalBuildInventoryPanel && typeof proto.buildInventoryPanel === 'function') {
    originalBuildInventoryPanel = proto.buildInventoryPanel;
    proto.buildInventoryPanel = function patchedBuildInventoryPanel(...args) {
      const panel = originalBuildInventoryPanel.call(this, ...args);
      const armor = findEquippedWornArmor(this.actor);
      panel.equippedArmor = armor ? RowTransformers.toArmorSummaryRow(armor) : null;
      return panel;
    };
  }

  // No buildDefensePanel patch, and no DefenseCalculator.calculate() patch
  // at all: DefenseCalculator's own equippedArmor lookup now calls
  // isArmorItemEquipped() directly, so it (and the panel, which already
  // reads DefenseCalculator's persisted system.derived.defenses.* output)
  // needs no external correction of any kind.
}

function installSynchronousEffectBuilderFallback() {
  if (effectBuilderFullTemplateRegistered) return true;
  const handlebars = getHandlebarsRuntime();
  if (handlebars?.partials?.[EFFECT_BUILDER_PARTIAL] && !effectBuilderFallbackRegistered) return true;
  if (typeof handlebars?.registerPartial !== 'function') return false;
  handlebars.registerPartial(EFFECT_BUILDER_PARTIAL, `
{{#if entityDialog.effectWizard.open}}
<div class="swse-effect-wizard" data-effect-wizard data-effect-wizard-mode="{{entityDialog.effectWizard.mode}}" data-effect-wizard-step="{{entityDialog.effectWizard.step}}">
  <button type="button" class="swse-effect-wizard__backdrop" data-effect-wizard-close aria-label="Close effect builder"></button>
  <section class="swse-effect-wizard__modal" role="dialog" aria-modal="true" aria-label="Effect Builder Wizard">
    <header class="swse-effect-wizard__titlebar">
      <div class="swse-effect-wizard__titlecopy">
        <div class="swse-effect-wizard__eyebrow">Active Effect - Holopad Forge</div>
        <h3>Effect Builder</h3>
      </div>
      <button type="button" class="swse-effect-wizard__close" data-effect-wizard-close aria-label="Close">x</button>
    </header>
    <div class="swse-effect-wizard__body">
      <main class="swse-effect-wizard__stage">
        <section class="swse-effect-wizard__pane">
          <h4>Effect Builder Loading</h4>
          <p>The effect builder template is being loaded. Close this panel and reopen it if the full wizard has not appeared yet.</p>
        </section>
      </main>
    </div>
  </section>
</div>
{{/if}}`);
  effectBuilderFallbackRegistered = true;
  return true;
}

async function ensureEffectBuilderPartialRegistered() {
  const handlebars = getHandlebarsRuntime();
  if (effectBuilderFullTemplateRegistered && handlebars?.partials?.[EFFECT_BUILDER_PARTIAL]) return true;

  const loadTemplates = getLoadTemplatesFunction();
  try {
    if (typeof loadTemplates === 'function') await loadTemplates([EFFECT_BUILDER_PARTIAL]);
  } catch (_err) {
    // Fall through to direct fetch/register.
  }

  try {
    const response = await fetch(EFFECT_BUILDER_PARTIAL);
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? 'unknown'}`);
    const html = await response.text();
    handlebars?.registerPartial?.(EFFECT_BUILDER_PARTIAL, html);
    effectBuilderFullTemplateRegistered = true;
    effectBuilderFallbackRegistered = false;
    return true;
  } catch (err) {
    if (handlebars?.partials?.[EFFECT_BUILDER_PARTIAL]) return true;
    console.warn('[SWSE Armor Hotfix] Effect Builder partial registration failed', {
      template: EFFECT_BUILDER_PARTIAL,
      message: err?.message || String(err),
    });
    return false;
  }
}

function scheduleEffectBuilderPartialRegistration() {
  if (partialRegistrationStarted) return;
  partialRegistrationStarted = true;
  installSynchronousEffectBuilderFallback();
  void ensureEffectBuilderPartialRegistered();
  Hooks.once('init', () => {
    installSynchronousEffectBuilderFallback();
    void ensureEffectBuilderPartialRegistered();
  });
  Hooks.once('ready', () => {
    installSynchronousEffectBuilderFallback();
    void ensureEffectBuilderPartialRegistered();
  });
}

export function registerArmorHydrationDefenseHotfix() {
  if (registered) return false;
  registered = true;
  installPanelArmorPatches();
  scheduleEffectBuilderPartialRegistration();
  return true;
}

export default registerArmorHydrationDefenseHotfix;
