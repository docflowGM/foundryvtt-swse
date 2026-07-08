/**
 * Armor Hydration + Defense Hotfix
 *
 * V2 sheet migration guardrails:
 * - The gear Armor Profile must use the same equipped-state semantics as the
 *   inventory rows and must prefer worn armor over equipped energy shields.
 * - Armor defense display/math must not miss equipped armor because an older
 *   item used an alternate equipped flag shape or because the derived payload
 *   was stale before the armor item was hydrated.
 * - The Effect Builder partial must be registered before item sheets try to
 *   render the entity dialog effects tab.
 */

import { PanelContextBuilder } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js';
import { RowTransformers } from '/systems/foundryvtt-swse/scripts/sheets/v2/context/RowTransformers.js';
import { DefenseCalculator } from '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js';
import { actorHasArmorProficiencyForArmor, isEnergyShieldItem, resolveArmorData } from '/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js';

const EFFECT_BUILDER_PARTIAL = 'systems/foundryvtt-swse/templates/dialogs/entity/parts/effect-builder-wizard.hbs';

let registered = false;
let partialRegistrationStarted = false;
let originalBuildArmorSummaryPanel = null;
let originalBuildInventoryPanel = null;
let originalBuildDefensePanel = null;
let originalDefenseCalculate = null;

