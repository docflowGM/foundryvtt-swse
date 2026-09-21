/**
 * Armor Hydration + Defense Hotfix
 *
 * V2 sheet migration guardrails:
 * - The gear Armor Profile must use the same equipped-state semantics as the
 *   inventory rows and must prefer worn armor over equipped energy shields.
 * - DefenseCalculator.calculate() must not miss equipped armor/shields
 *   because an older item marks its equipped state via a legacy/alternate
 *   field shape (system.isEquipped, system.readied, system.equippable.equipped,
 *   flags.swse.equipped) instead of the canonical system.equipped field the
 *   calculator's own equippedArmor lookup reads. Fixed by normalizing that
 *   field, in memory, before every DefenseCalculator.calculate() call --
 *   never by recomputing its output afterward. See normalizeArmorEquipState()
 *   below for the full rationale (Math Integrity Freeze Batch 2A correction).
 * - The Effect Builder partial must be registered before item sheets try to
 *   render the entity dialog effects tab.
 */

import { PanelContextBuilder } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js';
import { RowTransformers } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/RowTransformers.js';
import { DefenseCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js';
import { isEnergyShieldItem } from '/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js';

const EFFECT_BUILDER_PARTIAL = 'systems/foundryvtt-swse/templates/dialogs/entity/parts/effect-builder-wizard.hbs';

let registered = false;
let partialRegistrationStarted = false;
let originalBuildArmorSummaryPanel = null;
let originalBuildInventoryPanel = null;
let originalDefenseCalculate = null;
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

function isTruthyEquipState(value) {
  if (value === true || Number(value) === 1) return true;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return isTruthyEquipState(value.value ?? value.current ?? value.active ?? value.equipped ?? value.state);
  }
  return ['true', '1', 'yes', 'equipped', 'worn', 'held', 'readied', 'ready', 'on', 'active'].includes(String(value || '').toLowerCase());
}

function itemIsEquipped(item = {}) {
  return isTruthyEquipState(item?.system?.equipped)
    || isTruthyEquipState(item?.system?.isEquipped)
    || isTruthyEquipState(item?.system?.readied)
    || isTruthyEquipState(item?.system?.equippable?.equipped)
    || isTruthyEquipState(item?.flags?.swse?.equipped);
}

function isWornArmor(item = {}) {
  return item?.type === 'armor' && itemIsEquipped(item) && !isEnergyShieldItem(item);
}

function findEquippedWornArmor(actorOrItems) {
  const items = actorOrItems?.items ? asArray(actorOrItems.items) : asArray(actorOrItems);
  return items.find(isWornArmor) ?? null;
}

// Math Integrity Freeze Batch 2A correction: this hotfix previously
// recomputed Reflex/Fortitude from scratch AFTER DefenseCalculator.calculate()
// already produced the correct answer -- a second, independently-maintained
// defense authority. Live review against Gar'ee's real actor confirmed that
// reconstruction was ALREADY wrong on its own terms even before Energy
// Shields existed: flat-footed Reflex only stripped the positive Dex bonus,
// not dodge bonuses (Gar'ee: 29 -> 25 instead of the certified 24); an
// active-nonproficient-shield's Dex denial got applied a second time when
// also flat-footed; and Pin's positive-Dex-bonus removal
// (reflex.pinnedDexReduction) was never read at all, so this reconstruction
// could silently restore the Dex bonus Pin had just removed. Every one of
// those is a case this file would have had to be taught by hand, forever,
// as the canonical defense rules keep evolving -- an unsustainable pattern
// (see docs/audits/v2-math-integrity-authority-ledger.md's Batch 2A
// correction addendum).
//
// The actual problem this hotfix's own doc comment describes is narrower
// than "recompute the answer": some armor/shield records mark equipped
// state via a legacy/alternate field (system.isEquipped, system.readied,
// system.equippable.equipped, flags.swse.equipped) that DefenseCalculator's
// own equippedArmor lookup (item.system?.equipped only) doesn't recognize,
// so the canonical calculator would think nothing is equipped and skip
// armor/shield math entirely. The fix belongs on the INPUT side, not the
// output side: normalize the equipped-state field DefenseCalculator (and
// every other canonical consumer -- ModifierEngine, armor-usage-resolver.js
// -- reading the same actor afterward) actually looks at, then let the one
// canonical calculator run untouched.
//
//   hydration/equip-state normalization -> DefenseCalculator.calculate() -> consumers
//
// This mutation is in-memory only (never persisted via actor/item.update()):
// it only ever sets system.equipped = true when the item is ALREADY equipped
// by every other looser definition this codebase's own InventoryEngine write
// path already uses, so it can only correct a false negative, never invent
// a false positive.
function normalizeArmorEquipState(actor) {
  for (const item of asArray(actor?.items)) {
    if (item?.type !== 'armor') continue;
    if (!itemIsEquipped(item)) continue;
    if (item.system?.equipped) continue;
    if (item.system) item.system.equipped = true;
  }
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

  // No buildDefensePanel patch: it already reads system.derived.defenses.*
  // (buildDefensesViewModel() / PanelContextBuilder.js's own
  // "authoritativeTotal" preference), the same canonical output
  // DefenseCalculator.calculate() persists there. Once that persisted data
  // is correct -- guaranteed by normalizeArmorEquipState() below running
  // before every DefenseCalculator.calculate() call -- the panel needs no
  // separate correction. Reconstructing Reflex/Fortitude a second time here
  // was the shadow-authority bug; consuming the canonical output the panel
  // already prefers is the fix.
}

function installDefenseCalculatorPatch() {
  if (originalDefenseCalculate || typeof DefenseCalculator?.calculate !== 'function') return;
  originalDefenseCalculate = DefenseCalculator.calculate;
  DefenseCalculator.calculate = async function patchedDefenseCalculate(actor, classLevels = [], options = {}, context = {}) {
    normalizeArmorEquipState(actor);
    return originalDefenseCalculate.call(this, actor, classLevels, options, context);
  };
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
  installDefenseCalculatorPatch();
  scheduleEffectBuilderPartialRegistration();
  return true;
}

export default registerArmorHydrationDefenseHotfix;