function asArray(value) {
  try { return Array.from(value ?? []); }
  catch (_err) { return []; }
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function actorHasTalent(actor, talentName) {
  const wanted = String(talentName || '').trim().toLowerCase();
  if (!wanted) return false;
  return asArray(actor?.items).some(item => item?.type === 'talent' && String(item?.name || '').trim().toLowerCase() === wanted);
}

function effectiveArmorDefenseState(actor, armor) {
  if (!actor || !armor) return null;
  const armorData = resolveArmorData(armor);
  const proficient = actorHasArmorProficiencyForArmor(actor, armor);
  const secondSkin = proficient && actorHasTalent(actor, 'Second Skin');
  const armoredDefense = proficient && actorHasTalent(actor, 'Armored Defense');
  const improvedArmoredDefense = proficient && actorHasTalent(actor, 'Improved Armored Defense');
  const armorMastery = proficient && actorHasTalent(actor, 'Armor Mastery');

  const reflexArmorBonus = toNumber(armorData.reflexBonus, 0) + (secondSkin ? 1 : 0);
  const fortitudeArmorBonus = proficient ? toNumber(armorData.fortitudeBonus, 0) + (secondSkin ? 1 : 0) : 0;
  const maxDexBonus = toNumber(armorData.maxDexBonus, NaN);

  return {
    armorData,
    proficient,
    armoredDefense,
    improvedArmoredDefense,
    armorMastery,
    reflexArmorBonus,
    fortitudeArmorBonus,
    maxDexBonus: Number.isFinite(maxDexBonus) ? maxDexBonus : null,
  };
}

function correctedReflexLevelTerm(heroicLevel, armorState) {
  const armorBonus = toNumber(armorState?.reflexArmorBonus, 0);
  if (!armorState?.proficient) return armorBonus;
  if (armorState.improvedArmoredDefense) return Math.max(heroicLevel + Math.floor(armorBonus / 2), armorBonus);
  if (armorState.armoredDefense) return Math.max(heroicLevel, armorBonus);
  return armorBonus;
}

function applyArmorDefenseCorrectionsToPanel(panel = {}, actor = {}) {
  const armor = findEquippedWornArmor(actor);
  if (!armor || !panel || !Array.isArray(panel.defenses)) return panel;
  const armorState = effectiveArmorDefenseState(actor, armor);
  if (!armorState) return panel;

  const reflex = panel.defenses.find(row => row?.systemKey === 'reflex' || row?.key === 'ref');
  if (reflex) {
    const heroicLevel = toNumber(reflex.heroicLevel ?? actor?.system?.level, 0);
    const maxDex = armorState.maxDexBonus;
    const effectiveMaxDex = maxDex === null ? null : maxDex + (armorState.armorMastery ? 1 : 0);
    const rawAbilityMod = toNumber(reflex.abilityMod, 0);
    const abilityMod = effectiveMaxDex === null ? rawAbilityMod : Math.min(rawAbilityMod, effectiveMaxDex);
    const levelContribution = correctedReflexLevelTerm(heroicLevel, armorState);
    const total = 10
      + levelContribution
      + abilityMod
      + toNumber(reflex.classDef, 0)
      + toNumber(reflex.speciesBonus, 0)
      + toNumber(reflex.rulesBonus, 0)
      + toNumber(reflex.sizeModifier, 0)
      + toNumber(reflex.miscMod, 0)
      + toNumber(reflex.conditionPenalty, 0);

    reflex.armorBonus = armorState.reflexArmorBonus;
    reflex.levelContribution = levelContribution;
    reflex.armorContribution = levelContribution;
    reflex.abilityMod = abilityMod;
    reflex.abilityModClass = abilityMod > 0 ? 'mod--positive' : abilityMod < 0 ? 'mod--negative' : 'mod--zero';
    reflex.total = Math.max(1, total);
    reflex.armorSourceName = armor.name || '';
  }

  const fortitude = panel.defenses.find(row => row?.systemKey === 'fortitude' || row?.key === 'fort');
  if (fortitude) {
    const total = 10
      + toNumber(fortitude.levelContribution ?? fortitude.heroicLevel ?? actor?.system?.level, 0)
      + armorState.fortitudeArmorBonus
      + toNumber(fortitude.abilityMod, 0)
      + toNumber(fortitude.classDef, 0)
      + toNumber(fortitude.speciesBonus, 0)
      + toNumber(fortitude.rulesBonus, 0)
      + toNumber(fortitude.sizeModifier, 0)
      + toNumber(fortitude.miscMod, 0)
      + toNumber(fortitude.conditionPenalty, 0);

    fortitude.armorBonus = armorState.fortitudeArmorBonus;
    fortitude.total = Math.max(1, total);
    fortitude.armorSourceName = armor.name || '';
  }

  return panel;
}

function applyArmorDefenseCorrectionsToResult(result = {}, actor = {}) {
  const armor = findEquippedWornArmor(actor);
  if (!armor || !result?.reflex) return result;
  const armorState = effectiveArmorDefenseState(actor, armor);
  if (!armorState) return result;

  const reflex = result.reflex;
  const heroicLevel = toNumber(reflex.heroicLevel ?? actor?.system?.level, 0);
  const maxDex = armorState.maxDexBonus;
  const effectiveMaxDex = maxDex === null ? null : maxDex + (armorState.armorMastery ? 1 : 0);
  const rawAbilityMod = toNumber(reflex.abilityMod, 0);
  const abilityMod = effectiveMaxDex === null ? rawAbilityMod : Math.min(rawAbilityMod, effectiveMaxDex);
  const levelContribution = correctedReflexLevelTerm(heroicLevel, armorState);
  const reflexTotal = 10
    + levelContribution
    + abilityMod
    + toNumber(reflex.classBonus, 0)
    + toNumber(reflex.speciesBonus, 0)
    + toNumber(reflex.stateBonus, 0)
    + toNumber(reflex.adjustment, 0)
    + toNumber(reflex.sizeModifier, 0)
    + toNumber(reflex.miscBonus, 0)
    + toNumber(reflex.conditionPenalty, 0);

  result.reflex = {
    ...reflex,
    total: Math.max(1, reflexTotal),
    base: 10 + levelContribution + toNumber(reflex.classBonus, 0) + toNumber(reflex.sizeModifier, 0),
    armorBonus: armorState.reflexArmorBonus,
    armorContribution: levelContribution,
    levelContribution,
    abilityMod,
    armorSourceName: armor.name || '',
  };

  if (result.flatFooted) {
    result.flatFooted = {
      ...result.flatFooted,
      total: Math.max(1, result.reflex.total - Math.max(0, abilityMod)),
      base: result.reflex.base,
      armorBonus: armorState.reflexArmorBonus,
      armorContribution: levelContribution,
      levelContribution,
      abilityMod: 0,
      armorSourceName: armor.name || '',
    };
  }

  if (result.fortitude) {
    const fortitude = result.fortitude;
    const fortTotal = 10
      + toNumber(fortitude.levelContribution ?? fortitude.heroicLevel ?? actor?.system?.level, 0)
      + armorState.fortitudeArmorBonus
      + toNumber(fortitude.abilityMod, 0)
      + toNumber(fortitude.classBonus, 0)
      + toNumber(fortitude.speciesBonus, 0)
      + toNumber(fortitude.stateBonus, 0)
      + toNumber(fortitude.adjustment, 0)
      + toNumber(fortitude.miscBonus, 0)
      + toNumber(fortitude.conditionPenalty, 0);
    result.fortitude = {
      ...fortitude,
      total: Math.max(1, fortTotal),
      armorBonus: armorState.fortitudeArmorBonus,
      armorSourceName: armor.name || '',
    };
  }

  return result;
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

  if (!originalBuildDefensePanel && typeof proto.buildDefensePanel === 'function') {
    originalBuildDefensePanel = proto.buildDefensePanel;
    proto.buildDefensePanel = function patchedBuildDefensePanel(...args) {
      const panel = originalBuildDefensePanel.call(this, ...args);
      return applyArmorDefenseCorrectionsToPanel(panel, this.actor);
    };
  }
}

function installDefenseCalculatorPatch() {
  if (originalDefenseCalculate || typeof DefenseCalculator?.calculate !== 'function') return;
  originalDefenseCalculate = DefenseCalculator.calculate;
  DefenseCalculator.calculate = async function patchedDefenseCalculate(actor, classLevels = [], options = {}, context = {}) {
    const result = await originalDefenseCalculate.call(this, actor, classLevels, options, context);
    return applyArmorDefenseCorrectionsToResult(result, actor);
  };
}

function installSynchronousEffectBuilderFallback() {
  const handlebars = getHandlebarsRuntime();
  if (handlebars?.partials?.[EFFECT_BUILDER_PARTIAL]) return true;
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
  return true;
}

async function ensureEffectBuilderPartialRegistered() {
  const handlebars = getHandlebarsRuntime();
  if (handlebars?.partials?.[EFFECT_BUILDER_PARTIAL]) return true;

  const loadTemplates = getLoadTemplatesFunction();
  try {
    if (typeof loadTemplates === 'function') {
      await loadTemplates([EFFECT_BUILDER_PARTIAL]);
      if (handlebars?.partials?.[EFFECT_BUILDER_PARTIAL]) return true;
    }
  } catch (_err) {
    // Fall through to direct fetch/register.
  }

  try {
    const response = await fetch(EFFECT_BUILDER_PARTIAL);
    if (!response?.ok) throw new Error(`HTTP ${response?.status ?? 'unknown'}`);
    const html = await response.text();
    handlebars?.registerPartial?.(EFFECT_BUILDER_PARTIAL, html);
    return true;
  } catch (err) {
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
